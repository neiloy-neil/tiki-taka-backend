// Export all auth components
export { JWTService } from './jwt.service.js';
export { AuthController } from './auth.controller.js';
export { 
  authenticate, 
  authorize, 
  requireUser, 
  requireOrganizer, 
  requireAdmin,
  optionalAuth 
} from './auth.middleware.js';

// Export routes
export { default as authRoutes } from './auth.routes.js';
export { default as protectedRoutes } from './protected.routes.js';