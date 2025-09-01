import { Router } from 'express';
import { UserBehaviorController } from '../../controllers/userBehaviorController';
import { requireAuth, requirePermission, requireAny, withAuth } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';

export function createUserBehaviorRoutes(userBehaviorController: UserBehaviorController): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  // User's own behavior (minimal permissions required)
  /**
   * @swagger
   * /api/v1/user-behavior/my/behavior:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get my behavior
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Behavior data
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my/behavior',
    withAuth(userBehaviorController.getMyBehavior.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/my/status:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get my status
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status data
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my/status',
    withAuth(userBehaviorController.checkUserStatus.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/my/summary:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get my behavior summary
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Summary data
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my/summary',
    withAuth(userBehaviorController.getUserSummary.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/my/risk-assessment:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get my risk assessment
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Risk assessment
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my/risk-assessment',
    withAuth(userBehaviorController.getUserRiskAssessment.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/my/reliability-score:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get my reliability score
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reliability score
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my/reliability-score',
    withAuth(userBehaviorController.calculateReliabilityScore.bind(userBehaviorController))
  );

  // User behavior management (requires permissions)
  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/behavior:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get user behavior by user ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Behavior data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:userId/behavior',
    requirePermission(PermissionName.VIEW_USER_BEHAVIOR),
    withAuth(userBehaviorController.getUserBehavior.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/summary:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get user summary by user ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Summary data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:userId/summary',
    requirePermission(PermissionName.VIEW_USER_BEHAVIOR),
    withAuth(userBehaviorController.getUserSummary.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/status:
   *   get:
   *     tags: [User Behavior]
   *     summary: Check user status by user ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Status data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:userId/status',
    requireAny([PermissionName.VIEW_USER_BEHAVIOR, PermissionName.VIEW_OWN_CUSTOMERS]),
    withAuth(userBehaviorController.checkUserStatus.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/risk-assessment:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get risk assessment by user ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Risk assessment data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:userId/risk-assessment',
    requirePermission(PermissionName.VIEW_USER_BEHAVIOR),
    withAuth(userBehaviorController.getUserRiskAssessment.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/reliability-score:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get reliability score by user ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Score data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:userId/reliability-score',
    requirePermission(PermissionName.VIEW_USER_BEHAVIOR),
    withAuth(userBehaviorController.calculateReliabilityScore.bind(userBehaviorController))
  );

  // Strike management
  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/strikes:
   *   post:
   *     tags: [User Behavior]
   *     summary: Add a strike to a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Strike added
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:userId/strikes',
    requireAny([PermissionName.MANAGE_USER_BEHAVIOR, PermissionName.MANAGE_STRIKES]),
    withAuth(userBehaviorController.addStrike.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/strikes:
   *   delete:
   *     tags: [User Behavior]
   *     summary: Remove a strike from a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Strike removed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.delete(
    '/:userId/strikes',
    requirePermission(PermissionName.MANAGE_STRIKES),
    withAuth(userBehaviorController.removeStrike.bind(userBehaviorController))
  );

  // Ban management
  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/ban:
   *   post:
   *     tags: [User Behavior]
   *     summary: Ban a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User banned
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:userId/ban',
    requirePermission(PermissionName.BAN_USERS),
    withAuth(userBehaviorController.banUser.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/ban:
   *   delete:
   *     tags: [User Behavior]
   *     summary: Unban a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User unbanned
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.delete(
    '/:userId/ban',
    requirePermission(PermissionName.BAN_USERS),
    withAuth(userBehaviorController.unbanUser.bind(userBehaviorController))
  );

  // User flagging
  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/flag:
   *   post:
   *     tags: [User Behavior]
   *     summary: Flag a user for review
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User flagged
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:userId/flag',
    requireAny([PermissionName.MANAGE_USER_BEHAVIOR, PermissionName.FLAG_USERS]),
    withAuth(userBehaviorController.flagUserForReview.bind(userBehaviorController))
  );

  // Business-specific customer behavior
  /**
   * @swagger
   * /api/v1/user-behavior/business/{businessId}/customer/{customerId}:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get customer behavior within a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Behavior data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/customer/:customerId',
    requireAny([PermissionName.VIEW_USER_BEHAVIOR, PermissionName.VIEW_OWN_CUSTOMERS]),
    withAuth(userBehaviorController.getCustomerBehaviorForBusiness.bind(userBehaviorController))
  );

  // Admin and reporting routes
  /**
   * @swagger
   * /api/v1/user-behavior/admin/problematic:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get problematic users (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Users list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/problematic',
    requirePermission(PermissionName.VIEW_USER_BEHAVIOR),
    withAuth(userBehaviorController.getProblematicUsers.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/admin/stats:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get user behavior statistics (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Stats data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/stats',
    requirePermission(PermissionName.VIEW_USER_BEHAVIOR),
    withAuth(userBehaviorController.getUserBehaviorStats.bind(userBehaviorController))
  );

  // System maintenance routes
  /**
   * @swagger
   * /api/v1/user-behavior/admin/process-automatic-strikes:
   *   post:
   *     tags: [User Behavior]
   *     summary: Process automatic strikes (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Process completed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/process-automatic-strikes',
    requirePermission(PermissionName.MANAGE_USER_BEHAVIOR),
    withAuth(userBehaviorController.processAutomaticStrikes.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/admin/reset-expired-strikes:
   *   post:
   *     tags: [User Behavior]
   *     summary: Reset expired strikes (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reset completed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/reset-expired-strikes',
    requirePermission(PermissionName.MANAGE_STRIKES),
    withAuth(userBehaviorController.resetExpiredStrikes.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/admin/unban-expired:
   *   post:
   *     tags: [User Behavior]
   *     summary: Unban users with expired bans (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Unbanned users
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/unban-expired',
    requirePermission(PermissionName.BAN_USERS),
    withAuth(userBehaviorController.unbanExpiredBans.bind(userBehaviorController))
  );

  // Batch operations
  /**
   * @swagger
   * /api/v1/user-behavior/admin/batch-strikes:
   *   post:
   *     tags: [User Behavior]
   *     summary: Batch add strikes (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Strikes added
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/batch-strikes',
    requirePermission(PermissionName.MANAGE_STRIKES),
    withAuth(userBehaviorController.batchAddStrikes.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/user-behavior/admin/batch-ban:
   *   post:
   *     tags: [User Behavior]
   *     summary: Batch ban users (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Users banned
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/batch-ban',
    requirePermission(PermissionName.BAN_USERS),
    withAuth(userBehaviorController.batchBanUsers.bind(userBehaviorController))
  );

  return router;
}