import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISeatHold extends Document {
  eventId: Types.ObjectId;
  seatIds: string[];
  sessionId: string;
  userId?: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const seatHoldSchema = new Schema<ISeatHold>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seatIds: {
      type: [String],
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index - MongoDB will automatically delete expired holds
seatHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for querying holds by event
seatHoldSchema.index({ eventId: 1, expiresAt: 1 });

export const SeatHold = mongoose.model<ISeatHold>('SeatHold', seatHoldSchema);
