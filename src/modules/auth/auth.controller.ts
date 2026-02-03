import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.model.js';
import { JWTService } from './jwt.service.js';
import { registerSchema, loginSchema } from '../../utils/validators.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      // Validate input
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await User.findOne({ email: validatedData.email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists',
        });
      }

      // Create user
      const user = new User(validatedData);
      await user.save();

      // Generate tokens
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Remove password from response
      const userObject = user.toObject();
      delete (userObject as any).password;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userObject,
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      // Validate input
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await User.findOne({ email: validatedData.email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const isPasswordValid = await user.comparePassword(validatedData.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Generate tokens
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Update last login
      user.updatedAt = new Date();
      await user.save();

      // Remove password from response
      const userObject = user.toObject();
      delete (userObject as any).password;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userObject,
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      // Verify refresh token
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Generate new tokens
      const newAccessToken = JWTService.generateAccessToken(user);
      const newRefreshToken = JWTService.generateRefreshToken(user);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      // @ts-ignore
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const userObject = user.toObject();
      delete (userObject as any).password;

      res.status(200).json({
        success: true,
        data: {
          user: userObject,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}