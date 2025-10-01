import { Response } from "express";
import { UsageController } from "../../../src/controllers/usageController";
import { BusinessContextRequest } from "../../../src/middleware/businessContext";
import { AuthenticatedRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/usageService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

// Mock error response utilities
import {
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse,
} from "../../../src/utils/responseUtils";

jest.mocked(sendSuccessResponse).mockImplementation((res, data) => {
  res.json({ success: true, ...(data as any) });
});

jest.mocked(sendAppErrorResponse).mockImplementation((res, error) => {
  res.status(error.statusCode).json({ success: false, message: error.message });
});

jest.mocked(createErrorContext).mockImplementation((req, businessId) => ({
  userId: (req as any).user?.id || "unknown",
  businessId: businessId || "unknown",
  requestId: "test-request-id",
  timestamp: new Date().toISOString(),
}));

jest.mocked(handleRouteError).mockImplementation((error, req, res) => {
  res.status(500).json({ success: false, message: "Internal server error" });
});

describe("UsageController", () => {
  let usageController: UsageController;
  let mockUsageService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock UsageService
    mockUsageService = {
      getBusinessUsageSummary: jest.fn(),
      getDailyUsageChart: jest.fn(),
      getMonthlyUsageHistory: jest.fn(),
      getUsageAlerts: jest.fn(),
      canSendSms: jest.fn(),
      canAddStaffMember: jest.fn(),
      canAddService: jest.fn(),
      canAddCustomer: jest.fn(),
      updateStaffUsage: jest.fn(),
      updateServiceUsage: jest.fn(),
    };

    // Create UsageController instance
    usageController = new UsageController(mockUsageService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [],
      effectiveLevel: 0,
    };

    mockBusinessContextRequest =
      TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [],
      effectiveLevel: 0,
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
    it("should create UsageController instance", () => {
      expect(usageController).toBeInstanceOf(UsageController);
    });
  });

  describe("getUsageSummary", () => {
    it("should get usage summary successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockUsageSummary = {
        currentMonth: {
          smssSent: 50,
          appointmentsCreated: 25,
          customersAdded: 10,
        },
        previousMonth: {
          smssSent: 40,
          appointmentsCreated: 20,
          customersAdded: 8,
        },
        planLimits: {
          smsQuota: 100,
          maxStaffPerBusiness: 5,
          maxCustomers: 0,
          storageGB: 0,
        },
        remainingQuotas: {
          smsRemaining: 50,
          staffRemaining: 3,
          customerRemaining: 0,
        },
      };

      mockUsageService.getBusinessUsageSummary.mockResolvedValue(
        mockUsageSummary
      );

      // Act
      await usageController.getUsageSummary(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockUsageService.getBusinessUsageSummary).toHaveBeenCalledWith(
        "user-123",
        businessId
      );
      expect(sendSuccessResponse).toHaveBeenCalledWith(mockResponse, {
        data: mockUsageSummary,
        message: "Usage summary retrieved successfully",
      });
    });
  });

  describe("getDailySmsUsage", () => {
    it("should get daily SMS usage successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const days = 30;
      mockBusinessContextRequest.params = { businessId };
      mockBusinessContextRequest.query = { days: days.toString() };

      const mockDailyUsage = [
        { date: "2024-01-01", smsCount: 10 },
        { date: "2024-01-02", smsCount: 15 },
      ];

      mockUsageService.getDailyUsageChart.mockResolvedValue(mockDailyUsage);

      // Act
      await usageController.getDailySmsUsage(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockUsageService.getDailyUsageChart).toHaveBeenCalledWith(
        "user-123",
        businessId,
        days
      );
      expect(sendSuccessResponse).toHaveBeenCalledWith(mockResponse, {
        data: mockDailyUsage,
        message: `Daily SMS usage for last ${days} days retrieved successfully`,
      });
    });
  });

  describe("getMonthlyUsageHistory", () => {
    it("should get monthly usage history successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const months = 12;
      mockBusinessContextRequest.params = { businessId };
      mockBusinessContextRequest.query = { months: months.toString() };

      const mockMonthlyHistory = [
        { month: 1, year: 2024, smssSent: 100, appointmentsCreated: 50 },
        { month: 2, year: 2024, smssSent: 120, appointmentsCreated: 60 },
      ];

      mockUsageService.getMonthlyUsageHistory.mockResolvedValue(
        mockMonthlyHistory
      );

      // Act
      await usageController.getMonthlyUsageHistory(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockUsageService.getMonthlyUsageHistory).toHaveBeenCalledWith(
        "user-123",
        businessId,
        months
      );
      expect(sendSuccessResponse).toHaveBeenCalledWith(mockResponse, {
        data: mockMonthlyHistory,
        message: `Monthly usage history for last ${months} months retrieved successfully`,
      });
    });
  });

  describe("checkLimits", () => {
    it("should check limits successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      mockUsageService.canSendSms.mockResolvedValue({ allowed: true });
      mockUsageService.canAddStaffMember.mockResolvedValue({ allowed: true });
      mockUsageService.canAddService.mockResolvedValue({ allowed: true });
      mockUsageService.canAddCustomer.mockResolvedValue({ allowed: true });

      // Act
      await usageController.checkLimits(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockUsageService.canSendSms).toHaveBeenCalledWith(businessId);
      expect(mockUsageService.canAddStaffMember).toHaveBeenCalledWith(
        businessId
      );
      expect(mockUsageService.canAddService).toHaveBeenCalledWith(businessId);
      expect(mockUsageService.canAddCustomer).toHaveBeenCalledWith(businessId);
      expect(sendSuccessResponse).toHaveBeenCalledWith(mockResponse, {
        data: {
          sms: { allowed: true },
          staff: { allowed: true },
          service: { allowed: true },
          customer: { allowed: true },
        },
        message: "Usage limits check completed successfully",
      });
    });
  });

  describe("getUsageAlerts", () => {
    it("should get usage alerts successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockAlerts = {
        smsQuotaAlert: {
          isNearLimit: false,
          percentage: 50,
          remaining: 50,
          quota: 100,
        },
        staffLimitAlert: {
          isAtLimit: false,
          current: 2,
          limit: 5,
        },
        customerLimitAlert: {
          isNearLimit: false,
          percentage: 0,
          current: 10,
          limit: 0,
        },
        storageLimitAlert: {
          isNearLimit: false,
          percentage: 0,
          usedMB: 0,
          limitMB: 0,
        },
      };

      mockUsageService.getUsageAlerts.mockResolvedValue(mockAlerts);

      // Act
      await usageController.getUsageAlerts(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockUsageService.getUsageAlerts).toHaveBeenCalledWith(
        "user-123",
        businessId
      );
      expect(sendSuccessResponse).toHaveBeenCalledWith(mockResponse, {
        data: mockAlerts,
        message: "Usage alerts retrieved successfully",
      });
    });
  });

  describe("refreshUsageCounters", () => {
    it("should refresh usage counters successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      mockUsageService.updateStaffUsage.mockResolvedValue(undefined);
      mockUsageService.updateServiceUsage.mockResolvedValue(undefined);

      // Act
      await usageController.refreshUsageCounters(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.updateStaffUsage).toHaveBeenCalledWith(
        businessId
      );
      expect(mockUsageService.updateServiceUsage).toHaveBeenCalledWith(
        businessId
      );
      expect(sendSuccessResponse).toHaveBeenCalledWith(mockResponse, {
        data: {
          refreshedCounters: ["staff", "services"],
          updatedAt: expect.any(String),
        },
        message: "Usage data refreshed successfully",
      });
    });
  });
});
