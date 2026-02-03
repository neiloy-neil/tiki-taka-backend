import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import * as orderService from '../services/order.service.js';
import { validate } from '../middleware/validation.middleware.js';
import { createOrderSchema } from '../utils/validators.js';

/**
 * Create checkout intent (Stripe PaymentIntent or mock) for selected seats
 */
export const createCheckoutIntent = [
  validate(createOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId, seatIds, customerInfo } = req.body;
    const sessionId = req.body.sessionId || (req.user ? `user_${req.user.userId}` : undefined);

    const { order, clientSecret } = await orderService.createCheckoutIntent({
      eventId,
      seatIds,
      customerInfo,
      sessionId,
      userId: req.user?.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Checkout initiated',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentIntentClientSecret: clientSecret,
        breakdown: order.breakdown,
      },
    });
  }),
];

/**
 * Retrieve an order with tickets
 */
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await orderService.getOrderById(id);

  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * Finalize order after successful payment
 */
export const finalizeOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await orderService.finalizeOrder(id);

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * List orders for the authenticated customer
 */
export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const orders = await orderService.listOrdersForUser(req.user.userId);
  res.status(200).json({ success: true, data: orders });
});

/**
 * Admin/staff: list all orders
 */
export const listAllOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const orders = await orderService.listAllOrders();
  res.status(200).json({ success: true, data: orders });
});
