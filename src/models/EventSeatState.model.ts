import mongoose, { Schema, Document, Types } from 'mongoose';
import { SEAT_STATUS } from '../config/constants.js';

export interface IEventSeatState extends Document {
  eventId: Types.ObjectId;
  seatId: string;
  status: typeof SEAT_STATUS[keyof typeof SEAT_STATUS];
  holdId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  lastUpdated: Date;
}

const eventSeatStateSchema = new Schema<IEventSeatState>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seatId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SEAT_STATUS),
      default: SEAT_STATUS.AVAILABLE,
      index: true,
    },
    holdId: {
      type: Schema.Types.ObjectId,
      ref: 'SeatHold',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: '__v', // Enable optimistic locking with __v
  }
);

// CRITICAL: Compound unique index to prevent double-booking
eventSeatStateSchema.index({ eventId: 1, seatId: 1 }, { unique: true });

// Index for quick availability queries
eventSeatStateSchema.index({ eventId: 1, status: 1 });

// Index for hold cleanup
eventSeatStateSchema.index({ holdId: 1 });

// Index for order queries
eventSeatStateSchema.index({ orderId: 1 });

export const EventSeatState = mongoose.model<IEventSeatState>(
  'EventSeatState',
  eventSeatStateSchema
);
