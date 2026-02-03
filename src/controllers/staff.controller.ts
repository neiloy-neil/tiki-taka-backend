import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt.js';

/**
 * Staff login
 */
export const staffLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginStaff(req.body);

  res.status(200).json({
    success: true,
    message: 'Staff login successful',
    data: result,
  });
});

/**
 * Refresh staff token
 */
export const staffRefreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({
      success: false,
      message: 'Refresh token is required',
    });
    return;
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Get staff
  const staff = await authService.getStaffById(decoded.userId);

  if (!staff) {
    res.status(401).json({
      success: false,
      message: 'Staff not found',
    });
    return;
  }

  if (!staff.isActive) {
    res.status(401).json({
      success: false,
      message: 'Staff account is deactivated',
    });
    return;
  }

  // Generate new token pair
  const tokens = generateTokenPair({
    userId: staff._id.toString(),
    email: staff.email,
    role: staff.role,
    assignedEvents: staff.assignedEvents.map((id) => id.toString()),
  });

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens,
  });
});

/**
 * Get current staff profile
 */
export const getStaffProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  const staff = await authService.getStaffById(req.user.userId);

  if (!staff) {
    res.status(404).json({
      success: false,
      message: 'Staff not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: staff._id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      isActive: staff.isActive,
      assignedEvents: staff.assignedEvents,
    },
  });
});
