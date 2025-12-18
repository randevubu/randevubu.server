import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notificationService';
import { TranslationService } from '../../core/translationService';
import { NotificationChannel } from '../../../types/business';
import {
  NotificationPayload,
  NotificationResult,
  NotificationStatus,
} from '../../../types/notification';
import { RepositoryContainer } from '../../../repositories';
import { UsageService } from '../usage/usageService';
import logger from '../../../utils/Logger/logger';
export interface TransactionalNotificationRequest {
  businessId: string;
  customerId: string;
  title: string;
  body: string;
  data?: NotificationPayload;
  appointmentId?: string;
  url?: string;
  // Override settings for critical transactional messages
  forceChannels?: NotificationChannel[];
  ignoreQuietHours?: boolean;
}

export interface MarketingNotificationRequest {
  businessId: string;
  customerIds: string[];
  title: string;
  body: string;
  data?: NotificationPayload;
  url?: string;
  // Marketing messages MUST respect all settings
}

export interface SystemAlertRequest {
  businessId: string;
  userId: string; // Business owner or staff
  title: string;
  body: string;
  smsMessage?: string; // Optional SMS-specific message (uses template)
  data?: NotificationPayload;
  appointmentId?: string;
  url?: string;
  // System alerts (like new appointments) respect business settings
}

export interface BulkNotificationRequest {
  businessId: string;
  recipients: Array<{
    customerId: string;
    personalizedData?: NotificationPayload;
  }>;
  title: string;
  body: string;
  baseData?: NotificationPayload;
  url?: string;
}

export interface NotificationGatewayResult {
  success: boolean;
  results: NotificationResult[];
  skippedChannels: Array<{
    channel: NotificationChannel;
    reason: string;
  }>;
  sentChannels: NotificationChannel[];
}

/**
 * Unified Notification Gateway
 *
 * Single entry point for ALL notifications across the application.
 * ALWAYS checks business notification settings before sending.
 * Respects quiet hours, enabled channels, rate limits, and user preferences.
 *
 * Usage:
 *   const gateway = new UnifiedNotificationGateway(prisma, repositories, usageService);
 *   await gateway.sendTransactional({ businessId, customerId, title, body });
 */
export class UnifiedNotificationGateway {
  private notificationService: NotificationService;

  constructor(
    private prisma: PrismaClient,
    private repositories: RepositoryContainer,
    private usageService?: UsageService
  ) {
    // Create translation service for notification translations
    const translationService = new TranslationService();

    this.notificationService = new NotificationService(
      repositories,
      translationService,
      usageService
    );
  }

  /**
   * Send transactional notifications (appointment confirmations, reminders, etc.)
   * These are critical messages that users expect to receive.
   * Still respects business settings but can override for critical messages.
   */
  async sendTransactional(
    request: TransactionalNotificationRequest
  ): Promise<NotificationGatewayResult> {
    // Get business notification settings
    const businessSettings =
      await this.repositories.businessNotificationSettingsRepository.findByBusinessId(
        request.businessId
      );

    if (!businessSettings) {
      logger.warn(
        `No notification settings found for business ${request.businessId}, using defaults`
      );
    }

    // Get user notification preferences
    const userPreferences = await this.notificationService.getNotificationPreferences(
      request.customerId
    );

    // Check if user has opted out of notifications
    if (userPreferences && !userPreferences.enableAppointmentReminders && !request.forceChannels) {
      return {
        success: false,
        results: [],
        skippedChannels: [
          { channel: NotificationChannel.PUSH, reason: 'User has disabled notifications' },
          { channel: NotificationChannel.SMS, reason: 'User has disabled notifications' },
        ],
        sentChannels: [],
      };
    }

    // Determine channels to use
    let channels: NotificationChannel[];
    if (request.forceChannels) {
      channels = request.forceChannels;
    } else {
      channels = this.determineEnabledChannels(
        businessSettings,
        userPreferences?.preferredChannels?.channels
      );
    }

    // Check quiet hours (unless explicitly ignored)
    if (!request.ignoreQuietHours) {
      const now = new Date();

      // Check business quiet hours
      if (
        businessSettings?.quietHours &&
        this.isInQuietHours(now, businessSettings.quietHours, businessSettings.timezone)
      ) {
        logger.info(`Skipping notification - within business quiet hours`);
        return {
          success: false,
          results: [],
          skippedChannels: channels.map((ch) => ({
            channel: ch,
            reason: 'Within business quiet hours',
          })),
          sentChannels: [],
        };
      }

      // Check user quiet hours
      if (userPreferences?.quietHours && userPreferences.timezone) {
        const quietHoursConfig = {
          enabled: true,
          startTime: userPreferences.quietHours.start,
          endTime: userPreferences.quietHours.end,
        };
        if (this.isInQuietHours(now, quietHoursConfig, userPreferences.timezone)) {
          logger.info(`Skipping notification - within user quiet hours`);
          return {
            success: false,
            results: [],
            skippedChannels: channels.map((ch) => ({
              channel: ch,
              reason: 'Within user quiet hours',
            })),
            sentChannels: [],
          };
        }
      }
    }

    // Send notifications through enabled channels
    return await this.sendThroughChannels(
      request.customerId,
      channels,
      request.title,
      request.body,
      request.businessId,
      request.appointmentId,
      request.data,
      request.url
    );
  }

