import { Response } from 'express';
import { RoleService } from '../services/domain/staff';
import {
  AssignRoleRequest,
  CreatePermissionRequest,
  CreateRoleRequest,
  GuaranteedAuthRequest,
  UpdatePermissionRequest,
  UpdateRoleRequest,
} from '../types/auth';

import { AppError } from '../types/responseTypes';
import logger from '../utils/Logger/logger';
import { ResponseHelper } from '../utils/responseHelper';

export class RoleController {
  constructor(
    private roleService: RoleService,
    private responseHelper: ResponseHelper
  ) {}

  createRole = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const data = req.body as CreateRoleRequest;

    if (!data.name || !data.displayName) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Role name and display name are required', params: { field: 'name,displayName' } });
    }
    if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: 'Role name must be between 2 and 50 characters' });
    }
    if (typeof data.displayName !== 'string' || data.displayName.length < 2 || data.displayName.length > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'Display name must be between 2 and 100 characters' });
    }
    if (data.level && (typeof data.level !== 'number' || data.level < 1 || data.level > 100)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Role level must be between 1 and 100' });
    }
    if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Description must be less than 500 characters' });
    }

    const role = await this.roleService.createRole(data, req.user.id);

    await this.responseHelper.success(res, 'success.role.created', {
      role: { id: role.id, name: role.name, displayName: role.displayName, description: role.description, level: role.level, isActive: role.isActive, createdAt: role.createdAt },
    }, 201, req);
  };

  getRoles = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const includeInactive = req.query.includeInactive === 'true';

    if (req.query.includeInactive && !['true', 'false'].includes(req.query.includeInactive as string)) {
      throw new AppError('VALIDATION_ERROR', { message: 'includeInactive must be true or false' });
    }

    const roles = await this.roleService.getAllRoles(includeInactive);

    await this.responseHelper.success(res, 'success.role.retrievedList', {
      roles: roles.map((role) => ({
        id: role.id, name: role.name, displayName: role.displayName, description: role.description,
        level: role.level, isSystem: role.isSystem, isActive: role.isActive, createdAt: role.createdAt, updatedAt: role.updatedAt,
      })),
    }, 200, req);
  };

  getRoleById = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const includePermissions = req.query.includePermissions === 'true';

    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Role ID is required', params: { field: 'roleId' } });
    }

    if (req.query.includePermissions && !['true', 'false'].includes(req.query.includePermissions as string)) {
      throw new AppError('VALIDATION_ERROR', { message: 'includePermissions must be true or false' });
    }

    const role = await this.roleService.getRoleById(id, includePermissions);

    await this.responseHelper.success(res, 'success.role.retrieved', { role }, 200, req);
  };

  updateRole = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = req.body as UpdateRoleRequest;

    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Role ID is required', params: { field: 'roleId' } });
    }
    if (!data || Object.keys(data).length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Update data is required', params: { field: 'body' } });
    }
    if (data.displayName && (typeof data.displayName !== 'string' || data.displayName.length < 2 || data.displayName.length > 100)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Display name must be between 2 and 100 characters' });
    }
    if (data.level && (typeof data.level !== 'number' || data.level < 1 || data.level > 100)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Role level must be between 1 and 100' });
    }
    if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Description must be less than 500 characters' });
    }

    const role = await this.roleService.updateRole(id, data, req.user.id);

    await this.responseHelper.success(res, 'success.role.updated', { role }, 200, req);
  };

  deleteRole = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Role ID is required', params: { field: 'roleId' } });
    }

    await this.roleService.deleteRole(id, req.user.id);

    await this.responseHelper.success(res, 'success.role.deleted', undefined, 200, req);
  };

  createPermission = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const data = req.body as CreatePermissionRequest;

    if (!data.name || !data.resource) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Permission name and resource are required', params: { field: 'name,resource' } });
    }
    if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'Permission name must be between 2 and 100 characters' });
    }
    if (typeof data.resource !== 'string' || data.resource.length < 2 || data.resource.length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: 'Resource must be between 2 and 50 characters' });
    }
    if (data.action && (typeof data.action !== 'string' || data.action.length < 2 || data.action.length > 50)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Action must be between 2 and 50 characters' });
    }
    if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Description must be less than 500 characters' });
    }

    const permission = await this.roleService.createPermission(data);

    await this.responseHelper.success(res, 'success.role.permissionCreated', { permission }, 201, req);
  };

  getPermissions = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { resource } = req.query;

    const permissions = resource
      ? await this.roleService.getPermissionsByResource(resource as string)
      : await this.roleService.getAllPermissions();

    await this.responseHelper.success(res, 'success.role.permissionsRetrieved', { permissions }, 200, req);
  };

  getPermissionById = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const permission = await this.roleService.getPermissionById(id);

    await this.responseHelper.success(res, 'success.role.permissionRetrieved', { permission }, 200, req);
  };

  updatePermission = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = req.body as UpdatePermissionRequest;

    const permission = await this.roleService.updatePermission(id, data);

    await this.responseHelper.success(res, 'success.role.permissionUpdated', { permission }, 200, req);
  };

  assignPermissionsToRole = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!roleId || typeof roleId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Role ID is required', params: { field: 'roleId' } });
    }
    if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Permission IDs array is required and must not be empty', params: { field: 'permissionIds' } });
    }

    const idRegex = /^[a-zA-Z0-9-_]+$/;
    for (const permissionId of permissionIds) {
      if (typeof permissionId !== 'string' || !idRegex.test(permissionId) || permissionId.length < 1 || permissionId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid permission ID format', params: { field: 'permissionId' } });
      }
    }

    if (permissionIds.length > 100) {
      throw new AppError('BATCH_SIZE_EXCEEDED', { message: 'Cannot assign more than 100 permissions at once' });
    }

    await this.roleService.assignPermissionsToRole(roleId, permissionIds, req.user.id);

    await this.responseHelper.success(res, 'success.role.permissionsAssigned', undefined, 200, req);
  };

  revokePermissionFromRole = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { roleId, permissionId } = req.params;

    await this.roleService.revokePermissionFromRole(roleId, permissionId);

    await this.responseHelper.success(res, 'success.role.permissionRevoked', undefined, 200, req);
  };

  getRolePermissions = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { roleId } = req.params;
    const permissions = await this.roleService.getRolePermissions(roleId);

    await this.responseHelper.success(res, 'success.role.rolePermissionsRetrieved', { permissions }, 200, req);
  };

  assignRoleToUser = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const assignmentData = req.body as AssignRoleRequest;

    if (!assignmentData.userId || !assignmentData.roleId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'User ID and Role ID are required', params: { field: 'userId,roleId' } });
    }

    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (typeof assignmentData.userId !== 'string' || !idRegex.test(assignmentData.userId) || assignmentData.userId.length < 1 || assignmentData.userId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid user ID format', params: { field: 'userId' } });
    }
    if (typeof assignmentData.roleId !== 'string' || !idRegex.test(assignmentData.roleId) || assignmentData.roleId.length < 1 || assignmentData.roleId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid role ID format', params: { field: 'roleId' } });
    }

    await this.roleService.assignRoleToUser(assignmentData, req.user.id);

    await this.responseHelper.success(res, 'success.role.assignedToUser', undefined, 200, req);
  };

  revokeRoleFromUser = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { userId, roleId } = req.params;

    await this.roleService.revokeRoleFromUser(userId, roleId);

    await this.responseHelper.success(res, 'success.role.revokedFromUser', undefined, 200, req);
  };

  getUserPermissions = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    const permissions = await this.roleService.getUserPermissionSummary(userId);

    await this.responseHelper.success(res, 'success.role.userPermissionsRetrieved', { permissions }, 200, req);
  };

  getMyPermissions = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const permissions = await this.roleService.getUserPermissionSummary(req.user.id);

    await this.responseHelper.success(res, 'success.role.myPermissionsRetrieved', { permissions }, 200, req);
  };

  getRoleStatistics = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const statistics = await this.roleService.getRoleStatistics();

    await this.responseHelper.success(res, 'success.role.statisticsRetrieved', { statistics }, 200, req);
  };
}
