export const SEAT_HOLD_EXPIRY_MINUTES = parseInt(
  process.env.SEAT_HOLD_EXPIRY_MINUTES || '10',
  10
);

export const JWT_CONFIG = {
  accessTokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

export const RATE_LIMIT_CONFIG = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};

export const SEAT_HOLD_CONFIG = {
  maxSeatsPerHold: 10,
  maxHoldRequestsPerMinute: 5,
};

export const TICKET_CODE_LENGTH = 32;

export const USER_ROLES = {
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
  GUEST: 'guest',
} as const;

export const STAFF_ROLES = {
  STAFF: 'staff',
  ADMIN: 'admin',
} as const;

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export const SEAT_STATUS = {
  AVAILABLE: 'available',
  HELD: 'held',
  SOLD: 'sold',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const TICKET_STATUS = {
  VALID: 'valid',
  USED: 'used',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const SCAN_RESULT = {
  VALID: 'valid',
  ALREADY_USED: 'already_used',
  INVALID: 'invalid',
  WRONG_EVENT: 'wrong_event',
  CANCELLED: 'cancelled',
} as const;
