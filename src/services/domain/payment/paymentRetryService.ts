import { PrismaClient } from '@prisma/client';
import { PaymentService } from './paymentService';
import { NotificationService } from '../notification/notificationService';
import { SubscriptionStatus } from '../../../types/business';
import logger from "../../../utils/Logger/logger";
export interface RetryConfig {
  maxRetries: number;
  retrySchedule: number[]; // Days between retries
  escalationThreshold: number; // After this many failures, escalate
  gracePeriodDays: number; // Days before canceling subscription
}

export interface PaymentRetryResult {
  success: boolean;
  retryCount: number;
  nextRetryDate?: Date;
  shouldEscalate: boolean;
  shouldCancel: boolean;
  error?: string;
}

interface SubscriptionWithRelations {
  id: string;
  status: string;
  failedPaymentCount: number;
  updatedAt: Date;
  currentPeriodEnd: Date | null;
  paymentMethodId: string | null;
  businessId: string;
  business: {
    id: string;
    name: string;
    owner: {
      phoneNumber: string;
      firstName?: string | null;
      lastName?: string | null;
      [key: string]: unknown;
    };
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    [key: string]: unknown;
  };
  plan: {
    id: string;
    name: string;
    displayName: string;
    price: number | { toString: () => string } | unknown;
    currency: string;
    billingInterval: string;
    [key: string]: unknown;
  };
  paymentMethod: {
    cardHolderName: string;
    lastFourDigits: string;
    cardBrand?: string | null;
    expiryMonth: string;
    expiryYear: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export class PaymentRetryService {
  private defaultConfig: RetryConfig = {
    maxRetries: 5,
    retrySchedule: [0, 1, 3, 7, 14], // Immediate, 1 day, 3 days, 1 week, 2 weeks
    escalationThreshold: 3,
    gracePeriodDays: 30
  };

  constructor(
    private prisma: PrismaClient,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private config: RetryConfig
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Process failed payments with enhanced retry logic
   */
  async processFailedPayments(): Promise<{
    processed: number;
    retried: number;
    escalated: number;
    canceled: number;
  }> {
    try {
      const failedSubscriptions = await this.getFailedSubscriptions();
      
      let processed = 0;
      let retried = 0;
      let escalated = 0;
      let canceled = 0;

      for (const subscription of failedSubscriptions) {
        try {
          const result = await this.processIndividualRetry(subscription);
          processed++;

          if (result.success) {
            retried++;
          } else if (result.shouldEscalate) {
            escalated++;
            await this.escalatePaymentFailure(subscription);
          } else if (result.shouldCancel) {
            canceled++;
            await this.cancelSubscription(subscription);
          }
        } catch (error) {
          logger.error(`Failed to process retry for subscription ${subscription.id}:`, error);
        }
      }

      logger.info(`🔄 Payment retry completed: ${processed} processed, ${retried} retried, ${escalated} escalated, ${canceled} canceled`);
      return { processed, retried, escalated, canceled };
    } catch (error) {
      logger.error('❌ Error in payment retry process:', error);
      return { processed: 0, retried: 0, escalated: 0, canceled: 0 };
    }
  }

  /**
   * Get subscriptions that need retry processing
   */
  private async getFailedSubscriptions() {
    return await this.prisma.businessSubscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        failedPaymentCount: {
          gt: 0,
          lt: this.config.maxRetries
        },
        // Check if it's time for next retry (placeholder - implement actual retry logic)
        // OR: [
        //   { nextRetryDate: { lte: new Date() } },
        //   { nextRetryDate: null }
        // ]
      },
      include: {
        business: {
          include: {
            owner: true
          }
        },
        plan: true,
        paymentMethod: true
      }
    });
  }

