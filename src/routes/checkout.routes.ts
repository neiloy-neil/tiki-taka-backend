import { Router, type IRouter } from 'express';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { createCheckoutSession } from '../controllers/checkout.controller.js';

const router: IRouter = Router();

/**
 * @route   POST /api/v1/checkout/create-session
 * @desc    Create Stripe checkout session
 * @access  Public (optional auth)
 */
router.post('/create-session', optionalAuth, createCheckoutSession);

export default router;