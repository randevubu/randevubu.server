import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RoleController } from '../../controllers/roleController';
import { requireAuth, requirePermission, requireRole, requireAny, withAuth } from '../../middleware/authUtils';
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
  router.use(requireAuth);
  router.use(roleManagementRateLimit);

  // Role Management Routes
  /**
   * @swagger
   * /api/v1/roles:
   *   post:
   *     tags: [Role Management]
   *     summary: Create a new role
   *     description: Create a new role in the system (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Role created successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   */
  router.post(
    '/',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(createRoleSchema),
    withAuth(roleController.createRole.bind(roleController))
  );

  router.get(
    '/',
    requireRole(RoleName.ADMIN),
    withAuth(roleController.getRoles.bind(roleController))
  );

  router.get(
    '/:id',
    requireRole(RoleName.ADMIN),
    withAuth(roleController.getRoleById.bind(roleController))
  );

  router.patch(
    '/:id',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(updateRoleSchema),
    withAuth(roleController.updateRole.bind(roleController))
  );

  router.delete(
    '/:id',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    withAuth(roleController.deleteRole.bind(roleController))
  );

  // Permission Management Routes
  router.post(
    '/permissions',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(createPermissionSchema),
    withAuth(roleController.createPermission.bind(roleController))
  );

  router.get(
    '/permissions',
    requireRole(RoleName.ADMIN),
    withAuth(roleController.getPermissions.bind(roleController))
  );

  router.get(
    '/permissions/:id',
    requireRole(RoleName.ADMIN),
    withAuth(roleController.getPermissionById.bind(roleController))
  );

  router.patch(
    '/permissions/:id',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(updatePermissionSchema),
    withAuth(roleController.updatePermission.bind(roleController))
  );

  // Role-Permission Assignment Routes
  router.post(
    '/:roleId/permissions',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(assignPermissionsToRoleSchema),
    withAuth(roleController.assignPermissionsToRole.bind(roleController))
  );

  router.get(
    '/:roleId/permissions',
    requireRole(RoleName.ADMIN),
    withAuth(roleController.getRolePermissions.bind(roleController))
  );

  router.delete(
    '/:roleId/permissions/:permissionId',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    withAuth(roleController.revokePermissionFromRole.bind(roleController))
  );

  // User-Role Assignment Routes
  router.post(
    '/assign',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    validateBody(assignRoleSchema),
    withAuth(roleController.assignRoleToUser.bind(roleController))
  );

  router.delete(
    '/revoke/:userId/:roleId',
    adminRateLimit,
    requireRole(RoleName.ADMIN),
    withAuth(roleController.revokeRoleFromUser.bind(roleController))
  );

  router.get(
    '/users/:userId/permissions',
    requireAny([PermissionName.MANAGE_ROLES, PermissionName.VIEW_OWN_PROFILE]),
    withAuth(roleController.getUserPermissions.bind(roleController))
  );

  /**
   * @swagger
   * /api/v1/roles/my-permissions:
   *   get:
   *     tags: [Role Management] 
   *     summary: Get my permissions
   *     description: Get permissions for the currently authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User permissions retrieved
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my-permissions',
    withAuth(roleController.getMyPermissions.bind(roleController))
  );

  // Statistics Routes
  router.get(
    '/statistics',
    requireRole(RoleName.ADMIN),
    withAuth(roleController.getRoleStatistics.bind(roleController))
  );

  return router;
}

export default createRoleRoutes;