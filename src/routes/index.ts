import { Router, type IRouter } from 'express';
import authRoutes from './auth.routes.js';
import staffRoutes from './staff.routes.js';
import venueRoutes from './venue.routes.js';
import eventRoutes from './event.routes.js';
import seatRoutes from './seat.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import scannerRoutes from './scanner.routes.js';

const router: IRouter = Router();

// User authentication routes
router.use('/auth', authRoutes);

// Staff routes
router.use('/staff', staffRoutes);

// Event routes (public + admin)
router.use('/events', eventRoutes);

// Venue routes (admin only)
router.use('/admin/venues', venueRoutes);

// Seat routes (hold, release, availability)
router.use('/seats', seatRoutes);

// Orders & payments
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);

// Scanner routes (staff QR validation)
router.use('/scanner', scannerRoutes);

export default router;
