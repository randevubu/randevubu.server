// @ts-ignore - node-cron is available in Docker container
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notificationService';
import { AppointmentService } from './appointmentService';
import { UpcomingAppointment, AppointmentStatus, NotificationChannel } from '../types/business';

export class AppointmentReminderService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService,
    private appointmentService: AppointmentService
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
    const now = new Date();
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
    // Check user's notification preferences
    const preferences = await this.notificationService.getNotificationPreferences(appointment.customerId);
    
    if (preferences && !preferences.enableAppointmentReminders) {
      console.log(`⏭️ User ${appointment.customerId} has disabled appointment reminders`);
      return [];
    }

    // Check if current time is within reminder timing preferences
    if (preferences?.reminderTiming) {
      const hoursUntilAppointment = (appointment.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const reminderHours = preferences.reminderTiming.hours;
      
      // Check if current time matches any of the preferred reminder hours
      const shouldSendNow = reminderHours.some(hour => {
        const timeDiff = Math.abs(hoursUntilAppointment - hour);
        return timeDiff < 0.1; // Within 6 minutes of the preferred hour
      });

      if (!shouldSendNow) {
        console.log(`⏭️ Not yet time to send reminder for appointment ${appointment.id} (${hoursUntilAppointment.toFixed(1)}h until appointment)`);
        return [];
      }
    }

    // Use preferred channels or default to PUSH
    const preferredChannels = preferences?.preferredChannels?.channels || [NotificationChannel.PUSH];
    const results = [];

    // Send push notification if PUSH is in preferred channels
    if (preferredChannels.includes(NotificationChannel.PUSH)) {
      const pushResults = await this.notificationService.sendAppointmentReminder(appointment);
      results.push(...pushResults);
    }

    // You can add SMS and Email reminders here if needed
    if (preferredChannels.includes(NotificationChannel.SMS)) {
      // TODO: Implement SMS reminders
      console.log(`📱 SMS reminder would be sent to ${appointment.customer.phoneNumber}`);
    }

    if (preferredChannels.includes(NotificationChannel.EMAIL)) {
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
      const now = new Date();
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
    const where: any = {
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
}