import { DiscountCodeService } from '../../../src/services/domain/discount/discountCodeService';
import { DiscountCodeRepository } from '../../../src/repositories/discountCodeRepository';
import { RBACService } from '../../../src/services/domain/rbac/rbacService';
import { PermissionName } from '../../../src/types/auth';
import { DiscountType } from '@prisma/client';
import { MockFactories } from '../../utils/mockFactories';
import { TEST_USER_IDS, TEST_DISCOUNT_CODES, TEST_PRICES, TEST_ERROR_MESSAGES } from '../../utils/testData';

describe('DiscountCodeService', () => {
  let discountCodeService: DiscountCodeService;
  let mockDiscountCodeRepository: jest.Mocked<DiscountCodeRepository>;
  let mockRBACService: jest.Mocked<RBACService>;

  beforeEach(() => {
    mockDiscountCodeRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deactivate: jest.fn(),
      findUsagesByCode: jest.fn(),
      createUsage: jest.fn(),
      countUserUsages: jest.fn(),
      getStatistics: jest.fn()
    } as any;

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn()
    } as any;

    discountCodeService = new DiscountCodeService(
      mockDiscountCodeRepository,
      mockRBACService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDiscountCode', () => {
    const userId = TEST_USER_IDS.ADMIN;

    it('should create a one-time percentage discount code', async () => {
      const discountData = {
        name: 'Welcome Discount',
        description: '20% off first payment',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxUsages: 1000,
        maxUsagesPerUser: 1,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };

      const expectedCode = MockFactories.discountCode({
        code: 'WELCOME20',
        ...discountData
      });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue(expectedCode);

      const result = await discountCodeService.createDiscountCode(userId, {
        code: 'WELCOME20',
        ...discountData
      });

      expect(result.code).toBe('WELCOME20');
      expect(result.discountType).toBe(DiscountType.PERCENTAGE);
      expect(result.discountValue).toBe(20);
      expect(mockDiscountCodeRepository.create).toHaveBeenCalled();
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_ALL_SUBSCRIPTIONS
      );
    });

    it('should auto-generate code if not provided', async () => {
      const discountData = {
        name: 'Auto Generated',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        maxUsages: 500,
        maxUsagesPerUser: 1
      };

      const expectedCode = MockFactories.discountCode(discountData);

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue(expectedCode);

      const result = await discountCodeService.createDiscountCode(userId, discountData);

      expect(result.code).toBeDefined();
      expect(result.code).toMatch(/^[A-Z0-9]+$/); // Should be uppercase alphanumeric
      expect(mockDiscountCodeRepository.create).toHaveBeenCalled();
    });

    it('should create a fixed amount discount code', async () => {
      const discountData = {
        code: 'SAVE100',
        name: 'Save 100 TL',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 100,
        maxUsages: 500,
        maxUsagesPerUser: 1
      };

      const expectedCode = MockFactories.discountCode(discountData);

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue(expectedCode);

      const result = await discountCodeService.createDiscountCode(userId, discountData);

      expect(result.discountType).toBe(DiscountType.FIXED_AMOUNT);
      expect(result.discountValue).toBe(100);
    });

    it('should create a recurring discount code', async () => {
      const discountData = {
        code: 'LOYAL35',
        name: 'Loyalty Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 35,
        maxUsages: 100,
        maxUsagesPerUser: 3,
        metadata: {
          isRecurring: true,
          maxRecurringUses: 3
        }
      };

      const expectedCode = MockFactories.recurringDiscountCode(3, discountData);

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create.mockResolvedValue(expectedCode);

      const result = await discountCodeService.createDiscountCode(userId, discountData);

      expect(result.metadata.isRecurring).toBe(true);
      expect(result.metadata.maxRecurringUses).toBe(3);
    });

    it('should throw error if code already exists', async () => {
      const discountData = {
        code: 'EXISTING',
        name: 'Existing Code',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maxUsages: 100,
        maxUsagesPerUser: 1
      };

      const existingCode = MockFactories.discountCode({ code: 'EXISTING' });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(existingCode);

      await expect(
        discountCodeService.createDiscountCode(userId, discountData)
      ).rejects.toThrow('Discount code already exists');

      expect(mockDiscountCodeRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if percentage discount exceeds 100%', async () => {
      const discountData = {
        code: 'INVALID',
        name: 'Invalid Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150, // Invalid
        maxUsages: 100,
        maxUsagesPerUser: 1
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      await expect(
        discountCodeService.createDiscountCode(userId, discountData)
      ).rejects.toThrow('Percentage discount cannot exceed 100%');
    });

    it('should throw error if discount value is zero or negative', async () => {
      const discountData = {
        code: 'ZERO',
        name: 'Zero Discount',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0,
        maxUsages: 100,
        maxUsagesPerUser: 1
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      await expect(
        discountCodeService.createDiscountCode(userId, discountData)
      ).rejects.toThrow('Discount value must be positive');
    });

    it('should throw error if validUntil is before validFrom', async () => {
      const discountData = {
        code: 'INVALID_DATES',
        name: 'Invalid Dates',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxUsages: 100,
        maxUsagesPerUser: 1,
        validFrom: new Date('2024-12-31'),
        validUntil: new Date('2024-01-01') // Before validFrom
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      await expect(
        discountCodeService.createDiscountCode(userId, discountData)
      ).rejects.toThrow('Valid until date must be after valid from date');
    });

    it('should throw error if user is not admin', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;
      const discountData = {
        code: 'TEST',
        name: 'Test',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maxUsages: 100,
        maxUsagesPerUser: 1
      };

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        discountCodeService.createDiscountCode(userId, discountData)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('validateDiscountCode', () => {
    it('should validate a valid one-time discount code', async () => {
      const code = TEST_DISCOUNT_CODES.VALID_ONE_TIME.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        isActive: true,
        currentUsages: 50,
        maxUsages: 1000,
        validFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
        metadata: {
          isRecurring: false,
          maxRecurringUses: 1
        }
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(0);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(true);
      expect(result.discountCode).toEqual(mockDiscount);
      expect(result.calculatedDiscount).toEqual({
        originalAmount: amount,
        discountAmount: amount * 0.2, // 20% off
        finalAmount: amount * 0.8
      });
      expect(result.errorMessage).toBeNull();
    });

    it('should validate a fixed amount discount code', async () => {
      const code = TEST_DISCOUNT_CODES.VALID_FIXED.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 100,
        isActive: true,
        currentUsages: 10,
        maxUsages: 1000
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(0);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(true);
      expect(result.calculatedDiscount).toEqual({
        originalAmount: amount,
        discountAmount: 100,
        finalAmount: amount - 100
      });
    });

    it('should reject non-existent discount code', async () => {
      const code = 'NONEXISTENT';
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(`Invalid discount code: ${code}`);
      expect(result.discountCode).toBeNull();
      expect(result.calculatedDiscount).toBeNull();
    });

    it('should reject inactive discount code', async () => {
      const code = TEST_DISCOUNT_CODES.INACTIVE.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        isActive: false
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Discount code is not active');
    });

    it('should reject expired discount code', async () => {
      const code = TEST_DISCOUNT_CODES.EXPIRED.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.expiredDiscountCode({ code });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Discount code has expired');
    });

    it('should reject discount code with usage limit reached', async () => {
      const code = TEST_DISCOUNT_CODES.EXHAUSTED.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.exhaustedDiscountCode({ code });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Discount code usage limit reached');
    });

    it('should reject if user already used one-time discount', async () => {
      const code = TEST_DISCOUNT_CODES.VALID_ONE_TIME.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        maxUsagesPerUser: 1,
        isActive: true,
        currentUsages: 50,
        maxUsages: 1000
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(1); // Already used

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('You have already used this discount code');
    });

    it('should reject if minimum purchase amount not met', async () => {
      const code = TEST_DISCOUNT_CODES.MIN_AMOUNT.code;
      const planId = 'plan-basic-tier1';
      const amount = 500; // Below minimum
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        minPurchaseAmount: 1500, // Minimum required
        isActive: true
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(0);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Minimum purchase amount');
    });

    it('should reject if discount is plan-specific and plan does not match', async () => {
      const code = 'PLANSPECIFIC';
      const planId = 'plan-premium-tier1';
      const amount = TEST_PRICES.PREMIUM_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        applicablePlans: ['plan-basic-tier1', 'plan-basic-tier2'], // Only for basic plans
        isActive: true
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(0);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Discount code not applicable to this plan');
    });

    it('should validate discount code for recurring use (3 uses)', async () => {
      const code = TEST_DISCOUNT_CODES.VALID_RECURRING.code;
      const planId = 'plan-basic-tier1';
      const amount = TEST_PRICES.BASIC_TIER1;
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.recurringDiscountCode(3, {
        code,
        discountValue: 35,
        maxUsagesPerUser: 3,
        isActive: true
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(1); // Used once

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(true);
      expect(result.discountCode.metadata.isRecurring).toBe(true);
      expect(result.discountCode.metadata.maxRecurringUses).toBe(3);
    });

    it('should cap fixed discount at purchase amount', async () => {
      const code = 'BIGDISCOUNT';
      const planId = 'plan-basic-tier1';
      const amount = 500; // Small amount
      const userId = TEST_USER_IDS.BUSINESS_OWNER;

      const mockDiscount = MockFactories.discountCode({
        code,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 1000, // More than purchase amount
        isActive: true
      });

      mockDiscountCodeRepository.findByCode.mockResolvedValue(mockDiscount);
      mockDiscountCodeRepository.countUserUsages.mockResolvedValue(0);

      const result = await discountCodeService.validateDiscountCode(
        code,
        planId,
        amount,
        userId
      );

      expect(result.isValid).toBe(true);
      expect(result.calculatedDiscount.finalAmount).toBe(0); // Capped at 0
      expect(result.calculatedDiscount.discountAmount).toBe(amount); // Discount capped at amount
    });
  });

  describe('getDiscountCode', () => {
    it('should return discount code by ID for admin', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const codeId = 'dc-123';

      const mockDiscount = MockFactories.discountCode({ id: codeId });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(mockDiscount);

      const result = await discountCodeService.getDiscountCode(userId, codeId);

      expect(result).toEqual(mockDiscount);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_ALL_SUBSCRIPTIONS
      );
    });

    it('should throw error if discount code not found', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const codeId = 'non-existent';

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(null);

      await expect(
        discountCodeService.getDiscountCode(userId, codeId)
      ).rejects.toThrow('Discount code not found');
    });

    it('should throw error if user is not admin', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;
      const codeId = 'dc-123';

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        discountCodeService.getDiscountCode(userId, codeId)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('updateDiscountCode', () => {
    const userId = TEST_USER_IDS.ADMIN;
    const codeId = 'dc-123';

    it('should update discount code successfully', async () => {
      const existingCode = MockFactories.discountCode({
        id: codeId,
        code: 'ORIGINAL',
        discountValue: 20
      });

      const updateData = {
        discountValue: 25,
        maxUsages: 2000
      };

      const updatedCode = {
        ...existingCode,
        ...updateData
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.update.mockResolvedValue(updatedCode);

      const result = await discountCodeService.updateDiscountCode(
        userId,
        codeId,
        updateData
      );

      expect(result.discountValue).toBe(25);
      expect(result.maxUsages).toBe(2000);
      expect(mockDiscountCodeRepository.update).toHaveBeenCalledWith(codeId, updateData);
    });

    it('should throw error if updating code to existing code', async () => {
      const existingCode = MockFactories.discountCode({
        id: codeId,
        code: 'ORIGINAL'
      });

      const anotherCode = MockFactories.discountCode({
        id: 'dc-456',
        code: 'TAKEN'
      });

      const updateData = {
        code: 'TAKEN' // Trying to change to existing code
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(anotherCode);

      await expect(
        discountCodeService.updateDiscountCode(userId, codeId, updateData)
      ).rejects.toThrow('Discount code already exists');
    });

    it('should throw error if percentage exceeds 100%', async () => {
      const existingCode = MockFactories.discountCode({ id: codeId });

      const updateData = {
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);

      await expect(
        discountCodeService.updateDiscountCode(userId, codeId, updateData)
      ).rejects.toThrow('Percentage discount cannot exceed 100%');
    });

    it('should throw error if discount value is zero or negative', async () => {
      const existingCode = MockFactories.discountCode({ id: codeId });

      const updateData = {
        discountValue: -10
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);

      await expect(
        discountCodeService.updateDiscountCode(userId, codeId, updateData)
      ).rejects.toThrow('Discount value must be positive');
    });

    it('should throw error if discount code not found', async () => {
      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(null);

      await expect(
        discountCodeService.updateDiscountCode(userId, codeId, { discountValue: 30 })
      ).rejects.toThrow('Discount code not found');
    });
  });

  describe('deleteDiscountCode', () => {
    it('should delete discount code successfully', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const codeId = 'dc-123';

      const existingCode = MockFactories.discountCode({ id: codeId });

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.delete.mockResolvedValue(true);

      const result = await discountCodeService.deleteDiscountCode(userId, codeId);

      expect(result).toBe(true);
      expect(mockDiscountCodeRepository.delete).toHaveBeenCalledWith(codeId);
    });

    it('should throw error if discount code not found', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const codeId = 'non-existent';

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(null);

      await expect(
        discountCodeService.deleteDiscountCode(userId, codeId)
      ).rejects.toThrow('Discount code not found');
    });
  });

  describe('deactivateDiscountCode', () => {
    it('should deactivate discount code successfully', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const codeId = 'dc-123';

      const existingCode = MockFactories.discountCode({
        id: codeId,
        isActive: true
      });

      const deactivatedCode = {
        ...existingCode,
        isActive: false
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findById.mockResolvedValue(existingCode);
      mockDiscountCodeRepository.deactivate.mockResolvedValue(deactivatedCode);

      const result = await discountCodeService.deactivateDiscountCode(userId, codeId);

      expect(result.isActive).toBe(false);
      expect(mockDiscountCodeRepository.deactivate).toHaveBeenCalledWith(codeId);
    });
  });

  describe('getDiscountCodeStatistics', () => {
    it('should return discount code statistics for admin', async () => {
      const userId = TEST_USER_IDS.ADMIN;

      const mockStats = {
        totalCodes: 15,
        activeCodes: 12,
        expiredCodes: 2,
        totalUsages: 1250,
        totalDiscountAmount: 125000,
        topPerformingCodes: [
          { code: 'WELCOME20', usages: 450, totalDiscount: 45000 },
          { code: 'LOYAL35', usages: 300, totalDiscount: 35000 }
        ]
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await discountCodeService.getDiscountCodeStatistics(userId);

      expect(result).toEqual(mockStats);
      expect(result.totalCodes).toBe(15);
      expect(result.activeCodes).toBe(12);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.VIEW_ALL_SUBSCRIPTIONS
      );
    });

    it('should throw error if user is not admin', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        discountCodeService.getDiscountCodeStatistics(userId)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('generateBulkDiscountCodes', () => {
    it('should generate multiple discount codes', async () => {
      const userId = TEST_USER_IDS.ADMIN;
      const bulkData = {
        count: 5,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        prefix: 'BULK',
        maxUsages: 1,
        maxUsagesPerUser: 1
      };

      const generatedCodes = MockFactories.createMultiple(
        () => MockFactories.discountCode({ discountValue: 20 }),
        5,
        (code, index) => ({ ...code, code: `BULK${String(index + 1).padStart(3, '0')}` })
      );

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockDiscountCodeRepository.findByCode.mockResolvedValue(null);
      mockDiscountCodeRepository.create
        .mockResolvedValueOnce(generatedCodes[0])
        .mockResolvedValueOnce(generatedCodes[1])
        .mockResolvedValueOnce(generatedCodes[2])
        .mockResolvedValueOnce(generatedCodes[3])
        .mockResolvedValueOnce(generatedCodes[4]);

      const result = await discountCodeService.generateBulkDiscountCodes(userId, bulkData);

      expect(result).toHaveLength(5);
      expect(result[0].code).toMatch(/^BULK\d{3}$/);
      expect(mockDiscountCodeRepository.create).toHaveBeenCalledTimes(5);
    });

    it('should throw error if user is not admin', async () => {
      const userId = TEST_USER_IDS.REGULAR_USER;
      const bulkData = {
        count: 5,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        prefix: 'BULK'
      };

      mockRBACService.requirePermission.mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await expect(
        discountCodeService.generateBulkDiscountCodes(userId, bulkData)
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
