import { Request, Response } from 'express';
import * as eventService from '../services/event.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Create new event
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.createEvent({
    ...req.body,
    eventDate: new Date(req.body.eventDate),
    eventEndDate: req.body.eventEndDate ? new Date(req.body.eventEndDate) : undefined,
    doorOpenTime: req.body.doorOpenTime ? new Date(req.body.doorOpenTime) : undefined,
    pricingZones: new Map(Object.entries(req.body.pricingZones || {})),
    createdBy: req.user!.userId,
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event,
  });
});

/**
 * Publish event (initialize seat availability)
 */
export const publishEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await eventService.publishEvent(id);

  res.status(200).json({
    success: true,
    message: 'Event published successfully. All seats are now available for booking.',
    data: event,
  });
});

/**
 * Get event by ID
 */
export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await eventService.getEventById(id);

  if (!event) {
    res.status(404).json({
      success: false,
      message: 'Event not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: event,
  });
});

/**
 * Get all events
 */
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const { status, eventType, city, dateFrom, dateTo, page, limit } = req.query;

  const result = await eventService.getAllEvents({
    status: status as string,
    eventType: eventType as string,
    city: city as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
  });

  res.status(200).json({
    success: true,
    data: result.events,
    pagination: {
      total: result.total,
      page: result.page,
      pages: result.pages,
      limit: limit ? parseInt(limit as string) : 20,
    },
  });
});

/**
 * Update event
 */
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Convert pricingZones to Map if provided
  const updates = { ...req.body };
  if (updates.pricingZones) {
    updates.pricingZones = new Map(Object.entries(updates.pricingZones));
  }

  const event = await eventService.updateEvent(id, updates);

  if (!event) {
    res.status(404).json({
      success: false,
      message: 'Event not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: event,
  });
});

/**
 * Cancel event
 */
export const cancelEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await eventService.cancelEvent(id);

  res.status(200).json({
    success: true,
    message: 'Event cancelled successfully',
    data: event,
  });
});

/**
 * Get event analytics
 */
export const getEventAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const analytics = await eventService.getEventAnalytics(id);

  res.status(200).json({
    success: true,
    data: analytics,
  });
});
