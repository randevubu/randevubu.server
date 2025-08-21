import { Request, Response, NextFunction } from 'express';
import { RBACService } from '../services/rbacService';
import { ForbiddenError, ErrorContext } from '../types/errors';
import { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

export interface AuthorizationOptions {
  resource: string;
  action: string;
  contextProvider?: (req: AuthenticatedRequest) => any;
  skipIfNoUser?: boolean;
}

export interface RoleRequirement {
  roles: string[];
  requireAll?: boolean; // If true, user must have ALL roles; if false, user needs ANY role
}

export interface LevelRequirement {
  minLevel: number;
}

export class AuthorizationMiddleware {
  constructor(private rbacService: RBACService) {}

  private createErrorContext(req: Request, userId?: string): ErrorContext {
    return {
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
    };
  }

  // Generic permission-based authorization
  requirePermission(options: AuthorizationOptions) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const context = this.createErrorContext(req, req.user?.id);

        if (!req.user) {
          if (options.skipIfNoUser) {
            return next();
          }
          throw new ForbiddenError('Authentication required', context);
        }

        // Get context for permission evaluation
        const permissionContext = options.contextProvider 
          ? options.contextProvider(req) 
          : { 
              resourceId: req.params.id,
              ownerId: req.user.id,
              ...req.body,
              ...req.query
            };

        await this.rbacService.requirePermission(
          req.user.id,
          `${options.resource}:${options.action}`,
          permissionContext,
          context
        );

        logger.debug('Permission granted', {
          userId: req.user.id,
          resource: options.resource,
          action: options.action,
          endpoint: req.path
        });

        next();
      } catch (error) {
        logger.warn('Authorization failed', {
          userId: req.user?.id,
          resource: options.resource,
          action: options.action,
          endpoint: req.path,
          error: error instanceof Error ? error.message : String(error)
        });
        next(error);
      }
    };
  }

  // Role-based authorization
  requireRole(requirement: RoleRequirement) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const context = this.createErrorContext(req, req.user?.id);

        if (!req.user) {
          throw new ForbiddenError('Authentication required', context);
        }

        const userRoles = await this.rbacService.getUserRoles(req.user.id);
        const userRoleNames = userRoles.map(role => role.name);

        const hasRequiredRoles = requirement.requireAll
          ? requirement.roles.every(role => userRoleNames.includes(role))
          : requirement.roles.some(role => userRoleNames.includes(role));

        if (!hasRequiredRoles) {
          const requiredRolesStr = requirement.requireAll 
            ? requirement.roles.join(' AND ') 
            : requirement.roles.join(' OR ');
          
          throw new ForbiddenError(
            `Required role(s): ${requiredRolesStr}`,
            context
          );
        }

        logger.debug('Role authorization passed', {
          userId: req.user.id,
          userRoles: userRoleNames,
          requiredRoles: requirement.roles,
          requireAll: requirement.requireAll
        });

        next();
      } catch (error) {
        logger.warn('Role authorization failed', {
          userId: req.user?.id,
          requiredRoles: requirement.roles,
          error: error instanceof Error ? error.message : String(error)
        });
        next(error);
      }
    };
  }

  // Level-based authorization
  requireLevel(requirement: LevelRequirement) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const context = this.createErrorContext(req, req.user?.id);

        if (!req.user) {
          throw new ForbiddenError('Authentication required', context);
        }

        await this.rbacService.requireMinLevel(
          req.user.id,
          requirement.minLevel,
          context
        );

        logger.debug('Level authorization passed', {
          userId: req.user.id,
          requiredLevel: requirement.minLevel
        });

        next();
      } catch (error) {
        logger.warn('Level authorization failed', {
          userId: req.user?.id,
          requiredLevel: requirement.minLevel,
          error: error instanceof Error ? error.message : String(error)
        });
        next(error);
      }
    };
  }

  // Resource ownership check
  requireOwnership(options: {
    resourceIdParam?: string;
    userIdField?: string;
    customCheck?: (req: AuthenticatedRequest) => Promise<boolean>;
  } = {}) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const context = this.createErrorContext(req, req.user?.id);

        if (!req.user) {
          throw new ForbiddenError('Authentication required', context);
        }

        let isOwner = false;

        if (options.customCheck) {
          isOwner = await options.customCheck(req);
        } else {
          const resourceIdParam = options.resourceIdParam || 'id';
          const userIdField = options.userIdField || 'userId';
          
          const resourceId = req.params[resourceIdParam];
          
          if (resourceId === req.user.id) {
            isOwner = true;
          } else if (req.body && req.body[userIdField] === req.user.id) {
            isOwner = true;
          }
        }

        if (!isOwner) {
          throw new ForbiddenError('Resource access denied - ownership required', context);
        }

        next();
      } catch (error) {
        logger.warn('Ownership check failed', {
          userId: req.user?.id,
          endpoint: req.path,
          error: error instanceof Error ? error.message : String(error)
        });
        next(error);
      }
    };
  }

  // Combined authorization (OR logic - pass if ANY condition is met)
  requireAny(...middlewares: Array<(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>>) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const errors: Error[] = [];

      for (const middleware of middlewares) {
        try {
          await new Promise<void>((resolve, reject) => {
            middleware(req, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          // If we get here, authorization passed
          return next();
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // All authorization methods failed
      const context = this.createErrorContext(req, req.user?.id);
      logger.warn('All authorization methods failed', {
        userId: req.user?.id,
        endpoint: req.path,
        errorCount: errors.length
      });

      next(new ForbiddenError('Access denied', context));
    };
  }

  // Admin-only access
  requireAdmin() {
    return this.requireRole({ roles: ['ADMIN'] });
  }

  // Owner or Admin access
  requireOwnerOrAdmin() {
    return this.requireRole({ roles: ['ADMIN', 'OWNER'] });
  }

  // Staff, Owner or Admin access
  requireStaffOrAbove() {
    return this.requireRole({ roles: ['ADMIN', 'OWNER', 'STAFF'] });
  }
}

// Utility functions for common authorization patterns
export const createOwnershipCheck = (resourceService: any, userIdField = 'userId') => {
  return async (req: AuthenticatedRequest): Promise<boolean> => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceService.findById(resourceId);
      
      return resource && resource[userIdField] === req.user?.id;
    } catch (error) {
      logger.error('Ownership check error', {
        resourceId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  };
};

// Context providers for common scenarios
export const contextProviders = {
  // For user profile operations
  userProfile: (req: AuthenticatedRequest) => ({
    resourceId: req.params.userId || req.params.id,
    ownerId: req.params.userId || req.params.id,
    targetUserId: req.params.userId || req.params.id
  }),

  // For resource with explicit owner field
  resourceOwner: (req: AuthenticatedRequest) => ({
    resourceId: req.params.id,
    ownerId: req.body?.userId || req.query?.userId,
    ...req.body,
    ...req.query
  }),

  // For admin operations
  adminAction: (req: AuthenticatedRequest) => ({
    adminUserId: req.user?.id,
    targetResourceId: req.params.id,
    actionType: req.method,
    ...req.body
  })
};