import { Request, Response } from 'express';
import { NotificationService } from '../services/domain/notification';
import {
  pushSubscriptionRequestSchema,
  unsubscribePushRequestSchema,
  notificationPreferenceRequestSchema,
  sendPushNotificationRequestSchema,
  testPushNotificationRequestSchema,
  batchSendPushNotificationRequestSchema,
  getNotificationsQuerySchema,
} from '../schemas/pushNotification.schemas';
import { AuthenticatedRequest } from '../types/request';
import { NotificationStatus } from '../types/business';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';

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

      await sendSuccessResponse(
        res,
        'success.pushNotification.subscribed',
        {
          id: subscription.id,
          isActive: subscription.isActive,
          deviceName: subscription.deviceName,
          createdAt: subscription.createdAt,
        },
        201,
        req
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid subscription data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
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
        await sendSuccessResponse(
          res,
          'success.pushNotification.unsubscribed',
          undefined,
          200,
          req
        );
      } else {
        const error = new AppError(
          'Subscription not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid unsubscribe data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
    }
  };

  // Get user's push subscriptions
  getSubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      
      // Validate and sanitize query parameters
      const activeOnly = req.query.activeOnly !== 'false';
      
      // Additional validation for activeOnly parameter
      if (req.query.activeOnly && !['true', 'false'].includes(req.query.activeOnly as string)) {
        const error = new AppError(
          'activeOnly must be true or false',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const subscriptions = await this.notificationService.getUserPushSubscriptions(
        userId,
        activeOnly
      );

      await sendSuccessResponse(
        res,
        'success.pushNotification.subscriptionsRetrieved',
        subscriptions.map(sub => ({
          id: sub.id,
          deviceName: sub.deviceName,
          deviceType: sub.deviceType,
          isActive: sub.isActive,
          createdAt: sub.createdAt,
          lastUsedAt: sub.lastUsedAt,
        })),
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
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

      await sendSuccessResponse(
        res,
        'success.pushNotification.preferencesUpdated',
        {
          id: updatedPreferences.id,
          enableAppointmentReminders: updatedPreferences.enableAppointmentReminders,
          enableBusinessNotifications: updatedPreferences.enableBusinessNotifications,
          enablePromotionalMessages: updatedPreferences.enablePromotionalMessages,
          reminderTiming: updatedPreferences.reminderTiming,
          preferredChannels: updatedPreferences.preferredChannels,
          quietHours: updatedPreferences.quietHours,
          timezone: updatedPreferences.timezone,
        },
        200,
        req
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid preferences data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
    }
  };

  // Get notification preferences
  getPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const preferences = await this.notificationService.getNotificationPreferences(userId);

      if (!preferences) {
        // Return default preferences
        await sendSuccessResponse(
          res,
          'success.pushNotification.defaultPreferencesRetrieved',
          {
            enableAppointmentReminders: true,
            enableBusinessNotifications: true,
            enablePromotionalMessages: false,
            reminderTiming: { hours: [1, 24] },
            preferredChannels: { channels: ['PUSH', 'SMS'] },
            quietHours: null,
            timezone: 'Europe/Istanbul',
          },
          200,
          req
        );
        return;
      }

      await sendSuccessResponse(
        res,
        'success.pushNotification.preferencesRetrieved',
        {
          id: preferences.id,
          enableAppointmentReminders: preferences.enableAppointmentReminders,
          enableBusinessNotifications: preferences.enableBusinessNotifications,
          enablePromotionalMessages: preferences.enablePromotionalMessages,
          reminderTiming: preferences.reminderTiming,
          preferredChannels: preferences.preferredChannels,
          quietHours: preferences.quietHours,
          timezone: preferences.timezone,
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  // Send a push notification (admin only)
  sendNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const notificationData = sendPushNotificationRequestSchema.parse(req.body);

      const results = await this.notificationService.sendPushNotification(notificationData);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      await sendSuccessResponse(
        res,
        'success.pushNotification.sent',
        {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        },
        200,
        req,
        { successful, failed }
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid notification data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
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

      await sendSuccessResponse(
        res,
        'success.pushNotification.testSent',
        {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        },
        200,
        req,
        { successful, failed }
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid test notification data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
    }
  };

  // Send batch push notifications (admin only)
  sendBatchNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const batchData = batchSendPushNotificationRequestSchema.parse(req.body);

      // Additional validation for batch size
      if (batchData.userIds.length > 1000) {
        const error = new AppError(
          'Batch size cannot exceed 1000 users',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (batchData.userIds.length === 0) {
        const error = new AppError(
          'At least one user ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

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

      await sendSuccessResponse(
        res,
        'success.pushNotification.batchSent',
        {
          summary: {
            total: batchData.userIds.length,
            successful: result.successful,
            failed: result.failed
          },
          results: result.results
        },
        200,
        req,
        { count: batchData.userIds.length, successful: result.successful, failed: result.failed }
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid batch notification data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
    }
  };

  // Get notification history
  getNotificationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const query = getNotificationsQuerySchema.parse(req.query);

      // Additional validation for date ranges
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        const error = new AppError(
          'From date cannot be after to date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const options = {
        page: query.page,
        limit: query.limit,
        status: query.status as any,
        appointmentId: query.appointmentId,
        businessId: query.businessId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      };

      const result = await this.notificationService.getNotificationHistory(userId, options);

      await sendSuccessResponse(
        res,
        'success.pushNotification.historyRetrieved',
        {
          notifications: result.notifications,
          pagination: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit: options.limit
          }
        },
        200,
        req
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const error = new AppError(
          'Invalid query parameters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      handleRouteError(error, req, res);
    }
  };

  // Get VAPID public key for frontend
  getVapidPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const publicKey = await this.notificationService.getVapidPublicKey();

      if (!publicKey) {
        const error = new AppError(
          'Push notifications are not configured on this server',
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE
        );
        return sendAppErrorResponse(res, error);
      }

      await sendSuccessResponse(
        res,
        'success.pushNotification.vapidKeyRetrieved',
        { publicKey },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  // Health check for push notification service
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const publicKey = await this.notificationService.getVapidPublicKey();
      const isConfigured = !!publicKey;
      
      await sendSuccessResponse(
        res,
        'success.pushNotification.healthCheckCompleted',
        {
          pushNotificationsEnabled: isConfigured,
          vapidConfigured: isConfigured,
          timestamp: new Date().toISOString()
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };
}