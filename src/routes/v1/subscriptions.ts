import { Router } from 'express';
import { SubscriptionController } from '../../controllers/subscriptionController';
import { requireAuth, requirePermission, requireAny, withAuth } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import { staticCache, dynamicCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';

export function createSubscriptionRoutes(subscriptionController: SubscriptionController): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  // Public routes - subscription plans
  /**
   * @swagger
   * /api/v1/subscriptions/plans:
   *   get:
   *     tags: [Subscriptions]
   *     summary: List all subscription plans
   *     parameters:
   *       - in: query
   *         name: city
   *         schema:
   *           type: string
   *         description: City name for location-based pricing
   *         example: Istanbul
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *         description: State name for location-based pricing
   *         example: Istanbul
   *       - in: query
   *         name: country
   *         schema:
   *           type: string
   *           default: Turkey
   *         description: Country name for location-based pricing
   *         example: Turkey
   *     responses:
   *       200:
   *         description: Plans list with location-based pricing
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     plans:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/SubscriptionPlan'
   *                     location:
   *                       type: object
   *                       properties:
   *                         city:
   *                           type: string
   *                         state:
   *                           type: string
   *                         country:
   *                           type: string
   *                 message:
   *                   type: string
   */
  router.get('/plans', staticCache, subscriptionController.getAllPlans.bind(subscriptionController));
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
  router.get('/plans/:id', staticCache, subscriptionController.getPlanById.bind(subscriptionController));
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
  router.get('/plans/billing/:interval', staticCache, subscriptionController.getPlansByBillingInterval.bind(subscriptionController));

  // Protected routes
  router.use(requireAuth);

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
    withAuth(subscriptionController.subscribeBusiness.bind(subscriptionController))
  );

  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/apply-discount:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Apply discount code to existing subscription
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - discountCode
   *             properties:
   *               discountCode:
   *                 type: string
   *                 description: Discount code to apply
   *                 example: "WELCOME20"
   *     responses:
   *       200:
   *         description: Discount code applied successfully
   *       400:
   *         description: Invalid discount code or business ID
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Subscription not found
   */
  router.post(
    '/business/:businessId/apply-discount',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.MANAGE_OWN_SUBSCRIPTION]),
    withAuth(subscriptionController.applyDiscountCode.bind(subscriptionController))
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
    dynamicCache,
    requireAny([PermissionName.VIEW_ALL_SUBSCRIPTIONS, PermissionName.VIEW_OWN_SUBSCRIPTION]),
    withAuth(subscriptionController.getBusinessSubscription.bind(subscriptionController))
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
    dynamicCache,
    requireAny([PermissionName.VIEW_ALL_SUBSCRIPTIONS, PermissionName.VIEW_OWN_SUBSCRIPTION]),
    withAuth(subscriptionController.getSubscriptionHistory.bind(subscriptionController))
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
    withAuth(subscriptionController.checkSubscriptionLimits.bind(subscriptionController))
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
    withAuth(subscriptionController.upgradePlan.bind(subscriptionController))
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
    withAuth(subscriptionController.downgradePlan.bind(subscriptionController))
  );

  // Subscription lifecycle
  /**
   * @swagger
   * /api/v1/subscriptions/business/{businessId}/cancel:
   *   post:
   *     tags: [Subscriptions]
   *     summary: Cancel business subscription
   *     description: Cancel a business subscription either immediately or at the end of the current billing period
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the business to cancel subscription for
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               cancelAtPeriodEnd:
   *                 type: boolean
   *                 default: true
   *                 description: If true, cancellation takes effect at the end of current billing period. If false, cancels immediately.
   *             example:
   *               cancelAtPeriodEnd: true
   *     responses:
   *       200:
   *         description: Subscription canceled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Subscription ID
   *                     businessId:
   *                       type: string
   *                       description: Business ID
   *                     planId:
   *                       type: string
   *                       description: Plan ID
   *                     status:
   *                       type: string
   *                       enum: [active, cancelled, expired, trial]
   *                       description: Updated subscription status
   *                     currentPeriodEnd:
   *                       type: string
   *                       format: date-time
   *                       description: End date of current billing period
   *                     cancelAtPeriodEnd:
   *                       type: boolean
   *                       description: Whether cancellation is scheduled for period end
   *                     cancelledAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                       description: When the subscription was cancelled
   *                 message:
   *                   type: string
   *                   example: "Subscription will be cancelled at period end"
   *       400:
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Failed to cancel subscription"
   *       401:
   *         description: Unauthorized - Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Unauthorized"
   *       403:
   *         description: Forbidden - Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "Access denied"
   *       404:
   *         description: Subscription not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: "No active subscription found"
   */
  router.post(
    '/business/:businessId/cancel',
    requireAny([PermissionName.MANAGE_ALL_SUBSCRIPTIONS, PermissionName.CANCEL_OWN_SUBSCRIPTION]),
    withAuth(subscriptionController.cancelSubscription.bind(subscriptionController))
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
    withAuth(subscriptionController.reactivateSubscription.bind(subscriptionController))
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
    withAuth(subscriptionController.convertTrialToActive.bind(subscriptionController))
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
    withAuth(subscriptionController.calculateUpgradeProration.bind(subscriptionController))
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
    withAuth(subscriptionController.validatePlanLimits.bind(subscriptionController))
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
    withAuth(subscriptionController.getAllSubscriptions.bind(subscriptionController))
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
    withAuth(subscriptionController.getSubscriptionStats.bind(subscriptionController))
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
    withAuth(subscriptionController.getTrialsEndingSoon.bind(subscriptionController))
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
    withAuth(subscriptionController.getExpiredSubscriptions.bind(subscriptionController))
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
    withAuth(subscriptionController.getSubscriptionsByStatus.bind(subscriptionController))
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
    withAuth(subscriptionController.getSubscriptionsByPlan.bind(subscriptionController))
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
    withAuth(subscriptionController.getBusinessesWithoutSubscription.bind(subscriptionController))
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
    withAuth(subscriptionController.getRevenueAnalytics.bind(subscriptionController))
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
    withAuth(subscriptionController.forceUpdateSubscriptionStatus.bind(subscriptionController))
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
    withAuth(subscriptionController.processExpiredSubscriptions.bind(subscriptionController))
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
    withAuth(subscriptionController.processSubscriptionRenewals.bind(subscriptionController))
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
    withAuth(subscriptionController.sendTrialEndingNotifications.bind(subscriptionController))
  );

  return router;
}