import { Router } from 'express';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import { ControllerContainer } from '../../controllers';
import { AuthMiddleware, rateLimitByUser } from '../../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import { requireAuth, requirePermission, requireAny, withAuth } from '../../middleware/authUtils';
import { attachBusinessContext } from '../../middleware/attachBusinessContext';
import { PermissionName } from '../../types/auth';
import {
  inviteStaffSchema,
  verifyStaffInvitationSchema,
  updateStaffSchema,
  bulkInviteStaffSchema,
  transferStaffSchema,
  getBusinessStaffQuerySchema,
  getStaffByRoleQuerySchema,
  businessIdParamSchema,
  staffIdParamSchema,
  staffRoleAndBusinessParamSchema
} from '../../schemas/staff.schemas';
import prisma from '../../lib/prisma';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const controllers = new ControllerContainer(repositories, services);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);

export function createStaffRoutes(): Router {
  const router = Router();
  
  // All staff routes require authentication
  router.use(requireAuth);

  /**
   * @swagger
   * /api/v1/staff/invite:
   *   post:
   *     tags: [Staff Management]
   *     summary: Invite staff member to business
   *     description: Send SMS verification code to potential staff member's phone
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - businessId
   *               - phoneNumber
   *               - role
   *             properties:
   *               businessId:
   *                 type: string
   *                 description: Business ID where staff will be added
   *               phoneNumber:
   *                 type: string
   *                 description: Staff member's phone number (E.164 format)
   *                 example: "+905551234567"
   *               role:
   *                 type: string
   *                 enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *                 description: Staff role
   *               permissions:
   *                 type: object
   *                 description: Additional permissions (optional)
   *               firstName:
   *                 type: string
   *                 description: Staff member's first name (optional)
   *               lastName:
   *                 type: string
   *                 description: Staff member's last name (optional)
   *     responses:
   *       200:
   *         description: Invitation sent successfully
   *       400:
   *         description: Invalid input or staff limit exceeded
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post('/invite',
    rateLimitByUser(5, 60),
    validateBody(inviteStaffSchema),
    controllers.staffController.inviteStaff.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/verify-invitation:
   *   post:
   *     tags: [Staff Management]
   *     summary: Complete staff invitation with SMS verification
   *     description: Verify SMS code and add staff member to business
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - businessId
   *               - phoneNumber
   *               - verificationCode
   *               - role
   *             properties:
   *               businessId:
   *                 type: string
   *                 description: Business ID
   *               phoneNumber:
   *                 type: string
   *                 description: Staff member's phone number
   *               verificationCode:
   *                 type: string
   *                 description: 6-digit SMS verification code
   *               role:
   *                 type: string
   *                 enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *               permissions:
   *                 type: object
   *                 description: Additional permissions (optional)
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *     responses:
   *       201:
   *         description: Staff member added successfully
   *       400:
   *         description: Invalid verification code or input
   */
  router.post('/verify-invitation',
    rateLimitByUser(3, 60),
    validateBody(verifyStaffInvitationSchema),
    controllers.staffController.verifyStaffInvitation.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/{businessId}:
   *   get:
   *     tags: [Staff Management]
   *     summary: Get all staff for a business
   *     description: Retrieve staff members of a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *         description: Include inactive staff members
   *     responses:
   *       200:
   *         description: Staff list retrieved successfully
   *       404:
   *         description: Business not found
   */
  router.get('/:businessId',
    attachBusinessContext,
    validateParams(businessIdParamSchema),
    validateQuery(getBusinessStaffQuerySchema),
    controllers.staffController.getBusinessStaff.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/{businessId}/stats:
   *   get:
   *     tags: [Staff Management]
   *     summary: Get staff statistics for a business
   *     description: Get staff count, limits, and breakdown by role
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Staff statistics retrieved successfully
   */
  router.get('/:businessId/stats',
    attachBusinessContext,
    validateParams(businessIdParamSchema),
    controllers.staffController.getStaffStats.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/{businessId}/role/{role}:
   *   get:
   *     tags: [Staff Management]
   *     summary: Get staff members by role
   *     description: Get all staff members with a specific role in a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: role
   *         required: true
   *         schema:
   *           type: string
   *           enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Staff members retrieved successfully
   */
  router.get('/:businessId/role/:role',
    attachBusinessContext,
    validateParams(staffRoleAndBusinessParamSchema),
    validateQuery(getStaffByRoleQuerySchema),
    controllers.staffController.getStaffByRole.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/member/{staffId}:
   *   get:
   *     tags: [Staff Management]
   *     summary: Get staff member details
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Staff member details retrieved
   *       404:
   *         description: Staff member not found
   */
  router.get('/member/:staffId',
    validateParams(staffIdParamSchema),
    controllers.staffController.getStaffMember.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/member/{staffId}:
   *   put:
   *     tags: [Staff Management]
   *     summary: Update staff member
   *     description: Update staff member role, permissions, or status
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *               permissions:
   *                 type: object
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Staff member updated successfully
   *       404:
   *         description: Staff member not found
   */
  router.put('/member/:staffId',
    validateParams(staffIdParamSchema),
    validateBody(updateStaffSchema),
    controllers.staffController.updateStaffMember.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/member/{staffId}:
   *   delete:
   *     tags: [Staff Management]
   *     summary: Remove staff member
   *     description: Deactivate staff member from business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Staff member removed successfully
   *       404:
   *         description: Staff member not found
   */
  router.delete('/member/:staffId',
    validateParams(staffIdParamSchema),
    controllers.staffController.removeStaffMember.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/my-positions:
   *   get:
   *     tags: [Staff Management]
   *     summary: Get current user's staff positions
   *     description: Get all businesses where the current user is a staff member
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Staff positions retrieved successfully
   */
  router.get('/my-positions',
    controllers.staffController.getMyStaffPositions.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/bulk-invite:
   *   post:
   *     tags: [Staff Management]
   *     summary: Invite multiple staff members
   *     description: Send invitations to multiple staff members at once
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - businessId
   *               - invitations
   *             properties:
   *               businessId:
   *                 type: string
   *               invitations:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - phoneNumber
   *                     - role
   *                   properties:
   *                     phoneNumber:
   *                       type: string
   *                     role:
   *                       type: string
   *                       enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *                     permissions:
   *                       type: object
   *                     firstName:
   *                       type: string
   *                     lastName:
   *                       type: string
   *     responses:
   *       200:
   *         description: Bulk invitations processed
   */
  router.post('/bulk-invite',
    rateLimitByUser(2, 300), // 2 requests per 5 minutes for bulk operations
    validateBody(bulkInviteStaffSchema),
    controllers.staffController.bulkInviteStaff.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/transfer:
   *   post:
   *     tags: [Staff Management]
   *     summary: Transfer staff between businesses
   *     description: Move staff members from one business to another (admin function)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - staffIds
   *               - fromBusinessId
   *               - toBusinessId
   *             properties:
   *               staffIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               fromBusinessId:
   *                 type: string
   *               toBusinessId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Staff transferred successfully
   */
  router.post('/transfer',
    validateBody(transferStaffSchema),
    controllers.staffController.transferStaff.bind(controllers.staffController)
  );

  /**
   * @swagger
   * /api/v1/staff/roles:
   *   get:
   *     tags: [Staff Management]
   *     summary: Get available staff roles
   *     description: Get list of available staff roles with descriptions
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Available roles retrieved successfully
   */
  router.get('/roles',
    controllers.staffController.getAvailableRoles.bind(controllers.staffController)
  );

  return router;
}

export default createStaffRoutes;