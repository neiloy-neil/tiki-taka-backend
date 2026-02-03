// Email environment variables configuration
// Add these to your .env file:

/*
# SMTP Configuration (Production)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
SMTP_FROM=Tiki-Taka <noreply@tiki-taka.com>

# Development - Email will be sent to ethereal.email for testing
# No configuration needed for development mode

# Resend (Alternative email service - current fallback)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@tiki-taka.com
RESEND_REPLY_TO=support@tiki-taka.com
*/

export const EMAIL_CONFIG = {
  // SMTP settings
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  // Email addresses
  from: process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL || 'Tiki-Taka <noreply@tiki-taka.com>',
  replyTo: process.env.RESEND_REPLY_TO || 'support@tiki-taka.com',
  
  // Environment
  isProduction: process.env.NODE_ENV === 'production',
};