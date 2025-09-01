import { Router } from 'express';
import { UsageController } from '../../controllers/usageController';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { attachBusinessContext, requireBusinessAccess } from '../../middleware/attachBusinessContext';

export function createUsageRoutes(usageController: UsageController): Router {
  const router = Router();

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/usage/summary:
   *   get:
   *     tags: [Usage]
   *     summary: Get business usage summary
   *     description: Returns current usage metrics, quotas, and limits for the business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: The business ID
   *     responses:
   *       200:
   *         description: Usage summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Usage summary retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     currentMonth:
   *                       type: object
   *                       properties:
   *                         month:
   *                           type: integer
   *                         year:
   *                           type: integer
   *                         smssSent:
   *                           type: integer
   *                         appointmentsCreated:
   *                           type: integer
   *                         staffMembersActive:
   *                           type: integer
   *                     planLimits:
   *                       type: object
   *                       properties:
   *                         smsQuota:
   *                           type: integer
   *                         maxStaffPerBusiness:
   *                           type: integer
   *                         maxAppointmentsPerDay:
   *                           type: integer
   *                     remainingQuotas:
   *                       type: object
   *                       properties:
   *                         smsRemaining:
   *                           type: integer
   *                         staffSlotsRemaining:
   *                           type: integer
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Business not found or no subscription
   */
  router.get(
    '/:businessId/usage/summary',
    requireAuth,
    attachBusinessContext,
    requireBusinessAccess,
    withAuth(usageController.getUsageSummary.bind(usageController))
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/usage/alerts:
   *   get:
   *     tags: [Usage]
   *     summary: Get usage alerts for the business
   *     description: Returns alerts for quotas that are near or at their limits
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: The business ID
   *     responses:
   *       200:
   *         description: Usage alerts retrieved successfully
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
   *                     smsQuotaAlert:
   *                       type: object
   *                       properties:
   *                         isNearLimit:
   *                           type: boolean
   *                         percentage:
   *                           type: number
   *                         remaining:
   *                           type: integer
   *                     staffLimitAlert:
   *                       type: object
   *                       properties:
   *                         isAtLimit:
   *                           type: boolean
   *                         current:
   *                           type: integer
   *                         limit:
   *                           type: integer
   */
  router.get(
    '/:businessId/usage/alerts',
    requireAuth,
    attachBusinessContext,
    requireBusinessAccess,
    withAuth(usageController.getUsageAlerts.bind(usageController))
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/usage/sms-daily:
   *   get:
   *     tags: [Usage]
   *     summary: Get daily SMS usage data
   *     description: Returns daily SMS usage for chart/analytics purposes
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: The business ID
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 365
   *           default: 30
   *         description: Number of days to retrieve (default 30, max 365)
   *     responses:
   *       200:
   *         description: Daily SMS usage retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       date:
   *                         type: string
   *                         format: date
   *                       smsCount:
   *                         type: integer
   */
  router.get(
    '/:businessId/usage/sms-daily',
    requireAuth,
    attachBusinessContext,
    requireBusinessAccess,
    withAuth(usageController.getDailySmsUsage.bind(usageController))
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/usage/monthly-history:
   *   get:
   *     tags: [Usage]
   *     summary: Get monthly usage history
   *     description: Returns monthly usage history for trends analysis
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: The business ID
   *       - in: query
   *         name: months
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 24
   *           default: 12
   *         description: Number of months to retrieve (default 12, max 24)
   *     responses:
   *       200:
   *         description: Monthly usage history retrieved successfully
   */
  router.get(
    '/:businessId/usage/monthly-history',
    requireAuth,
    attachBusinessContext,
    requireBusinessAccess,
    withAuth(usageController.getMonthlyUsageHistory.bind(usageController))
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/usage/limits-check:
   *   get:
   *     tags: [Usage]
   *     summary: Check usage limits for various actions
   *     description: Returns whether the business can perform specific actions based on their current usage and plan limits
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: The business ID
   *     responses:
   *       200:
   *         description: Usage limits check completed successfully
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
   *                     sms:
   *                       type: object
   *                       properties:
   *                         allowed:
   *                           type: boolean
   *                         reason:
   *                           type: string
   *                           nullable: true
   *                     staff:
   *                       type: object
   *                       properties:
   *                         allowed:
   *                           type: boolean
   *                         reason:
   *                           type: string
   *                           nullable: true
   *                     service:
   *                       type: object
   *                       properties:
   *                         allowed:
   *                           type: boolean
   *                         reason:
   *                           type: string
   *                           nullable: true
   *                     customer:
   *                       type: object
   *                       properties:
   *                         allowed:
   *                           type: boolean
   *                         reason:
   *                           type: string
   *                           nullable: true
   */
  router.get(
    '/:businessId/usage/limits-check',
    requireAuth,
    attachBusinessContext,
    requireBusinessAccess,
    withAuth(usageController.checkLimits.bind(usageController))
  );

  return router;
}