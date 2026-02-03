import { TicketType, ITicketType } from '../models/TicketType.model.js';
import { Event } from '../models/Event.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

export interface CreateTicketTypeInput {
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  totalQuantity: number;
  maxPerOrder: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
}

export interface UpdateTicketTypeInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  maxPerOrder?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  isActive?: boolean;
}

/**
 * Create a new ticket type for an event
 */
export const createTicketType = async (input: CreateTicketTypeInput, createdBy: string): Promise<ITicketType> => {
  const { eventId, name, totalQuantity, ...rest } = input;

  // Verify event exists and user has permission
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check if user is organizer of this event or admin
  // @ts-ignore
  if (event.createdBy.toString() !== createdBy && !createdBy.isAdmin) {
    throw new AppError('You do not have permission to create ticket types for this event', 403);
  }

  // Check if ticket type with same name already exists for this event
  const existingTicketType = await TicketType.findOne({ eventId, name });
  if (existingTicketType) {
    throw new AppError('Ticket type with this name already exists for this event', 409);
  }

  // Create ticket type with available quantity equal to total quantity
  const ticketType = await TicketType.create({
    eventId,
    name,
    totalQuantity,
    availableQuantity: totalQuantity,
    soldQuantity: 0,
    ...rest,
  });

  return ticketType;
};

/**
 * Get all ticket types for an event
 */
export const getTicketTypesByEvent = async (eventId: string): Promise<ITicketType[]> => {
  // Verify event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // For public users, only return active ticket types
  const query: any = { eventId, isActive: true };
  
  return TicketType.find(query).sort({ price: 1 });
};

/**
 * Get ticket type by ID
 */
export const getTicketTypeById = async (ticketTypeId: string): Promise<ITicketType | null> => {
  return TicketType.findById(ticketTypeId);
};

/**
 * Update ticket type
 */
export const updateTicketType = async (
  ticketTypeId: string, 
  updates: UpdateTicketTypeInput, 
  userId: string
): Promise<ITicketType> => {
  const ticketType = await TicketType.findById(ticketTypeId);
  if (!ticketType) {
    throw new AppError('Ticket type not found', 404);
  }

  // Verify user has permission to update this ticket type
  const event = await Event.findById(ticketType.eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // @ts-ignore
  if (event.createdBy.toString() !== userId && !userId.isAdmin) {
    throw new AppError('You do not have permission to update this ticket type', 403);
  }

  // Prevent overselling - ensure available quantity doesn't go negative
  if (updates.totalQuantity !== undefined) {
    const newAvailable = updates.totalQuantity - ticketType.soldQuantity;
    if (newAvailable < 0) {
      throw new AppError('Cannot reduce total quantity below sold quantity', 400);
    }
    updates.availableQuantity = newAvailable;
  }

  Object.assign(ticketType, updates);
  await ticketType.save();

  return ticketType;
};

/**
 * Delete ticket type
 */
export const deleteTicketType = async (ticketTypeId: string, userId: string): Promise<void> => {
  const ticketType = await TicketType.findById(ticketTypeId);
  if (!ticketType) {
    throw new AppError('Ticket type not found', 404);
  }

  // Verify user has permission to delete this ticket type
  const event = await Event.findById(ticketType.eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // @ts-ignore
  if (event.createdBy.toString() !== userId && !userId.isAdmin) {
    throw new AppError('You do not have permission to delete this ticket type', 403);
  }

  // Prevent deletion if tickets have been sold
  if (ticketType.soldQuantity > 0) {
    throw new AppError('Cannot delete ticket type with sold tickets', 400);
  }

  await TicketType.findByIdAndDelete(ticketTypeId);
};

/**
 * Update ticket availability (used when tickets are sold or refunded)
 */
export const updateTicketAvailability = async (
  ticketTypeId: string, 
  quantityChange: number
): Promise<ITicketType> => {
  const ticketType = await TicketType.findById(ticketTypeId);
  if (!ticketType) {
    throw new AppError('Ticket type not found', 404);
  }

  // Prevent overselling
  const newAvailable = ticketType.availableQuantity - quantityChange;
  const newSold = ticketType.soldQuantity + quantityChange;

  if (newAvailable < 0) {
    throw new AppError('Not enough tickets available', 400);
  }

  if (newSold < 0) {
    throw new AppError('Cannot have negative sold quantity', 400);
  }

  ticketType.availableQuantity = newAvailable;
  ticketType.soldQuantity = newSold;
  await ticketType.save();

  return ticketType;
};