import { RBACService } from '../services/domain/rbac/rbacService';
import { PermissionName } from '../types/auth';
import { 
  ForbiddenError, 
  ValidationError,
  ErrorContext 
} from '../types/errors';
import logger from "../utils/Logger/logger";
/**
 * PermissionMiddleware
 * 
 * Enterprise Pattern: Centralized permission checking logic
 * Following Amazon/Microsoft patterns for authorization
 * 
 * Responsibilities:
 * - Permission validation
 * - Role-based access control
 * - Permission context management
 * - Consistent authorization patterns
 */
export class PermissionMiddleware {
  constructor(private rbacService: RBACService) {}

  /**
   * Require a specific permission
   * Industry Standard: Single permission validation
   */
  async requirePermission(
    userId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    try {
      await this.rbacService.requirePermission(
        userId,
        permission,
        context,
        errorContext
      );
    } catch (error) {
      await this.logPermissionEvent('PERMISSION_DENIED', {
        userId,
        permission,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

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
    try {
      await this.rbacService.requireAny(
        userId,
        permissions,
        context
      );
    } catch (error) {
      await this.logPermissionEvent('PERMISSION_ANY_DENIED', {
        userId,
        permissions,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
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
    try {
      for (const permission of permissions) {
        await this.rbacService.requirePermission(
          userId,
          permission,
          context,
          errorContext
        );
      }
    } catch (error) {
      await this.logPermissionEvent('PERMISSION_ALL_DENIED', {
        userId,
        permissions,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
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
      await this.logPermissionEvent('PERMISSION_CHECK_FAILED', {
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
   * Check if user has any of the specified permissions
   * Industry Standard: Flexible permission checking
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[],
    context?: any
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const [resource, action] = permission.split(':');
        if (await this.rbacService.hasPermission(userId, resource, action, context)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      await this.logPermissionEvent('PERMISSION_ANY_CHECK_FAILED', {
        userId,
        permissions,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check if user has all of the specified permissions
   * Industry Standard: Strict permission checking
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[],
    context?: any
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const [resource, action] = permission.split(':');
        if (!(await this.rbacService.hasPermission(userId, resource, action, context))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      await this.logPermissionEvent('PERMISSION_ALL_CHECK_FAILED', {
        userId,
        permissions,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Business-specific permission validation
   * Industry Standard: Resource-specific authorization
   */
  async requireBusinessPermission(
    userId: string,
    businessId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    try {
      // Check global permission first
      const hasGlobalPermission = await this.rbacService.hasPermission(
        userId,
        permission.split(':')[0],
        permission.split(':')[1]
      );

      if (hasGlobalPermission) {
        return;
      }

      // Check business-specific permission
      const hasBusinessPermission = await this.rbacService.hasPermission(
        userId,
        permission.split(':')[0],
        permission.split(':')[1],
        { businessId }
      );

      if (!hasBusinessPermission) {
        await this.logPermissionEvent('BUSINESS_PERMISSION_DENIED', {
          userId,
          businessId,
          permission,
          context
        });
        throw new ForbiddenError(
          'You do not have permission to perform this action on this business',
          errorContext
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      
      await this.logPermissionEvent('BUSINESS_PERMISSION_CHECK_FAILED', {
        userId,
        businessId,
        permission,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new ValidationError('Business permission validation failed', undefined, undefined, errorContext);
    }
  }

  /**
   * Staff-specific permission validation
   * Industry Standard: Role-based business access
   */
  async requireStaffPermission(
    userId: string,
    businessId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    try {
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
        permission.split(':')[0],
        permission.split(':')[1],
        { businessId, role: 'STAFF' }
      );

      if (!hasStaffPermission) {
        await this.logPermissionEvent('STAFF_PERMISSION_DENIED', {
          userId,
          businessId,
          permission,
          context
        });
        throw new ForbiddenError(
          'You do not have staff permission to perform this action',
          errorContext
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      
      await this.logPermissionEvent('STAFF_PERMISSION_CHECK_FAILED', {
        userId,
        businessId,
        permission,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new ValidationError('Staff permission validation failed', undefined, undefined, errorContext);
    }
  }

  /**
   * Customer-specific permission validation
   * Industry Standard: Customer access control
   */
  async requireCustomerPermission(
    userId: string,
    businessId: string,
    customerId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    try {
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
        await this.logPermissionEvent('CUSTOMER_PERMISSION_DENIED', {
          userId,
          businessId,
          customerId,
          permission,
          context
        });
        throw new ForbiddenError(
          'You do not have permission to perform this action for this customer',
          errorContext
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      
      await this.logPermissionEvent('CUSTOMER_PERMISSION_CHECK_FAILED', {
        userId,
        businessId,
        customerId,
        permission,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new ValidationError('Customer permission validation failed', undefined, undefined, errorContext);
    }
  }

  /**
   * Log permission events for audit purposes
   * Industry Standard: Comprehensive authorization logging
   */
  private async logPermissionEvent(
    eventType: string, 
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      logger.info('Permission middleware security event', {
        eventType,
        timestamp: new Date().toISOString(),
        ...data
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      logger.error('Failed to log permission event', {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export factory function for dependency injection
export function createPermissionMiddleware(rbacService: RBACService): PermissionMiddleware {
  return new PermissionMiddleware(rbacService);
}
