// @ts-ignore - node-cron is available in Docker container
import { PrismaClient } from "@prisma/client";
import * as cron from "node-cron";
import { SubscriptionStatus, TrialConversionData } from "../../../types/business";

import { NotificationService } from "../notification";
import { PaymentService } from "../payment";
import { PaymentRetryService } from "../payment/paymentRetryService";

import { SchedulerConfig } from '../../../types/subscription';
import logger from "../../../utils/Logger/logger";
export class SubscriptionSchedulerService {
  private renewalTask: cron.ScheduledTask | null = null;
  private trialConversionTask: cron.ScheduledTask | null = null;
  private reminderTask: cron.ScheduledTask | null = null;
  private cleanupTask: cron.ScheduledTask | null = null;
  private retryTask: cron.ScheduledTask | null = null;
  private paymentRetryService: PaymentRetryService;

  constructor(
    private prisma: PrismaClient,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private config: SchedulerConfig = {}
  ) {
    // Development mode uses accelerated schedules for testing
    const isDevelopment =
      config.developmentMode || process.env.NODE_ENV === "development";

    this.config = {
      renewalCheckSchedule: isDevelopment ? "*/1 * * * *" : "0 2 * * *", // Every minute in dev, 2 AM in prod
      reminderSchedule: isDevelopment ? "*/2 * * * *" : "0 9 * * *", // Every 2 minutes in dev, 9 AM in prod
      cleanupSchedule: isDevelopment ? "*/5 * * * *" : "0 3 * * 0", // Every 5 minutes in dev, Sunday 3 AM in prod
      timezone: "Europe/Istanbul",
      developmentMode: isDevelopment,
      ...config,
    };

    // Initialize payment retry service
    this.paymentRetryService = new PaymentRetryService(
      this.prisma,
      this.paymentService,
      this.notificationService,
      {
        maxRetries: 5,
        retrySchedule: [0, 1, 3, 7, 14], // Immediate, 1 day, 3 days, 1 week, 2 weeks
        escalationThreshold: 3,
        gracePeriodDays: 30
      }
    );
  }

