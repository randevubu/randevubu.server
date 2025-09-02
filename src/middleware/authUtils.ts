import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from './auth';
import { AuthorizationMiddleware } from './authorization';
import { RepositoryContainer } from '../repositories';
import { ServiceContainer } from '../services';
import { PermissionName, RoleName, AuthenticatedRequest, GuaranteedAuthRequest } from '../types/auth';
import prisma from '../lib/prisma';

// Initialize global middleware instances
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);
const authorizationMiddleware = new AuthorizationMiddleware(services.rbacService);

// Export simplified middleware functions
export const authenticateToken = authMiddleware.authenticate;

export const requirePermission = (permission: PermissionName) => {
  // Permission names are already in format "resource:action"
  const [resource, action] = permission.split(':');
  return authorizationMiddleware.requirePermission({ 
    resource: resource, 
    action: action 
  });
};

export const requireRole = (role: RoleName) => {
  return authorizationMiddleware.requireRole({ roles: [role] });
};

export const requireAny = (permissions: PermissionName[]) => {
  const middlewares = permissions.map(p => requirePermission(p));
  return authorizationMiddleware.requireAny(...middlewares);
};

// Type guard middleware that ensures user is authenticated
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // First run the token authentication
  return authMiddleware.authenticate(req as AuthenticatedRequest, res, (error) => {
    if (error) {
      return next(error);
    }
    
    const authReq = req as AuthenticatedRequest;
    
    // Now we can guarantee user exists
    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Type assertion is safe here because we've checked
    (req as GuaranteedAuthRequest).user = authReq.user;
    (req as GuaranteedAuthRequest).token = authReq.token!;
    
    next();
  });
};

// Helper function to check if request is guaranteed authenticated
export function isGuaranteedAuthRequest(req: AuthenticatedRequest): req is GuaranteedAuthRequest {
  return !!(req.user && req.token);
}

// Utility to safely get user from request
export function getAuthenticatedUser(req: AuthenticatedRequest): AuthenticatedRequest['user'] {
  return req.user;
}

// Keep the old name as an alias for backward compatibility  
export const authenticateUser = requireAuth;

// Utility to safely get guaranteed user (throws if not present)
export function requireAuthenticatedUser(req: AuthenticatedRequest): GuaranteedAuthRequest['user'] {
  if (!req.user) {
    throw new Error('User not authenticated - middleware may be missing');
  }
  return req.user;
}

// Type-safe wrapper for authenticated route handlers
export function withAuth<T extends any[]>(
  handler: (req: GuaranteedAuthRequest, res: Response, ...args: T) => Promise<void> | void
) {
  return (req: Request, res: Response, ...args: T) => {
    // At this point, requireAuth middleware should have already run
    const authReq = req as GuaranteedAuthRequest;
    if (!authReq.user || !authReq.token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    return handler(authReq, res, ...args);
  };
}

// Middleware to refresh user roles (useful after role changes)
export const refreshUserRoles = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return next();
  }

  // This will be called after business creation to refresh the user's roles
  // The actual role refresh should happen in the controller after business creation
  next();
};