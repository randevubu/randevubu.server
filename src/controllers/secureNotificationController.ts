import { Request, Response } from 'express';
import { SecureNotificationService, SecureNotificationRequest, BroadcastNotificationRequest } from '../services/secureNotificationService';
import { NotificationValidationService } from '../services/notificationValidationService';
import { AuthenticatedRequest } from '../types/auth';
import { NotificationChannel } from '../types/business';

export class SecureNotificationController {
  private validationService = new NotificationValidationService();

  constructor(private secureNotificationService: SecureNotificationService) {}

  /**
   * Send secure notification to specific customers
   * Industry Standard: Validated, rate-limited, audited notifications
   */
  sendSecureNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Industry Standard: Comprehensive input validation
      const validationResult = this.validationService.validateSecureNotificationRequest(req.body);
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const request: SecureNotificationRequest = {
        ...validationResult.data!,
        userId: req.user!.id,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      };

      const result = await this.secureNotificationService.sendSecureNotification(request);

      res.json({
        success: result.success,
        data: {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          totalRecipients: result.totalRecipients,
          validRecipients: result.validRecipients,
          invalidRecipients: result.invalidRecipients,
          rateLimitInfo: result.rateLimitResult ? {
            allowed: result.rateLimitResult.allowed,
            remaining: result.rateLimitResult.remaining,
            resetTime: result.rateLimitResult.resetTime
          } : undefined,
          errors: result.errors
        },
        message: result.success 
          ? `Notification sent successfully to ${result.sentCount} recipients`
          : 'Notification sending failed'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      });
    }
  };

  /**
   * Send broadcast notification to all business customers
   * Industry Standard: Secure broadcast with filtering
   */
  sendBroadcastNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Industry Standard: Comprehensive input validation
      const validationResult = this.validationService.validateBroadcastNotificationRequest(req.body);
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
        return;
      }

      const request: BroadcastNotificationRequest = {
        ...validationResult.data!,
        userId: req.user!.id,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      };

      const result = await this.secureNotificationService.sendBroadcastNotification(request);

      res.json({
        success: result.success,
        data: {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          totalRecipients: result.totalRecipients,
          validRecipients: result.validRecipients,
          invalidRecipients: result.invalidRecipients,
          errors: result.errors
        },
        message: result.success 
          ? `Broadcast sent successfully to ${result.sentCount} customers`
          : 'Broadcast sending failed'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send broadcast'
      });
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

      if (!message || !channels || !Array.isArray(channels)) {
        res.status(400).json({
          success: false,
          error: 'message and channels are required'
        });
        return;
      }

      const result = await this.secureNotificationService.sendClosureNotification(
        businessId,
        req.user!.id,
        closureId,
        message,
        channels as NotificationChannel[],
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: result.success,
        data: {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          totalRecipients: result.totalRecipients,
          validRecipients: result.validRecipients,
          invalidRecipients: result.invalidRecipients,
          errors: result.errors
        },
        message: result.success 
          ? `Closure notification sent to ${result.sentCount} affected customers`
          : 'Closure notification failed'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send closure notification'
      });
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

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format'
          });
          return;
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
          return;
        }
      }

      const stats = await this.secureNotificationService.getNotificationStats(
        businessId,
        req.user!.id,
        start,
        end
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification statistics'
      });
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

      const hoursParam = hours ? parseInt(hours as string) : 24;
      if (isNaN(hoursParam) || hoursParam < 1 || hoursParam > 168) {
        res.status(400).json({
          success: false,
          error: 'hours must be between 1 and 168'
        });
        return;
      }

      const alerts = await this.secureNotificationService.getSecurityAlerts(
        businessId,
        req.user!.id,
        hoursParam
      );

      res.json({
        success: true,
        data: {
          alerts,
          period: `${hoursParam} hours`,
          totalAlerts: alerts.length
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get security alerts'
      });
    }
  };

  /**
   * Test notification (for development/testing)
   * Industry Standard: Safe testing environment
   */
  sendTestNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { businessId, title, body, channels } = req.body;

      if (!businessId || !title || !body) {
        res.status(400).json({
          success: false,
          error: 'businessId, title, and body are required'
        });
        return;
      }

      // Send test notification to the user themselves
      const result = await this.secureNotificationService.sendSecureNotification({
        businessId,
        userId: req.user!.id,
        recipientIds: [req.user!.id], // Send to self
        title: `[TEST] ${title}`,
        body: `[TEST] ${body}`,
        notificationType: 'BROADCAST',
        channels: channels || ['PUSH'],
        data: { isTest: true },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      res.json({
        success: result.success,
        data: {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          errors: result.errors
        },
        message: result.success 
          ? 'Test notification sent successfully'
          : 'Test notification failed'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test notification'
      });
    }
  };

  /**
   * Get system health status
   * Industry Standard: Health monitoring
   */
  getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const health = this.secureNotificationService.getSystemHealth();
      
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system health'
      });
    }
  };
}
