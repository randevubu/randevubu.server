import { Request, Response } from 'express';
import { UserBehaviorController } from '../../../src/controllers/userBehaviorController';
import { UserBehaviorService } from '../../../src/services/userBehaviorService';
import { TestHelpers } from '../../utils/testHelpers';
import { AuthenticatedRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/userBehaviorService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('UserBehaviorController', () => {
  let userBehaviorController: UserBehaviorController;
  let mockUserBehaviorService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock UserBehaviorService
    mockUserBehaviorService = {
      trackUserAction: jest.fn(),
      getUserBehavior: jest.fn(),
      getBehaviorAnalytics: jest.fn(),
      getBehaviorInsights: jest.fn(),
      updateBehaviorSettings: jest.fn(),
      getBehaviorHistory: jest.fn()
    };

    // Create UserBehaviorController instance
    userBehaviorController = new UserBehaviorController(mockUserBehaviorService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create UserBehaviorController instance', () => {
      expect(userBehaviorController).toBeInstanceOf(UserBehaviorController);
    });
  });

  describe('trackAction', () => {
    it('should track user action successfully', async () => {
      // Arrange
      const actionData = {
        action: 'appointment_created',
        businessId: 'business-123',
        metadata: {
          appointmentId: 'appointment-123',
          serviceId: 'service-123'
        }
      };

      mockRequest.body = actionData;

      const mockResult = {
        success: true,
        message: 'Action tracked successfully'
      };

      mockUserBehaviorService.trackUserAction.mockResolvedValue(mockResult);

      // Act
      await userBehaviorController.trackAction(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.trackUserAction).toHaveBeenCalledWith('user-123', actionData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getUserBehavior', () => {
    it('should get user behavior successfully', async () => {
      // Arrange
      const userId = 'user-456';
      const businessId = 'business-123';

      mockRequest.params = { userId };
      mockRequest.query = { businessId };

      const mockBehavior = {
        userId: 'user-456',
        businessId: 'business-123',
        totalActions: 150,
        lastActiveAt: '2024-01-15T10:30:00Z',
        behaviorScore: 85.5,
        preferences: {
          preferredServices: ['Haircut', 'Styling'],
          preferredTimes: ['10:00', '14:00']
        }
      };

      mockUserBehaviorService.getUserBehavior.mockResolvedValue(mockBehavior);

      // Act
      await userBehaviorController.getUserBehavior(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getUserBehavior).toHaveBeenCalledWith('user-123', userId, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBehavior
      });
    });
  });

  describe('getBehaviorAnalytics', () => {
    it('should get behavior analytics successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockAnalytics = {
        totalUsers: 100,
        activeUsers: 75,
        averageSessionDuration: 15.5,
        topActions: [
          { action: 'appointment_created', count: 50 },
          { action: 'service_viewed', count: 30 }
        ],
        userEngagement: {
          high: 25,
          medium: 40,
          low: 35
        }
      };

      mockUserBehaviorService.getBehaviorAnalytics.mockResolvedValue(mockAnalytics);

      // Act
      await userBehaviorController.getBehaviorAnalytics(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getBehaviorAnalytics).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics
      });
    });
  });

  describe('getBehaviorInsights', () => {
    it('should get behavior insights successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockInsights = {
        insights: [
          {
            type: 'trend',
            title: 'Peak Usage Hours',
            description: 'Most users are active between 10:00-12:00 and 14:00-16:00',
            confidence: 0.85
          },
          {
            type: 'recommendation',
            title: 'Service Popularity',
            description: 'Consider promoting Haircut services as they have high engagement',
            confidence: 0.92
          }
        ],
        recommendations: [
          'Optimize appointment slots during peak hours',
          'Focus marketing on popular services'
        ]
      };

      mockUserBehaviorService.getBehaviorInsights.mockResolvedValue(mockInsights);

      // Act
      await userBehaviorController.getBehaviorInsights(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getBehaviorInsights).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInsights
      });
    });
  });

  describe('updateBehaviorSettings', () => {
    it('should update behavior settings successfully', async () => {
      // Arrange
      const settings = {
        trackingEnabled: true,
        analyticsEnabled: true,
        dataRetentionDays: 365,
        privacyLevel: 'standard'
      };

      mockRequest.body = settings;

      const mockUpdatedSettings = {
        id: 'settings-123',
        ...settings,
        updatedAt: '2024-01-15T10:30:00Z'
      };

      mockUserBehaviorService.updateBehaviorSettings.mockResolvedValue(mockUpdatedSettings);

      // Act
      await userBehaviorController.updateBehaviorSettings(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.updateBehaviorSettings).toHaveBeenCalledWith('user-123', settings);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });
  });

  describe('getBehaviorHistory', () => {
    it('should get behavior history successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const userId = 'user-456';
      const page = 1;
      const limit = 20;

      mockRequest.params = { businessId, userId };
      mockRequest.query = { page: page.toString(), limit: limit.toString() };

      const mockHistory = {
        actions: [
          {
            id: 'action-1',
            action: 'appointment_created',
            timestamp: '2024-01-15T10:30:00Z',
            metadata: { appointmentId: 'appointment-123' }
          },
          {
            id: 'action-2',
            action: 'service_viewed',
            timestamp: '2024-01-15T10:25:00Z',
            metadata: { serviceId: 'service-123' }
          }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockUserBehaviorService.getBehaviorHistory.mockResolvedValue(mockHistory);

      // Act
      await userBehaviorController.getBehaviorHistory(mockRequest, mockResponse);

      // Assert
      expect(mockUserBehaviorService.getBehaviorHistory).toHaveBeenCalledWith('user-123', businessId, userId, page, limit);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory
      });
    });
  });
});

