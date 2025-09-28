import { BusinessService } from '../../../src/services/businessService';
import { BusinessRepository } from '../../../src/repositories/businessRepository';
import { RBACService } from '../../../src/services/rbacService';
import { UsageService } from '../../../src/services/usageService';
import { PrismaClient } from '@prisma/client';
import { TestHelpers } from '../../utils/testHelpers';
import { testBusinesses } from '../../fixtures/testData';
import { PermissionName } from '../../../src/types/auth';
import { ValidationError } from '../../../src/types/errors';
import { NotificationChannel } from '../../../src/types/business';

// Mock dependencies
jest.mock('../../../src/repositories/businessRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/services/usageService');
jest.mock('../../../src/utils/logger');

describe('BusinessService', () => {
  let businessService: BusinessService;
  let mockBusinessRepository: any;
  let mockRBACService: any;
  let mockUsageService: any;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockBusinessRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByOwnerId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findNearby: jest.fn(),
      updateNotificationSettings: jest.fn(),
      updateStaffPrivacySettings: jest.fn(),
      updatePriceSettings: jest.fn(),
      getBusinessStats: jest.fn(),
      getBusinessAnalytics: jest.fn(),
      checkSlugAvailability: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      requireAny: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50, displayName: 'Owner' }],
        permissions: []
      }),
      assignRole: jest.fn(),
      revokeRole: jest.fn(),
      hasPermission: jest.fn()
    };

    mockUsageService = {
      checkUsageLimit: jest.fn(),
      recordUsage: jest.fn(),
      getUsageStats: jest.fn()
    };

    mockPrisma = {
      $transaction: jest.fn(),
      business: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      role: {
        findUnique: jest.fn()
      },
      userRole: {
        upsert: jest.fn()
      }
    };

    // Create BusinessService instance
    businessService = new BusinessService(
      mockBusinessRepository,
      mockRBACService,
      mockPrisma,
      mockUsageService
    );
  });

  describe('constructor', () => {
    it('should create BusinessService instance', () => {
      expect(businessService).toBeInstanceOf(BusinessService);
    });
  });

  describe('getBusinessById', () => {
    it('should return business when found', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-123';
      const mockBusiness = {
        id: businessId,
        ownerId: userId,
        name: 'Test Business',
        slug: 'test-business',
        description: 'Test Description',
        email: 'business@example.com',
        phone: '+905551234567',
        address: 'Test Address',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
        businessTypeId: '1',
        timezone: 'Europe/Istanbul',
        latitude: 41.0082,
        longitude: 28.9784,
        isActive: true,
        isVerified: false,
        isClosed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessRepository.findById.mockResolvedValue(mockBusiness);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await businessService.getBusinessById(userId, businessId);

      // Assert
      expect(result).toEqual(mockBusiness);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(userId, PermissionName.VIEW_OWN_BUSINESS);
    });

    it('should throw error when business not found', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-999';
      mockBusinessRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(businessService.getBusinessById(userId, businessId))
        .rejects.toThrow();
    });
  });

  describe('updateBusiness', () => {
    it('should update business successfully', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-123';
      const updateData = {
        name: 'Updated Business',
        description: 'Updated Description'
      };

      const existingBusiness = {
        id: businessId,
        ownerId: userId,
        name: 'Test Business',
        slug: 'test-business',
        description: 'Test Description',
        email: 'business@example.com',
        phone: '+905551234567',
        address: 'Test Address',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
        businessTypeId: '1',
        timezone: 'Europe/Istanbul',
        latitude: 41.0082,
        longitude: 28.9784,
        isActive: true,
        isVerified: false,
        isClosed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedBusiness = {
        ...existingBusiness,
        ...updateData
      };

      mockBusinessRepository.findById.mockResolvedValue(existingBusiness);
      mockBusinessRepository.update.mockResolvedValue(updatedBusiness);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await businessService.updateBusiness(userId, businessId, updateData);

      // Assert
      expect(result).toEqual(updatedBusiness);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(userId, PermissionName.EDIT_OWN_BUSINESS);
      expect(mockBusinessRepository.update).toHaveBeenCalledWith(businessId, updateData);
    });

    it('should throw error when business not found', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-999';
      const updateData = { name: 'Updated Business' };
      mockBusinessRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(businessService.updateBusiness(userId, businessId, updateData))
        .rejects.toThrow();
    });
  });

  describe('deleteBusiness', () => {
    it('should delete business successfully', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-123';
      const existingBusiness = {
        id: businessId,
        ownerId: userId,
        name: 'Test Business',
        slug: 'test-business',
        description: 'Test Description',
        email: 'business@example.com',
        phone: '+905551234567',
        address: 'Test Address',
        city: 'Istanbul',
        state: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
        businessTypeId: '1',
        timezone: 'Europe/Istanbul',
        latitude: 41.0082,
        longitude: 28.9784,
        isActive: true,
        isVerified: false,
        isClosed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessRepository.findById.mockResolvedValue(existingBusiness);
      mockBusinessRepository.delete.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await businessService.deleteBusiness(userId, businessId);

      // Assert
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(userId, PermissionName.DELETE_OWN_BUSINESS, { businessId });
      expect(mockBusinessRepository.delete).toHaveBeenCalledWith(businessId);
    });

    it('should throw error when business not found', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-999';
      mockBusinessRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockBusinessRepository.delete.mockRejectedValue(new Error('Business not found'));

      // Act & Assert
      await expect(businessService.deleteBusiness(userId, businessId))
        .rejects.toThrow('Business not found');
    });
  });

  describe('searchBusinesses', () => {
    it('should search businesses successfully', async () => {
      // Arrange
      const userId = 'user-1';
      const filters = {
        query: 'test',
        city: 'Istanbul',
        businessTypeId: '1',
        page: 1,
        limit: 10
      };

      const mockResults = {
        businesses: [
          {
            id: 'business-1',
            ownerId: 'user-1',
            name: 'Test Business 1',
            slug: 'test-business-1',
            description: 'Test Description 1',
            email: 'business1@example.com',
            phone: '+905551234567',
            address: 'Test Address 1',
            city: 'Istanbul',
            state: 'Istanbul',
            country: 'Turkey',
            postalCode: '34000',
            businessTypeId: '1',
            timezone: 'Europe/Istanbul',
            latitude: 41.0082,
            longitude: 28.9784,
            isActive: true,
            isVerified: false,
            isClosed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockBusinessRepository.search.mockResolvedValue(mockResults);

      // Act
      const result = await businessService.searchBusinesses(userId, filters, 1, 10);

      // Assert
      expect(result).toEqual(mockResults);
      expect(mockBusinessRepository.search).toHaveBeenCalledWith(filters, 1, 10);
    });
  });

  describe('getBusinessStats', () => {
    it('should return business statistics', async () => {
      // Arrange
      const userId = '1';
      const businessId = 'business-123';
      const mockStats = {
        totalAppointments: 100,
        activeServices: 5,
        totalStaff: 3,
        isSubscribed: true
      };

      // Mock the getMyBusinesses call (which getBusinessStats calls internally)
      const mockBusinesses = [{ id: businessId, name: 'Test Business' }];
      mockBusinessRepository.findByOwnerId.mockResolvedValue(mockBusinesses);
      mockBusinessRepository.findByStaffUserId.mockResolvedValue([]);
      mockBusinessRepository.getBusinessStats.mockResolvedValue(mockStats);

      // Act
      const result = await businessService.getBusinessStats(userId, businessId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockBusinessRepository.getBusinessStats).toHaveBeenCalledWith(businessId);
    });
  });
});