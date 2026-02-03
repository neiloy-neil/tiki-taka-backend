import { Router, type IRouter } from 'express';
import * as seatController from '../controllers/seat.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { validate, validateParams } from '../middleware/validation.middleware.js';
import { seatHoldSchema, seatReleaseSchema, eventIdParamSchema } from '../utils/validators.js';
import rateLimit from 'express-rate-limit';
import { SEAT_HOLD_CONFIG } from '../config/constants.js';

const router: IRouter = Router();

// Strict rate limiting for seat holds to prevent abuse
const seatHoldLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: SEAT_HOLD_CONFIG.maxHoldRequestsPerMinute,
  message: 'Too many seat hold requests. Please try again in a minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   GET /api/v1/seats/event/:eventId/status
 * @desc    Get seat availability for an event
 * @access  Public
 */
router.get('/event/:eventId/status', optionalAuth, seatController.getSeatAvailability);

/**
 * @route   GET /api/v1/seats/event/:eventId/plan
 * @desc    Get full seat plan (seat index + statuses + SVG)
 * @access  Public
 */
router.get(
  '/event/:eventId/plan',
  optionalAuth,
  validateParams(eventIdParamSchema),
  seatController.getSeatPlan
);

/**
 * @route   POST /api/v1/seats/hold
 * @desc    Hold seats temporarily (10 min expiration)
 * @access  Public (with optional auth)
 */
router.post(
  '/hold',
  seatHoldLimiter,
  optionalAuth,
  validate(seatHoldSchema),
  seatController.holdSeats
);

/**
 * @route   DELETE /api/v1/seats/release
 * @desc    Release held seats
 * @access  Public
 */
router.delete('/release', optionalAuth, validate(seatReleaseSchema), seatController.releaseSeats);

export default router;
