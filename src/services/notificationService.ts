import { PrismaClient } from '@prisma/client';
import { NotificationChannel, NotificationStatus } from '../types/business';

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
  constructor(private prisma: PrismaClient) {}

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
            result = await this.sendPushNotification(customerId, closureData);
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

  private async sendPushNotification(
    customerId: string,
    closureData: EnhancedClosureData
  ): Promise<NotificationResult> {
    // TODO: Implement actual push notification service (FCM, APNS, etc.)
    console.log(`Sending push notification to customer ${customerId} about closure ${closureData.id}`);
    
    // Simulate push notification
    await new Promise(resolve => setTimeout(resolve, 30));
    
    return {
      success: true,
      messageId: `push-${Date.now()}`,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT
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
}