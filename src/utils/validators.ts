import { z } from 'zod';

/**
 * User Registration Schema
 */
export const registerUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phoneNumber: z.string().optional(),
});

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Guest Checkout Schema
 */
export const guestCheckoutSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Seat Hold Schema
 */
export const seatHoldSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  seatIds: z
    .array(z.string())
    .min(1, 'At least one seat must be selected')
    .max(10, 'Maximum 10 seats can be held at once'),
  sessionId: z.string().optional(),
});

/**
 * Seat Release Schema
 */
export const seatReleaseSchema = z.object({
  holdId: z.string().min(1, 'Hold ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Create Venue Schema
 */
export const createVenueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().min(5, 'Zip code is required'),
    country: z.string().default('USA'),
  }),
});

/**
 * Create Event Schema
 */
export const createEventSchema = z.object({
  venueId: z.string().min(1, 'Venue ID is required'),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().min(1, 'Event description is required'),
  eventDate: z.string().datetime('Invalid date format'),
  eventEndDate: z.string().datetime().optional(),
  doorOpenTime: z.string().datetime().optional(),
  eventType: z.enum(['concert', 'sports', 'theater', 'conference', 'other']),
  imageUrl: z.string().url().optional(),
  pricingZones: z.record(z.string(), z.object({
      name: z.string(),
      price: z.number().positive('Price must be positive'),
      currency: z.literal('USD').default('USD'),
    })),
});

/**
 * Create Order Schema
 */
export const createOrderSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  seatIds: z.array(z.string()).min(1, 'At least one seat is required'),
  customerInfo: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phoneNumber: z.string().optional(),
  }),
});

/**
 * Ticket Validation Schema (Scanner)
 */
export const validateTicketSchema = z.object({
  ticketCode: z.string().min(1, 'Ticket code is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  deviceInfo: z
    .object({
      deviceId: z.string().optional(),
      appVersion: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
});

export const scanHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

/**
 * Create Staff Schema
 */
export const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['staff', 'admin']).default('staff'),
  assignedEvents: z.array(z.string()).optional(),
});

// Type exports
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;
export type SeatHoldInput = z.infer<typeof seatHoldSchema>;
export type SeatReleaseInput = z.infer<typeof seatReleaseSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
export type ScanHistoryQueryInput = z.infer<typeof scanHistoryQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
