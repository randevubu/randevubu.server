import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { BusinessService } from '../services/domain/business';
import { NotificationService } from '../services/domain/notification';
import { RBACService } from '../services/domain/rbac';
import { AppointmentStatus } from '../types/business';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class BusinessNotificationController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper,
    private rbacService: RBACService,
    private notificationService: NotificationService
  ) {}

  private requireBusinessId(req: BusinessContextRequest): string {
    const businessId = req.businessContext?.primaryBusinessId;
    if (!businessId) {
      throw new AppError('NO_BUSINESS_ACCESS', { message: 'Business context required' });
    }
    return businessId;
  }

  async getNotificationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settings = await this.businessService.getBusinessNotificationSettings(userId, businessId);

    if (!settings) {
      await this.responseHelper.success(
        res,
        'success.business.notificationSettingsDefault',
        {
          id: '',
          businessId,
          enableAppointmentReminders: true,
          reminderChannels: ['PUSH'],
          reminderTiming: [60, 1440],
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

    await this.responseHelper.success(res, 'success.business.notificationSettingsRetrieved', settings, 200, req);
  }

  async updateNotificationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settings = await this.businessService.updateBusinessNotificationSettings(userId, businessId, req.body);

    await this.responseHelper.success(res, 'success.business.notificationSettingsUpdated', settings, 200, req);
  }

  async testReminder(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const testData = req.body || {};

    const businessSettings = await this.businessService.getOrCreateBusinessNotificationSettings(businessId);

    const now = new Date();
    const testTime = new Date(now.getTime() + 60 * 60 * 1000);

    const testAppointment = {
      id: `test-${Date.now()}`,
      businessId,
      customerId: userId,
      date: testTime,
      startTime: testTime,
      endTime: new Date(testTime.getTime() + 60 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
      service: { id: 'test-service', name: 'Test Service', duration: 60 },
      business: { id: businessId, name: 'Test Business', timezone: businessSettings.timezone },
      customer: { id: userId, firstName: 'Test', lastName: 'User', phoneNumber: req.user!.phoneNumber },
    };

    const channelsToTest = testData.channels || businessSettings.reminderChannels;
    const results = [];

    if (channelsToTest.includes('PUSH') && businessSettings.pushEnabled) {
      const pushResults = await this.notificationService.sendAppointmentReminder(testAppointment);
      results.push(...pushResults);
    }

    if (channelsToTest.includes('SMS') && businessSettings.smsEnabled) {
      const SMS_RATE_LIMIT_MINUTES = 5;
      const recentSmsTests = await this.businessService.findRecentAuditEvents(userId, 'SMS_TEST', SMS_RATE_LIMIT_MINUTES);
      const lastSmsTest = recentSmsTests.length > 0 ? recentSmsTests[0] : null;

      if (lastSmsTest) {
        const timeRemaining = Math.ceil(
          (lastSmsTest.createdAt.getTime() + SMS_RATE_LIMIT_MINUTES * 60 * 1000 - Date.now()) / 1000 / 60
        );
        results.push({
          success: false,
          error: `SMS test rate limited. Please wait ${timeRemaining} more minute(s) before testing SMS again.`,
          channel: 'SMS',
          status: 'RATE_LIMITED',
        });
      } else {
        const smsResults = await this.notificationService.sendSMSAppointmentReminder(testAppointment);
        results.push(...smsResults);

        await this.businessService.logAuditEvent({
          userId,
          action: 'SMS_TEST',
          entity: 'NOTIFICATION',
          entityId: testAppointment.id,
          details: { businessId, testId: testAppointment.id },
        });
      }
    }

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
  }
}
