import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import {
  pushSubscriptionRequestSchema,
  unsubscribePushRequestSchema,
  notificationPreferenceRequestSchema,
  sendPushNotificationRequestSchema,
  testPushNotificationRequestSchema,
  batchSendPushNotificationRequestSchema,
  getNotificationsQuerySchema,
} from '../schemas/pushNotification.schemas';
import { AuthenticatedRequest } from '../types/auth';
import { NotificationStatus } from '../types/business';

export class PushNotificationController {
  constructor(private notificationService: NotificationService) {}

  // Subscribe to push notifications
  subscribe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const subscriptionData = pushSubscriptionRequestSchema.parse(req.body);

      const subscription = await this.notificationService.subscribeToPush(
        userId,
        subscriptionData
      );

      res.status(201).json({
        success: true,
        data: {
          id: subscription.id,
          isActive: subscription.isActive,
          deviceName: subscription.deviceName,
          createdAt: subscription.createdAt,
        },
        message: 'Successfully subscribed to push notifications'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to push notifications'
      });
    }
  };

  // Unsubscribe from push notifications
  unsubscribe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { endpoint, subscriptionId } = unsubscribePushRequestSchema.parse(req.body);

      const result = await this.notificationService.unsubscribeFromPush(
        userId,
        endpoint,
        subscriptionId
      );

      if (result) {
        res.json({
          success: true,
          message: 'Successfully unsubscribed from push notifications'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe from push notifications'
      });
    }
  };

  // Get user's push subscriptions
  getSubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const activeOnly = req.query.activeOnly !== 'false';

      const subscriptions = await this.notificationService.getUserPushSubscriptions(
        userId,
        activeOnly
      );

      res.json({
        success: true,
        data: subscriptions.map(sub => ({
          id: sub.id,
          deviceName: sub.deviceName,
          deviceType: sub.deviceType,
          isActive: sub.isActive,
          createdAt: sub.createdAt,
          lastUsedAt: sub.lastUsedAt,
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscriptions'
      });
    }
  };

  // Update notification preferences
  updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const preferences = notificationPreferenceRequestSchema.parse(req.body);

      const updatedPreferences = await this.notificationService.updateNotificationPreferences(
        userId,
        preferences
      );

      res.json({
        success: true,
        data: {
          id: updatedPreferences.id,
          enableAppointmentReminders: updatedPreferences.enableAppointmentReminders,
          enableBusinessNotifications: updatedPreferences.enableBusinessNotifications,
          enablePromotionalMessages: updatedPreferences.enablePromotionalMessages,
          reminderTiming: updatedPreferences.reminderTiming,
          preferredChannels: updatedPreferences.preferredChannels,
          quietHours: updatedPreferences.quietHours,
          timezone: updatedPreferences.timezone,
        },
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification preferences'
      });
    }
  };

  // Get notification preferences
  getPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const preferences = await this.notificationService.getNotificationPreferences(userId);

      if (!preferences) {
        // Return default preferences
        res.json({
          success: true,
          data: {
            enableAppointmentReminders: true,
            enableBusinessNotifications: true,
            enablePromotionalMessages: false,
            reminderTiming: { hours: [1, 24] },
            preferredChannels: { channels: ['PUSH', 'SMS'] },
            quietHours: null,
            timezone: 'Europe/Istanbul',
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: preferences.id,
          enableAppointmentReminders: preferences.enableAppointmentReminders,
          enableBusinessNotifications: preferences.enableBusinessNotifications,
          enablePromotionalMessages: preferences.enablePromotionalMessages,
          reminderTiming: preferences.reminderTiming,
          preferredChannels: preferences.preferredChannels,
          quietHours: preferences.quietHours,
          timezone: preferences.timezone,
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification preferences'
      });
    }
  };

  // Send a push notification (admin only)
  sendNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const notificationData = sendPushNotificationRequestSchema.parse(req.body);

      const results = await this.notificationService.sendPushNotification(notificationData);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        },
        message: `Push notification sent. ${successful} successful, ${failed} failed.`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send push notification'
      });
    }
  };

  // Send a test push notification
  sendTestNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const testData = testPushNotificationRequestSchema.parse(req.body);

      const results = await this.notificationService.sendPushNotification({
        userId,
        title: testData.title,
        body: testData.body,
        icon: testData.icon,
        badge: testData.badge,
        data: { ...testData.data, isTest: true },
        url: testData.url
      });

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        },
        message: `Test notification sent. ${successful} successful, ${failed} failed.`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test notification'
      });
    }
  };

  // Send batch push notifications (admin only)
  sendBatchNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const batchData = batchSendPushNotificationRequestSchema.parse(req.body);

      const result = await this.notificationService.sendBatchPushNotifications(
        batchData.userIds,
        {
          title: batchData.title,
          body: batchData.body,
          icon: batchData.icon,
          badge: batchData.badge,
          data: batchData.data,
          url: batchData.url
        }
      );

      res.json({
        success: true,
        data: {
          summary: {
            total: batchData.userIds.length,
            successful: result.successful,
            failed: result.failed
          },
          results: result.results
        },
        message: `Batch notification sent to ${batchData.userIds.length} users. ${result.successful} successful, ${result.failed} failed.`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send batch notification'
      });
    }
  };

  // Get notification history
  getNotificationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const query = getNotificationsQuerySchema.parse(req.query);

      const options = {
        page: query.page,
        limit: query.limit,
        status: query.status as NotificationStatus | undefined,
        appointmentId: query.appointmentId,
        businessId: query.businessId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      };

      const result = await this.notificationService.getNotificationHistory(userId, options);

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          pagination: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit: options.limit
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification history'
      });
    }
  };

  // Get VAPID public key for frontend
  getVapidPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const publicKey = await this.notificationService.getVapidPublicKey();

      if (!publicKey) {
        res.status(503).json({
          success: false,
          error: 'Push notifications are not configured on this server'
        });
        return;
      }

      res.json({
        success: true,
        data: { publicKey }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get VAPID public key'
      });
    }
  };

  // Health check for push notification service
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const publicKey = await this.notificationService.getVapidPublicKey();
      const isConfigured = !!publicKey;
      
      res.json({
        success: true,
        data: {
          pushNotificationsEnabled: isConfigured,
          vapidConfigured: isConfigured,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  };
}