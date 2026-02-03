import { Request, Response } from 'express';
import * as seatService from '../services/seat.service.js';
import { broadcastSeatUpdate } from '../services/realtime.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { generateSessionId } from '../utils/crypto.js';
import { SEAT_STATUS } from '../config/constants.js';

/**
 * Hold seats for purchase
 */
export const holdSeats = asyncHandler(async (req: Request, res: Response) => {
  const { eventId, seatIds } = req.body;

  // Get or generate session ID
  let sessionId = req.body.sessionId;
  if (!sessionId) {
    sessionId = req.user ? `user_${req.user.userId}` : generateSessionId();
  }

  const hold = await seatService.holdSeats({
    eventId,
    seatIds,
    sessionId,
    userId: req.user?.userId,
  });

  // Broadcast real-time update
  broadcastSeatUpdate(
    eventId,
    seatIds.map((seatId: string) => ({
      seatId,
      status: SEAT_STATUS.HELD,
    }))
  );

  res.status(200).json({
    success: true,
    message: 'Seats held successfully',
    data: {
      holdId: hold._id,
      seatIds: hold.seatIds,
      expiresAt: hold.expiresAt,
      sessionId,
    },
  });
});

/**
 * Release held seats
 */
export const releaseSeats = asyncHandler(async (req: Request, res: Response) => {
  const { holdId } = req.body;

  // Get session ID
  const sessionId = req.body.sessionId || (req.user ? `user_${req.user.userId}` : '');

  if (!sessionId) {
    res.status(400).json({
      success: false,
      message: 'Session ID is required',
    });
    return;
  }

  await seatService.releaseSeats({ holdId, sessionId });

  res.status(200).json({
    success: true,
    message: 'Seats released successfully',
  });
});

/**
 * Get seat availability for an event
 */
export const getSeatAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const seats = await seatService.getSeatAvailability(eventId);

  res.status(200).json({
    success: true,
    data: seats,
  });
});

/**
 * Get full seat plan (seat index + statuses + SVG) for an event
 */
export const getSeatPlan = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const plan = await seatService.getSeatPlan(eventId);

  res.status(200).json({
    success: true,
    data: plan,
  });
});
