import Stripe from 'stripe';

/**
 * Initialize Stripe client only when a secret key is configured.
 * This lets local dev run in "mock" mode without crashing on startup.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
      typescript: true,
    })
  : null;

export const stripeConfig = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
};
