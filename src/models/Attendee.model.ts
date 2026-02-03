import mongoose, { Schema, Document, Types } from 'mongoose';
import { TICKET_STATUS } from '../config/constants.js';

export interface IAttendee extends Document {
  ticketCode: string;
  qrCodeUrl: string;
  eventId: Types.ObjectId;
  orderId: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  userId?: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  status: typeof TICKET_STATUS[keyof typeof TICKET_STATUS];
  usedAt?: Date;
  usedBy?: Types.ObjectId;
  scanLocation?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const attendeeSchema = new Schema<IAttendee>(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      index: true, // CRITICAL: Fast lookup for QR scanning
    },
    qrCodeUrl: {
      type: String,
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'TicketType',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.VALID,
      index: true,
    },
    usedAt: {
      type: Date,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    scanLocation: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for event attendees
attendeeSchema.index({ eventId: 1, status: 1 });

// Index for order attendees
attendeeSchema.index({ orderId: 1 });

// Index for user tickets
attendeeSchema.index({ userId: 1, createdAt: -1 });

export const Attendee = mongoose.model<IAttendee>('Attendee', attendeeSchema);