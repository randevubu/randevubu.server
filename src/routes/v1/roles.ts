import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RoleController } from '../../controllers/roleController';
import { authenticateToken, requirePermission, requireRole, requireAny } from '../../middleware/authUtils';
import { validateBody } from '../../middleware/validation';
import { 
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  createPermissionSchema,
  updatePermissionSchema,
  assignPermissionsToRoleSchema
} from '../../schemas/role.schemas';
import { PermissionName, RoleName } from '../../types/auth';

export function createRoleRoutes(roleController: RoleController): Router {
  const router = Router();

  // Rate limiting for role management
  const roleManagementRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
      success: false,
      error: {
        message: 'Too many role management requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit admin operations
    message: {
      success: false,
      error: {
        message: 'Too many admin requests, please try again later.',
        retryAfter: '5 minutes',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply authentication to all routes
  router.use(authenticateToken);
  router.use(roleManagementRateLimit);

  // Role Management Routes
  router.post(
    '/',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(createRoleSchema),
    roleController.createRole.bind(roleController)
  );

  router.get(
    '/',
    requireRole(RoleName.ADMIN),
    roleController.getRoles.bind(roleController)
  );

  router.get(
    '/:id',
    requireRole(RoleName.ADMIN),
    roleController.getRoleById.bind(roleController)
  );

  router.patch(
    '/:id',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(updateRoleSchema),
    roleController.updateRole.bind(roleController)
  );

  router.delete(
    '/:id',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    roleController.deleteRole.bind(roleController)
  );

  // Permission Management Routes
  router.post(
    '/permissions',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(createPermissionSchema),
    roleController.createPermission.bind(roleController)
  );

  router.get(
    '/permissions',
    requireRole(RoleName.ADMIN),
    roleController.getPermissions.bind(roleController)
  );

  router.get(
    '/permissions/:id',
    requireRole(RoleName.ADMIN),
    roleController.getPermissionById.bind(roleController)
  );

  router.patch(
    '/permissions/:id',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(updatePermissionSchema),
    roleController.updatePermission.bind(roleController)
  );

  // Role-Permission Assignment Routes
  router.post(
    '/:roleId/permissions',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(assignPermissionsToRoleSchema),
    roleController.assignPermissionsToRole.bind(roleController)
  );

  router.get(
    '/:roleId/permissions',
    requireRole(RoleName.ADMIN),
    roleController.getRolePermissions.bind(roleController)
  );

  router.delete(
    '/:roleId/permissions/:permissionId',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    roleController.revokePermissionFromRole.bind(roleController)
  );

  // User-Role Assignment Routes
  router.post(
    '/assign',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(assignRoleSchema),
    roleController.assignRoleToUser.bind(roleController)
  );

  router.delete(
    '/revoke/:userId/:roleId',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    roleController.revokeRoleFromUser.bind(roleController)
  );

  router.get(
    '/users/:userId/permissions',
    requireAny([PermissionName.MANAGE_ROLES, PermissionName.VIEW_OWN_PROFILE]),
    roleController.getUserPermissions.bind(roleController)
  );

  router.get(
    '/my-permissions',
    roleController.getMyPermissions.bind(roleController)
  );

  // Statistics Routes
  router.get(
    '/statistics',
    requireRole(RoleName.ADMIN),
    roleController.getRoleStatistics.bind(roleController)
  );

  return router;
}

export default createRoleRoutes;