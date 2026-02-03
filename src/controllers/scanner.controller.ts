import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import * as scannerService from '../services/scanner.service.js';
import { validate, validateQuery } from '../middleware/validation.middleware.js';
import { validateTicketSchema, scanHistoryQuerySchema } from '../utils/validators.js';

/**
 * Validate a ticket QR code
 */
export const validateTicket = [
  validate(validateTicketSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { ticketCode, eventId, deviceInfo, location } = req.body;
    const staffId = req.user?.userId;

    const result = await scannerService.validateAndMarkTicket({
      ticketCode,
      eventId,
      staffId,
      deviceInfo,
      location,
    });

    const statusCode = result.valid
      ? 200
      : result.status === 'already_used'
      ? 409
      : 400;

    res.status(statusCode).json({
      success: result.valid,
      data: {
        ...result,
        result: result.status, // Legacy field for existing clients
      },
    });
  }),
];

/**
 * Get scan history for an event
 */
export const getScanHistory = [
  validateQuery(scanHistoryQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const history = await scannerService.getScanHistory(
      eventId,
      Number(limit),
      Number(offset)
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  }),
];

/**
 * Get scan stats for an event
 */
export const getScanStats = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const stats = await scannerService.getEventScanStats(eventId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});
