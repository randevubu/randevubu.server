import { Router } from 'express';
import { SecureNotificationController } from '../../controllers/secureNotificationController';
import { requireAuth } from '../../middleware/authUtils';
import { requirePermission } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import { dynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';

export function createSecureNotificationRoutes(controller: SecureNotificationController): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  /**
   * @swagger
   * components:
   *   schemas:
   *     SecureNotificationRequest:
   *       type: object
   *       required:
   *         - businessId
   *         - recipientIds
   *         - title
   *         - body
   *         - notificationType
   *         - channels
   *       properties:
   *         businessId:
   *           type: string
   *           description: ID of the business sending the notification
   *         recipientIds:
   *           type: array
   *           items:
   *             type: string
   *           description: Array of customer IDs to send notification to
   *         title:
   *           type: string
   *           maxLength: 100
   *           description: Notification title
   *         body:
   *           type: string
   *           maxLength: 500
   *           description: Notification body
   *         notificationType:
   *           type: string
   *           enum: [CLOSURE, HOLIDAY, PROMOTION, REMINDER, BROADCAST]
   *           description: Type of notification
   *         channels:
   *           type: array
   *           items:
   *             type: string
   *             enum: [PUSH, SMS, EMAIL]
   *           description: Notification channels to use
   *         data:
   *           type: object
   *           description: Additional data to include with notification
   *     
   *     BroadcastNotificationRequest:
   *       type: object
   *       required:
   *         - businessId
   *         - title
   *         - body
   *         - notificationType
   *         - channels
   *       properties:
   *         businessId:
   *           type: string
   *         title:
   *           type: string
   *           maxLength: 100
   *         body:
   *           type: string
   *           maxLength: 500
   *         notificationType:
   *           type: string
   *           enum: [HOLIDAY, PROMOTION, BROADCAST]
   *         channels:
   *           type: array
   *           items:
   *             type: string
   *             enum: [PUSH, SMS, EMAIL]
   *         data:
   *           type: object
   *         filters:
   *           type: object
   *           properties:
   *             relationshipType:
   *               type: string
   *               enum: [ACTIVE_CUSTOMER, PAST_CUSTOMER, ALL]
   *             minAppointments:
   *               type: integer
   *               minimum: 0
   *             lastAppointmentAfter:
   *               type: string
   *               format: date-time
   */

  /**
   * @swagger
   * /api/v1/secure-notifications/send:
   *   post:
   *     tags: [Secure Notifications]
   *     summary: Send secure notification to specific customers
   *     description: Send a notification to specific customers with full validation, rate limiting, and audit logging
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SecureNotificationRequest'
   *     responses:
   *       200:
   *         description: Notification sent successfully
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
   *                     sentCount:
   *                       type: integer
   *                     failedCount:
   *                       type: integer
   *                     totalRecipients:
   *                       type: integer
   *                     validRecipients:
   *                       type: integer
   *                     invalidRecipients:
   *                       type: integer
   *                     rateLimitInfo:
   *                       type: object
   *                     errors:
   *                       type: array
   *                       items:
   *                         type: object
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       429:
   *         description: Rate limit exceeded
   */
  router.post('/send', requireAuth, controller.sendSecureNotification);

  /**
   * @swagger
   * /api/v1/secure-notifications/broadcast:
   *   post:
   *     tags: [Secure Notifications]
   *     summary: Send broadcast notification to all business customers
   *     description: Send a notification to all customers of a business with filtering options
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BroadcastNotificationRequest'
   *     responses:
   *       200:
   *         description: Broadcast sent successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       429:
   *         description: Rate limit exceeded
   */
  router.post('/broadcast', requireAuth, controller.sendBroadcastNotification);

  /**
   * @swagger
   * /api/v1/secure-notifications/closure/{businessId}/{closureId}:
   *   post:
   *     tags: [Secure Notifications]
   *     summary: Send closure notification
   *     description: Send a notification about a business closure to affected customers
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *         description: Closure ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - message
   *               - channels
   *             properties:
   *               message:
   *                 type: string
   *                 maxLength: 500
   *                 description: Closure notification message
   *               channels:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [PUSH, SMS, EMAIL]
   *                 description: Notification channels
   *     responses:
   *       200:
   *         description: Closure notification sent successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Closure not found
   */
  router.post('/closure/:businessId/:closureId', requireAuth, controller.sendClosureNotification);

  /**
   * @swagger
   * /api/v1/secure-notifications/stats/{businessId}:
   *   get:
   *     tags: [Secure Notifications]
   *     summary: Get notification statistics
   *     description: Get comprehensive notification statistics for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for statistics
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for statistics
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
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
   *                     totalSent:
   *                       type: integer
   *                     successRate:
   *                       type: number
   *                     failureRate:
   *                       type: number
   *                     rateLimitStatus:
   *                       type: object
   *                     customerStats:
   *                       type: object
   *                     recentActivity:
   *                       type: array
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.get('/stats/:businessId', dynamicCache, requireAuth, controller.getNotificationStats);

  /**
   * @swagger
   * /api/v1/secure-notifications/alerts/{businessId}:
   *   get:
   *     tags: [Secure Notifications]
   *     summary: Get security alerts
   *     description: Get security alerts for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: query
   *         name: hours
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 168
   *           default: 24
   *         description: Number of hours to look back for alerts
   *     responses:
   *       200:
   *         description: Security alerts retrieved successfully
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
   *                     alerts:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           type:
   *                             type: string
   *                             enum: [RATE_LIMIT_ABUSE, PERMISSION_VIOLATION, SUSPICIOUS_ACTIVITY]
   *                           severity:
   *                             type: string
   *                             enum: [LOW, MEDIUM, HIGH, CRITICAL]
   *                           count:
   *                             type: integer
   *                           description:
   *                             type: string
   *                           firstOccurrence:
   *                             type: string
   *                             format: date-time
   *                           lastOccurrence:
   *                             type: string
   *                             format: date-time
   *                     period:
   *                       type: string
   *                     totalAlerts:
   *                       type: integer
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.get('/alerts/:businessId', dynamicCache, requireAuth, controller.getSecurityAlerts);

  /**
   * @swagger
   * /api/v1/secure-notifications/test:
   *   post:
   *     tags: [Secure Notifications]
   *     summary: Send test notification
   *     description: Send a test notification to yourself (for development/testing)
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
   *               - title
   *               - body
   *             properties:
   *               businessId:
   *                 type: string
   *                 description: Business ID
   *               title:
   *                 type: string
   *                 maxLength: 100
   *                 description: Test notification title
   *               body:
   *                 type: string
   *                 maxLength: 500
   *                 description: Test notification body
   *               channels:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [PUSH, SMS, EMAIL]
   *                 description: Notification channels (defaults to PUSH)
   *     responses:
   *       200:
   *         description: Test notification sent successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post('/test', requireAuth, controller.sendTestNotification);

  /**
   * @swagger
   * /api/v1/secure-notifications/health:
   *   get:
   *     tags: [Secure Notifications]
   *     summary: Get system health status
   *     description: Get comprehensive system health status including metrics and performance data
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: System health retrieved successfully
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
   *                     status:
   *                       type: string
   *                       enum: [HEALTHY, WARNING, CRITICAL]
   *                     metrics:
   *                       type: object
   *                       properties:
   *                         totalSent:
   *                           type: integer
   *                         totalFailed:
   *                           type: integer
   *                         successRate:
   *                           type: number
   *                         averageProcessingTime:
   *                           type: number
   *                         rateLimitHits:
   *                           type: integer
   *                         errorBreakdown:
   *                           type: object
   *                     performance:
   *                       type: object
   *                       properties:
   *                         averageProcessingTime:
   *                           type: number
   *                         averageRecipientCount:
   *                           type: number
   *                         averageBatchSize:
   *                           type: number
   *                         memoryUsage:
   *                           type: object
   *                     issues:
   *                       type: array
   *                       items:
   *                         type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get('/health', realTimeCache, requireAuth, controller.getSystemHealth);

  return router;
}
