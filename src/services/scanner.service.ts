import { Types } from 'mongoose';
import { Ticket } from '../models/Ticket.model.js';
import { Order } from '../models/Order.model.js';
import { ScanLog } from '../models/ScanLog.model.js';
import { SCAN_RESULT, TICKET_STATUS, PAYMENT_STATUS } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

type ValidateTicketInput = {
  ticketCode: string;
  eventId: string;
  staffId?: string;
  deviceInfo?: { deviceId?: string; appVersion?: string };
  location?: { latitude?: number; longitude?: number };
};

type ValidationResultStatus =
  | 'valid'
  | 'already_used'
  | 'not_found'
  | 'wrong_event'
  | 'cancelled'
  | 'payment_pending';

type ValidationResult = {
  valid: boolean;
  status: ValidationResultStatus;
  ticket?: {
    ticketCode: string;
    seatId: string;
    eventId: Types.ObjectId;
    usedAt?: Date;
    ticketType?: string;
    customerName?: string;
  };
  message: string;
};

/**
 * Validate a ticket scan and mark as used when appropriate.
 * Returns structured status instead of throwing for expected validation failures.
 */
export const validateAndMarkTicket = async (input: ValidateTicketInput): Promise<ValidationResult> => {
  const { ticketCode, eventId, staffId, deviceInfo, location } = input;

  if (!staffId) {
    throw new AppError('Staff authentication required', 401);
  }

  const ticket = await Ticket.findOne({ ticketCode }).populate('eventId orderId');
  let scanResult: typeof SCAN_RESULT[keyof typeof SCAN_RESULT] = SCAN_RESULT.INVALID;

  if (!ticket) {
    await logScan(null, ticketCode, eventId, staffId, SCAN_RESULT.INVALID, deviceInfo, location);
    return {
      valid: false,
      status: 'not_found',
      message: 'Ticket not found',
    };
  }

  if (ticket.eventId.toString() !== eventId) {
    await logScan(ticket._id, ticketCode, eventId, staffId, SCAN_RESULT.WRONG_EVENT, deviceInfo, location);
    return {
      valid: false,
      status: 'wrong_event',
      ticket: {
        ticketCode: ticket.ticketCode,
        seatId: ticket.seatId,
        eventId: ticket.eventId,
      },
      message: 'Ticket is for a different event',
    };
  }

  const order = await Order.findById(ticket.orderId);
  if (!order || order.paymentStatus !== PAYMENT_STATUS.SUCCEEDED) {
    await logScan(ticket._id, ticketCode, eventId, staffId, SCAN_RESULT.INVALID, deviceInfo, location);
    return {
      valid: false,
      status: 'payment_pending',
      ticket: {
        ticketCode: ticket.ticketCode,
        seatId: ticket.seatId,
        eventId: ticket.eventId,
      },
      message: 'Ticket payment not confirmed',
    };
  }

  if (ticket.status === TICKET_STATUS.USED) {
    await logScan(ticket._id, ticketCode, eventId, staffId, SCAN_RESULT.ALREADY_USED, deviceInfo, location);
    return {
      valid: false,
      status: 'already_used',
      ticket: {
        ticketCode: ticket.ticketCode,
        seatId: ticket.seatId,
        eventId: ticket.eventId,
        usedAt: ticket.usedAt || undefined,
      },
      message: ticket.usedAt
        ? `Ticket already scanned at ${ticket.usedAt.toLocaleString()}`
        : 'Ticket already used',
    };
  }

  if (ticket.status === TICKET_STATUS.CANCELLED) {
    await logScan(ticket._id, ticketCode, eventId, staffId, SCAN_RESULT.CANCELLED, deviceInfo, location);
    return {
      valid: false,
      status: 'cancelled',
      ticket: {
        ticketCode: ticket.ticketCode,
        seatId: ticket.seatId,
        eventId: ticket.eventId,
      },
      message: 'Ticket has been cancelled',
    };
  }

  if (ticket.status !== TICKET_STATUS.VALID) {
    await logScan(ticket._id, ticketCode, eventId, staffId, SCAN_RESULT.INVALID, deviceInfo, location);
    return {
      valid: false,
      status: 'payment_pending',
      ticket: {
        ticketCode: ticket.ticketCode,
        seatId: ticket.seatId,
        eventId: ticket.eventId,
      },
      message: 'Ticket is not valid for entry',
    };
  }

  // Mark as used
  ticket.status = TICKET_STATUS.USED;
  ticket.usedAt = new Date();
  ticket.usedBy = new Types.ObjectId(staffId);
  await ticket.save();

  scanResult = SCAN_RESULT.VALID;
  await logScan(ticket._id, ticketCode, eventId, staffId, scanResult, deviceInfo, location);

  return {
    valid: true,
    status: 'valid',
    ticket: {
      ticketCode: ticket.ticketCode,
      seatId: ticket.seatId,
      eventId: ticket.eventId,
      usedAt: ticket.usedAt,
      ticketType: ticket.ticketType,
      customerName:
        ticket.orderId && 'customerInfo' in ticket.orderId
          ? `${(ticket.orderId as any).customerInfo?.firstName || ''} ${(ticket.orderId as any).customerInfo?.lastName || ''}`.trim()
          : undefined,
    },
    message: 'Ticket validated successfully',
  };
};

/**
 * Return recent scan history for an event
 */
export const getScanHistory = async (eventId: string, limit = 50, offset = 0) => {
  return ScanLog.find({ eventId })
    .sort({ scanTimestamp: -1 })
    .skip(offset)
    .limit(limit)
    .populate('ticketId', 'seatId ticketCode status usedAt')
    .populate('staffId', 'email firstName lastName role')
    .lean();
};

/**
 * Return aggregate scan stats for an event
 */
export const getEventScanStats = async (eventId: string) => {
  const [totalTickets, scannedTickets, validTickets, invalidAttempts] = await Promise.all([
    Ticket.countDocuments({ eventId }),
    Ticket.countDocuments({ eventId, status: TICKET_STATUS.USED }),
    Ticket.countDocuments({ eventId, status: TICKET_STATUS.VALID }),
    ScanLog.countDocuments({ eventId, scanResult: { $ne: SCAN_RESULT.VALID } }),
  ]);

  return {
    totalTickets,
    scannedTickets,
    validTickets,
    invalidAttempts,
    scanRate: totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0,
  };
};

const logScan = async (
  ticketId: Types.ObjectId | null,
  ticketCode: string,
  eventId: string,
  staffId: string,
  scanResult: typeof SCAN_RESULT[keyof typeof SCAN_RESULT],
  deviceInfo?: Record<string, any>,
  location?: Record<string, any>
) => {
  await ScanLog.create({
    ticketId: ticketId || undefined,
    ticketCode,
    eventId,
    staffId,
    scanResult,
    deviceInfo,
    location,
  });
};
