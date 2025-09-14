import { PrismaClient, Prisma } from '@prisma/client';
// @ts-ignore - web-push is available in Docker container
import * as webpush from 'web-push';
import { 
  NotificationChannel, 
  NotificationStatus,
  PushSubscriptionData,
  PushSubscriptionRequest,
  NotificationPreferenceData,
  NotificationPreferenceRequest,
  SendPushNotificationRequest,
  UpcomingAppointment
} from '../types/business';

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
}

export interface EnhancedClosureData {
  id: string;
  businessId: string;
  businessName: string;
  startDate: Date;
  endDate?: Date;
  reason: string;
  type: string;
  message?: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  serviceId?: string;
  staffId?: string;
}

export interface RescheduleSuggestion {
  originalAppointmentId: string;
  suggestedSlots: TimeSlot[];
  message: string;
}

export class NotificationService {
  constructor(private prisma: PrismaClient) {
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
    channels: NotificationChannel[]
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
            result = await this.sendClosurePushNotification(customerId, closureData);
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
          closureData.message || this.generateClosureMessage(closureData),
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
          closureData.message || this.generateClosureMessage(closureData),
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
      const availabilityAlert = await this.prisma.availabilityAlert.findFirst({
        where: {
          customerId,
          businessId,
          isActive: true
        },
        include: {
          business: true,
          service: true
        }
      });

      if (!availabilityAlert) {
        return [{
          success: false,
          error: 'No active availability alert found',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED
        }];
      }

      const preferences = availabilityAlert.notificationPreferences as {
        channels: NotificationChannel[];
      };

      const message = this.generateAvailabilityMessage(
        availabilityAlert.business.name,
        availableSlots,
        availabilityAlert.service?.name
      );

      const results: NotificationResult[] = [];

      for (const channel of preferences.channels) {
        const result = await this.sendAvailabilityNotification(
          customerId,
          channel,
          message,
          availabilityAlert.business.name,
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
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: true,
          business: true,
          service: true
        }
      });

      if (!appointment) {
        return {
          success: false,
          error: 'Appointment not found',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED
        };
      }

      const message = this.generateRescheduleMessage(
        appointment.business.name,
        appointment.service.name,
        appointment.startTime,
        suggestions
      );

      // Default to email for reschedule notifications
      return await this.sendEmailNotification(appointment.customerId, {
        id: appointmentId,
        businessId: appointment.businessId,
        businessName: (appointment as any).business?.name || 'Business Name',
        startDate: appointment.startTime,
        reason: 'Reschedule required due to business closure',
        type: 'RESCHEDULE',
        message
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
  ): Promise<NotificationResult> {
    // TODO: Implement actual SMS service integration (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS notification to customer ${customerId} about closure ${closureData.id}`);
    
    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      messageId: `sms-${Date.now()}`,
      channel: NotificationChannel.SMS,
      status: NotificationStatus.SENT
    };
  }


