import * as crypto from 'crypto';
import { TICKET_CODE_LENGTH } from '../config/constants.js';

/**
 * Generate a cryptographically secure random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Generate a unique ticket code
 */
export const generateTicketCode = (): string => {
  const prefix = 'TKT';
  const randomPart = generateRandomString(TICKET_CODE_LENGTH);
  return `${prefix}_${randomPart}`;
};

/**
 * Generate a session ID
 */
export const generateSessionId = (): string => {
  return `sess_${generateRandomString(24)}`;
};

/**
 * Generate an order number
 */
export const generateOrderNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = generateRandomString(6).toUpperCase();
  return `TT-${dateStr}-${randomPart}`;
};

/**
 * Hash a string using SHA-256 (for QR code verification)
 */
export const hashString = (str: string): string => {
  return crypto.createHash('sha256').update(str).digest('hex');
};
