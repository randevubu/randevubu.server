// @ts-ignore - node-cron is available in Docker container
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notificationService';
import { AppointmentService } from './appointmentService';
import { BusinessService } from './businessService';
import { UpcomingAppointment, AppointmentStatus, NotificationChannel } from '../types/business';
import { getCurrentTimeInIstanbul } from '../utils/timezoneHelper';

export class AppointmentReminderService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

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

      this.isRunning = true;
      try {
        await this.processAppointmentReminders();
      } catch (error) {
        console.error('❌ Error in appointment reminder scheduler:', error);
      } finally {
        this.isRunning = false;
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
          const results = await this.sendAppointmentReminder(appointment);
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          successCount += successful;
          failureCount += failed;

          // Mark reminder as sent for this appointment
          await this.appointmentService.markReminderSent(appointment.id);
          
          console.log(`✅ Reminder sent for appointment ${appointment.id} (${successful} successful, ${failed} failed)`);
        } catch (error) {
          failureCount++;
          console.error(`❌ Failed to send reminder for appointment ${appointment.id}:`, error);
        }
      }

      console.log(`📊 Reminder batch complete: ${successCount} successful, ${failureCount} failed`);
      
    } catch (error) {
      console.error('❌ Error processing appointment reminders:', error);
    }
  }

  // Get appointments that need reminders
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
    const reminderTimings = businessSettings.reminderTiming || userPreferences?.reminderTiming?.hours?.map(h => h * 60) || [60, 1440];

    // Check if current time matches any of the reminder timings (within 2 minutes tolerance)
    const shouldSendNow = reminderTimings.some(reminderMinutes => {
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
    const enabledChannels = availableChannels.filter(channel => {
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
}