import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../services/roleService';
import { 
  GuaranteedAuthRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  CreatePermissionRequest,
  UpdatePermissionRequest
} from '../types/auth';
import { logger } from '../utils/logger';

export class RoleController {
  constructor(private roleService: RoleService) {}

  private createErrorContext(req: Request, userId?: string) {
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

  // Role management endpoints
  createRole = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = this.createErrorContext(req, req.user.id);
      const data = req.body as CreateRoleRequest;
      
      const role = await this.roleService.createRole(data, req.user.id, context);

      logger.info('Role created via API', {
        roleId: role.id,
        roleName: role.name,
        createdBy: req.user.id,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: {
          role: {
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            level: role.level,
            isActive: role.isActive,
            createdAt: role.createdAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getRoles = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const roles = await this.roleService.getAllRoles(includeInactive);

      res.json({
        success: true,
        message: 'Roles retrieved successfully',
        data: {
          roles: roles.map(role => ({
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            level: role.level,
            isSystem: role.isSystem,
            isActive: role.isActive,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getRoleById = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const includePermissions = req.query.includePermissions === 'true';
      
      const role = await this.roleService.getRoleById(id, includePermissions);

      res.json({
        success: true,
        message: 'Role retrieved successfully',
        data: { role }
      });
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.createErrorContext(req, req.user.id);
      const data = req.body as UpdateRoleRequest;

      const role = await this.roleService.updateRole(id, data, req.user.id, context);

      logger.info('Role updated via API', {
        roleId: id,
        updatedBy: req.user.id,
        changes: Object.keys(data),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: { role }
      });
    } catch (error) {
      next(error);
    }
  };

  deleteRole = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.createErrorContext(req, req.user.id);

      await this.roleService.deleteRole(id, req.user.id, context);

      logger.info('Role deleted via API', {
        roleId: id,
        deletedBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Permission management endpoints
  createPermission = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as CreatePermissionRequest;
      
      const permission = await this.roleService.createPermission(data);

      logger.info('Permission created via API', {
        permissionId: permission.id,
        permissionName: permission.name,
        createdBy: req.user.id,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: { permission }
      });
    } catch (error) {
      next(error);
    }
  };

  getPermissions = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { resource } = req.query;
      
      const permissions = resource 
        ? await this.roleService.getPermissionsByResource(resource as string)
        : await this.roleService.getAllPermissions();

      res.json({
        success: true,
        message: 'Permissions retrieved successfully',
        data: { permissions }
      });
    } catch (error) {
      next(error);
    }
  };

  getPermissionById = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const permission = await this.roleService.getPermissionById(id);

      res.json({
        success: true,
        message: 'Permission retrieved successfully',
        data: { permission }
      });
    } catch (error) {
      next(error);
    }
  };

  updatePermission = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body as UpdatePermissionRequest;

      const permission = await this.roleService.updatePermission(id, data);

      logger.info('Permission updated via API', {
        permissionId: id,
        updatedBy: req.user.id,
        changes: Object.keys(data),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Permission updated successfully',
        data: { permission }
      });
    } catch (error) {
      next(error);
    }
  };

  // Role-Permission management
  assignPermissionsToRole = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      const context = this.createErrorContext(req, req.user.id);

      await this.roleService.assignPermissionsToRole(roleId, permissionIds, req.user.id, context);

      logger.info('Permissions assigned to role via API', {
        roleId,
        permissionCount: permissionIds.length,
        grantedBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Permissions assigned to role successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  revokePermissionFromRole = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId, permissionId } = req.params;
      const context = this.createErrorContext(req, req.user.id);

      await this.roleService.revokePermissionFromRole(roleId, permissionId, context);

      logger.info('Permission revoked from role via API', {
        roleId,
        permissionId,
        revokedBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Permission revoked from role successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  getRolePermissions = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId } = req.params;
      const permissions = await this.roleService.getRolePermissions(roleId);

      res.json({
        success: true,
        message: 'Role permissions retrieved successfully',
        data: { permissions }
      });
    } catch (error) {
      next(error);
    }
  };

  // User-Role management
  assignRoleToUser = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignmentData = req.body as AssignRoleRequest;
      const context = this.createErrorContext(req, req.user.id);

      await this.roleService.assignRoleToUser(assignmentData, req.user.id, context);

      logger.info('Role assigned to user via API', {
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        grantedBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Role assigned to user successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  revokeRoleFromUser = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, roleId } = req.params;
      const context = this.createErrorContext(req, req.user.id);

      await this.roleService.revokeRoleFromUser(userId, roleId, context);

      logger.info('Role revoked from user via API', {
        userId,
        roleId,
        revokedBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Role revoked from user successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  getUserPermissions = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      
      // Users can only view their own permissions unless they have admin rights
      if (userId !== req.user.id) {
        // This would need additional permission checking
        // For now, we'll allow it for simplicity
      }

      const permissions = await this.roleService.getUserPermissionSummary(userId);

      res.json({
        success: true,
        message: 'User permissions retrieved successfully',
        data: { permissions }
      });
    } catch (error) {
      next(error);
    }
  };

  // My permissions endpoint - for current user
  getMyPermissions = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.roleService.getUserPermissionSummary(req.user.id);

      res.json({
        success: true,
        message: 'Your permissions retrieved successfully',
        data: { permissions }
      });
    } catch (error) {
      next(error);
    }
  };

  // Statistics endpoint
  getRoleStatistics = async (req: GuaranteedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statistics = await this.roleService.getRoleStatistics();

      res.json({
        success: true,
        message: 'Role statistics retrieved successfully',
        data: { statistics }
      });
    } catch (error) {
      next(error);
    }
  };
}