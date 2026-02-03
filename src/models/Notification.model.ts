import mongoose, { Schema, Document, Types } from 'mongoose';

type NotificationType =
  | 'order_confirmation'
  | 'ticket_delivery'
  | 'event_reminder'
  | 'event_cancellation';

type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface INotification extends Document {
  recipientEmail: string;
  type: NotificationType;
  orderId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  status: NotificationStatus;
  provider: 'resend';
  providerMessageId?: string;
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['order_confirmation', 'ticket_delivery', 'event_reminder', 'event_cancellation'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    provider: {
      type: String,
      default: 'resend',
    },
    providerMessageId: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for failed notifications that need retry
notificationSchema.index({ status: 1, retryCount: 1, createdAt: -1 });

// Index for order notifications
notificationSchema.index({ orderId: 1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
