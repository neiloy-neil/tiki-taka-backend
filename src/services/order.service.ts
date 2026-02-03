import * as QRCode from 'qrcode';
import { EVENT_STATUS, PAYMENT_STATUS, SEAT_STATUS, TICKET_STATUS } from '../config/constants.js';
import { Event } from '../models/Event.model.js';
import { EventSeatState } from '../models/EventSeatState.model.js';
import { SeatHold } from '../models/SeatHold.model.js';
import { Order, IOrder } from '../models/Order.model.js';
import { Ticket } from '../models/Ticket.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { generateOrderNumber, generateTicketCode } from '../utils/crypto.js';
import { resend, emailConfig } from '../config/email.js';
import { stripe } from '../config/stripe.js';

type CustomerInfo = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
};

type Pricing = {
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  perSeat: Record<string, number>;
};

type CheckoutIntentInput = {
  eventId: string;
  seatIds: string[];
  customerInfo: CustomerInfo;
  sessionId?: string;
  userId?: string;
};

/**
 * Derive pricing from event pricing zones and seat IDs
 */
const calculatePricing = async (eventId: string, seatIds: string[]): Promise<Pricing> => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== EVENT_STATUS.PUBLISHED) {
    throw new AppError('Event is not available for booking', 400);
  }

  const perSeat: Record<string, number> = {};
  let subtotal = 0;

  seatIds.forEach((seatId) => {
    // Seat ID format: SECTION-ROW-SEAT (some seats are prefixed with SEC-SECTION-...)
    const [part1, part2] = seatId.split('-');
    const section = part1 === 'SEC' ? part2 : part1;
    const zone = event.pricingZones.get(section);
    if (!zone) {
      throw new AppError(`No pricing defined for section ${section}`, 400);
    }
    perSeat[seatId] = zone.price;
    subtotal += zone.price;
  });

  const fees = Math.round(subtotal * 0.05 * 100) / 100; // 5% fee
  const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
  const total = Math.round((subtotal + fees + tax) * 100) / 100;

  return { subtotal, fees, tax, total, perSeat };
};

/**
 * Ensure requested seats are available or held by the requester
 */
const assertSeatAvailability = async (
  eventId: string,
  seatIds: string[],
  sessionId?: string,
  userId?: string
) => {
  const seats = await EventSeatState.find({ eventId, seatId: { $in: seatIds } });

  if (seats.length !== seatIds.length) {
    throw new AppError('Some seats are not found for this event', 400);
  }

  for (const seat of seats) {
    if (seat.status === SEAT_STATUS.AVAILABLE) continue;
    if (seat.status === SEAT_STATUS.SOLD) {
      throw new AppError(`Seat ${seat.seatId} is already sold`, 409);
    }
    // Seat is held; verify ownership or clear stale holds
    if (seat.status === SEAT_STATUS.HELD && seat.holdId) {
      const hold = await SeatHold.findById(seat.holdId);

      // Release seat if hold is missing or expired
      if (!hold || hold.expiresAt < new Date()) {
        await EventSeatState.updateOne(
          { _id: seat._id, status: SEAT_STATUS.HELD },
          { $set: { status: SEAT_STATUS.AVAILABLE }, $unset: { holdId: 1 } }
        );
        continue;
      }

      // Allow same session OR same authenticated user to proceed
      if (hold.sessionId !== sessionId && (!userId || hold.userId?.toString() !== userId)) {
        throw new AppError(`Seat ${seat.seatId} is held by another user`, 409);
      }
    }
  }
};

/**
 * Create a Stripe PaymentIntent (or mock) and persist a pending order
 */
export const createCheckoutIntent = async (
  input: CheckoutIntentInput
): Promise<{ order: IOrder; clientSecret?: string }> => {
  const { eventId, seatIds, customerInfo, sessionId, userId } = input;

  await assertSeatAvailability(eventId, seatIds, sessionId, userId);
  const pricing = await calculatePricing(eventId, seatIds);
  const orderNumber = generateOrderNumber();

  let paymentIntentId = `mock_pi_${orderNumber}`;
  let clientSecret: string | undefined;

  // Real Stripe PaymentIntent when configured
  if (stripe) {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(pricing.total * 100),
      currency: 'usd',
      metadata: {
        eventId,
        seatIds: JSON.stringify(seatIds),
        orderNumber,
        sessionId: sessionId || '',
        userId: userId || '',
        customerEmail: customerInfo.email,
      },
      receipt_email: customerInfo.email,
      automatic_payment_methods: { enabled: true },
    });
    paymentIntentId = pi.id;
    clientSecret = pi.client_secret ?? undefined;
  }

  const order = await Order.create({
    orderNumber,
    eventId,
    userId,
    guestEmail: userId ? undefined : customerInfo.email,
    customerInfo,
    seatIds,
    ticketIds: [],
    paymentStatus: stripe ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.SUCCEEDED,
    paymentIntentId,
    totalAmount: pricing.total,
    currency: 'USD',
    breakdown: {
      subtotal: pricing.subtotal,
      fees: pricing.fees,
      tax: pricing.tax,
      total: pricing.total,
    },
    metadata: {
      pricing: pricing.perSeat,
    },
  });

  // Finalize immediately (issue tickets, mark seats sold)
  if (!stripe) {
    await finalizeOrder(order._id.toString());
  }

  return { order, clientSecret };
};

