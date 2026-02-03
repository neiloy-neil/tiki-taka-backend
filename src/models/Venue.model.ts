import mongoose, { Schema, Document, Types } from 'mongoose';

interface SeatMetadata {
  id: string;
  section: string;
  row: string;
  seat: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface IVenue extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  seatMapSvg: string;
  seatIndex: Map<string, SeatMetadata>;
  totalSeats: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const venueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'USA' },
    },
    seatMapSvg: {
      type: String,
      required: true,
    },
    seatIndex: {
      type: Map,
      of: {
        id: String,
        section: String,
        row: String,
        seat: String,
        coordinates: {
          x: Number,
          y: Number,
        },
      },
      default: new Map(),
    },
    totalSeats: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching venues by city
venueSchema.index({ 'address.city': 1 });
venueSchema.index({ isActive: 1 });

export const Venue = mongoose.model<IVenue>('Venue', venueSchema);
