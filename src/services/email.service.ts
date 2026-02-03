import nodemailer from 'nodemailer';
import { Event } from '../models/Event.model.js';
import { Attendee } from '../models/Attendee.model.js';
import { Order } from '../models/Order.model.js';
import { TicketType } from '../models/TicketType.model.js';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface TicketInfo {
  ticketCode: string;
  qrCodeUrl: string;
  ticketTypeName: string;
  price: number;
}

interface EmailData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  eventDate: Date;
  eventLocation: string;
  tickets: TicketInfo[];
  totalAmount: number;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    // Configure transporter based on environment
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
      // Production SMTP configuration
      const config: EmailConfig = {
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      };
      this.transporter = nodemailer.createTransport(config);
      this.fromEmail = process.env.SMTP_FROM || 'Tiki-Taka <noreply@tiki-taka.com>';
    } else {
      // Development - use ethereal.email or console logging
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'q67owaxbfcfv6pdj@ethereal.email',
          pass: 'mKM4hYR1Q1YKx1gqKz',
        },
      });
      this.fromEmail = 'Tiki-Taka <noreply@tiki-taka.com>';
    }
  }

  async sendTicketConfirmation(emailData: EmailData): Promise<void> {
    try {
      const htmlContent = this.generateTicketEmailTemplate(emailData);
      const textContent = this.generateTicketEmailText(emailData);

      const mailOptions = {
        from: this.fromEmail,
        to: emailData.customerEmail,
        subject: `🎟️ Your Tiki-Taka Tickets - Order ${emailData.orderNumber}`,
        text: textContent,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Ticket confirmation email sent:', info.messageId);
      
      // In development, log the preview URL
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('❌ Failed to send ticket confirmation email:', error);
      throw error;
    }
  }

  private generateTicketEmailTemplate(data: EmailData): string {
    const ticketRows = data.tickets.map((ticket, index) => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <div style="font-weight: bold; color: #333;">Ticket ${index + 1}</div>
          <div style="margin: 5px 0; font-size: 14px; color: #666;">${ticket.ticketTypeName}</div>
          <div style="margin: 5px 0; font-size: 12px; color: #888;">Code: ${ticket.ticketCode}</div>
          <div style="margin: 10px 0;">
            <img src="${ticket.qrCodeUrl}" alt="QR Code" style="max-width: 150px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div style="font-size: 14px; color: #444;">Price: $${ticket.price.toFixed(2)}</div>
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tiki-Taka Ticket Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎟️ Tiki-Taka Tickets</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Event Confirmation</p>
          </div>

          <!-- Order Info -->
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-top: 0;">Order Confirmation</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <div style="font-weight: bold; color: #555; font-size: 14px;">Order Number</div>
                  <div style="font-size: 16px; color: #333;">${data.orderNumber}</div>
                </div>
                <div>
                  <div style="font-weight: bold; color: #555; font-size: 14px;">Total Amount</div>
                  <div style="font-size: 16px; color: #333;">$${data.totalAmount.toFixed(2)}</div>
                </div>
                <div>
                  <div style="font-weight: bold; color: #555; font-size: 14px;">Event</div>
                  <div style="font-size: 16px; color: #333;">${data.eventName}</div>
                </div>
                <div>
                  <div style="font-weight: bold; color: #555; font-size: 14px;">Date</div>
                  <div style="font-size: 16px; color: #333;">${data.eventDate.toLocaleDateString()} at ${data.eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
              <div style="margin-top: 15px;">
                <div style="font-weight: bold; color: #555; font-size: 14px;">Location</div>
                <div style="font-size: 16px; color: #333;">${data.eventLocation}</div>
              </div>
            </div>

            <!-- Tickets -->
            <h3 style="color: #333; margin-bottom: 15px;">Your Tickets</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${ticketRows}
            </table>

            <!-- Instructions -->
            <div style="margin-top: 30px; padding: 20px; background-color: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
              <h3 style="margin-top: 0; color: #1976d2;">Important Information</h3>
              <ul style="color: #333; line-height: 1.6;">
                <li>Bring this email and a valid ID to the event</li>
                <li>Each QR code can only be scanned once for entry</li>
                <li>Arrive at least 30 minutes before the event starts</li>
                <li>Tickets are non-refundable but transferable</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="margin-top: 30px; text-align: center; color: #888; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>Thank you for choosing Tiki-Taka!</p>
              <p>If you have any questions, contact us at support@tiki-taka.com</p>
              <p style="margin-top: 20px;">© 2026 Tiki-Taka Ticketing Platform</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateTicketEmailText(data: EmailData): string {
    const ticketLines = data.tickets.map((ticket, index) => 
      `Ticket ${index + 1}:
  Type: ${ticket.ticketTypeName}
  Code: ${ticket.ticketCode}
  Price: $${ticket.price.toFixed(2)}`
    ).join('\n\n');

    return `Thank you for your purchase!

Order Details:
Order Number: ${data.orderNumber}
Total Amount: $${data.totalAmount.toFixed(2)}
Event: ${data.eventName}
Date: ${data.eventDate.toLocaleDateString()} at ${data.eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
Location: ${data.eventLocation}

Your Tickets:
${ticketLines}

Important Information:
- Bring this email and a valid ID to the event
- Each QR code can only be scanned once for entry
- Arrive at least 30 minutes before the event starts
- Tickets are non-refundable but transferable

Thank you for choosing Tiki-Taka!
If you have any questions, contact us at support@tiki-taka.com`;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('📧 Email service connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();