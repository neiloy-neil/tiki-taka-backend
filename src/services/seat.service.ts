import { SeatHold, ISeatHold } from '../models/SeatHold.model.js';
import { EventSeatState } from '../models/EventSeatState.model.js';
import { Event } from '../models/Event.model.js';
import { redisClient } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { SEAT_STATUS, SEAT_HOLD_EXPIRY_MINUTES, SEAT_HOLD_CONFIG, EVENT_STATUS } from '../config/constants.js';
import { Venue } from '../models/Venue.model.js';

export interface HoldSeatsInput {
  eventId: string;
  seatIds: string[];
  sessionId: string;
  userId?: string;
}

export interface ReleaseSeatsInput {
  holdId: string;
  sessionId: string;
}

/**
 * Hold seats for a user (temporary reservation)
 */
export const holdSeats = async (input: HoldSeatsInput): Promise<ISeatHold> => {
  const { eventId, seatIds, sessionId, userId } = input;

  // Validate input
  if (seatIds.length === 0) {
    throw new AppError('At least one seat must be selected', 400);
  }

  if (seatIds.length > SEAT_HOLD_CONFIG.maxSeatsPerHold) {
    throw new AppError(`Maximum ${SEAT_HOLD_CONFIG.maxSeatsPerHold} seats can be held at once`, 400);
  }

  // Verify event exists and is published
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== EVENT_STATUS.PUBLISHED) {
    throw new AppError('Event is not available for booking', 400);
  }

  // Reuse existing hold for this session if present
  const existingHold = await SeatHold.findOne({ eventId, sessionId });

  // 1. Check if seats are available or already held by this session
  const seats = await EventSeatState.find({
    eventId,
    seatId: { $in: seatIds },
  });

  if (seats.length !== seatIds.length) {
    throw new AppError('Some seats do not exist for this event', 400);
  }

  // If seats are already held, decide whether to reuse or reject
  const heldSeats = seats.filter((s) => s.status === SEAT_STATUS.HELD && s.holdId);
  if (heldSeats.length > 0) {
    const holdIds = Array.from(new Set(heldSeats.map((s) => s.holdId?.toString() || '')));
    const holdDocs = await SeatHold.find({ _id: { $in: holdIds } });
    const holdMap = new Map(holdDocs.map((h) => [h._id.toString(), h]));

    // Release stale holds (missing or expired) to reduce false conflicts
    const staleSeatIds: string[] = [];
    heldSeats.forEach((seat) => {
      const hold = holdMap.get(seat.holdId?.toString() || '');
      if (!hold || hold.expiresAt < new Date()) {
        staleSeatIds.push(seat.seatId);
      }
    });
    if (staleSeatIds.length > 0) {
      await EventSeatState.updateMany(
        { eventId, seatId: { $in: staleSeatIds }, status: SEAT_STATUS.HELD },
        { $set: { status: SEAT_STATUS.AVAILABLE }, $unset: { holdId: 1 } }
      );
    }

    // Check for seats held by a different session (still active)
    const blockedSeats = heldSeats.filter((seat) => {
      const hold = holdMap.get(seat.holdId?.toString() || '');
      return hold && hold.sessionId !== sessionId && hold.expiresAt >= new Date();
    });

    if (blockedSeats.length > 0) {
      throw new AppError(
        `Seats ${blockedSeats.map((s) => s.seatId).join(', ')} are held by another user`,
        409
      );
    }
  }

  // If we already have a hold for this session/event, extend it and add new seats
  if (existingHold) {
    const seatsAlreadyHeld = new Set(existingHold.seatIds);
    const seatsToAdd = seats
      .filter((s) => s.status === SEAT_STATUS.AVAILABLE && !seatsAlreadyHeld.has(s.seatId))
      .map((s) => s.seatId);

    if (seatsToAdd.length > 0) {
      const updateResult = await EventSeatState.updateMany(
        {
          eventId,
          seatId: { $in: seatsToAdd },
          status: SEAT_STATUS.AVAILABLE,
        },
        {
          $set: {
            status: SEAT_STATUS.HELD,
            holdId: existingHold._id,
            lastUpdated: new Date(),
          },
        }
      );

      if (updateResult.modifiedCount !== seatsToAdd.length) {
        throw new AppError('Concurrent modification detected. Some seats were taken by another user.', 409);
      }
    }

    // Extend expiry and merge seat list
    const expiresAt = new Date(Date.now() + SEAT_HOLD_EXPIRY_MINUTES * 60 * 1000);
    existingHold.expiresAt = expiresAt;
    existingHold.seatIds = Array.from(new Set([...existingHold.seatIds, ...seatIds]));
    await existingHold.save();

    await redisClient.setEx(
      `hold:${existingHold._id.toString()}`,
      SEAT_HOLD_EXPIRY_MINUTES * 60,
      JSON.stringify({
        holdId: existingHold._id.toString(),
        eventId,
        seatIds: existingHold.seatIds,
        sessionId,
        expiresAt: expiresAt.toISOString(),
      })
    );

    return existingHold;
  }

  // At this point all seats should be available
  const unavailableSeats = seats.filter((s) => s.status !== SEAT_STATUS.AVAILABLE);
  if (unavailableSeats.length > 0) {
    throw new AppError(
      `Seats ${unavailableSeats.map((s) => s.seatId).join(', ')} are no longer available`,
      409
    );
  }

  // 2. Create hold record
  const expiresAt = new Date(Date.now() + SEAT_HOLD_EXPIRY_MINUTES * 60 * 1000);
  const hold = await SeatHold.create({
    eventId,
    seatIds,
    sessionId,
    userId,
    expiresAt,
  });

  // 3. Update seat states to 'held' (atomic operation with version check)
  const updateResult = await EventSeatState.updateMany(
    {
      eventId,
      seatId: { $in: seatIds },
      status: SEAT_STATUS.AVAILABLE, // CRITICAL: Only update if still available
    },
    {
      $set: {
        status: SEAT_STATUS.HELD,
        holdId: hold._id,
        lastUpdated: new Date(),
      },
    }
  );

  if (updateResult.modifiedCount !== seatIds.length) {
    // Rollback: delete the hold we just created
    await SeatHold.deleteOne({ _id: hold._id });
    throw new AppError('Concurrent modification detected. Some seats were taken by another user.', 409);
  }

  // 4. Cache hold in Redis with TTL
  const cacheKey = `hold:${hold._id.toString()}`;
  await redisClient.setEx(
    cacheKey,
    SEAT_HOLD_EXPIRY_MINUTES * 60,
    JSON.stringify({
      holdId: hold._id.toString(),
      eventId,
      seatIds,
      sessionId,
      expiresAt: expiresAt.toISOString(),
    })
  );

  return hold;
};

