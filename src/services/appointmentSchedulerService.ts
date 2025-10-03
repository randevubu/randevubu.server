// @ts-ignore - node-cron is available in Docker container
import { PrismaClient } from "@prisma/client";
import * as cron from "node-cron";
import { AppointmentStatus } from "../types/business";
import { logger } from "../utils/Logger/logger";
import { getCurrentTimeInIstanbul } from "../utils/timezoneHelper";

export interface AppointmentSchedulerConfig {
  autoCompleteSchedule?: string; // Cron expression, default: every 5 minutes
  timezone?: string; // Default: 'Europe/Istanbul'
  developmentMode?: boolean; // Enable for testing with accelerated schedules
}

export class AppointmentSchedulerService {
  private autoCompleteTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor(
    private prisma: PrismaClient,
    private config: AppointmentSchedulerConfig = {}
  ) {
    // Development mode uses accelerated schedules for testing
    const isDevelopment =
      config.developmentMode || process.env.NODE_ENV === "development";

    this.config = {
      autoCompleteSchedule: isDevelopment ? "*/1 * * * *" : "*/5 * * * *", // Every minute in dev, every 5 minutes in prod
      timezone: "Europe/Istanbul",
      developmentMode: isDevelopment,
      ...config,
    };
  }

  /**
   * Start the appointment scheduler
   */
  public start(): void {
    this.startAutoCompleteChecker();
    this.isRunning = true;

    const mode = this.config.developmentMode ? "DEVELOPMENT" : "PRODUCTION";
    logger.info(`📅 Appointment scheduler started in ${mode} mode`);

    if (this.config.developmentMode) {
      logger.info("⚡ Development schedules:");
      logger.info(
        `  - Auto-complete check: ${this.config.autoCompleteSchedule}`
      );
    }
  }

  /**
   * Stop all scheduled tasks
   */
  public stop(): void {
    if (this.autoCompleteTask) {
      this.autoCompleteTask.stop();
      this.autoCompleteTask = null;
      this.isRunning = false;
      logger.info("🛑 Appointment scheduler stopped");
    }
  }

  /**
   * Start the auto-complete checker
   * Automatically marks CONFIRMED appointments as COMPLETED when service time has ended
   */
  private startAutoCompleteChecker(): void {
    this.autoCompleteTask = cron.schedule(
      this.config.autoCompleteSchedule!,
      async () => {
        try {
          await this.processAutoCompleteAppointments();
        } catch (error) {
          logger.error("❌ Error in appointment auto-complete checker:", error);
        }
      },
      {
        scheduled: false,
        timezone: this.config.timezone,
      }
    );

    this.autoCompleteTask.start();
    logger.info(
      `✅ Auto-complete checker started (${this.config.autoCompleteSchedule})`
    );
  }

  /**
   * Process appointments that should be automatically completed
   */
  private async processAutoCompleteAppointments(): Promise<void> {
    const now = getCurrentTimeInIstanbul();

    // Find CONFIRMED appointments where endTime has passed
    const appointmentsToComplete = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        endTime: {
          lt: now, // endTime is less than current time
        },
      },
      include: {
        business: {
          select: {
            name: true,
            timezone: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (appointmentsToComplete.length === 0) {
      logger.debug("📋 No appointments to auto-complete");
      return;
    }

    logger.info(
      `🔄 Auto-completing ${appointmentsToComplete.length} appointments`
    );

    // Update appointments to COMPLETED status
    const appointmentIds = appointmentsToComplete.map((apt) => apt.id);

    const updateResult = await this.prisma.appointment.updateMany({
      where: {
        id: {
          in: appointmentIds,
        },
      },
      data: {
        status: AppointmentStatus.COMPLETED,
        updatedAt: now,
      },
    });

    logger.info(`✅ Auto-completed ${updateResult.count} appointments`);

    // Log details for monitoring
    if (this.config.developmentMode) {
      appointmentsToComplete.forEach((appointment) => {
        logger.debug(
          `  📝 ${appointment.id}: ${appointment.customer.firstName} ${appointment.customer.lastName} - ${appointment.service.name} at ${appointment.business.name}`
        );
      });
    }
  }

  /**
   * Get status of the scheduler (for health checks)
   */
  public getStatus(): {
    isRunning: boolean;
    config: AppointmentSchedulerConfig;
    nextRuns: {
      autoComplete: string | null;
    };
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextRuns: {
        autoComplete: this.getNextRunTime(),
      },
    };
  }

  /**
   * Calculate the next run time based on the cron expression
   */
  private getNextRunTime(): string | null {
    if (!this.autoCompleteTask || !this.config.autoCompleteSchedule) {
      return null;
    }

    try {
      // For simple cron expressions, we can calculate the next run time
      // This is a basic implementation - for production, consider using a proper cron parser
      const now = new Date();
      const cronExpression = this.config.autoCompleteSchedule;

      // Parse the cron expression (basic implementation)
      // Format: "*/5 * * * *" means every 5 minutes
      if (cronExpression.startsWith("*/")) {
        const interval = parseInt(cronExpression.split("*/")[1].split(" ")[0]);
        const nextRun = new Date(now.getTime() + interval * 60 * 1000);
        return nextRun.toISOString();
      }

      // For more complex expressions, return a generic message
      return `Next run based on: ${cronExpression}`;
    } catch (error) {
      logger.warn("Failed to calculate next run time:", error);
      return null;
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  public async triggerAutoComplete(): Promise<{ completed: number }> {
    logger.info("🔧 Manual trigger: Auto-completing appointments");

    const beforeCount = await this.prisma.appointment.count({
      where: { status: AppointmentStatus.CONFIRMED },
    });

    await this.processAutoCompleteAppointments();

    const afterCount = await this.prisma.appointment.count({
      where: { status: AppointmentStatus.CONFIRMED },
    });

    const completed = beforeCount - afterCount;

    return { completed };
  }
}
