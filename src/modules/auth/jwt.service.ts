import jwt from 'jsonwebtoken';
import { IUser } from '../../models/index.js';
import { JWT_CONFIG } from '../../config/constants.js';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class JWTService {
  static generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: 'tiki-taka-platform',
      audience: 'tiki-taka-users',
    });
  }

  static generateRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: 'tiki-taka-platform',
      audience: 'tiki-taka-users',
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        issuer: 'tiki-taka-platform',
        audience: 'tiki-taka-users',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!, {
        issuer: 'tiki-taka-platform',
        audience: 'tiki-taka-users',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }
}