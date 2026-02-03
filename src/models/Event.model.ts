import mongoose, { Schema, Document, Types } from 'mongoose';
import { EVENT_STATUS } from '../config/constants.js';

interface PricingZone {
  name: string;
  price: number;
  currency: 'USD';
}

export interface IEvent extends Document {
  venueId: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  eventDate: Date;
  eventEndDate?: Date;
  doorOpenTime?: Date;
  eventType: string;
  imageUrl?: string;
  category: string;
  tags: string[];
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  pricingZones: Map<string, PricingZone>;
  status: typeof EVENT_STATUS[keyof typeof EVENT_STATUS];
  totalCapacity: number;
  soldCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    venueId: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
      index: true,
    },
    eventEndDate: {
      type: Date,
    },
    doorOpenTime: {
      type: Date,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['concert', 'sports', 'theater', 'conference', 'festival', 'other'],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      zipCode: { type: String, required: true },
    },
    imageUrl: {
      type: String,
    },
    pricingZones: {
      type: Map,
      of: {
        name: String,
        price: Number,
        currency: { type: String, default: 'USD' },
      },
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
      index: true,
    },
    totalCapacity: {
      type: Number,
      default: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for filtering events
eventSchema.index({ status: 1, eventDate: 1 });
eventSchema.index({ eventType: 1, eventDate: 1 });
eventSchema.index({ 'address.city': 1, eventDate: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
