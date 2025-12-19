import { Response } from 'express';
import { ERROR_CODES } from '../constants/errorCodes';
import { BusinessContextRequest } from '../middleware/businessContext';
import { BusinessService } from '../services/domain/business';
import { NotificationService } from '../services/domain/notification';
import { RBACService } from '../services/domain/rbac';
import { AppointmentStatus } from '../types/business';
import { AppError } from '../types/responseTypes';
import { handleRouteError, sendAppErrorResponse } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';

/**
 * Controller for managing business notification settings
 * Handles notification preferences and reminder testing
 */
export class BusinessNotificationController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper,
    private rbacService: RBACService,
    private notificationService: NotificationService
  ) {}

  /**
   * Get notification settings
   * GET /api/v1/businesses/notification-settings
   */
  async getNotificationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settings = await this.businessService.getBusinessNotificationSettings(
        userId,
        businessId
      );

      if (!settings) {
        // Return default settings if none exist
        await this.responseHelper.success(
          res,
          'success.business.notificationSettingsDefault',
          {
            id: '',
            businessId,
            enableAppointmentReminders: true,
            reminderChannels: ['PUSH'],
            reminderTiming: [60, 1440], // 1 hour and 24 hours
            smsEnabled: false,
            pushEnabled: true,
            emailEnabled: false,
            timezone: 'Europe/Istanbul',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          200,
          req
        );
        return;
      }

      await this.responseHelper.success(
        res,
        'success.business.notificationSettingsRetrieved',
        settings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update notification settings
   * PUT /api/v1/businesses/notification-settings
   */
  async updateNotificationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settings = await this.businessService.updateBusinessNotificationSettings(
        userId,
        businessId,
        req.body
      );

      await this.responseHelper.success(
        res,
        'success.business.notificationSettingsUpdated',
        settings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Test reminder notifications
   * POST /api/v1/businesses/notification-settings/test-reminder
   *
   * NOTE: This method contains business logic that should be moved to a service
   * TODO: Refactor rate limiting and channel testing logic to NotificationService
   */
  async testReminder(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const testData = req.body || {};

      // Get business notification settings
      const businessSettings =
        await this.businessService.getOrCreateBusinessNotificationSettings(businessId);

      // Create a mock appointment for testing
      const now = new Date();
      const testTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const testAppointment = {
        id: `test-${Date.now()}`,
        businessId,
        customerId: userId, // Use current user as customer
        date: testTime,
        startTime: testTime,
        endTime: new Date(testTime.getTime() + 60 * 60 * 1000), // 1 hour duration
        status: AppointmentStatus.CONFIRMED,
        service: {
          id: 'test-service',
          name: 'Test Service',
          duration: 60,
        },
        business: {
          id: businessId,
          name: 'Test Business',
          timezone: businessSettings.timezone,
        },
        customer: {
          id: userId,
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: req.user!.phoneNumber,
        },
      };

      // Determine channels to test
      const channelsToTest = testData.channels || businessSettings.reminderChannels;
      const results = [];

      // Test push notification if enabled and requested
      if (channelsToTest.includes('PUSH') && businessSettings.pushEnabled) {
        const pushResults = await this.notificationService.sendAppointmentReminder(testAppointment);
        results.push(...pushResults);
      }

      // Test SMS if enabled and requested with rate limiting
      if (channelsToTest.includes('SMS') && businessSettings.smsEnabled) {
        // Check SMS rate limiting (5 minutes between SMS tests per user)
        const SMS_RATE_LIMIT_MINUTES = 5;
        const recentSmsTests = await this.businessService.findRecentAuditEvents(
          userId,
          'SMS_TEST',
          SMS_RATE_LIMIT_MINUTES
        );
        const lastSmsTest = recentSmsTests.length > 0 ? recentSmsTests[0] : null;

        if (lastSmsTest) {
          const timeRemaining = Math.ceil(
            (lastSmsTest.createdAt.getTime() + SMS_RATE_LIMIT_MINUTES * 60 * 1000 - Date.now()) /
              1000 /
              60
          );
          results.push({
            success: false,
            error: `SMS test rate limited. Please wait ${timeRemaining} more minute(s) before testing SMS again.`,
            channel: 'SMS',
            status: 'RATE_LIMITED',
          });
        } else {
          const smsResults =
            await this.notificationService.sendSMSAppointmentReminder(testAppointment);
          results.push(...smsResults);

          // Log SMS test activity for rate limiting
          await this.businessService.logAuditEvent({
            userId,
            action: 'SMS_TEST',
            entity: 'NOTIFICATION',
            entityId: testAppointment.id,
            details: { businessId, testId: testAppointment.id },
          });
        }
      }

      // Test email if enabled and requested (placeholder for now)
      if (channelsToTest.includes('EMAIL') && businessSettings.emailEnabled) {
        results.push({
          success: true,
          messageId: `test-email-${Date.now()}`,
          channel: 'EMAIL',
          status: 'SENT',
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      await this.responseHelper.success(
        res,
        'success.business.testReminderCompleted',
        {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
            channels: channelsToTest,
            testMessage: testData.customMessage || 'Test reminder sent',
          },
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
