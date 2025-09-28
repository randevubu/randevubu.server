import { UsageService } from '../../../src/services/usageService';
import { UsageRepository } from '../../../src/repositories/usageRepository';
import { SubscriptionRepository } from '../../../src/repositories/subscriptionRepository';
import { RBACService } from '../../../src/services/rbacService';
import { TestHelpers } from '../../utils/testHelpers';
// import { testUsage } from '../../fixtures/testData';
import { PermissionName } from '../../../src/types/auth';
import { SubscriptionStatus } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/repositories/usageRepository');
jest.mock('../../../src/repositories/subscriptionRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('UsageService', () => {
  let usageService: UsageService;
  let mockUsageRepository: any;
  let mockSubscriptionRepository: any;
  let mockRBACService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockUsageRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findByType: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
      getCurrentUsage: jest.fn(),
      getUsageHistory: jest.fn(),
      checkLimit: jest.fn(),
      resetUsage: jest.fn()
    };

    mockSubscriptionRepository = {
      findByBusinessId: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50, displayName: 'Owner' }],
        permissions: []
      })
    };

    // Create UsageService instance
    usageService = new UsageService(
      mockUsageRepository,
      mockSubscriptionRepository,
      mockRBACService
    );
  });

  describe('constructor', () => {
    it('should create UsageService instance', () => {
      expect(usageService).toBeInstanceOf(UsageService);
    });
  });

  describe('recordSmsUsage', () => {
    it('should record SMS usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const count = 1;

      mockUsageRepository.create.mockResolvedValue(undefined);

      // Act
      await usageService.recordSmsUsage(businessId, count);

      // Assert
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        businessId,
        type: 'sms',
        count
      });
    });
  });

  describe('getBusinessUsageSummary', () => {
    it('should return business usage summary successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockUsage = {
        businessId: 'business-123',
        appointments: 50,
        staff: 3,
        customers: 100,
        sms: 200
      };

      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockUsage);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await usageService.getBusinessUsageSummary(userId, businessId);

      // Assert
      expect(result).toEqual(mockUsage);
      expect(mockUsageRepository.getCurrentUsage).toHaveBeenCalledWith(businessId);
    });
  });


  describe('canAddCustomer', () => {
    it('should allow adding customer when within limit', async () => {
      // Arrange
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { customers: 200 }
      };

      const mockCurrentUsage = { customers: 100 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canAddCustomer(businessId);

      // Assert
      expect(result).toEqual({ allowed: true });
    });

    it('should not allow adding customer when limit exceeded', async () => {
      // Arrange
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { customers: 200 }
      };

      const mockCurrentUsage = { customers: 200 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canAddCustomer(businessId);

      // Assert
      expect(result).toEqual({ 
        allowed: false, 
        reason: 'Customer limit exceeded. Current: 200, Limit: 200' 
      });
    });
  });

  describe('canAddStaffMember', () => {
    it('should allow adding staff when within limit', async () => {
      // Arrange
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { staff: 5 }
      };

      const mockCurrentUsage = { staff: 3 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canAddStaffMember(businessId);

      // Assert
      expect(result).toEqual({ allowed: true });
    });

    it('should not allow adding staff when limit exceeded', async () => {
      // Arrange
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { staff: 5 }
      };

      const mockCurrentUsage = { staff: 5 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canAddStaffMember(businessId);

      // Assert
      expect(result).toEqual({ 
        allowed: false, 
        reason: 'Staff limit exceeded. Current: 5, Limit: 5' 
      });
    });
  });

  describe('canAddService', () => {
    it('should allow adding service when within limit', async () => {
      // Arrange
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { services: 20 }
      };

      const mockCurrentUsage = { services: 10 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canAddService(businessId);

      // Assert
      expect(result).toEqual({ allowed: true });
    });

    it('should not allow adding service when limit exceeded', async () => {
      // Arrange
      const businessId = 'business-123';

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { services: 20 }
      };

      const mockCurrentUsage = { services: 20 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canAddService(businessId);

      // Assert
      expect(result).toEqual({ 
        allowed: false, 
        reason: 'Service limit exceeded. Current: 20, Limit: 20' 
      });
    });
  });

  describe('canSendSms', () => {
    it('should allow sending SMS when within limit', async () => {
      // Arrange
      const businessId = 'business-123';
      const count = 10;

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { sms: 1000 }
      };

      const mockCurrentUsage = { sms: 500 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canSendSms(businessId);

      // Assert
      expect(result).toEqual({ allowed: true });
    });

    it('should not allow sending SMS when limit exceeded', async () => {
      // Arrange
      const businessId = 'business-123';
      const count = 600; // This would exceed the limit

      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        limits: { sms: 1000 }
      };

      const mockCurrentUsage = { sms: 500 };

      mockSubscriptionRepository.findByBusinessId.mockResolvedValue(mockSubscription);
      mockUsageRepository.getCurrentUsage.mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await usageService.canSendSms(businessId);

      // Assert
      expect(result).toEqual({ 
        allowed: false, 
        reason: `SMS limit exceeded. Current: 500, Requested: 600, Limit: 1000` 
      });
    });
  });

  describe('updateAppointmentUsage', () => {
    it('should update appointment usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';

      mockUsageRepository.create.mockResolvedValue(undefined);

      // Act
      await usageService.recordAppointmentUsage(businessId);

      // Assert
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        businessId,
        type: 'appointment',
        amount: 1
      });
    });
  });

  describe('updateServiceUsage', () => {
    it('should update service usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';

      mockUsageRepository.create.mockResolvedValue(undefined);

      // Act
      await usageService.updateServiceUsage(businessId);

      // Assert
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        businessId,
        type: 'service',
        amount: 1
      });
    });
  });

  describe('updateStaffUsage', () => {
    it('should update staff usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';

      mockUsageRepository.create.mockResolvedValue(undefined);

      // Act
      await usageService.updateStaffUsage(businessId);

      // Assert
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        businessId,
        type: 'staff',
        amount: 1
      });
    });
  });

  describe('updateCustomerUsage', () => {
    it('should update customer usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';

      mockUsageRepository.create.mockResolvedValue(undefined);

      // Act
      await usageService.recordCustomerUsage(businessId);

      // Assert
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        businessId,
        type: 'customer',
        amount: 1
      });
    });
  });

  describe('updateSMSUsage', () => {
    it('should update SMS usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const count = 5;

      mockUsageRepository.create.mockResolvedValue(undefined);

      // Act
      await usageService.recordSmsUsage(businessId, count);

      // Assert
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        businessId,
        type: 'sms',
        amount: count
      });
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStats = {
        totalBusinesses: 1,
        totalAppointments: 100,
        totalStaff: 5,
        totalCustomers: 200,
        totalSMS: 1000
      };

      mockUsageRepository.getStats.mockResolvedValue(mockStats);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await usageService.getUsageAlerts(userId, 'business-123');

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockUsageRepository.getStats).toHaveBeenCalled();
    });
  });

});
