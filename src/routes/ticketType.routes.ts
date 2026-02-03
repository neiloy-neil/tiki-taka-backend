import { Router, type IRouter } from 'express';
import * as ticketTypeController from '../controllers/ticketType.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { requireOrganizer } from '../middleware/roleCheck.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createTicketTypeSchema } from '../utils/validators.js';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/tickets/:eventId
 * @desc    Get all ticket types for an event (public)
 * @access  Public
 */
router.get('/:eventId', optionalAuth, ticketTypeController.getTicketTypesByEvent);

/**
 * @route   GET /api/v1/tickets/type/:id
 * @desc    Get ticket type by ID (public)
 * @access  Public
 */
router.get('/type/:id', optionalAuth, ticketTypeController.getTicketType);

// Organizer and Admin routes
router.use(authenticate, requireOrganizer);

/**
 * @route   POST /api/v1/tickets
 * @desc    Create new ticket type (Organizer/Admin)
 * @access  Private (Organizer/Admin)
 */
router.post('/', validate(createTicketTypeSchema), ticketTypeController.createTicketType);

/**
 * @route   PATCH /api/v1/tickets/:id
 * @desc    Update ticket type (Organizer/Admin)
 * @access  Private (Organizer/Admin)
 */
router.patch('/:id', ticketTypeController.updateTicketType);

/**
 * @route   DELETE /api/v1/tickets/:id
 * @desc    Delete ticket type (Organizer/Admin)
 * @access  Private (Organizer/Admin)
 */
router.delete('/:id', ticketTypeController.deleteTicketType);

export default router;