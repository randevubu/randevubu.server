import { Request, Response } from 'express';
import { BusinessClosureController } from '../../../src/controllers/businessClosureController';
import { BusinessClosureService } from '../../../src/services/businessClosureService';
import { TestHelpers } from '../../utils/testHelpers';
import { BusinessContextRequest, AuthenticatedRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/businessClosureService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('BusinessClosureController', () => {
  let businessClosureController: BusinessClosureController;
  let mockBusinessClosureService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock BusinessClosureService
    mockBusinessClosureService = {
      createClosure: jest.fn(),
      getClosures: jest.fn(),
      updateClosure: jest.fn(),
      deleteClosure: jest.fn(),
      getClosureById: jest.fn(),
      getActiveClosures: jest.fn(),
      getClosureStats: jest.fn(),
      getAffectedAppointments: jest.fn()
    };

    // Create BusinessClosureController instance
    businessClosureController = new BusinessClosureController(mockBusinessClosureService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };
    mockBusinessContextRequest.business = { id: 'business-123', name: 'Test Business' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create BusinessClosureController instance', () => {
      expect(businessClosureController).toBeInstanceOf(BusinessClosureController);
    });
  });

  describe('createClosure', () => {
    it('should create closure successfully', async () => {
      // Arrange
      const closureData = {
        businessId: 'business-123',
        startDate: '2024-01-15',
        endDate: '2024-01-16',
        reason: 'Holiday',
        isRecurring: false
      };

      mockRequest.body = closureData;

      const mockClosure = {
        id: 'closure-123',
        ...closureData,
        isActive: true
      };

      mockBusinessClosureService.createClosure.mockResolvedValue(mockClosure);

      // Act
      await businessClosureController.createClosure(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.createClosure).toHaveBeenCalledWith('user-123', closureData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosure
      });
    });
  });

  describe('getClosures', () => {
    it('should get closures successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockClosures = [
        { id: 'closure-1', businessId: 'business-123', reason: 'Holiday' },
        { id: 'closure-2', businessId: 'business-123', reason: 'Maintenance' }
      ];

      mockBusinessClosureService.getClosures.mockResolvedValue(mockClosures);

      // Act
      await businessClosureController.getClosures(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.getClosures).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosures
      });
    });
  });

  describe('updateClosure', () => {
    it('should update closure successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      const updateData = {
        reason: 'Updated reason',
        isActive: false
      };

      mockRequest.params = { id: closureId };
      mockRequest.body = updateData;

      const mockUpdatedClosure = {
        id: closureId,
        ...updateData
      };

      mockBusinessClosureService.updateClosure.mockResolvedValue(mockUpdatedClosure);

      // Act
      await businessClosureController.updateClosure(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.updateClosure).toHaveBeenCalledWith('user-123', closureId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedClosure
      });
    });
  });

  describe('deleteClosure', () => {
    it('should delete closure successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      mockRequest.params = { id: closureId };

      mockBusinessClosureService.deleteClosure.mockResolvedValue(undefined);

      // Act
      await businessClosureController.deleteClosure(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.deleteClosure).toHaveBeenCalledWith('user-123', closureId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Closure deleted successfully'
      });
    });
  });

  describe('getClosureById', () => {
    it('should get closure by id successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      mockRequest.params = { id: closureId };

      const mockClosure = {
        id: closureId,
        businessId: 'business-123',
        reason: 'Holiday',
        isActive: true
      };

      mockBusinessClosureService.getClosureById.mockResolvedValue(mockClosure);

      // Act
      await businessClosureController.getClosureById(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.getClosureById).toHaveBeenCalledWith('user-123', closureId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosure
      });
    });
  });

  describe('getActiveClosures', () => {
    it('should get active closures successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockActiveClosures = [
        { id: 'closure-1', businessId: 'business-123', isActive: true }
      ];

      mockBusinessClosureService.getActiveClosures.mockResolvedValue(mockActiveClosures);

      // Act
      await businessClosureController.getActiveClosures(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.getActiveClosures).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockActiveClosures
      });
    });
  });

  describe('getClosureStats', () => {
    it('should get closure statistics successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockStats = {
        totalClosures: 5,
        activeClosures: 1,
        totalDaysClosed: 10
      };

      mockBusinessClosureService.getClosureStats.mockResolvedValue(mockStats);

      // Act
      await businessClosureController.getClosureStats(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.getClosureStats).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getAffectedAppointments', () => {
    it('should get affected appointments successfully', async () => {
      // Arrange
      const closureId = 'closure-123';
      mockRequest.params = { id: closureId };

      const mockAffectedAppointments = [
        { id: 'appointment-1', customerName: 'John Doe', appointmentDate: '2024-01-15' },
        { id: 'appointment-2', customerName: 'Jane Smith', appointmentDate: '2024-01-15' }
      ];

      mockBusinessClosureService.getAffectedAppointments.mockResolvedValue(mockAffectedAppointments);

      // Act
      await businessClosureController.getAffectedAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessClosureService.getAffectedAppointments).toHaveBeenCalledWith('user-123', closureId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAffectedAppointments
      });
    });
  });
});

