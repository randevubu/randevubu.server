import { PrismaClient } from '@prisma/client';
import { SubscriptionStatus } from '../../src/types/business';

export class TestSubscriptionHelper {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a test subscription that expires in the specified minutes
   * Useful for testing the renewal system in development
   */
  async createTestSubscriptionExpiringInMinutes(
    businessId: string,
    planId: string,
    minutesUntilExpiry: number = 2,
    autoRenewal: boolean = true,
    paymentMethodId?: string
  ) {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (minutesUntilExpiry * 60 * 1000));
    
    // First check if subscription exists
    const existingSubscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId }
    });

    if (existingSubscription) {
      // Update existing subscription
      return await this.prisma.businessSubscription.update({
        where: { businessId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: expiryDate,
          nextBillingDate: expiryDate,
          autoRenewal,
          paymentMethodId,
          failedPaymentCount: 0,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: now,
          metadata: {
            testSubscription: true,
            createdForTesting: now.toISOString(),
            expiresInMinutes: minutesUntilExpiry
          }
        }
      });
    } else {
      // Create new subscription
      return await this.prisma.businessSubscription.create({
        data: {
          id: `test_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          businessId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: expiryDate,
          nextBillingDate: expiryDate,
          autoRenewal,
          paymentMethodId,
          failedPaymentCount: 0,
          cancelAtPeriodEnd: false,
          metadata: {
            testSubscription: true,
            createdForTesting: now.toISOString(),
            expiresInMinutes: minutesUntilExpiry
          }
        }
      });
    }
  }

  /**
   * Create a test payment method for a business
   */
  async createTestPaymentMethod(
    businessId: string,
    isDefault: boolean = true
  ) {
    // Set existing payment methods to non-default if making this one default
    if (isDefault) {
      await this.prisma.storedPaymentMethod.updateMany({
        where: { businessId, isActive: true },
        data: { isDefault: false }
      });
    }

    return await this.prisma.storedPaymentMethod.create({
      data: {
        id: `test_pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        businessId,
        cardHolderName: 'Test User',
        lastFourDigits: '0008',
        cardBrand: 'MASTERCARD',
        expiryMonth: '12',
        expiryYear: '2030',
        isDefault,
        isActive: true,
        providerToken: `test_token_${Date.now()}`,
        metadata: {
          testPaymentMethod: true,
          createdForTesting: new Date().toISOString()
        }
      }
    });
  }

  /**
   * List all test subscriptions (for cleanup)
   */
  async getTestSubscriptions() {
    return await this.prisma.businessSubscription.findMany({
      where: {
        metadata: {
          path: ['testSubscription'],
          equals: true
        }
      },
      include: {
        business: {
          select: { name: true, id: true }
        },
        plan: {
          select: { displayName: true, price: true }
        }
      }
    });
  }

  /**
   * Clean up all test subscriptions and payment methods
   */
  async cleanupTestData() {
    // Delete test subscriptions
    const deletedSubs = await this.prisma.businessSubscription.deleteMany({
      where: {
        metadata: {
          path: ['testSubscription'],
          equals: true
        }
      }
    });

    // Delete test payment methods
    const deletedPMs = await this.prisma.storedPaymentMethod.deleteMany({
      where: {
        metadata: {
          path: ['testPaymentMethod'],
          equals: true
        }
      }
    });

    return {
      deletedSubscriptions: deletedSubs.count,
      deletedPaymentMethods: deletedPMs.count
    };
  }

  /**
   * Get renewal schedule for testing
   */
  getTestingSchedule() {
    return {
      renewalCheck: 'Every 1 minute',
      reminders: 'Every 2 minutes', 
      cleanup: 'Every 5 minutes',
      note: 'Create subscriptions expiring in 2 minutes to test renewal'
    };
  }
}