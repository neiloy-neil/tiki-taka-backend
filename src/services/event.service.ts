import { Event, IEvent } from '../models/Event.model.js';
import { Venue } from '../models/Venue.model.js';
import { EventSeatState } from '../models/EventSeatState.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { EVENT_STATUS, SEAT_STATUS } from '../config/constants.js';

export interface CreateEventInput {
  venueId: string;
  title: string;
  description: string;
  eventDate: Date;
  eventEndDate?: Date;
  doorOpenTime?: Date;
  eventType: string;
  imageUrl?: string;
  pricingZones: Map<string, { name: string; price: number; currency: 'USD' }>;
  createdBy: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  eventDate?: Date;
  eventEndDate?: Date;
  doorOpenTime?: Date;
  imageUrl?: string;
  pricingZones?: Map<string, { name: string; price: number; currency: 'USD' }>;
  status?: typeof EVENT_STATUS[keyof typeof EVENT_STATUS];
}

/**
 * Create a new event
 */
export const createEvent = async (input: CreateEventInput): Promise<IEvent> => {
  const { venueId, title, description, eventDate, createdBy, pricingZones, ...rest } = input;

  // Verify venue exists and has seat map
  const venue = await Venue.findById(venueId);
  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  if (!venue.seatMapSvg || venue.totalSeats === 0) {
    throw new AppError('Venue does not have a seat map configured', 400);
  }

  // Validate pricing zones match venue sections
  const venueSections = new Set<string>();
  venue.seatIndex.forEach((seat) => {
    venueSections.add(seat.section);
  });

  // Check if at least one pricing zone exists
  if (pricingZones.size === 0) {
    throw new AppError('At least one pricing zone is required', 400);
  }

  // Create event
  const event = await Event.create({
    venueId,
    title,
    description,
    eventDate,
    pricingZones,
    totalCapacity: venue.totalSeats,
    soldCount: 0,
    status: EVENT_STATUS.DRAFT,
    createdBy,
    isActive: true,
    ...rest,
  });

  return event;
};

/**
 * Publish event (initializes seat availability)
 */
export const publishEvent = async (eventId: string): Promise<IEvent> => {
  const event = await Event.findById(eventId).populate('venueId');

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== EVENT_STATUS.DRAFT) {
    throw new AppError('Only draft events can be published', 400);
  }

  const venue = await Venue.findById(event.venueId);
  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  // Initialize EventSeatState for all seats
  const seatStates = Array.from(venue.seatIndex.values()).map((seat) => ({
    eventId: event._id,
    seatId: seat.id,
    status: SEAT_STATUS.AVAILABLE,
    lastUpdated: new Date(),
  }));

  // Bulk insert seat states
  await EventSeatState.insertMany(seatStates, { ordered: false });

  // Update event status
  event.status = EVENT_STATUS.PUBLISHED;
  await event.save();

  return event;
};

/**
 * Get event by ID
 */
export const getEventById = async (eventId: string): Promise<IEvent | null> => {
  return Event.findById(eventId).populate('venueId');
};

/**
 * Get all events
 */
export const getAllEvents = async (filters: {
  status?: string;
  eventType?: string;
  city?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}): Promise<{ events: IEvent[]; total: number; page: number; pages: number }> => {
  const { status, eventType, dateFrom, dateTo, page = 1, limit = 20 } = filters;

  const query: any = { isActive: true };

  if (status) {
    query.status = status;
  } else {
    // By default, only show published events for public
    query.status = EVENT_STATUS.PUBLISHED;
  }

  if (eventType) {
    query.eventType = eventType;
  }

  if (dateFrom || dateTo) {
    query.eventDate = {};
    if (dateFrom) query.eventDate.$gte = dateFrom;
    if (dateTo) query.eventDate.$lte = dateTo;
  }

  const total = await Event.countDocuments(query);
  const events = await Event.find(query)
    .populate('venueId', 'name address')
    .sort({ eventDate: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    events,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Update event
 */
export const updateEvent = async (
  eventId: string,
  updates: UpdateEventInput
): Promise<IEvent | null> => {
  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Prevent updates to published events for certain fields
  if (event.status === EVENT_STATUS.PUBLISHED) {
    if (updates.pricingZones) {
      throw new AppError('Cannot update pricing zones for published events', 400);
    }
  }

  // Update fields
  Object.assign(event, updates);

  await event.save();

  return event;
};

/**
 * Cancel event
 */
export const cancelEvent = async (eventId: string): Promise<IEvent> => {
  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status === EVENT_STATUS.COMPLETED) {
    throw new AppError('Cannot cancel completed events', 400);
  }

  event.status = EVENT_STATUS.CANCELLED;
  await event.save();

  // TODO: Send cancellation emails to ticket holders
  // TODO: Process refunds

  return event;
};

/**
 * Get event analytics
 */
export const getEventAnalytics = async (eventId: string) => {
  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Get seat status breakdown
  const seatStats = await EventSeatState.aggregate([
    { $match: { eventId: event._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const statsMap: Record<string, number> = {};
  seatStats.forEach((stat) => {
    statsMap[stat._id] = stat.count;
  });

  const available = statsMap[SEAT_STATUS.AVAILABLE] || 0;
  const held = statsMap[SEAT_STATUS.HELD] || 0;
  const sold = statsMap[SEAT_STATUS.SOLD] || 0;

  return {
    eventId: event._id,
    title: event.title,
    totalCapacity: event.totalCapacity,
    soldCount: sold,
    availableCount: available,
    heldCount: held,
    occupancyRate: ((sold / event.totalCapacity) * 100).toFixed(2) + '%',
    status: event.status,
    eventDate: event.eventDate,
  };
};
