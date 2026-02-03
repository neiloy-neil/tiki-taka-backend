import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected routes
router.get('/me', authenticate, AuthController.me);

export default router;