  /**
   * Process individual subscription retry
   */
  private async processIndividualRetry(subscription: SubscriptionWithRelations): Promise<PaymentRetryResult> {
    const retryCount = subscription.failedPaymentCount;
    const nextRetryDay = this.config.retrySchedule[retryCount] || this.config.retrySchedule[this.config.retrySchedule.length - 1];
    
    // Check if it's time for this retry
    const lastFailure = subscription.updatedAt;
    const nextRetryDate = new Date(lastFailure.getTime() + nextRetryDay * 24 * 60 * 60 * 1000);
    
    if (new Date() < nextRetryDate) {
      return {
        success: false,
        retryCount,
        nextRetryDate,
        shouldEscalate: false,
        shouldCancel: false,
        error: 'Not yet time for retry'
      };
    }

    // Attempt payment retry
    try {
      // Convert plan price from Decimal if needed
      const planForPayment = {
        ...subscription.plan,
        price: typeof subscription.plan.price === 'number' 
          ? subscription.plan.price 
          : Number(subscription.plan.price),
      };

      // Convert business data
      const businessForPayment = {
        ownerId: subscription.business.owner.id as string,
        owner: {
          firstName: subscription.business.owner.firstName || undefined,
          lastName: subscription.business.owner.lastName || undefined,
          phoneNumber: subscription.business.owner.phoneNumber,
        },
        name: subscription.business.name,
        email: subscription.business.email || undefined,
        phone: subscription.business.phone || undefined,
        address: subscription.business.address || undefined,
        city: subscription.business.city || undefined,
        country: subscription.business.country || undefined,
        postalCode: subscription.business.postalCode || undefined,
      };

      const paymentResult = await this.paymentService.createRenewalPayment(
        subscription.id,
        planForPayment,
        subscription.paymentMethod ? {
          cardHolderName: subscription.paymentMethod.cardHolderName,
          lastFourDigits: subscription.paymentMethod.lastFourDigits,
          cardBrand: subscription.paymentMethod.cardBrand || undefined,
          expiryMonth: subscription.paymentMethod.expiryMonth,
          expiryYear: subscription.paymentMethod.expiryYear,
        } : undefined,
        businessForPayment
      );

      if (paymentResult.success) {
        // Reset failure count and update subscription
        await this.prisma.businessSubscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            failedPaymentCount: 0,
            updatedAt: new Date()
          }
        });

        // Send success notification
        if (subscription.currentPeriodEnd) {
          await this.notificationService.sendRenewalConfirmation(
            subscription.business.owner.phoneNumber,
            subscription.business.name,
            subscription.plan.displayName,
            subscription.currentPeriodEnd
          );
        }

