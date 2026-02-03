import { Resend } from 'resend';

// Initialize only when key is present to avoid crashing local dev
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const emailConfig = {
  from: process.env.RESEND_FROM_EMAIL || 'Tiki-Taka <noreply@tiki-taka.com>',
  replyTo: process.env.RESEND_REPLY_TO || 'support@tiki-taka.com',
};
