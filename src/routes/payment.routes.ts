import { Router, type IRouter } from 'express';
import * as paymentController from '../controllers/payment.controller.js';

const router: IRouter = Router();

// Stripe webhook endpoint (raw body required)
router.post('/webhook', paymentController.handleWebhook);

export default router;