        return {
          success: true,
          retryCount: 0,
          shouldEscalate: false,
          shouldCancel: false
        };
      } else {
        // Payment failed, increment retry count
        const newRetryCount = retryCount + 1;
        const nextRetryDay = this.config.retrySchedule[newRetryCount] || this.config.retrySchedule[this.config.retrySchedule.length - 1];
        const nextRetryDate = new Date(Date.now() + nextRetryDay * 24 * 60 * 60 * 1000);

        // Update subscription (placeholder - implement actual update)
        // await this.prisma.businessSubscription.update({
        //   where: { id: subscription.id },
        //   data: {
        //     failedPaymentCount: newRetryCount,
        //     nextRetryDate: nextRetryDate,
        //     updatedAt: new Date()
        //   }
        // });

        // Send retry failure notification
        await this.notificationService.sendPaymentRetryFailure(
          subscription.business.owner.phoneNumber,
          subscription.business.name,
          newRetryCount,
          this.config.maxRetries,
          nextRetryDate
        );

        return {
          success: false,
          retryCount: newRetryCount,
          nextRetryDate,
          shouldEscalate: newRetryCount >= this.config.escalationThreshold,
          shouldCancel: newRetryCount >= this.config.maxRetries,
          error: paymentResult.error
        };
      }
    } catch (error) {
      logger.error(`Payment retry failed for subscription ${subscription.id}:`, error);
      
      const newRetryCount = retryCount + 1;
      const nextRetryDay = this.config.retrySchedule[newRetryCount] || this.config.retrySchedule[this.config.retrySchedule.length - 1];
      const nextRetryDate = new Date(Date.now() + nextRetryDay * 24 * 60 * 60 * 1000);

      // Update subscription (placeholder - implement actual update)
      // await this.prisma.businessSubscription.update({
      //   where: { id: subscription.id },
      //   data: {
      //     failedPaymentCount: newRetryCount,
      //     nextRetryDate: nextRetryDate,
      //     updatedAt: new Date()
      //   }
      // });

      return {
        success: false,
        retryCount: newRetryCount,
        nextRetryDate,
        shouldEscalate: newRetryCount >= this.config.escalationThreshold,
        shouldCancel: newRetryCount >= this.config.maxRetries,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Escalate payment failure to support team
   */
  private async escalatePaymentFailure(subscription: SubscriptionWithRelations): Promise<void> {
    try {
      // Send escalation notification to support team
      if (subscription.currentPeriodEnd) {
        await this.notificationService.sendPaymentEscalation(
          subscription.business.owner.phoneNumber,
          subscription.business.name,
          subscription.plan.displayName,
          subscription.failedPaymentCount,
          subscription.currentPeriodEnd
        );
      }

      // Log escalation for support team
      logger.warn(`🚨 Payment escalation: Subscription ${subscription.id} has failed ${subscription.failedPaymentCount} times`);
      
      // Update subscription metadata with escalation info (placeholder - implement actual update)
      // await this.prisma.businessSubscription.update({
      //   where: { id: subscription.id },
      //   data: {
      //     metadata: {
      //       ...subscription.metadata,
      //       escalation: {
      //         escalatedAt: new Date().toISOString(),
      //         failureCount: subscription.failedPaymentCount,
      //         escalatedBy: 'system'
      //       }
      //     }
      //   }
      // });
    } catch (error) {
      logger.error(`Failed to escalate payment failure for subscription ${subscription.id}:`, error);
    }
  }

  /**
   * Cancel subscription after max retries
   */
  private async cancelSubscription(subscription: SubscriptionWithRelations): Promise<void> {
    try {
      // Cancel subscription (placeholder - implement actual cancellation)
      // await this.prisma.businessSubscription.update({
      //   where: { id: subscription.id },
      //   data: {
      //     status: SubscriptionStatus.CANCELED,
      //     canceledAt: new Date(),
      //     autoRenewal: false,
      //     nextRetryDate: null
      //   }
      // });

      // Send cancellation notification
      await this.notificationService.sendSubscriptionCancellation(
        subscription.business.owner.phoneNumber,
        subscription.business.name,
        subscription.plan.displayName,
        subscription.failedPaymentCount
      );

      logger.info(`❌ Canceled subscription ${subscription.id} after ${subscription.failedPaymentCount} failed payments`);
    } catch (error) {
      logger.error(`Failed to cancel subscription ${subscription.id}:`, error);
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStatistics(): Promise<{
    totalFailed: number;
    pendingRetry: number;
    escalated: number;
    canceled: number;
  }> {
    const [totalFailed, pendingRetry, escalated, canceled] = await Promise.all([
      this.prisma.businessSubscription.count({
        where: { status: SubscriptionStatus.PAST_DUE }
      }),
      this.prisma.businessSubscription.count({
        where: {
          status: SubscriptionStatus.PAST_DUE,
          failedPaymentCount: { gt: 0, lt: this.config.maxRetries }
        }
      }),
      this.prisma.businessSubscription.count({
        where: {
          status: SubscriptionStatus.PAST_DUE,
          failedPaymentCount: { gte: this.config.escalationThreshold }
        }
      }),
      this.prisma.businessSubscription.count({
        where: {
          status: SubscriptionStatus.CANCELED,
          failedPaymentCount: { gte: this.config.maxRetries }
        }
      })
    ]);

    return { totalFailed, pendingRetry, escalated, canceled };
  }
}
