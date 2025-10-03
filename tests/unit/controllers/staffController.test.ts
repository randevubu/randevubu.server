import { Response } from "express";
import { StaffController } from "../../../src/controllers/staffController";
import { BusinessContextRequest } from "../../../src/middleware/businessContext";
import { AuthenticatedRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/staffService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

// Mock the error response utilities
import {
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse,
} from "../../../src/utils/errorResponse";

jest
  .mocked(sendSuccessResponse)
  .mockImplementation((res, data, message, meta, statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      data,
      message,
      meta,
    });
  });

jest.mocked(sendAppErrorResponse).mockImplementation((res, error) => {
  res.status(error.statusCode).json({
    success: false,
    error: error.message,
  });
});

jest.mocked(createErrorContext).mockImplementation((req, userId) => ({
  requestId: "test-request-id",
  userId,
  userAgent: req.get("User-Agent"),
  ip: req.ip || req.connection.remoteAddress,
  endpoint: req.path,
  method: req.method,
}));

jest.mocked(handleRouteError).mockImplementation((error, req, res) => {
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

describe("StaffController", () => {
  let staffController: StaffController;
  let mockStaffService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock StaffService
    mockStaffService = {
      inviteStaff: jest.fn(),
      verifyStaffInvitation: jest.fn(),
      getBusinessStaff: jest.fn(),
      getStaffById: jest.fn(),
      updateStaff: jest.fn(),
      removeStaff: jest.fn(),
      getStaffStats: jest.fn(),
      transferStaffBetweenBusinesses: jest.fn(),
      getPublicBusinessStaff: jest.fn(),
      repositories: {
        staffRepository: {
          findByUserId: jest.fn(),
        },
      },
    };

    // Create StaffController instance
    staffController = new StaffController(mockStaffService);

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
    };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe("constructor", () => {
    it("should create StaffController instance", () => {
      expect(staffController).toBeInstanceOf(StaffController);
    });
  });

  describe("inviteStaff", () => {
    it("should invite staff successfully", async () => {
      // Arrange
      const inviteData = {
        businessId: "business-123",
        phoneNumber: "+905559876543",
        role: "STAFF",
        permissions: [],
        firstName: "John",
        lastName: "Doe",
      };

      mockRequest.body = inviteData;

      const mockResult = {
        success: true,
        message: "Staff invitation sent successfully",
      };

      mockStaffService.inviteStaff.mockResolvedValue(mockResult);

      // Act
      await staffController.inviteStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.inviteStaff).toHaveBeenCalledWith(
        "user-123",
        inviteData,
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe("verifyStaffInvitation", () => {
    it("should verify staff invitation successfully", async () => {
      // Arrange
      const verificationData = {
        businessId: "business-123",
        phoneNumber: "+905559876543",
        verificationCode: "123456",
        role: "STAFF",
        permissions: [],
        firstName: "John",
        lastName: "Doe",
      };

      mockRequest.body = verificationData;

      const mockResult = {
        success: true,
        message: "Staff invitation verified successfully",
        staffMember: { id: "staff-123", role: "STAFF" },
      };

      mockStaffService.verifyStaffInvitation.mockResolvedValue(mockResult);

      // Act
      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.verifyStaffInvitation).toHaveBeenCalledWith(
        "user-123",
        verificationData,
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe("getBusinessStaff", () => {
    it("should get business staff successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockStaff = [
        { id: "staff-1", name: "Staff Member 1", role: "STAFF" },
        { id: "staff-2", name: "Staff Member 2", role: "MANAGER" },
      ];

      mockStaffService.getBusinessStaff.mockResolvedValue(mockStaff);

      // Act
      await staffController.getBusinessStaff(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockStaffService.getBusinessStaff).toHaveBeenCalledWith(
        "user-123",
        businessId,
        false
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { staff: mockStaff },
      });
    });
  });

  describe("getStaffMember", () => {
    it("should get staff member successfully", async () => {
      // Arrange
      const staffId = "staff-123";
      mockRequest.params = { staffId };

      const mockStaffMember = {
        id: staffId,
        name: "Staff Member",
        role: "STAFF",
        businessId: "business-123",
      };

      mockStaffService.getStaffById.mockResolvedValue(mockStaffMember);

      // Act
      await staffController.getStaffMember(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.getStaffById).toHaveBeenCalledWith(staffId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { staff: mockStaffMember },
      });
    });
  });

  describe("updateStaffMember", () => {
    it("should update staff member successfully", async () => {
      // Arrange
      const staffId = "staff-123";
      const updateData = {
        role: "MANAGER",
        permissions: ["MANAGE_APPOINTMENTS"],
      };

      mockRequest.params = { staffId };
      mockRequest.body = updateData;

      const mockUpdatedStaff = {
        id: staffId,
        ...updateData,
      };

      mockStaffService.updateStaff.mockResolvedValue(mockUpdatedStaff);

      // Act
      await staffController.updateStaffMember(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.updateStaff).toHaveBeenCalledWith(
        "user-123",
        staffId,
        updateData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { staff: mockUpdatedStaff },
      });
    });
  });

  describe("removeStaffMember", () => {
    it("should remove staff member successfully", async () => {
      // Arrange
      const staffId = "staff-123";
      mockRequest.params = { staffId };

      mockStaffService.removeStaff.mockResolvedValue(undefined);

      // Act
      await staffController.removeStaffMember(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.removeStaff).toHaveBeenCalledWith(
        "user-123",
        staffId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Staff member removed successfully" },
      });
    });
  });

  describe("getStaffStats", () => {
    it("should get staff statistics successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockStats = {
        totalStaff: 5,
        activeStaff: 4,
        staffByRole: {
          STAFF: 3,
          MANAGER: 1,
          ADMIN: 1,
        },
      };

      mockStaffService.getStaffStats.mockResolvedValue(mockStats);

      // Act
      await staffController.getStaffStats(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockStaffService.getStaffStats).toHaveBeenCalledWith(
        "user-123",
        businessId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { stats: mockStats },
      });
    });
  });

  describe("getStaffByRole", () => {
    it("should get staff by role successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const role = "STAFF";
      mockBusinessContextRequest.params = { businessId, role };

      const mockStaff = [
        { id: "staff-1", name: "Staff Member 1", role: "STAFF" },
        { id: "staff-2", name: "Staff Member 2", role: "STAFF" },
      ];

      mockStaffService.getBusinessStaff.mockResolvedValue(mockStaff);

      // Act
      await staffController.getStaffByRole(
        mockBusinessContextRequest,
        mockResponse
      );

      // Assert
      expect(mockStaffService.getBusinessStaff).toHaveBeenCalledWith(
        "user-123",
        businessId,
        false
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { staff: mockStaff },
      });
    });
  });

  describe("getMyStaffPositions", () => {
    it("should get my staff positions successfully", async () => {
      // Arrange
      const mockPositions = [
        { businessId: "business-1", role: "STAFF", businessName: "Business 1" },
        {
          businessId: "business-2",
          role: "MANAGER",
          businessName: "Business 2",
        },
      ];

      // Mock the repository access through the service
      mockStaffService.repositories = {
        staffRepository: {
          findByUserId: jest.fn().mockResolvedValue(mockPositions),
        },
      };

      // Act
      await staffController.getMyStaffPositions(mockRequest, mockResponse);

      // Assert
      expect(
        mockStaffService.repositories.staffRepository.findByUserId
      ).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { positions: mockPositions },
      });
    });
  });

  describe("transferStaff", () => {
    it("should transfer staff successfully", async () => {
      // Arrange
      const transferData = {
        staffIds: ["staff-1", "staff-2"],
        fromBusinessId: "business-1",
        toBusinessId: "business-2",
      };

      mockRequest.body = transferData;

      mockStaffService.transferStaffBetweenBusinesses.mockResolvedValue(
        undefined
      );

      // Act
      await staffController.transferStaff(mockRequest, mockResponse);

      // Assert
      expect(
        mockStaffService.transferStaffBetweenBusinesses
      ).toHaveBeenCalledWith(
        "user-123",
        transferData.staffIds,
        transferData.fromBusinessId,
        transferData.toBusinessId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Staff transferred successfully" },
      });
    });
  });

  describe("bulkInviteStaff", () => {
    it("should bulk invite staff successfully", async () => {
      // Arrange
      const bulkInviteData = {
        businessId: "business-123",
        invitations: [
          { phoneNumber: "+905551234567", role: "STAFF" },
          { phoneNumber: "+905559876543", role: "MANAGER" },
        ],
      };

      mockRequest.body = bulkInviteData;

      const mockResults = [
        {
          phoneNumber: "+905551234567",
          success: true,
          message: "Invitation sent",
        },
        {
          phoneNumber: "+905559876543",
          success: true,
          message: "Invitation sent",
        },
      ];

      // Mock the inviteStaff method to return success for each invitation
      mockStaffService.inviteStaff.mockResolvedValue({
        success: true,
        message: "Invitation sent",
      });

      // Act
      await staffController.bulkInviteStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.inviteStaff).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { results: expect.any(Array) },
      });
    });
  });

  describe("getAvailableRoles", () => {
    it("should get available roles successfully", async () => {
      // Arrange
      const mockRoles = [
        {
          value: "OWNER",
          label: "Owner",
          description: "Full access to all business features",
        },
        {
          value: "MANAGER",
          label: "Manager",
          description: "Manage staff, services, and appointments",
        },
        {
          value: "STAFF",
          label: "Staff Member",
          description: "Handle appointments and basic operations",
        },
        {
          value: "RECEPTIONIST",
          label: "Receptionist",
          description: "Manage appointments and customer interactions",
        },
      ];

      // Act
      await staffController.getAvailableRoles(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { roles: mockRoles },
      });
    });
  });

  describe("getPublicBusinessStaff", () => {
    it("should get public business staff successfully", async () => {
      // Arrange
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockPublicStaff = [
        {
          id: "staff-1",
          name: "Staff Member 1",
          role: "STAFF",
          showName: true,
        },
        {
          id: "staff-2",
          name: "Staff Member 2",
          role: "MANAGER",
          showName: true,
        },
      ];

      mockStaffService.getPublicBusinessStaff.mockResolvedValue(
        mockPublicStaff
      );

      // Act
      await staffController.getPublicBusinessStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.getPublicBusinessStaff).toHaveBeenCalledWith(
        businessId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { staff: mockPublicStaff },
      });
    });
  });
});