  /**
   * Start all scheduled tasks
   */
  public start(): void {
    this.startRenewalChecker();
    this.startTrialConversionChecker();
    this.startReminderService();
    this.startRetryService();
    this.startCleanupService();

    const mode = this.config.developmentMode ? "DEVELOPMENT" : "PRODUCTION";
    logger.info(`📅 Subscription scheduler started in ${mode} mode`);

    if (this.config.developmentMode) {
      logger.info(`⚡ Development schedules:`);
      logger.info(`   - Renewals: Every minute`);
      logger.info(`   - Trial Conversions: Every minute`);
      logger.info(`   - Reminders: Every 2 minutes`);
      logger.info(`   - Retry Service: Every 3 minutes`);
      logger.info(`   - Cleanup: Every 5 minutes`);
      logger.warn(`⚠️  DEVELOPMENT MODE - Do not use in production!`);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  public stop(): void {
    if (this.renewalTask) {
      this.renewalTask.stop();
      this.renewalTask = null;
    }
    if (this.trialConversionTask) {
      this.trialConversionTask.stop();
      this.trialConversionTask = null;
    }
    if (this.reminderTask) {
      this.reminderTask.stop();
      this.reminderTask = null;
    }
    if (this.retryTask) {
      this.retryTask.stop();
      this.retryTask = null;
    }
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
    }
    logger.info("📅 Subscription scheduler stopped");
  }

  /**
   * Start the subscription renewal checker
   * Runs daily to check for subscriptions that need renewal
   */
  private startRenewalChecker(): void {
    this.renewalTask = cron.schedule(
      this.config.renewalCheckSchedule!,
      async () => {
        logger.info("🔄 Running subscription renewal check...");
        await this.processSubscriptionRenewals();
      },
      {
        scheduled: true,
        timezone: this.config.timezone,
      }
    );
  }

  /**
   * Start the trial conversion checker
   * Runs daily to convert trials to active subscriptions
   */
  private startTrialConversionChecker(): void {
    this.trialConversionTask = cron.schedule(
      this.config.renewalCheckSchedule!, // Same schedule as renewals
      async () => {
        logger.info("🔄 Running trial conversion check...");
        await this.processTrialConversions();
      },
      {
        scheduled: true,
        timezone: this.config.timezone,
      }
    );
  }

  /**
   * Start the reminder service
   * Runs daily to send renewal reminders and payment failure notifications
   */
  private startReminderService(): void {
    this.reminderTask = cron.schedule(
      this.config.reminderSchedule!,
      async () => {
        logger.info("📧 Running renewal reminder service...");
        await this.sendRenewalReminders();
        await this.sendPaymentFailureNotifications();
      },
      {
        scheduled: true,
        timezone: this.config.timezone,
      }
    );
  }

  /**
   * Start the retry service
   * Runs to retry failed payments with enhanced retry logic
   */
  private startRetryService(): void {
    this.retryTask = cron.schedule(
      "*/3 * * * *", // Every 3 minutes in dev, 6 AM in prod
      async () => {
        logger.info("🔄 Running payment retry service...");
        await this.paymentRetryService.processFailedPayments();
      },
      {
        scheduled: true,
        timezone: this.config.timezone,
      }
    );
  }

  /**
   * Start the cleanup service
   * Runs weekly to clean up old failed payments and expired data
   */
  private startCleanupService(): void {
    this.cleanupTask = cron.schedule(
      this.config.cleanupSchedule!,
      async () => {
        logger.info("🧹 Running subscription cleanup...");
        await this.cleanupExpiredData();
      },
      {
        scheduled: true,
        timezone: this.config.timezone,
      }
    );
  }

  /**
   * Process trial conversions
   * Converts trials ending today to active subscriptions
   */
  private async processTrialConversions(): Promise<{
    processed: number;
    converted: number;
    failed: number;
  }> {
    try {
      const trialsEndingToday = await this.prisma.businessSubscription.findMany({
        where: {
          status: SubscriptionStatus.TRIAL,
          trialEnd: {
            lte: new Date()
          },
          paymentMethodId: { not: null }
        },
        include: {
          plan: true,
          business: {
            include: {
              owner: true
            }
          },
          paymentMethod: true
        }
      });

      let processed = 0;
      let converted = 0;
      let failed = 0;

      for (const trial of trialsEndingToday) {
        try {
          // Transform the trial data to match TrialConversionData interface
          const trialData: TrialConversionData = {
            id: trial.id,
            plan: {
              id: trial.plan.id,
              name: trial.plan.name,
              displayName: trial.plan.displayName,
              price: Number(trial.plan.price),
              currency: trial.plan.currency,
              billingInterval: trial.plan.billingInterval
            },
            paymentMethod: trial.paymentMethod ? {
              cardHolderName: trial.paymentMethod.cardHolderName,
              lastFourDigits: trial.paymentMethod.lastFourDigits,
              cardBrand: trial.paymentMethod.cardBrand || undefined,
              expiryMonth: trial.paymentMethod.expiryMonth,
              expiryYear: trial.paymentMethod.expiryYear
            } : undefined,
            business: {
              ownerId: trial.business.ownerId,
              owner: {
                firstName: trial.business.owner.firstName || undefined,
                lastName: trial.business.owner.lastName || undefined,
                phoneNumber: trial.business.owner.phoneNumber
              },
              name: trial.business.name,
              email: trial.business.email || undefined,
              phone: trial.business.phone || undefined,
              address: trial.business.address || undefined,
              city: trial.business.city || undefined,
              country: trial.business.country || undefined,
              postalCode: trial.business.postalCode || undefined
            }
          };
          
          await this.processIndividualTrialConversion(trialData);
          converted++;
          logger.info(
            `✅ Successfully converted trial ${trial.id} for business ${trial.business.name}`
          );
        } catch (error) {
          failed++;
          logger.error(
            `❌ Failed to convert trial ${trial.id}:`,
            error
          );

          // Mark trial as expired after failure
          await this.prisma.businessSubscription.update({
            where: { id: trial.id },
            data: {
              status: SubscriptionStatus.CANCELED,
              updatedAt: new Date()
            }
          });
        }
        processed++;
      }

      logger.info(
        `🔄 Trial conversion completed: ${processed} processed, ${converted} converted, ${failed} failed`
      );
      return { processed, converted, failed };
    } catch (error) {
      logger.error("❌ Error in trial conversion process:", error);
      return { processed: 0, converted: 0, failed: 0 };
    }
  }

  /**
   * Process individual trial conversion
   */
  private async processIndividualTrialConversion(trial: TrialConversionData): Promise<void> {
    if (!trial.paymentMethod) {
      throw new Error("No payment method available for trial conversion");
    }

    // Calculate new billing period
    const now = new Date();
    const newPeriodEnd = new Date(now);

    if (trial.plan.billingInterval === "monthly") {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    } else if (trial.plan.billingInterval === "yearly") {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    }

    // Attempt to charge the stored payment method
    const paymentResult = await this.paymentService.chargeTrialConversion(
      trial.id,
      trial.plan,
      trial.paymentMethod,
      trial.business
    );

    if (paymentResult.success) {
      // Convert trial to active subscription
      await this.prisma.businessSubscription.update({
        where: { id: trial.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          nextBillingDate: newPeriodEnd,
          trialStart: null,
          trialEnd: null,
          failedPaymentCount: 0,
          updatedAt: new Date()
        }
      });

      // Send conversion confirmation via email
      await this.notificationService.sendRenewalConfirmation(
        trial.business.ownerId,
        trial.business.name,
        trial.plan.displayName,
        newPeriodEnd,
        'Trial conversion successful'
      );
    } else {
      throw new Error(paymentResult.error || "Trial conversion payment failed");
    }
  }

  /**
   * Process subscription renewals
   * Attempts to renew subscriptions that are due for renewal
   */
  private async processSubscriptionRenewals(): Promise<{
    processed: number;
    renewed: number;
    failed: number;
  }> {
    try {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find subscriptions that need renewal (current period ends today or tomorrow)
      const subscriptionsToRenew =
        await this.prisma.businessSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            autoRenewal: true,
            currentPeriodEnd: {
              lte: tomorrow,
            },
            cancelAtPeriodEnd: false,
          },
          include: {
            business: {
              include: {
                owner: true,
              },
            },
            plan: true,
            paymentMethod: true,
          },
        });

