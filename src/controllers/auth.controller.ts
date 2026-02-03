import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt.js';

/**
 * Register new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

/**
 * Guest checkout
 */
export const guestCheckout = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.createGuestCheckout(req.body);

  res.status(200).json({
    success: true,
    message: 'Guest session created',
    data: result,
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
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

  // Get user
  const user = await authService.getUserById(decoded.userId);

  if (!user) {
    res.status(401).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  // Generate new token pair
  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    isGuest: user.isGuest,
  });

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens,
  });
});

/**
 * Get current user
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  const user = await authService.getUserById(req.user.userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isGuest: user.isGuest,
      emailVerified: user.emailVerified,
    },
  });
});

/**
 * Logout (client-side token removal)
 */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // JWT is stateless, so logout is handled client-side by removing tokens
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});
