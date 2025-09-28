import { ServiceService } from '../../../src/services/serviceService';
import { ServiceRepository } from '../../../src/repositories/serviceRepository';
import { BusinessRepository } from '../../../src/repositories/businessRepository';
import { RBACService } from '../../../src/services/rbacService';
import { UsageService } from '../../../src/services/usageService';
import { TestHelpers } from '../../utils/testHelpers';
import { testServices } from '../../fixtures/testData';
import { PermissionName } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/repositories/serviceRepository');
jest.mock('../../../src/repositories/businessRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/services/usageService');
jest.mock('../../../src/utils/logger');

describe('ServiceService', () => {
  let serviceService: ServiceService;
  let mockServiceRepository: any;
  let mockBusinessRepository: any;
  let mockRBACService: any;
  let mockUsageService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockServiceRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findPublicByBusinessId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
      getStats: jest.fn(),
      bulkUpdatePrices: jest.fn(),
      getPopular: jest.fn(),
      checkAvailability: jest.fn(),
      getAll: jest.fn(),
      toggleStatus: jest.fn(),
      duplicate: jest.fn(),
      batchToggle: jest.fn(),
      batchDelete: jest.fn(),
      processPriceVisibility: jest.fn(),
      hasOwnerAccess: jest.fn()
    };

    mockBusinessRepository = {
      findById: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50, displayName: 'Owner' }],
        permissions: []
      })
    };

    mockUsageService = {
      canAddService: jest.fn().mockResolvedValue({ allowed: true }),
      updateServiceUsage: jest.fn()
    };

    // Create ServiceService instance
    serviceService = new ServiceService(
      mockServiceRepository,
      mockBusinessRepository,
      mockRBACService,
      mockUsageService
    );
  });

  describe('constructor', () => {
    it('should create ServiceService instance', () => {
      expect(serviceService).toBeInstanceOf(ServiceService);
    });
  });

  describe('createService', () => {
    it('should create service successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const serviceData = {
        name: 'Test Service',
        description: 'Test service description',
        duration: 60,
        price: 100,
        currency: 'TRY',
        isActive: true
      };

      const mockService = {
        id: 'service-123',
        businessId: 'business-123',
        ...serviceData,
        createdAt: new Date()
      };

      mockBusinessRepository.findById.mockResolvedValue({ id: businessId, ownerId: userId });
      mockUsageService.canAddService.mockResolvedValue({ allowed: true });
      mockServiceRepository.create.mockResolvedValue(mockService);

      // Act
      const result = await serviceService.createService(userId, businessId, serviceData);

      // Assert
      expect(result).toEqual(mockService);
      expect(mockServiceRepository.create).toHaveBeenCalledWith({
        ...serviceData,
        businessId
      });
      expect(mockUsageService.updateServiceUsage).toHaveBeenCalledWith(businessId);
    });

    it('should throw error when business not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-999';
      const serviceData = {
        name: 'Test Service',
        duration: 60,
        price: 100
      };

      mockBusinessRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(serviceService.createService(userId, businessId, serviceData))
        .rejects.toThrow('Business not found');
    });

    it('should throw error when usage limit exceeded', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const serviceData = {
        name: 'Test Service',
        duration: 60,
        price: 100
      };

      mockBusinessRepository.findById.mockResolvedValue({ id: businessId, ownerId: userId });
      mockUsageService.canAddService.mockResolvedValue({ 
        allowed: false, 
        reason: 'Service limit exceeded' 
      });

      // Act & Assert
      await expect(serviceService.createService(userId, businessId, serviceData))
        .rejects.toThrow('Service limit exceeded');
    });
  });

  describe('getServiceById', () => {
    it('should return service when found', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-123';
      const mockService = {
        id: serviceId,
        name: 'Test Service',
        businessId: 'business-123'
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.getServiceById(userId, serviceId);

      // Assert
      expect(result).toEqual(mockService);
      expect(mockServiceRepository.findById).toHaveBeenCalledWith(serviceId);
    });

    it('should throw error when service not found', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-999';

      mockServiceRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(serviceService.getServiceById(userId, serviceId))
        .rejects.toThrow('Service not found');
    });
  });

  describe('getServicesByBusinessId', () => {
    it('should return business services successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockServices = [
        { id: 'service-1', businessId: 'business-123' },
        { id: 'service-2', businessId: 'business-123' }
      ];

      mockServiceRepository.findByBusinessId.mockResolvedValue(mockServices);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.getServicesByBusinessId(userId, businessId);

      // Assert
      expect(result).toEqual(mockServices);
      expect(mockServiceRepository.findByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getPublicServicesByBusinessId', () => {
    it('should return public services successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const mockServices = [
        { id: 'service-1', businessId: 'business-123', isActive: true }
      ];

      mockServiceRepository.findPublicByBusinessId.mockResolvedValue(mockServices);

      // Act
      const result = await serviceService.getPublicServicesByBusinessId(businessId);

      // Assert
      expect(result).toEqual(mockServices);
      expect(mockServiceRepository.findPublicByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('updateService', () => {
    it('should update service successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-123';
      const updateData = {
        name: 'Updated Service',
        price: 150
      };

      const mockService = {
        id: serviceId,
        ...updateData,
        businessId: 'business-123'
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockServiceRepository.update.mockResolvedValue(mockService);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.updateService(userId, serviceId, updateData);

      // Assert
      expect(result).toEqual(mockService);
      expect(mockServiceRepository.update).toHaveBeenCalledWith(serviceId, updateData);
    });

    it('should throw error when service not found', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-999';
      const updateData = { name: 'Updated Service' };

      mockServiceRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(serviceService.updateService(userId, serviceId, updateData))
        .rejects.toThrow('Service not found');
    });
  });

  describe('deleteService', () => {
    it('should delete service successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-123';

      const mockService = {
        id: serviceId,
        businessId: 'business-123'
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockServiceRepository.delete.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await serviceService.deleteService(userId, serviceId);

      // Assert
      expect(mockServiceRepository.delete).toHaveBeenCalledWith(serviceId);
    });

    it('should throw error when service not found', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-999';

      mockServiceRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(serviceService.deleteService(userId, serviceId))
        .rejects.toThrow('Service not found');
    });
  });

  describe('reorderServices', () => {
    it('should reorder services successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const serviceOrders = [
        { id: 'service-1', sortOrder: 1 },
        { id: 'service-2', sortOrder: 2 },
        { id: 'service-3', sortOrder: 3 }
      ];

      mockServiceRepository.reorderServices.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await serviceService.reorderServices(userId, businessId, serviceOrders);

      // Assert
      expect(mockServiceRepository.reorderServices).toHaveBeenCalledWith(businessId, serviceOrders);
    });
  });

  describe('getServiceStats', () => {
    it('should return service statistics successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockStats = {
        total: 10,
        active: 8,
        inactive: 2,
        totalRevenue: 5000
      };

      mockServiceRepository.getStats.mockResolvedValue(mockStats);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.getServiceStats(userId, businessId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockServiceRepository.getStats).toHaveBeenCalledWith(businessId);
    });
  });

  describe('bulkUpdatePrices', () => {
    it('should bulk update prices successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const priceMultiplier = 1.2;

      mockServiceRepository.bulkUpdatePrices.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await serviceService.bulkUpdatePrices(userId, businessId, priceMultiplier);

      // Assert
      expect(mockServiceRepository.bulkUpdatePrices).toHaveBeenCalledWith(businessId, priceMultiplier);
    });
  });

  describe('getPopularServices', () => {
    it('should return popular services successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockServices = [
        { id: 'service-1', name: 'Popular Service 1' },
        { id: 'service-2', name: 'Popular Service 2' }
      ];

      mockServiceRepository.getPopular.mockResolvedValue(mockServices);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.getPopularServices(userId, businessId);

      // Assert
      expect(result).toEqual(mockServices);
      expect(mockServiceRepository.getPopular).toHaveBeenCalledWith(businessId);
    });
  });

  describe('checkServiceAvailability', () => {
    it('should check service availability successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-123';
      const date = '2024-01-15';
      const time = '10:00';

      const mockAvailability = {
        available: true,
        timeSlots: ['10:00', '10:30', '11:00']
      };

      mockServiceRepository.checkAvailability.mockResolvedValue(mockAvailability);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.checkServiceAvailability(serviceId, new Date(date), new Date(`2024-01-15T${time}:00`));

      // Assert
      expect(result).toEqual(mockAvailability);
      expect(mockServiceRepository.checkAvailability).toHaveBeenCalledWith(serviceId, date, time);
    });
  });

  describe('getAllServices', () => {
    it('should return all services for admin', async () => {
      // Arrange
      const userId = 'admin-123';
      const mockServices = [
        { id: 'service-1', name: 'Service 1' },
        { id: 'service-2', name: 'Service 2' }
      ];

      mockServiceRepository.getAll.mockResolvedValue(mockServices);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.getAllServices(userId);

      // Assert
      expect(result).toEqual(mockServices);
      expect(mockServiceRepository.getAll).toHaveBeenCalled();
    });
  });

  describe('toggleServiceStatus', () => {
    it('should toggle service status successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-123';

      const mockService = {
        id: serviceId,
        isActive: false
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockServiceRepository.toggleStatus.mockResolvedValue(mockService);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.toggleServiceStatus(userId, serviceId, true);

      // Assert
      expect(result).toEqual(mockService);
      expect(mockServiceRepository.toggleStatus).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('duplicateService', () => {
    it('should duplicate service successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const serviceId = 'service-123';

      const mockService = {
        id: 'service-123',
        name: 'Original Service',
        businessId: 'business-123'
      };

      const mockDuplicatedService = {
        id: 'service-124',
        name: 'Original Service (Copy)',
        businessId: 'business-123'
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockServiceRepository.duplicate.mockResolvedValue(mockDuplicatedService);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await serviceService.duplicateService(userId, serviceId, 'Duplicated Service');

      // Assert
      expect(result).toEqual(mockDuplicatedService);
      expect(mockServiceRepository.duplicate).toHaveBeenCalledWith(serviceId);
    });
  });

  describe('batchToggleServices', () => {
    it('should batch toggle services successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const serviceIds = ['service-1', 'service-2'];
      const isActive = true;

      mockServiceRepository.batchToggle.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await serviceService.batchToggleServices(userId, businessId, serviceIds, isActive);

      // Assert
      expect(mockServiceRepository.batchToggle).toHaveBeenCalledWith(businessId, serviceIds, isActive);
    });
  });

  describe('batchDeleteServices', () => {
    it('should batch delete services successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const serviceIds = ['service-1', 'service-2'];

      mockServiceRepository.batchDelete.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await serviceService.batchDeleteServices(userId, businessId, serviceIds);

      // Assert
      expect(mockServiceRepository.batchDelete).toHaveBeenCalledWith(businessId, serviceIds);
    });
  });

  describe('processServicePriceVisibility', () => {
    it('should process service price visibility successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const hideAllPrices = true;

      mockServiceRepository.processPriceVisibility.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const services = [{ 
        id: 'service-1', 
        name: 'Test Service', 
        price: 100,
        businessId: 'business-123',
        duration: 60,
        currency: 'TRY',
        isActive: true,
        description: 'Test service',
        sortOrder: 1,
        showPrice: true,
        bufferTime: 0,
        maxAdvanceBooking: 30,
        minAdvanceBooking: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      const businessSettings = { priceVisibility: { hideAllPrices } };
      await serviceService.processServicePriceVisibility(services, businessSettings);

      // Assert
      expect(mockServiceRepository.processPriceVisibility).toHaveBeenCalledWith(businessId, hideAllPrices);
    });
  });

  describe('hasOwnerAccess', () => {
    it('should check owner access successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      mockServiceRepository.hasOwnerAccess.mockResolvedValue(true);

      // Act
      const result = await serviceService.hasOwnerAccess(userId, businessId);

      // Assert
      expect(result).toBe(true);
      expect(mockServiceRepository.hasOwnerAccess).toHaveBeenCalledWith(userId, businessId);
    });
  });
});
