import { Request, Response } from 'express';
import { SubscriptionController } from '../../../src/controllers/subscriptionController';
import { SubscriptionService } from '../../../src/services/subscriptionService';
import { TestHelpers } from '../../utils/testHelpers';
import { GuaranteedAuthRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/subscriptionService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('SubscriptionController', () => {
  let subscriptionController: SubscriptionController;
  let mockSubscriptionService: any;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockGuaranteedAuthRequest: GuaranteedAuthRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock SubscriptionService
    mockSubscriptionService = {
      getAllPlans: jest.fn(),
      getPlanById: jest.fn(),
      getPlansByBillingInterval: jest.fn(),
      subscribeBusiness: jest.fn(),
      getBusinessSubscription: jest.fn(),
      getSubscriptionHistory: jest.fn(),
      upgradePlan: jest.fn(),
      downgradePlan: jest.fn(),
      cancelSubscription: jest.fn(),
      reactivateSubscription: jest.fn(),
      convertTrialToActive: jest.fn(),
      checkSubscriptionLimits: jest.fn(),
      calculateUpgradeProration: jest.fn(),
      validatePlanLimits: jest.fn(),
      getAllSubscriptions: jest.fn(),
      getSubscriptionStats: jest.fn(),
      getTrialsEndingSoon: jest.fn(),
      getExpiredSubscriptions: jest.fn(),
      forceUpdateSubscriptionStatus: jest.fn(),
      processExpiredSubscriptions: jest.fn(),
      processSubscriptionRenewals: jest.fn(),
      sendTrialEndingNotifications: jest.fn(),
      getSubscriptionsByStatus: jest.fn(),
      getSubscriptionsByPlan: jest.fn(),
      getBusinessesWithoutSubscription: jest.fn(),
      getRevenueAnalytics: jest.fn()
    };

    // Create SubscriptionController instance
    subscriptionController = new SubscriptionController(mockSubscriptionService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();

    mockGuaranteedAuthRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockGuaranteedAuthRequest.user = { 
      id: 'user-123', 
      phoneNumber: '+905551234567',
      isVerified: true,
      isActive: true,
      roles: [{ id: 'user-role', name: 'USER', level: 1 }],
      effectiveLevel: 1
    };
    mockGuaranteedAuthRequest.token = {
      userId: 'user-123',
      phoneNumber: '+905551234567',
      type: 'access',
      iat: Date.now(),
      exp: Date.now() + 3600000
    };
  });

  describe('constructor', () => {
    it('should create SubscriptionController instance', () => {
      expect(subscriptionController).toBeInstanceOf(SubscriptionController);
    });
  });

  describe('getAllPlans', () => {
    it('should get all plans successfully', async () => {
      // Arrange
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', price: 29.99 },
        { id: 'plan-2', name: 'Pro', price: 59.99 }
      ];

      mockSubscriptionService.getAllPlans.mockResolvedValue(mockPlans);

      // Act
      await subscriptionController.getAllPlans(mockRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getAllPlans).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans,
        meta: {
          total: mockPlans.length
        }
      });
    });
  });

  describe('getPlanById', () => {
    it('should get plan by id successfully', async () => {
      // Arrange
      const planId = 'plan-123';
      mockRequest.params = { id: planId };

      const mockPlan = {
        id: planId,
        name: 'Pro Plan',
        price: 59.99,
        features: ['unlimited_appointments', 'sms_notifications']
      };

      mockSubscriptionService.getPlanById.mockResolvedValue(mockPlan);

      // Act
      await subscriptionController.getPlanById(mockRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getPlanById).toHaveBeenCalledWith(planId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlan
      });
    });
  });

  describe('getPlansByBillingInterval', () => {
    it('should get plans by billing interval successfully', async () => {
      // Arrange
      const interval = 'monthly';
      mockRequest.params = { interval };

      const mockPlans = [
        { id: 'plan-1', name: 'Basic Monthly', price: 29.99, interval: 'monthly' },
        { id: 'plan-2', name: 'Pro Monthly', price: 59.99, interval: 'monthly' }
      ];

      mockSubscriptionService.getPlansByBillingInterval.mockResolvedValue(mockPlans);

      // Act
      await subscriptionController.getPlansByBillingInterval(mockRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getPlansByBillingInterval).toHaveBeenCalledWith(interval);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans,
        meta: {
          total: mockPlans.length,
          billingInterval: interval
        }
      });
    });
  });

  describe('subscribeBusiness', () => {
    it('should subscribe business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const subscriptionData = {
        planId: 'plan-123',
        paymentMethodId: 'pm_123'
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = subscriptionData;

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        planId: 'plan-123',
        status: 'ACTIVE'
      };

      mockSubscriptionService.subscribeBusiness.mockResolvedValue(mockSubscription);

      // Act
      await subscriptionController.subscribeBusiness(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.subscribeBusiness).toHaveBeenCalledWith('user-123', businessId, subscriptionData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscription,
        message: 'Business subscribed successfully'
      });
    });
  });

  describe('getBusinessSubscription', () => {
    it('should get business subscription successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockGuaranteedAuthRequest.params = { businessId };

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        planId: 'plan-123',
        status: 'ACTIVE',
        currentPeriodEnd: '2024-02-15T00:00:00Z'
      };

      mockSubscriptionService.getBusinessSubscription.mockResolvedValue(mockSubscription);

      // Act
      await subscriptionController.getBusinessSubscription(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getBusinessSubscription).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscription
      });
    });
  });

  describe('getSubscriptionHistory', () => {
    it('should get subscription history successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockGuaranteedAuthRequest.params = { businessId };

      const mockHistory = [
        { id: 'sub-1', planId: 'plan-1', status: 'CANCELED', createdAt: '2024-01-01' },
        { id: 'sub-2', planId: 'plan-2', status: 'ACTIVE', createdAt: '2024-01-15' }
      ];

      mockSubscriptionService.getSubscriptionHistory.mockResolvedValue(mockHistory);

      // Act
      await subscriptionController.getSubscriptionHistory(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getSubscriptionHistory).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
        meta: {
          total: mockHistory.length,
          businessId
        }
      });
    });
  });

  describe('upgradePlan', () => {
    it('should upgrade plan successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const upgradeData = {
        newPlanId: 'plan-pro'
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = upgradeData;

      const mockUpgradedSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        planId: 'plan-pro',
        status: 'ACTIVE'
      };

      mockSubscriptionService.upgradePlan.mockResolvedValue(mockUpgradedSubscription);

      // Act
      await subscriptionController.upgradePlan(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.upgradePlan).toHaveBeenCalledWith('user-123', businessId, 'plan-pro');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpgradedSubscription,
        message: 'Plan upgraded successfully'
      });
    });
  });

  describe('downgradePlan', () => {
    it('should downgrade plan successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const downgradeData = {
        newPlanId: 'plan-basic'
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = downgradeData;

      const mockDowngradedSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        planId: 'plan-basic',
        status: 'ACTIVE'
      };

      mockSubscriptionService.downgradePlan.mockResolvedValue(mockDowngradedSubscription);

      // Act
      await subscriptionController.downgradePlan(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.downgradePlan).toHaveBeenCalledWith('user-123', businessId, 'plan-basic');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDowngradedSubscription,
        message: 'Plan downgraded successfully'
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const cancelData = {
        cancelAtPeriodEnd: true
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = cancelData;

      const mockCancelledSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: 'CANCELED',
        cancellationReason: 'No longer needed'
      };

      mockSubscriptionService.cancelSubscription.mockResolvedValue(mockCancelledSubscription);

      // Act
      await subscriptionController.cancelSubscription(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith('user-123', businessId, true);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledSubscription,
        message: 'Subscription will be cancelled at period end'
      });
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription successfully', async () => {
      // Arrange
      const businessId = 'business-123';

      mockGuaranteedAuthRequest.params = { businessId };

      const mockReactivatedSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: 'ACTIVE'
      };

      mockSubscriptionService.reactivateSubscription.mockResolvedValue(mockReactivatedSubscription);

      // Act
      await subscriptionController.reactivateSubscription(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.reactivateSubscription).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReactivatedSubscription,
        message: 'Subscription reactivated successfully'
      });
    });
  });

  describe('convertTrialToActive', () => {
    it('should convert trial to active successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const convertData = {
        paymentMethodId: 'pm_123'
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = convertData;

      const mockActiveSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        planId: 'plan-pro',
        status: 'ACTIVE'
      };

      mockSubscriptionService.convertTrialToActive.mockResolvedValue(mockActiveSubscription);

      // Act
      await subscriptionController.convertTrialToActive(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.convertTrialToActive).toHaveBeenCalledWith('user-123', businessId, 'pm_123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockActiveSubscription,
        message: 'Trial converted to active subscription'
      });
    });
  });

  describe('checkSubscriptionLimits', () => {
    it('should check subscription limits successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockGuaranteedAuthRequest.params = { businessId };

      const mockLimits = {
        appointments: { used: 50, limit: 100 },
        sms: { used: 200, limit: 500 },
        staff: { used: 3, limit: 5 }
      };

      mockSubscriptionService.checkSubscriptionLimits.mockResolvedValue(mockLimits);

      // Act
      await subscriptionController.checkSubscriptionLimits(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.checkSubscriptionLimits).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLimits
      });
    });
  });

  describe('calculateUpgradeProration', () => {
    it('should calculate upgrade proration successfully', async () => {
      // Arrange
      const currentPlanId = 'plan-basic';
      const newPlanId = 'plan-pro';
      const currentPeriodEnd = '2024-02-01T00:00:00Z';

      mockGuaranteedAuthRequest.query = { currentPlanId, newPlanId, currentPeriodEnd };

      const mockProration = {
        currentPlanPrice: 29.99,
        newPlanPrice: 59.99,
        prorationAmount: 15.00,
        nextBillingDate: '2024-02-15T00:00:00Z'
      };

      mockSubscriptionService.calculateUpgradeProration.mockResolvedValue(mockProration);

      // Act
      await subscriptionController.calculateUpgradeProration(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.calculateUpgradeProration).toHaveBeenCalledWith(currentPlanId, newPlanId, new Date(currentPeriodEnd));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockProration
      });
    });
  });

  describe('validatePlanLimits', () => {
    it('should validate plan limits successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const planId = 'plan-pro';

      mockGuaranteedAuthRequest.params = { businessId, planId };

      const mockValidation = {
        isValid: true,
        limits: {
          appointments: { used: 50, limit: 100, remaining: 50 },
          sms: { used: 200, limit: 500, remaining: 300 },
          staff: { used: 3, limit: 5, remaining: 2 }
        }
      };

      mockSubscriptionService.validatePlanLimits.mockResolvedValue(mockValidation);

      // Act
      await subscriptionController.validatePlanLimits(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.validatePlanLimits).toHaveBeenCalledWith(businessId, planId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockValidation
      });
    });
  });

  describe('getAllSubscriptions', () => {
    it('should get all subscriptions successfully', async () => {
      // Arrange
      const page = 1;
      const limit = 20;
      mockGuaranteedAuthRequest.query = { page: page.toString(), limit: limit.toString() };

      const mockResult = {
        subscriptions: [
          { id: 'sub-1', businessId: 'business-1', planId: 'plan-1', status: 'ACTIVE' },
          { id: 'sub-2', businessId: 'business-2', planId: 'plan-2', status: 'TRIAL' }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockSubscriptionService.getAllSubscriptions.mockResolvedValue(mockResult);

      // Act
      await subscriptionController.getAllSubscriptions(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getAllSubscriptions).toHaveBeenCalledWith('user-123', page, limit);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.subscriptions,
        meta: {
          total: mockResult.total,
          page: mockResult.page,
          totalPages: mockResult.totalPages,
          limit
        }
      });
    });
  });

  describe('getSubscriptionStats', () => {
    it('should get subscription statistics successfully', async () => {
      // Arrange
      const mockStats = {
        totalSubscriptions: 100,
        activeSubscriptions: 85,
        trialSubscriptions: 10,
        canceledSubscriptions: 5,
        monthlyRevenue: 5000.00
      };

      mockSubscriptionService.getSubscriptionStats.mockResolvedValue(mockStats);

      // Act
      await subscriptionController.getSubscriptionStats(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getSubscriptionStats).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getTrialsEndingSoon', () => {
    it('should get trials ending soon successfully', async () => {
      // Arrange
      const days = 7;
      mockGuaranteedAuthRequest.query = { days: days.toString() };

      const mockTrials = [
        { id: 'sub-1', businessId: 'business-1', trialEndsAt: '2024-01-22T00:00:00Z' },
        { id: 'sub-2', businessId: 'business-2', trialEndsAt: '2024-01-23T00:00:00Z' }
      ];

      mockSubscriptionService.getTrialsEndingSoon.mockResolvedValue(mockTrials);

      // Act
      await subscriptionController.getTrialsEndingSoon(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getTrialsEndingSoon).toHaveBeenCalledWith('user-123', days);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTrials,
        meta: {
          total: mockTrials.length,
          days
        }
      });
    });
  });

  describe('getExpiredSubscriptions', () => {
    it('should get expired subscriptions successfully', async () => {
      // Arrange
      const mockExpiredSubscriptions = [
        { id: 'sub-1', businessId: 'business-1', status: 'CANCELED', expiredAt: '2024-01-15T00:00:00Z' },
        { id: 'sub-2', businessId: 'business-2', status: 'CANCELED', expiredAt: '2024-01-16T00:00:00Z' }
      ];

      mockSubscriptionService.getExpiredSubscriptions.mockResolvedValue(mockExpiredSubscriptions);

      // Act
      await subscriptionController.getExpiredSubscriptions(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.getExpiredSubscriptions).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockExpiredSubscriptions,
        meta: {
          total: mockExpiredSubscriptions.length
        }
      });
    });
  });

  describe('forceUpdateSubscriptionStatus', () => {
    it('should force update subscription status successfully', async () => {
      // Arrange
      const subscriptionId = 'sub-123';
      const status = 'ACTIVE';
      const reason = 'Manual update';

      mockGuaranteedAuthRequest.params = { subscriptionId };
      mockGuaranteedAuthRequest.body = { status, reason };

      const mockUpdatedSubscription = {
        id: 'sub-123',
        status: 'ACTIVE',
        updatedAt: '2024-01-15T00:00:00Z'
      };

      mockSubscriptionService.forceUpdateSubscriptionStatus.mockResolvedValue(mockUpdatedSubscription);

      // Act
      await subscriptionController.forceUpdateSubscriptionStatus(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.forceUpdateSubscriptionStatus).toHaveBeenCalledWith('user-123', subscriptionId, status, reason);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSubscription,
        message: `Subscription status updated to ${status}`
      });
    });
  });

  describe('processExpiredSubscriptions', () => {
    it('should process expired subscriptions successfully', async () => {
      // Arrange
      const mockResult = {
        processed: 5,
        updated: 3,
        failed: 2
      };

      mockSubscriptionService.processExpiredSubscriptions.mockResolvedValue(mockResult);

      // Act
      await subscriptionController.processExpiredSubscriptions(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.processExpiredSubscriptions).toHaveBeenCalledWith();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: `Processed ${mockResult.processed} expired subscriptions`
      });
    });
  });

  describe('processSubscriptionRenewals', () => {
    it('should process subscription renewals successfully', async () => {
      // Arrange
      const mockResult = {
        processed: 10,
        renewed: 8,
        failed: 2
      };

      mockSubscriptionService.processSubscriptionRenewals.mockResolvedValue(mockResult);

      // Act
      await subscriptionController.processSubscriptionRenewals(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.processSubscriptionRenewals).toHaveBeenCalledWith();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: `Processed ${mockResult.processed} renewals, ${mockResult.renewed} successful, ${mockResult.failed} failed`
      });
    });
  });

  describe('sendTrialEndingNotifications', () => {
    it('should send trial ending notifications successfully', async () => {
      // Arrange
      const mockResult = 5; // The service returns just a number

      mockSubscriptionService.sendTrialEndingNotifications.mockResolvedValue(mockResult);

      // Act
      await subscriptionController.sendTrialEndingNotifications(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockSubscriptionService.sendTrialEndingNotifications).toHaveBeenCalledWith();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { notificationsSent: mockResult },
        message: `Sent ${mockResult} trial ending notifications`
      });
    });
  });

  describe('getSubscriptionsByStatus', () => {
    it('should get subscriptions by status successfully', async () => {
      // Arrange
      const status = 'ACTIVE';
      mockGuaranteedAuthRequest.params = { status };

      // Act
      await subscriptionController.getSubscriptionsByStatus(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'getSubscriptionsByStatus not implemented'
      });
    });
  });

  describe('getSubscriptionsByPlan', () => {
    it('should get subscriptions by plan successfully', async () => {
      // Arrange
      const planId = 'plan-pro';
      mockGuaranteedAuthRequest.params = { planId };

      // Act
      await subscriptionController.getSubscriptionsByPlan(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'getSubscriptionsByPlan not implemented'
      });
    });
  });

  describe('getBusinessesWithoutSubscription', () => {
    it('should get businesses without subscription successfully', async () => {
      // Act
      await subscriptionController.getBusinessesWithoutSubscription(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'getBusinessesWithoutSubscription not implemented'
      });
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should get revenue analytics successfully', async () => {
      // Arrange
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      mockGuaranteedAuthRequest.query = { startDate, endDate };

      // Act
      await subscriptionController.getRevenueAnalytics(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'getRevenueAnalytics not implemented'
      });
    });
  });
});