      let processed = 0;
      let renewed = 0;
      let failed = 0;

      for (const subscription of subscriptionsToRenew) {
        try {
          await this.processIndividualRenewal(subscription);
          renewed++;
          logger.info(
            `✅ Successfully renewed subscription ${subscription.id} for business ${subscription.business.name}`
          );
        } catch (error) {
          failed++;
          logger.error(
            `❌ Failed to renew subscription ${subscription.id}:`,
            error
          );

          // Update failed payment count
          await this.prisma.businessSubscription.update({
            where: { id: subscription.id },
            data: {
              failedPaymentCount: subscription.failedPaymentCount + 1,
              // If too many failures, disable auto-renewal
              autoRenewal:
                subscription.failedPaymentCount >= 2
                  ? false
                  : subscription.autoRenewal,
            },
          });
        }
        processed++;
      }

      logger.info(
        `🔄 Renewal check completed: ${processed} processed, ${renewed} renewed, ${failed} failed`
      );
      return { processed, renewed, failed };
    } catch (error) {
      logger.error("❌ Error in subscription renewal process:", error);
      return { processed: 0, renewed: 0, failed: 0 };
    }
  }

  /**
   * Process individual subscription renewal
   */
  private async processIndividualRenewal(subscription: any): Promise<void> {
    if (!subscription.paymentMethod) {
      throw new Error("No payment method available for renewal");
    }

    // Calculate new billing period
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const newPeriodStart = new Date(currentPeriodEnd);
    const newPeriodEnd = new Date(currentPeriodEnd);

    if (subscription.plan.billingInterval === "monthly") {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    } else if (subscription.plan.billingInterval === "yearly") {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    }

    // Create renewal payment using stored payment method
    const paymentResult = await this.paymentService.createRenewalPayment(
      subscription.id,
      subscription.plan,
      subscription.paymentMethod,
      subscription.business
    );

    if (paymentResult.success) {
      // Update subscription with new billing period
      await this.prisma.businessSubscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          nextBillingDate: newPeriodEnd,
          failedPaymentCount: 0, // Reset failure count on successful renewal
          updatedAt: new Date(),
        },
      });

      // Send renewal confirmation
      await this.notificationService.sendRenewalConfirmation(
        subscription.business.owner.phoneNumber,
        subscription.business.name,
        subscription.plan.displayName,
        newPeriodEnd
      );
    } else {
      throw new Error(paymentResult.error || "Payment failed");
    }
  }

  /**
   * Send renewal reminders to subscriptions expiring soon
   */
  private async sendRenewalReminders(): Promise<number> {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringSubscriptions =
        await this.prisma.businessSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: {
              gte: new Date(),
              lte: threeDaysFromNow,
            },
            autoRenewal: false, // Only send reminders to manual renewals
          },
          include: {
            business: {
              include: {
                owner: true,
              },
            },
            plan: true,
          },
        });

      let sent = 0;
      for (const subscription of expiringSubscriptions) {
        try {
          await this.notificationService.sendRenewalReminder(
            subscription.business.owner.phoneNumber,
            subscription.business.name,
            subscription.plan.displayName,
            subscription.currentPeriodEnd
          );
          sent++;
        } catch (error) {
          logger.error(
            `Failed to send renewal reminder for subscription ${subscription.id}:`,
            error
          );
        }
      }

      logger.info(`📧 Sent ${sent} renewal reminders`);
      return sent;
    } catch (error) {
      logger.error("❌ Error sending renewal reminders:", error);
      return 0;
    }
  }

  /**
   * Send payment failure notifications
   */
  private async sendPaymentFailureNotifications(): Promise<number> {
    try {
      const subscriptionsWithFailedPayments =
        await this.prisma.businessSubscription.findMany({
          where: {
            status: SubscriptionStatus.PAST_DUE,
            failedPaymentCount: {
              gt: 0,
            },
          },
          include: {
            business: {
              include: {
                owner: true,
              },
            },
            plan: true,
          },
        });

      let sent = 0;
      for (const subscription of subscriptionsWithFailedPayments) {
        try {
          await this.notificationService.sendPaymentFailureNotification(
            subscription.business.owner.phoneNumber,
            subscription.business.name,
            subscription.failedPaymentCount,
            subscription.currentPeriodEnd
          );
          sent++;
        } catch (error) {
          logger.error(
            `Failed to send payment failure notification for subscription ${subscription.id}:`,
            error
          );
        }
      }

      logger.info(`📧 Sent ${sent} payment failure notifications`);
      return sent;
    } catch (error) {
      logger.error("❌ Error sending payment failure notifications:", error);
      return 0;
    }
  }

  /**
   * Clean up expired data and old records
   */
  private async cleanupExpiredData(): Promise<{
    canceledSubscriptions: number;
    cleanedPayments: number;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Cancel subscriptions that have been past due for too long
      const subscriptionsToCancel =
        await this.prisma.businessSubscription.updateMany({
          where: {
            status: SubscriptionStatus.PAST_DUE,
            currentPeriodEnd: {
              lt: thirtyDaysAgo,
            },
            failedPaymentCount: {
              gte: 3,
            },
          },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
            autoRenewal: false,
          },
        });

      // Clean up old failed payment records (keep metadata but remove sensitive data)
      const cleanedPayments = await this.prisma.payment.updateMany({
        where: {
          status: "FAILED",
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
        data: {
          metadata: {},
        },
      });

      logger.info(
        `🧹 Cleanup completed: ${subscriptionsToCancel.count} canceled, ${cleanedPayments.count} payments cleaned`
      );

      return {
        canceledSubscriptions: subscriptionsToCancel.count,
        cleanedPayments: cleanedPayments.count,
      };
    } catch (error) {
      logger.error("❌ Error in cleanup process:", error);
      return { canceledSubscriptions: 0, cleanedPayments: 0 };
    }
  }

  /**
   * Get scheduler status and statistics
   */
  public getStatus(): {
    isRunning: boolean;
    tasks: {
      renewal: boolean;
      reminders: boolean;
      cleanup: boolean;
    };
    config: SchedulerConfig;
  } {
    return {
      isRunning: !!(this.renewalTask || this.reminderTask || this.cleanupTask),
      tasks: {
        renewal: !!this.renewalTask,
        reminders: !!this.reminderTask,
        cleanup: !!this.cleanupTask,
      },
      config: this.config,
    };
  }

  /**
   * Manual trigger for renewal process (for testing or manual runs)
   */
  public async triggerRenewalCheck(): Promise<{
    processed: number;
    renewed: number;
    failed: number;
  }> {
    logger.info("🔧 Manually triggering renewal check...");
    return await this.processSubscriptionRenewals();
  }

  /**
   * Manual trigger for reminder service (for testing)
   */
  public async triggerReminderService(): Promise<number> {
    logger.info("🔧 Manually triggering reminder service...");
    const remindersSent = await this.sendRenewalReminders();
    const failuresSent = await this.sendPaymentFailureNotifications();
    return remindersSent + failuresSent;
  }

  /**
   * Manual trigger for cleanup service (for testing)
   */
  public async triggerCleanup(): Promise<{
    canceledSubscriptions: number;
    cleanedPayments: number;
  }> {
    logger.info("🔧 Manually triggering cleanup...");
    return await this.cleanupExpiredData();
  }
}
