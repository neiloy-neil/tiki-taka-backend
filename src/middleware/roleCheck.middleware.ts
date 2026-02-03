import { Request, Response, NextFunction } from 'express';
import { USER_ROLES, STAFF_ROLES } from '../config/constants.js';

/**
 * Check if user has one of the required roles
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
};

/**
 * Require customer or guest role
 */
export const requireCustomer = requireRole(USER_ROLES.CUSTOMER, USER_ROLES.GUEST);

/**
 * Require staff role (staff or admin)
 */
export const requireStaff = requireRole(STAFF_ROLES.STAFF, STAFF_ROLES.ADMIN);

/**
 * Require admin role only
 */
export const requireAdmin = requireRole(STAFF_ROLES.ADMIN);

/**
 * Check if staff is assigned to specific event
 */
export const requireEventAssignment = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Admin has access to all events
  if (req.user.role === STAFF_ROLES.ADMIN) {
    next();
    return;
  }

  // Check if staff is assigned to the event
  const eventId = req.params.eventId || req.body.eventId;
  const assignedEvents = req.user.assignedEvents || [];

  if (!eventId) {
    res.status(400).json({
      success: false,
      message: 'Event ID is required',
    });
    return;
  }

  if (!assignedEvents.includes(eventId)) {
    res.status(403).json({
      success: false,
      message: 'You are not assigned to this event',
    });
    return;
  }

  next();
};
