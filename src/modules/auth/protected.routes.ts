import { Router, Request, Response } from 'express';
import { authenticate, requireUser, requireOrganizer, requireAdmin } from '../auth/auth.middleware.js';

const router: Router = Router();

// Public route
router.get('/public', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'This is a public route accessible to everyone',
  });
});

// Protected route - any authenticated user
router.get('/protected', authenticate, (req, res) => {
  // @ts-ignore
  const user = req.user;
  if (user) {
    res.json({
      success: true,
      message: 'This is a protected route',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
});

// User-only route
router.get('/user-only', authenticate, requireUser, (req, res) => {
  // @ts-ignore
  const user = req.user;
  if (user) {
    res.json({
      success: true,
      message: 'This route is only for authenticated users',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
});

// Organizer-only route
router.get('/organizer-only', authenticate, requireOrganizer, (req, res) => {
  // @ts-ignore
  const user = req.user;
  if (user) {
    res.json({
      success: true,
      message: 'This route is only for organizers and admins',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
});

// Admin-only route
router.get('/admin-only', authenticate, requireAdmin, (req, res) => {
  // @ts-ignore
  const user = req.user;
  if (user) {
    res.json({
      success: true,
      message: 'This route is only for administrators',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
});

// Route with optional authentication
router.get('/optional-auth', (req, res) => {
  // @ts-ignore
  const user = req.user;
  
  if (user) {
    res.json({
      success: true,
      message: 'User is authenticated',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.json({
      success: true,
      message: 'User is not authenticated',
      user: null,
    });
  }
});

export default router;