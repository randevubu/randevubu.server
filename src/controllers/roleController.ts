import { NextFunction, Request, Response } from 'express';
import { RoleService } from '../services/domain/staff';
import {
  AssignRoleRequest,
  CreatePermissionRequest,
  CreateRoleRequest,
  GuaranteedAuthRequest,
  UpdatePermissionRequest,
  UpdateRoleRequest,
} from '../types/auth';

import { handleRouteError, createErrorContext, sendAppErrorResponse } from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import logger from '../utils/Logger/logger';
import { ResponseHelper } from '../utils/responseHelper';

export class RoleController {
  constructor(
    private roleService: RoleService,
    private responseHelper: ResponseHelper
  ) {}

  // Role management endpoints
  createRole = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = createErrorContext(req, req.user.id);
      const data = req.body as CreateRoleRequest;

      // Validate required fields
      if (!data.name || !data.displayName) {
        const error = new AppError(
          'Role name and display name are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate name format
      if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 50) {
        const error = new AppError(
          'Role name must be between 2 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate display name format
      if (
        typeof data.displayName !== 'string' ||
        data.displayName.length < 2 ||
        data.displayName.length > 100
      ) {
        const error = new AppError(
          'Display name must be between 2 and 100 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate level if provided
      if (data.level && (typeof data.level !== 'number' || data.level < 1 || data.level > 100)) {
        const error = new AppError(
          'Role level must be between 1 and 100',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate description if provided
      if (
        data.description &&
        (typeof data.description !== 'string' || data.description.length > 500)
      ) {
        const error = new AppError(
          'Description must be less than 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const role = await this.roleService.createRole(data, req.user.id, context);

      logger.info('Role created via API', {
        roleId: role.id,
        roleName: role.name,
        createdBy: req.user.id,
        ip: req.ip,
      });

      await this.responseHelper.success(
        res,
        'success.role.created',
        {
          role: {
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            level: role.level,
            isActive: role.isActive,
            createdAt: role.createdAt,
          },
        },
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  getRoles = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate includeInactive parameter
      const includeInactive = req.query.includeInactive === 'true';

      if (
        req.query.includeInactive &&
        !['true', 'false'].includes(req.query.includeInactive as string)
      ) {
        const error = new AppError(
          'includeInactive must be true or false',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const roles = await this.roleService.getAllRoles(includeInactive);

      await this.responseHelper.success(
        res,
        'success.role.retrievedList',
        {
          roles: roles.map((role) => ({
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            level: role.level,
            isSystem: role.isSystem,
            isActive: role.isActive,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          })),
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  getRoleById = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const includePermissions = req.query.includePermissions === 'true';

      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError('Role ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError('Invalid role ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate includePermissions parameter
      if (
        req.query.includePermissions &&
        !['true', 'false'].includes(req.query.includePermissions as string)
      ) {
        const error = new AppError(
          'includePermissions must be true or false',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const role = await this.roleService.getRoleById(id, includePermissions);

      await this.responseHelper.success(res, 'success.role.retrieved', { role }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  updateRole = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = createErrorContext(req, req.user.id);
      const data = req.body as UpdateRoleRequest;

      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError('Role ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError('Invalid role ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate data is not empty
      if (!data || Object.keys(data).length === 0) {
        const error = new AppError(
          'Update data is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate displayName if provided
      if (
        data.displayName &&
        (typeof data.displayName !== 'string' ||
          data.displayName.length < 2 ||
          data.displayName.length > 100)
      ) {
        const error = new AppError(
          'Display name must be between 2 and 100 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate level if provided
      if (data.level && (typeof data.level !== 'number' || data.level < 1 || data.level > 100)) {
        const error = new AppError(
          'Role level must be between 1 and 100',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate description if provided
      if (
        data.description &&
        (typeof data.description !== 'string' || data.description.length > 500)
      ) {
        const error = new AppError(
          'Description must be less than 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const role = await this.roleService.updateRole(id, data, req.user.id, context);

      logger.info('Role updated via API', {
        roleId: id,
        updatedBy: req.user.id,
        changes: Object.keys(data),
        ip: req.ip,
      });

      await this.responseHelper.success(res, 'success.role.updated', { role }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  deleteRole = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = createErrorContext(req, req.user.id);

      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError('Role ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError('Invalid role ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      await this.roleService.deleteRole(id, req.user.id, context);

      logger.info('Role deleted via API', {
        roleId: id,
        deletedBy: req.user.id,
        ip: req.ip,
      });

      await this.responseHelper.success(res, 'success.role.deleted', undefined, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  // Permission management endpoints
  createPermission = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req.body as CreatePermissionRequest;

      // Validate required fields
      if (!data.name || !data.resource) {
        const error = new AppError(
          'Permission name and resource are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate name format
      if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100) {
        const error = new AppError(
          'Permission name must be between 2 and 100 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate resource format
      if (
        typeof data.resource !== 'string' ||
        data.resource.length < 2 ||
        data.resource.length > 50
      ) {
        const error = new AppError(
          'Resource must be between 2 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate action if provided
      if (
        data.action &&
        (typeof data.action !== 'string' || data.action.length < 2 || data.action.length > 50)
      ) {
        const error = new AppError(
          'Action must be between 2 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate description if provided
      if (
        data.description &&
        (typeof data.description !== 'string' || data.description.length > 500)
      ) {
        const error = new AppError(
          'Description must be less than 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const permission = await this.roleService.createPermission(data);

      logger.info('Permission created via API', {
        permissionId: permission.id,
        permissionName: permission.name,
        createdBy: req.user.id,
        ip: req.ip,
      });

      await this.responseHelper.success(
        res,
        'success.role.permissionCreated',
        { permission },
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  getPermissions = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { resource } = req.query;

      const permissions = resource
        ? await this.roleService.getPermissionsByResource(resource as string)
        : await this.roleService.getAllPermissions();

      res.json({
        success: true,
        message: 'Permissions retrieved successfully',
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  };

  getPermissionById = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const permission = await this.roleService.getPermissionById(id);

      res.json({
        success: true,
        message: 'Permission retrieved successfully',
        data: { permission },
      });
    } catch (error) {
      next(error);
    }
  };

  updatePermission = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body as UpdatePermissionRequest;

      const permission = await this.roleService.updatePermission(id, data);

      logger.info('Permission updated via API', {
        permissionId: id,
        updatedBy: req.user.id,
        changes: Object.keys(data),
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Permission updated successfully',
        data: { permission },
      });
    } catch (error) {
      next(error);
    }
  };

  // Role-Permission management
  assignPermissionsToRole = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      const context = createErrorContext(req, req.user.id);

      // Validate roleId parameter
      if (!roleId || typeof roleId !== 'string') {
        const error = new AppError('Role ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      // Validate roleId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(roleId) || roleId.length < 1 || roleId.length > 50) {
        const error = new AppError('Invalid role ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate permissionIds
      if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
        const error = new AppError(
          'Permission IDs array is required and must not be empty',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each permission ID
      for (const permissionId of permissionIds) {
        if (
          typeof permissionId !== 'string' ||
          !idRegex.test(permissionId) ||
          permissionId.length < 1 ||
          permissionId.length > 50
        ) {
          const error = new AppError(
            'Invalid permission ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Validate array size limit
      if (permissionIds.length > 100) {
        const error = new AppError(
          'Cannot assign more than 100 permissions at once',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.roleService.assignPermissionsToRole(roleId, permissionIds, req.user.id, context);

      logger.info('Permissions assigned to role via API', {
        roleId,
        permissionCount: permissionIds.length,
        grantedBy: req.user.id,
        ip: req.ip,
      });

      await this.responseHelper.success(
        res,
        'success.role.permissionsAssigned',
        undefined,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  revokePermissionFromRole = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { roleId, permissionId } = req.params;
      const context = createErrorContext(req, req.user.id);

      await this.roleService.revokePermissionFromRole(roleId, permissionId, context);

      logger.info('Permission revoked from role via API', {
        roleId,
        permissionId,
        revokedBy: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Permission revoked from role successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getRolePermissions = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { roleId } = req.params;
      const permissions = await this.roleService.getRolePermissions(roleId);

      res.json({
        success: true,
        message: 'Role permissions retrieved successfully',
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  };

  // User-Role management
  assignRoleToUser = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const assignmentData = req.body as AssignRoleRequest;
      const context = createErrorContext(req, req.user.id);

      // Validate required fields
      if (!assignmentData.userId || !assignmentData.roleId) {
        const error = new AppError(
          'User ID and Role ID are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (
        typeof assignmentData.userId !== 'string' ||
        !idRegex.test(assignmentData.userId) ||
        assignmentData.userId.length < 1 ||
        assignmentData.userId.length > 50
      ) {
        const error = new AppError('Invalid user ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate roleId format
      if (
        typeof assignmentData.roleId !== 'string' ||
        !idRegex.test(assignmentData.roleId) ||
        assignmentData.roleId.length < 1 ||
        assignmentData.roleId.length > 50
      ) {
        const error = new AppError('Invalid role ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      await this.roleService.assignRoleToUser(assignmentData, req.user.id, context);

      logger.info('Role assigned to user via API', {
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        grantedBy: req.user.id,
        ip: req.ip,
      });

      await this.responseHelper.success(res, 'success.role.assignedToUser', undefined, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  revokeRoleFromUser = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, roleId } = req.params;
      const context = createErrorContext(req, req.user.id);

      await this.roleService.revokeRoleFromUser(userId, roleId, context);

      logger.info('Role revoked from user via API', {
        userId,
        roleId,
        revokedBy: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Role revoked from user successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getUserPermissions = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  };

  // My permissions endpoint - for current user
  getMyPermissions = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = await this.roleService.getUserPermissionSummary(req.user.id);

      res.json({
        success: true,
        message: 'Your permissions retrieved successfully',
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  };

  // Statistics endpoint
  getRoleStatistics = async (
    req: GuaranteedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const statistics = await this.roleService.getRoleStatistics();

      res.json({
        success: true,
        message: 'Role statistics retrieved successfully',
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  };
}
