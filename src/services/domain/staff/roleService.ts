import { RoleRepository } from "../../../repositories/roleRepository";
import {
  AssignRoleRequest,
  CreatePermissionRequest,
  CreateRoleRequest,
  PermissionData,
  RoleData,
  UpdatePermissionRequest,
  UpdateRoleRequest,
  UserPermissionSummary,
} from "../../../types/auth";
import { ErrorContext } from "../../../utils/errors/baseError";
import { AppError } from "../../../types/responseTypes";
import { RBACService } from "../rbac/rbacService";
import logger from "../../../utils/Logger/logger";
export class RoleService {
  constructor(
    private roleRepository: RoleRepository,
    private rbacService: RBACService
  ) {}

  // Role management
  async createRole(
    data: CreateRoleRequest,
    createdBy: string,
    context?: ErrorContext
  ): Promise<RoleData> {
    try {
      // Validate role name uniqueness
      const existingRole = await this.roleRepository.getRoleByName(data.name);
      if (existingRole) {
        throw new AppError('RESOURCE_CONFLICT', { message: 'Role already exists' });
      }

      // Validate permissions if provided
      if (data.permissionIds && data.permissionIds.length > 0) {
        await this.validatePermissions(data.permissionIds, context);
      }

      // Validate level constraints
      await this.validateRoleLevel(data.level, createdBy, context);

      const role = await this.roleRepository.createRole(data, createdBy);

      logger.info("Role created successfully", {
        roleId: role.id,
        roleName: role.name,
        level: role.level,
        createdBy,
      });

      return role;
    } catch (error) {
      logger.error("Failed to create role", {
        roleName: data.name,
        createdBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRoleById(id: string, includePermissions = false): Promise<RoleData> {
    const role = await this.roleRepository.getRoleById(id, includePermissions);
    if (!role) {
      throw new AppError('ROLE_NOT_FOUND', { message: 'Role with ID not found' });
    }
    return role;
  }

  async getRoleByName(
    name: string,
    includePermissions = false
  ): Promise<RoleData> {
    const role = await this.roleRepository.getRoleByName(
      name,
      includePermissions
    );
    if (!role) {
      throw new AppError('ROLE_NOT_FOUND', { message: 'Role not found' });
    }
    return role;
  }

  async getAllRoles(includeInactive = false): Promise<RoleData[]> {
    return this.roleRepository.getAllRoles(includeInactive);
  }

  async updateRole(
    id: string,
    data: UpdateRoleRequest,
    updatedBy: string,
    context?: ErrorContext
  ): Promise<RoleData> {
    try {
      // Check if role exists
      const existingRole = await this.getRoleById(id);

      // Prevent updating system roles
      if (existingRole.isSystem) {
        throw new AppError('OPERATION_NOT_ALLOWED', { message: 'Cannot modify system role' });
      }

      // Validate level changes
      if (data.level !== undefined) {
        await this.validateRoleLevel(data.level, updatedBy, context);
      }

      const updatedRole = await this.roleRepository.updateRole(
        id,
        data,
        updatedBy
      );

      // Clear RBAC cache for users with this role
      await this.clearCacheForRole(id);

      logger.info("Role updated successfully", {
        roleId: id,
        roleName: existingRole.name,
        updatedBy,
        changes: Object.keys(data),
      });

      return updatedRole;
    } catch (error) {
      logger.error("Failed to update role", {
        roleId: id,
        updatedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteRole(
    id: string,
    deletedBy: string,
    context?: ErrorContext
  ): Promise<void> {
    try {
      // Check if role exists and is not system role
      const role = await this.getRoleById(id);

      if (role.isSystem) {
        throw new AppError('SYSTEM_ROLE_PROTECTED', { message: 'Cannot delete system role' });
      }

      // Check if role is assigned to any users
      const usersWithRole = await this.roleRepository.getUsersByRole(id);
      if (usersWithRole.length > 0) {
        throw new AppError('ROLE_IN_USE', { message: 'Cannot delete role - assigned to users' });
      }

      await this.roleRepository.deleteRole(id, deletedBy);

      logger.info("Role deleted successfully", {
        roleId: id,
        roleName: role.name,
        deletedBy,
      });
    } catch (error) {
      logger.error("Failed to delete role", {
        roleId: id,
        deletedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Permission management
  async createPermission(
    data: CreatePermissionRequest
  ): Promise<PermissionData> {
    try {
      // Validate permission name uniqueness
      const existingPermission = await this.roleRepository.getPermissionByName(
        data.name
      );
      if (existingPermission) {
        throw new AppError('ROLE_ALREADY_EXISTS', { message: 'Permission already exists' });
      }

      // Validate resource and action combination
      const existingResourceAction =
        await this.roleRepository.getPermissionsByResource(data.resource);
      const duplicate = existingResourceAction.find(
        (p) => p.action === data.action
      );
      if (duplicate) {
        throw new AppError('ROLE_ALREADY_EXISTS', { message: 'Permission already exists' });
      }

      const permission = await this.roleRepository.createPermission(data);

      logger.info("Permission created successfully", {
        permissionId: permission.id,
        permissionName: permission.name,
        resource: permission.resource,
        action: permission.action,
      });

      return permission;
    } catch (error) {
      logger.error("Failed to create permission", {
        permissionName: data.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPermissionById(id: string): Promise<PermissionData> {
    const permission = await this.roleRepository.getPermissionById(id);
    if (!permission) {
      throw new AppError('PERMISSION_NOT_FOUND', { message: 'Permission not found' });
    }
    return permission;
  }

  async getAllPermissions(): Promise<PermissionData[]> {
    return this.roleRepository.getAllPermissions();
  }

  async getPermissionsByResource(resource: string): Promise<PermissionData[]> {
    return this.roleRepository.getPermissionsByResource(resource);
  }

  async updatePermission(
    id: string,
    data: UpdatePermissionRequest
  ): Promise<PermissionData> {
    try {
      // Check if permission exists
      const existingPermission = await this.getPermissionById(id);

      // Prevent updating system permissions
      if (existingPermission.isSystem) {
        throw new AppError('SYSTEM_PERMISSION_PROTECTED', { message: 'Cannot modify system permission' });
      }

      const updatedPermission = await this.roleRepository.updatePermission(
        id,
        data
      );

      // Clear RBAC cache for all users (permissions changed)
      this.rbacService.clearAllCache();

      logger.info("Permission updated successfully", {
        permissionId: id,
        permissionName: existingPermission.name,
        changes: Object.keys(data),
      });

      return updatedPermission;
    } catch (error) {
      logger.error("Failed to update permission", {
        permissionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Role-Permission management
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
    grantedBy: string,
    context?: ErrorContext
  ): Promise<void> {
    try {
      // Validate role exists and is not system role
      const role = await this.getRoleById(roleId);
      if (role.isSystem) {
        throw new AppError('SYSTEM_ROLE_PROTECTED', { message: 'Cannot modify system role permissions' });
      }

      // Validate all permissions exist
      await this.validatePermissions(permissionIds, context);

      await this.roleRepository.assignPermissionsToRole(
        roleId,
        permissionIds,
        grantedBy
      );

      // Clear cache for users with this role
      await this.clearCacheForRole(roleId);

      logger.info("Permissions assigned to role successfully", {
        roleId,
        roleName: role.name,
        permissionCount: permissionIds.length,
        grantedBy,
      });
    } catch (error) {
      logger.error("Failed to assign permissions to role", {
        roleId,
        grantedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async revokePermissionFromRole(
    roleId: string,
    permissionId: string,
    context?: ErrorContext
  ): Promise<void> {
    try {
      // Validate role exists and is not system role
      const role = await this.getRoleById(roleId);
      if (role.isSystem) {
        throw new AppError('SYSTEM_ROLE_PROTECTED', { message: 'Cannot modify system role permissions' });
      }

      await this.roleRepository.revokePermissionFromRole(roleId, permissionId);

      // Clear cache for users with this role
      await this.clearCacheForRole(roleId);

      logger.info("Permission revoked from role successfully", {
        roleId,
        roleName: role.name,
        permissionId,
      });
    } catch (error) {
      logger.error("Failed to revoke permission from role", {
        roleId,
        permissionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRolePermissions(roleId: string): Promise<PermissionData[]> {
    // Validate role exists
    await this.getRoleById(roleId);
    return this.roleRepository.getRolePermissions(roleId);
  }

  // User-Role management
  async assignRoleToUser(
    request: AssignRoleRequest,
    grantedBy: string,
    context?: ErrorContext
  ): Promise<void> {
    try {
      // Validate user exists (this would need a user service/repository)
      // For now, we'll assume the userId is valid

      // Validate role exists and is active
      const role = await this.getRoleById(request.roleId);
      if (!role.isActive) {
        throw new AppError('INACTIVE_ROLE_ASSIGNMENT', { message: 'Cannot assign inactive role' });
      }

      // Check if user already has this role
      const userRoles = await this.roleRepository.getUserRoles(request.userId);
      const hasRole = userRoles.some((r) => r.id === request.roleId);
      if (hasRole) {
        throw new AppError('ROLE_ALREADY_ASSIGNED', { message: 'User already has this role' });
      }

      // Validate expiration date if provided
      const expiresAt = request.expiresAt
        ? new Date(request.expiresAt)
        : undefined;
      if (expiresAt && expiresAt <= new Date()) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Expiration date must be in the future' });
      }

      await this.roleRepository.assignRoleToUser(
        request.userId,
        request.roleId,
        grantedBy,
        expiresAt,
        request.metadata
      );

      // Clear user's RBAC cache
      this.rbacService.clearUserCache(request.userId);

      logger.info("Role assigned to user successfully", {
        userId: request.userId,
        roleId: request.roleId,
        roleName: role.name,
        grantedBy,
        expiresAt,
      });
    } catch (error) {
      logger.error("Failed to assign role to user", {
        userId: request.userId,
        roleId: request.roleId,
        grantedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async revokeRoleFromUser(
    userId: string,
    roleId: string,
    context?: ErrorContext
  ): Promise<void> {
    try {
      // Validate role exists
      const role = await this.getRoleById(roleId);

      // Check if user has this role
      const userRoles = await this.roleRepository.getUserRoles(userId);
      const hasRole = userRoles.some((r) => r.id === roleId);
      if (!hasRole) {
        throw new AppError('ROLE_NOT_ASSIGNED', { message: 'User does not have this role' });
      }

      await this.roleRepository.revokeRoleFromUser(userId, roleId);

      // Clear user's RBAC cache
      this.rbacService.clearUserCache(userId);

      logger.info("Role revoked from user successfully", {
        userId,
        roleId,
        roleName: role.name,
      });
    } catch (error) {
      logger.error("Failed to revoke role from user", {
        userId,
        roleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUserPermissionSummary(
    userId: string
  ): Promise<UserPermissionSummary> {
    try {
      const userPermissions = await this.rbacService.getUserPermissions(userId);

      return {
        roles: userPermissions.roles.map((role) => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          level: role.level,
        })),
        permissions: userPermissions.permissions.map((permission) => ({
          id: permission.id,
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          conditions: permission.conditions,
        })),
        effectiveLevel: userPermissions.effectiveLevel,
      };
    } catch (error) {
      logger.error("Failed to get user permission summary", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Utility methods
  private async validatePermissions(
    permissionIds: string[],
    context?: ErrorContext
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      const permission = await this.roleRepository.getPermissionById(
        permissionId
      );
      if (!permission) {
        throw new AppError('PERMISSION_NOT_FOUND', { message: 'Permission not found' });
      }
    }
  }

  private async validateRoleLevel(
    level: number,
    requestedBy: string,
    context?: ErrorContext
  ): Promise<void> {
    // Get requester's effective level
    const requesterPermissions = await this.rbacService.getUserPermissions(
      requestedBy
    );

    // Ensure requester can only create/modify roles at or below their level
    if (level >= requesterPermissions.effectiveLevel) {
      throw new AppError('ROLE_LEVEL_EXCEEDED', { message: 'Cannot create/modify role with higher level' });
    }
  }

  private async clearCacheForRole(roleId: string): Promise<void> {
    try {
      // Get all users with this role
      const usersWithRole = await this.roleRepository.getUsersByRole(roleId);

      // Clear cache for each user
      usersWithRole.forEach((userId) => {
        this.rbacService.clearUserCache(userId);
      });
    } catch (error) {
      logger.warn("Failed to clear cache for role users", {
        roleId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Statistics
  async getRoleStatistics(): Promise<{
    roles: any;
    permissions: any;
    assignments: { totalAssignments: number; activeAssignments: number };
  }> {
    try {
      const [roleStats, permissionStats] = await Promise.all([
        this.roleRepository.getRoleStats(),
        this.roleRepository.getPermissionStats(),
      ]);

      // Get assignment counts through repository methods
      const allRoles = await this.roleRepository.getAllRoles(true);
      let totalAssignments = 0;
      let activeAssignments = 0;

      for (const role of allRoles) {
        const usersWithRole = await this.roleRepository.getUsersByRole(role.id);
        totalAssignments += usersWithRole.length;
        if (role.isActive) {
          activeAssignments += usersWithRole.length;
        }
      }

      return {
        roles: roleStats,
        permissions: permissionStats,
        assignments: {
          totalAssignments,
          activeAssignments,
        },
      };
    } catch (error) {
      logger.error("Failed to get role statistics", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
