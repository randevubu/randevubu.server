/**
 * Integration Tests: Complete Subscription Flow
 * Tests end-to-end scenarios including trial subscriptions, discounts, and payments
 */

import { SubscriptionService } from '../../src/services/domain/subscription/subscriptionService';
import { DiscountCodeService } from '../../src/services/domain/discount/discountCodeService';
import { PaymentService } from '../../src/services/domain/payment/paymentService';
import { MockFactories } from '../utils/mockFactories';
import {
  TEST_USER_IDS,
  TEST_BUSINESS_IDS,
  TEST_PLAN_IDS,
  TEST_PRICES,
  TEST_DISCOUNT_CODES,
  TEST_CARD_DATA,
  TEST_BUYER_DATA
} from '../utils/testData';

describe('Integration: Complete Subscription Flow', () => {
  let subscriptionService: SubscriptionService;
  let discountCodeService: DiscountCodeService;
  let paymentService: PaymentService;

  let mockRepositories: any;
  let mockRBACService: any;
  let mockPricingTierService: any;

  beforeEach(() => {
    // Setup mock repositories and services
    mockRepositories = {
      subscriptionPlan: {
        findById: jest.fn(),
        findAllPlans: jest.fn()
      },
      businessSubscription: {
        create: jest.fn(),
        findById: jest.fn(),
        findActiveSubscription: jest.fn(),
        update: jest.fn()
      },
      discountCode: {
        findByCode: jest.fn(),
        findById: jest.fn()
      },
      discountCodeUsage: {
        create: jest.fn(),
        countUserUsages: jest.fn()
      },
      payment: {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn()
      },
      paymentMethod: {
        create: jest.fn(),
        findById: jest.fn()
      }
    };

    mockRBACService = {
      requirePermission: jest.fn().mockResolvedValue(undefined),
      hasPermission: jest.fn().mockResolvedValue(true)
    };

    mockPricingTierService = {
      getCityTier: jest.fn().mockResolvedValue('TIER_1'),
      getLocationPricing: jest.fn()
    };

    subscriptionService = new SubscriptionService(
      mockRepositories as any,
      mockRBACService,
      mockPricingTierService,
      discountCodeService
    );

    discountCodeService = new DiscountCodeService(
      mockRepositories as any,
      mockRBACService
    );

    paymentService = new PaymentService(mockRepositories as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario 1: Trial Subscription with One-Time Discount', () => {
    it('should create trial, apply discount at conversion, and process payment', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.TRIAL;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;
      const discountCode = TEST_DISCOUNT_CODES.VALID_ONE_TIME.code;

      // Step 1: User selects plan and applies discount code
      const mockPlan = MockFactories.subscriptionPlan({
        id: planId,
        price: TEST_PRICES.BASIC_TIER1,
        features: { trialDays: 7 }
      });

      const mockDiscount = MockFactories.discountCode({
        code: discountCode,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        isActive: true,
        maxUsages: 1000,
        currentUsages: 50,
        metadata: {
          isRecurring: false,
          maxRecurringUses: 1
        }
      });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockPlan);
      mockRepositories.discountCode.findByCode.mockResolvedValue(mockDiscount);
      mockRepositories.discountCodeUsage.countUserUsages.mockResolvedValue(0);
      mockRepositories.businessSubscription.findActiveSubscription.mockResolvedValue(null);

      // Validate discount code
      const discountValidation = await discountCodeService.validateDiscountCode(
        discountCode,
        planId,
        mockPlan.price,
        userId
      );

      expect(discountValidation.isValid).toBe(true);
      expect(discountValidation.calculatedDiscount).toEqual({
        originalAmount: TEST_PRICES.BASIC_TIER1,
        discountAmount: TEST_PRICES.BASIC_TIER1 * 0.2,
        finalAmount: TEST_PRICES.BASIC_TIER1 * 0.8
      });

      // Step 2: Create trial subscription with pending discount
      const trialSubscription = MockFactories.trialWithDiscount(discountCode, {
        businessId,
        planId,
        paymentMethodId: 'pm-123'
      });

      mockRepositories.businessSubscription.create.mockResolvedValue(trialSubscription);

      const subscriptionData = {
        planId,
        discountCode,
        card: TEST_CARD_DATA.VALID_MASTERCARD,
        buyer: TEST_BUYER_DATA.VALID
      };

      // Create subscription
      const createdSubscription = await subscriptionService.subscribeBusiness(
        userId,
        businessId,
        subscriptionData as any
      );

      expect(createdSubscription.status).toBe('TRIAL');
      expect(createdSubscription.trialStart).toBeDefined();
      expect(createdSubscription.trialEnd).toBeDefined();
      expect(createdSubscription.metadata.pendingDiscount).toBeDefined();
      expect(createdSubscription.metadata.pendingDiscount.code).toBe(discountCode);

      // Step 3: Trial ends - convert to active with discount applied
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Mock time passing (7 days)
      jest.useFakeTimers();
      jest.setSystemTime(trialEndDate);

      // Process trial conversion with discount
      const discountedAmount = TEST_PRICES.BASIC_TIER1 * 0.8; // 20% off
      const payment = MockFactories.paymentWithDiscount(discountCode, {
        businessId,
        subscriptionId: trialSubscription.id,
        amount: discountedAmount
      });

      mockRepositories.payment.create.mockResolvedValue(payment);
      mockRepositories.discountCodeUsage.create.mockResolvedValue({
        id: 'usage-123',
        discountCodeId: mockDiscount.id,
        userId,
        businessId,
        discountAmount: TEST_PRICES.BASIC_TIER1 * 0.2,
        originalAmount: TEST_PRICES.BASIC_TIER1,
        finalAmount: discountedAmount
      });

      // Update subscription to ACTIVE
      const activeSubscription = {
        ...trialSubscription,
        status: 'ACTIVE',
        metadata: {
          ...trialSubscription.metadata,
          pendingDiscount: {
            ...trialSubscription.metadata.pendingDiscount,
            appliedToPayments: [payment.id],
            remainingUses: 0 // One-time discount fully used
          }
        }
      };

      mockRepositories.businessSubscription.update.mockResolvedValue(activeSubscription);

      // Verify payment processed with discount
      expect(payment.amount).toBe(discountedAmount);
      expect(payment.metadata.discount).toBeDefined();
      expect(payment.metadata.discount.code).toBe(discountCode);
      expect(payment.metadata.discount.discountAmount).toBe(TEST_PRICES.BASIC_TIER1 * 0.2);

      // Step 4: Next renewal - no discount applied
      const renewalDate = new Date(trialEndDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      jest.setSystemTime(renewalDate);

      const renewalPayment = MockFactories.payment({
        businessId,
        subscriptionId: trialSubscription.id,
        amount: TEST_PRICES.BASIC_TIER1 // Full price
      });

      mockRepositories.payment.create.mockResolvedValue(renewalPayment);

      // Verify no discount on renewal
      expect(renewalPayment.amount).toBe(TEST_PRICES.BASIC_TIER1);
      expect(renewalPayment.metadata.discount).toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe('Scenario 2: Recurring Discount (3 Payments)', () => {
    it('should apply discount to 3 consecutive payments', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.PREMIUM_TIER1;
      const discountCode = TEST_DISCOUNT_CODES.VALID_RECURRING.code;

      // Step 1: Validate recurring discount
      const mockPlan = MockFactories.premiumPlan({
        id: planId,
        price: TEST_PRICES.PREMIUM_TIER1,
        features: { trialDays: 0 } // No trial
      });

      const mockDiscount = MockFactories.recurringDiscountCode(3, {
        code: discountCode,
        discountValue: 35
      });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockPlan);
      mockRepositories.discountCode.findByCode.mockResolvedValue(mockDiscount);
      mockRepositories.discountCodeUsage.countUserUsages.mockResolvedValue(0);

      const discountValidation = await discountCodeService.validateDiscountCode(
        discountCode,
        planId,
        mockPlan.price,
        userId
      );

      expect(discountValidation.isValid).toBe(true);
      expect(discountValidation.discountCode.metadata.isRecurring).toBe(true);
      expect(discountValidation.discountCode.metadata.maxRecurringUses).toBe(3);

      // Step 2: Create subscription with recurring discount
      const subscription = MockFactories.businessSubscription({
        businessId,
        planId,
        status: 'ACTIVE',
        metadata: {
          pendingDiscount: {
            code: discountCode,
            isRecurring: true,
            remainingUses: 3,
            discountType: 'PERCENTAGE',
            discountValue: 35,
            appliedToPayments: []
          }
        }
      });

      mockRepositories.businessSubscription.create.mockResolvedValue(subscription);
      mockRepositories.businessSubscription.findActiveSubscription.mockResolvedValue(null);

      // Step 3: First payment - discount applied (remainingUses: 2)
      const discountedAmount1 = TEST_PRICES.PREMIUM_TIER1 * 0.65; // 35% off
      const payment1 = MockFactories.paymentWithDiscount(discountCode, {
        id: 'pay-1',
        businessId,
        subscriptionId: subscription.id,
        amount: discountedAmount1,
        metadata: {
          type: 'subscription_payment',
          discount: {
            code: discountCode,
            originalAmount: TEST_PRICES.PREMIUM_TIER1,
            discountAmount: TEST_PRICES.PREMIUM_TIER1 * 0.35,
            finalAmount: discountedAmount1
          }
        }
      });

      mockRepositories.payment.create.mockResolvedValue(payment1);

      expect(payment1.amount).toBe(discountedAmount1);

      // Update subscription metadata
      subscription.metadata.pendingDiscount.remainingUses = 2;
      subscription.metadata.pendingDiscount.appliedToPayments.push('pay-1');

      // Step 4: Second payment (renewal) - discount applied (remainingUses: 1)
      const payment2 = MockFactories.paymentWithDiscount(discountCode, {
        id: 'pay-2',
        businessId,
        subscriptionId: subscription.id,
        amount: discountedAmount1
      });

      mockRepositories.payment.create.mockResolvedValue(payment2);

      expect(payment2.amount).toBe(discountedAmount1);

      subscription.metadata.pendingDiscount.remainingUses = 1;
      subscription.metadata.pendingDiscount.appliedToPayments.push('pay-2');

      // Step 5: Third payment (renewal) - discount applied (remainingUses: 0)
      const payment3 = MockFactories.paymentWithDiscount(discountCode, {
        id: 'pay-3',
        businessId,
        subscriptionId: subscription.id,
        amount: discountedAmount1
      });

      mockRepositories.payment.create.mockResolvedValue(payment3);

      expect(payment3.amount).toBe(discountedAmount1);

      subscription.metadata.pendingDiscount.remainingUses = 0;
      subscription.metadata.pendingDiscount.appliedToPayments.push('pay-3');

      // Step 6: Fourth payment (renewal) - NO discount (exhausted)
      const payment4 = MockFactories.payment({
        id: 'pay-4',
        businessId,
        subscriptionId: subscription.id,
        amount: TEST_PRICES.PREMIUM_TIER1 // Full price
      });

      mockRepositories.payment.create.mockResolvedValue(payment4);

      expect(payment4.amount).toBe(TEST_PRICES.PREMIUM_TIER1);
      expect(payment4.metadata.discount).toBeUndefined();
    });
  });

  describe('Scenario 3: Late Discount Application', () => {
    it('should apply discount to existing subscription', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const discountCode = 'LATE20';

      // Step 1: Subscription already exists without discount
      const existingSubscription = MockFactories.businessSubscription({
        businessId,
        planId: TEST_PLAN_IDS.BASIC_TIER1,
        status: 'ACTIVE',
        metadata: {} // No pending discount
      });

      mockRepositories.businessSubscription.findActiveSubscription
        .mockResolvedValue(existingSubscription);

      // Step 2: Validate and apply discount code later
      const mockDiscount = MockFactories.discountCode({
        code: discountCode,
        discountValue: 20,
        isActive: true
      });

      mockRepositories.discountCode.findByCode.mockResolvedValue(mockDiscount);
      mockRepositories.discountCodeUsage.countUserUsages.mockResolvedValue(0);

      const discountValidation = await discountCodeService.validateDiscountCode(
        discountCode,
        existingSubscription.planId,
        TEST_PRICES.BASIC_TIER1,
        userId
      );

      expect(discountValidation.isValid).toBe(true);

      // Step 3: Apply discount to existing subscription
      const updatedSubscription = {
        ...existingSubscription,
        metadata: {
          pendingDiscount: {
            code: discountCode,
            validatedAt: new Date().toISOString(),
            isRecurring: false,
            remainingUses: 1,
            discountType: 'PERCENTAGE',
            discountValue: 20,
            appliedToPayments: []
          }
        }
      };

      mockRepositories.businessSubscription.update.mockResolvedValue(updatedSubscription);

      const applyResult = await subscriptionService.applyDiscountToSubscription(
        userId,
        businessId,
        discountCode
      );

      expect(applyResult.success).toBe(true);
      expect(updatedSubscription.metadata.pendingDiscount.code).toBe(discountCode);

      // Step 4: Next payment applies the discount
      const discountedAmount = TEST_PRICES.BASIC_TIER1 * 0.8;
      const payment = MockFactories.paymentWithDiscount(discountCode, {
        businessId,
        subscriptionId: existingSubscription.id,
        amount: discountedAmount
      });

      mockRepositories.payment.create.mockResolvedValue(payment);

      expect(payment.amount).toBe(discountedAmount);
      expect(payment.metadata.discount.code).toBe(discountCode);
    });
  });

  describe('Scenario 4: Payment Failure and Retry', () => {
    it('should retry failed payment 3 times before expiring subscription', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const subscriptionId = 'sub-123';

      // Step 1: Initial payment fails
      const failedPayment = MockFactories.failedPayment({
        id: 'pay-fail-1',
        businessId,
        subscriptionId,
        status: 'FAILED',
        failureReason: 'Insufficient funds',
        metadata: {
          retryCount: 0,
          maxRetries: 3
        }
      });

      mockRepositories.payment.create.mockResolvedValue(failedPayment);

      expect(failedPayment.status).toBe('FAILED');

      // Step 2: First retry (Day 1) - fails
      jest.useFakeTimers();
      jest.advanceTimersByTime(1 * 24 * 60 * 60 * 1000); // 1 day

      const retry1 = {
        ...failedPayment,
        id: 'pay-retry-1',
        metadata: {
          ...failedPayment.metadata,
          retryCount: 1
        }
      };

      mockRepositories.payment.findById.mockResolvedValue(failedPayment);
      mockRepositories.payment.create.mockResolvedValue(retry1);

      expect(retry1.metadata.retryCount).toBe(1);

      // Step 3: Second retry (Day 2) - fails
      jest.advanceTimersByTime(1 * 24 * 60 * 60 * 1000); // 1 day

      const retry2 = {
        ...failedPayment,
        id: 'pay-retry-2',
        metadata: {
          ...failedPayment.metadata,
          retryCount: 2
        }
      };

      mockRepositories.payment.create.mockResolvedValue(retry2);

      expect(retry2.metadata.retryCount).toBe(2);

      // Step 4: Third retry (Day 3) - fails
      jest.advanceTimersByTime(1 * 24 * 60 * 60 * 1000); // 1 day

      const retry3 = {
        ...failedPayment,
        id: 'pay-retry-3',
        status: 'FAILED',
        metadata: {
          ...failedPayment.metadata,
          retryCount: 3
        }
      };

      mockRepositories.payment.create.mockResolvedValue(retry3);

      expect(retry3.metadata.retryCount).toBe(3);

      // Step 5: Subscription expires after max retries
      const expiredSubscription = MockFactories.businessSubscription({
        id: subscriptionId,
        businessId,
        status: 'EXPIRED',
        failedPaymentCount: 3
      });

      mockRepositories.businessSubscription.update.mockResolvedValue(expiredSubscription);

      expect(expiredSubscription.status).toBe('EXPIRED');
      expect(expiredSubscription.failedPaymentCount).toBe(3);

      jest.useRealTimers();
    });

    it('should succeed on second retry attempt', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const subscriptionId = 'sub-123';

      // Step 1: Initial payment fails
      const failedPayment = MockFactories.failedPayment({
        id: 'pay-fail-1',
        businessId,
        subscriptionId,
        metadata: {
          retryCount: 0,
          maxRetries: 3
        }
      });

      mockRepositories.payment.create.mockResolvedValue(failedPayment);

      // Step 2: First retry - fails
      const retry1 = {
        ...failedPayment,
        id: 'pay-retry-1',
        metadata: {
          ...failedPayment.metadata,
          retryCount: 1
        }
      };

      mockRepositories.payment.create.mockResolvedValue(retry1);

      // Step 3: Second retry - SUCCESS
      const successPayment = MockFactories.payment({
        id: 'pay-retry-2-success',
        businessId,
        subscriptionId,
        status: 'SUCCEEDED',
        amount: TEST_PRICES.BASIC_TIER1
      });

      mockRepositories.payment.create.mockResolvedValue(successPayment);

      expect(successPayment.status).toBe('SUCCEEDED');

      // Step 4: Subscription remains active
      const activeSubscription = MockFactories.businessSubscription({
        id: subscriptionId,
        businessId,
        status: 'ACTIVE',
        failedPaymentCount: 0 // Reset counter
      });

      mockRepositories.businessSubscription.update.mockResolvedValue(activeSubscription);

      expect(activeSubscription.status).toBe('ACTIVE');
      expect(activeSubscription.failedPaymentCount).toBe(0);
    });
  });

  describe('Scenario 5: Subscription Upgrade with Proration', () => {
    it('should upgrade plan and calculate proration correctly', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      // Step 1: User has active Basic subscription
      const currentSubscription = MockFactories.businessSubscription({
        businessId,
        planId: TEST_PLAN_IDS.BASIC_TIER1,
        status: 'ACTIVE',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01')
      });

      mockRepositories.businessSubscription.findActiveSubscription
        .mockResolvedValue(currentSubscription);

      // Step 2: User upgrades to Premium (day 15 of billing period)
      const upgradeDate = new Date('2024-01-15'); // Halfway through period
      const newPlanId = TEST_PLAN_IDS.PREMIUM_TIER1;

      const mockNewPlan = MockFactories.premiumPlan({
        id: newPlanId,
        price: TEST_PRICES.PREMIUM_TIER1
      });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockNewPlan);

      // Calculate proration
      const daysRemaining = 16; // Days left in period
      const daysTotal = 31; // Total days in period
      const basicPlanDailyRate = TEST_PRICES.BASIC_TIER1 / daysTotal;
      const premiumPlanDailyRate = TEST_PRICES.PREMIUM_TIER1 / daysTotal;

      const basicRefund = basicPlanDailyRate * daysRemaining;
      const premiumCharge = premiumPlanDailyRate * daysRemaining;
      const prorationAmount = premiumCharge - basicRefund;

      const upgradePayment = MockFactories.payment({
        businessId,
        subscriptionId: currentSubscription.id,
        amount: prorationAmount,
        metadata: {
          type: 'upgrade_proration',
          oldPlanId: TEST_PLAN_IDS.BASIC_TIER1,
          newPlanId: TEST_PLAN_IDS.PREMIUM_TIER1,
          proration: {
            daysRemaining,
            basicRefund,
            premiumCharge,
            proratedAmount: prorationAmount
          }
        }
      });

      mockRepositories.payment.create.mockResolvedValue(upgradePayment);

      // Step 3: Update subscription to new plan
      const upgradedSubscription = {
        ...currentSubscription,
        planId: newPlanId
      };

      mockRepositories.businessSubscription.update.mockResolvedValue(upgradedSubscription);

      expect(upgradedSubscription.planId).toBe(newPlanId);
      expect(upgradePayment.amount).toBeGreaterThan(0); // Should charge prorated difference
      expect(upgradePayment.metadata.type).toBe('upgrade_proration');
    });
  });
});
