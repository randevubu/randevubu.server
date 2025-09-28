import { Request, Response } from 'express';
import { DiscountCodeController } from '../../../src/controllers/discountCodeController';
import { DiscountCodeService } from '../../../src/services/discountCodeService';
import { TestHelpers } from '../../utils/testHelpers';
import { AuthenticatedRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/discountCodeService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('DiscountCodeController', () => {
  let discountCodeController: DiscountCodeController;
  let mockDiscountCodeService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock DiscountCodeService
    mockDiscountCodeService = {
      createDiscountCode: jest.fn(),
      getDiscountCodeById: jest.fn(),
      getAllDiscountCodes: jest.fn(),
      updateDiscountCode: jest.fn(),
      deleteDiscountCode: jest.fn(),
      validateDiscountCode: jest.fn(),
      applyDiscountCode: jest.fn(),
      getDiscountCodeStats: jest.fn()
    };

    // Create DiscountCodeController instance
    discountCodeController = new DiscountCodeController(mockDiscountCodeService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create DiscountCodeController instance', () => {
      expect(discountCodeController).toBeInstanceOf(DiscountCodeController);
    });
  });

  describe('createDiscountCode', () => {
    it('should create discount code successfully', async () => {
      // Arrange
      const discountCodeData = {
        code: 'SAVE20',
        type: 'PERCENTAGE',
        value: 20,
        maxUses: 100,
        validFrom: '2024-01-01',
        validUntil: '2024-12-31'
      };

      mockRequest.body = discountCodeData;

      const mockCreatedDiscountCode = {
        id: 'discount-123',
        ...discountCodeData,
        isActive: true
      };

      mockDiscountCodeService.createDiscountCode.mockResolvedValue(mockCreatedDiscountCode);

      // Act
      await discountCodeController.createDiscountCode(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.createDiscountCode).toHaveBeenCalledWith('user-123', discountCodeData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedDiscountCode
      });
    });
  });

  describe('getDiscountCodeById', () => {
    it('should get discount code by id successfully', async () => {
      // Arrange
      const discountCodeId = 'discount-123';
      mockRequest.params = { id: discountCodeId };

      const mockDiscountCode = {
        id: discountCodeId,
        code: 'SAVE20',
        type: 'PERCENTAGE',
        value: 20,
        isActive: true
      };

      mockDiscountCodeService.getDiscountCodeById.mockResolvedValue(mockDiscountCode);

      // Act
      await discountCodeController.getDiscountCodeById(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.getDiscountCodeById).toHaveBeenCalledWith('user-123', discountCodeId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDiscountCode
      });
    });
  });

  describe('getAllDiscountCodes', () => {
    it('should get all discount codes successfully', async () => {
      // Arrange
      const mockDiscountCodes = [
        { id: 'discount-1', code: 'SAVE20', type: 'PERCENTAGE', value: 20 },
        { id: 'discount-2', code: 'SAVE10', type: 'FIXED', value: 10 }
      ];

      mockDiscountCodeService.getAllDiscountCodes.mockResolvedValue(mockDiscountCodes);

      // Act
      await discountCodeController.getAllDiscountCodes(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.getAllDiscountCodes).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDiscountCodes
      });
    });
  });

  describe('updateDiscountCode', () => {
    it('should update discount code successfully', async () => {
      // Arrange
      const discountCodeId = 'discount-123';
      const updateData = {
        value: 25,
        maxUses: 150
      };

      mockRequest.params = { id: discountCodeId };
      mockRequest.body = updateData;

      const mockUpdatedDiscountCode = {
        id: discountCodeId,
        ...updateData
      };

      mockDiscountCodeService.updateDiscountCode.mockResolvedValue(mockUpdatedDiscountCode);

      // Act
      await discountCodeController.updateDiscountCode(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.updateDiscountCode).toHaveBeenCalledWith('user-123', discountCodeId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedDiscountCode
      });
    });
  });

  describe('deleteDiscountCode', () => {
    it('should delete discount code successfully', async () => {
      // Arrange
      const discountCodeId = 'discount-123';
      mockRequest.params = { id: discountCodeId };

      mockDiscountCodeService.deleteDiscountCode.mockResolvedValue(undefined);

      // Act
      await discountCodeController.deleteDiscountCode(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.deleteDiscountCode).toHaveBeenCalledWith('user-123', discountCodeId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Discount code deleted successfully'
      });
    });
  });

  describe('validateDiscountCode', () => {
    it('should validate discount code successfully', async () => {
      // Arrange
      const code = 'SAVE20';
      const businessId = 'business-123';

      mockRequest.query = { code, businessId };

      const mockValidation = {
        isValid: true,
        discount: 20,
        type: 'PERCENTAGE'
      };

      mockDiscountCodeService.validateDiscountCode.mockResolvedValue(mockValidation);

      // Act
      await discountCodeController.validateDiscountCode(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.validateDiscountCode).toHaveBeenCalledWith('user-123', code, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockValidation
      });
    });
  });

  describe('applyDiscountCode', () => {
    it('should apply discount code successfully', async () => {
      // Arrange
      const applyData = {
        code: 'SAVE20',
        businessId: 'business-123',
        amount: 100
      };

      mockRequest.body = applyData;

      const mockAppliedDiscount = {
        success: true,
        discountAmount: 20,
        finalAmount: 80
      };

      mockDiscountCodeService.applyDiscountCode.mockResolvedValue(mockAppliedDiscount);

      // Act
      await discountCodeController.applyDiscountCode(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.applyDiscountCode).toHaveBeenCalledWith('user-123', applyData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppliedDiscount
      });
    });
  });

  describe('getDiscountCodeStats', () => {
    it('should get discount code statistics successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockStats = {
        totalCodes: 5,
        activeCodes: 3,
        totalUses: 150,
        totalSavings: 3000
      };

      mockDiscountCodeService.getDiscountCodeStats.mockResolvedValue(mockStats);

      // Act
      await discountCodeController.getDiscountCodeStats(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.getDiscountCodeStats).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });
});

