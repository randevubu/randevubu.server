import { DiscountCodeService, CreateDiscountCodeServiceRequest } from '../../../src/services/discountCodeService';
import { DiscountCodeRepository, DiscountCodeData, DiscountValidationResult } from '../../../src/repositories/discountCodeRepository';
import { RBACService } from '../../../src/services/rbacService';
import { DiscountType } from '@prisma/client';
import { PermissionName } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/repositories/discountCodeRepository');
jest.mock('../../../src/services/rbacService');

describe('DiscountCodeService', () => {
  let discountCodeService: DiscountCodeService;
  let mockDiscountCodeRepository: jest.Mocked<DiscountCodeRepository>;
  let mockRbacService: jest.Mocked<RBACService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repository
    mockDiscountCodeRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      delete: jest.fn(),
      validateDiscountCode: jest.fn(),
      recordUsage: jest.fn(),
      getUsageHistory: jest.fn(),
      getStatistics: jest.fn()
    } as any;

    mockRbacService = {
      requirePermission: jest.fn()
    } as any;

    // Create DiscountCodeService instance
    discountCodeService = new DiscountCodeService(
      mockDiscountCodeRepository,
      mockRbacService
    );
  });

  describe('createDiscountCode', () => {
    it('should create discount code successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const data: CreateDiscountCodeServiceRequest = {
        name: 'Test Discount',
        description: 'Test discount code',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxUsages: 100,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        minPurchaseAmount: 50,
        applicablePlans: ['plan-1', 'plan-2']
      };
      const expectedDiscountCode: DiscountCodeData = {
        id: 'discount-123',
        code: 'SAVE12345',
        name: 'Test Discount',
        description: 'Test discount code',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxUsages: 100,
        currentUsages: 0,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        minPurchaseAmount: 50,
        applicablePlans: ['plan-1', 'plan-2'],
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue(expectedDiscountCode);

      // Act
      const result = await discountCodeService.createDiscountCode(userId, data);

      // Assert
      expect(result).toEqual(expectedDiscountCode);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_ALL_SUBSCRIPTIONS
      );
      expect(mockDiscountCodeRepository.create).toHaveBeenCalledWith({
        ...data,
        code: expect.any(String),
        createdById: userId
      });
    });

    it('should create discount code with provided code', async () => {
      // Arrange
      const userId = 'user-123';
      const data: CreateDiscountCodeServiceRequest = {
        code: 'CUSTOM123',
        name: 'Test Discount',
        description: 'Test discount code',
        discountType: DiscountType.FIXED,
        discountValue: 10
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue({} as DiscountCodeData);

      // Act
      await discountCodeService.createDiscountCode(userId, data);

      // Assert
      expect(mockDiscountCodeRepository.create).toHaveBeenCalledWith({
        ...data,
        code: 'CUSTOM123',
        createdById: userId
      });
    });

    it('should throw error if code already exists', async () => {
      // Arrange
      const userId = 'user-123';
      const data: CreateDiscountCodeServiceRequest = {
        code: 'EXISTING123',
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue({} as DiscountCodeData);

      // Act & Assert
      await expect(discountCodeService.createDiscountCode(userId, data))
        .rejects.toThrow('Discount code already exists');
    });

    it('should throw error for percentage discount over 100%', async () => {
      // Arrange
      const userId = 'user-123';
      const data: CreateDiscountCodeServiceRequest = {
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(discountCodeService.createDiscountCode(userId, data))
        .rejects.toThrow('Percentage discount cannot exceed 100%');
    });

    it('should throw error for negative discount value', async () => {
      // Arrange
      const userId = 'user-123';
      const data: CreateDiscountCodeServiceRequest = {
        name: 'Test Discount',
        discountType: DiscountType.FIXED,
        discountValue: -10
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(discountCodeService.createDiscountCode(userId, data))
        .rejects.toThrow('Discount value must be positive');
    });

    it('should throw error for invalid date range', async () => {
      // Arrange
      const userId = 'user-123';
      const data: CreateDiscountCodeServiceRequest = {
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        validFrom: new Date('2024-12-31'),
        validUntil: new Date('2024-01-01')
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(discountCodeService.createDiscountCode(userId, data))
        .rejects.toThrow('Valid until date must be after valid from date');
    });
  });

  describe('updateDiscountCode', () => {
    it('should update discount code successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';
      const updateData = {
        name: 'Updated Discount',
        discountValue: 25
      };
      const existingCode: DiscountCodeData = {
        id: discountCodeId,
        code: 'SAVE12345',
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as DiscountCodeData;
      const updatedCode: DiscountCodeData = {
        ...existingCode,
        name: 'Updated Discount',
        discountValue: 25
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.update.mockResolvedValue(updatedCode);

      // Act
      const result = await discountCodeService.updateDiscountCode(userId, discountCodeId, updateData);

      // Assert
      expect(result).toEqual(updatedCode);
      expect(mockDiscountCodeRepository.update).toHaveBeenCalledWith(discountCodeId, updateData);
    });

    it('should throw error if discount code not found', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'non-existent';
      const updateData = { name: 'Updated Discount' };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(discountCodeService.updateDiscountCode(userId, discountCodeId, updateData))
        .rejects.toThrow('Discount code not found');
    });

    it('should validate code uniqueness when changing code', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';
      const updateData = { code: 'NEWCODE123' };
      const existingCode: DiscountCodeData = {
        id: discountCodeId,
        code: 'OLDCODE123',
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as DiscountCodeData;

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.findByCode.mockResolvedValue({} as DiscountCodeData);

      // Act & Assert
      await expect(discountCodeService.updateDiscountCode(userId, discountCodeId, updateData))
        .rejects.toThrow('Discount code already exists');
    });
  });

  describe('getDiscountCode', () => {
    it('should return discount code by id', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';
      const expectedCode: DiscountCodeData = {
        id: discountCodeId,
        code: 'SAVE12345',
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as DiscountCodeData;

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(expectedCode);

      // Act
      const result = await discountCodeService.getDiscountCode(userId, discountCodeId);

      // Assert
      expect(result).toEqual(expectedCode);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_ALL_SUBSCRIPTIONS
      );
    });

    it('should throw error if discount code not found', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'non-existent';

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(discountCodeService.getDiscountCode(userId, discountCodeId))
        .rejects.toThrow('Discount code not found');
    });
  });

  describe('getAllDiscountCodes', () => {
    it('should return all discount codes with pagination', async () => {
      // Arrange
      const userId = 'user-123';
      const params = { page: 1, limit: 10, isActive: true };
      const expectedResult = {
        discountCodes: [],
        total: 0,
        page: 1,
        totalPages: 0
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await discountCodeService.getAllDiscountCodes(userId, params);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_ALL_SUBSCRIPTIONS
      );
      expect(mockDiscountCodeRepository.findAll).toHaveBeenCalledWith(params);
    });
  });

  describe('validateDiscountCode', () => {
    it('should validate discount code successfully', async () => {
      // Arrange
      const code = 'SAVE12345';
      const planId = 'plan-123';
      const amount = 100;
      const userId = 'user-123';
      const expectedResult: DiscountValidationResult = {
        isValid: true,
        discountCode: {} as DiscountCodeData,
        calculatedDiscount: {
          discountAmount: 20,
          originalAmount: 100,
          finalAmount: 80
        }
      };

      mockDiscountCodeRepository.validateDiscountCode.mockResolvedValue(expectedResult);

      // Act
      const result = await discountCodeService.validateDiscountCode(code, planId, amount, userId);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockDiscountCodeRepository.validateDiscountCode).toHaveBeenCalledWith(
        code,
        planId,
        amount,
        userId
      );
    });
  });

  describe('applyDiscountCode', () => {
    it('should apply discount code successfully', async () => {
      // Arrange
      const code = 'SAVE12345';
      const userId = 'user-123';
      const planId = 'plan-123';
      const amount = 100;
      const businessSubscriptionId = 'sub-123';
      const paymentId = 'payment-123';

      const validationResult: DiscountValidationResult = {
        isValid: true,
        discountCode: { id: 'discount-123' } as DiscountCodeData,
        calculatedDiscount: {
          discountAmount: 20,
          originalAmount: 100,
          finalAmount: 80
        }
      };

      mockDiscountCodeRepository.validateDiscountCode.mockResolvedValue(validationResult);
      mockDiscountCodeRepository.recordUsage.mockResolvedValue(undefined);

      // Act
      const result = await discountCodeService.applyDiscountCode(
        code,
        userId,
        planId,
        amount,
        businessSubscriptionId,
        paymentId
      );

      // Assert
      expect(result).toEqual({
        success: true,
        discountAmount: 20,
        originalAmount: 100,
        finalAmount: 80
      });
      expect(mockDiscountCodeRepository.recordUsage).toHaveBeenCalledWith(
        'discount-123',
        userId,
        20,
        100,
        80,
        businessSubscriptionId,
        paymentId,
        {
          planId,
          appliedAt: expect.any(String)
        }
      );
    });

    it('should return error for invalid discount code', async () => {
      // Arrange
      const code = 'INVALID123';
      const userId = 'user-123';
      const planId = 'plan-123';
      const amount = 100;

      const validationResult: DiscountValidationResult = {
        isValid: false,
        errorMessage: 'Discount code not found'
      };

      mockDiscountCodeRepository.validateDiscountCode.mockResolvedValue(validationResult);

      // Act
      const result = await discountCodeService.applyDiscountCode(code, userId, planId, amount);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Discount code not found'
      });
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const code = 'SAVE12345';
      const userId = 'user-123';
      const planId = 'plan-123';
      const amount = 100;

      mockDiscountCodeRepository.validateDiscountCode.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await discountCodeService.applyDiscountCode(code, userId, planId, amount);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('deactivateDiscountCode', () => {
    it('should deactivate discount code successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.deactivate.mockResolvedValue(true);

      // Act
      const result = await discountCodeService.deactivateDiscountCode(userId, discountCodeId);

      // Assert
      expect(result).toBe(true);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_ALL_SUBSCRIPTIONS
      );
      expect(mockDiscountCodeRepository.deactivate).toHaveBeenCalledWith(discountCodeId);
    });
  });

  describe('deleteDiscountCode', () => {
    it('should delete discount code successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';
      const existingCode: DiscountCodeData = {
        id: discountCodeId,
        code: 'SAVE12345',
        name: 'Test Discount',
        currentUsages: 0,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as DiscountCodeData;

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.delete.mockResolvedValue(true);

      // Act
      const result = await discountCodeService.deleteDiscountCode(userId, discountCodeId);

      // Assert
      expect(result).toBe(true);
      expect(mockDiscountCodeRepository.delete).toHaveBeenCalledWith(discountCodeId);
    });

    it('should throw error if discount code not found', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'non-existent';

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(discountCodeService.deleteDiscountCode(userId, discountCodeId))
        .rejects.toThrow('Discount code not found');
    });

    it('should throw error if discount code has been used', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';
      const existingCode: DiscountCodeData = {
        id: discountCodeId,
        code: 'SAVE12345',
        name: 'Test Discount',
        currentUsages: 5,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as DiscountCodeData;

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);

      // Act & Assert
      await expect(discountCodeService.deleteDiscountCode(userId, discountCodeId))
        .rejects.toThrow('Cannot delete discount code that has been used. Deactivate it instead.');
    });
  });

  describe('getDiscountCodeUsageHistory', () => {
    it('should return usage history for discount code', async () => {
      // Arrange
      const userId = 'user-123';
      const discountCodeId = 'discount-123';
      const params = { page: 1, limit: 10 };
      const expectedResult = {
        usageHistory: [],
        total: 0,
        page: 1,
        totalPages: 0
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue({} as DiscountCodeData);
      mockDiscountCodeRepository.getUsageHistory.mockResolvedValue(expectedResult);

      // Act
      const result = await discountCodeService.getDiscountCodeUsageHistory(userId, discountCodeId, params);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockDiscountCodeRepository.getUsageHistory).toHaveBeenCalledWith(discountCodeId, params);
    });
  });

  describe('getDiscountCodeStatistics', () => {
    it('should return discount code statistics', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedStats = {
        totalCodes: 10,
        activeCodes: 8,
        totalUsages: 150,
        totalDiscountGiven: 5000
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.getStatistics.mockResolvedValue(expectedStats);

      // Act
      const result = await discountCodeService.getDiscountCodeStatistics(userId);

      // Assert
      expect(result).toEqual(expectedStats);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_ALL_ANALYTICS
      );
    });
  });

  describe('generateBulkDiscountCodes', () => {
    it('should generate bulk discount codes successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const params = {
        prefix: 'BULK',
        count: 5,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxUsages: 1,
        validUntil: new Date('2024-12-31'),
        minPurchaseAmount: 50,
        applicablePlans: ['plan-1'],
        description: 'Bulk discount codes'
      };

      const expectedCodes: DiscountCodeData[] = [];

      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue({} as DiscountCodeData);

      // Act
      const result = await discountCodeService.generateBulkDiscountCodes(userId, params);

      // Assert
      expect(result).toHaveLength(5);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_ALL_SUBSCRIPTIONS
      );
    });

    it('should throw error for too many codes', async () => {
      // Arrange
      const userId = 'user-123';
      const params = {
        count: 1500,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20
      };

      mockRbacService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(discountCodeService.generateBulkDiscountCodes(userId, params))
        .rejects.toThrow('Cannot generate more than 1000 codes at once');
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should cleanup expired codes successfully', async () => {
      // Arrange
      const expiredCodes = {
        discountCodes: [
          {
            id: 'code-1',
            validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
            isActive: true
          },
          {
            id: 'code-2',
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            isActive: true
          }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockDiscountCodeRepository.findAll.mockResolvedValue(expiredCodes);
      mockDiscountCodeRepository.deactivate.mockResolvedValue(true);

      // Act
      const result = await discountCodeService.cleanupExpiredCodes();

      // Assert
      expect(result).toEqual({
        deactivated: 1,
        errors: 0
      });
    });
  });

  describe('getDiscountCodeByCode', () => {
    it('should return discount code by code', async () => {
      // Arrange
      const code = 'SAVE12345';
      const expectedCode: DiscountCodeData = {
        id: 'discount-123',
        code,
        name: 'Test Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        isActive: true,
        createdById: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      } as DiscountCodeData;

      mockDiscountCodeRepository.findByCode.mockResolvedValue(expectedCode);

      // Act
      const result = await discountCodeService.getDiscountCodeByCode(code);

      // Assert
      expect(result).toEqual(expectedCode);
      expect(mockDiscountCodeRepository.findByCode).toHaveBeenCalledWith(code);
    });
  });
});

