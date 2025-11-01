import { Prisma } from '@prisma/client';
// @ts-ignore - web-push is available in Docker container
import * as webpush from 'web-push';
import logger from '../../../utils/Logger/logger';
import { UsageService } from '../usage/usageService';
import { RepositoryContainer } from '../../../repositories';
import { 
  NotificationChannel,
  PushSubscriptionData,
  PushSubscriptionRequest,
  NotificationPreferenceData,
  NotificationPreferenceRequest,
  SendPushNotificationRequest,
  UpcomingAppointment
} from '../../../types/business';
import { NotificationStatus } from '../../../types/notification';
import { TranslationService, TranslationParams } from '../../translationServiceFallback';

import { NotificationResult, EnhancedClosureData } from '../../../types/notification';
import { TimeSlot, RescheduleSuggestion } from '../../../types/appointment';

export class NotificationService {
  private translationService: TranslationService;

  constructor(private repositories: RepositoryContainer, private usageService?: UsageService) {
    this.translationService = new TranslationService();
    // Configure web-push if VAPID keys are available
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@randevubu.com';
    
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } else {
      console.warn('VAPID keys not configured. Push notifications will not work.');
    }
  }

  async sendClosureNotification(
    customerId: string,
    closureData: EnhancedClosureData,
    channels: NotificationChannel[],
    language: string = 'tr'
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      try {
        let result: NotificationResult;

        switch (channel) {
          case NotificationChannel.EMAIL:
            result = await this.sendEmailNotification(customerId, closureData);
            break;
          case NotificationChannel.SMS:
            result = await this.sendSMSNotification(customerId, closureData);
            break;
          case NotificationChannel.PUSH:
            result = await this.sendClosurePushNotification(customerId, closureData, language);
            break;
          default:
            result = {
              success: false,
              error: `Unsupported notification channel: ${channel}`,
              channel,
              status: NotificationStatus.FAILED
            };
        }

        // Log notification attempt
        await this.logNotification(
          closureData.id,
          customerId,
          channel,
          closureData.message || await this.generateClosureMessage(closureData, language),
          result
        );

        results.push(result);
      } catch (error) {
        const failedResult: NotificationResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          channel,
          status: NotificationStatus.FAILED
        };

        await this.logNotification(
          closureData.id,
          customerId,
          channel,
          closureData.message || await this.generateClosureMessage(closureData, language),
          failedResult
        );

        results.push(failedResult);
      }
    }

    return results;
  }

  async sendAvailabilityAlert(
    customerId: string,
    businessId: string,
    availableSlots: TimeSlot[]
  ): Promise<NotificationResult[]> {
    try {
      // Get user's notification preferences for this business
      const availabilityAlert = await this.repositories.notificationRepository.findAvailabilityAlertByCustomerAndBusiness(
        customerId,
        businessId
      );

      if (!availabilityAlert) {
        return [{
          success: false,
          error: 'No active availability alert found',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED
        }];
      }

      // Fetch business details
      const business = await this.repositories.businessRepository.findById(businessId);
      if (!business) {
        return [{
          success: false,
          error: 'Business not found',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED
        }];
      }

      // Fetch service details if serviceId is provided
      let serviceName: string | undefined;
      if (availabilityAlert.serviceId) {
        const service = await this.repositories.serviceRepository.findById(availabilityAlert.serviceId);
        serviceName = service?.name;
      }

      const preferences = availabilityAlert.notificationPreferences as {
        channels: NotificationChannel[];
      };

      const message = await this.generateAvailabilityMessage(
        business.name,
        availableSlots,
        serviceName,
        'tr' // Default to Turkish for now
      );

      const results: NotificationResult[] = [];

      for (const channel of preferences.channels) {
        const result = await this.sendAvailabilityNotification(
          customerId,
          channel,
          message,
          business.name,
          availableSlots
        );
        results.push(result);
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send availability alert',
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.FAILED
      }];
    }
  }

  async sendRescheduleNotification(
    appointmentId: string,
    suggestions: RescheduleSuggestion[]
  ): Promise<NotificationResult> {
    try {
      const appointment = await this.repositories.appointmentRepository.findByIdWithDetails(appointmentId);

      if (!appointment) {
        return {
          success: false,
          error: 'Appointment not found',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED
        };
      }

      const message = await this.generateRescheduleMessage(
        appointment.business.name,
        appointment.service.name,
        appointment.startTime,
        suggestions,
        'tr' // Default to Turkish for now
      );

      // Default to email for reschedule notifications
      return await this.sendEmailNotification(appointment.customerId, {
        id: appointmentId,
        businessId: appointment.businessId,
        businessName: appointment.business?.name || 'Business Name',
        startDate: appointment.startTime,
        endDate: appointment.endTime,
        reason: 'Reschedule required due to business closure',
        type: 'RESCHEDULE',
        message,
        isRecurring: false,
        affectedAppointments: 1,
        rescheduledAppointments: 0,
        cancelledAppointments: 0,
        totalRevenueImpact: 0
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reschedule notification',
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.FAILED
      };
    }
  }

  private async sendEmailNotification(
    customerId: string,
    closureData: EnhancedClosureData
  ): Promise<NotificationResult> {
    // TODO: Implement actual email service integration (SendGrid, AWS SES, etc.)
    console.log(`Sending email notification to customer ${customerId} about closure ${closureData.id}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: `email-${Date.now()}`,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.SENT
    };
  }

  private async sendSMSNotification(
    customerId: string,
    closureData: EnhancedClosureData
  ): Promise<NotificationResult>;
  private async sendSMSNotification(
    phoneNumber: string,
    message: string
  ): Promise<NotificationResult>;
  private async sendSMSNotification(
    customerIdOrPhone: string,
    closureDataOrMessage: EnhancedClosureData | string
  ): Promise<NotificationResult> {
    // Overloaded method handler
    if (typeof closureDataOrMessage === 'string') {
      // Simple SMS with phone number and message
      const phoneNumber = customerIdOrPhone;
      const message = closureDataOrMessage;
      
      try {
        const { SMSService } = await import('../sms/smsService');
        const smsService = new SMSService();
        
        const result = await smsService.sendSMS({
          phoneNumber,
          message,
          context: { requestId: `notification-${Date.now()}` }
        });
        
        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          channel: NotificationChannel.SMS,
          status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send SMS',
          channel: NotificationChannel.SMS,
          status: NotificationStatus.FAILED
        };
      }
    }
    
    // Original implementation with customerId and closureData
    const customerId = customerIdOrPhone;
    const closureData = closureDataOrMessage as EnhancedClosureData;
    try {
      // Check if business can send SMS based on subscription limits
      if (this.usageService) {
        const canSendSms = await this.usageService.canSendSms(closureData.businessId);
        if (!canSendSms.allowed) {
          return {
            success: false,
            error: `SMS quota exceeded: ${canSendSms.reason}`,
            channel: NotificationChannel.SMS,
            status: NotificationStatus.FAILED
          };
        }
      }

      // Get customer details for phone number
      const customer = await this.repositories.userRepository.findById(customerId);

      if (!customer?.phoneNumber) {
        return {
          success: false,
          error: 'Customer phone number not found',
          channel: NotificationChannel.SMS,
          status: NotificationStatus.FAILED
        };
      }

      // Format closure message
      const message = `${closureData.businessName} bilgilendirme: ${closureData.reason}. ${closureData.startDate.toLocaleDateString('tr-TR')} tarihinde kapıyız. Detaylar: https://randevubu.com/business/${closureData.businessId}`;

      // Use the existing SMS service
      const { SMSService } = await import('../sms/smsService');
      const smsService = new SMSService();

      const result = await smsService.sendSMS({
        phoneNumber: customer.phoneNumber,
        message,
        context: { requestId: `closure-${closureData.id}` }
      });

      // Record SMS usage after successful sending
      if (result.success && this.usageService) {
        await this.usageService.recordSmsUsage(closureData.businessId, 1);
      }

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        channel: NotificationChannel.SMS,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS notification',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }  // End of sendSMSNotification overloaded method


  private async sendClosurePushNotification(
    customerId: string,
    closureData: EnhancedClosureData,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const message = closureData.message || await this.generateClosureMessage(closureData, language);
    const title = language === 'tr' ? 'İş Yeri Kapanış Bildirimi' : 'Business Closure Notice';
    
    const results = await this.sendPushNotification({
      userId: customerId,
      appointmentId: undefined,
      businessId: closureData.businessId,
      title,
      body: message,
      icon: undefined,
      badge: undefined,
      data: {
        closureId: closureData.id,
        businessId: closureData.businessId,
        businessName: closureData.businessName,
        startDate: closureData.startDate.toISOString(),
        endDate: closureData.endDate?.toISOString(),
        reason: closureData.reason,
        type: closureData.type
      },
      url: `/business/${closureData.businessId}`
    });

    return results[0] || {
      success: false,
      error: 'No push subscriptions found',
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.FAILED
    };
  }

  private async sendAvailabilityNotification(
    customerId: string,
    channel: NotificationChannel,
    message: string,
    businessName: string,
    slots: TimeSlot[]
  ): Promise<NotificationResult> {
    // TODO: Implement based on channel type
    console.log(`Sending ${channel} availability notification to customer ${customerId}`);
    
    return {
      success: true,
      messageId: `availability-${channel}-${Date.now()}`,
      channel,
      status: NotificationStatus.SENT
    };
  }

  private async logNotification(
    closureId: string,
    customerId: string,
    channel: NotificationChannel,
    message: string,
    result: NotificationResult
  ): Promise<void> {
    await this.repositories.notificationRepository.createClosureNotification({
      closureId,
      customerId,
      channel,
      message,
      status: (result.status ?? NotificationStatus.PENDING) as any
    });
  }

  private async generateClosureMessage(closureData: EnhancedClosureData, language: string = 'tr'): Promise<string> {
    const translationParams: TranslationParams = {
      businessName: closureData.businessName,
      startDate: this.formatDateForLanguage(closureData.startDate, language),
      reason: closureData.reason
    };

    // Add endDate only if it exists
    if (closureData.endDate) {
      translationParams.endDate = this.formatDateForLanguage(closureData.endDate, language);
    }
    
    return await this.translationService.translate('notifications.businessClosureNotice', translationParams, language);
  }

  private async generateAvailabilityMessage(
    businessName: string,
    slots: TimeSlot[],
    serviceName?: string,
    language: string = 'tr'
  ): Promise<string> {
    const translationParams: TranslationParams = {
      businessName,
      slotCount: slots.length
    };

    // Add serviceName only if it exists
    if (serviceName) {
      translationParams.serviceName = serviceName;
    }
    
    return await this.translationService.translate('notifications.availabilityAlert', translationParams, language);
  }

  private async generateRescheduleMessage(
    businessName: string,
    serviceName: string,
    originalTime: Date,
    suggestions: RescheduleSuggestion[],
    language: string = 'tr'
  ): Promise<string> {
    const translationParams: TranslationParams = {
      businessName,
      serviceName,
      originalTime: this.formatDateTimeForLanguage(originalTime, language),
      suggestionCount: suggestions.length
    };
    
    return await this.translationService.translate('notifications.rescheduleNotification', translationParams, language);
  }

  // Helper methods for date/time formatting
  private formatDateForLanguage(date: Date, language: string = 'tr'): string {
    if (language === 'tr') {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return date.toLocaleDateString('en-US');
  }

  private formatTimeForLanguage(date: Date, language: string = 'tr'): string {
    if (language === 'tr') {
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatDateTimeForLanguage(date: Date, language: string = 'tr'): string {
    if (language === 'tr') {
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async getNotificationDeliveryStats(closureId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byChannel: Record<NotificationChannel, number>;
  }> {
    const notifications = await this.repositories.notificationRepository.findClosureNotificationsByClosure(closureId);

    const stats = {
      total: notifications.length,
      sent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
      failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
      pending: notifications.filter(n => n.status === NotificationStatus.PENDING).length,
      byChannel: {} as Record<NotificationChannel, number>
    };

    // Initialize channel counts
    Object.values(NotificationChannel).forEach(channel => {
      stats.byChannel[channel] = notifications.filter(n => n.channel === channel).length;
    });

    return stats;
  }

  async createAvailabilityAlert(
    customerId: string,
    businessId: string,
    serviceId: string | null,
    preferredDates: { startDate: Date; endDate: Date }[],
    notificationChannels: NotificationChannel[]
  ): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.repositories.notificationRepository.createAvailabilityAlert({
      customerId,
      businessId,
      serviceId: serviceId ?? undefined,
      preferredDates: {
        startDate: (preferredDates[0]?.startDate || new Date()).toISOString(),
        endDate: (preferredDates[0]?.endDate || new Date()).toISOString()
      },
      notificationPreferences: { 
        channels: notificationChannels,
        timing: [60, 24 * 60]
      }
    });

    return alertId;
  }

  async deactivateAvailabilityAlert(alertId: string, customerId: string): Promise<void> {
    await this.repositories.notificationRepository.updateAvailabilityAlertStatus(alertId, false);
  }

  // Subscription-related notification methods
  async sendRenewalConfirmation(
    phoneNumber: string,
    businessName: string,
    planName: string,
    nextBillingDate: Date,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      planName,
      nextBillingDate: this.formatDateForLanguage(nextBillingDate, language)
    };
    
    const message = await this.translationService.translate('notifications.subscriptionRenewalConfirmation', translationParams, language);
    
    try {
      // For now, just log the notification - implement actual SMS sending later
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  async sendRenewalReminder(
    phoneNumber: string,
    businessName: string,
    planName: string,
    expiryDate: Date,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      planName,
      expiryDate: this.formatDateForLanguage(expiryDate, language)
    };
    
    const message = await this.translationService.translate('notifications.subscriptionRenewalReminder', translationParams, language);
    
    try {
      // For now, just log the notification - implement actual SMS sending later
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  async sendPaymentFailureNotification(
    phoneNumber: string,
    businessName: string,
    failedPaymentCount: number,
    expiryDate: Date,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      failedPaymentCount,
      expiryDate: this.formatDateForLanguage(expiryDate, language)
    };
    
    const message = await this.translationService.translate('notifications.paymentFailureNotification', translationParams, language);
    
    try {
      // For now, just log the notification - implement actual SMS sending later
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  /**
   * Send payment retry failure notification
   */
  async sendPaymentRetryFailure(
    phoneNumber: string,
    businessName: string,
    retryCount: number,
    maxRetries: number,
    nextRetryDate: Date,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      retryCount,
      maxRetries,
      nextRetryDate: this.formatDateForLanguage(nextRetryDate, language)
    };
    
    const message = await this.translationService.translate('notifications.paymentRetryFailure', translationParams, language);
    
    try {
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  /**
   * Send payment escalation notification to support team
   */
  async sendPaymentEscalation(
    phoneNumber: string,
    businessName: string,
    planName: string,
    failureCount: number,
    expiryDate: Date,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      planName,
      failureCount,
      expiryDate: this.formatDateForLanguage(expiryDate, language)
    };
    
    const message = await this.translationService.translate('notifications.paymentEscalation', translationParams, language);
    
    try {
      // Send to support team (could be email, Slack, etc.)
      console.log(`🚨 ESCALATION - SMS to ${phoneNumber}: ${message}`);
      
      // Also log for support team monitoring
      logger.warn(`Payment escalation for business ${businessName}: ${failureCount} failures`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  /**
   * Send subscription cancellation notification
   */
  async sendSubscriptionCancellation(
    phoneNumber: string,
    businessName: string,
    planName: string,
    failureCount: number,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      planName,
      failureCount
    };
    
    const message = await this.translationService.translate('notifications.subscriptionCancellation', translationParams, language);
    
    try {
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  /**
   * Send grace period warning notification
   */
  async sendGracePeriodWarning(
    phoneNumber: string,
    businessName: string,
    planName: string,
    daysRemaining: number,
    language: string = 'tr'
  ): Promise<NotificationResult> {
    const translationParams: TranslationParams = {
      businessName,
      planName,
      daysRemaining
    };
    
    const message = await this.translationService.translate('notifications.gracePeriodWarning', translationParams, language);
    
    try {
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      };
    }
  }

  /**
   * Send multi-channel notification (SMS + Email + Push)
   */
  async sendMultiChannelNotification(
    userId: string,
    phoneNumber: string,
    email: string,
    message: string,
    channels: NotificationChannel[] = [NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.PUSH]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      try {
        let result: NotificationResult;
        
        switch (channel) {
          case NotificationChannel.SMS:
            result = await this.sendSMSNotification(phoneNumber, message);
            break;
          case NotificationChannel.EMAIL:
            result = await this.sendEmail(email, 'Payment Notification', message);
            break;
          case NotificationChannel.PUSH:
            result = await this.sendPushNotificationSimple(userId, 'Payment Update', message);
            break;
          default:
            result = {
              success: false,
              error: 'Unsupported channel',
              channel,
              status: NotificationStatus.FAILED
            };
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          channel,
          status: NotificationStatus.FAILED
        });
      }
    }

    return results;
  }

  /**
   * Send email notification (placeholder for future implementation)
   */
  async sendEmail(email: string, subject: string, message: string): Promise<NotificationResult> {
    try {
      // TODO: Implement actual email sending
      console.log(`Email to ${email}: ${subject} - ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.FAILED
      };
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  async sendPushNotificationSimple(userId: string, title: string, message: string): Promise<NotificationResult> {
    try {
      // TODO: Implement actual push notification sending
      console.log(`Push to user ${userId}: ${title} - ${message}`);
      
      return {
        success: true,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.SENT
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.FAILED
      };
    }
  }

  // Push Notification Methods

  async subscribeToPush(userId: string, subscriptionData: PushSubscriptionRequest): Promise<PushSubscriptionData> {
    const subscriptionId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('Creating/updating push subscription:', {
      userId,
      endpoint: subscriptionData.endpoint,
      subscriptionId
    });

    const subscription = await this.repositories.notificationRepository.upsertPushSubscription({
      userId,
      endpoint: subscriptionData.endpoint,
      p256dh: subscriptionData.keys.p256dh,
      auth: subscriptionData.keys.auth,
      userAgent: subscriptionData.userAgent,
      deviceName: subscriptionData.deviceName,
      deviceType: subscriptionData.deviceType || 'web'
    });

    return subscription as PushSubscriptionData;
  }

  async unsubscribeFromPush(userId: string, endpoint?: string, subscriptionId?: string): Promise<boolean> {
    const where: any = { userId };
    
    if (subscriptionId) {
      where.id = subscriptionId;
    } else if (endpoint) {
      where.endpoint = endpoint;
    } else {
      throw new Error('Either endpoint or subscriptionId must be provided');
    }

    return await this.repositories.notificationRepository.deactivatePushSubscription(userId, subscriptionId, endpoint);
  }

  async getUserPushSubscriptions(userId: string, activeOnly = true): Promise<PushSubscriptionData[]> {
    const where: any = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    const subscriptions = await this.repositories.notificationRepository.findPushSubscriptionsByUser(userId);
    // Map repository type to business type, converting null to undefined
    return subscriptions.map(sub => ({
      ...sub,
      deviceName: sub.deviceName ?? undefined,
      deviceType: sub.deviceType ?? undefined,
      userAgent: sub.userAgent ?? undefined
    }));
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreferenceRequest
  ): Promise<NotificationPreferenceData> {
    const preferenceId = `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await this.repositories.notificationRepository.upsertUserNotificationPreference(userId, {
      ...preferences,
      quietHours: preferences.quietHours ? {
        enabled: true,
        startTime: preferences.quietHours.start,
        endTime: preferences.quietHours.end,
        days: [1, 2, 3, 4, 5, 6, 7],
        timezone: preferences.quietHours.timezone
      } : null
    });
    // Map repository type to business type
    return {
      ...result,
      preferredChannels: {
        channels: result.preferredChannels.channels as NotificationChannel[]
      },
      quietHours: result.quietHours ? {
        start: result.quietHours.startTime,
        end: result.quietHours.endTime,
        timezone: result.quietHours.timezone
      } : undefined
    };
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferenceData | null> {
    const preferences = await this.repositories.notificationRepository.findNotificationPreference(userId);

    if (!preferences) return null;

    // Map repository type to business type
    return {
      ...preferences,
      preferredChannels: {
        channels: preferences.preferredChannels.channels as NotificationChannel[]
      },
      quietHours: preferences.quietHours ? {
        start: preferences.quietHours.startTime,
        end: preferences.quietHours.endTime,
        timezone: preferences.quietHours.timezone
      } : undefined
    };
  }

  async sendPushNotification(request: SendPushNotificationRequest): Promise<NotificationResult[]> {
    const subscriptions = await this.getUserPushSubscriptions(request.userId, true);

    console.log(`Found ${subscriptions.length} active push subscriptions for user ${request.userId}:`,
      subscriptions.map(s => ({ id: s.id, endpoint: s.endpoint.substring(0, 50) + '...', isActive: s.isActive }))
    );

    if (subscriptions.length === 0) {
      return [{
        success: false,
        error: 'No active push subscriptions found for user',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.FAILED
      }];
    }

    const results: NotificationResult[] = [];
    
    for (const subscription of subscriptions) {
      try {
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create push notification record
        // For test appointments, set appointmentId to null to avoid foreign key constraints
        const isTestAppointment = request.appointmentId?.startsWith('test-');

        await this.repositories.notificationRepository.createPushNotification({
          subscriptionId: subscription.id,
          appointmentId: isTestAppointment ? null : request.appointmentId,
          businessId: request.businessId,
          title: request.title,
          body: request.body,
          icon: request.icon,
          badge: request.badge,
          data: request.data,
          status: NotificationStatus.PENDING
        });

        // Prepare web-push payload
        const payload = JSON.stringify({
          title: request.title,
          body: request.body,
          icon: request.icon,
          badge: request.badge,
          data: {
            ...request.data,
            appointmentId: request.appointmentId,
            businessId: request.businessId,
            url: request.url,
            notificationId,
          }
        });

        // Send push notification
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          }
        };

        await webpush.sendNotification(pushSubscription, payload);

        // Update notification status
        await this.repositories.notificationRepository.updatePushNotificationStatus(notificationId, NotificationStatus.SENT);

        // Update subscription last used
        await this.repositories.notificationRepository.updatePushSubscriptionLastUsed(subscription.id);

        results.push({
          success: true,
          messageId: notificationId,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.SENT
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log detailed error information for debugging
        console.error('Push notification error details:', {
          subscriptionId: subscription.id,
          endpoint: subscription.endpoint,
          error: errorMessage,
          errorObject: error
        });

        // Check if subscription is invalid
        const statusCode = (error as { statusCode?: number })?.statusCode;
        const errorBody = (error as { body?: string })?.body || '';

        const isInvalidSubscription = statusCode === 410 ||
                                    statusCode === 404 ||
                                    errorMessage.includes('410') ||
                                    errorMessage.includes('gone') ||
                                    errorMessage.includes('expired') ||
                                    errorMessage.includes('unsubscribed') ||
                                    errorBody.includes('expired') ||
                                    errorBody.includes('unsubscribed');

        console.log('Subscription validity check:', {
          statusCode,
          errorBody,
          isInvalidSubscription,
          subscriptionId: subscription.id
        });

        if (isInvalidSubscription) {
          console.log(`Disabling invalid subscription: ${subscription.id}, endpoint: ${subscription.endpoint}`);
          // Disable invalid subscription
          // @ts-ignore - pushSubscription model exists in Prisma schema
          await this.repositories.notificationRepository.updatePushSubscriptionStatus(subscription.userId, subscription.endpoint, false);
          console.log(`Successfully disabled subscription: ${subscription.id}`);
        }

        // Update notification status
        if (subscription.id) {
          try {
            await this.repositories.notificationRepository.updatePushNotificationStatusBySubscription(subscription.id, NotificationStatus.FAILED, errorMessage);
          } catch (dbError) {
            console.error('Failed to update notification status:', dbError);
          }
        }

        results.push({
          success: false,
          error: errorMessage,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.FAILED
        });
      }
    }

    return results;
  }

  async sendAppointmentReminder(appointment: UpcomingAppointment): Promise<NotificationResult[]> {
    // Check user's notification preferences
    const preferences = await this.getNotificationPreferences(appointment.customerId);
    
    if (preferences && !preferences.enableAppointmentReminders) {
      return [{
        success: false,
        error: 'User has disabled appointment reminders',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.FAILED
      }];
    }

    // Check quiet hours
    if (preferences?.quietHours && this.isInQuietHours(new Date(), preferences.quietHours, preferences.timezone)) {
      return [{
        success: false,
        error: 'Current time is within user quiet hours',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.FAILED
      }];
    }

    // Get user's language preference (default to Turkish)
    const userLanguage = preferences?.timezone?.includes('Istanbul') ? 'tr' : 'en';
    
    // Generate translated notification
    const translationParams: TranslationParams = {
      serviceName: appointment.service.name,
      businessName: appointment.business.name,
      time: this.formatTimeForLanguage(appointment.startTime, userLanguage)
    };
    
    const title = userLanguage === 'tr' ? 'Randevu Hatırlatması' : 'Appointment Reminder';
    const body = await this.translationService.translate('notifications.appointmentReminder', translationParams, userLanguage);
    
    const appointmentData = {
      appointmentId: appointment.id,
      businessId: appointment.businessId,
      serviceName: appointment.service.name,
      businessName: appointment.business.name,
      startTime: appointment.startTime.toISOString(),
    };

    return await this.sendPushNotification({
      userId: appointment.customerId,
      appointmentId: appointment.id,
      businessId: appointment.businessId,
      title,
      body,
      icon: undefined,
      badge: undefined,
      data: appointmentData,
      url: `/appointments/${appointment.id}`
    });
  }

  async sendSMSAppointmentReminder(appointment: UpcomingAppointment): Promise<NotificationResult[]> {
    // Check user's notification preferences
    const preferences = await this.getNotificationPreferences(appointment.customerId);

    if (preferences && !preferences.enableAppointmentReminders) {
      return [{
        success: false,
        error: 'User has disabled appointment reminders',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      }];
    }

    // Check quiet hours
    if (preferences?.quietHours && this.isInQuietHours(new Date(), preferences.quietHours, preferences.timezone)) {
      return [{
        success: false,
        error: 'Current time is within user quiet hours',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      }];
    }

    // Format the SMS message
    const appointmentDate = appointment.startTime.toLocaleDateString('tr-TR', {
      timeZone: appointment.business.timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const appointmentTime = appointment.startTime.toLocaleTimeString('tr-TR', {
      timeZone: appointment.business.timezone,
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `${appointment.business.name} randevu hatırlatması: ${appointment.service.name} hizmetiniz ${appointmentDate} tarihinde saat ${appointmentTime}'de. Detaylar: https://randevubu.com/appointments/${appointment.id}`;

    try {
      // Check if business can send SMS based on subscription limits
      if (this.usageService) {
        const canSendSms = await this.usageService.canSendSms(appointment.businessId);
        if (!canSendSms.allowed) {
          return [{
            success: false,
            error: `SMS quota exceeded: ${canSendSms.reason}`,
            channel: NotificationChannel.SMS,
            status: NotificationStatus.FAILED
          }];
        }
      }

      // Use the existing SMS service
      const { SMSService } = await import('../sms/smsService');
      const smsService = new SMSService();

      const result = await smsService.sendSMS({
        phoneNumber: appointment.customer.phoneNumber,
        message,
        context: { requestId: `reminder-${appointment.id}` }
      });

      // Record SMS usage after successful sending
      if (result.success && this.usageService) {
        await this.usageService.recordSmsUsage(appointment.businessId, 1);
      }

      return [{
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        channel: NotificationChannel.SMS,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED
      }];

    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS reminder',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED
      }];
    }
  }

  async sendBatchPushNotifications(userIds: string[], notification: Omit<SendPushNotificationRequest, 'userId'>): Promise<{
    successful: number;
    failed: number;
    results: NotificationResult[];
  }> {
    // Industry Standard: Batch processing with concurrency control
    const BATCH_SIZE = 50;
    const MAX_CONCURRENT = 10;
    const allResults: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      
      // Process batch with concurrency control
      const batchPromises = batch.map(userId => 
        this.sendPushNotification({
          userId,
          ...notification
        })
      );

      // Use Promise.allSettled to handle individual failures
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const notificationResults = result.value;
          allResults.push(...notificationResults);
          
          const successCount = notificationResults.filter(r => r.success).length;
          const failCount = notificationResults.filter(r => !r.success).length;
          
          successful += successCount;
          failed += failCount;
        } else {
          failed++;
          allResults.push({
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            channel: NotificationChannel.PUSH,
            status: NotificationStatus.FAILED
          });
        }
      });

      // Add small delay between batches to prevent overwhelming external services
      if (i + BATCH_SIZE < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      successful,
      failed,
      results: allResults
    };
  }

  private isInQuietHours(currentTime: Date, quietHours: { start: string; end: string; timezone: string }, timezone: string): boolean {
    try {
      const currentTimeStr = currentTime.toLocaleTimeString('en-GB', { 
        hour12: false, 
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const current = this.timeStringToMinutes(currentTimeStr);
      const start = this.timeStringToMinutes(quietHours.start);
      const end = this.timeStringToMinutes(quietHours.end);
      
      // Handle overnight quiet hours (e.g., 22:00 - 06:00)
      if (start > end) {
        return current >= start || current <= end;
      } else {
        return current >= start && current <= end;
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  private timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async getNotificationHistory(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: NotificationStatus;
      appointmentId?: string;
      businessId?: string;
      from?: Date;
      to?: Date;
    }
  ): Promise<{
    notifications: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = Math.min(100, options?.limit || 20);
    const skip = (page - 1) * limit;

    // Get user's subscriptions
    const subscriptions = await this.repositories.notificationRepository.findPushSubscriptionsByUser(userId);

    const subscriptionIds = subscriptions.map((s: any) => s.id);

    const where: any = {
      subscriptionId: { in: subscriptionIds }
    };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.appointmentId) {
      where.appointmentId = options.appointmentId;
    }
    if (options?.businessId) {
      where.businessId = options.businessId;
    }
    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    const [notifications, total] = await Promise.all([
      this.repositories.notificationRepository.findPushNotificationsByUser(userId, { page, limit, status: options?.status as any }),
      this.repositories.notificationRepository.countPushNotificationsByUser(userId, { status: options?.status as any })
    ]);

    return {
      notifications: notifications.map((n: any) => ({
        ...n,
        data: n.data ? JSON.parse(n.data as string) : null
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getVapidPublicKey(): Promise<string | null> {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}