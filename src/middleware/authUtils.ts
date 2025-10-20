import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from './auth';
import { AuthorizationMiddleware } from './authorization';
import { PermissionName, RoleName } from '../types/auth';
import { AuthenticatedRequest, GuaranteedAuthRequest } from '../types/request';

/**
 * Auth Utils - Simplified middleware exports using factory pattern
 *
 * This file provides convenient middleware exports that are initialized
 * by the application startup code. Uses dependency injection for better testability.
 *
 * DO NOT create global singletons here - use the initialization function instead.
 */

// Middleware instances (initialized by app startup)
let authMiddleware: AuthMiddleware;
let authorizationMiddleware: AuthorizationMiddleware;

/**
 * Initialize auth middleware instances
 * Must be called during application startup before using any auth middleware
 */
export function initializeAuthMiddleware(
  authMiddlewareInstance: AuthMiddleware,
  authorizationMiddlewareInstance: AuthorizationMiddleware
): void {
  authMiddleware = authMiddlewareInstance;
  authorizationMiddleware = authorizationMiddlewareInstance;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE EXPORTS
// ============================================================================

/**
 * Authenticate token from request headers
 * Attaches user to request if valid token is provided
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initializeAuthMiddleware() first.');
  }
  return authMiddleware.authenticate(req as AuthenticatedRequest, res, next);
};

/**
 * Require authenticated user with optional verification
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!authMiddleware) {
    throw new Error('Auth middleware not initialized. Call initializeAuthMiddleware() first.');
  }

  return authMiddleware.authenticate(req as AuthenticatedRequest, res, (error) => {
    if (error) {
      return next(error);
    }

    const authReq = req as AuthenticatedRequest;

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

// Keep the old name as an alias for backward compatibility
export const authenticateUser = requireAuth;

// ============================================================================
// AUTHORIZATION MIDDLEWARE EXPORTS
// ============================================================================

/**
 * Require a specific permission
 * Permission names should be in format "resource:action"
 */
export const requirePermission = (permission: PermissionName) => {
  if (!authorizationMiddleware) {
    throw new Error('Authorization middleware not initialized. Call initializeAuthMiddleware() first.');
  }

  const [resource, action] = permission.split(':');
  return authorizationMiddleware.requirePermission({
    resource: resource,
    action: action
  });
};

/**
 * Require a specific role
 */
export const requireRole = (role: RoleName) => {
  if (!authorizationMiddleware) {
    throw new Error('Authorization middleware not initialized. Call initializeAuthMiddleware() first.');
  }

  return authorizationMiddleware.requireRole({ roles: [role] });
};

/**
 * Require any of the specified permissions (OR logic)
 */
export const requireAny = (permissions: PermissionName[]) => {
  if (!authorizationMiddleware) {
    throw new Error('Authorization middleware not initialized. Call initializeAuthMiddleware() first.');
  }

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      await authorizationMiddleware.requireAny(
        req.user.id,
        permissions,
        req.body,
        {
          userId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date(),
          endpoint: req.path,
          method: req.method,
          requestId: Math.random().toString(36).substring(7)
        }
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to check if request is guaranteed authenticated
 */
export function isGuaranteedAuthRequest(req: AuthenticatedRequest): req is GuaranteedAuthRequest {
  return !!(req.user && req.token);
}

/**
 * Utility to safely get user from request (may be undefined)
 */
export function getAuthenticatedUser(req: AuthenticatedRequest): AuthenticatedRequest['user'] {
  return req.user;
}

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