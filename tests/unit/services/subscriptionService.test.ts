import { SubscriptionService } from '../../../src/services/subscriptionService';
import { SubscriptionRepository } from '../../../src/repositories/subscriptionRepository';
import { RBACService } from '../../../src/services/rbacService';
import { TestHelpers } from '../../utils/testHelpers';
// import { testSubscriptions } from '../../fixtures/testData';
import { PermissionName } from '../../../src/types/auth';
import { SubscriptionStatus } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/repositories/subscriptionRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockSubscriptionRepository: any;
  let mockRBACService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSubscriptionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findByPlanId: jest.fn(),
      findByBillingInterval: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      getStats: jest.fn(),
      getTrialsEndingSoon: jest.fn(),
      getExpired: jest.fn(),
      getHistory: jest.fn(),
      checkLimits: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50, displayName: 'Owner' }],
        permissions: []
      })
    };

    // Create SubscriptionService instance
    subscriptionService = new SubscriptionService(
      mockSubscriptionRepository,
      mockRBACService
    );
  });

  describe('constructor', () => {
    it('should create SubscriptionService instance', () => {
      expect(subscriptionService).toBeInstanceOf(SubscriptionService);
    });
  });

  describe('getAllPlans', () => {
    it('should return all subscription plans successfully', async () => {
      // Arrange
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', price: 100 },
        { id: 'plan-2', name: 'Pro', price: 200 }
      ];

      mockSubscriptionRepository.findByPlanId.mockResolvedValue(mockPlans);

      // Act
      const result = await subscriptionService.getAllPlans();

      // Assert
      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionRepository.findByPlanId).toHaveBeenCalled();
    });
  });

  describe('getPlanById', () => {
    it('should return plan when found', async () => {
      // Arrange
      const planId = 'plan-123';
      const mockPlan = {
        id: planId,
        name: 'Basic Plan',
        price: 100,
        currency: 'TRY'
      };

      mockSubscriptionRepository.findByPlanId.mockResolvedValue(mockPlan);

      // Act
      const result = await subscriptionService.getPlanById(planId);

      // Assert
      expect(result).toEqual(mockPlan);
      expect(mockSubscriptionRepository.findByPlanId).toHaveBeenCalledWith(planId);
    });

    it('should return null when plan not found', async () => {
      // Arrange
      const planId = 'plan-999';

      mockSubscriptionRepository.findByPlanId.mockResolvedValue(null);

      // Act
      const result = await subscriptionService.getPlanById(planId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getPlansByBillingInterval', () => {
    it('should return plans by billing interval successfully', async () => {
      // Arrange
      const interval = 'monthly';
      const mockPlans = [
        { id: 'plan-1', name: 'Basic Monthly', billingInterval: 'monthly' },
        { id: 'plan-2', name: 'Pro Monthly', billingInterval: 'monthly' }
      ];

      mockSubscriptionRepository.findByBillingInterval.mockResolvedValue(mockPlans);

      // Act
      const result = await subscriptionService.getPlansByBillingInterval(interval);

      // Assert
      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionRepository.findByBillingInterval).toHaveBeenCalledWith(interval);
    });
  });

  describe('subscribeBusiness', () => {
    it('should subscribe business successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const subscriptionData = {
        planId: 'plan-123',
        paymentMethodId: 'payment-123',
        trialDays: 14
      };

      const mockSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        planId: 'plan-123',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      mockSubscriptionRepository.create.mockResolvedValue(mockSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.subscribeBusiness(userId, businessId, subscriptionData);

      // Assert
      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith({
        businessId,
        planId: subscriptionData.planId,
        paymentMethodId: subscriptionData.paymentMethodId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
        trialStart: expect.any(Date),
        trialEnd: expect.any(Date)
      });
    });

    it('should throw error when plan not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const subscriptionData = {
        planId: 'plan-999',
        paymentMethodId: 'payment-123'
      };

      mockSubscriptionRepository.findByPlanId.mockResolvedValue(null);

      // Act & Assert
      await expect(subscriptionService.subscribeBusiness(userId, businessId, subscriptionData))
        .rejects.toThrow('Subscription plan not found');
    });
  });

  describe('getBusinessSubscription', () => {
    it('should return business subscription when found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.getBusinessSubscription(userId, businessId);

      // Assert
      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepository.findByBusinessId).toHaveBeenCalledWith(businessId);
    });

    it('should throw error when subscription not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-999';

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(subscriptionService.getBusinessSubscription(userId, businessId))
        .rejects.toThrow('Business subscription not found');
    });
  });

  describe('getSubscriptionHistory', () => {
    it('should return subscription history successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockHistory = [
        { id: 'sub-1', status: SubscriptionStatus.ACTIVE, createdAt: new Date() },
        { id: 'sub-2', status: SubscriptionStatus.CANCELED, createdAt: new Date() }
      ];

      mockSubscriptionRepository.getHistory.mockResolvedValue(mockHistory);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.getSubscriptionHistory(userId, businessId);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockSubscriptionRepository.getHistory).toHaveBeenCalledWith(businessId);
    });
  });

  describe('upgradePlan', () => {
    it('should upgrade subscription plan successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const newPlanId = 'plan-pro';

      const mockCurrentSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        planId: 'plan-basic',
        status: SubscriptionStatus.ACTIVE
      };

      const mockNewPlan = {
        id: 'plan-pro',
        name: 'Pro Plan',
        price: 200
      };

      const mockUpdatedSubscription = {
        ...mockCurrentSubscription,
        planId: newPlanId
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockCurrentSubscription);
      mockSubscriptionRepository.findByPlanId.mockResolvedValue(mockNewPlan);
      mockSubscriptionRepository.update.mockResolvedValue(mockUpdatedSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.upgradePlan(userId, businessId, newPlanId);

      // Assert
      expect(result).toEqual(mockUpdatedSubscription);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        mockCurrentSubscription.id,
        { planId: newPlanId }
      );
    });

    it('should throw error when current subscription not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-999';
      const newPlanId = 'plan-pro';

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(subscriptionService.upgradePlan(userId, businessId, newPlanId))
        .rejects.toThrow('Business subscription not found');
    });

    it('should throw error when new plan not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const newPlanId = 'plan-999';

      const mockCurrentSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        planId: 'plan-basic',
        status: SubscriptionStatus.ACTIVE
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockCurrentSubscription);
      mockSubscriptionRepository.findByPlanId.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(subscriptionService.upgradePlan(userId, businessId, newPlanId))
        .rejects.toThrow('New subscription plan not found');
    });
  });

  describe('downgradePlan', () => {
    it('should downgrade subscription plan successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const newPlanId = 'plan-basic';

      const mockCurrentSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        planId: 'plan-pro',
        status: SubscriptionStatus.ACTIVE
      };

      const mockNewPlan = {
        id: 'plan-basic',
        name: 'Basic Plan',
        price: 100
      };

      const mockUpdatedSubscription = {
        ...mockCurrentSubscription,
        planId: newPlanId
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockCurrentSubscription);
      mockSubscriptionRepository.findByPlanId.mockResolvedValue(mockNewPlan);
      mockSubscriptionRepository.update.mockResolvedValue(mockUpdatedSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.downgradePlan(userId, businessId, newPlanId);

      // Assert
      expect(result).toEqual(mockUpdatedSubscription);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        mockCurrentSubscription.id,
        { planId: newPlanId }
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const reason = 'Customer requested cancellation';

      const mockSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE
      };

      const mockCancelledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
        canceledAt: expect.any(Date)
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.update.mockResolvedValue(mockCancelledSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.cancelSubscription(userId, businessId);

      // Assert
      expect(result).toEqual(mockCancelledSubscription);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        mockSubscription.id,
        {
          cancelAtPeriodEnd: true,
          canceledAt: expect.any(Date)
        }
      );
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true
      };

      const mockReactivatedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        canceledAt: null
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.update.mockResolvedValue(mockReactivatedSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.reactivateSubscription(userId, businessId);

      // Assert
      expect(result).toEqual(mockReactivatedSubscription);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        mockSubscription.id,
        {
          cancelAtPeriodEnd: false,
          canceledAt: null
        }
      );
    });
  });

  describe('convertTrialToActive', () => {
    it('should convert trial to active successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const paymentMethodId = 'payment-123';

      const mockTrialSubscription = {
        id: 'subscription-123',
        businessId: 'business-123',
        status: SubscriptionStatus.TRIAL,
        trialStart: new Date(),
        trialEnd: new Date()
      };

      const mockActiveSubscription = {
        ...mockTrialSubscription,
        status: SubscriptionStatus.ACTIVE,
        paymentMethodId,
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date)
      };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockTrialSubscription);
      mockSubscriptionRepository.update.mockResolvedValue(mockActiveSubscription);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.convertTrialToActive(userId, businessId, paymentMethodId);

      // Assert
      expect(result).toEqual(mockActiveSubscription);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        mockTrialSubscription.id,
        {
          status: SubscriptionStatus.ACTIVE,
          paymentMethodId,
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date)
        }
      );
    });
  });

  describe('checkSubscriptionLimits', () => {
    it('should check subscription limits successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockLimits = {
        maxBusinesses: 1,
        maxStaffPerBusiness: 5,
        maxAppointmentsPerDay: 50,
        currentUsage: {
          businesses: 1,
          staff: 3,
          appointmentsToday: 25
        }
      };

      mockSubscriptionRepository.checkLimits.mockResolvedValue(mockLimits);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.checkSubscriptionLimits(userId, businessId);

      // Assert
      expect(result).toEqual(mockLimits);
      expect(mockSubscriptionRepository.checkLimits).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions for admin', async () => {
      // Arrange
      const userId = 'admin-123';
      const mockSubscriptions = [
        { id: 'sub-1', businessId: 'business-1' },
        { id: 'sub-2', businessId: 'business-2' }
      ];

      mockSubscriptionRepository.getAll.mockResolvedValue(mockSubscriptions);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.getAllSubscriptions(userId);

      // Assert
      expect(result).toEqual(mockSubscriptions);
      expect(mockSubscriptionRepository.getAll).toHaveBeenCalled();
    });
  });

  describe('getSubscriptionStats', () => {
    it('should return subscription statistics successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStats = {
        total: 100,
        active: 80,
        cancelled: 15,
        trial: 5,
        revenue: 50000
      };

      mockSubscriptionRepository.getStats.mockResolvedValue(mockStats);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.getSubscriptionStats(userId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockSubscriptionRepository.getStats).toHaveBeenCalled();
    });
  });

  describe('getTrialsEndingSoon', () => {
    it('should return trials ending soon successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const days = 7;
      const mockTrials = [
        { id: 'sub-1', businessId: 'business-1', trialEnd: new Date() },
        { id: 'sub-2', businessId: 'business-2', trialEnd: new Date() }
      ];

      mockSubscriptionRepository.getTrialsEndingSoon.mockResolvedValue(mockTrials);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.getTrialsEndingSoon(userId, days);

      // Assert
      expect(result).toEqual(mockTrials);
      expect(mockSubscriptionRepository.getTrialsEndingSoon).toHaveBeenCalledWith(days);
    });
  });

  describe('getExpiredSubscriptions', () => {
    it('should return expired subscriptions successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockExpired = [
        { id: 'sub-1', businessId: 'business-1', status: SubscriptionStatus.CANCELED },
        { id: 'sub-2', businessId: 'business-2', status: SubscriptionStatus.CANCELED }
      ];

      mockSubscriptionRepository.getExpired.mockResolvedValue(mockExpired);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await subscriptionService.getExpiredSubscriptions(userId);

      // Assert
      expect(result).toEqual(mockExpired);
      expect(mockSubscriptionRepository.getExpired).toHaveBeenCalled();
    });
  });
});
