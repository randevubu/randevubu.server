import { Request, Response } from 'express';
import { PushNotificationController } from '../../../src/controllers/pushNotificationController';
import { NotificationService } from '../../../src/services/notificationService';
import { TestHelpers } from '../../utils/testHelpers';
import { GuaranteedAuthRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/notificationService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('PushNotificationController', () => {
  let pushNotificationController: PushNotificationController;
  let mockNotificationService: any;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockGuaranteedAuthRequest: GuaranteedAuthRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock NotificationService
    mockNotificationService = {
      subscribeToPush: jest.fn(),
      unsubscribeFromPush: jest.fn(),
      getUserPushSubscriptions: jest.fn(),
      sendPushNotification: jest.fn(),
      getVapidPublicKey: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      getNotificationPreferences: jest.fn()
    };

    // Create PushNotificationController instance
    pushNotificationController = new PushNotificationController(mockNotificationService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();

    mockGuaranteedAuthRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockGuaranteedAuthRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };
  });

  describe('constructor', () => {
    it('should create PushNotificationController instance', () => {
      expect(pushNotificationController).toBeInstanceOf(PushNotificationController);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to push notifications successfully', async () => {
      // Arrange
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/...',
        keys: {
          p256dh: 'p256dh-key',
          auth: 'auth-key'
        }
      };

      mockGuaranteedAuthRequest.body = subscriptionData;

      const mockSubscription = {
        id: 'subscription-123',
        userId: 'user-123',
        endpoint: subscriptionData.endpoint,
        isActive: true
      };

      mockNotificationService.subscribeToPush.mockResolvedValue(mockSubscription);

      // Act
      await pushNotificationController.subscribe(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockNotificationService.subscribeToPush).toHaveBeenCalledWith('user-123', subscriptionData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscription
      });
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from push notifications successfully', async () => {
      // Arrange
      const endpoint = 'https://fcm.googleapis.com/fcm/send/...';
      mockGuaranteedAuthRequest.query = { endpoint };

      mockNotificationService.unsubscribeFromPush.mockResolvedValue(true);

      // Act
      await pushNotificationController.unsubscribe(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockNotificationService.unsubscribeFromPush).toHaveBeenCalledWith('user-123', endpoint);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Unsubscribed successfully'
      });
    });
  });

  describe('getSubscriptions', () => {
    it('should get push subscriptions successfully', async () => {
      // Arrange
      const mockSubscriptions = [
        { id: 'sub-1', endpoint: 'https://fcm.googleapis.com/fcm/send/...', isActive: true },
        { id: 'sub-2', endpoint: 'https://fcm.googleapis.com/fcm/send/...', isActive: false }
      ];

      mockNotificationService.getUserPushSubscriptions.mockResolvedValue(mockSubscriptions);

      // Act
      await pushNotificationController.getSubscriptions(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockNotificationService.getUserPushSubscriptions).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriptions
      });
    });
  });

  describe('sendNotification', () => {
    it('should send push notification successfully', async () => {
      // Arrange
      const notificationData = {
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { type: 'test' }
      };

      mockGuaranteedAuthRequest.body = notificationData;

      const mockResult = [{
        success: true,
        messageId: 'push-123',
        channel: 'PUSH'
      }];

      mockNotificationService.sendPushNotification.mockResolvedValue(mockResult);

      // Act
      await pushNotificationController.sendNotification(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockNotificationService.sendPushNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        ...notificationData
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getVapidKey', () => {
    it('should get VAPID public key successfully', async () => {
      // Arrange
      const mockKey = 'vapid-public-key-123';

      mockNotificationService.getVapidPublicKey.mockResolvedValue(mockKey);

      // Act
      await pushNotificationController.getVapidKey(mockRequest, mockResponse);

      // Assert
      expect(mockNotificationService.getVapidPublicKey).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { publicKey: mockKey }
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences successfully', async () => {
      // Arrange
      const preferences = {
        appointmentReminders: true,
        pushNotifications: true,
        smsNotifications: false
      };

      mockGuaranteedAuthRequest.body = preferences;

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(undefined);

      // Act
      await pushNotificationController.updatePreferences(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockNotificationService.updateNotificationPreferences).toHaveBeenCalledWith('user-123', preferences);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences updated successfully'
      });
    });
  });

  describe('getPreferences', () => {
    it('should get notification preferences successfully', async () => {
      // Arrange
      const mockPreferences = {
        appointmentReminders: true,
        pushNotifications: true,
        smsNotifications: false
      };

      mockNotificationService.getNotificationPreferences.mockResolvedValue(mockPreferences);

      // Act
      await pushNotificationController.getPreferences(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockNotificationService.getNotificationPreferences).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences
      });
    });
  });
});

