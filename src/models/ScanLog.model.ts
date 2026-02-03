import mongoose, { Schema, Document, Types } from 'mongoose';
import { SCAN_RESULT } from '../config/constants.js';

interface DeviceInfo {
  deviceId?: string;
  appVersion?: string;
}

interface Location {
  latitude?: number;
  longitude?: number;
}

export interface IScanLog extends Document {
  ticketId?: Types.ObjectId;
  ticketCode: string;
  eventId: Types.ObjectId;
  staffId: Types.ObjectId;
  scanResult: typeof SCAN_RESULT[keyof typeof SCAN_RESULT];
  scanTimestamp: Date;
  deviceInfo?: DeviceInfo;
  location?: Location;
  metadata?: Record<string, any>;
}

const scanLogSchema = new Schema<IScanLog>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    ticketCode: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    scanResult: {
      type: String,
      enum: Object.values(SCAN_RESULT),
      required: true,
    },
    scanTimestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deviceInfo: {
      deviceId: String,
      appVersion: String,
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // We only need scanTimestamp
  }
);

// Index for ticket scan history
scanLogSchema.index({ ticketCode: 1, scanTimestamp: -1 });

// Index for event scan analytics
scanLogSchema.index({ eventId: 1, scanTimestamp: -1 });

// Index for staff scan history
scanLogSchema.index({ staffId: 1, scanTimestamp: -1 });

export const ScanLog = mongoose.model<IScanLog>('ScanLog', scanLogSchema);