  /**
   * Send marketing notifications (promotions, announcements, etc.)
   * ALWAYS respects all business settings and user preferences.
   * No overrides allowed.
   */
  async sendMarketing(request: MarketingNotificationRequest): Promise<NotificationGatewayResult[]> {
    const results: NotificationGatewayResult[] = [];

    for (const customerId of request.customerIds) {
      const result = await this.sendTransactional({
        businessId: request.businessId,
        customerId,
        title: request.title,
        body: request.body,
        data: request.data,
        url: request.url,
        // Marketing cannot override settings
        ignoreQuietHours: false,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Send system alerts to business owners/staff (new appointment, cancellation, etc.)
   * NOTE: Only sends push notifications - SMS is reserved for customers only.
   * SMS notifications for business owners/staff have been removed per business decision.
   */
  async sendSystemAlert(request: SystemAlertRequest): Promise<NotificationGatewayResult> {
    // Get business notification settings
    const businessSettings =
      await this.repositories.businessNotificationSettingsRepository.findByBusinessId(
        request.businessId
      );

    if (!businessSettings) {
      logger.warn(
        `No notification settings found for business ${request.businessId}, using defaults`
      );
    }

    // Determine channels - for system alerts, use business settings
    const channels = this.determineEnabledChannelsForBusiness(businessSettings);

    // Check business quiet hours
    const now = new Date();
    if (
      businessSettings?.quietHours &&
      this.isInQuietHours(now, businessSettings.quietHours, businessSettings.timezone)
    ) {
      logger.info(`Skipping system alert - within business quiet hours`);
      return {
        success: false,
        results: [],
        skippedChannels: channels.map((ch) => ({
          channel: ch,
          reason: 'Within business quiet hours',
        })),
        sentChannels: [],
      };
    }

    // Send notifications through enabled channels
    return await this.sendThroughChannels(
      request.userId,
      channels,
      request.title,
      request.body,
      request.businessId,
      request.appointmentId,
      request.data,
      request.url,
      request.smsMessage // Pass SMS-specific message if provided
    );
  }

  /**
   * Send bulk notifications to multiple recipients
   * Useful for batch operations like closure notifications
   */
  async sendBulk(request: BulkNotificationRequest): Promise<{
    successful: number;
    failed: number;
    results: NotificationGatewayResult[];
  }> {
    const results: NotificationGatewayResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const recipient of request.recipients) {
      const personalizedData = {
        ...request.baseData,
        ...recipient.personalizedData,
      };

      const result = await this.sendTransactional({
        businessId: request.businessId,
        customerId: recipient.customerId,
        title: request.title,
        body: request.body,
        data: personalizedData,
        url: request.url,
      });

      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed, results };
  }

  /**
   * Send SMS directly (for critical messages like verification codes)
   * This bypasses business settings - use sparingly and only for security-critical messages
   */
  async sendCriticalSMS(
    phoneNumber: string,
    message: string,
    context?: { requestId?: string }
  ): Promise<NotificationResult> {
    try {
      const { SMSService } = await import('../sms/smsService');
      const smsService = new SMSService();

      const result = await smsService.sendSMS({
        phoneNumber,
        message,
        context,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        channel: NotificationChannel.SMS,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send critical SMS',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED,
      };
    }
  }

  /**
   * Helper: Send notifications through specified channels
   */
  private async sendThroughChannels(
    userId: string,
    channels: NotificationChannel[],
    title: string,
    body: string,
    businessId: string,
    appointmentId?: string,
    data?: NotificationPayload,
    url?: string,
    smsMessage?: string // Optional SMS-specific message
  ): Promise<NotificationGatewayResult> {
    const results: NotificationResult[] = [];
    const skippedChannels: Array<{ channel: NotificationChannel; reason: string }> = [];
    const sentChannels: NotificationChannel[] = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case NotificationChannel.PUSH: {
            const pushResults = await this.notificationService.sendPushNotification({
              userId,
              appointmentId,
              businessId,
              title,
              body,
              data,
              url,
            });
            results.push(...pushResults);

            if (pushResults.some((r) => r.success)) {
              sentChannels.push(NotificationChannel.PUSH);
            }
            break;
          }

          case NotificationChannel.SMS: {
            // Check SMS quota
            if (this.usageService) {
              const canSendSms = await this.usageService.canSendSms(businessId);
              if (!canSendSms.allowed) {
                skippedChannels.push({
                  channel: NotificationChannel.SMS,
                  reason: `SMS quota exceeded: ${canSendSms.reason}`,
                });
                continue;
              }
            }

            // Get user phone number
            const user = await this.repositories.userRepository.findById(userId);
            if (!user?.phoneNumber) {
              skippedChannels.push({
                channel: NotificationChannel.SMS,
                reason: 'User phone number not found',
              });
              continue;
            }

            // Send SMS
            const { SMSService } = await import('../sms/smsService');
            const smsService = new SMSService();

            // Use SMS-specific message if provided (from template), otherwise format title/body
            const messageToSend = smsMessage || `${title}\n\n${body}`;
            const result = await smsService.sendSMS({
              phoneNumber: user.phoneNumber,
              message: messageToSend,
              context: { requestId: appointmentId || `notification-${Date.now()}` },
            });

            // Record SMS usage
            if (result.success && this.usageService) {
              await this.usageService.recordSmsUsage(businessId, 1);
            }

            results.push({
              success: result.success,
              messageId: result.messageId,
              error: result.error,
              channel: NotificationChannel.SMS,
              status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
            });

            if (result.success) {
              sentChannels.push(NotificationChannel.SMS);
            }
            break;
          }

          case NotificationChannel.EMAIL: {
            // Email not implemented yet
            skippedChannels.push({
              channel: NotificationChannel.EMAIL,
              reason: 'Email notifications not yet implemented',
            });
            break;
          }

          default:
            skippedChannels.push({
              channel,
              reason: 'Unsupported channel',
            });
        }
      } catch (error) {
        logger.error(`Error sending notification through ${channel}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          channel,
          status: NotificationStatus.FAILED,
        });
      }
    }

    return {
      success: results.some((r) => r.success),
      results,
      skippedChannels,
      sentChannels,
    };
  }

  /**
   * Helper: Determine enabled channels based on business settings and user preferences
   */
  private determineEnabledChannels(
    businessSettings: any,
    userPreferredChannels?: NotificationChannel[]
  ): NotificationChannel[] {
    const enabledChannels: NotificationChannel[] = [];

    // Start with business-enabled channels
    if (businessSettings?.pushEnabled) {
      enabledChannels.push(NotificationChannel.PUSH);
    }
    if (businessSettings?.smsEnabled) {
      enabledChannels.push(NotificationChannel.SMS);
    }
    if (businessSettings?.emailEnabled) {
      enabledChannels.push(NotificationChannel.EMAIL);
    }

    // If no business settings, use defaults
    if (enabledChannels.length === 0) {
      enabledChannels.push(NotificationChannel.PUSH);
    }

    // Filter by user preferences if provided
    if (userPreferredChannels && userPreferredChannels.length > 0) {
      return enabledChannels.filter((ch) => userPreferredChannels.includes(ch));
    }

    return enabledChannels;
  }

  /**
   * Helper: Determine enabled channels for business owner notifications
   * NOTE: SMS is NOT available for business owners/staff - only PUSH notifications
   * SMS is reserved for customers only (via sendCriticalSMS)
   */
  private determineEnabledChannelsForBusiness(businessSettings: any): NotificationChannel[] {
    const enabledChannels: NotificationChannel[] = [];

    // Only push notifications for business owners/staff (SMS removed per business decision)
    if (businessSettings?.pushEnabled) {
      enabledChannels.push(NotificationChannel.PUSH);
    }
    // SMS removed - business owners/staff only get push notifications
    // if (businessSettings?.smsEnabled) {
    //   enabledChannels.push(NotificationChannel.SMS);
    // }
    if (businessSettings?.emailEnabled) {
      enabledChannels.push(NotificationChannel.EMAIL);
    }

    // Default to push if no settings
    if (enabledChannels.length === 0) {
      enabledChannels.push(NotificationChannel.PUSH);
    }

    return enabledChannels;
  }

  /**
   * Helper: Check if current time is within quiet hours
   */
  private isInQuietHours(
    currentTime: Date,
    quietHours: { enabled?: boolean; startTime: string; endTime: string },
    timezone: string
  ): boolean {
    try {
      // If quiet hours not enabled, return false
      if (quietHours.enabled === false) {
        return false;
      }

      const currentTimeStr = currentTime.toLocaleTimeString('en-GB', {
        hour12: false,
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
      });

      const current = this.timeStringToMinutes(currentTimeStr);
      const start = this.timeStringToMinutes(quietHours.startTime);
      const end = this.timeStringToMinutes(quietHours.endTime);

      // Handle overnight quiet hours (e.g., 22:00 - 06:00)
      if (start > end) {
        return current >= start || current <= end;
      } else {
        return current >= start && current <= end;
      }
    } catch (error) {
      logger.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Helper: Convert time string (HH:MM) to minutes
   */
  private timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get notification service instance (for advanced use cases)
   */
  getNotificationService(): NotificationService {
    return this.notificationService;
  }
}
