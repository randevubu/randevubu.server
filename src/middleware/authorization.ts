import { NextFunction, Request, Response } from "express";
import { RBACService } from "../services/domain/rbac";
import { ErrorContext, ForbiddenError } from "../types/errors";
import { AuthenticatedRequest } from "../types/request";
import logger from "../utils/Logger/logger";

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
      userAgent: req.get("user-agent"),
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
          throw new ForbiddenError("Authentication required", context);
        }

        // Get context for permission evaluation
        const permissionContext = options.contextProvider
          ? options.contextProvider(req)
          : {
              resourceId: req.params.id,
              ownerId: req.user.id,
              ...req.body,
              ...req.query,
            };

        await this.rbacService.requirePermission(
          req.user.id,
          `${options.resource}:${options.action}`,
          permissionContext,
          context
        );

        logger.debug("Permission granted", {
          userId: req.user.id,
          resource: options.resource,
          action: options.action,
          endpoint: req.path,
        });

        next();
      } catch (error) {
        logger.warn("Authorization failed", {
          userId: req.user?.id,
          resource: options.resource,
          action: options.action,
          endpoint: req.path,
          error: error instanceof Error ? error.message : String(error),
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
          throw new ForbiddenError("Authentication required", context);
        }

        const userRoles = await this.rbacService.getUserRoles(req.user.id);
        const userRoleNames = userRoles.map((role) => role.name);

        const hasRequiredRoles = requirement.requireAll
          ? requirement.roles.every((role) => userRoleNames.includes(role))
          : requirement.roles.some((role) => userRoleNames.includes(role));

        if (!hasRequiredRoles) {
          const requiredRolesStr = requirement.requireAll
            ? requirement.roles.join(" AND ")
            : requirement.roles.join(" OR ");

          throw new ForbiddenError(
            `Required role(s): ${requiredRolesStr}`,
            context
          );
        }

        logger.debug("Role authorization passed", {
          userId: req.user.id,
          userRoles: userRoleNames,
          requiredRoles: requirement.roles,
          requireAll: requirement.requireAll,
        });

        next();
      } catch (error) {
        logger.warn("Role authorization failed", {
          userId: req.user?.id,
          requiredRoles: requirement.roles,
          error: error instanceof Error ? error.message : String(error),
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
          throw new ForbiddenError("Authentication required", context);
        }

        await this.rbacService.requireMinLevel(
          req.user.id,
          requirement.minLevel,
          context
        );

        logger.debug("Level authorization passed", {
          userId: req.user.id,
          requiredLevel: requirement.minLevel,
        });

        next();
      } catch (error) {
        logger.warn("Level authorization failed", {
          userId: req.user?.id,
          requiredLevel: requirement.minLevel,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    };
  }

  // Resource ownership check
  requireOwnership(
    options: {
      resourceIdParam?: string;
      userIdField?: string;
      customCheck?: (req: AuthenticatedRequest) => Promise<boolean>;
    } = {}
  ) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const context = this.createErrorContext(req, req.user?.id);

        if (!req.user) {
          throw new ForbiddenError("Authentication required", context);
        }

        let isOwner = false;

        if (options.customCheck) {
          isOwner = await options.customCheck(req);
        } else {
          const resourceIdParam = options.resourceIdParam || "id";
          const userIdField = options.userIdField || "userId";

          const resourceId = req.params[resourceIdParam];

          if (resourceId === req.user.id) {
            isOwner = true;
          } else if (req.body && req.body[userIdField] === req.user.id) {
            isOwner = true;
          }
        }

        if (!isOwner) {
          throw new ForbiddenError(
            "Resource access denied - ownership required",
            context
          );
        }

        next();
      } catch (error) {
        logger.warn("Ownership check failed", {
          userId: req.user?.id,
          endpoint: req.path,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    };
  }

  // Combined authorization (OR logic - pass if ANY middleware condition is met)
  requireAnyMiddleware(
    ...middlewares: Array<
      (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
      ) => Promise<void>
    >
  ) {
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
          errors.push(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }

      // All authorization methods failed
      const context = this.createErrorContext(req, req.user?.id);
      logger.warn("All authorization methods failed", {
        userId: req.user?.id,
        endpoint: req.path,
        errorCount: errors.length,
      });

      next(new ForbiddenError("Access denied", context));
    };
  }

  // Admin-only access
  requireAdmin() {
    return this.requireRole({ roles: ["ADMIN"] });
  }

  // Owner or Admin access
  requireOwnerOrAdmin() {
    return this.requireRole({ roles: ["ADMIN", "OWNER"] });
  }

  // Staff, Owner or Admin access
  requireStaffOrAbove() {
    return this.requireRole({ roles: ["ADMIN", "OWNER", "STAFF"] });
  }

  // ============================================================================
  // BUSINESS-SPECIFIC AUTHORIZATION METHODS
  // Consolidated from PermissionMiddleware to eliminate duplication
  // ============================================================================

  /**
   * Require any of the specified permissions (OR logic)
   * Industry Standard: Flexible permission validation
   */
  async requireAny(
    userId: string,
    permissions: string[],
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    const hasAny = await this.rbacService.requireAny(userId, permissions, context);

    if (!hasAny) {
      throw new ForbiddenError(
        `One of these permissions is required: ${permissions.join(', ')}`,
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  /**
   * Require all of the specified permissions (AND logic)
   * Industry Standard: Strict permission validation
   */
  async requireAll(
    userId: string,
    permissions: string[],
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    for (const permission of permissions) {
      await this.rbacService.requirePermission(
        userId,
        permission,
        context,
        errorContext
      );
    }
  }

  /**
   * Check if user has a specific permission (non-throwing)
   * Industry Standard: Conditional permission checking
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    try {
      return await this.rbacService.hasPermission(
        userId,
        resource,
        action,
        context
      );
    } catch (error) {
      logger.warn('Permission check failed', {
        userId,
        resource,
        action,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Business-specific permission validation
   * Checks both global and business-scoped permissions
   */
  async requireBusinessPermission(
    userId: string,
    businessId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    const [resource, action] = permission.split(':');

    // Check global permission first
    const hasGlobalPermission = await this.rbacService.hasPermission(
      userId,
      resource,
      action
    );

    if (hasGlobalPermission) {
      return;
    }

    // Check business-specific permission
    const hasBusinessPermission = await this.rbacService.hasPermission(
      userId,
      resource,
      action,
      { businessId }
    );

    if (!hasBusinessPermission) {
      throw new ForbiddenError(
        'You do not have permission to perform this action on this business',
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  /**
   * Staff-specific permission validation
   * Allows business owners OR staff with specific permission
   */
  async requireStaffPermission(
    userId: string,
    businessId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    const [resource, action] = permission.split(':');

    // Check if user is business owner
    const isOwner = await this.rbacService.hasPermission(
      userId,
      'business',
      'manage_own',
      { businessId }
    );

    if (isOwner) {
      return;
    }

    // Check staff-specific permission
    const hasStaffPermission = await this.rbacService.hasPermission(
      userId,
      resource,
      action,
      { businessId, role: 'STAFF' }
    );

    if (!hasStaffPermission) {
      throw new ForbiddenError(
        'You do not have staff permission to perform this action',
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  /**
   * Customer-specific permission validation
   * Allows self-access OR business staff with customer management permission
   */
  async requireCustomerPermission(
    userId: string,
    businessId: string,
    customerId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    // Check if user is the customer themselves
    if (userId === customerId) {
      return;
    }

    // Check if user has business access to manage customers
    const hasBusinessAccess = await this.rbacService.hasPermission(
      userId,
      'customer',
      'manage',
      { businessId }
    );

    if (!hasBusinessAccess) {
      throw new ForbiddenError(
        'You do not have permission to perform this action for this customer',
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }
}

// Utility functions for common authorization patterns
export const createOwnershipCheck = (
  resourceService: any,
  userIdField = "userId"
) => {
  return async (req: AuthenticatedRequest): Promise<boolean> => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceService.findById(resourceId);

      return resource && resource[userIdField] === req.user?.id;
    } catch (error) {
      logger.error("Ownership check error", {
        resourceId: req.params.id,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
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
    targetUserId: req.params.userId || req.params.id,
  }),

  // For resource with explicit owner field
  resourceOwner: (req: AuthenticatedRequest) => ({
    resourceId: req.params.id,
    ownerId: req.body?.userId || req.query?.userId,
    ...req.body,
    ...req.query,
  }),

  // For admin operations
  adminAction: (req: AuthenticatedRequest) => ({
    adminUserId: req.user?.id,
    targetResourceId: req.params.id,
    actionType: req.method,
    ...req.body,
  }),
};
