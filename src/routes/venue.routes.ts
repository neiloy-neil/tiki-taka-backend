import { Router, type IRouter } from 'express';
import * as venueController from '../controllers/venue.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/roleCheck.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createVenueSchema } from '../utils/validators.js';

const router: IRouter = Router();

// All venue routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/v1/admin/venues
 * @desc    Get all venues
 * @access  Private (Admin only)
 */
router.get('/', venueController.getVenues);

/**
 * @route   GET /api/v1/admin/venues/:id
 * @desc    Get venue by ID
 * @access  Private (Admin only)
 */
router.get('/:id', venueController.getVenue);

/**
 * @route   POST /api/v1/admin/venues/preview
 * @desc    Generate venue preview from template (no save)
 * @access  Private (Admin only)
 */
router.post('/preview', venueController.generatePreview);

/**
 * @route   POST /api/v1/admin/venues/from-template
 * @desc    Create venue from template
 * @access  Private (Admin only)
 */
router.post('/from-template', venueController.createVenueFromTemplate);

/**
 * @route   POST /api/v1/admin/venues
 * @desc    Create new venue (manual SVG upload)
 * @access  Private (Admin only)
 */
router.post('/', validate(createVenueSchema), venueController.createVenue);

/**
 * @route   POST /api/v1/admin/venues/:venueId/upload-svg
 * @desc    Upload SVG seat map
 * @access  Private (Admin only)
 */
router.post('/:venueId/upload-svg', venueController.uploadSvgSeatMap);

/**
 * @route   PATCH /api/v1/admin/venues/:id
 * @desc    Update venue
 * @access  Private (Admin only)
 */
router.patch('/:id', venueController.updateVenue);

/**
 * @route   DELETE /api/v1/admin/venues/:id
 * @desc    Delete venue (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', venueController.deleteVenue);

export default router;
