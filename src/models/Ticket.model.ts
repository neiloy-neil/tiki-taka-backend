import mongoose, { Schema, Document, Types } from 'mongoose';
import { TICKET_STATUS } from '../config/constants.js';

export interface ITicket extends Document {
  ticketCode: string;
  qrCodeUrl?: string;
  eventId: Types.ObjectId;
  orderId: Types.ObjectId;
  seatId: string;
  ticketType: string;
  price: number;
  status: typeof TICKET_STATUS[keyof typeof TICKET_STATUS];
  usedAt?: Date;
  usedBy?: Types.ObjectId;
  scanLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      index: true, // CRITICAL: Fast lookup for QR scanning
    },
    qrCodeUrl: {
      type: String,
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
    seatId: {
      type: String,
      required: true,
    },
    ticketType: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
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
      ref: 'Staff',
    },
    scanLocation: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for event tickets
ticketSchema.index({ eventId: 1, status: 1 });

// Index for order tickets
ticketSchema.index({ orderId: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
