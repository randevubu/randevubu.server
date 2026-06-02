import { Response } from "express";
import { StaffController } from "../../../src/controllers/staffController";
import { BusinessContextRequest } from "../../../src/middleware/businessContext";
import { AuthenticatedRequest } from "../../../src/types/request";
import { ForbiddenError } from "../../../src/types/errors";
import { TestHelpers } from "../../utils/testHelpers";

describe("StaffController", () => {
  let staffController: StaffController;
  let mockStaffService: any;
  let mockResponseHelper: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStaffService = {
      inviteStaff: jest.fn(),
      verifyStaffInvitation: jest.fn(),
      getBusinessStaff: jest.fn(),
      getStaffById: jest.fn(),
      getStaffByIdAuthorized: jest.fn(),
      getUserStaffPositions: jest.fn(),
      updateStaff: jest.fn(),
      removeStaff: jest.fn(),
      getStaffStats: jest.fn(),
      transferStaffBetweenBusinesses: jest.fn(),
      getPublicBusinessStaff: jest.fn(),
    };

    mockResponseHelper = {
      success: jest.fn().mockImplementation(async (res: Response, _key: string, data: any, statusCode = 200) => {
        res.status(statusCode).json({ success: true, data });
      }),
    };

    staffController = new StaffController(mockStaffService, mockResponseHelper);

    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
    };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
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
      const inviteData = {
        businessId: "business-123",
        phoneNumber: "+905559876543",
        role: "STAFF",
        permissions: [],
        firstName: "John",
        lastName: "Doe",
      };

      mockRequest.body = inviteData;

      const mockResult = { success: true, message: "Staff invitation sent successfully" };
      mockStaffService.inviteStaff.mockResolvedValue(mockResult);

      await staffController.inviteStaff(mockRequest, mockResponse);

      expect(mockStaffService.inviteStaff).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          businessId: "business-123",
          phoneNumber: "+905559876543",
          role: "STAFF",
          firstName: "John",
          lastName: "Doe",
        }),
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("should return 400 when phone number is already registered as active staff", async () => {
      mockRequest.body = {
        businessId: "business-123",
        phoneNumber: "+905559876543",
        role: "STAFF",
        permissions: [],
        firstName: "John",
        lastName: "Doe",
      };

      mockStaffService.inviteStaff.mockResolvedValue({
        success: false,
        message: "This person is already a staff member of this business",
      });

      await staffController.inviteStaff(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should return 400 when required fields are missing", async () => {
      mockRequest.body = { businessId: "business-123" };

      await staffController.inviteStaff(mockRequest, mockResponse);

      expect(mockStaffService.inviteStaff).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("verifyStaffInvitation", () => {
    const verificationData = {
      businessId: "business-123",
      phoneNumber: "+905559876543",
      verificationCode: "123456",
      role: "STAFF",
      permissions: [],
      firstName: "John",
      lastName: "Doe",
    };

    it("should verify staff invitation successfully", async () => {
      mockRequest.body = verificationData;

      const mockResult = {
        success: true,
        message: "Staff invitation verified successfully",
        staffMember: { id: "staff-123", role: "STAFF" },
      };
      mockStaffService.verifyStaffInvitation.mockResolvedValue(mockResult);

      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      expect(mockStaffService.verifyStaffInvitation).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          businessId: "business-123",
          phoneNumber: "+905559876543",
          verificationCode: "123456",
          role: "STAFF",
          firstName: "John",
          lastName: "Doe",
        }),
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("should return 400 for invalid or expired verification code", async () => {
      mockRequest.body = verificationData;

      mockStaffService.verifyStaffInvitation.mockResolvedValue({
        success: false,
        message: "Invalid verification code",
      });

      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should return 400 when staff member already exists in the business", async () => {
      mockRequest.body = verificationData;

      mockStaffService.verifyStaffInvitation.mockResolvedValue({
        success: false,
        message: "This person is already a staff member of this business",
      });

      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should return 400 when required fields are missing", async () => {
      mockRequest.body = { businessId: "business-123", phoneNumber: "+905559876543" };

      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      expect(mockStaffService.verifyStaffInvitation).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should return 400 for invalid verification code format", async () => {
      mockRequest.body = { ...verificationData, verificationCode: "abc" };

      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      expect(mockStaffService.verifyStaffInvitation).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getBusinessStaff", () => {
    it("should get business staff successfully", async () => {
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockStaff = [
        { id: "staff-1", name: "Staff Member 1", role: "STAFF" },
        { id: "staff-2", name: "Staff Member 2", role: "MANAGER" },
      ];
      mockStaffService.getBusinessStaff.mockResolvedValue(mockStaff);

      await staffController.getBusinessStaff(mockBusinessContextRequest, mockResponse);

      expect(mockStaffService.getBusinessStaff).toHaveBeenCalledWith(
        "user-123",
        businessId,
        false
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { staff: mockStaff } })
      );
    });
  });

  describe("getStaffMember", () => {
    const staffId = "staff-123";
    const mockStaffMember = {
      id: staffId,
      name: "Staff Member",
      role: "STAFF",
      businessId: "business-123",
    };

    beforeEach(() => {
      mockRequest.params = { staffId };
    });

    it("same-business owner: should return staff member (200)", async () => {
      mockStaffService.getStaffByIdAuthorized.mockResolvedValue(mockStaffMember);

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockStaffService.getStaffByIdAuthorized).toHaveBeenCalledWith("user-123", staffId);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { staff: mockStaffMember } })
      );
    });

    it("same-business staff member: should return staff member (200)", async () => {
      mockStaffService.getStaffByIdAuthorized.mockResolvedValue(mockStaffMember);

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockStaffService.getStaffByIdAuthorized).toHaveBeenCalledWith("user-123", staffId);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("global admin permission: should return staff member (200)", async () => {
      mockStaffService.getStaffByIdAuthorized.mockResolvedValue(mockStaffMember);

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockStaffService.getStaffByIdAuthorized).toHaveBeenCalledWith("user-123", staffId);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("different-business owner: should be denied (403)", async () => {
      mockStaffService.getStaffByIdAuthorized.mockRejectedValue(
        new ForbiddenError("You do not have access to this business")
      );

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockStaffService.getStaffByIdAuthorized).toHaveBeenCalledWith("user-123", staffId);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("different-business staff: should be denied (403)", async () => {
      mockStaffService.getStaffByIdAuthorized.mockRejectedValue(
        new ForbiddenError("You do not have access to this business")
      );

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("unauthenticated request: should not return staff data", async () => {
      mockRequest.user = undefined;
      mockStaffService.getStaffByIdAuthorized.mockResolvedValue(mockStaffMember);

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("staff not found: should return 404", async () => {
      mockStaffService.getStaffByIdAuthorized.mockResolvedValue(null);

      await staffController.getStaffMember(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("updateStaffMember", () => {
    it("should update staff member successfully", async () => {
      const staffId = "staff-123";
      const updateData = { role: "MANAGER", permissions: ["MANAGE_APPOINTMENTS"] };

      mockRequest.params = { staffId };
      mockRequest.body = updateData;

      const mockUpdatedStaff = { id: staffId, ...updateData };
      mockStaffService.updateStaff.mockResolvedValue(mockUpdatedStaff);

      await staffController.updateStaffMember(mockRequest, mockResponse);

      expect(mockStaffService.updateStaff).toHaveBeenCalledWith("user-123", staffId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { staff: mockUpdatedStaff } })
      );
    });
  });

  describe("removeStaffMember", () => {
    it("should remove staff member successfully", async () => {
      const staffId = "staff-123";
      mockRequest.params = { staffId };
      mockStaffService.removeStaff.mockResolvedValue(undefined);

      await staffController.removeStaffMember(mockRequest, mockResponse);

      expect(mockStaffService.removeStaff).toHaveBeenCalledWith("user-123", staffId);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("getStaffStats", () => {
    it("should get staff statistics successfully", async () => {
      const businessId = "business-123";
      mockBusinessContextRequest.params = { businessId };

      const mockStats = {
        totalStaff: 5,
        activeStaff: 4,
        byRole: { STAFF: 3, MANAGER: 1, OWNER: 1, RECEPTIONIST: 0 },
      };
      mockStaffService.getStaffStats.mockResolvedValue(mockStats);

      await staffController.getStaffStats(mockBusinessContextRequest, mockResponse);

      expect(mockStaffService.getStaffStats).toHaveBeenCalledWith("user-123", businessId);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { stats: mockStats } })
      );
    });
  });

  describe("getStaffByRole", () => {
    it("should get staff by role successfully", async () => {
      const businessId = "business-123";
      const role = "STAFF";
      mockBusinessContextRequest.params = { businessId, role };

      const mockStaff = [
        { id: "staff-1", name: "Staff Member 1", role: "STAFF" },
        { id: "staff-2", name: "Staff Member 2", role: "STAFF" },
      ];
      mockStaffService.getBusinessStaff.mockResolvedValue(mockStaff);

      await staffController.getStaffByRole(mockBusinessContextRequest, mockResponse);

      expect(mockStaffService.getBusinessStaff).toHaveBeenCalledWith("user-123", businessId, false);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { staff: mockStaff } })
      );
    });
  });

  describe("getMyStaffPositions", () => {
    it("should get my staff positions successfully", async () => {
      const mockPositions = [
        { businessId: "business-1", role: "STAFF", businessName: "Business 1" },
        { businessId: "business-2", role: "MANAGER", businessName: "Business 2" },
      ];

      mockStaffService.getUserStaffPositions.mockResolvedValue(mockPositions);

      await staffController.getMyStaffPositions(mockRequest, mockResponse);

      expect(mockStaffService.getUserStaffPositions).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { positions: mockPositions } })
      );
    });
  });

  describe("transferStaff", () => {
    it("should transfer staff successfully", async () => {
      const transferData = {
        staffIds: ["staff-1", "staff-2"],
        fromBusinessId: "business-1",
        toBusinessId: "business-2",
      };
      mockRequest.body = transferData;
      mockStaffService.transferStaffBetweenBusinesses.mockResolvedValue(undefined);

      await staffController.transferStaff(mockRequest, mockResponse);

      expect(mockStaffService.transferStaffBetweenBusinesses).toHaveBeenCalledWith(
        "user-123",
        transferData.staffIds,
        transferData.fromBusinessId,
        transferData.toBusinessId
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("bulkInviteStaff", () => {
    it("should bulk invite staff successfully", async () => {
      const bulkInviteData = {
        businessId: "business-123",
        invitations: [
          { phoneNumber: "+905551234567", role: "STAFF", firstName: "Alice", lastName: "Smith" },
          { phoneNumber: "+905559876543", role: "MANAGER", firstName: "Bob", lastName: "Jones" },
        ],
      };
      mockRequest.body = bulkInviteData;

      mockStaffService.inviteStaff.mockResolvedValue({ success: true, message: "Invitation sent" });

      await staffController.bulkInviteStaff(mockRequest, mockResponse);

      expect(mockStaffService.inviteStaff).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { results: expect.any(Array) } })
      );
    });
  });

  describe("getAvailableRoles", () => {
    it("should get available roles successfully", async () => {
      await staffController.getAvailableRoles(mockRequest, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            roles: expect.arrayContaining([
              expect.objectContaining({ value: "OWNER" }),
              expect.objectContaining({ value: "MANAGER" }),
              expect.objectContaining({ value: "STAFF" }),
              expect.objectContaining({ value: "RECEPTIONIST" }),
            ]),
          },
        })
      );
    });
  });

  describe("getPublicBusinessStaff", () => {
    it("should get public business staff successfully", async () => {
      const businessId = "business-123";
      mockRequest.params = { businessId };

      const mockPublicStaff = [
        { id: "staff-1", name: "Staff Member 1", role: "STAFF" },
        { id: "staff-2", name: "Staff Member 2", role: "MANAGER" },
      ];
      mockStaffService.getPublicBusinessStaff.mockResolvedValue(mockPublicStaff);

      await staffController.getPublicBusinessStaff(mockRequest, mockResponse);

      expect(mockStaffService.getPublicBusinessStaff).toHaveBeenCalledWith(businessId);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { staff: mockPublicStaff } })
      );
    });
  });
});
