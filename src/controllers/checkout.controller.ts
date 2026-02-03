import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import * as orderService from '../services/order.service.js';
import { validate } from '../middleware/validation.middleware.js';
import { z } from 'zod';

// Validation schema for checkout session
const createCheckoutSessionSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  ticketTypes: z.array(z.object({
    ticketTypeId: z.string().min(1, 'Ticket type ID is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
  })).min(1, 'At least one ticket type is required'),
  customerInfo: z.object({
    email: z.string().email('Invalid email address'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phoneNumber: z.string().optional(),
  }),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
});

export const createCheckoutSession = [
  validate(createCheckoutSessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // @ts-ignore
    const result = await orderService.createCheckoutSession({
      ...req.body,
      userId: req.user?.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Checkout session created',
      data: {
        orderId: result.order._id,
        orderNumber: result.order.orderNumber,
        sessionUrl: result.sessionUrl,
      },
    });
  }),
];