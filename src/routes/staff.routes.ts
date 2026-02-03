import { Router, type IRouter } from 'express';
import * as staffController from '../controllers/staff.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireStaff } from '../middleware/roleCheck.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { loginSchema } from '../utils/validators.js';

const router: IRouter = Router();

/**
 * @route   POST /api/v1/staff/auth/login
 * @desc    Staff login
 * @access  Public
 */
router.post('/auth/login', validate(loginSchema), staffController.staffLogin);

/**
 * @route   POST /api/v1/staff/auth/refresh-token
 * @desc    Refresh staff token
 * @access  Public
 */
router.post('/auth/refresh-token', staffController.staffRefreshToken);

/**
 * @route   GET /api/v1/staff/me
 * @desc    Get current staff profile
 * @access  Private (Staff only)
 */
router.get('/me', authenticate, requireStaff, staffController.getStaffProfile);

export default router;
