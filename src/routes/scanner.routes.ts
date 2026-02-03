import { Router, type IRouter } from 'express';
import * as scannerController from '../controllers/scanner.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireStaff } from '../middleware/roleCheck.middleware.js';
import { validateParams, validateQuery } from '../middleware/validation.middleware.js';
import { eventIdParamSchema, scanHistoryQuerySchema } from '../utils/validators.js';

const router: IRouter = Router();

// Validate a ticket (preferred endpoint)
router.post('/validate', authenticate, requireStaff, scannerController.validateTicket);

// Legacy endpoint kept for backward compatibility
router.post('/scan', authenticate, requireStaff, scannerController.validateTicket);

// Get scan history for an event
router.get(
  '/history/:eventId',
  authenticate,
  requireStaff,
  validateParams(eventIdParamSchema),
  validateQuery(scanHistoryQuerySchema),
  scannerController.getScanHistory
);

// Get scanner statistics for an event
router.get(
  '/stats/:eventId',
  authenticate,
  requireStaff,
  validateParams(eventIdParamSchema),
  scannerController.getScanStats
);

export default router;
