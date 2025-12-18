import { Request, Response } from 'express';
import {
  SecureNotificationService,
  SecureNotificationRequest,
  BroadcastNotificationRequest,
} from '../services/domain/notification';
import { AuthenticatedRequest } from '../types/request';
import { NotificationChannel } from '../types/business';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import { ResponseHelper } from '../utils/responseHelper';

export class SecureNotificationController {
  constructor(
    private secureNotificationService: SecureNotificationService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Send secure notification to specific customers
   * Industry Standard: Validated, rate-limited, audited notifications
   */
  sendSecureNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId, message, title, body, channels, recipientIds } = req.body;

      // Validate required fields
      if (!businessId || !message) {
        const error = new AppError(
          'Business ID and message are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate message length
      if (typeof message !== 'string' || message.length < 1 || message.length > 1000) {
        const error = new AppError(
          'Message must be between 1 and 1000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate title if provided
      if (title && (typeof title !== 'string' || title.length < 1 || title.length > 200)) {
        const error = new AppError(
          'Title must be between 1 and 200 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate body if provided
      if (body && (typeof body !== 'string' || body.length < 1 || body.length > 2000)) {
        const error = new AppError(
          'Body must be between 1 and 2000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate channels if provided
      if (
        channels &&
        (!Array.isArray(channels) || !channels.every((ch) => ['PUSH', 'SMS', 'EMAIL'].includes(ch)))
      ) {
        const error = new AppError(
          'Channels must be an array of valid notification channels (PUSH, SMS, EMAIL)',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate recipientIds if provided
      if (recipientIds && (!Array.isArray(recipientIds) || recipientIds.length > 1000)) {
        const error = new AppError(
          'Recipient IDs must be an array with maximum 1000 items',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const request: SecureNotificationRequest = {
        businessId,
        userId: req.user!.id,
        message,
        title: title || message,
        body: body || message,
        targetAudience: req.body.targetAudience || { type: 'ALL_CUSTOMERS' },
        notificationType: req.body.notificationType || 'BROADCAST',
        channels: channels || ['PUSH'],
        recipientIds: recipientIds || [],
        data: req.body.data || {},
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      };

      const result = await this.secureNotificationService.sendSecureNotification(request);

      await this.responseHelper.success(
        res,
        result.success ? 'success.notification.sent' : 'success.notification.sendingFailed',
        {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          totalRecipients: result.totalRecipients,
          validRecipients: result.totalRecipients - result.invalidRecipients,
          invalidRecipients: result.invalidRecipients,
          rateLimitInfo: undefined,
          errors: result.errors,
        },
        200,
        req,
        result.success ? { sentCount: result.sentCount } : undefined
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Send broadcast notification to all business customers
   * Industry Standard: Secure broadcast with filtering
   */
  sendBroadcastNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId, message, title, body, channels } = req.body;

      // Validate required fields
      if (!businessId || !message) {
        const error = new AppError(
          'Business ID and message are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate message length
      if (typeof message !== 'string' || message.length < 1 || message.length > 1000) {
        const error = new AppError(
          'Message must be between 1 and 1000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate title if provided
      if (title && (typeof title !== 'string' || title.length < 1 || title.length > 200)) {
        const error = new AppError(
          'Title must be between 1 and 200 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate body if provided
      if (body && (typeof body !== 'string' || body.length < 1 || body.length > 2000)) {
        const error = new AppError(
          'Body must be between 1 and 2000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate channels if provided
      if (
        channels &&
        (!Array.isArray(channels) || !channels.every((ch) => ['PUSH', 'SMS', 'EMAIL'].includes(ch)))
      ) {
        const error = new AppError(
          'Channels must be an array of valid notification channels (PUSH, SMS, EMAIL)',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const request: BroadcastNotificationRequest = {
        businessId,
        userId: req.user!.id,
        title: title || message,
        body: body || message,
        notificationType: 'BROADCAST',
        channels: channels || ['PUSH'],
        data: req.body.data || {},
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      };

      const result = await this.secureNotificationService.sendBroadcastNotification(request);

      await this.responseHelper.success(
        res,
        result.success ? 'success.notification.sent' : 'success.notification.broadcastFailed',
        {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          totalRecipients: result.totalRecipients,
          validRecipients: result.totalRecipients - result.invalidRecipients,
          invalidRecipients: result.invalidRecipients,
          errors: result.errors,
        },
        200,
        req,
        result.success ? { sentCount: result.sentCount } : undefined
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Send closure notification
   * Industry Standard: Context-aware closure notifications
   */
  sendClosureNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId, closureId } = req.params;
      const { message, channels } = req.body;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate closureId parameter
      if (!closureId || typeof closureId !== 'string') {
        const error = new AppError(
          'Closure ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID formats
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(closureId) || closureId.length < 1 || closureId.length > 50) {
        const error = new AppError('Invalid closure ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate required fields
      if (!message || !channels || !Array.isArray(channels)) {
        const error = new AppError(
          'Message and channels are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate message length
      if (typeof message !== 'string' || message.length < 1 || message.length > 1000) {
        const error = new AppError(
          'Message must be between 1 and 1000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate channels
      if (!channels.every((ch) => ['PUSH', 'SMS', 'EMAIL'].includes(ch))) {
        const error = new AppError(
          'Channels must be valid notification channels (PUSH, SMS, EMAIL)',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.secureNotificationService.sendClosureNotification(
        businessId,
        req.user!.id,
        closureId,
        message,
        channels as NotificationChannel[],
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }
      );

      await this.responseHelper.success(
        res,
        result.success ? 'success.notification.sent' : 'success.notification.closureFailed',
        {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          totalRecipients: result.totalRecipients,
          validRecipients: result.totalRecipients - result.invalidRecipients,
          invalidRecipients: result.invalidRecipients,
          errors: result.errors,
        },
        200,
        req,
        result.success ? { sentCount: result.sentCount } : undefined
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get notification statistics
   * Industry Standard: Analytics and monitoring
   */
  getNotificationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          const error = new AppError('Invalid startDate format', 400, ERROR_CODES.VALIDATION_ERROR);
          return sendAppErrorResponse(res, error);
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          const error = new AppError('Invalid endDate format', 400, ERROR_CODES.VALIDATION_ERROR);
          return sendAppErrorResponse(res, error);
        }
      }

      // Validate date range
      if (start && end && start > end) {
        const error = new AppError(
          'Start date must be before end date',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const stats = await this.secureNotificationService.getNotificationStats(
        businessId,
        req.user!.id,
        start,
        end
      );

      await this.responseHelper.success(
        res,
        'success.notification.statsRetrieved',
        stats,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get security alerts
   * Industry Standard: Security monitoring
   */
  getSecurityAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { hours } = req.query;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      const hoursParam = hours ? parseInt(hours as string, 10) : 24;
      if (isNaN(hoursParam) || hoursParam < 1 || hoursParam > 168) {
        const error = new AppError(
          'Hours must be between 1 and 168',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const alerts = await this.secureNotificationService.getSecurityAlerts(
        businessId,
        req.user!.id,
        hoursParam
      );

      await this.responseHelper.success(
        res,
        'success.notification.securityAlertsRetrieved',
        {
          alerts,
          period: `${hoursParam} hours`,
          totalAlerts: alerts.length,
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Test notification (for development/testing)
   * Industry Standard: Safe testing environment
   */
  sendTestNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId, title, body, channels } = req.body;

      // Validate required fields
      if (!businessId || !title || !body) {
        const error = new AppError(
          'Business ID, title, and body are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError('Invalid business ID format', 400, ERROR_CODES.VALIDATION_ERROR);
        return sendAppErrorResponse(res, error);
      }

      // Validate title length
      if (typeof title !== 'string' || title.length < 1 || title.length > 200) {
        const error = new AppError(
          'Title must be between 1 and 200 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate body length
      if (typeof body !== 'string' || body.length < 1 || body.length > 2000) {
        const error = new AppError(
          'Body must be between 1 and 2000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate channels if provided
      if (
        channels &&
        (!Array.isArray(channels) || !channels.every((ch) => ['PUSH', 'SMS', 'EMAIL'].includes(ch)))
      ) {
        const error = new AppError(
          'Channels must be an array of valid notification channels (PUSH, SMS, EMAIL)',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Send test notification to the user themselves
      const result = await this.secureNotificationService.sendSecureNotification({
        businessId,
        userId: req.user!.id,
        recipientIds: [req.user!.id], // Send to self
        title: `[TEST] ${title}`,
        body: `[TEST] ${body}`,
        message: `[TEST] ${body}`,
        targetAudience: { type: 'ALL_CUSTOMERS' },
        notificationType: 'BROADCAST',
        channels: channels || ['PUSH'],
        data: { isTest: true },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      await this.responseHelper.success(
        res,
        result.success ? 'success.notification.sent' : 'success.notification.testFailed',
        {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          errors: result.errors,
        },
        200,
        req,
        result.success ? { sentCount: result.sentCount } : undefined
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };

  /**
   * Get system health status
   * Industry Standard: Health monitoring
   */
  getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const health = this.secureNotificationService.getSystemHealth();

      await this.responseHelper.success(
        res,
        'success.notification.systemHealthRetrieved',
        {
          ...health,
          timestamp: new Date().toISOString(),
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  };
}