  private async sendClosurePushNotification(
    customerId: string,
    closureData: EnhancedClosureData
  ): Promise<NotificationResult> {
    const message = closureData.message || this.generateClosureMessage(closureData);
    
    const results = await this.sendPushNotification({
      userId: customerId,
      appointmentId: undefined,
      businessId: closureData.businessId,
      title: 'Business Closure Notice',
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
    await this.prisma.closureNotification.create({
      data: {
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        closureId,
        customerId,
        channel,
        message,
        sentAt: result.success ? new Date() : null,
        status: result.status,
        errorMessage: result.error
      }
    });
  }

  private generateClosureMessage(closureData: EnhancedClosureData): string {
    const formatDate = (date: Date) => date.toLocaleDateString();
    const endDateText = closureData.endDate ? ` until ${formatDate(closureData.endDate)}` : '';
    
    return `${closureData.businessName} will be closed starting ${formatDate(closureData.startDate)}${endDateText}. Reason: ${closureData.reason}`;
  }

  private generateAvailabilityMessage(
    businessName: string,
    slots: TimeSlot[],
    serviceName?: string
  ): string {
    const serviceText = serviceName ? ` for ${serviceName}` : '';
    const slotCount = slots.length;
    
    return `Good news! ${businessName} now has ${slotCount} available slot${slotCount > 1 ? 's' : ''}${serviceText}. Book now to secure your appointment.`;
  }

  private generateRescheduleMessage(
    businessName: string,
    serviceName: string,
    originalTime: Date,
    suggestions: RescheduleSuggestion[]
  ): string {
    const formatDateTime = (date: Date) => date.toLocaleString();
    
    return `Your appointment at ${businessName} for ${serviceName} scheduled on ${formatDateTime(originalTime)} needs to be rescheduled due to a business closure. We have ${suggestions.length} alternative time slots available for you.`;
  }

  async getNotificationDeliveryStats(closureId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byChannel: Record<NotificationChannel, number>;
  }> {
    const notifications = await this.prisma.closureNotification.findMany({
      where: { closureId }
    });

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
    
    await this.prisma.availabilityAlert.create({
      data: {
        id: alertId,
        customerId,
        businessId,
        serviceId,
        preferredDates: JSON.stringify(preferredDates),
        notificationPreferences: JSON.stringify({ channels: notificationChannels }),
        isActive: true
      }
    });

    return alertId;
  }

  async deactivateAvailabilityAlert(alertId: string, customerId: string): Promise<void> {
    await this.prisma.availabilityAlert.updateMany({
      where: {
        id: alertId,
        customerId
      },
      data: {
        isActive: false
      }
    });
  }

  // Subscription-related notification methods
  async sendRenewalConfirmation(
    phoneNumber: string,
    businessName: string,
    planName: string,
    nextBillingDate: Date
  ): Promise<NotificationResult> {
    const message = `Your subscription to ${planName} for ${businessName} has been successfully renewed. Next billing date: ${nextBillingDate.toLocaleDateString()}.`;
    
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
    expiryDate: Date
  ): Promise<NotificationResult> {
    const message = `Your subscription to ${planName} for ${businessName} expires on ${expiryDate.toLocaleDateString()}. Please renew to avoid service interruption.`;
    
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
    expiryDate: Date
  ): Promise<NotificationResult> {
    const message = `Payment failed for your ${businessName} subscription. Failed attempts: ${failedPaymentCount}. Service expires on ${expiryDate.toLocaleDateString()}. Please update your payment method.`;
    
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

  // Push Notification Methods

  async subscribeToPush(userId: string, subscriptionData: PushSubscriptionRequest): Promise<PushSubscriptionData> {
    const subscriptionId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // @ts-ignore - pushSubscription model exists in Prisma schema
    const subscription = await this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscriptionData.endpoint
        }
      },
      update: {
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        deviceName: subscriptionData.deviceName,
        deviceType: subscriptionData.deviceType || 'web',
        userAgent: subscriptionData.userAgent,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        id: subscriptionId,
        userId,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        deviceName: subscriptionData.deviceName,
        deviceType: subscriptionData.deviceType || 'web',
        userAgent: subscriptionData.userAgent,
        isActive: true,
      }
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

    // @ts-ignore - pushSubscription model exists in Prisma schema
    const result = await this.prisma.pushSubscription.updateMany({
      where,
      data: { isActive: false }
    });

    return result.count > 0;
  }

  async getUserPushSubscriptions(userId: string, activeOnly = true): Promise<PushSubscriptionData[]> {
    const where: any = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    // @ts-ignore - pushSubscription model exists in Prisma schema
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where,
      orderBy: { lastUsedAt: 'desc' }
    });

