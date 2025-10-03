import { Response } from "express";
import { UserBehaviorController } from "../../../src/controllers/userBehaviorController";
import { GuaranteedAuthRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/userBehaviorService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

describe("UserBehaviorController", () => {
  let userBehaviorController: UserBehaviorController;
  let mockUserBehaviorService: any;
  let mockRequest: GuaranteedAuthRequest;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock UserBehaviorService
    mockUserBehaviorService = {
      getUserBehavior: jest.fn(),
      getUserSummary: jest.fn(),
      checkUserStatus: jest.fn(),
      addStrike: jest.fn(),
      removeStrike: jest.fn(),
      banUser: jest.fn(),
      unbanUser: jest.fn(),
      getProblematicUsers: jest.fn(),
      getUserRiskAssessment: jest.fn(),
      calculateUserReliabilityScore: jest.fn(),
      getCustomerBehaviorForBusiness: jest.fn(),
      flagUserForReview: jest.fn(),
      getUserBehaviorStats: jest.fn(),
      processAutomaticStrikes: jest.fn(),
      resetExpiredStrikes: jest.fn(),
      unbanExpiredBans: jest.fn(),
    };

    // Create UserBehaviorController instance
    userBehaviorController = new UserBehaviorController(
      mockUserBehaviorService
    );

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [],
      effectiveLevel: 0,
    };
    mockRequest.token = {
      userId: "user-123",
      phoneNumber: "+905551234567",
      type: "access",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe("constructor", () => {
    it("should create UserBehaviorController instance", () => {
      expect(userBehaviorController).toBeInstanceOf(UserBehaviorController);
    });
  });

  describe("getUserBehavior", () => {
    it("should get user behavior successfully", async () => {
      // Arrange
      const userId = "user-456";
      mockRequest.params = { userId };

      const mockBehavior = {
        userId: "user-456",
        totalActions: 150,
        lastActiveAt: "2024-01-15T10:30:00Z",
        behaviorScore: 85.5,
        strikes: 0,
        isBanned: false,
        reliabilityScore: 0.85,
      };

      mockUserBehaviorService.getUserBehavior.mockResolvedValue(mockBehavior);

      // Act
      await userBehaviorController.getUserBehavior(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getUserBehavior).toHaveBeenCalledWith(
        "user-123",
        "user-456"
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBehavior,
      });
    });
  });

  describe("getUserSummary", () => {
    it("should get user summary successfully", async () => {
      // Arrange
      const userId = "user-456";
      mockRequest.params = { userId };

      const mockSummary = {
        userId: "user-456",
        totalAppointments: 25,
        totalSpent: 1250.0,
        averageRating: 4.5,
        lastAppointment: "2024-01-15T10:30:00Z",
        preferredServices: ["Haircut", "Styling"],
        reliabilityScore: 0.85,
      };

      mockUserBehaviorService.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      await userBehaviorController.getUserSummary(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getUserSummary).toHaveBeenCalledWith(
        "user-123",
        "user-456"
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
      });
    });
  });

  describe("getMyBehavior", () => {
    it("should get my behavior successfully", async () => {
      // Arrange
      const mockBehavior = {
        userId: "user-123",
        totalActions: 150,
        lastActiveAt: "2024-01-15T10:30:00Z",
        behaviorScore: 85.5,
        strikes: 0,
        isBanned: false,
        reliabilityScore: 0.85,
      };

      const mockSummary = {
        userId: "user-123",
        totalAppointments: 25,
        totalSpent: 1250.0,
        averageRating: 4.5,
        lastAppointment: "2024-01-15T10:30:00Z",
        preferredServices: ["Haircut", "Styling"],
        reliabilityScore: 0.85,
      };

      mockUserBehaviorService.getUserBehavior.mockResolvedValue(mockBehavior);
      mockUserBehaviorService.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      await userBehaviorController.getMyBehavior(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getUserBehavior).toHaveBeenCalledWith(
        "user-123",
        "user-123"
      );
      expect(mockUserBehaviorService.getUserSummary).toHaveBeenCalledWith(
        "user-123",
        "user-123"
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          behavior: mockBehavior,
          summary: mockSummary,
        },
      });
    });
  });

  describe("addStrike", () => {
    it("should add strike successfully", async () => {
      // Arrange
      const userId = "user-456";
      const reason = "No-show for appointment";
      mockRequest.params = { userId };
      mockRequest.body = { reason };

      const mockBehavior = {
        userId: "user-456",
        strikes: 1,
        lastStrikeReason: reason,
        lastStrikeAt: "2024-01-15T10:30:00Z",
      };

      mockUserBehaviorService.addStrike.mockResolvedValue(mockBehavior);

      // Act
      await userBehaviorController.addStrike(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.addStrike).toHaveBeenCalledWith(
        "user-123",
        "user-456",
        reason
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBehavior,
        message: "Strike added successfully",
      });
    });
  });

  describe("banUser", () => {
    it("should ban user successfully", async () => {
      // Arrange
      const customerId = "user-456";
      const reason = "Multiple no-shows and inappropriate behavior";
      const durationDays = 30;
      mockRequest.params = { customerId };
      mockRequest.body = { reason, durationDays, isTemporary: true };

      const mockBehavior = {
        userId: "user-456",
        isBanned: true,
        banReason: reason,
        banExpiresAt: "2024-02-14T10:30:00Z",
        bannedBy: "user-123",
      };

      mockUserBehaviorService.banUser.mockResolvedValue(mockBehavior);

      // Act
      await userBehaviorController.banUser(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.banUser).toHaveBeenCalledWith(
        "user-123",
        "user-456",
        reason,
        durationDays
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBehavior,
        message: `User banned for ${durationDays} days`,
      });
    });
  });

  describe("getProblematicUsers", () => {
    it("should get problematic users successfully", async () => {
      // Arrange
      const limit = 50;
      mockRequest.query = { limit: limit.toString() };

      const mockUsers = [
        {
          userId: "user-456",
          strikes: 3,
          isBanned: false,
          lastStrikeAt: "2024-01-15T10:30:00Z",
          reliabilityScore: 0.3,
        },
        {
          userId: "user-789",
          strikes: 5,
          isBanned: true,
          lastStrikeAt: "2024-01-14T10:30:00Z",
          reliabilityScore: 0.1,
        },
      ];

      mockUserBehaviorService.getProblematicUsers.mockResolvedValue(mockUsers);

      // Act
      await userBehaviorController.getProblematicUsers(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockUserBehaviorService.getProblematicUsers).toHaveBeenCalledWith(
        "user-123",
        limit
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        meta: {
          total: mockUsers.length,
          limit,
        },
      });
    });
  });
});
