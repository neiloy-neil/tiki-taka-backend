// Re-export all model interfaces for centralized typing
export type { IUser } from './User.model.js';
export type { IEvent } from './Event.model.js';
export type { ITicketType } from './TicketType.model.js';
export type { IOrder } from './Order.model.js';
export type { IAttendee } from './Attendee.model.js';

// Additional type utilities
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}