import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/constants.js';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are not defined in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  isGuest?: boolean;
  assignedEvents?: string[]; // For staff
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number; // For token rotation
}

/**
 * Generate access token (short-lived)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload as object,
    JWT_SECRET as jwt.Secret,
    {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
    } as jwt.SignOptions
  );
};

/**
 * Generate refresh token (long-lived)
 */
export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(
    payload as object,
    JWT_REFRESH_SECRET as jwt.Secret,
    {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
    } as jwt.SignOptions
  );
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: TokenPayload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: payload.userId });

  return {
    accessToken,
    refreshToken,
  };
};
