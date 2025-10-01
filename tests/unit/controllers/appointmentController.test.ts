import { Response } from "express";
import { AppointmentController } from "../../../src/controllers/appointmentController";
import { BusinessContextRequest } from "../../../src/middleware/businessContext";
import { AuthenticatedRequest } from "../../../src/types/auth";
import { AppointmentStatus } from "../../../src/types/business";
import { sendSuccessResponse } from "../../../src/utils/responseUtils";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/appointmentService");
jest.mock("../../../src/utils/logger");

// Mock errorResponse functions
jest.mock("../../../src/utils/errorResponse", () => ({
  ...jest.requireActual("../../../src/utils/errorResponse"),
  sendSuccessResponse: jest.fn(),
  handleRouteError: jest.fn(),
}));

describe("AppointmentController", () => {
  let appointmentController: AppointmentController;
  let mockAppointmentService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock AppointmentService
    mockAppointmentService = {
      getMyAppointments: jest.fn(),
      createAppointment: jest.fn(),
      getAppointmentById: jest.fn(),
      getCustomerAppointments: jest.fn(),
      getBusinessAppointments: jest.fn(),
      searchAppointments: jest.fn(),
      updateAppointment: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      cancelAppointment: jest.fn(),
      confirmAppointment: jest.fn(),
      completeAppointment: jest.fn(),
      markNoShow: jest.fn(),
      getUpcomingAppointments: jest.fn(),
      getTodaysAppointments: jest.fn(),
      getAppointmentStats: jest.fn(),
      getAllAppointments: jest.fn(),
      batchUpdateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
      getAppointmentsByDateRange: jest.fn(),
      getAppointmentsByStatus: jest.fn(),
      getAppointmentsByService: jest.fn(),
      getAppointmentsByStaff: jest.fn(),
      getNearestAppointmentInCurrentHour: jest.fn(),
      getAppointmentsInCurrentHour: jest.fn(),
      getPublicAppointments: jest.fn(),
    };

    // Create AppointmentController instance
    appointmentController = new AppointmentController(mockAppointmentService);

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
    it("should create AppointmentController instance", () => {
      expect(appointmentController).toBeInstanceOf(AppointmentController);
    });
  });

  describe("getMyAppointments", () => {
    it("should get user appointments successfully", async () => {
      // Arrange
      const mockAppointments = {
        appointments: [
          {
            id: "appointment-1",
            date: "2024-01-15",
            status: AppointmentStatus.CONFIRMED,
            startTime: "10:00",
            endTime: "11:00",
            duration: 60,
            price: 100,
            currency: "TRY",
            customerNotes: null,
            service: {
              id: "service-1",
              name: "Test Service",
              duration: 60,
            },
            staff: null,
            customer: {
              firstName: "John",
              lastName: "Doe",
              phoneNumber: "+905551234567",
            },
          },
          {
            id: "appointment-2",
            date: "2024-01-16",
            status: AppointmentStatus.CONFIRMED,
            startTime: "11:00",
            endTime: "12:00",
            duration: 60,
            price: 100,
            currency: "TRY",
            customerNotes: null,
            service: {
              id: "service-2",
              name: "Test Service 2",
              duration: 60,
            },
            staff: null,
            customer: {
              firstName: "Jane",
              lastName: "Doe",
              phoneNumber: "+905551234568",
            },
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockAppointmentService.getMyAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      try {
        await appointmentController.getMyAppointments(
          mockBusinessContextRequest,
          mockResponse
        );
      } catch (error) {
        console.error("Controller error:", error);
        throw error;
      }

      // Assert
      expect(mockAppointmentService.getMyAppointments).toHaveBeenCalledWith(
        "user-123",
        {
          status: undefined,
          date: undefined,
          businessId: undefined,
          staffId: undefined,
          page: undefined,
          limit: undefined,
        }
      );
      expect(sendSuccessResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          appointments: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          totalPages: expect.any(Number),
        }),
        "Appointments retrieved successfully"
      );
    });

    it("should handle query parameters correctly", async () => {
      // Arrange
      mockBusinessContextRequest.query = {
        status: AppointmentStatus.CONFIRMED,
        date: "2024-01-15",
        businessId: "business-123",
        page: "1",
        limit: "10",
      };

      const mockAppointments = {
        appointments: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
      mockAppointmentService.getMyAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getMyAppointments(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.getMyAppointments).toHaveBeenCalledWith(
        "user-123",
        {
          status: AppointmentStatus.CONFIRMED,
          date: "2024-01-15",
          businessId: "business-123",
          staffId: undefined,
          page: 1,
          limit: 10,
        }
      );
    });
  });

  describe("createAppointment", () => {
    it("should create appointment successfully", async () => {
      // Arrange
      const appointmentData = {
        serviceId: "service-123",
        businessId: "business-123",
        staffId: "staff-123",
        customerId: "customer-123",
        date: "2024-01-15",
        startTime: "10:00",
        customerNotes: "Test appointment",
      };

      mockRequest.body = appointmentData;

      const mockAppointment = {
        id: "appointment-123",
        ...appointmentData,
        status: AppointmentStatus.CONFIRMED,
      };

      mockAppointmentService.createAppointment.mockResolvedValue(
        mockAppointment
      );

      // Act
      await appointmentController.createAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.createAppointment).toHaveBeenCalledWith(
        "user-123",
        appointmentData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointment,
        message: "Appointment created successfully",
      });
    });
  });

  describe("getAppointmentById", () => {
    it("should get appointment by id successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      mockRequest.params = { id: appointmentId };

      const mockAppointment = {
        id: appointmentId,
        customerId: "customer-123",
        serviceId: "service-123",
        status: AppointmentStatus.CONFIRMED,
      };

      mockAppointmentService.getAppointmentById.mockResolvedValue(
        mockAppointment
      );

      // Act
      await appointmentController.getAppointmentById(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentById).toHaveBeenCalledWith(
        "user-123",
        appointmentId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointment,
      });
    });
  });

  describe("getCustomerAppointments", () => {
    it("should get customer appointments successfully", async () => {
      // Arrange
      const customerId = "customer-123";
      mockRequest.params = { customerId };

      const mockAppointments = {
        appointments: [
          { id: "appointment-1", customerId: "customer-123" },
          { id: "appointment-2", customerId: "customer-123" },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockAppointmentService.getCustomerAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getCustomerAppointments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.getCustomerAppointments
      ).toHaveBeenCalledWith("user-123", customerId, 1, 20);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments.appointments,
        meta: {
          total: 2,
          page: 1,
          totalPages: 1,
          limit: 20,
        },
      });
    });
  });

  describe("getBusinessAppointments", () => {
    it("should get business appointments successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockAppointments = {
        appointments: [
          { id: "appointment-1", businessId: "business-123" },
          { id: "appointment-2", businessId: "business-123" },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockAppointmentService.getBusinessAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getBusinessAppointments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.getBusinessAppointments
      ).toHaveBeenCalledWith("user-123", businessId, 1, 20, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments.appointments,
        meta: {
          total: 2,
          page: 1,
          totalPages: 1,
          limit: 20,
          businessId: businessId,
        },
      });
    });
  });

  describe("searchAppointments", () => {
    it("should search appointments successfully", async () => {
      // Arrange
      const searchFilters = {
        businessId: "business-123",
        status: AppointmentStatus.CONFIRMED,
      };

      mockRequest.query = searchFilters;

      const mockResults = {
        appointments: [{ id: "appointment-1", businessId: "business-123" }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockAppointmentService.searchAppointments.mockResolvedValue(mockResults);

      // Act
      await appointmentController.searchAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.searchAppointments).toHaveBeenCalledWith(
        "user-123",
        searchFilters,
        1,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResults.appointments,
        meta: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          totalPages: expect.any(Number),
          limit: expect.any(Number),
          filters: expect.any(Object),
        }),
      });
    });
  });

  describe("updateAppointment", () => {
    it("should update appointment successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      const updateData = {
        date: "2024-01-16",
        startTime: "11:00",
        customerNotes: "Updated appointment",
      };

      mockRequest.params = { id: appointmentId };
      mockRequest.body = updateData;

      const mockUpdatedAppointment = {
        id: appointmentId,
        ...updateData,
        status: AppointmentStatus.CONFIRMED,
      };

      mockAppointmentService.updateAppointment.mockResolvedValue(
        mockUpdatedAppointment
      );

      // Act
      await appointmentController.updateAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalledWith(
        "user-123",
        appointmentId,
        updateData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedAppointment,
        message: "Appointment updated successfully",
      });
    });
  });

  describe("updateAppointmentStatus", () => {
    it("should update appointment status successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      const status = AppointmentStatus.CONFIRMED;

      mockRequest.params = { id: appointmentId };
      mockRequest.body = { status };

      const mockUpdatedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
      };

      mockAppointmentService.updateAppointment.mockResolvedValue(
        mockUpdatedAppointment
      );

      // Act
      await appointmentController.updateAppointmentStatus(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalledWith(
        "user-123",
        appointmentId,
        { status }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedAppointment,
        message: `Appointment status updated to ${status}`,
      });
    });
  });

  describe("cancelAppointment", () => {
    it("should cancel appointment successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      const reason = "Customer requested cancellation";

      mockRequest.params = { id: appointmentId };
      mockRequest.body = { reason };

      const mockCancelledAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CANCELED,
        cancellationReason: reason,
      };

      mockAppointmentService.cancelAppointment.mockResolvedValue(
        mockCancelledAppointment
      );

      // Act
      await appointmentController.cancelAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith(
        "user-123",
        appointmentId,
        reason
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledAppointment,
        message: "Appointment cancelled successfully",
      });
    });
  });

  describe("confirmAppointment", () => {
    it("should confirm appointment successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      mockRequest.params = { id: appointmentId };

      const mockConfirmedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED,
      };

      mockAppointmentService.confirmAppointment.mockResolvedValue(
        mockConfirmedAppointment
      );

      // Act
      await appointmentController.confirmAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.confirmAppointment).toHaveBeenCalledWith(
        "user-123",
        appointmentId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockConfirmedAppointment,
        message: "Appointment confirmed successfully",
      });
    });
  });

  describe("completeAppointment", () => {
    it("should complete appointment successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      mockRequest.params = { id: appointmentId };

      const mockCompletedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED,
      };

      mockAppointmentService.completeAppointment.mockResolvedValue(
        mockCompletedAppointment
      );

      // Act
      await appointmentController.completeAppointment(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.completeAppointment).toHaveBeenCalledWith(
        "user-123",
        appointmentId,
        undefined
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompletedAppointment,
        message: "Appointment completed successfully",
      });
    });
  });

  describe("markNoShow", () => {
    it("should mark appointment as no-show successfully", async () => {
      // Arrange
      const appointmentId = "appointment-123";
      mockRequest.params = { id: appointmentId };

      const mockNoShowAppointment = {
        id: appointmentId,
        status: AppointmentStatus.NO_SHOW,
      };

      mockAppointmentService.markNoShow.mockResolvedValue(
        mockNoShowAppointment
      );

      // Act
      await appointmentController.markNoShow(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.markNoShow).toHaveBeenCalledWith(
        "user-123",
        appointmentId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNoShowAppointment,
        message: "Appointment marked as no-show",
      });
    });
  });

  describe("getUpcomingAppointments", () => {
    it("should get upcoming appointments successfully", async () => {
      // Arrange
      const mockAppointments = [
        { id: "appointment-1", date: "2024-01-16" },
        { id: "appointment-2", date: "2024-01-17" },
      ];

      mockAppointmentService.getUpcomingAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getUpcomingAppointments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.getUpcomingAppointments
      ).toHaveBeenCalledWith("user-123", 10);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments,
        meta: expect.objectContaining({
          total: expect.any(Number),
          limit: expect.any(Number),
        }),
      });
    });
  });

  describe("getTodaysAppointments", () => {
    it("should get today appointments successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockAppointments = [
        {
          id: "appointment-1",
          date: "2024-01-15",
          startTime: "10:00",
          endTime: "11:00",
          duration: 60,
          status: "CONFIRMED",
          price: 100,
          currency: "TRY",
          service: { id: "service-1", name: "Test Service", duration: 60 },
          staff: { firstName: "John", lastName: "Doe" },
          customer: {
            firstName: "Jane",
            lastName: "Doe",
            phoneNumber: "+905551234567",
          },
        },
        {
          id: "appointment-2",
          date: "2024-01-15",
          startTime: "11:00",
          endTime: "12:00",
          duration: 60,
          status: "CONFIRMED",
          price: 100,
          currency: "TRY",
          service: { id: "service-2", name: "Test Service 2", duration: 60 },
          staff: { firstName: "John", lastName: "Doe" },
          customer: {
            firstName: "Jane",
            lastName: "Doe",
            phoneNumber: "+905551234567",
          },
        },
      ];

      mockAppointmentService.getTodaysAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getTodaysAppointments(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.getTodaysAppointments).toHaveBeenCalledWith(
        "user-123",
        businessId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            date: expect.any(String),
            startTime: expect.any(String),
            endTime: expect.any(String),
            duration: expect.any(Number),
            status: expect.any(String),
            price: expect.any(Number),
            currency: expect.any(String),
          }),
        ]),
        meta: expect.objectContaining({
          total: expect.any(Number),
        }),
      });
    });
  });

  describe("getAppointmentStats", () => {
    it("should get appointment statistics successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockStats = {
        total: 100,
        confirmed: 80,
        cancelled: 15,
        noShow: 5,
      };

      mockAppointmentService.getAppointmentStats.mockResolvedValue(mockStats);

      // Act
      await appointmentController.getAppointmentStats(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.getAppointmentStats).toHaveBeenCalledWith(
        "user-123",
        "business-123",
        undefined,
        undefined
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        meta: expect.objectContaining({
          businessId: "business-123",
          accessibleBusinesses: expect.any(Number),
          startDate: undefined,
          endDate: undefined,
        }),
      });
    });
  });

  describe("getAllAppointments", () => {
    it("should get all appointments for admin successfully", async () => {
      // Arrange
      const mockAppointments = {
        appointments: [{ id: "appointment-1" }, { id: "appointment-2" }],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockAppointmentService.getAllAppointments.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getAllAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAllAppointments).toHaveBeenCalledWith(
        "user-123",
        1,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments.appointments,
        meta: {
          total: 2,
          page: 1,
          totalPages: 1,
          limit: 20,
        },
      });
    });
  });

  describe("batchUpdateAppointmentStatus", () => {
    it("should batch update appointment status successfully", async () => {
      // Arrange
      const appointmentIds = ["appointment-1", "appointment-2"];
      const status = AppointmentStatus.CONFIRMED;

      mockRequest.body = { appointmentIds, status };

      mockAppointmentService.batchUpdateAppointmentStatus.mockResolvedValue(
        undefined
      );

      // Act
      await appointmentController.batchUpdateAppointmentStatus(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.batchUpdateAppointmentStatus
      ).toHaveBeenCalledWith("user-123", appointmentIds, status);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "2 appointments updated to CONFIRMED",
      });
    });
  });

  describe("batchCancelAppointments", () => {
    it("should batch cancel appointments successfully", async () => {
      // Arrange
      const appointmentIds = ["appointment-1", "appointment-2"];
      const reason = "Batch cancellation";

      mockRequest.body = { appointmentIds, reason };

      mockAppointmentService.batchCancelAppointments.mockResolvedValue(
        undefined
      );

      // Act
      await appointmentController.batchCancelAppointments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.batchCancelAppointments
      ).toHaveBeenCalledWith("user-123", appointmentIds, reason);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "2 appointments cancelled",
      });
    });
  });

  describe("getAppointmentsByDateRange", () => {
    it("should get appointments by date range successfully", async () => {
      // Arrange
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";
      const businessId = "business-123";

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockAppointments = [
        {
          id: "appointment-1",
          date: "2024-01-15",
          startTime: "10:00",
          endTime: "11:00",
          duration: 60,
          status: "CONFIRMED",
        },
        {
          id: "appointment-2",
          date: "2024-01-20",
          startTime: "11:00",
          endTime: "12:00",
          duration: 60,
          status: "CONFIRMED",
        },
      ];

      mockAppointmentService.getPublicAppointments.mockResolvedValue({
        appointments: mockAppointments,
        total: mockAppointments.length,
      });

      // Act
      await appointmentController.getAppointmentsByDateRange(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.getPublicAppointments).toHaveBeenCalledWith(
        {
          businessId,
          startDate,
          endDate,
        },
        1,
        1000
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            date: expect.any(String),
            startTime: expect.any(String),
            endTime: expect.any(String),
            duration: expect.any(Number),
            status: expect.any(String),
          }),
        ]),
        meta: expect.objectContaining({
          total: expect.any(Number),
          businessId,
          startDate,
          endDate,
        }),
      });
    });
  });

  describe("getAppointmentsByStatus", () => {
    it("should get appointments by status successfully", async () => {
      // Arrange
      const status = AppointmentStatus.CONFIRMED;
      const businessId = "business-123";

      mockRequest.query = { status, businessId };

      const mockAppointments = [
        { id: "appointment-1", status: AppointmentStatus.CONFIRMED },
        { id: "appointment-2", status: AppointmentStatus.CONFIRMED },
      ];

      mockRequest.params = { businessId, status };
      mockAppointmentService.searchAppointments.mockResolvedValue({
        appointments: mockAppointments,
        total: mockAppointments.length,
        page: 1,
        totalPages: 1,
      });

      // Act
      await appointmentController.getAppointmentsByStatus(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.searchAppointments).toHaveBeenCalledWith(
        "user-123",
        {
          businessId,
          status: status as AppointmentStatus,
        },
        1,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments,
        meta: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          totalPages: expect.any(Number),
          limit: expect.any(Number),
          businessId,
          status,
        }),
      });
    });
  });

  describe("getAppointmentsByService", () => {
    it("should get appointments by service successfully", async () => {
      // Arrange
      const serviceId = "service-123";
      const businessId = "business-123";

      mockRequest.query = { serviceId, businessId };

      const mockAppointments = [
        { id: "appointment-1", serviceId: "service-123" },
        { id: "appointment-2", serviceId: "service-123" },
      ];

      mockRequest.params = { serviceId };
      mockAppointmentService.searchAppointments.mockResolvedValue({
        appointments: mockAppointments,
        total: mockAppointments.length,
        page: 1,
        totalPages: 1,
      });

      // Act
      await appointmentController.getAppointmentsByService(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.searchAppointments).toHaveBeenCalledWith(
        "user-123",
        { serviceId },
        1,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments,
        meta: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          totalPages: expect.any(Number),
          limit: expect.any(Number),
          serviceId,
        }),
      });
    });
  });

  describe("getAppointmentsByStaff", () => {
    it("should get appointments by staff successfully", async () => {
      // Arrange
      const staffId = "staff-123";
      const businessId = "business-123";

      mockRequest.query = { staffId, businessId };

      const mockAppointments = [
        { id: "appointment-1", staffId: "staff-123" },
        { id: "appointment-2", staffId: "staff-123" },
      ];

      mockRequest.params = { staffId };
      mockAppointmentService.searchAppointments.mockResolvedValue({
        appointments: mockAppointments,
        total: mockAppointments.length,
        page: 1,
        totalPages: 1,
      });

      // Act
      await appointmentController.getAppointmentsByStaff(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockAppointmentService.searchAppointments).toHaveBeenCalledWith(
        "user-123",
        { staffId },
        1,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments,
        meta: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          totalPages: expect.any(Number),
          limit: expect.any(Number),
          staffId,
        }),
      });
    });
  });

  describe("getNearestCurrentHour", () => {
    it("should get nearest appointment in current hour successfully", async () => {
      // Arrange
      const mockAppointment = {
        id: "appointment-123",
        businessId: "business-123",
        date: "2024-01-15",
        startTime: new Date("2024-01-15T10:30:00"),
        endTime: new Date("2024-01-15T11:30:00"),
        status: "CONFIRMED",
        service: { id: "service-1", name: "Test Service", duration: 60 },
        business: {
          id: "business-123",
          name: "Test Business",
          timezone: "Europe/Istanbul",
        },
      };

      mockAppointmentService.getNearestAppointmentInCurrentHour.mockResolvedValue(
        mockAppointment
      );

      // Act
      await appointmentController.getNearestCurrentHour(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.getNearestAppointmentInCurrentHour
      ).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: "appointment-123",
          businessId: "business-123",
          date: "2024-01-15",
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          status: "CONFIRMED",
          service: {
            id: "service-1",
            name: "Test Service",
            duration: 60,
          },
          business: {
            id: "business-123",
            name: "Test Business",
            timezone: "Europe/Istanbul",
          },
          timeUntilAppointment: expect.any(Number),
        },
      });
    });
  });

  describe("getCurrentHourAppointments", () => {
    it("should get appointments in current hour successfully", async () => {
      // Arrange
      const mockAppointments = [
        {
          id: "appointment-1",
          businessId: "business-123",
          date: "2024-01-15",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: new Date("2024-01-15T11:00:00"),
          status: "CONFIRMED",
          service: { id: "service-1", name: "Test Service", duration: 60 },
          business: {
            id: "business-123",
            name: "Test Business",
            timezone: "Europe/Istanbul",
          },
        },
        {
          id: "appointment-2",
          businessId: "business-123",
          date: "2024-01-15",
          startTime: new Date("2024-01-15T10:30:00"),
          endTime: new Date("2024-01-15T11:30:00"),
          status: "CONFIRMED",
          service: { id: "service-2", name: "Test Service 2", duration: 60 },
          business: {
            id: "business-123",
            name: "Test Business",
            timezone: "Europe/Istanbul",
          },
        },
      ];

      mockAppointmentService.getAppointmentsInCurrentHour.mockResolvedValue(
        mockAppointments
      );

      // Act
      await appointmentController.getCurrentHourAppointments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        mockAppointmentService.getAppointmentsInCurrentHour
      ).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: "appointment-1",
            businessId: "business-123",
            date: "2024-01-15",
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            status: "CONFIRMED",
            service: {
              id: "service-1",
              name: "Test Service",
              duration: 60,
            },
            business: {
              id: "business-123",
              name: "Test Business",
              timezone: "Europe/Istanbul",
            },
            timeUntilAppointment: expect.any(Number),
          },
          {
            id: "appointment-2",
            businessId: "business-123",
            date: "2024-01-15",
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            status: "CONFIRMED",
            service: {
              id: "service-2",
              name: "Test Service 2",
              duration: 60,
            },
            business: {
              id: "business-123",
              name: "Test Business",
              timezone: "Europe/Istanbul",
            },
            timeUntilAppointment: expect.any(Number),
          },
        ],
        meta: {
          count: 2,
          currentHour: expect.any(Number),
        },
      });
    });
  });
});
