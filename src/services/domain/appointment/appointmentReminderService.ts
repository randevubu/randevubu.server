// @ts-ignore - node-cron is available in Docker container
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../notification';
import { AppointmentService } from './appointmentService';
import { BusinessService } from '../business';
import { UpcomingAppointment, AppointmentStatus, NotificationChannel } from '../../../types/business';
import { getCurrentTimeInIstanbul } from '../../../utils/timezoneHelper';
import redisClient from '../../../lib/redis/redis';

export class AppointmentReminderService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private readonly LOCK_KEY = 'appointment-reminder-lock';
  private readonly LOCK_TTL = 120; // 2 minutes - longer than cron interval to prevent overlaps
  private readonly MAX_RETRIES = 3;

  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService,
    private appointmentService: AppointmentService,
    private businessService: BusinessService
  ) {}

  // Start the appointment reminder scheduler
  start(): void {
    if (this.cronJob) {
      console.log('📅 Appointment reminder scheduler is already running');
      return;
    }

    // Run every minute to check for appointments needing reminders
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        console.log('⏭️ Appointment reminder check already running, skipping...');
        return;
      }

      // Try to acquire distributed lock for horizontal scaling
      const lockAcquired = await this.acquireLock();
      if (!lockAcquired) {
        console.log('⏭️ Another instance is processing reminders, skipping...');
        return;
      }

      this.isRunning = true;
      try {
        await this.processAppointmentReminders();
      } catch (error) {
        console.error('❌ Error in appointment reminder scheduler:', error);
      } finally {
        this.isRunning = false;
        await this.releaseLock();
      }
    }, {
      scheduled: false // Don't start immediately
    });

    this.cronJob.start();
    console.log('📅 Appointment reminder scheduler started (runs every minute)');
  }

  // Stop the scheduler
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('📅 Appointment reminder scheduler stopped');
    }
  }

  // Check for appointments that need reminders
  private async processAppointmentReminders(): Promise<void> {
    const now = getCurrentTimeInIstanbul();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    console.log(`🔍 Checking for appointment reminders at ${now.toLocaleTimeString()}`);

    try {
      // Get appointments in the next hour that haven't had reminders sent
      const upcomingAppointments = await this.getAppointmentsNeedingReminders(now);
      
      if (upcomingAppointments.length === 0) {
        console.log('📅 No appointments need reminders at this time');
        return;
      }

      console.log(`📢 Found ${upcomingAppointments.length} appointments needing reminders`);

      let successCount = 0;
      let failureCount = 0;

      for (const appointment of upcomingAppointments) {
        try {
          // Use retry mechanism for sending reminders
          const results = await this.sendReminderWithRetry(appointment);
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;

          successCount += successful;
          failureCount += failed;

          // Only mark as sent if at least one channel succeeded
          if (successful > 0) {
            await this.appointmentService.markReminderSent(appointment.id);
            console.log(`✅ Reminder sent for appointment ${appointment.id} (${successful} successful, ${failed} failed)`);
          } else {
            console.warn(`⚠️ All channels failed for appointment ${appointment.id} - will retry next cycle`);
          }
        } catch (error) {
          failureCount++;
          console.error(`❌ Failed to send reminder for appointment ${appointment.id}:`, error);
        }
      }

      console.log(`📊 Reminder batch complete: ${successCount} successful, ${failureCount} failed`);

      // Log metrics for monitoring
      await this.logReminderMetrics(upcomingAppointments.length, successCount, failureCount);

    } catch (error) {
      console.error('❌ Error processing appointment reminders:', error);
    }
  }

  // Get appointments that need reminders
  // Optimized query: Only check appointments in next 2 hours to reduce database load
  private async getAppointmentsNeedingReminders(currentTime: Date): Promise<UpcomingAppointment[]> {
    const oneHourFromNow = new Date(currentTime.getTime() + 60 * 60 * 1000);
    const twoHoursFromNow = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);

    // Query appointments in the next 1-2 hours that haven't had reminders sent
    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: {
          gte: oneHourFromNow,
          lte: twoHoursFromNow
        },
        status: AppointmentStatus.CONFIRMED,
        reminderSent: false
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            duration: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            timezone: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Convert to UpcomingAppointment format
    return appointments.map(apt => ({
      id: apt.id,
      businessId: apt.businessId,
      customerId: apt.customerId,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status as AppointmentStatus,
      service: {
        id: apt.service.id,
        name: apt.service.name,
        duration: apt.service.duration
      },
      business: {
        id: apt.business.id,
        name: apt.business.name,
        timezone: apt.business.timezone
      },
      customer: {
        id: apt.customer.id,
        firstName: apt.customer.firstName || undefined,
        lastName: apt.customer.lastName || undefined,
        phoneNumber: apt.customer.phoneNumber
      }
    }));
  }

  // Send reminder for a specific appointment
  private async sendAppointmentReminder(appointment: UpcomingAppointment) {
    // Get business notification settings first
    const businessSettings = await this.businessService.getOrCreateBusinessNotificationSettings(appointment.businessId);

    // Check if business has disabled appointment reminders
    if (!businessSettings.enableAppointmentReminders) {
      console.log(`⏭️ Business ${appointment.businessId} has disabled appointment reminders`);
      return [];
    }

    // Get user's notification preferences
    const userPreferences = await this.notificationService.getNotificationPreferences(appointment.customerId);

    // User preferences can override business settings to disable reminders
    if (userPreferences && !userPreferences.enableAppointmentReminders) {
      console.log(`⏭️ User ${appointment.customerId} has disabled appointment reminders`);
      return [];
    }

    // Determine timing: Business settings take precedence, fall back to user preferences
    const minutesUntilAppointment = (appointment.startTime.getTime() - Date.now()) / (1000 * 60);
    const reminderTimings = businessSettings.reminderTiming || userPreferences?.reminderTiming?.hours?.map((h: number) => h * 60) || [60, 1440];

    // Check if current time matches any of the reminder timings (within 2 minutes tolerance)
    const shouldSendNow = reminderTimings.some((reminderMinutes: number) => {
      const timeDiff = Math.abs(minutesUntilAppointment - reminderMinutes);
      return timeDiff <= 2; // Within 2 minutes of the reminder time
    });

    if (!shouldSendNow) {
      console.log(`⏭️ Not yet time to send reminder for appointment ${appointment.id} (${(minutesUntilAppointment / 60).toFixed(1)}h until appointment)`);
      return [];
    }

    // Check business quiet hours
    if (businessSettings.quietHours && this.isInBusinessQuietHours(getCurrentTimeInIstanbul(), businessSettings.quietHours, businessSettings.timezone)) {
      console.log(`⏭️ Current time is within business quiet hours for appointment ${appointment.id}`);
      return [];
    }

    // Check user quiet hours (if any)
    if (userPreferences?.quietHours && this.isInQuietHours(getCurrentTimeInIstanbul(), userPreferences.quietHours, userPreferences.timezone)) {
      console.log(`⏭️ Current time is within user quiet hours for appointment ${appointment.id}`);
      return [];
    }

    // Determine channels: Business settings take precedence, fall back to user preferences
    const availableChannels = businessSettings.reminderChannels || userPreferences?.preferredChannels?.channels || [NotificationChannel.PUSH];

    // Filter channels based on what's enabled in business settings
    const enabledChannels = availableChannels.filter((channel: NotificationChannel) => {
      switch (channel) {
        case NotificationChannel.SMS:
          return businessSettings.smsEnabled;
        case NotificationChannel.PUSH:
          return businessSettings.pushEnabled;
        case NotificationChannel.EMAIL:
          return businessSettings.emailEnabled;
        default:
          return false;
      }
    });

    if (enabledChannels.length === 0) {
      console.log(`⏭️ No enabled channels for appointment ${appointment.id}`);
      return [];
    }

    const results = [];

    // Send push notification if enabled
    if (enabledChannels.includes(NotificationChannel.PUSH)) {
      const pushResults = await this.notificationService.sendAppointmentReminder(appointment);
      results.push(...pushResults);
    }

    // Send SMS if enabled
    if (enabledChannels.includes(NotificationChannel.SMS)) {
      const smsResults = await this.notificationService.sendSMSAppointmentReminder(appointment);
      results.push(...smsResults);
    }

    // Send email if enabled
    if (enabledChannels.includes(NotificationChannel.EMAIL)) {
      // TODO: Implement email reminders
      console.log(`📧 Email reminder would be sent to user ${appointment.customerId}`);
    }

    return results;
  }

  // Manually trigger reminder check (for testing)
  async checkRemindersNow(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    appointments: string[];
  }> {
    console.log('🔄 Manual reminder check triggered');
    
    if (this.isRunning) {
      throw new Error('Reminder check is already running');
    }

    this.isRunning = true;
    
    try {
      const now = getCurrentTimeInIstanbul();
      const upcomingAppointments = await this.getAppointmentsNeedingReminders(now);
      
      let successCount = 0;
      let failureCount = 0;
      const processedAppointments: string[] = [];

      for (const appointment of upcomingAppointments) {
        try {
          const results = await this.sendAppointmentReminder(appointment);
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          successCount += successful;
          failureCount += failed;
          processedAppointments.push(appointment.id);

          // Mark reminder as sent
          await this.appointmentService.markReminderSent(appointment.id);
        } catch (error) {
          failureCount++;
          console.error(`Failed to process appointment ${appointment.id}:`, error);
        }
      }

      return {
        processed: upcomingAppointments.length,
        successful: successCount,
        failed: failureCount,
        appointments: processedAppointments
      };
      
    } finally {
      this.isRunning = false;
    }
  }

  // Get current status of the scheduler
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    nextRun: Date | null;
  } {
    return {
      isRunning: this.cronJob !== null,
      isProcessing: this.isRunning,
      nextRun: this.cronJob ? new Date(Date.now() + 60000) : null // Next minute
    };
  }

  // Get appointments for a specific time range (for admin/debug)
  async getAppointmentsInRange(
    startTime: Date,
    endTime: Date,
    includeReminded = false
  ): Promise<UpcomingAppointment[]> {
    const where: Record<string, unknown> = {
      startTime: {
        gte: startTime,
        lte: endTime
      },
      status: AppointmentStatus.CONFIRMED
    };

    if (!includeReminded) {
      where.reminderSent = false;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            duration: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            timezone: true
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return appointments.map(apt => ({
      id: apt.id,
      businessId: apt.businessId,
      customerId: apt.customerId,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status as AppointmentStatus,
      service: {
        id: apt.service.id,
        name: apt.service.name,
        duration: apt.service.duration
      },
      business: {
        id: apt.business.id,
        name: apt.business.name,
        timezone: apt.business.timezone
      },
      customer: {
        id: apt.customer.id,
        firstName: apt.customer.firstName || undefined,
        lastName: apt.customer.lastName || undefined,
        phoneNumber: apt.customer.phoneNumber
      }
    }));
  }

  // Helper method to check if current time is within business quiet hours
  private isInBusinessQuietHours(currentTime: Date, quietHours: { start: string; end: string }, timezone: string): boolean {
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
      console.error('Error checking business quiet hours:', error);
      return false;
    }
  }

  // Helper method to check if current time is within user quiet hours
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
      console.error('Error checking user quiet hours:', error);
      return false;
    }
  }

  // Helper method to convert time string (HH:MM) to minutes
  private timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Acquire distributed lock for horizontal scaling
   * Uses Redis SET NX (set if not exists) with expiration
   */
  private async acquireLock(): Promise<boolean> {
    try {
      const lockValue = `${process.pid}-${Date.now()}`; // Unique identifier for this instance
      // Using ioredis setnx then expire pattern
      const acquired = await redisClient.setnx(this.LOCK_KEY, lockValue);
      if (acquired === 1) {
        await redisClient.expire(this.LOCK_KEY, this.LOCK_TTL);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error acquiring reminder lock:', error);
      // If Redis is down, allow processing (fail open)
      return true;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(): Promise<void> {
    try {
      await redisClient.del(this.LOCK_KEY);
    } catch (error) {
      console.error('❌ Error releasing reminder lock:', error);
      // Lock will auto-expire, so this is not critical
    }
  }

  /**
   * Send reminder with retry mechanism
   * Industry standard: Exponential backoff for failed notifications
   */
  private async sendReminderWithRetry(appointment: UpcomingAppointment, attempt = 1): Promise<any[]> {
    try {
      return await this.sendAppointmentReminder(appointment);
    } catch (error) {
      if (attempt >= this.MAX_RETRIES) {
        console.error(`❌ Failed to send reminder after ${this.MAX_RETRIES} attempts for appointment ${appointment.id}:`, error);
        // Log to dead letter queue (could be database table or separate queue)
        await this.logFailedReminder(appointment, error);
        return [];
      }

      // Exponential backoff: 2^attempt seconds
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retry ${attempt}/${this.MAX_RETRIES} for appointment ${appointment.id} after ${delayMs}ms`);

      await new Promise(resolve => setTimeout(resolve, delayMs));

      return await this.sendReminderWithRetry(appointment, attempt + 1);
    }
  }

  /**
   * Log failed reminder to database for monitoring
   * Industry standard: Dead letter queue for failed messages
   */
  private async logFailedReminder(appointment: UpcomingAppointment, error: unknown): Promise<void> {
    try {
      // Log to console for now - could be expanded to separate table or monitoring service
      console.error('📝 DEAD LETTER QUEUE - Failed reminder:', {
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        businessId: appointment.businessId,
        appointmentTime: appointment.startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      // TODO: Store in dedicated failed_reminders table or send to monitoring service
      // await this.prisma.failedReminder.create({
      //   data: {
      //     appointmentId: appointment.id,
      //     error: error instanceof Error ? error.message : String(error),
      //     retryCount: this.MAX_RETRIES,
      //     failedAt: new Date()
      //   }
      // });

    } catch (logError) {
      console.error('❌ Error logging failed reminder:', logError);
    }
  }

  /**
   * Log reminder metrics for monitoring and analytics
   * Industry standard: Track delivery rates, failures, and performance
   */
  private async logReminderMetrics(
    totalProcessed: number,
    successCount: number,
    failureCount: number
  ): Promise<void> {
    try {
      const deliveryRate = totalProcessed > 0 ? (successCount / totalProcessed * 100).toFixed(2) : '0.00';
      const timestamp = new Date().toISOString();

      // Log metrics to console (could be sent to monitoring service like Datadog, New Relic, etc.)
      console.log('📊 REMINDER METRICS:', {
        timestamp,
        totalProcessed,
        successCount,
        failureCount,
        deliveryRate: `${deliveryRate}%`,
        processingTime: new Date().toISOString()
      });

      // Store metrics in Redis for real-time dashboards
      try {
        const metricsKey = `reminder-metrics:${new Date().toISOString().split('T')[0]}`; // Daily key
        await redisClient.hincrby(metricsKey, 'totalProcessed', totalProcessed);
        await redisClient.hincrby(metricsKey, 'successCount', successCount);
        await redisClient.hincrby(metricsKey, 'failureCount', failureCount);
        await redisClient.expire(metricsKey, 86400 * 7); // Keep for 7 days
      } catch (redisError) {
        console.error('⚠️ Failed to store metrics in Redis:', redisError);
      }

      // TODO: Send to external monitoring service
      // await monitoringService.trackMetric('appointment_reminders', {
      //   totalProcessed,
      //   successCount,
      //   failureCount,
      //   deliveryRate: parseFloat(deliveryRate)
      // });

    } catch (error) {
      console.error('❌ Error logging reminder metrics:', error);
    }
  }
}