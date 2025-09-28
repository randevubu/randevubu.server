import { Request, Response } from 'express';
import { UsageController } from '../../../src/controllers/usageController';
import { UsageService } from '../../../src/services/usageService';
import { TestHelpers } from '../../utils/testHelpers';
import { BusinessContextRequest, AuthenticatedRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/usageService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('UsageController', () => {
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
      recordSmsUsage: jest.fn(),
      recordAppointmentUsage: jest.fn(),
      recordCustomerUsage: jest.fn(),
      canSendSms: jest.fn(),
      getUsageAlerts: jest.fn(),
      resetUsage: jest.fn(),
      getUsageHistory: jest.fn()
    };

    // Create UsageController instance
    usageController = new UsageController(mockUsageService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };
    mockBusinessContextRequest.business = { id: 'business-123', name: 'Test Business' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create UsageController instance', () => {
      expect(usageController).toBeInstanceOf(UsageController);
    });
  });

  describe('getUsageSummary', () => {
    it('should get usage summary successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockUsageSummary = {
        smsUsage: { used: 50, limit: 100, remaining: 50 },
        appointmentUsage: { used: 25, limit: 50, remaining: 25 },
        customerUsage: { used: 10, limit: 20, remaining: 10 }
      };

      mockUsageService.getBusinessUsageSummary.mockResolvedValue(mockUsageSummary);

      // Act
      await usageController.getUsageSummary(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.getBusinessUsageSummary).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsageSummary
      });
    });
  });

  describe('recordSmsUsage', () => {
    it('should record SMS usage successfully', async () => {
      // Arrange
      const usageData = {
        businessId: 'business-123',
        messageCount: 1,
        recipientCount: 1
      };

      mockRequest.body = usageData;

      const mockResult = {
        success: true,
        message: 'SMS usage recorded successfully'
      };

      mockUsageService.recordSmsUsage.mockResolvedValue(mockResult);

      // Act
      await usageController.recordSmsUsage(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.recordSmsUsage).toHaveBeenCalledWith('user-123', usageData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('recordAppointmentUsage', () => {
    it('should record appointment usage successfully', async () => {
      // Arrange
      const usageData = {
        businessId: 'business-123',
        appointmentCount: 1
      };

      mockRequest.body = usageData;

      const mockResult = {
        success: true,
        message: 'Appointment usage recorded successfully'
      };

      mockUsageService.recordAppointmentUsage.mockResolvedValue(mockResult);

      // Act
      await usageController.recordAppointmentUsage(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.recordAppointmentUsage).toHaveBeenCalledWith('user-123', usageData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('recordCustomerUsage', () => {
    it('should record customer usage successfully', async () => {
      // Arrange
      const usageData = {
        businessId: 'business-123',
        customerCount: 1
      };

      mockRequest.body = usageData;

      const mockResult = {
        success: true,
        message: 'Customer usage recorded successfully'
      };

      mockUsageService.recordCustomerUsage.mockResolvedValue(mockResult);

      // Act
      await usageController.recordCustomerUsage(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.recordCustomerUsage).toHaveBeenCalledWith('user-123', usageData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('checkSmsLimit', () => {
    it('should check SMS limit successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const messageCount = 5;

      mockRequest.params = { businessId };
      mockRequest.query = { messageCount: messageCount.toString() };

      const mockLimitCheck = {
        canSend: true,
        remaining: 45,
        limit: 100
      };

      mockUsageService.canSendSms.mockResolvedValue(mockLimitCheck);

      // Act
      await usageController.checkSmsLimit(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.canSendSms).toHaveBeenCalledWith('user-123', businessId, messageCount);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLimitCheck
      });
    });
  });

  describe('getUsageAlerts', () => {
    it('should get usage alerts successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockAlerts = [
        { type: 'sms', message: 'SMS usage at 80%', level: 'warning' },
        { type: 'appointments', message: 'Appointment limit reached', level: 'error' }
      ];

      mockUsageService.getUsageAlerts.mockResolvedValue(mockAlerts);

      // Act
      await usageController.getUsageAlerts(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.getUsageAlerts).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAlerts
      });
    });
  });

  describe('resetUsage', () => {
    it('should reset usage successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const usageType = 'sms';

      mockRequest.params = { businessId };
      mockRequest.body = { usageType };

      const mockResult = {
        success: true,
        message: 'Usage reset successfully'
      };

      mockUsageService.resetUsage.mockResolvedValue(mockResult);

      // Act
      await usageController.resetUsage(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.resetUsage).toHaveBeenCalledWith('user-123', businessId, usageType);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getUsageHistory', () => {
    it('should get usage history successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockHistory = [
        { date: '2024-01-15', smsUsed: 10, appointmentsCreated: 5 },
        { date: '2024-01-16', smsUsed: 15, appointmentsCreated: 8 }
      ];

      mockUsageService.getUsageHistory.mockResolvedValue(mockHistory);

      // Act
      await usageController.getUsageHistory(mockRequest, mockResponse);

      // Assert
      expect(mockUsageService.getUsageHistory).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory
      });
    });
  });
});

