import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, stripeConfig } from '../config/stripe.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import * as orderService from '../services/order.service.js';

/**
 * Stripe webhook handler
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(400).json({ success: false, message: 'Stripe is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeConfig.webhookSecret);
  } catch (err: any) {
    console.error('❌ Stripe webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  await orderService.handleStripeWebhook(event.type, event.data.object);

  res.json({ received: true });
});