    return subscriptions as PushSubscriptionData[];
  }

  async updateNotificationPreferences(
    userId: string, 
    preferences: NotificationPreferenceRequest
  ): Promise<NotificationPreferenceData> {
    const preferenceId = `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // @ts-ignore - notificationPreference model exists in Prisma schema
    const result = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        id: preferenceId,
        userId,
        enableAppointmentReminders: preferences.enableAppointmentReminders ?? true,
        enableBusinessNotifications: preferences.enableBusinessNotifications ?? true,
        enablePromotionalMessages: preferences.enablePromotionalMessages ?? false,
        reminderTiming: JSON.stringify(preferences.reminderTiming ?? { hours: [1, 24] }),
        preferredChannels: JSON.stringify(preferences.preferredChannels ?? { channels: ['PUSH', 'SMS'] }),
        quietHours: preferences.quietHours ? JSON.stringify(preferences.quietHours) : Prisma.JsonNull,
        timezone: preferences.timezone ?? 'Europe/Istanbul',
      },
      update: {
        enableAppointmentReminders: preferences.enableAppointmentReminders,
        enableBusinessNotifications: preferences.enableBusinessNotifications,
        enablePromotionalMessages: preferences.enablePromotionalMessages,
        reminderTiming: preferences.reminderTiming ? JSON.stringify(preferences.reminderTiming) : undefined,
        preferredChannels: preferences.preferredChannels ? JSON.stringify(preferences.preferredChannels) : undefined,
        quietHours: preferences.quietHours ? JSON.stringify(preferences.quietHours) : undefined,
        timezone: preferences.timezone,
      }
    });

    return {
      ...result,
      reminderTiming: JSON.parse(result.reminderTiming as string),
      preferredChannels: JSON.parse(result.preferredChannels as string),
      quietHours: result.quietHours ? JSON.parse(result.quietHours as string) : undefined,
    } as NotificationPreferenceData;
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferenceData | null> {
    // @ts-ignore - notificationPreference model exists in Prisma schema
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!preferences) return null;

    return {
      ...preferences,
      reminderTiming: JSON.parse(preferences.reminderTiming as string),
      preferredChannels: JSON.parse(preferences.preferredChannels as string),
      quietHours: preferences.quietHours ? JSON.parse(preferences.quietHours as string) : undefined,
    } as NotificationPreferenceData;
  }

  async sendPushNotification(request: SendPushNotificationRequest): Promise<NotificationResult[]> {
    const subscriptions = await this.getUserPushSubscriptions(request.userId, true);
    
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
        // @ts-ignore - pushNotification model exists in Prisma schema
        await this.prisma.pushNotification.create({
          data: {
            id: notificationId,
            subscriptionId: subscription.id,
            appointmentId: request.appointmentId,
            businessId: request.businessId,
            title: request.title,
            body: request.body,
            icon: request.icon,
            badge: request.badge,
            data: request.data ? JSON.stringify(request.data) : Prisma.JsonNull,
            status: NotificationStatus.PENDING,
          }
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
        // @ts-ignore - pushNotification model exists in Prisma schema
        await this.prisma.pushNotification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          }
        });

        // Update subscription last used
        // @ts-ignore - pushSubscription model exists in Prisma schema
        await this.prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() }
        });

        results.push({
          success: true,
          messageId: notificationId,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.SENT
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if subscription is invalid
        if (errorMessage.includes('410') || errorMessage.includes('gone')) {
          // Disable invalid subscription
          // @ts-ignore - pushSubscription model exists in Prisma schema
          await this.prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false }
          });
        }

        // Update notification status
        if (subscription.id) {
          try {
            // @ts-ignore - pushNotification model exists in Prisma schema
            await this.prisma.pushNotification.updateMany({
              where: {
                subscriptionId: subscription.id,
                status: NotificationStatus.PENDING
              },
              data: {
                status: NotificationStatus.FAILED,
                errorMessage,
              }
            });
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

    const title = 'Appointment Reminder';
    const body = `You have an appointment for ${appointment.service.name} at ${appointment.business.name} at ${appointment.startTime.toLocaleTimeString()}`;
    
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

  async sendBatchPushNotifications(userIds: string[], notification: Omit<SendPushNotificationRequest, 'userId'>): Promise<{
    successful: number;
    failed: number;
    results: NotificationResult[];
  }> {
    const allResults: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const results = await this.sendPushNotification({
          userId,
          ...notification
        });
        
        allResults.push(...results);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        successful += successCount;
        failed += failCount;
      } catch (error) {
        failed++;
        allResults.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.FAILED
        });
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
    // @ts-ignore - pushSubscription model exists in Prisma schema
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true }
    });

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
      // @ts-ignore - pushNotification model exists in Prisma schema
      this.prisma.pushNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointment: {
            select: {
              id: true,
              startTime: true,
              service: { select: { name: true } },
              business: { select: { name: true } }
            }
          },
          business: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      // @ts-ignore - pushNotification model exists in Prisma schema
      this.prisma.pushNotification.count({ where })
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