import { Response } from 'express';
import {
  SecureNotificationService,
  SecureNotificationRequest,
  BroadcastNotificationRequest,
} from '../services/domain/notification';
import { AuthenticatedRequest } from '../types/request';
import { NotificationChannel } from '../types/business';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class SecureNotificationController {
  constructor(
    private secureNotificationService: SecureNotificationService,
    private responseHelper: ResponseHelper
  ) {}

  private requireBusinessId(id: string | undefined): string {
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }
    return id;
  }

  private validateMessage(message: unknown, maxLen = 1000): void {
    if (!message || typeof message !== 'string' || message.length < 1 || message.length > maxLen) {
      throw new AppError('VALIDATION_ERROR', { message: `Message must be between 1 and ${maxLen} characters` });
    }
  }

  private validateChannels(channels: unknown): void {
    if (channels && (!Array.isArray(channels) || !channels.every((ch: string) => ['PUSH', 'SMS', 'EMAIL'].includes(ch)))) {
      throw new AppError('VALIDATION_ERROR', { message: 'Channels must be an array of valid notification channels (PUSH, SMS, EMAIL)' });
    }
  }

  sendSecureNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { businessId, message, title, body, channels, recipientIds } = req.body;

    this.requireBusinessId(businessId);
    this.validateMessage(message);

    if (title && (typeof title !== 'string' || title.length < 1 || title.length > 200)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Title must be between 1 and 200 characters' });
    }
    if (body && (typeof body !== 'string' || body.length < 1 || body.length > 2000)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Body must be between 1 and 2000 characters' });
    }
    this.validateChannels(channels);
    if (recipientIds && (!Array.isArray(recipientIds) || recipientIds.length > 1000)) {
      throw new AppError('BATCH_SIZE_EXCEEDED', { message: 'Recipient IDs must be an array with maximum 1000 items' });
    }

    const request: SecureNotificationRequest = {
      businessId, userId: req.user!.id, message,
      title: title || message, body: body || message,
      targetAudience: req.body.targetAudience || { type: 'ALL_CUSTOMERS' },
      notificationType: req.body.notificationType || 'BROADCAST',
      channels: channels || ['PUSH'], recipientIds: recipientIds || [],
      data: req.body.data || {},
      metadata: { ipAddress: req.ip, userAgent: req.get('User-Agent') },
    };

    const result = await this.secureNotificationService.sendSecureNotification(request);

    await this.responseHelper.success(res,
      result.success ? 'success.notification.sent' : 'success.notification.sendingFailed',
      {
        sentCount: result.sentCount, failedCount: result.failedCount,
        totalRecipients: result.totalRecipients,
        validRecipients: result.totalRecipients - result.invalidRecipients,
        invalidRecipients: result.invalidRecipients,
        rateLimitInfo: undefined, errors: result.errors,
      }, 200, req, result.success ? { sentCount: result.sentCount } : undefined);
  };

  sendBroadcastNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { businessId, message, title, body, channels } = req.body;

    this.requireBusinessId(businessId);
    this.validateMessage(message);

    if (title && (typeof title !== 'string' || title.length < 1 || title.length > 200)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Title must be between 1 and 200 characters' });
    }
    if (body && (typeof body !== 'string' || body.length < 1 || body.length > 2000)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Body must be between 1 and 2000 characters' });
    }
    this.validateChannels(channels);

    const request: BroadcastNotificationRequest = {
      businessId, userId: req.user!.id,
      title: title || message, body: body || message,
      notificationType: 'BROADCAST', channels: channels || ['PUSH'],
      data: req.body.data || {},
      metadata: { ipAddress: req.ip, userAgent: req.get('User-Agent') },
    };

    const result = await this.secureNotificationService.sendBroadcastNotification(request);

    await this.responseHelper.success(res,
      result.success ? 'success.notification.sent' : 'success.notification.broadcastFailed',
      {
        sentCount: result.sentCount, failedCount: result.failedCount,
        totalRecipients: result.totalRecipients,
        validRecipients: result.totalRecipients - result.invalidRecipients,
        invalidRecipients: result.invalidRecipients, errors: result.errors,
      }, 200, req, result.success ? { sentCount: result.sentCount } : undefined);
  };

  sendClosureNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = this.requireBusinessId(req.params.businessId);
    const { closureId } = req.params;
    const { message, channels } = req.body;

    if (!closureId || typeof closureId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Closure ID is required', params: { field: 'closureId' } });
    }
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(closureId) || closureId.length < 1 || closureId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid closure ID format', params: { field: 'closureId' } });
    }

    if (!message || !channels || !Array.isArray(channels)) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Message and channels are required', params: { field: 'message,channels' } });
    }
    this.validateMessage(message);
    this.validateChannels(channels);

    const result = await this.secureNotificationService.sendClosureNotification(
      businessId, req.user!.id, closureId, message, channels as NotificationChannel[],
      { ipAddress: req.ip, userAgent: req.get('User-Agent') }
    );

    await this.responseHelper.success(res,
      result.success ? 'success.notification.sent' : 'success.notification.closureFailed',
      {
        sentCount: result.sentCount, failedCount: result.failedCount,
        totalRecipients: result.totalRecipients,
        validRecipients: result.totalRecipients - result.invalidRecipients,
        invalidRecipients: result.invalidRecipients, errors: result.errors,
      }, 200, req, result.success ? { sentCount: result.sentCount } : undefined);
  };

  getNotificationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = this.requireBusinessId(req.params.businessId);
    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
    }
    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
    }
    if (start && end && start > end) {
      throw new AppError('CLOSURE_END_BEFORE_START', { message: 'Start date must be before end date' });
    }

    const stats = await this.secureNotificationService.getNotificationStats(businessId, req.user!.id, start, end);

    await this.responseHelper.success(res, 'success.notification.statsRetrieved', stats, 200, req);
  };

  getSecurityAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = this.requireBusinessId(req.params.businessId);
    const { hours } = req.query;

    const hoursParam = hours ? parseInt(hours as string, 10) : 24;
    if (isNaN(hoursParam) || hoursParam < 1 || hoursParam > 168) {
      throw new AppError('VALIDATION_ERROR', { message: 'Hours must be between 1 and 168' });
    }

    const alerts = await this.secureNotificationService.getSecurityAlerts(businessId, req.user!.id, hoursParam);

    await this.responseHelper.success(res, 'success.notification.securityAlertsRetrieved', {
      alerts, period: `${hoursParam} hours`, totalAlerts: alerts.length,
    }, 200, req);
  };

  sendTestNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { businessId, title, body, channels } = req.body;

    this.requireBusinessId(businessId);

    if (!title || !body) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Title and body are required', params: { field: 'title,body' } });
    }
    if (typeof title !== 'string' || title.length < 1 || title.length > 200) {
      throw new AppError('VALIDATION_ERROR', { message: 'Title must be between 1 and 200 characters' });
    }
    if (typeof body !== 'string' || body.length < 1 || body.length > 2000) {
      throw new AppError('VALIDATION_ERROR', { message: 'Body must be between 1 and 2000 characters' });
    }
    this.validateChannels(channels);

    const result = await this.secureNotificationService.sendSecureNotification({
      businessId, userId: req.user!.id, recipientIds: [req.user!.id],
      title: `[TEST] ${title}`, body: `[TEST] ${body}`, message: `[TEST] ${body}`,
      targetAudience: { type: 'ALL_CUSTOMERS' }, notificationType: 'BROADCAST',
      channels: channels || ['PUSH'], data: { isTest: true },
      metadata: { ipAddress: req.ip, userAgent: req.get('User-Agent') },
    });

    await this.responseHelper.success(res,
      result.success ? 'success.notification.sent' : 'success.notification.testFailed',
      { sentCount: result.sentCount, failedCount: result.failedCount, errors: result.errors },
      200, req, result.success ? { sentCount: result.sentCount } : undefined);
  };

  getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const health = this.secureNotificationService.getSystemHealth();

    await this.responseHelper.success(res, 'success.notification.systemHealthRetrieved', {
      ...health, timestamp: new Date().toISOString(),
    }, 200, req);
  };
}
