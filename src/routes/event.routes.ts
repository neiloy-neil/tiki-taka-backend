import { Router, type IRouter } from 'express';
import * as eventController from '../controllers/event.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/roleCheck.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createEventSchema } from '../utils/validators.js';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/events
 * @desc    Get all published events (public)
 * @access  Public
 */
router.get('/', optionalAuth, eventController.getEvents);

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get event by ID (public)
 * @access  Public
 */
router.get('/:id', optionalAuth, eventController.getEvent);

// Admin-only routes
router.use(authenticate, requireAdmin);

/**
 * @route   POST /api/v1/events
 * @desc    Create new event
 * @access  Private (Admin only)
 */
router.post('/', validate(createEventSchema), eventController.createEvent);

/**
 * @route   POST /api/v1/events/:id/publish
 * @desc    Publish event (initialize seat availability)
 * @access  Private (Admin only)
 */
router.post('/:id/publish', eventController.publishEvent);

/**
 * @route   PATCH /api/v1/events/:id
 * @desc    Update event
 * @access  Private (Admin only)
 */
router.patch('/:id', eventController.updateEvent);

/**
 * @route   POST /api/v1/events/:id/cancel
 * @desc    Cancel event
 * @access  Private (Admin only)
 */
router.post('/:id/cancel', eventController.cancelEvent);

/**
 * @route   GET /api/v1/events/:id/analytics
 * @desc    Get event analytics
 * @access  Private (Admin only)
 */
router.get('/:id/analytics', eventController.getEventAnalytics);

export default router;
