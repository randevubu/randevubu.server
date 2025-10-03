import { Response } from "express";
import { ServiceController } from "../../../src/controllers/serviceController";
import {
  AuthenticatedRequest,
  GuaranteedAuthRequest,
} from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/serviceService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

describe("ServiceController", () => {
  let serviceController: ServiceController;
  let mockServiceService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockGuaranteedAuthRequest: GuaranteedAuthRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock ServiceService
    mockServiceService = {
      createService: jest.fn(),
      getServiceById: jest.fn(),
      getServicesByBusinessId: jest.fn(),
      getPublicServicesByBusinessId: jest.fn(),
      updateService: jest.fn(),
      deleteService: jest.fn(),
      reorderServices: jest.fn(),
      getServiceStats: jest.fn(),
      bulkUpdatePrices: jest.fn(),
      getPopularServices: jest.fn(),
      checkServiceAvailability: jest.fn(),
      toggleServiceStatus: jest.fn(),
      duplicateService: jest.fn(),
      batchToggleServices: jest.fn(),
      batchDeleteServices: jest.fn(),
    };

    // Create ServiceController instance
    serviceController = new ServiceController(mockServiceService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
    };

    mockGuaranteedAuthRequest =
      TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockGuaranteedAuthRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
    };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe("constructor", () => {
    it("should create ServiceController instance", () => {
      expect(serviceController).toBeInstanceOf(ServiceController);
    });
  });

  describe("createService", () => {
    it("should create service successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const serviceData = {
        name: "Haircut",
        description: "Professional haircut service",
        price: 50,
        duration: 60,
        currency: "TRY",
        showPrice: true,
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = serviceData;

      const mockCreatedService = {
        id: "service-123",
        businessId,
        ...serviceData,
        isActive: true,
      };

      mockServiceService.createService.mockResolvedValue(mockCreatedService);

      // Act
      await serviceController.createService(
        mockGuaranteedAuthRequest,
        mockResponse
      );

      // Assert
      expect(mockServiceService.createService).toHaveBeenCalledWith(
        "user-123",
        businessId,
        serviceData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedService,
        message: "Service created successfully",
      });
    });
  });

  describe("getServiceById", () => {
    it("should get service by id successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      mockRequest.params = { id: serviceId };

      const mockService = {
        id: serviceId,
        name: "Haircut",
        price: 50,
        duration: 60,
      };

      mockServiceService.getServiceById.mockResolvedValue(mockService);

      // Act
      await serviceController.getServiceById(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.getServiceById).toHaveBeenCalledWith(
        "user-123",
        serviceId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockService,
      });
    });
  });

  describe("getBusinessServices", () => {
    it("should get business services successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockServices = [
        { id: "service-1", name: "Haircut", price: 50 },
        { id: "service-2", name: "Styling", price: 75 },
      ];

      mockServiceService.getServicesByBusinessId.mockResolvedValue(
        mockServices
      );

      // Act
      await serviceController.getBusinessServices(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.getServicesByBusinessId).toHaveBeenCalledWith(
        "user-123",
        businessId,
        false
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockServices,
        meta: {
          total: mockServices.length,
          businessId,
          activeOnly: false,
        },
      });
    });
  });

  describe("getPublicBusinessServices", () => {
    it("should get public business services successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockServices = [
        { id: "service-1", name: "Haircut", price: 50, isActive: true },
        { id: "service-2", name: "Styling", price: 75, isActive: true },
      ];

      mockServiceService.getPublicServicesByBusinessId.mockResolvedValue(
        mockServices
      );

      // Act
      await serviceController.getPublicBusinessServices(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockServiceService.getPublicServicesByBusinessId
      ).toHaveBeenCalledWith(businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockServices,
        meta: {
          total: mockServices.length,
          businessId,
        },
      });
    });
  });

  describe("updateService", () => {
    it("should update service successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      const updateData = {
        name: "Updated Haircut",
        price: 60,
        description: "Updated description",
      };

      mockRequest.params = { id: serviceId };
      mockRequest.body = updateData;

      const mockUpdatedService = {
        id: serviceId,
        ...updateData,
      };

      mockServiceService.updateService.mockResolvedValue(mockUpdatedService);

      // Act
      await serviceController.updateService(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.updateService).toHaveBeenCalledWith(
        "user-123",
        serviceId,
        updateData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedService,
        message: "Service updated successfully",
      });
    });
  });

  describe("deleteService", () => {
    it("should delete service successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      mockRequest.params = { id: serviceId };

      mockServiceService.deleteService.mockResolvedValue(undefined);

      // Act
      await serviceController.deleteService(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.deleteService).toHaveBeenCalledWith(
        "user-123",
        serviceId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Service deleted successfully",
      });
    });
  });

  describe("reorderServices", () => {
    it("should reorder services successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const serviceOrders = [
        { id: "service-1", sortOrder: 1 },
        { id: "service-2", sortOrder: 2 },
        { id: "service-3", sortOrder: 3 },
      ];

      mockRequest.params = { businessId };
      mockRequest.body = { serviceOrders };

      mockServiceService.reorderServices.mockResolvedValue(undefined);

      // Act
      await serviceController.reorderServices(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.reorderServices).toHaveBeenCalledWith(
        "user-123",
        businessId,
        serviceOrders
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Services reordered successfully",
      });
    });
  });

  describe("getServiceStats", () => {
    it("should get service statistics successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      mockRequest.params = { id: serviceId };

      const mockStats = {
        totalServices: 10,
        activeServices: 8,
        totalRevenue: 5000,
        averagePrice: 50,
      };

      mockServiceService.getServiceStats.mockResolvedValue(mockStats);

      // Act
      await serviceController.getServiceStats(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.getServiceStats).toHaveBeenCalledWith(
        "user-123",
        serviceId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });
  });

  describe("bulkUpdatePrices", () => {
    it("should bulk update prices successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const priceMultiplier = 1.2;

      mockRequest.params = { businessId };
      mockRequest.body = { priceMultiplier };

      mockServiceService.bulkUpdatePrices.mockResolvedValue(undefined);

      // Act
      await serviceController.bulkUpdatePrices(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.bulkUpdatePrices).toHaveBeenCalledWith(
        "user-123",
        businessId,
        priceMultiplier
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Prices updated with multiplier 1.2",
      });
    });
  });

  describe("getPopularServices", () => {
    it("should get popular services successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const limit = 5;

      mockRequest.params = { businessId };
      mockRequest.query = { limit: limit.toString() };

      const mockPopularServices = [
        { id: "service-1", name: "Haircut", bookingCount: 100 },
        { id: "service-2", name: "Styling", bookingCount: 75 },
      ];

      mockServiceService.getPopularServices.mockResolvedValue(
        mockPopularServices
      );

      // Act
      await serviceController.getPopularServices(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.getPopularServices).toHaveBeenCalledWith(
        "user-123",
        businessId,
        limit
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPopularServices,
        meta: {
          businessId,
          limit,
        },
      });
    });
  });

  describe("checkServiceAvailability", () => {
    it("should check service availability successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      const date = "2024-01-15";
      const startTime = "10:00";

      mockRequest.params = { id: serviceId };
      mockRequest.query = { date, startTime };

      const mockAvailability = {
        isAvailable: true,
        service: { id: serviceId, name: "Haircut" },
      };

      mockServiceService.checkServiceAvailability.mockResolvedValue(
        mockAvailability
      );

      // Act
      await serviceController.checkServiceAvailability(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockServiceService.checkServiceAvailability).toHaveBeenCalledWith(
        serviceId,
        new Date(date),
        new Date(`${date}T${startTime}`)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          serviceId,
          date,
          startTime,
          isAvailable: mockAvailability.isAvailable,
          service: mockAvailability.service,
        },
      });
    });
  });

  describe("toggleServiceStatus", () => {
    it("should toggle service status successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      const isActive = true;

      mockRequest.params = { id: serviceId };
      mockRequest.body = { isActive };

      const mockToggledService = {
        id: serviceId,
        isActive: true,
      };

      mockServiceService.toggleServiceStatus.mockResolvedValue(
        mockToggledService
      );

      // Act
      await serviceController.toggleServiceStatus(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.toggleServiceStatus).toHaveBeenCalledWith(
        "user-123",
        serviceId,
        isActive
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockToggledService,
        message: "Service activated successfully",
      });
    });
  });

  describe("duplicateService", () => {
    it("should duplicate service successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      const newName = "Duplicated Service";

      mockRequest.params = { id: serviceId };
      mockRequest.body = { newName };

      const mockDuplicatedService = {
        id: "service-456",
        name: newName,
        originalId: serviceId,
      };

      mockServiceService.duplicateService.mockResolvedValue(
        mockDuplicatedService
      );

      // Act
      await serviceController.duplicateService(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.duplicateService).toHaveBeenCalledWith(
        "user-123",
        serviceId,
        newName
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDuplicatedService,
        message: "Service duplicated successfully",
      });
    });
  });

  describe("batchToggleServices", () => {
    it("should batch toggle services successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const serviceIds = ["service-1", "service-2", "service-3"];
      const isActive = false;

      mockRequest.params = { businessId };
      mockRequest.body = { serviceIds, isActive };

      mockServiceService.batchToggleServices.mockResolvedValue(undefined);

      // Act
      await serviceController.batchToggleServices(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.batchToggleServices).toHaveBeenCalledWith(
        "user-123",
        businessId,
        serviceIds,
        isActive
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "3 services deactivated successfully",
      });
    });
  });

  describe("batchDeleteServices", () => {
    it("should batch delete services successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const serviceIds = ["service-1", "service-2", "service-3"];

      mockRequest.params = { businessId };
      mockRequest.body = { serviceIds };

      mockServiceService.batchDeleteServices.mockResolvedValue(undefined);

      // Act
      await serviceController.batchDeleteServices(mockRequest, mockResponse);

      // Assert
      expect(mockServiceService.batchDeleteServices).toHaveBeenCalledWith(
        "user-123",
        businessId,
        serviceIds
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "3 services deleted successfully",
      });
    });
  });
});