/**
 * Release held seats
 */
export const releaseSeats = async (input: ReleaseSeatsInput): Promise<void> => {
  const { holdId, sessionId } = input;

  const hold = await SeatHold.findById(holdId);

  if (!hold) {
    throw new AppError('Hold not found or already expired', 404);
  }

  // Verify session owns this hold
  if (hold.sessionId !== sessionId) {
    throw new AppError('Unauthorized to release this hold', 403);
  }

  // 1. Release seats (set status back to available)
  await EventSeatState.updateMany(
    {
      holdId: hold._id,
      status: SEAT_STATUS.HELD,
    },
    {
      $set: { status: SEAT_STATUS.AVAILABLE },
      $unset: { holdId: 1 },
    }
  );

  // 2. Delete hold record
  await SeatHold.deleteOne({ _id: hold._id });

  // 3. Remove from Redis cache
  await redisClient.del(`hold:${holdId}`);
};

/**
 * Get seat availability for an event
 */
export const getSeatAvailability = async (eventId: string) => {
  const seats = await EventSeatState.find({ eventId }).select('seatId status lastUpdated');

  return seats.map((seat) => ({
    seatId: seat.seatId,
    status: seat.status,
    lastUpdated: seat.lastUpdated,
  }));
};

/**
 * Get full seat plan (seat index + current statuses + SVG) for an event
 */
export const getSeatPlan = async (eventId: string) => {
  const event = await Event.findById(eventId).populate('venueId');

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== EVENT_STATUS.PUBLISHED) {
    throw new AppError('Seat plan available only for published events', 400);
  }

  const venue = await Venue.findById(event.venueId);
  if (!venue || !venue.seatIndex || venue.totalSeats === 0) {
    throw new AppError('Venue seat map not configured', 400);
  }

  // Build seat index array from Map/object
  const seatIndexValues: any[] = Array.from(
    (venue.seatIndex as any).values
      ? (venue.seatIndex as any).values()
      : Object.values(venue.seatIndex || {})
  );

  // Fetch current seat states
  const seatStates = await EventSeatState.find({ eventId }).select('seatId status lastUpdated');
  const stateMap = new Map<string, { status: string; lastUpdated: Date }>();
  seatStates.forEach((s) => stateMap.set(s.seatId, { status: s.status, lastUpdated: s.lastUpdated }));

  const seats = seatIndexValues.map((seat) => ({
    id: seat.id,
    seatId: seat.id,
    section: seat.section,
    row: seat.row,
    seat: seat.seat,
    coordinates: seat.coordinates,
    status: stateMap.get(seat.id)?.status || SEAT_STATUS.AVAILABLE,
    lastUpdated: stateMap.get(seat.id)?.lastUpdated,
  }));

  return {
    eventId: event._id,
    venueName: venue.name,
    seatMapSvg: venue.seatMapSvg,
    sections: Array.from(new Set(seats.map((s) => s.section))),
    seats,
  };
};

/**
 * Cleanup expired holds (called by background job)
 */
export const cleanupExpiredHolds = async (): Promise<number> => {
  const expiredHolds = await SeatHold.find({
    expiresAt: { $lt: new Date() },
  });

  let cleanedCount = 0;

  for (const hold of expiredHolds) {
    try {
      // Release seats
      await EventSeatState.updateMany(
        {
          holdId: hold._id,
          status: SEAT_STATUS.HELD,
        },
        {
          $set: { status: SEAT_STATUS.AVAILABLE },
          $unset: { holdId: 1 },
        }
      );

      // Delete hold
      await SeatHold.deleteOne({ _id: hold._id });

      // Remove from Redis
      await redisClient.del(`hold:${hold._id.toString()}`);

      cleanedCount++;
    } catch (error) {
      console.error(`Error cleaning up hold ${hold._id}:`, error);
    }
  }

  if (cleanedCount > 0) {
    console.log(`✅ Cleaned up ${cleanedCount} expired seat holds`);
  }

  return cleanedCount;
};
