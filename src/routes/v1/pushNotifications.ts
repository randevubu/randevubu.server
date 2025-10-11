import { Router } from 'express';
import { PushNotificationController } from '../../controllers/pushNotificationController';
import { requireAuth } from '../../middleware/authUtils';
import { requirePermission } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import { staticCache, dynamicCache, realTimeCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';

export function createPushNotificationRoutes(controller: PushNotificationController): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  /**
   * @swagger
   * components:
   *   schemas:
   *     PushSubscription:
   *       type: object
   *       required:
   *         - endpoint
   *         - keys
   *       properties:
   *         endpoint:
   *           type: string
   *           format: uri
   *           description: Push service endpoint URL
   *         keys:
   *           type: object
   *           required:
   *             - p256dh
   *             - auth
   *           properties:
   *             p256dh:
   *               type: string
   *               description: P256DH public key
   *             auth:
   *               type: string
   *               description: Authentication secret
   *         deviceName:
   *           type: string
   *           description: Optional device name
   *         deviceType:
   *           type: string
   *           description: Device type (web, mobile, etc.)
   *         userAgent:
   *           type: string
   *           description: User agent string
   */

  /**
   * @swagger
   * /api/v1/notifications/push/vapid-key:
   *   get:
   *     tags: [Push Notifications]
   *     summary: Get VAPID public key
   *     description: Get the VAPID public key needed for push notification subscriptions
   *     responses:
   *       200:
   *         description: VAPID public key retrieved successfully
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
   *                     publicKey:
   *                       type: string
   *       503:
   *         description: Push notifications not configured
   */
  router.get('/vapid-key', staticCache, controller.getVapidPublicKey);

  /**
   * @swagger
   * /api/v1/notifications/push/health:
   *   get:
   *     tags: [Push Notifications]
   *     summary: Push notification service health check
   *     description: Check if push notification service is configured and working
   *     responses:
   *       200:
   *         description: Health check successful
   */
  router.get('/health', realTimeCache, controller.healthCheck);

  /**
   * @swagger
   * /api/v1/notifications/push/subscribe:
   *   post:
   *     tags: [Push Notifications]
   *     summary: Subscribe to push notifications
   *     description: Register a push subscription for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PushSubscription'
   *     responses:
   *       201:
   *         description: Successfully subscribed to push notifications
   *       400:
   *         description: Invalid subscription data
   *       401:
   *         description: Unauthorized
   */
  router.post('/subscribe', requireAuth, controller.subscribe);

  /**
   * @swagger
   * /api/v1/notifications/push/unsubscribe:
   *   post:
   *     tags: [Push Notifications]
   *     summary: Unsubscribe from push notifications
   *     description: Remove a push subscription for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               endpoint:
   *                 type: string
   *                 format: uri
   *                 description: Subscription endpoint to remove
   *               subscriptionId:
   *                 type: string
   *                 description: Subscription ID to remove
   *             oneOf:
   *               - required: [endpoint]
   *               - required: [subscriptionId]
   *     responses:
   *       200:
   *         description: Successfully unsubscribed
   *       404:
   *         description: Subscription not found
   *       401:
   *         description: Unauthorized
   */
  router.post('/unsubscribe', requireAuth, controller.unsubscribe);

  /**
   * @swagger
   * /api/v1/notifications/push/subscriptions:
   *   get:
   *     tags: [Push Notifications]
   *     summary: Get user's push subscriptions
   *     description: Get all push subscriptions for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: activeOnly
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Return only active subscriptions
   *     responses:
   *       200:
   *         description: Push subscriptions retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/subscriptions', dynamicCache, requireAuth, controller.getSubscriptions);

  /**
   * @swagger
   * /api/v1/notifications/push/preferences:
   *   get:
   *     tags: [Push Notifications]
   *     summary: Get notification preferences
   *     description: Get notification preferences for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Notification preferences retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/preferences', dynamicCache, requireAuth, controller.getPreferences);

  /**
   * @swagger
   * /api/v1/notifications/push/preferences:
   *   put:
   *     tags: [Push Notifications]
   *     summary: Update notification preferences
   *     description: Update notification preferences for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               enableAppointmentReminders:
   *                 type: boolean
   *               enableBusinessNotifications:
   *                 type: boolean
   *               enablePromotionalMessages:
   *                 type: boolean
   *               reminderTiming:
   *                 type: object
   *                 properties:
   *                   hours:
   *                     type: array
   *                     items:
   *                       type: number
   *                       minimum: 1
   *                       maximum: 168
   *               preferredChannels:
   *                 type: object
   *                 properties:
   *                   channels:
   *                     type: array
   *                     items:
   *                       type: string
   *                       enum: [EMAIL, SMS, PUSH]
   *               quietHours:
   *                 type: object
   *                 properties:
   *                   start:
   *                     type: string
   *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *                   end:
   *                     type: string
   *                     pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *                   timezone:
   *                     type: string
   *               timezone:
   *                 type: string
   *     responses:
   *       200:
   *         description: Preferences updated successfully
   *       400:
   *         description: Invalid preference data
   *       401:
   *         description: Unauthorized
   */
  router.put('/preferences', requireAuth, controller.updatePreferences);

  /**
   * @swagger
   * /api/v1/notifications/push/test:
   *   post:
   *     tags: [Push Notifications]
   *     summary: Send test push notification
   *     description: Send a test push notification to the authenticated user
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - body
   *             properties:
   *               title:
   *                 type: string
   *                 maxLength: 100
   *               body:
   *                 type: string
   *                 maxLength: 500
   *               icon:
   *                 type: string
   *                 format: uri
   *               badge:
   *                 type: string
   *                 format: uri
   *               data:
   *                 type: object
   *               url:
   *                 type: string
   *                 format: uri
   *     responses:
   *       200:
   *         description: Test notification sent successfully
   *       400:
   *         description: Invalid notification data
   *       401:
   *         description: Unauthorized
   */
  router.post('/test', requireAuth, controller.sendTestNotification);

  /**
   * @swagger
   * /api/v1/notifications/push/history:
   *   get:
   *     tags: [Push Notifications]
   *     summary: Get notification history
   *     description: Get push notification history for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, SENT, FAILED, DELIVERED, READ]
   *       - in: query
   *         name: appointmentId
   *         schema:
   *           type: string
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Notification history retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/history', dynamicCache, requireAuth, controller.getNotificationHistory);

  // Admin-only routes
  /**
   * @swagger
   * /api/v1/notifications/push/send:
   *   post:
   *     tags: [Push Notifications - Admin]
   *     summary: Send push notification to specific user (Admin)
   *     description: Send a push notification to a specific user (admin only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - title
   *               - body
   *             properties:
   *               userId:
   *                 type: string
   *               title:
   *                 type: string
   *                 maxLength: 100
   *               body:
   *                 type: string
   *                 maxLength: 500
   *               icon:
   *                 type: string
   *                 format: uri
   *               badge:
   *                 type: string
   *                 format: uri
   *               data:
   *                 type: object
   *               url:
   *                 type: string
   *                 format: uri
   *               appointmentId:
   *                 type: string
   *               businessId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Notification sent successfully
   *       400:
   *         description: Invalid notification data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    '/send',
    requireAuth,
    requirePermission(PermissionName.SEND_NOTIFICATIONS),
    controller.sendNotification
  );

  /**
   * @swagger
   * /api/v1/notifications/push/send-batch:
   *   post:
   *     tags: [Push Notifications - Admin]
   *     summary: Send batch push notifications (Admin)
   *     description: Send push notifications to multiple users (admin only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userIds
   *               - title
   *               - body
   *             properties:
   *               userIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               title:
   *                 type: string
   *                 maxLength: 100
   *               body:
   *                 type: string
   *                 maxLength: 500
   *               icon:
   *                 type: string
   *                 format: uri
   *               badge:
   *                 type: string
   *                 format: uri
   *               data:
   *                 type: object
   *               url:
   *                 type: string
   *                 format: uri
   *     responses:
   *       200:
   *         description: Batch notifications sent successfully
   *       400:
   *         description: Invalid notification data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    '/send-batch',
    requireAuth,
    requirePermission(PermissionName.SEND_NOTIFICATIONS),
    controller.sendBatchNotification
  );

  return router;
}