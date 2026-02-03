import { Request, Response } from 'express';
import * as ticketTypeService from '../services/ticketType.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Create new ticket type
 */
export const createTicketType = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const ticketType = await ticketTypeService.createTicketType(req.body, req.user!.userId);

  res.status(201).json({
    success: true,
    message: 'Ticket type created successfully',
    data: ticketType,
  });
});

/**
 * Get all ticket types for an event
 */
export const getTicketTypesByEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const ticketTypes = await ticketTypeService.getTicketTypesByEvent(eventId);

  res.status(200).json({
    success: true,
    data: ticketTypes,
  });
});

/**
 * Get ticket type by ID
 */
export const getTicketType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const ticketType = await ticketTypeService.getTicketTypeById(id);

  if (!ticketType) {
    res.status(404).json({
      success: false,
      message: 'Ticket type not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: ticketType,
  });
});

/**
 * Update ticket type
 */
export const updateTicketType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // @ts-ignore
  const ticketType = await ticketTypeService.updateTicketType(id, req.body, req.user!.userId);

  res.status(200).json({
    success: true,
    message: 'Ticket type updated successfully',
    data: ticketType,
  });
});

/**
 * Delete ticket type
 */
export const deleteTicketType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // @ts-ignore
  await ticketTypeService.deleteTicketType(id, req.user!.userId);

  res.status(200).json({
    success: true,
    message: 'Ticket type deleted successfully',
  });
});