/**
 * Finalize order after payment success: mark seats sold, create tickets, update order.
 */
export const finalizeOrder = async (orderId: string): Promise<IOrder> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === PAYMENT_STATUS.SUCCEEDED) {
    return order;
  }

  // Re-check seat availability and atomically mark sold
  const seatUpdate = await EventSeatState.updateMany(
    {
      eventId: order.eventId,
      seatId: { $in: order.seatIds },
      status: { $ne: SEAT_STATUS.SOLD },
    },
    {
      $set: {
        status: SEAT_STATUS.SOLD,
        orderId: order._id,
        lastUpdated: new Date(),
      },
    }
  );

  if (seatUpdate.modifiedCount !== order.seatIds.length) {
    throw new AppError('Some seats were already sold. Please choose different seats.', 409);
  }

  // Create tickets for each seat
  const event = await Event.findById(order.eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Generate ticket data with QR codes
  const ticketDataPromises = order.seatIds.map(async (seatId) => {
    const [section] = seatId.split('-');
    const zone = event.pricingZones.get(section);
    const ticketCode = generateTicketCode();

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(ticketCode, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
    });

    return {
      ticketCode,
      qrCodeUrl,
      eventId: event._id,
      orderId: order._id,
      seatId,
      ticketType: zone?.name || 'General',
      price: zone?.price ?? 0,
      status: TICKET_STATUS.VALID,
    };
  });

  const ticketData = await Promise.all(ticketDataPromises);
  const tickets = await Ticket.create(ticketData);

  // Update order
  order.paymentStatus = PAYMENT_STATUS.SUCCEEDED;
  order.ticketIds = tickets.map((t) => t._id);
  await order.save();

  // Increment event sold count
  event.soldCount += order.seatIds.length;
  await event.save();

  // Send ticket email (best effort)
  if (resend && order.customerInfo?.email) {
    try {
      const ticketLines = tickets
        .map((t) => `${t.seatId} - ${t.ticketCode}`)
        .join('\n');
      await resend.emails.send({
        from: emailConfig.from,
        to: order.customerInfo.email,
        subject: `Your Tiki-Taka tickets - Order ${order.orderNumber}`,
        text: `Thanks for your purchase!\n\nOrder: ${order.orderNumber}\nEvent: ${event.title}\nSeats:\n${ticketLines}\n\nShow this email at the venue.`,
      });
    } catch (err) {
      console.error('❌ Failed to send ticket email:', err);
    }
  }

  return order;
};

/**
 * Get order by ID (no mutations)
 */
export const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  return Order.findById(orderId).populate('ticketIds');
};

/**
 * Mark an order as failed
 */
export const markOrderFailed = async (paymentIntentId: string) => {
  await Order.updateOne({ paymentIntentId }, { paymentStatus: PAYMENT_STATUS.FAILED });
};

/**
 * List orders for a specific user
 */
export const listOrdersForUser = async (userId: string): Promise<IOrder[]> => {
  return Order.find({ userId }).sort({ createdAt: -1 }).populate('ticketIds').lean();
};

/**
 * Admin/staff: list all orders
 */
export const listAllOrders = async (): Promise<any[]> => {
  return Order.find({})
    .sort({ createdAt: -1 })
    .populate('userId', 'email firstName lastName')
    .populate('ticketIds')
    .lean();
};

/**
 * Handle Stripe webhook event
 */
export const handleStripeWebhook = async (eventType: string, payload: any) => {
  if (eventType === 'payment_intent.succeeded') {
    const pi = payload as { id: string; metadata?: Record<string, string> };
    const order = await Order.findOne({ paymentIntentId: pi.id });
    if (!order) return;
    await finalizeOrder(order._id.toString());
  }

  if (eventType === 'payment_intent.payment_failed') {
    const pi = payload as { id: string };
    await markOrderFailed(pi.id);
  }
};
