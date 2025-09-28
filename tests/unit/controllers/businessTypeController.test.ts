import { Request, Response } from 'express';
import { BusinessTypeController } from '../../../src/controllers/businessTypeController';
import { BusinessTypeService } from '../../../src/services/businessTypeService';
import { TestHelpers } from '../../utils/testHelpers';

// Mock dependencies
jest.mock('../../../src/services/businessTypeService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('BusinessTypeController', () => {
  let businessTypeController: BusinessTypeController;
  let mockBusinessTypeService: any;
  let mockRequest: Request;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock BusinessTypeService
    mockBusinessTypeService = {
      getAllBusinessTypes: jest.fn(),
      getBusinessTypeById: jest.fn(),
      createBusinessType: jest.fn(),
      updateBusinessType: jest.fn(),
      deleteBusinessType: jest.fn(),
      getBusinessTypesByCategory: jest.fn()
    };

    // Create BusinessTypeController instance
    businessTypeController = new BusinessTypeController(mockBusinessTypeService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create BusinessTypeController instance', () => {
      expect(businessTypeController).toBeInstanceOf(BusinessTypeController);
    });
  });

  describe('getAllBusinessTypes', () => {
    it('should get all business types successfully', async () => {
      // Arrange
      const mockBusinessTypes = [
        { id: 'type-1', name: 'Hair Salon', category: 'beauty' },
        { id: 'type-2', name: 'Barber Shop', category: 'beauty' }
      ];

      mockBusinessTypeService.getAllBusinessTypes.mockResolvedValue(mockBusinessTypes);

      // Act
      await businessTypeController.getAllBusinessTypes(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.getAllBusinessTypes).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessTypes
      });
    });
  });

  describe('getBusinessTypeById', () => {
    it('should get business type by id successfully', async () => {
      // Arrange
      const typeId = 'type-123';
      mockRequest.params = { id: typeId };

      const mockBusinessType = {
        id: typeId,
        name: 'Hair Salon',
        category: 'beauty',
        description: 'Professional hair services'
      };

      mockBusinessTypeService.getBusinessTypeById.mockResolvedValue(mockBusinessType);

      // Act
      await businessTypeController.getBusinessTypeById(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.getBusinessTypeById).toHaveBeenCalledWith(typeId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessType
      });
    });
  });

  describe('createBusinessType', () => {
    it('should create business type successfully', async () => {
      // Arrange
      const businessTypeData = {
        name: 'Nail Salon',
        category: 'beauty',
        description: 'Professional nail services'
      };

      mockRequest.body = businessTypeData;

      const mockCreatedBusinessType = {
        id: 'type-123',
        ...businessTypeData,
        createdAt: '2024-01-15T00:00:00Z'
      };

      mockBusinessTypeService.createBusinessType.mockResolvedValue(mockCreatedBusinessType);

      // Act
      await businessTypeController.createBusinessType(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.createBusinessType).toHaveBeenCalledWith(businessTypeData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedBusinessType
      });
    });
  });

  describe('updateBusinessType', () => {
    it('should update business type successfully', async () => {
      // Arrange
      const typeId = 'type-123';
      const updateData = {
        name: 'Updated Nail Salon',
        description: 'Updated description'
      };

      mockRequest.params = { id: typeId };
      mockRequest.body = updateData;

      const mockUpdatedBusinessType = {
        id: typeId,
        ...updateData
      };

      mockBusinessTypeService.updateBusinessType.mockResolvedValue(mockUpdatedBusinessType);

      // Act
      await businessTypeController.updateBusinessType(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.updateBusinessType).toHaveBeenCalledWith(typeId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedBusinessType
      });
    });
  });

  describe('deleteBusinessType', () => {
    it('should delete business type successfully', async () => {
      // Arrange
      const typeId = 'type-123';
      mockRequest.params = { id: typeId };

      mockBusinessTypeService.deleteBusinessType.mockResolvedValue(undefined);

      // Act
      await businessTypeController.deleteBusinessType(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.deleteBusinessType).toHaveBeenCalledWith(typeId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Business type deleted successfully'
      });
    });
  });

  describe('getBusinessTypesByCategory', () => {
    it('should get business types by category successfully', async () => {
      // Arrange
      const category = 'beauty';
      mockRequest.params = { category };

      const mockBusinessTypes = [
        { id: 'type-1', name: 'Hair Salon', category: 'beauty' },
        { id: 'type-2', name: 'Nail Salon', category: 'beauty' }
      ];

      mockBusinessTypeService.getBusinessTypesByCategory.mockResolvedValue(mockBusinessTypes);

      // Act
      await businessTypeController.getBusinessTypesByCategory(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessTypeService.getBusinessTypesByCategory).toHaveBeenCalledWith(category);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessTypes
      });
    });
  });
});

