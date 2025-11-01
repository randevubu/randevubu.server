import { SubscriptionService } from '../../../src/services/domain/subscription/subscriptionService';
import { SubscriptionRepository } from '../../../src/repositories/subscriptionRepository';
import { RBACService } from '../../../src/services/domain/rbac/rbacService';
import { PricingTierService } from '../../../src/services/domain/pricing/pricingTierService';
import { DiscountCodeService } from '../../../src/services/domain/discount/discountCodeService';
import { SubscriptionStatus } from '../../../src/types/business';
import { MockFactories } from '../../utils/mockFactories';
import { TEST_PLAN_IDS, TEST_BUSINESS_IDS, TEST_USER_IDS, TEST_PRICES, TEST_DISCOUNT_CODES } from '../../utils/testData';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockSubscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let mockRBACService: jest.Mocked<RBACService>;
  let mockPricingTierService: jest.Mocked<PricingTierService>;
  let mockDiscountCodeService: jest.Mocked<DiscountCodeService>;

  beforeEach(() => {
    // Create mocks
    mockSubscriptionRepository = {
      findAllPlans: jest.fn(),
      findPlanById: jest.fn(),
      findPlansByBillingInterval: jest.fn(),
      findActiveSubscriptionByBusinessId: jest.fn(),
      findSubscriptionsByBusinessId: jest.fn(),
      createSubscription: jest.fn(),
      startTrial: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
      cancelSubscription: jest.fn(),
      findTrialsEndingSoon: jest.fn(),
      findExpiredSubscriptions: jest.fn(),
      findByBusinessId: jest.fn()
    } as any;

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn()
    } as any;

    mockPricingTierService = {
      getCityTier: jest.fn(),
      getLocationPricing: jest.fn()
    } as any;

    mockDiscountCodeService = {
      validateDiscountCode: jest.fn(),
      applyDiscountToSubscription: jest.fn()
    } as any;

    subscriptionService = new SubscriptionService(
      mockSubscriptionRepository,
      mockRBACService,
      mockPricingTierService,
      mockDiscountCodeService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPlans', () => {
    it('should return all active plans', async () => {
      const mockPlans = [
        MockFactories.subscriptionPlan(),
        MockFactories.premiumPlan()
      ];

      mockSubscriptionRepository.findAllPlans.mockResolvedValue(mockPlans as any);

      const result = await subscriptionService.getAllPlans();

      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionRepository.findAllPlans).toHaveBeenCalled();
    });

    it('should return empty array when no plans exist', async () => {
      mockSubscriptionRepository.findAllPlans.mockResolvedValue([]);

      const result = await subscriptionService.getAllPlans();

      expect(result).toEqual([]);
      expect(mockSubscriptionRepository.findAllPlans).toHaveBeenCalled();
    });
  });

  describe('getPlanById', () => {
    it('should return plan by ID', async () => {
      const mockPlan = MockFactories.subscriptionPlan({ id: TEST_PLAN_IDS.BASIC_TIER1 });

      mockSubscriptionRepository.findPlanById.mockResolvedValue(mockPlan as any);

      const result = await subscriptionService.getPlanById(TEST_PLAN_IDS.BASIC_TIER1);

      expect(result).toEqual(mockPlan);
      expect(mockSubscriptionRepository.findPlanById).toHaveBeenCalledWith(TEST_PLAN_IDS.BASIC_TIER1);
    });

    it('should return null for non-existent plan', async () => {
      mockSubscriptionRepository.findPlanById.mockResolvedValue(null);

      const result = await subscriptionService.getPlanById('non-existent');

      expect(result).toBeNull();
      expect(mockSubscriptionRepository.findPlanById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('getPlansByBillingInterval', () => {
    it('should return plans filtered by billing interval', async () => {
      const monthlyPlans = [
        MockFactories.subscriptionPlan({ billingInterval: 'MONTHLY' }),
        MockFactories.premiumPlan({ billingInterval: 'MONTHLY' })
      ];

      mockSubscriptionRepository.findPlansByBillingInterval.mockResolvedValue(monthlyPlans as any);

      const result = await subscriptionService.getPlansByBillingInterval('MONTHLY');

      expect(result).toEqual(monthlyPlans);
      expect(mockSubscriptionRepository.findPlansByBillingInterval).toHaveBeenCalledWith('MONTHLY');
    });

    it('should return empty array for invalid billing interval', async () => {
      mockSubscriptionRepository.findPlansByBillingInterval.mockResolvedValue([]);

      const result = await subscriptionService.getPlansByBillingInterval('INVALID');

      expect(result).toEqual([]);
    });
  });

  describe('getAllPlansWithLocationPricing', () => {
    it('should return plans with location pricing for Istanbul', async () => {
      const basePlans = [
        MockFactories.subscriptionPlan({
          features: { pricingTier: 'TIER_1', trialDays: 7 }
        })
      ];

      mockSubscriptionRepository.findAllPlans.mockResolvedValue(basePlans as any);
      mockPricingTierService.getCityTier.mockResolvedValue('TIER_1');

      const result = await subscriptionService.getAllPlansWithLocationPricing('Istanbul');

      expect(result).toHaveLength(1);
      expect(result[0].locationPricing).toEqual({
        city: 'Istanbul',
        state: '',
        country: 'Turkey',
        multiplier: 1.0
      });
      expect(mockPricingTierService.getCityTier).toHaveBeenCalledWith('Istanbul', undefined, 'Turkey');
    });

    it('should return all plans when no city specified', async () => {
      const basePlans = [
        MockFactories.subscriptionPlan(),
        MockFactories.premiumPlan()
      ];

      mockSubscriptionRepository.findAllPlans.mockResolvedValue(basePlans as any);

      const result = await subscriptionService.getAllPlansWithLocationPricing();

      expect(result).toEqual(basePlans);
      expect(mockPricingTierService.getCityTier).not.toHaveBeenCalled();
    });

    it('should filter plans by tier for tier 2 city', async () => {
      const basePlans = [
        MockFactories.subscriptionPlan({
          id: 'plan-tier1',
          features: { pricingTier: 'TIER_1', trialDays: 7 }
        }),
        MockFactories.subscriptionPlan({
          id: 'plan-tier2',
          features: { pricingTier: 'TIER_2', trialDays: 7 }
        })
      ];

      mockSubscriptionRepository.findAllPlans.mockResolvedValue(basePlans as any);
      mockPricingTierService.getCityTier.mockResolvedValue('TIER_2');

      const result = await subscriptionService.getAllPlansWithLocationPricing('Antalya');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('plan-tier2');
      expect(mockPricingTierService.getCityTier).toHaveBeenCalledWith('Antalya', undefined, 'Turkey');
    });
  });

  describe('subscribeBusiness', () => {
    it('should create trial subscription for basic plan', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;

      const mockPlan = MockFactories.subscriptionPlan({
        id: planId,
        features: { trialDays: 7 }
      });

      const mockSubscriptionData = {
        planId,
        paymentMethodId: 'pm-test-123',
        card: {},
        buyer: {}
      };

      const expectedSubscription = MockFactories.trialSubscription({
        businessId,
        planId
      });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findPlanById.mockResolvedValue(mockPlan as any);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);
      mockSubscriptionRepository.startTrial.mockResolvedValue(expectedSubscription as any);

      const result = await subscriptionService.subscribeBusiness(
        userId,
        businessId,
        mockSubscriptionData as any
      );

      expect(result.status).toBe(SubscriptionStatus.TRIAL);
      expect(result.trialStart).toBeDefined();
      expect(result.trialEnd).toBeDefined();
      expect(mockSubscriptionRepository.startTrial).toHaveBeenCalledWith(
        businessId,
        planId,
        7, // trial days
        'pm-test-123',
        null
      );
    });

    it('should create active subscription for premium plan (no trial)', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.PREMIUM_TIER1;

      const mockPlan = MockFactories.premiumPlan({
        id: planId,
        features: { trialDays: 0 } // No trial
      });

      const mockSubscriptionData = {
        planId,
        card: {},
        buyer: {}
      };

      const expectedSubscription = MockFactories.businessSubscription({
        businessId,
        planId,
        status: SubscriptionStatus.ACTIVE
      });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findPlanById.mockResolvedValue(mockPlan as any);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);
      mockSubscriptionRepository.createSubscription.mockResolvedValue(expectedSubscription as any);

      const result = await subscriptionService.subscribeBusiness(
        userId,
        businessId,
        mockSubscriptionData as any
      );

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.trialStart).toBeNull();
      expect(result.trialEnd).toBeNull();
    });

    it('should throw error if business already has active subscription', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;

      const mockPlan = MockFactories.subscriptionPlan({ id: planId });
      const existingSubscription = MockFactories.businessSubscription({
        businessId,
        status: SubscriptionStatus.ACTIVE
      });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findPlanById.mockResolvedValue(mockPlan as any);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(existingSubscription as any);

      await expect(
        subscriptionService.subscribeBusiness(userId, businessId, { planId } as any)
      ).rejects.toThrow('Business already has an active subscription');
    });

    it('should throw error if plan not found', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = 'non-existent';

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findPlanById.mockResolvedValue(null);

      await expect(
        subscriptionService.subscribeBusiness(userId, businessId, { planId } as any)
      ).rejects.toThrow('Invalid or inactive subscription plan');
    });

    it('should throw error if user lacks permission', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        subscriptionService.subscribeBusiness(userId, businessId, { planId } as any)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should store discount code in metadata when provided', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;
      const discountCode = TEST_DISCOUNT_CODES.VALID_ONE_TIME.code;

      const mockPlan = MockFactories.subscriptionPlan({
        id: planId,
        features: { trialDays: 7 }
      });

      const mockSubscriptionData = {
        planId,
        discountCode,
        paymentMethodId: 'pm-test-123',
        card: {},
        buyer: {}
      };

      const mockDiscountValidation = {
        isValid: true,
        discountCode: MockFactories.discountCode({ code: discountCode }),
        calculatedDiscount: {
          originalAmount: TEST_PRICES.BASIC_TIER1,
          discountAmount: TEST_PRICES.BASIC_TIER1 * 0.2,
          finalAmount: TEST_PRICES.BASIC_TIER1 * 0.8
        }
      };

      const expectedSubscription = MockFactories.trialWithDiscount(discountCode, {
        businessId,
        planId
      });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findPlanById.mockResolvedValue(mockPlan as any);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);
      mockDiscountCodeService.validateDiscountCode.mockResolvedValue(mockDiscountValidation as any);
      mockSubscriptionRepository.startTrial.mockResolvedValue(expectedSubscription as any);

      const result = await subscriptionService.subscribeBusiness(
        userId,
        businessId,
        mockSubscriptionData as any
      );

      const metadata = result.metadata as any;
      expect(metadata.pendingDiscount).toBeDefined();
      expect(metadata.pendingDiscount.code).toBe(discountCode);
      expect(mockDiscountCodeService.validateDiscountCode).toHaveBeenCalledWith(
        discountCode,
        planId,
        mockPlan.price,
        userId
      );
    });

    it('should throw error if discount code is invalid', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;
      const invalidDiscountCode = 'INVALID123';

      const mockPlan = MockFactories.subscriptionPlan({ id: planId });

      const mockSubscriptionData = {
        planId,
        discountCode: invalidDiscountCode,
        card: {},
        buyer: {}
      };

      const mockDiscountValidation = {
        isValid: false,
        errorMessage: 'Invalid discount code'
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findPlanById.mockResolvedValue(mockPlan as any);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);
      mockDiscountCodeService.validateDiscountCode.mockResolvedValue(mockDiscountValidation as any);

      await expect(
        subscriptionService.subscribeBusiness(userId, businessId, mockSubscriptionData as any)
      ).rejects.toThrow('Invalid discount code');
    });
  });

  describe('getBusinessSubscription', () => {
    it('should return active subscription for business', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      const mockSubscription = {
        ...MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.ACTIVE
        }),
        plan: MockFactories.subscriptionPlan()
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(mockSubscription);

      const result = await subscriptionService.getBusinessSubscription(userId, businessId);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepository.findActiveSubscriptionByBusinessId).toHaveBeenCalledWith(businessId);
    });

    it('should return null if no active subscription', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);

      const result = await subscriptionService.getBusinessSubscription(userId, businessId);

      expect(result).toBeNull();
    });

    it('should throw error if user lacks permission', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        subscriptionService.getBusinessSubscription(userId, businessId)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getSubscriptionHistory', () => {
    it('should return subscription history for business', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      const mockHistory = [
        MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.CANCELED,
          createdAt: new Date('2024-01-01')
        }),
        MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.ACTIVE,
          createdAt: new Date('2024-02-01')
        })
      ];

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findSubscriptionsByBusinessId.mockResolvedValue(mockHistory);

      const result = await subscriptionService.getSubscriptionHistory(userId, businessId);

      expect(result).toEqual(mockHistory);
      expect(mockSubscriptionRepository.findSubscriptionsByBusinessId).toHaveBeenCalledWith(businessId);
    });

    it('should return empty array if no history', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findSubscriptionsByBusinessId.mockResolvedValue([]);

      const result = await subscriptionService.getSubscriptionHistory(userId, businessId);

      expect(result).toEqual([]);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const cancelAtPeriodEnd = true;

      const mockSubscription = {
        ...MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.ACTIVE
        }),
        plan: MockFactories.subscriptionPlan()
      };

      const updatedSubscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: true
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.cancelSubscription.mockResolvedValue(updatedSubscription);

      const result = await subscriptionService.cancelSubscription(
        userId,
        businessId,
        cancelAtPeriodEnd
      );

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE); // Status remains active until period end
      expect(mockSubscriptionRepository.cancelSubscription).toHaveBeenCalled();
    });

    it('should cancel subscription immediately', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const cancelAtPeriodEnd = false;

      const mockSubscription = {
        ...MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.ACTIVE
        }),
        plan: MockFactories.subscriptionPlan()
      };

      const updatedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date()
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.cancelSubscription.mockResolvedValue(updatedSubscription);

      const result = await subscriptionService.cancelSubscription(
        userId,
        businessId,
        cancelAtPeriodEnd
      );

      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(result.canceledAt).toBeDefined();
    });

    it('should throw error if no active subscription', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);

      await expect(
        subscriptionService.cancelSubscription(userId, businessId, true)
      ).rejects.toThrow('No active subscription found');
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate canceled subscription before period end', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      const mockSubscription = {
        ...MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true
        }),
        plan: MockFactories.subscriptionPlan()
      };

      const reactivatedSubscription = {
        ...mockSubscription,
        cancelAtPeriodEnd: false
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockRBACService.hasPermission.mockResolvedValue(false);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.findSubscriptionsByBusinessId.mockResolvedValue([mockSubscription]);
      mockSubscriptionRepository.cancelSubscription.mockResolvedValue(reactivatedSubscription);

      const result = await subscriptionService.reactivateSubscription(userId, businessId);

      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(mockSubscriptionRepository.cancelSubscription).toHaveBeenCalledWith(mockSubscription.id, false);
    });

    it('should throw error if subscription not found', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockRBACService.hasPermission.mockResolvedValue(false);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(null);
      mockSubscriptionRepository.findSubscriptionsByBusinessId.mockResolvedValue([]);

      await expect(
        subscriptionService.reactivateSubscription(userId, businessId)
      ).rejects.toThrow('No canceled subscription found to reactivate');
    });

    it('should throw error if subscription is already canceled', async () => {
      const userId = TEST_USER_IDS.BUSINESS_OWNER;
      const businessId = TEST_BUSINESS_IDS.ACTIVE;

      const mockSubscription = {
        ...MockFactories.businessSubscription({
          businessId,
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false, // Already fully canceled
          canceledAt: new Date()
        }),
        plan: MockFactories.subscriptionPlan()
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockRBACService.hasPermission.mockResolvedValue(false);
      mockSubscriptionRepository.findActiveSubscriptionByBusinessId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.findSubscriptionsByBusinessId.mockResolvedValue([mockSubscription]);

      await expect(
        subscriptionService.reactivateSubscription(userId, businessId)
      ).rejects.toThrow('No canceled subscription found to reactivate');
    });
  });

  describe('getTrialsEndingSoon', () => {
    it('should return trials ending within specified days', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const days = 3;

      const mockTrials = [
        MockFactories.trialSubscription({
          trialEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        }),
        MockFactories.trialSubscription({
          trialEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        })
      ];

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findTrialsEndingSoon.mockResolvedValue(mockTrials);

      const result = await subscriptionService.getTrialsEndingSoon(userId, days);

      expect(result).toEqual(mockTrials);
      expect(mockSubscriptionRepository.findTrialsEndingSoon).toHaveBeenCalledWith(days);
    });

    it('should throw error if user is not admin', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;
      const days = 3;

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        subscriptionService.getTrialsEndingSoon(userId, days)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getExpiredSubscriptions', () => {
    it('should return expired subscriptions', async () => {
      const userId = TEST_USER_IDS.ADMIN;

      const mockExpired = [
        MockFactories.businessSubscription({
          status: SubscriptionStatus.INCOMPLETE_EXPIRED,
          currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        })
      ];

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockSubscriptionRepository.findExpiredSubscriptions.mockResolvedValue(mockExpired);

      const result = await subscriptionService.getExpiredSubscriptions(userId);

      expect(result).toEqual(mockExpired);
      expect(mockSubscriptionRepository.findExpiredSubscriptions).toHaveBeenCalled();
    });

    it('should throw error if user is not admin', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        subscriptionService.getExpiredSubscriptions(userId)
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
