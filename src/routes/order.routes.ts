import { Router, type IRouter } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { requireStaff } from '../middleware/roleCheck.middleware.js';
import * as orderController from '../controllers/order.controller.js';

const router: IRouter = Router();

// Create checkout intent
router.post('/checkout-intent', optionalAuth, orderController.createCheckoutIntent);

// Get order status
router.get('/:id', authenticate, orderController.getOrder);

// Finalize order after payment (Stripe confirmation)
router.post('/:id/finalize', optionalAuth, orderController.finalizeOrder);

// Get current user's orders
router.get('/', authenticate, orderController.listMyOrders);

// Staff/admin: list all orders
router.get('/admin/all', authenticate, requireStaff, orderController.listAllOrders);

export default router;
