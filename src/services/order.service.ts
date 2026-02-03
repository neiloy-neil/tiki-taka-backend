import * as QRCode from 'qrcode';
import { EVENT_STATUS, PAYMENT_STATUS, SEAT_STATUS, TICKET_STATUS } from '../config/constants.js';
import { Event } from '../models/Event.model.js';
import { EventSeatState } from '../models/EventSeatState.model.js';
import { SeatHold } from '../models/SeatHold.model.js';
import { Order, IOrder } from '../models/Order.model.js';
import { Ticket } from '../models/Ticket.model.js';
import { TicketType, ITicketType } from '../models/TicketType.model.js';
import { Attendee, IAttendee } from '../models/Attendee.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { generateOrderNumber, generateTicketCode } from '../utils/crypto.js';
import { emailService } from './email.service.js';
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

type CreateCheckoutSessionInput = {
  eventId: string;
  ticketTypes: Array<{ ticketTypeId: string; quantity: number }>;
  customerInfo: CustomerInfo;
  userId?: string;
  successUrl: string;
  cancelUrl: string;
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
        text: `Thanks for your purchase!

Order: ${order.orderNumber}
Event: ${event.title}
Seats:
${ticketLines}

Show this email at the venue.`,
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
 * Create Stripe Checkout Session for TicketType-based orders
 */
export const createCheckoutSession = async (
  input: CreateCheckoutSessionInput
): Promise<{ order: IOrder; sessionUrl: string }> => {
  const { eventId, ticketTypes, customerInfo, userId, successUrl, cancelUrl } = input;

  // Validate ticket availability
  const ticketTypeIds = ticketTypes.map(t => t.ticketTypeId);
  const ticketTypeDocs = await TicketType.find({
    _id: { $in: ticketTypeIds },
    eventId,
    isActive: true,
    availableQuantity: { $gt: 0 }
  });

  if (ticketTypeDocs.length !== ticketTypes.length) {
    throw new AppError('Some ticket types are not available', 400);
  }

  // Check quantity availability
  for (const request of ticketTypes) {
    const ticketType = ticketTypeDocs.find(t => t._id.toString() === request.ticketTypeId);
    if (!ticketType || ticketType.availableQuantity < request.quantity) {
      throw new AppError(`Not enough tickets available for ${ticketType?.name}`, 400);
    }
  }

  // Calculate pricing
  let subtotal = 0;
  const lineItems = [];
  
  for (const request of ticketTypes) {
    const ticketType = ticketTypeDocs.find(t => t._id.toString() === request.ticketTypeId);
    if (ticketType) {
      const lineTotal = ticketType.price * request.quantity;
      subtotal += lineTotal;
      
      lineItems.push({
        ticketTypeId: ticketType._id,
        name: ticketType.name,
        quantity: request.quantity,
        price: ticketType.price,
        total: lineTotal
      });
    }
  }

  const fees = Math.round(subtotal * 0.05 * 100) / 100; // 5% fee
  const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
  const total = Math.round((subtotal + fees + tax) * 100) / 100;

  const orderNumber = generateOrderNumber();

  // Create pending order
  const order = await Order.create({
    orderNumber,
    eventId,
    userId,
    guestEmail: userId ? undefined : customerInfo.email,
    customerInfo,
    ticketTypeIds: ticketTypes.map(t => t.ticketTypeId),
    attendeeIds: [],
    quantity: ticketTypes.reduce((sum, t) => sum + t.quantity, 0),
    paymentStatus: PAYMENT_STATUS.PENDING,
    totalAmount: total,
    currency: 'USD',
    breakdown: {
      subtotal,
      fees,
      tax,
      total,
    },
    metadata: {
      lineItems
    }
  });

  // Create Stripe Checkout Session
  if (!stripe) {
    throw new AppError('Stripe is not configured', 500);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: orderNumber,
    metadata: {
      orderId: order._id.toString(),
      eventId,
      customerEmail: customerInfo.email,
    }
  });

  return { order, sessionUrl: session.url || '' };
};

/**
 * Process successful checkout session
 */
export const processSuccessfulCheckout = async (session: any): Promise<IOrder> => {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    throw new AppError('Order ID not found in session metadata', 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus === PAYMENT_STATUS.SUCCEEDED) {
    return order;
  }

  // Update order status
  order.paymentStatus = PAYMENT_STATUS.SUCCEEDED;
  order.paymentIntentId = session.payment_intent;
  await order.save();

  // Generate attendee records
  const attendees: IAttendee[] = [];
  
  for (const ticketTypeId of order.ticketTypeIds) {
    const ticketType = await TicketType.findById(ticketTypeId);
    if (!ticketType) continue;

    // Create attendees for this ticket type
    for (let i = 0; i < ticketTypes.find(t => t.ticketTypeId === ticketTypeId.toString())?.quantity || 0; i++) {
      const ticketCode = generateTicketCode();
      
      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(ticketCode, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
      });

      const attendee = await Attendee.create({
        ticketCode,
        qrCodeUrl,
        eventId: order.eventId,
        orderId: order._id,
        ticketTypeId: ticketType._id,
        userId: order.userId,
        firstName: order.customerInfo.firstName,
        lastName: order.customerInfo.lastName,
        email: order.customerInfo.email,
        phoneNumber: order.customerInfo.phoneNumber,
        status: TICKET_STATUS.VALID,
      });

      attendees.push(attendee);
    }

    // Reduce ticket inventory
    await ticketTypeService.updateTicketAvailability(ticketTypeId.toString(), ticketTypes.find(t => t.ticketTypeId === ticketTypeId.toString())?.quantity || 0);
  }

  // Update order with attendee IDs
  order.attendeeIds = attendees.map(a => a._id);
  await order.save();

  // Send confirmation email with QR codes
  try {
    const event = await Event.findById(order.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Prepare ticket information for email
    const ticketInfo = await Promise.all(attendees.map(async (attendee) => {
      const ticketType = await TicketType.findById(attendee.ticketTypeId);
      return {
        ticketCode: attendee.ticketCode,
        qrCodeUrl: attendee.qrCodeUrl,
        ticketTypeName: ticketType?.name || 'General Admission',
        price: ticketType?.price || 0,
      };
    }));

    const emailData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: `${order.customerInfo.firstName} ${order.customerInfo.lastName}`,
      customerEmail: order.customerInfo.email,
      eventName: event.title,
      eventDate: event.eventDate,
      eventLocation: `${event.address.street}, ${event.address.city}, ${event.address.state}`,
      tickets: ticketInfo,
      totalAmount: order.totalAmount,
    };

    await emailService.sendTicketConfirmation(emailData);
  } catch (err) {
    console.error('❌ Failed to send ticket confirmation email:', err);
    // Don't throw error - email failure shouldn't break the order process
  }

  return order;
};

/**
 * Handle Stripe webhook event
 */
export const handleStripeWebhook = async (eventType: string, payload: any) => {
  if (eventType === 'checkout.session.completed') {
    const session = payload as { id: string; metadata?: Record<string, string> };
    await processSuccessfulCheckout(session);
  }

  if (eventType === 'payment_intent.payment_failed') {
    const pi = payload as { id: string };
    await markOrderFailed(pi.id);
  }
};
