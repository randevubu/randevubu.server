import { RepositoryContainer } from '../repositories';
import { logger } from '../utils/logger';
import { 
  ForbiddenError, 
  ValidationError, 
  UserNotFoundError, 
  ErrorContext 
} from '../types/errors';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: any;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  permissions: Permission[];
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  permissions: Permission[];
  effectiveLevel: number;
}

export interface PermissionContext {
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  metadata?: any;
}

export class RBACService {
  private permissionCache = new Map<string, UserPermissions>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private repositories: RepositoryContainer) {}

  async getUserPermissions(userId: string, useCache = true): Promise<UserPermissions> {
    const cacheKey = `user:${userId}`;
    
    if (useCache && this.permissionCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.permissionCache.get(cacheKey)!;
      }
    }

    try {
      // Get user roles through repository
      const userRoles = await this.repositories.roleRepository.getUserRoles(userId);
      
      // Build roles and permissions
      const roles: Role[] = [];
      const allPermissions: Permission[] = [];
      let maxLevel = 0;

      for (const role of userRoles) {
        if (!role.isActive) continue;

        // Get role permissions through repository
        const rolePermissions = await this.repositories.roleRepository.getRolePermissions(role.id);
        
        const permissions: Permission[] = rolePermissions.map((permission) => ({
          id: permission.id,
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          conditions: permission.conditions
        }));

        roles.push({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          level: role.level,
          permissions
        });

        allPermissions.push(...permissions);
        maxLevel = Math.max(maxLevel, role.level);
      }

      // Remove duplicate permissions
      const uniquePermissions = allPermissions.filter((permission, index, self) =>
        index === self.findIndex(p => p.name === permission.name)
      );

      const userPermissions: UserPermissions = {
        userId,
        roles,
        permissions: uniquePermissions,
        effectiveLevel: maxLevel
      };

      // Cache the result
      this.permissionCache.set(cacheKey, userPermissions);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return userPermissions;
    } catch (error) {
      logger.error('Failed to get user permissions', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async hasPermission(
    userId: string, 
    resource: string, 
    action: string, 
    context?: any
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check for exact permission match
      const permission = userPermissions.permissions.find(p => 
        p.resource === resource && p.action === action
      );

      if (!permission) {
        return false;
      }

      // Evaluate permission conditions if they exist
      if (permission.conditions) {
        return this.evaluateConditions(permission.conditions, context, userPermissions);
      }

      return true;
    } catch (error) {
      logger.error('Permission check failed', {
        userId,
        resource,
        action,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async requirePermission(
    userId: string,
    permission: string,
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    const [resource, action] = permission.split(':');
    const hasPermission = await this.hasPermission(userId, resource, action, context);
    
    if (!hasPermission) {
      throw new ForbiddenError(
        `Permission denied: ${permission}`,
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  async requireAny(
    userId: string,
    permissions: string[],
    context?: any,
    errorContext?: ErrorContext
  ): Promise<void> {
    for (const permission of permissions) {
      const [resource, action] = permission.split(':');
      const hasPermission = await this.hasPermission(userId, resource, action, context);
      if (hasPermission) {
        return; // User has at least one required permission
      }
    }
    
    throw new ForbiddenError(
      `Permission denied: requires one of [${permissions.join(', ')}]`,
      errorContext || { userId, timestamp: new Date() }
    );
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.roles.some(role => role.name === roleName);
    } catch (error) {
      logger.error('Role check failed', {
        userId,
        roleName,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async requireRole(
    userId: string, 
    roleName: string, 
    errorContext?: ErrorContext
  ): Promise<void> {
    const hasRole = await this.hasRole(userId, roleName);
    
    if (!hasRole) {
      throw new ForbiddenError(
        `Role required: ${roleName}`,
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  async requireMinLevel(
    userId: string, 
    minLevel: number, 
    errorContext?: ErrorContext
  ): Promise<void> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      if (userPermissions.effectiveLevel < minLevel) {
        throw new ForbiddenError(
          `Insufficient role level. Required: ${minLevel}, Current: ${userPermissions.effectiveLevel}`,
          errorContext || { userId, timestamp: new Date() }
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('Level check failed', {
        userId,
        minLevel,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ForbiddenError(
        'Access denied',
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  async assignRole(
    userId: string,
    roleNameOrId: string,
    grantedBy: string,
    expiresAt?: Date,
    metadata?: any
  ): Promise<void> {
    try {
      // First try to get role by name, then by ID
      let role = await this.repositories.roleRepository.getRoleByName(roleNameOrId);
      
      if (!role) {
        // If not found by name, try by ID
        role = await this.repositories.roleRepository.getRoleById(roleNameOrId);
      }

      if (!role || !role.isActive) {
        throw new UserNotFoundError('Role not found or inactive');
      }

      // Check if user already has this role by getting current user roles
      const userRoles = await this.repositories.roleRepository.getUserRoles(userId);
      const hasRole = userRoles.some(ur => ur.id === role.id);

      if (hasRole) {
        throw new ValidationError('User already has this role');
      }

      // Assign role to user through repository using the role ID
      await this.repositories.roleRepository.assignRoleToUser(
        userId,
        role.id,
        grantedBy,
        expiresAt,
        metadata
      );

      // Clear cache
      this.clearUserCache(userId);

      logger.info('Role assigned', {
        userId,
        roleId: role.id,
        roleName: role.name,
        grantedBy,
        expiresAt
      });
    } catch (error) {
      logger.error('Failed to assign role', {
        userId,
        roleNameOrId: roleNameOrId,
        grantedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async revokeRole(userId: string, roleId: string, revokedBy: string): Promise<void> {
    try {
      // Check if user has the role before attempting to revoke
      const userRoles = await this.repositories.roleRepository.getUserRoles(userId);
      const hasRole = userRoles.some(ur => ur.id === roleId);

      if (!hasRole) {
        throw new UserNotFoundError('User role assignment not found');
      }

      // Revoke role through repository
      await this.repositories.roleRepository.revokeRoleFromUser(userId, roleId);

      // Clear cache
      this.clearUserCache(userId);

      logger.info('Role revoked', {
        userId,
        roleId,
        revokedBy
      });
    } catch (error) {
      logger.error('Failed to revoke role', {
        userId,
        roleId,
        revokedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.roles;
  }

  clearUserCache(userId: string): void {
    const cacheKey = `user:${userId}`;
    this.permissionCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  clearAllCache(): void {
    this.permissionCache.clear();
    this.cacheExpiry.clear();
  }

  private evaluateConditions(
    conditions: any, 
    context: any, 
    userPermissions: UserPermissions
  ): boolean {
    try {
      // Basic condition evaluation
      if (!conditions || typeof conditions !== 'object') {
        return true;
      }

      // Owner check - user can only access their own resources
      if (conditions.owner === true && context?.ownerId) {
        return context.ownerId === userPermissions.userId;
      }

      // Level-based access
      if (conditions.minLevel && userPermissions.effectiveLevel < conditions.minLevel) {
        return false;
      }

      // Time-based access
      if (conditions.timeRestrictions) {
        const now = new Date();
        const { startTime, endTime } = conditions.timeRestrictions;
        
        if (startTime && now < new Date(startTime)) return false;
        if (endTime && now > new Date(endTime)) return false;
      }

      // Custom conditions can be added here
      // For now, return true if no conditions block access
      return true;
    } catch (error) {
      logger.warn('Condition evaluation failed', {
        conditions,
        context,
        userId: userPermissions.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }


}