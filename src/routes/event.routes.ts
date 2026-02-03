import { Router, type IRouter } from 'express';
import * as eventController from '../controllers/event.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { requireAdmin, requireOrganizer } from '../middleware/roleCheck.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createEventSchema } from '../utils/validators.js';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/events
 * @desc    Get all events with filtering and pagination
 * @access  Public
 */
router.get('/', optionalAuth, eventController.getEvents);

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get event by ID or slug
 * @access  Public
 */
router.get('/:id', optionalAuth, eventController.getEvent);

// Organizer and Admin routes
router.use('/organizer', authenticate, requireOrganizer);

/**
 * @route   POST /api/v1/events/organizer
 * @desc    Create new event (Organizer/Admin)
 * @access  Private (Organizer/Admin)
 */
router.post('/organizer', validate(createEventSchema), eventController.createEvent);

/**
 * @route   PATCH /api/v1/events/organizer/:id
 * @desc    Update event (Organizer/Admin)
 * @access  Private (Organizer/Admin)
 */
router.patch('/organizer/:id', eventController.updateEvent);

/**
 * @route   DELETE /api/v1/events/organizer/:id
 * @desc    Delete event (Organizer/Admin)
 * @access  Private (Organizer/Admin)
 */
router.delete('/organizer/:id', eventController.cancelEvent);

// Admin-only routes
router.use('/admin', authenticate, requireAdmin);

/**
 * @route   POST /api/v1/events/admin/:id/approve
 * @desc    Approve event (Admin only)
 * @access  Private (Admin only)
 */
router.post('/admin/:id/approve', eventController.approveEvent);

/**
 * @route   POST /api/v1/events/admin/:id/publish
 * @desc    Publish event (Admin only)
 * @access  Private (Admin only)
 */
router.post('/admin/:id/publish', eventController.publishEvent);

/**
 * @route   GET /api/v1/events/admin/:id/analytics
 * @desc    Get event analytics (Admin only)
 * @access  Private (Admin only)
 */
router.get('/admin/:id/analytics', eventController.getEventAnalytics);

export default router;
