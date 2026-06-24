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
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class PushNotificationController {
  constructor(
    private notificationService: NotificationService,
    private responseHelper: ResponseHelper
  ) {}

  subscribe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const subscriptionData = pushSubscriptionRequestSchema.parse(req.body);

    const subscription = await this.notificationService.subscribeToPush(userId, subscriptionData);

    await this.responseHelper.success(res, 'success.pushNotification.subscribed', {
      id: subscription.id, isActive: subscription.isActive, deviceName: subscription.deviceName, createdAt: subscription.createdAt,
    }, 201, req);
  };

  unsubscribe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { endpoint, subscriptionId } = unsubscribePushRequestSchema.parse(req.body);

    const result = await this.notificationService.unsubscribeFromPush(userId, endpoint, subscriptionId);

    if (!result) {
      throw new AppError('PUSH_SUBSCRIPTION_NOT_FOUND', { message: 'Push subscription not found' });
    }

    await this.responseHelper.success(res, 'success.pushNotification.unsubscribed', undefined, 200, req);
  };

  getSubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    if (req.query.activeOnly && !['true', 'false'].includes(req.query.activeOnly as string)) {
      throw new AppError('VALIDATION_ERROR', { message: 'activeOnly must be true or false' });
    }

    const activeOnly = req.query.activeOnly !== 'false';
    const subscriptions = await this.notificationService.getUserPushSubscriptions(userId, activeOnly);

    await this.responseHelper.success(res, 'success.pushNotification.subscriptionsRetrieved',
      subscriptions.map((sub) => ({
        id: sub.id, deviceName: sub.deviceName, deviceType: sub.deviceType,
        isActive: sub.isActive, createdAt: sub.createdAt, lastUsedAt: sub.lastUsedAt,
      })), 200, req);
  };

  updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const preferences = notificationPreferenceRequestSchema.parse(req.body);

    const updatedPreferences = await this.notificationService.updateNotificationPreferences(userId, preferences);

    await this.responseHelper.success(res, 'success.pushNotification.preferencesUpdated', {
      id: updatedPreferences.id,
      enableAppointmentReminders: updatedPreferences.enableAppointmentReminders,
      enableBusinessNotifications: updatedPreferences.enableBusinessNotifications,
      enablePromotionalMessages: updatedPreferences.enablePromotionalMessages,
      reminderTiming: updatedPreferences.reminderTiming,
      preferredChannels: updatedPreferences.preferredChannels,
      quietHours: updatedPreferences.quietHours,
      timezone: updatedPreferences.timezone,
    }, 200, req);
  };

  getPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const preferences = await this.notificationService.getNotificationPreferences(userId);

    if (!preferences) {
      await this.responseHelper.success(res, 'success.pushNotification.defaultPreferencesRetrieved', {
        enableAppointmentReminders: true, enableBusinessNotifications: true, enablePromotionalMessages: false,
        reminderTiming: { hours: [1, 24] }, preferredChannels: { channels: ['PUSH', 'SMS'] },
        quietHours: null, timezone: 'Europe/Istanbul',
      }, 200, req);
      return;
    }

    await this.responseHelper.success(res, 'success.pushNotification.preferencesRetrieved', {
      id: preferences.id,
      enableAppointmentReminders: preferences.enableAppointmentReminders,
      enableBusinessNotifications: preferences.enableBusinessNotifications,
      enablePromotionalMessages: preferences.enablePromotionalMessages,
      reminderTiming: preferences.reminderTiming,
      preferredChannels: preferences.preferredChannels,
      quietHours: preferences.quietHours,
      timezone: preferences.timezone,
    }, 200, req);
  };

  sendNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const notificationData = sendPushNotificationRequestSchema.parse(req.body);

    const results = await this.notificationService.sendPushNotification(notificationData);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await this.responseHelper.success(res, 'success.pushNotification.sent', {
      results, summary: { total: results.length, successful, failed },
    }, 200, req, { successful, failed });
  };

  sendTestNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const testData = testPushNotificationRequestSchema.parse(req.body);

    const results = await this.notificationService.sendPushNotification({
      userId, title: testData.title, body: testData.body, icon: testData.icon,
      badge: testData.badge, data: { ...testData.data, isTest: true }, url: testData.url,
    });

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await this.responseHelper.success(res, 'success.pushNotification.testSent', {
      results, summary: { total: results.length, successful, failed },
    }, 200, req, { successful, failed });
  };

  sendBatchNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const batchData = batchSendPushNotificationRequestSchema.parse(req.body);

    if (batchData.userIds.length > 1000) {
      throw new AppError('BATCH_SIZE_EXCEEDED', { message: 'Batch size cannot exceed 1000 users' });
    }

    if (batchData.userIds.length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'At least one user ID is required', params: { field: 'userIds' } });
    }

    const result = await this.notificationService.sendBatchPushNotifications(batchData.userIds, {
      title: batchData.title, body: batchData.body, icon: batchData.icon,
      badge: batchData.badge, data: batchData.data, url: batchData.url,
    });

    await this.responseHelper.success(res, 'success.pushNotification.batchSent', {
      summary: { total: batchData.userIds.length, successful: result.successful, failed: result.failed },
      results: result.results,
    }, 200, req, { count: batchData.userIds.length, successful: result.successful, failed: result.failed });
  };

  getNotificationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const query = getNotificationsQuerySchema.parse(req.query);

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new AppError('VALIDATION_ERROR', { message: 'From date cannot be after to date' });
    }

    const options = {
      page: query.page, limit: query.limit, status: query.status as any,
      appointmentId: query.appointmentId, businessId: query.businessId,
      from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined,
    };

    const result = await this.notificationService.getNotificationHistory(userId, options);

    await this.responseHelper.success(res, 'success.pushNotification.historyRetrieved', {
      notifications: result.notifications,
      pagination: { total: result.total, page: result.page, totalPages: result.totalPages, limit: options.limit },
    }, 200, req);
  };

  getVapidPublicKey = async (_req: Request, res: Response): Promise<void> => {
    const publicKey = await this.notificationService.getVapidPublicKey();

    if (!publicKey) {
      throw new AppError('SERVICE_UNAVAILABLE', { message: 'Push notifications are not configured on this server' });
    }

    await this.responseHelper.success(res, 'success.pushNotification.vapidKeyRetrieved', { publicKey }, 200);
  };

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const publicKey = await this.notificationService.getVapidPublicKey();
    const isConfigured = !!publicKey;

    await this.responseHelper.success(res, 'success.pushNotification.healthCheckCompleted', {
      pushNotificationsEnabled: isConfigured, vapidConfigured: isConfigured, timestamp: new Date().toISOString(),
    }, 200);
  };
}
