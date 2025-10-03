import { Request, Response } from "express";
import { BusinessTypeController } from "../../../src/controllers/businessTypeController";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/businessTypeService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

// Import the mocked modules
import {
  sendSimpleErrorResponse,
  sendStandardSuccessResponse,
} from "../../../src/utils/errorResponse";

describe("BusinessTypeController", () => {
  let businessTypeController: BusinessTypeController;
  let mockBusinessTypeService: any;
  let mockRequest: Request;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock BusinessTypeService
    mockBusinessTypeService = {
      getAllActiveBusinessTypes: jest.fn(),
      getAllBusinessTypes: jest.fn(),
      getBusinessTypeById: jest.fn(),
      getBusinessTypesByCategory: jest.fn(),
      getBusinessTypesWithCount: jest.fn(),
      getCategories: jest.fn(),
      getBusinessTypesGroupedByCategory: jest.fn(),
    };

    // Mock the error response utilities
    (sendStandardSuccessResponse as jest.Mock).mockImplementation(
      (res, data, message) => {
        res.json({ success: true, data, message });
      }
    );

    (sendSimpleErrorResponse as jest.Mock).mockImplementation(
      (res, statusCode, message) => {
        res.status(statusCode).json({ success: false, message });
      }
    );

    // Create BusinessTypeController instance
    businessTypeController = new BusinessTypeController(
      mockBusinessTypeService
    );

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();
  });

  describe("constructor", () => {
    it("should create BusinessTypeController instance", () => {
      expect(businessTypeController).toBeInstanceOf(BusinessTypeController);
    });
  });

  describe("getAllActiveBusinessTypes", () => {
    it("should get all active business types successfully", async () => {
      // Arrange
      const mockBusinessTypes = [
        { id: "type-1", name: "Hair Salon", category: "beauty" },
        { id: "type-2", name: "Barber Shop", category: "beauty" },
      ];

      mockBusinessTypeService.getAllActiveBusinessTypes.mockResolvedValue(
        mockBusinessTypes
      );

      // Act
      await businessTypeController.getAllActiveBusinessTypes(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessTypeService.getAllActiveBusinessTypes
      ).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessTypes,
        message: "Business types retrieved successfully",
      });
    });
  });

  describe("getAllBusinessTypes", () => {
    it("should get all business types successfully", async () => {
      // Arrange
      const mockBusinessTypes = [
        { id: "type-1", name: "Hair Salon", category: "beauty" },
        { id: "type-2", name: "Barber Shop", category: "beauty" },
      ];

      mockBusinessTypeService.getAllBusinessTypes.mockResolvedValue(
        mockBusinessTypes
      );

      // Act
      await businessTypeController.getAllBusinessTypes(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockBusinessTypeService.getAllBusinessTypes).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessTypes,
        message: "All business types retrieved successfully",
      });
    });
  });

  describe("getBusinessTypeById", () => {
    it("should get business type by id successfully", async () => {
      // Arrange
      const typeId = "type-123";
      mockRequest.params = { id: typeId };

      const mockBusinessType = {
        id: typeId,
        name: "Hair Salon",
        category: "beauty",
        description: "Professional hair services",
      };

      mockBusinessTypeService.getBusinessTypeById.mockResolvedValue(
        mockBusinessType
      );

      // Act
      await businessTypeController.getBusinessTypeById(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockBusinessTypeService.getBusinessTypeById).toHaveBeenCalledWith(
        typeId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessType,
        message: "Business type retrieved successfully",
      });
    });

    it("should return 404 when business type not found", async () => {
      // Arrange
      const typeId = "non-existent-id";
      mockRequest.params = { id: typeId };

      mockBusinessTypeService.getBusinessTypeById.mockResolvedValue(null);

      // Act
      await businessTypeController.getBusinessTypeById(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockBusinessTypeService.getBusinessTypeById).toHaveBeenCalledWith(
        typeId
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Business type not found",
      });
    });
  });

  describe("getBusinessTypesWithCount", () => {
    it("should get business types with count successfully", async () => {
      // Arrange
      const mockBusinessTypesWithCount = [
        {
          id: "type-1",
          name: "Hair Salon",
          category: "beauty",
          businessCount: 5,
        },
        {
          id: "type-2",
          name: "Barber Shop",
          category: "beauty",
          businessCount: 3,
        },
      ];

      mockBusinessTypeService.getBusinessTypesWithCount.mockResolvedValue(
        mockBusinessTypesWithCount
      );

      // Act
      await businessTypeController.getBusinessTypesWithCount(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessTypeService.getBusinessTypesWithCount
      ).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessTypesWithCount,
        message: "Business types with count retrieved successfully",
      });
    });
  });

  describe("getCategories", () => {
    it("should get categories successfully", async () => {
      // Arrange
      const mockCategories = [
        { category: "beauty", count: 8 },
        { category: "health", count: 5 },
      ];

      mockBusinessTypeService.getCategories.mockResolvedValue(mockCategories);

      // Act
      await businessTypeController.getCategories(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.getCategories).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCategories,
        message: "Categories retrieved successfully",
      });
    });
  });

  describe("getBusinessTypesGroupedByCategory", () => {
    it("should get business types grouped by category successfully", async () => {
      // Arrange
      const mockGroupedBusinessTypes = {
        beauty: [
          { id: "type-1", name: "Hair Salon", category: "beauty" },
          { id: "type-2", name: "Nail Salon", category: "beauty" },
        ],
        health: [{ id: "type-3", name: "Dental Clinic", category: "health" }],
      };

      mockBusinessTypeService.getBusinessTypesGroupedByCategory.mockResolvedValue(
        mockGroupedBusinessTypes
      );

      // Act
      await businessTypeController.getBusinessTypesGroupedByCategory(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessTypeService.getBusinessTypesGroupedByCategory
      ).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockGroupedBusinessTypes,
        message: "Business types grouped by category retrieved successfully",
      });
    });
  });

  describe("getBusinessTypesByCategory", () => {
    it("should get business types by category successfully", async () => {
      // Arrange
      const category = "beauty";
      mockRequest.params = { category };

      const mockBusinessTypes = [
        { id: "type-1", name: "Hair Salon", category: "beauty" },
        { id: "type-2", name: "Nail Salon", category: "beauty" },
      ];

      mockBusinessTypeService.getBusinessTypesByCategory.mockResolvedValue(
        mockBusinessTypes
      );

      // Act
      await businessTypeController.getBusinessTypesByCategory(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessTypeService.getBusinessTypesByCategory
      ).toHaveBeenCalledWith(category);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessTypes,
        message: `Business types for category '${category}' retrieved successfully`,
      });
    });

    it("should return 404 when no business types found for category", async () => {
      // Arrange
      const category = "non-existent-category";
      mockRequest.params = { category };

      mockBusinessTypeService.getBusinessTypesByCategory.mockResolvedValue([]);

      // Act
      await businessTypeController.getBusinessTypesByCategory(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessTypeService.getBusinessTypesByCategory
      ).toHaveBeenCalledWith(category);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: `No business types found for category: ${category}`,
      });
    });
  });
});
