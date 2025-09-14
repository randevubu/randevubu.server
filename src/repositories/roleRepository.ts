import { PrismaClient } from '@prisma/client';
import { 
  RoleData, 
  PermissionData, 
  UserRoleData, 
  RolePermissionData,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
  UpdatePermissionRequest
} from '../types/auth';
import { logger } from '../utils/logger';

export class RoleRepository {
  constructor(private prisma: PrismaClient) {}

  // Role CRUD operations
  async createRole(data: CreateRoleRequest, createdBy: string): Promise<RoleData> {
    try {
      const roleId = this.generateId('role');
      
      const role = await this.prisma.role.create({
        data: {
          id: roleId,
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          level: data.level,
          isSystem: false,
          isActive: true
        }
      });

      // Assign permissions if provided
      if (data.permissionIds && data.permissionIds.length > 0) {
        await this.assignPermissionsToRole(roleId, data.permissionIds, createdBy);
      }

      logger.info('Role created', {
        roleId,
        roleName: data.name,
        createdBy,
        permissionCount: data.permissionIds?.length || 0
      });

      return role as RoleData;
    } catch (error) {
      logger.error('Failed to create role', {
        roleName: data.name,
        createdBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getRoleById(id: string, includePermissions = false): Promise<RoleData | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
        include: includePermissions ? {
          rolePermissions: {
            where: { isActive: true },
            include: {
              permission: true
            }
          }
        } : undefined
      });

      return role as RoleData | null;
    } catch (error) {
      logger.error('Failed to get role by ID', {
        roleId: id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getRoleByName(name: string, includePermissions = false): Promise<RoleData | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { name },
        include: includePermissions ? {
          rolePermissions: {
            where: { isActive: true },
            include: {
              permission: true
            }
          }
        } : undefined
      });

      return role as RoleData | null;
    } catch (error) {
      logger.error('Failed to get role by name', {
        roleName: name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getAllRoles(includeInactive = false): Promise<RoleData[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: [
          { level: 'desc' },
          { name: 'asc' }
        ]
      });

      return roles as RoleData[];
    } catch (error) {
      logger.error('Failed to get all roles', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async updateRole(id: string, data: UpdateRoleRequest, updatedBy: string): Promise<RoleData> {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      logger.info('Role updated', {
        roleId: id,
        updatedBy,
        changes: Object.keys(data)
      });

      return role as RoleData;
    } catch (error) {
      logger.error('Failed to update role', {
        roleId: id,
        updatedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteRole(id: string, deletedBy: string): Promise<void> {
    try {
      // Check if role is system role
      const role = await this.getRoleById(id);
      if (role?.isSystem) {
        throw new Error('Cannot delete system role');
      }

      // Soft delete - deactivate role and set deletedAt
      await this.prisma.role.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Deactivate all user role assignments
      await this.prisma.userRole.updateMany({
        where: { roleId: id, isActive: true },
        data: { isActive: false, updatedAt: new Date() }
      });

      logger.info('Role deleted', {
        roleId: id,
        deletedBy
      });
    } catch (error) {
      logger.error('Failed to delete role', {
        roleId: id,
        deletedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Permission CRUD operations
  async createPermission(data: CreatePermissionRequest): Promise<PermissionData> {
    try {
      const permission = await this.prisma.permission.create({
        data: {
          id: this.generateId('perm'),
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          resource: data.resource,
          action: data.action,
          conditions: data.conditions,
          isSystem: false
        }
      });

      logger.info('Permission created', {
        permissionId: permission.id,
        permissionName: data.name,
        resource: data.resource,
        action: data.action
      });

      return permission as PermissionData;
    } catch (error) {
      logger.error('Failed to create permission', {
        permissionName: data.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getPermissionById(id: string): Promise<PermissionData | null> {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id }
      });

      return permission as PermissionData | null;
    } catch (error) {
      logger.error('Failed to get permission by ID', {
        permissionId: id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getPermissionByName(name: string): Promise<PermissionData | null> {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { name }
      });

      return permission as PermissionData | null;
    } catch (error) {
      logger.error('Failed to get permission by name', {
        permissionName: name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getAllPermissions(): Promise<PermissionData[]> {
    try {
      const permissions = await this.prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' }
        ]
      });

      return permissions as PermissionData[];
    } catch (error) {
      logger.error('Failed to get all permissions', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getPermissionsByResource(resource: string): Promise<PermissionData[]> {
    try {
      const permissions = await this.prisma.permission.findMany({
        where: { resource },
        orderBy: { action: 'asc' }
      });

      return permissions as PermissionData[];
    } catch (error) {
      logger.error('Failed to get permissions by resource', {
        resource,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async updatePermission(id: string, data: UpdatePermissionRequest): Promise<PermissionData> {
    try {
      const permission = await this.prisma.permission.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      logger.info('Permission updated', {
        permissionId: id,
        changes: Object.keys(data)
      });

      return permission as PermissionData;
    } catch (error) {
      logger.error('Failed to update permission', {
        permissionId: id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Role-Permission management
  async assignPermissionsToRole(
    roleId: string, 
    permissionIds: string[], 
    grantedBy: string
  ): Promise<void> {
    try {
      const rolePermissions = permissionIds.map(permissionId => ({
        id: this.generateId('rperm'),
        roleId,
        permissionId,
        grantedBy,
        grantedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await this.prisma.rolePermission.createMany({
        data: rolePermissions,
        skipDuplicates: true
      });

      logger.info('Permissions assigned to role', {
        roleId,
        permissionCount: permissionIds.length,
        grantedBy
      });
    } catch (error) {
      logger.error('Failed to assign permissions to role', {
        roleId,
        permissionIds,
        grantedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    try {
      await this.prisma.rolePermission.updateMany({
        where: {
          roleId,
          permissionId,
          isActive: true
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      logger.info('Permission revoked from role', {
        roleId,
        permissionId
      });
    } catch (error) {
      logger.error('Failed to revoke permission from role', {
        roleId,
        permissionId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getRolePermissions(roleId: string): Promise<PermissionData[]> {
    try {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: {
          roleId,
          isActive: true
        },
        include: {
          permission: true
        }
      });

      return rolePermissions.map(rp => rp.permission) as PermissionData[];
    } catch (error) {
      logger.error('Failed to get role permissions', {
        roleId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // User-Role management
  async assignRoleToUser(
    userId: string,
    roleId: string,
    grantedBy: string,
    expiresAt?: Date,
    metadata?: any
  ): Promise<UserRoleData> {
    try {
      const userRole = await this.prisma.userRole.create({
        data: {
          id: this.generateId('urole'),
          userId,
          roleId,
          grantedBy,
          grantedAt: new Date(),
          expiresAt,
          metadata,
          isActive: true
        }
      });

      logger.info('Role assigned to user', {
        userId,
        roleId,
        grantedBy,
        expiresAt
      });

      return userRole as UserRoleData;
    } catch (error) {
      logger.error('Failed to assign role to user', {
        userId,
        roleId,
        grantedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.prisma.userRole.updateMany({
        where: {
          userId,
          roleId,
          isActive: true
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      logger.info('Role revoked from user', {
        userId,
        roleId
      });
    } catch (error) {
      logger.error('Failed to revoke role from user', {
        userId,
        roleId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<RoleData[]> {
    try {
      // Get global roles from UserRole table
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          role: { isActive: true }
        },
        include: {
          role: true
        }
      });

      // Get business staff roles from BusinessStaff table
      const businessStaffRoles = await this.prisma.businessStaff.findMany({
        where: {
          userId,
          isActive: true,
          business: {
            isActive: true,
            deletedAt: null
          }
        },
        select: {
          role: true,
          businessId: true
        }
      });

      // Convert global roles
      const globalRoles = userRoles.map(ur => ur.role) as RoleData[];
      
      // Convert BusinessStaff roles to RoleData format
      // Create synthetic role entries for BusinessStaff roles
      const staffRoleMap: { [key: string]: RoleData } = {};
      
      for (const staff of businessStaffRoles) {
        const roleKey = `BUSINESS_${staff.role}`;
        if (!staffRoleMap[roleKey]) {
          staffRoleMap[roleKey] = {
            id: `business_staff_${staff.role.toLowerCase()}`,
            name: staff.role,
            displayName: `Business ${staff.role}`,
            description: `${staff.role} role in business context`,
            level: this.getStaffRoleLevel(staff.role),
            isSystem: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          } as RoleData;
        }
      }

      // Combine global roles and business staff roles
      const allRoles = [...globalRoles, ...Object.values(staffRoleMap)];
      
      // Remove duplicates based on role name
      const uniqueRoles = allRoles.filter((role, index, self) =>
        index === self.findIndex(r => r.name === role.name)
      );

      return uniqueRoles;
    } catch (error) {
      logger.error('Failed to get user roles', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private getStaffRoleLevel(role: string): number {
    // Define role hierarchy levels for BusinessStaff roles
    const roleLevels = {
      'OWNER': 300,
      'MANAGER': 250, 
      'STAFF': 200,
      'RECEPTIONIST': 150
    };
    return roleLevels[role as keyof typeof roleLevels] || 100;
  }

  async getUsersByRole(roleId: string): Promise<string[]> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          roleId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: {
          userId: true
        }
      });

      return userRoles.map(ur => ur.userId);
    } catch (error) {
      logger.error('Failed to get users by role', {
        roleId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Utility methods
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Statistics and analytics
  async getRoleStats(): Promise<{
    totalRoles: number;
    activeRoles: number;
    systemRoles: number;
    customRoles: number;
  }> {
    try {
      const [total, active, system] = await Promise.all([
        this.prisma.role.count(),
        this.prisma.role.count({ where: { isActive: true } }),
        this.prisma.role.count({ where: { isSystem: true } })
      ]);

      return {
        totalRoles: total,
        activeRoles: active,
        systemRoles: system,
        customRoles: total - system
      };
    } catch (error) {
      logger.error('Failed to get role statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getPermissionStats(): Promise<{
    totalPermissions: number;
    systemPermissions: number;
    customPermissions: number;
    permissionsByResource: Record<string, number>;
  }> {
    try {
      const [total, system, byResource] = await Promise.all([
        this.prisma.permission.count(),
        this.prisma.permission.count({ where: { isSystem: true } }),
        this.prisma.permission.groupBy({
          by: ['resource'],
          _count: { resource: true }
        })
      ]);

      const permissionsByResource = byResource.reduce((acc, item) => {
        acc[item.resource] = item._count.resource;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPermissions: total,
        systemPermissions: system,
        customPermissions: total - system,
        permissionsByResource
      };
    } catch (error) {
      logger.error('Failed to get permission statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}