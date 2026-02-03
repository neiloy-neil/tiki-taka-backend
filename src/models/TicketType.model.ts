import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITicketType extends Document {
  eventId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
  soldQuantity: number;
  maxPerOrder: number;
  isActive: boolean;
  saleStartDate?: Date;
  saleEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketTypeSchema = new Schema<ITicketType>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxPerOrder: {
      type: Number,
      default: 10,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    saleStartDate: {
      type: Date,
    },
    saleEndDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for event ticket types
ticketTypeSchema.index({ eventId: 1, isActive: 1 });

// Index for ticket availability queries
ticketTypeSchema.index({ eventId: 1, availableQuantity: 1 });

export const TicketType = mongoose.model<ITicketType>('TicketType', ticketTypeSchema);