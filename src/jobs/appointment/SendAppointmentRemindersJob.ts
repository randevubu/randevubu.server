/**
 * SendAppointmentRemindersJob
 * 
 * Background job that sends reminders for upcoming appointments.
 * 
 * Features:
 * - Checks appointments 1-2 hours in advance
 * - Respects business and user notification preferences
 * - Supports multiple channels (SMS, Email, Push)
 * - Respects quiet hours
 * - Retry mechanism with exponential backoff
 * - Distributed locking for horizontal scaling
 * - Prometheus metrics
 */

import { BaseJob } from "../base/BaseJob";
import { AppointmentRepository } from "../../repositories/appointmentRepository";
import { NotificationService } from "../../services/domain/notification";
import { AppointmentService } from "../../services/domain/appointment/appointmentService";
import { BusinessService } from "../../services/domain/business";
import { UpcomingAppointment, AppointmentStatus, NotificationChannel } from "../../types/business";
import { getCurrentTimeInIstanbul } from "../../utils/timezoneHelper";
import redisClient from "../../lib/redis/redis";
import logger from "../../utils/Logger/logger";

export class SendAppointmentRemindersJob extends BaseJob {
    private readonly LOCK_KEY = 'appointment-reminder-lock';
    private readonly LOCK_TTL = 120; // 2 minutes
    private readonly MAX_RETRIES = 3;

    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly notificationService: NotificationService,
        private readonly appointmentService: AppointmentService,
        private readonly businessService: BusinessService
    ) {
        super();
    }

    getName(): string {
        return "appointment_reminders";
    }

    async execute(): Promise<void> {
        // Try to acquire distributed lock for horizontal scaling
        const lockAcquired = await this.acquireLock();
        if (!lockAcquired) {
            logger.info('⏭️ Another instance is processing reminders, skipping...');
            return;
        }

        try {
            await this.processAppointmentReminders();
        } finally {
            await this.releaseLock();
        }
    }

    private async processAppointmentReminders(): Promise<void> {
        const now = getCurrentTimeInIstanbul();

        logger.info(`🔍 Checking for appointment reminders at ${now.toLocaleTimeString()}`);

        // Get appointments in the next hour that haven't had reminders sent
        const upcomingAppointments = await this.getAppointmentsNeedingReminders(now);

        if (upcomingAppointments.length === 0) {
            logger.info('📅 No appointments need reminders at this time');
            return;
        }

        logger.info(`📢 Found ${upcomingAppointments.length} appointments needing reminders`);

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
                    logger.info(`✅ Reminder sent for appointment ${appointment.id} (${successful} successful, ${failed} failed)`);
                } else {
                    logger.warn(`⚠️ All channels failed for appointment ${appointment.id} - will retry next cycle`);
                }
            } catch (error) {
                failureCount++;
                logger.error(`❌ Failed to send reminder for appointment ${appointment.id}:`, error);
            }
        }

        logger.info(`📊 Reminder batch complete: ${successCount} successful, ${failureCount} failed`);

        // Log metrics for monitoring
        await this.logReminderMetrics(upcomingAppointments.length, successCount, failureCount);
    }

    private async getAppointmentsNeedingReminders(currentTime: Date): Promise<UpcomingAppointment[]> {
        const oneHourFromNow = new Date(currentTime.getTime() + 60 * 60 * 1000);
        const twoHoursFromNow = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);

        // Use repository to get appointments
        const result = await this.appointmentRepository.search({
            status: AppointmentStatus.CONFIRMED as any,
            startDate: oneHourFromNow.toISOString().split('T')[0],
            endDate: twoHoursFromNow.toISOString().split('T')[0],
        });

        // Filter for appointments that haven't had reminders sent
        const appointments = result.appointments.filter(apt =>
            !apt.reminderSentAt &&
            apt.startTime >= oneHourFromNow &&
            apt.startTime <= twoHoursFromNow
        );

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
                timezone: apt.business.timezone || 'Europe/Istanbul'
            },
            customer: {
                id: apt.customer.id,
                firstName: apt.customer.firstName || undefined,
                lastName: apt.customer.lastName || undefined,
                phoneNumber: apt.customer.phoneNumber
            }
        }));
    }

    private async sendAppointmentReminder(appointment: UpcomingAppointment) {
        // Get business notification settings first
        const businessSettings = await this.businessService.getOrCreateBusinessNotificationSettings(appointment.businessId);

        // Check if business has disabled appointment reminders
        if (!businessSettings.enableAppointmentReminders) {
            logger.info(`⏭️ Business ${appointment.businessId} has disabled appointment reminders`);
            return [];
        }

        // Get user's notification preferences
        const userPreferences = await this.notificationService.getNotificationPreferences(appointment.customerId);

        // User preferences can override business settings to disable reminders
        if (userPreferences && !userPreferences.enableAppointmentReminders) {
            logger.info(`⏭️ User ${appointment.customerId} has disabled appointment reminders`);
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
            logger.info(`⏭️ Not yet time to send reminder for appointment ${appointment.id} (${(minutesUntilAppointment / 60).toFixed(1)}h until appointment)`);
            return [];
        }

        // Check business quiet hours
        if (businessSettings.quietHours && this.isInBusinessQuietHours(getCurrentTimeInIstanbul(), businessSettings.quietHours, businessSettings.timezone)) {
            logger.info(`⏭️ Current time is within business quiet hours for appointment ${appointment.id}`);
            return [];
        }

        // Check user quiet hours (if any)
        if (userPreferences?.quietHours && this.isInQuietHours(getCurrentTimeInIstanbul(), userPreferences.quietHours, userPreferences.timezone)) {
            logger.info(`⏭️ Current time is within user quiet hours for appointment ${appointment.id}`);
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
            logger.info(`⏭️ No enabled channels for appointment ${appointment.id}`);
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
            const emailResults = await this.notificationService.sendEmailAppointmentReminder(appointment);
            results.push(...emailResults);
        }

        return results;
    }

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
            logger.error('Error checking business quiet hours:', error);
            return false;
        }
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
            logger.error('Error checking user quiet hours:', error);
            return false;
        }
    }

    private timeStringToMinutes(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private async acquireLock(): Promise<boolean> {
        try {
            const lockValue = `${process.pid}-${Date.now()}`;
            const acquired = await redisClient.setnx(this.LOCK_KEY, lockValue);
            if (acquired === 1) {
                await redisClient.expire(this.LOCK_KEY, this.LOCK_TTL);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('❌ Error acquiring reminder lock:', error);
            // If Redis is down, allow processing (fail open)
            return true;
        }
    }

    private async releaseLock(): Promise<void> {
        try {
            await redisClient.del(this.LOCK_KEY);
        } catch (error) {
            logger.error('❌ Error releasing reminder lock:', error);
        }
    }

    private async sendReminderWithRetry(appointment: UpcomingAppointment, attempt = 1): Promise<any[]> {
        try {
            return await this.sendAppointmentReminder(appointment);
        } catch (error) {
            if (attempt >= this.MAX_RETRIES) {
                logger.error(`❌ Failed to send reminder after ${this.MAX_RETRIES} attempts for appointment ${appointment.id}:`, error);
                await this.logFailedReminder(appointment, error);
                return [];
            }

            // Exponential backoff: 2^attempt seconds
            const delayMs = Math.pow(2, attempt) * 1000;
            logger.info(`⏳ Retry ${attempt}/${this.MAX_RETRIES} for appointment ${appointment.id} after ${delayMs}ms`);

            await new Promise(resolve => setTimeout(resolve, delayMs));

            return await this.sendReminderWithRetry(appointment, attempt + 1);
        }
    }

    private async logFailedReminder(appointment: UpcomingAppointment, error: unknown): Promise<void> {
        try {
            logger.error('📝 DEAD LETTER QUEUE - Failed reminder:', {
                appointmentId: appointment.id,
                customerId: appointment.customerId,
                businessId: appointment.businessId,
                appointmentTime: appointment.startTime,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
        } catch (logError) {
            logger.error('❌ Error logging failed reminder:', logError);
        }
    }

    private async logReminderMetrics(
        totalProcessed: number,
        successCount: number,
        failureCount: number
    ): Promise<void> {
        try {
            const deliveryRate = totalProcessed > 0 ? (successCount / totalProcessed * 100).toFixed(2) : '0.00';
            const timestamp = new Date().toISOString();

            logger.info('📊 REMINDER METRICS:', {
                timestamp,
                totalProcessed,
                successCount,
                failureCount,
                deliveryRate: `${deliveryRate}%`,
                processingTime: new Date().toISOString()
            });

            // Store metrics in Redis for real-time dashboards
            try {
                const metricsKey = `reminder-metrics:${new Date().toISOString().split('T')[0]}`;
                await redisClient.hincrby(metricsKey, 'totalProcessed', totalProcessed);
                await redisClient.hincrby(metricsKey, 'successCount', successCount);
                await redisClient.hincrby(metricsKey, 'failureCount', failureCount);
                await redisClient.expire(metricsKey, 86400 * 7); // Keep for 7 days
            } catch (redisError) {
                logger.error('⚠️ Failed to store metrics in Redis:', redisError);
            }
        } catch (error) {
            logger.error('❌ Error logging reminder metrics:', error);
        }
    }
}
