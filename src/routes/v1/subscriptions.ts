import { Router } from 'express';
import { SubscriptionController } from '../../controllers/subscriptionController';
import { authenticateToken, requirePermission, requireAny } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';

export function createSubscriptionRoutes(subscriptionController: SubscriptionController): Router {
  const router = Router();

  // Public routes - subscription plans
  /**
   * @swagger
   * /api/v1/subscriptions/plans:
   *   get:
   *     tags: [Subscriptions]
   *     summary: List all subscription plans
   *     responses:
   *       200:
   *         description: Plans list
   */
  router.get('/plans', subscriptionController.getAllPlans.bind(subscriptionController));
  /**
   * @swagger
   * /api/v1/subscriptions/plans/{id}:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get subscription plan by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Plan details
   *       404:
   *         description: Not found
   */
  router.get('/plans/:id', subscriptionController.getPlanById.bind(subscriptionController));
  /**
   * @swagger
   * /api/v1/subscriptions/plans/billing/{interval}:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get plans by billing interval
   *     parameters:
   *       - in: path
   *         name: interval
   *         required: true
   *         schema:
   *           type: string
   *           enum: [monthly, yearly]
   *     responses:
   *       200:
   *         description: Plans list
   */
  router.get('/plans/billing/:interval', subscriptionController.getPlansByBillingInterval.bind(subscriptionController));

  // Protected routes
  router.use(authenticateToken);

  // Business subscription management
  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/subscribe:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Subscribe a business to a plan
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
   *         description: Subscribed successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/subscribe',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    subscriptionController.subscribeBusiness.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get a business subscription
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
   *         description: Subscription details
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId',
    requireAny([PermissionName.VIEW_ALL_SUBSCRIPTIONS, PermissionName.VIEW_OWN_SUBSCRIPTION]),
    subscriptionController.getBusinessSubscription.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/history:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get subscription history for a business
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
   *         description: History list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/history',
    requireAny([PermissionName.VIEW_ALL_SUBSCRIPTIONS, PermissionName.VIEW_OWN_SUBSCRIPTION]),
    subscriptionController.getSubscriptionHistory.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/limits:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Check subscription limits for a business
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
   *         description: Limits info
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/limits',
    requireAny([PermissionName.VIEW_ALL_SUBSCRIPTIONS, PermissionName.VIEW_OWN_SUBSCRIPTION]),
    subscriptionController.checkSubscriptionLimits.bind(subscriptionController)
  );

  // Plan changes
  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/upgrade:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Upgrade business plan
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
   *         description: Plan upgraded
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/upgrade',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    subscriptionController.upgradePlan.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/downgrade:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Downgrade business plan
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
   *         description: Plan downgraded
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/downgrade',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    subscriptionController.downgradePlan.bind(subscriptionController)
  );

  // Subscription lifecycle
  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/cancel:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Cancel business subscription
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
   *         description: Subscription canceled
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/cancel',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    subscriptionController.cancelSubscription.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/reactivate:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Reactivate a canceled subscription
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
   *         description: Subscription reactivated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/reactivate',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    subscriptionController.reactivateSubscription.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/convert-trial:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Convert trial subscription to active
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
   *         description: Trial converted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/convert-trial',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    subscriptionController.convertTrialToActive.bind(subscriptionController)
  );

  // Utility endpoints
  /**
   * @swagger
   * /api/v1/subscriptions/calculate-proration:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Calculate proration for upgrade
   *     responses:
   *       200:
   *         description: Proration details
   */
  router.get(
    '/calculate-proration',
    subscriptionController.calculateUpgradeProration.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/validate-plan/{planId}:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Validate if a plan is suitable for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: planId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Validation result
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/validate-plan/:planId',
    requireAny([PermissionName.VIEW_ALL_SUBSCRIPTIONS, PermissionName.VIEW_OWN_SUBSCRIPTION]),
    subscriptionController.validatePlanLimits.bind(subscriptionController)
  );

  // Admin routes
  /**
   * @swagger
   * /api/v1/subscriptions/admin/all:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get all subscriptions (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Subscriptions list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/all',
    requirePermission(PermissionName.VIEW_ALL_SUBSCRIPTIONS),
    subscriptionController.getAllSubscriptions.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/stats:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get subscription statistics (admin)
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
    requirePermission(PermissionName.VIEW_ALL_ANALYTICS),
    subscriptionController.getSubscriptionStats.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/trials-ending:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get trials ending soon (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Trials list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/trials-ending',
    requirePermission(PermissionName.VIEW_ALL_SUBSCRIPTIONS),
    subscriptionController.getTrialsEndingSoon.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/expired:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get expired subscriptions (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Expired subscriptions
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/expired',
    requirePermission(PermissionName.VIEW_ALL_SUBSCRIPTIONS),
    subscriptionController.getExpiredSubscriptions.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/status/{status}:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get subscriptions by status (admin)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: status
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Subscriptions list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/status/:status',
    requirePermission(PermissionName.VIEW_ALL_SUBSCRIPTIONS),
    subscriptionController.getSubscriptionsByStatus.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/plan/{planId}:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get subscriptions by plan (admin)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: planId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Subscriptions list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/plan/:planId',
    requirePermission(PermissionName.VIEW_ALL_SUBSCRIPTIONS),
    subscriptionController.getSubscriptionsByPlan.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/businesses-without-subscription:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get businesses without subscription (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Businesses list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/businesses-without-subscription',
    requirePermission(PermissionName.VIEW_ALL_SUBSCRIPTIONS),
    subscriptionController.getBusinessesWithoutSubscription.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/revenue-analytics:
   *   get:
   *     tags: [Subscriptions]
   *     summary: Get revenue analytics (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Analytics data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/revenue-analytics',
    requirePermission(PermissionName.VIEW_ALL_ANALYTICS),
    subscriptionController.getRevenueAnalytics.bind(subscriptionController)
  );

  // Admin subscription management
  /**
   * @swagger
   * /api/v1/subscriptions/admin/{subscriptionId}/status:
   *   put:
   *     tags: [Subscriptions]
   *     summary: Force update subscription status (admin)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: subscriptionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Status updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.put(
    '/admin/:subscriptionId/status',
    requirePermission(PermissionName.MANAGE_ALL_SUBSCRIPTIONS),
    subscriptionController.forceUpdateSubscriptionStatus.bind(subscriptionController)
  );

  // System maintenance endpoints
  /**
   * @swagger
   * /api/v1/subscriptions/admin/process-expired:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Process expired subscriptions (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Processing completed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/process-expired',
    requirePermission(PermissionName.MANAGE_ALL_SUBSCRIPTIONS),
    subscriptionController.processExpiredSubscriptions.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/process-renewals:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Process subscription renewals (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Processing completed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/process-renewals',
    requirePermission(PermissionName.MANAGE_ALL_SUBSCRIPTIONS),
    subscriptionController.processSubscriptionRenewals.bind(subscriptionController)
  );

  /**
   * @swagger
   * /api/v1/subscriptions/admin/send-trial-notifications:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Send trial ending notifications (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Notifications sent
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/send-trial-notifications',
    requirePermission(PermissionName.MANAGE_ALL_SUBSCRIPTIONS),
    subscriptionController.sendTrialEndingNotifications.bind(subscriptionController)
  );

  return router;
}