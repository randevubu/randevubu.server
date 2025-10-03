import { Request, Response } from "express";
import { PushNotificationController } from "../../../src/controllers/pushNotificationController";
import { AuthenticatedRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/notificationService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

// Import the mocked modules
import {
  sendSimpleErrorResponse,
  sendStandardSuccessResponse,
} from "../../../src/utils/errorResponse";

describe("PushNotificationController", () => {
  let pushNotificationController: PushNotificationController;
  let mockNotificationService: any;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockAuthenticatedRequest: AuthenticatedRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

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

    // Create mock NotificationService
    mockNotificationService = {
      subscribeToPush: jest.fn(),
      unsubscribeFromPush: jest.fn(),
      getUserPushSubscriptions: jest.fn(),
      sendPushNotification: jest.fn(),
      sendBatchPushNotifications: jest.fn(),
      getVapidPublicKey: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      getNotificationPreferences: jest.fn(),
      getNotificationHistory: jest.fn(),
    };

    // Create PushNotificationController instance
    pushNotificationController = new PushNotificationController(
      mockNotificationService
    );

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();

    mockAuthenticatedRequest =
      TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockAuthenticatedRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [{ id: "user-role", name: "USER", level: 1 }],
      effectiveLevel: 1,
    };
  });

  describe("constructor", () => {
    it("should create PushNotificationController instance", () => {
      expect(pushNotificationController).toBeInstanceOf(
        PushNotificationController
      );
    });
  });

  describe("subscribe", () => {
    it("should subscribe to push notifications successfully", async () => {
      // Arrange
      const subscriptionData = {
        endpoint: "https://fcm.googleapis.com/fcm/send/...",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
        deviceName: "Chrome Browser",
        deviceType: "web",
      };

      mockAuthenticatedRequest.body = subscriptionData;

      const mockSubscription = {
        id: "subscription-123",
        userId: "user-123",
        endpoint: subscriptionData.endpoint,
        isActive: true,
        deviceName: subscriptionData.deviceName,
        createdAt: "2024-01-15T00:00:00Z",
      };

      mockNotificationService.subscribeToPush.mockResolvedValue(
        mockSubscription
      );

      // Act
      await pushNotificationController.subscribe(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(mockNotificationService.subscribeToPush).toHaveBeenCalledWith(
        "user-123",
        subscriptionData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: mockSubscription.id,
          isActive: mockSubscription.isActive,
          deviceName: mockSubscription.deviceName,
          createdAt: mockSubscription.createdAt,
        },
        message: "Successfully subscribed to push notifications",
      });
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe from push notifications successfully", async () => {
      // Arrange
      const unsubscribeData = {
        endpoint: "https://fcm.googleapis.com/fcm/send/...",
        subscriptionId: "subscription-123",
      };
      mockAuthenticatedRequest.body = unsubscribeData;

      mockNotificationService.unsubscribeFromPush.mockResolvedValue(true);

      // Act
      await pushNotificationController.unsubscribe(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(mockNotificationService.unsubscribeFromPush).toHaveBeenCalledWith(
        "user-123",
        unsubscribeData.endpoint,
        unsubscribeData.subscriptionId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Successfully unsubscribed from push notifications",
      });
    });
  });

  describe("getSubscriptions", () => {
    it("should get push subscriptions successfully", async () => {
      // Arrange
      const mockSubscriptions = [
        {
          id: "sub-1",
          deviceName: "Chrome Browser",
          deviceType: "web",
          isActive: true,
          createdAt: "2024-01-15T00:00:00Z",
          lastUsedAt: "2024-01-15T12:00:00Z",
        },
        {
          id: "sub-2",
          deviceName: "Firefox Browser",
          deviceType: "web",
          isActive: false,
          createdAt: "2024-01-14T00:00:00Z",
          lastUsedAt: null,
        },
      ];

      mockNotificationService.getUserPushSubscriptions.mockResolvedValue(
        mockSubscriptions
      );

      // Act
      await pushNotificationController.getSubscriptions(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(
        mockNotificationService.getUserPushSubscriptions
      ).toHaveBeenCalledWith("user-123", true);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriptions.map((sub) => ({
          id: sub.id,
          deviceName: sub.deviceName,
          deviceType: sub.deviceType,
          isActive: sub.isActive,
          createdAt: sub.createdAt,
          lastUsedAt: sub.lastUsedAt,
        })),
      });
    });
  });

  describe("sendNotification", () => {
    it("should send push notification successfully", async () => {
      // Arrange
      const notificationData = {
        userId: "user-123",
        appointmentId: "appointment-123",
        businessId: "business-123",
        title: "Test Notification",
        body: "This is a test notification",
        data: { type: "test" },
        icon: "https://example.com/icon.png",
        badge: "https://example.com/badge.png",
        url: "https://example.com/notifications",
      };

      mockAuthenticatedRequest.body = notificationData;

      const mockResult = [
        { success: true, messageId: "push-123", channel: "PUSH" },
        { success: true, messageId: "push-456", channel: "PUSH" },
      ];

      mockNotificationService.sendPushNotification.mockResolvedValue(
        mockResult
      );

      // Act
      await pushNotificationController.sendNotification(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(mockNotificationService.sendPushNotification).toHaveBeenCalledWith(
        notificationData
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          results: mockResult,
          summary: {
            total: mockResult.length,
            successful: 2,
            failed: 0,
          },
        },
        message: "Push notification sent. 2 successful, 0 failed.",
      });
    });
  });

  describe("getVapidPublicKey", () => {
    it("should get VAPID public key successfully", async () => {
      // Arrange
      const mockKey = "vapid-public-key-123";

      mockNotificationService.getVapidPublicKey.mockResolvedValue(mockKey);

      // Act
      await pushNotificationController.getVapidPublicKey(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockNotificationService.getVapidPublicKey).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { publicKey: mockKey },
      });
    });
  });

  describe("updatePreferences", () => {
    it("should update notification preferences successfully", async () => {
      // Arrange
      const preferences = {
        enableAppointmentReminders: true,
        enableBusinessNotifications: true,
        enablePromotionalMessages: false,
        reminderTiming: { hours: [1, 24] },
        preferredChannels: { channels: ["PUSH", "SMS"] },
        quietHours: {
          start: "22:00",
          end: "08:00",
          timezone: "Europe/Istanbul",
        },
        timezone: "Europe/Istanbul",
      };

      mockAuthenticatedRequest.body = preferences;

      const mockUpdatedPreferences = {
        id: "pref-123",
        ...preferences,
      };

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(
        mockUpdatedPreferences
      );

      // Act
      await pushNotificationController.updatePreferences(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(
        mockNotificationService.updateNotificationPreferences
      ).toHaveBeenCalledWith("user-123", preferences);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: mockUpdatedPreferences.id,
          enableAppointmentReminders:
            mockUpdatedPreferences.enableAppointmentReminders,
          enableBusinessNotifications:
            mockUpdatedPreferences.enableBusinessNotifications,
          enablePromotionalMessages:
            mockUpdatedPreferences.enablePromotionalMessages,
          reminderTiming: mockUpdatedPreferences.reminderTiming,
          preferredChannels: mockUpdatedPreferences.preferredChannels,
          quietHours: mockUpdatedPreferences.quietHours,
          timezone: mockUpdatedPreferences.timezone,
        },
        message: "Notification preferences updated successfully",
      });
    });
  });

  describe("getPreferences", () => {
    it("should get notification preferences successfully", async () => {
      // Arrange
      const mockPreferences = {
        id: "pref-123",
        enableAppointmentReminders: true,
        enableBusinessNotifications: true,
        enablePromotionalMessages: false,
        reminderTiming: { hours: [1, 24] },
        preferredChannels: { channels: ["PUSH", "SMS"] },
        quietHours: null,
        timezone: "Europe/Istanbul",
      };

      mockNotificationService.getNotificationPreferences.mockResolvedValue(
        mockPreferences
      );

      // Act
      await pushNotificationController.getPreferences(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(
        mockNotificationService.getNotificationPreferences
      ).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: mockPreferences.id,
          enableAppointmentReminders:
            mockPreferences.enableAppointmentReminders,
          enableBusinessNotifications:
            mockPreferences.enableBusinessNotifications,
          enablePromotionalMessages: mockPreferences.enablePromotionalMessages,
          reminderTiming: mockPreferences.reminderTiming,
          preferredChannels: mockPreferences.preferredChannels,
          quietHours: mockPreferences.quietHours,
          timezone: mockPreferences.timezone,
        },
      });
    });
  });

  describe("sendTestNotification", () => {
    it("should send test push notification successfully", async () => {
      // Arrange
      const testData = {
        title: "Test Notification",
        body: "This is a test notification",
        icon: "https://example.com/icon.png",
        badge: "https://example.com/badge.png",
        data: { type: "test" },
        url: "https://example.com/notifications",
      };

      mockAuthenticatedRequest.body = testData;

      const mockResult = [
        { success: true, messageId: "push-123", channel: "PUSH" },
      ];

      mockNotificationService.sendPushNotification.mockResolvedValue(
        mockResult
      );

      // Act
      await pushNotificationController.sendTestNotification(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(mockNotificationService.sendPushNotification).toHaveBeenCalledWith(
        {
          userId: "user-123",
          title: testData.title,
          body: testData.body,
          icon: testData.icon,
          badge: testData.badge,
          data: { ...testData.data, isTest: true },
          url: testData.url,
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          results: mockResult,
          summary: {
            total: mockResult.length,
            successful: 1,
            failed: 0,
          },
        },
        message: "Test notification sent. 1 successful, 0 failed.",
      });
    });
  });

  describe("sendBatchNotification", () => {
    it("should send batch push notification successfully", async () => {
      // Arrange
      const batchData = {
        userIds: ["user-123", "user-456", "user-789"],
        title: "Batch Notification",
        body: "This is a batch notification",
        icon: "https://example.com/icon.png",
        badge: "https://example.com/badge.png",
        data: { type: "batch" },
        url: "https://example.com/notifications",
      };

      mockAuthenticatedRequest.body = batchData;

      const mockResult = {
        successful: 2,
        failed: 1,
        results: [
          { success: true, messageId: "push-123", channel: "PUSH" },
          { success: true, messageId: "push-456", channel: "PUSH" },
          { success: false, error: "Invalid subscription" },
        ],
      };

      mockNotificationService.sendBatchPushNotifications.mockResolvedValue(
        mockResult
      );

      // Act
      await pushNotificationController.sendBatchNotification(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(
        mockNotificationService.sendBatchPushNotifications
      ).toHaveBeenCalledWith(batchData.userIds, {
        title: batchData.title,
        body: batchData.body,
        icon: batchData.icon,
        badge: batchData.badge,
        data: batchData.data,
        url: batchData.url,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            total: batchData.userIds.length,
            successful: mockResult.successful,
            failed: mockResult.failed,
          },
          results: mockResult.results,
        },
        message: "Batch notification sent to 3 users. 2 successful, 1 failed.",
      });
    });
  });

  describe("getNotificationHistory", () => {
    it("should get notification history successfully", async () => {
      // Arrange
      const query = {
        page: "1",
        limit: "10",
        status: "SENT",
        appointmentId: "appointment-123",
        businessId: "business-123",
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-01-31T23:59:59.999Z",
      };

      mockAuthenticatedRequest.query = query;

      const mockResult = {
        notifications: [
          {
            id: "notif-1",
            title: "Appointment Reminder",
            body: "Your appointment is tomorrow",
            status: "SENT",
            channel: "PUSH",
            createdAt: "2024-01-15T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockNotificationService.getNotificationHistory.mockResolvedValue(
        mockResult
      );

      // Act
      await pushNotificationController.getNotificationHistory(
        mockAuthenticatedRequest,
        mockResponse
      );

      // Assert
      expect(
        mockNotificationService.getNotificationHistory
      ).toHaveBeenCalledWith("user-123", {
        page: 1,
        limit: 10,
        status: query.status,
        appointmentId: query.appointmentId,
        businessId: query.businessId,
        from: new Date(query.from),
        to: new Date(query.to),
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          notifications: mockResult.notifications,
          pagination: {
            total: mockResult.total,
            page: mockResult.page,
            totalPages: mockResult.totalPages,
            limit: 10,
          },
        },
      });
    });
  });

  describe("healthCheck", () => {
    it("should return health check successfully", async () => {
      // Arrange
      const mockKey = "vapid-public-key-123";
      mockNotificationService.getVapidPublicKey.mockResolvedValue(mockKey);

      // Act
      await pushNotificationController.healthCheck(mockRequest, mockResponse);

      // Assert
      expect(mockNotificationService.getVapidPublicKey).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          pushNotificationsEnabled: true,
          vapidConfigured: true,
          timestamp: expect.any(String),
        },
      });
    });
  });
});
