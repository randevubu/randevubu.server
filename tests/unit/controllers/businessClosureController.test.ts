import { Response } from "express";
import { BusinessClosureController } from "../../../src/controllers/businessClosureController";
import { BusinessContextRequest } from "../../../src/middleware/businessContext";
import { AuthenticatedRequest } from "../../../src/types/request";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/businessClosureService");
jest.mock("../../../src/services/notificationService");
jest.mock("../../../src/services/closureAnalyticsService");
jest.mock("../../../src/services/appointmentRescheduleService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

describe("BusinessClosureController", () => {
  let businessClosureController: BusinessClosureController;
  let mockBusinessClosureService: any;
  let mockNotificationService: any;
  let mockClosureAnalyticsService: any;
  let mockAppointmentRescheduleService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock services
    mockBusinessClosureService = {
      createClosure: jest.fn(),
      getBusinessClosures: jest.fn(),
      getActiveClosures: jest.fn(),
      updateClosure: jest.fn(),
      deleteClosure: jest.fn(),
      getClosureById: jest.fn(),
      getClosureStats: jest.fn(),
      getAffectedAppointments: jest.fn(),
    };

    mockNotificationService = {
      sendNotification: jest.fn(),
      sendBulkNotification: jest.fn(),
    };

    mockClosureAnalyticsService = {
      getClosureAnalytics: jest.fn(),
      getRevenueImpact: jest.fn(),
    };

    mockAppointmentRescheduleService = {
      rescheduleAppointments: jest.fn(),
      generateRescheduleSuggestions: jest.fn(),
    };

    // Create BusinessClosureController instance
    businessClosureController = new BusinessClosureController(
      mockBusinessClosureService,
      mockNotificationService,
      mockClosureAnalyticsService,
      mockAppointmentRescheduleService
    );

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
    };

    mockBusinessContextRequest =
      TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
    };
    mockBusinessContextRequest.businessContext = {
      businessIds: ["business-123"],
      primaryBusinessId: "business-123",
      isOwner: true,
      isStaff: false,
      isCustomer: false,
    };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe("constructor", () => {
    it("should create BusinessClosureController instance", () => {
      expect(businessClosureController).toBeInstanceOf(
        BusinessClosureController
      );
    });
  });

  describe("createClosure", () => {
    it("should create closure successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const closureData = {
        startDate: "2024-01-15",
        endDate: "2024-01-16",
        reason: "Holiday",
        type: "HOLIDAY",
      };

      mockRequest.params = { businessId };
      mockRequest.body = closureData;

      const mockClosure = {
        id: "closure-123",
        ...closureData,
        isActive: true,
      };

      mockBusinessClosureService.createClosure.mockResolvedValue(mockClosure);

      // Act
      await businessClosureController.createClosure(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.createClosure).toHaveBeenCalledWith(
        "user-123",
        "business-123",
        closureData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosure,
        message: "Business closure created successfully",
      });
    });
  });

  describe("getBusinessClosures", () => {
    it("should get closures successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockClosures = [
        { id: "closure-1", businessId: "business-123", reason: "Holiday" },
        { id: "closure-2", businessId: "business-123", reason: "Maintenance" },
      ];

      mockBusinessClosureService.getBusinessClosures.mockResolvedValue(
        mockClosures
      );

      // Act
      await businessClosureController.getBusinessClosures(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessClosureService.getBusinessClosures
      ).toHaveBeenCalledWith("user-123", businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosures,
        meta: {
          total: mockClosures.length,
          businessId: "business-123",
          filter: "all",
        },
      });
    });
  });

  describe("updateClosure", () => {
    it("should update closure successfully", async () => {
      // Arrange
      const closureId = "closure-123";
      const updateData = {
        reason: "Updated reason",
        isActive: false,
      };

      mockRequest.params = { id: closureId };
      mockRequest.body = updateData;

      const mockUpdatedClosure = {
        id: closureId,
        ...updateData,
      };

      mockBusinessClosureService.updateClosure.mockResolvedValue(
        mockUpdatedClosure
      );

      // Act
      await businessClosureController.updateClosure(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.updateClosure).toHaveBeenCalledWith(
        "user-123",
        closureId,
        updateData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedClosure,
        message: "Closure updated successfully",
      });
    });
  });

  describe("deleteClosure", () => {
    it("should delete closure successfully", async () => {
      // Arrange
      const closureId = "closure-123";
      mockRequest.params = { id: closureId };

      mockBusinessClosureService.deleteClosure.mockResolvedValue(undefined);

      // Act
      await businessClosureController.deleteClosure(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.deleteClosure).toHaveBeenCalledWith(
        "user-123",
        closureId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Closure deleted successfully",
      });
    });
  });

  describe("getClosureById", () => {
    it("should get closure by id successfully", async () => {
      // Arrange
      const closureId = "closure-123";
      mockRequest.params = { id: closureId };

      const mockClosure = {
        id: closureId,
        businessId: "business-123",
        reason: "Holiday",
        isActive: true,
      };

      mockBusinessClosureService.getClosureById.mockResolvedValue(mockClosure);

      // Act
      await businessClosureController.getClosureById(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.getClosureById).toHaveBeenCalledWith(
        "user-123",
        closureId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosure,
      });
    });
  });

  describe("getBusinessClosures with active filter", () => {
    it("should get active closures successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };
      mockRequest.query = { active: "true" };

      const mockActiveClosures = [
        { id: "closure-1", businessId: "business-123", isActive: true },
      ];

      mockBusinessClosureService.getActiveClosures.mockResolvedValue(
        mockActiveClosures
      );

      // Act
      await businessClosureController.getBusinessClosures(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockBusinessClosureService.getActiveClosures).toHaveBeenCalledWith(
        "user-123",
        businessId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockActiveClosures,
        meta: {
          total: mockActiveClosures.length,
          businessId: "business-123",
          filter: "true",
        },
      });
    });
  });

  describe("getClosureStats", () => {
    it("should get closure statistics successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockStats = {
        totalClosures: 5,
        activeClosures: 1,
        totalDaysClosed: 10,
      };

      mockBusinessClosureService.getClosureStats.mockResolvedValue(mockStats);

      // Act
      await businessClosureController.getClosureStats(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockBusinessClosureService.getClosureStats).toHaveBeenCalledWith(
        "user-123",
        businessId,
        undefined
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        meta: {
          businessId: "business-123",
          year: "all-time",
        },
      });
    });
  });

  describe("getAffectedAppointments", () => {
    it("should get affected appointments successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };
      mockRequest.query = {
        startDate: "2024-01-15",
        endDate: "2024-01-16",
      };

      const mockAffectedAppointments = [
        {
          id: "appointment-1",
          customerName: "John Doe",
          appointmentDate: "2024-01-15",
        },
        {
          id: "appointment-2",
          customerName: "Jane Smith",
          appointmentDate: "2024-01-15",
        },
      ];

      mockBusinessClosureService.getAffectedAppointments.mockResolvedValue(
        mockAffectedAppointments
      );

      // Act
      await businessClosureController.getAffectedAppointments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockBusinessClosureService.getAffectedAppointments
      ).toHaveBeenCalledWith(
        "user-123",
        businessId,
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAffectedAppointments,
        meta: {
          total: mockAffectedAppointments.length,
          businessId: businessId,
          startDate: "2024-01-15",
          endDate: "2024-01-16",
        },
      });
    });
  });
});
