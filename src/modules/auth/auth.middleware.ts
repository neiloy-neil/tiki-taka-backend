import { Request, Response, NextFunction } from 'express';
import { JWTService } from './jwt.service.js';
import { User, type IUser } from '../../models/index.js';
import { USER_ROLES } from '../../config/constants.js';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Authentication middleware
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    // Verify token
    const decoded = JWTService.verifyAccessToken(token);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Attach user info to request
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Specific role middlewares
export const requireUser = authorize(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN);
export const requireOrganizer = authorize(USER_ROLES.ORGANIZER, USER_ROLES.ADMIN);
export const requireAdmin = authorize(USER_ROLES.ADMIN);

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    const decoded = JWTService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId);
    
    if (user) {
      req.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Silently continue if token is invalid
    next();
  }
};