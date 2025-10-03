import { Response } from "express";
import { DiscountCodeController } from "../../../src/controllers/discountCodeController";
import { GuaranteedAuthRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/discountCodeService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

describe("DiscountCodeController", () => {
  let discountCodeController: DiscountCodeController;
  let mockDiscountCodeService: any;
  let mockRequest: GuaranteedAuthRequest;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock DiscountCodeService
    mockDiscountCodeService = {
      createDiscountCode: jest.fn(),
      getDiscountCode: jest.fn(),
      getAllDiscountCodes: jest.fn(),
      updateDiscountCode: jest.fn(),
      deleteDiscountCode: jest.fn(),
      deactivateDiscountCode: jest.fn(),
      validateDiscountCode: jest.fn(),
      getDiscountCodeUsageHistory: jest.fn(),
      getDiscountCodeStatistics: jest.fn(),
      generateBulkDiscountCodes: jest.fn(),
    };

    // Create DiscountCodeController instance
    discountCodeController = new DiscountCodeController(
      mockDiscountCodeService
    );

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [{ id: "admin-role", name: "ADMIN", level: 100 }],
      effectiveLevel: 100,
    };
    mockRequest.token = {
      userId: "user-123",
      phoneNumber: "+905551234567",
      type: "access",
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe("constructor", () => {
    it("should create DiscountCodeController instance", () => {
      expect(discountCodeController).toBeInstanceOf(DiscountCodeController);
    });
  });

  describe("createDiscountCode", () => {
    it("should create discount code successfully", async () => {
      // Arrange
      const discountCodeData = {
        code: "SAVE20",
        type: "PERCENTAGE",
        value: 20,
        maxUses: 100,
        validFrom: "2024-01-01",
        validUntil: "2024-12-31",
      };

      mockRequest.body = discountCodeData;

      const mockCreatedDiscountCode = {
        id: "discount-123",
        ...discountCodeData,
        isActive: true,
      };

      mockDiscountCodeService.createDiscountCode.mockResolvedValue(
        mockCreatedDiscountCode
      );

      // Act
      await discountCodeController.createDiscountCode(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockDiscountCodeService.createDiscountCode).toHaveBeenCalledWith(
        "user-123",
        discountCodeData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedDiscountCode,
        message: "Discount code created successfully",
      });
    });
  });

  describe("getDiscountCode", () => {
    it("should get discount code by id successfully", async () => {
      // Arrange
      const discountCodeId = "discount-123";
      mockRequest.params = { id: discountCodeId };

      const mockDiscountCode = {
        id: discountCodeId,
        code: "SAVE20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        isActive: true,
      };

      mockDiscountCodeService.getDiscountCode.mockResolvedValue(
        mockDiscountCode
      );

      // Act
      await discountCodeController.getDiscountCode(mockRequest, mockResponse);

      // Assert
      expect(mockDiscountCodeService.getDiscountCode).toHaveBeenCalledWith(
        "user-123",
        discountCodeId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDiscountCode,
      });
    });
  });

  describe("getAllDiscountCodes", () => {
    it("should get all discount codes successfully", async () => {
      // Arrange
      const mockResult = {
        discountCodes: [
          {
            id: "discount-1",
            code: "SAVE20",
            discountType: "PERCENTAGE",
            discountValue: 20,
          },
          {
            id: "discount-2",
            code: "SAVE10",
            discountType: "FIXED_AMOUNT",
            discountValue: 10,
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockDiscountCodeService.getAllDiscountCodes.mockResolvedValue(mockResult);

      // Act
      await discountCodeController.getAllDiscountCodes(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockDiscountCodeService.getAllDiscountCodes).toHaveBeenCalledWith(
        "user-123",
        {}
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe("updateDiscountCode", () => {
    it("should update discount code successfully", async () => {
      // Arrange
      const discountCodeId = "discount-123";
      const updateData = {
        value: 25,
        maxUses: 150,
      };

      mockRequest.params = { id: discountCodeId };
      mockRequest.body = updateData;

      const mockUpdatedDiscountCode = {
        id: discountCodeId,
        ...updateData,
      };

      mockDiscountCodeService.updateDiscountCode.mockResolvedValue(
        mockUpdatedDiscountCode
      );

      // Act
      await discountCodeController.updateDiscountCode(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockDiscountCodeService.updateDiscountCode).toHaveBeenCalledWith(
        "user-123",
        discountCodeId,
        updateData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedDiscountCode,
        message: "Discount code updated successfully",
      });
    });
  });

  describe("deleteDiscountCode", () => {
    it("should delete discount code successfully", async () => {
      // Arrange
      const discountCodeId = "discount-123";
      mockRequest.params = { id: discountCodeId };

      mockDiscountCodeService.deleteDiscountCode.mockResolvedValue(true);

      // Act
      await discountCodeController.deleteDiscountCode(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockDiscountCodeService.deleteDiscountCode).toHaveBeenCalledWith(
        "user-123",
        discountCodeId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Discount code deleted successfully",
      });
    });
  });

  describe("validateDiscountCode", () => {
    it("should validate discount code successfully", async () => {
      // Arrange
      const validationData = {
        code: "SAVE20",
        planId: "plan-123",
        amount: 100,
      };

      mockRequest.body = validationData;

      const mockValidation = {
        isValid: true,
        calculatedDiscount: {
          discountAmount: 20,
          originalAmount: 100,
          finalAmount: 80,
        },
        errorMessage: null,
      };

      mockDiscountCodeService.validateDiscountCode.mockResolvedValue(
        mockValidation
      );

      // Act
      await discountCodeController.validateDiscountCode(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockDiscountCodeService.validateDiscountCode).toHaveBeenCalledWith(
        "SAVE20",
        "plan-123",
        100,
        "user-123"
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isValid: true,
          discountAmount: 20,
          originalAmount: 100,
          finalAmount: 80,
          errorMessage: null,
        },
      });
    });
  });

  describe("deactivateDiscountCode", () => {
    it("should deactivate discount code successfully", async () => {
      // Arrange
      const discountCodeId = "discount-123";
      mockRequest.params = { id: discountCodeId };

      mockDiscountCodeService.deactivateDiscountCode.mockResolvedValue(true);

      // Act
      await discountCodeController.deactivateDiscountCode(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockDiscountCodeService.deactivateDiscountCode
      ).toHaveBeenCalledWith("user-123", discountCodeId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Discount code deactivated successfully",
      });
    });
  });

  describe("getDiscountCodeUsageHistory", () => {
    it("should get discount code usage history successfully", async () => {
      // Arrange
      const discountCodeId = "discount-123";
      mockRequest.params = { id: discountCodeId };

      const mockUsageHistory = {
        usages: [
          { id: "usage-1", userId: "user-1", usedAt: "2024-01-01T00:00:00Z" },
          { id: "usage-2", userId: "user-2", usedAt: "2024-01-02T00:00:00Z" },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockDiscountCodeService.getDiscountCodeUsageHistory.mockResolvedValue(
        mockUsageHistory
      );

      // Act
      await discountCodeController.getDiscountCodeUsageHistory(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockDiscountCodeService.getDiscountCodeUsageHistory
      ).toHaveBeenCalledWith("user-123", discountCodeId, {});
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsageHistory,
      });
    });
  });

  describe("getDiscountCodeStatistics", () => {
    it("should get discount code statistics successfully", async () => {
      // Arrange
      const mockStats = {
        totalCodes: 5,
        activeCodes: 3,
        expiredCodes: 1,
        totalUsages: 150,
        totalDiscountAmount: 3000,
      };

      mockDiscountCodeService.getDiscountCodeStatistics.mockResolvedValue(
        mockStats
      );

      // Act
      await discountCodeController.getDiscountCodeStatistics(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockDiscountCodeService.getDiscountCodeStatistics
      ).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });
  });

  describe("generateBulkDiscountCodes", () => {
    it("should generate bulk discount codes successfully", async () => {
      // Arrange
      const bulkData = {
        count: 5,
        discountType: "PERCENTAGE",
        discountValue: 20,
        prefix: "BULK",
      };

      mockRequest.body = bulkData;

      const mockGeneratedCodes = [
        { id: "code-1", code: "BULK001" },
        { id: "code-2", code: "BULK002" },
        { id: "code-3", code: "BULK003" },
        { id: "code-4", code: "BULK004" },
        { id: "code-5", code: "BULK005" },
      ];

      mockDiscountCodeService.generateBulkDiscountCodes.mockResolvedValue(
        mockGeneratedCodes
      );

      // Act
      await discountCodeController.generateBulkDiscountCodes(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockDiscountCodeService.generateBulkDiscountCodes
      ).toHaveBeenCalledWith("user-123", bulkData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          codes: mockGeneratedCodes,
          count: mockGeneratedCodes.length,
        },
        message: `Successfully generated ${mockGeneratedCodes.length} discount codes`,
      });
    });
  });
});
