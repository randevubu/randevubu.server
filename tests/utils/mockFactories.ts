/**
 * Mock Factories for Test Data Generation
 * Provides factory functions to create consistent test data
 */

import { DiscountType, PaymentStatus } from '@prisma/client';
import { SubscriptionStatus } from '../../src/types/business';

export class MockFactories {
  /**
   * Factory for creating subscription plans
   */
  static subscriptionPlan(overrides?: Partial<any>) {
    return {
      id: `plan-${Date.now()}`,
      name: 'basic_tier1',
      displayName: 'Basic Plan - Tier 1',
      description: 'Perfect for small businesses',
      price: 949.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      maxBusinesses: 1,
      maxStaffPerBusiness: 5,
      maxAppointmentsPerMonth: 1000,
      features: {
        appointmentBooking: true,
        staffManagement: true,
        basicReports: true,
        emailNotifications: true,
        smsNotifications: true,
        customBranding: false,
        advancedReports: false,
        apiAccess: false,
        multiLocation: false,
        prioritySupport: false,
        integrations: [],
        maxServices: 10,
        maxCustomers: 500,
        smsQuota: 100,
        pricingTier: 'TIER_1',
        trialDays: 7,
        description: [
          'Online appointment booking system',
          'Up to 5 staff members',
          'Unlimited appointments',
          'Customer management',
          'SMS notifications'
        ]
      },
      isActive: true,
      isPopular: false,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Factory for creating premium plans (no trial)
   */
  static premiumPlan(overrides?: Partial<any>) {
    return this.subscriptionPlan({
      id: `plan-premium-${Date.now()}`,
      name: 'premium_tier1',
      displayName: 'Premium Plan - Tier 1',
      description: 'For growing businesses',
      price: 1899.00,
      maxBusinesses: 3,
      maxStaffPerBusiness: 20,
      features: {
        appointmentBooking: true,
        staffManagement: true,
        basicReports: true,
        emailNotifications: true,
        smsNotifications: true,
        customBranding: true,
        advancedReports: true,
        apiAccess: true,
        multiLocation: true,
        prioritySupport: true,
        integrations: ['google-calendar', 'zoom'],
        maxServices: 50,
        maxCustomers: 5000,
        smsQuota: 1000,
        pricingTier: 'TIER_1',
        trialDays: 0, // No trial for premium
        description: [
          'Everything in Basic',
          'Up to 20 staff members',
          'Advanced reporting',
          'Priority support',
          'Custom branding'
        ]
      },
      isPopular: true,
      sortOrder: 2,
      ...overrides
    });
  }

  /**
   * Factory for creating business subscriptions
   */
  static businessSubscription(overrides?: Partial<any>) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: `bs-${Date.now()}`,
      businessId: `biz-${Date.now()}`,
      planId: 'plan-basic-tier1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      autoRenewal: true,
      paymentMethodId: `pm-${Date.now()}`,
      nextBillingDate: periodEnd,
      failedPaymentCount: 0,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  /**
   * Factory for creating trial subscriptions
   */
  static trialSubscription(overrides?: Partial<any>) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.businessSubscription({
      status: SubscriptionStatus.TRIAL,
      trialStart: now,
      trialEnd: trialEnd,
      currentPeriodEnd: trialEnd,
      metadata: {
        trialDays: 7,
        requiresPaymentMethod: true,
        createdAt: now.toISOString()
      },
      ...overrides
    });
  }

  /**
   * Factory for creating trial subscriptions with pending discount
   */
  static trialWithDiscount(discountCode: string = 'WELCOME20', overrides?: Partial<any>) {
    const trial = this.trialSubscription(overrides);
    trial.metadata = {
      ...trial.metadata,
      pendingDiscount: {
        code: discountCode,
        validatedAt: new Date().toISOString(),
        appliedToPayments: [],
        isRecurring: false,
        remainingUses: 1,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        discountCodeId: 'dc-welcome-123'
      }
    };
    return trial;
  }

  /**
   * Factory for creating discount codes
   */
  static discountCode(overrides?: Partial<any>) {
    const now = new Date();
    const validUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return {
      id: `dc-${Date.now()}`,
      code: `TEST${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: 'Test Discount',
      description: 'Test discount code',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minPurchaseAmount: null,
      maxUsages: 1000,
      currentUsages: 0,
      maxUsagesPerUser: 1,
      validFrom: now,
      validUntil: validUntil,
      isActive: true,
      applicablePlans: [],
      metadata: {
        isRecurring: false,
        maxRecurringUses: 1
      },
      createdById: 'admin-123',
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  /**
   * Factory for creating recurring discount codes
   */
  static recurringDiscountCode(uses: number = 3, overrides?: Partial<any>) {
    return this.discountCode({
      code: `LOYAL${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: 'Loyalty Discount',
      description: 'Recurring discount for loyal customers',
      discountValue: 35,
      metadata: {
        isRecurring: true,
        maxRecurringUses: uses
      },
      ...overrides
    });
  }

  /**
   * Factory for creating expired discount codes
   */
  static expiredDiscountCode(overrides?: Partial<any>) {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.discountCode({
      code: 'EXPIRED10',
      name: 'Expired Discount',
      validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      validUntil: pastDate,
      ...overrides
    });
  }

  /**
   * Factory for creating discount codes with usage limit reached
   */
  static exhaustedDiscountCode(overrides?: Partial<any>) {
    return this.discountCode({
      code: 'LIMITED5',
      name: 'Limited Usage Discount',
      maxUsages: 100,
      currentUsages: 100,
      ...overrides
    });
  }

  /**
   * Factory for creating discount code usages
   */
  static discountCodeUsage(overrides?: Partial<any>) {
    return {
      id: `dcu-${Date.now()}`,
      discountCodeId: 'dc-123',
      userId: 'user-123',
      businessId: 'biz-123',
      subscriptionId: 'sub-123',
      paymentId: 'pay-123',
      discountAmount: 189.80,
      originalAmount: 949.00,
      finalAmount: 759.20,
      usedAt: new Date(),
      metadata: {},
      createdAt: new Date(),
      ...overrides
    };
  }

  /**
   * Factory for creating payments
   */
  static payment(overrides?: Partial<any>) {
    return {
      id: `pay-${Date.now()}`,
      businessId: `biz-${Date.now()}`,
      subscriptionId: `sub-${Date.now()}`,
      amount: 949.00,
      currency: 'TRY',
      status: PaymentStatus.SUCCEEDED,
      paymentGateway: 'iyzico',
      paymentGatewayId: `iyzico-${Date.now()}`,
      paymentMethodId: `pm-${Date.now()}`,
      failureReason: null,
      refundedAmount: null,
      metadata: {
        type: 'subscription_payment',
        plan: {
          id: 'plan-basic-tier1',
          name: 'Basic Plan - Tier 1'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Factory for creating payments with discount applied
   */
  static paymentWithDiscount(discountCode: string = 'WELCOME20', overrides?: Partial<any>) {
    return this.payment({
      amount: 759.20,
      metadata: {
        type: 'subscription_payment',
        plan: {
          id: 'plan-basic-tier1',
          name: 'Basic Plan - Tier 1'
        },
        discount: {
          code: discountCode,
          originalAmount: 949.00,
          discountAmount: 189.80,
          finalAmount: 759.20
        }
      },
      ...overrides
    });
  }

  /**
   * Factory for creating failed payments
   */
  static failedPayment(overrides?: Partial<any>) {
    return this.payment({
      status: PaymentStatus.FAILED,
      failureReason: 'Insufficient funds',
      ...overrides
    });
  }

  /**
   * Factory for creating payment methods
   */
  static paymentMethod(overrides?: Partial<any>) {
    return {
      id: `pm-${Date.now()}`,
      userId: 'user-123',
      businessId: 'biz-123',
      type: 'card',
      provider: 'iyzico',
      providerPaymentMethodId: `iyzico-pm-${Date.now()}`,
      last4: '0008',
      brand: 'MasterCard',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: true,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Factory for creating card data for payment requests
   */
  static cardData(overrides?: Partial<any>) {
    return {
      cardHolderName: 'John Doe',
      cardNumber: '5528790000000008', // Iyzico test card - success
      expireMonth: '12',
      expireYear: '2030',
      cvc: '123',
      ...overrides
    };
  }

  /**
   * Factory for creating buyer data for payment requests
   */
  static buyerData(overrides?: Partial<any>) {
    return {
      id: `user-${Date.now()}`,
      name: 'John',
      surname: 'Doe',
      gsmNumber: '+905551234567',
      email: 'john.doe@example.com',
      identityNumber: '12345678901',
      registrationAddress: 'Test Address, Istanbul',
      registrationDate: new Date().toISOString(),
      lastLoginDate: new Date().toISOString(),
      ip: '85.34.78.112',
      city: 'Istanbul',
      country: 'Turkey',
      zipCode: '34000',
      ...overrides
    };
  }

  /**
   * Factory for creating address data
   */
  static addressData(overrides?: Partial<any>) {
    return {
      contactName: 'John Doe',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Test Address, Besiktas',
      zipCode: '34000',
      ...overrides
    };
  }

  /**
   * Factory for creating Iyzico test cards
   */
  static testCards() {
    return {
      success: {
        visa: this.cardData({ cardNumber: '4766620000000001' }),
        mastercard: this.cardData({ cardNumber: '5528790000000008' }),
        americanExpress: this.cardData({ cardNumber: '375628000000009' })
      },
      failure: {
        insufficientFunds: this.cardData({ cardNumber: '5406670000000009' }),
        invalidCard: this.cardData({ cardNumber: '4111111111111129' }),
        doNotHonor: this.cardData({ cardNumber: '4129111111111111' })
      },
      threeDSecure: {
        success: this.cardData({ cardNumber: '5528790000000008' }),
        failure: this.cardData({ cardNumber: '5406670000000017' })
      }
    };
  }

  /**
   * Create multiple items using a factory function
   */
  static createMultiple<T>(factory: () => T, count: number, modifier?: (item: T, index: number) => T): T[] {
    return Array.from({ length: count }, (_, index) => {
      const item = factory();
      return modifier ? modifier(item, index) : item;
    });
  }
}
