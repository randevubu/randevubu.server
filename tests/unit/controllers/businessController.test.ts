import { Request, Response } from 'express';
import { BusinessController } from '../../../src/controllers/businessController';
import { BusinessService } from '../../../src/services/businessService';
import { TestHelpers } from '../../utils/testHelpers';
import { AuthenticatedRequest } from '../../../src/types/auth';
import { BusinessContextRequest } from '../../../src/middleware/businessContext';

// Mock dependencies
jest.mock('../../../src/services/businessService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('BusinessController', () => {
  let businessController: BusinessController;
  let mockBusinessService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock BusinessService
    mockBusinessService = {
      getMyBusiness: jest.fn(),
      getMyServices: jest.fn(),
      createBusiness: jest.fn(),
      getBusinessById: jest.fn(),
      getBusinessBySlug: jest.fn(),
      getUserBusinesses: jest.fn(),
      updateBusiness: jest.fn(),
      updateMyBusiness: jest.fn(),
      updatePriceSettings: jest.fn(),
      getPriceSettings: jest.fn(),
      deleteBusiness: jest.fn(),
      searchBusinesses: jest.fn(),
      getNearbyBusinesses: jest.fn(),
      verifyBusiness: jest.fn(),
      unverifyBusiness: jest.fn(),
      closeBusiness: jest.fn(),
      reopenBusiness: jest.fn(),
      getBusinessStats: jest.fn(),
      updateBusinessHours: jest.fn(),
      getBusinessHours: jest.fn(),
      getBusinessHoursStatus: jest.fn(),
      createBusinessHoursOverride: jest.fn(),
      updateBusinessHoursOverride: jest.fn(),
      deleteBusinessHoursOverride: jest.fn(),
      getBusinessHoursOverrides: jest.fn(),
      checkSlugAvailability: jest.fn(),
      getAllBusinesses: jest.fn(),
      getBusinessesByType: jest.fn(),
      batchVerifyBusinesses: jest.fn(),
      batchCloseBusinesses: jest.fn(),
      getAllBusinessesMinimalDetails: jest.fn(),
      getBusinessStaff: jest.fn(),
      inviteStaff: jest.fn(),
      verifyStaffInvitation: jest.fn(),
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
      deleteGalleryImage: jest.fn(),
      getBusinessImages: jest.fn(),
      updateGalleryImages: jest.fn(),
      getNotificationSettings: jest.fn(),
      updateNotificationSettings: jest.fn(),
      testReminder: jest.fn(),
      getStaffPrivacySettings: jest.fn(),
      updateStaffPrivacySettings: jest.fn()
    };

    // Create BusinessController instance
    businessController = new BusinessController(mockBusinessService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };
    mockBusinessContextRequest.business = { id: 'business-123', name: 'Test Business' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create BusinessController instance', () => {
      expect(businessController).toBeInstanceOf(BusinessController);
    });
  });

  describe('getMyBusiness', () => {
    it('should get my business successfully', async () => {
      // Arrange
      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business',
        description: 'A test business',
        address: '123 Test St'
      };

      mockBusinessService.getMyBusiness.mockResolvedValue(mockBusiness);

      // Act
      await businessController.getMyBusiness(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getMyBusiness).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusiness
      });
    });
  });

  describe('getMyServices', () => {
    it('should get my services successfully', async () => {
      // Arrange
      const mockServices = [
        { id: 'service-1', name: 'Haircut', price: 50 },
        { id: 'service-2', name: 'Styling', price: 75 }
      ];

      mockBusinessService.getMyServices.mockResolvedValue(mockServices);

      // Act
      await businessController.getMyServices(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getMyServices).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockServices
      });
    });
  });

  describe('createBusiness', () => {
    it('should create business successfully', async () => {
      // Arrange
      const businessData = {
        name: 'New Business',
        description: 'A new business',
        address: '456 New St',
        phone: '+905559876543',
        businessTypeId: 'type-123'
      };

      mockRequest.body = businessData;

      const mockCreatedBusiness = {
        id: 'business-456',
        ...businessData,
        ownerId: 'user-123'
      };

      mockBusinessService.createBusiness.mockResolvedValue(mockCreatedBusiness);

      // Act
      await businessController.createBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.createBusiness).toHaveBeenCalledWith('user-123', businessData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedBusiness
      });
    });
  });

  describe('getBusinessById', () => {
    it('should get business by id successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      const mockBusiness = {
        id: businessId,
        name: 'Test Business',
        description: 'A test business'
      };

      mockBusinessService.getBusinessById.mockResolvedValue(mockBusiness);

      // Act
      await businessController.getBusinessById(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessById).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusiness
      });
    });
  });

  describe('getBusinessBySlug', () => {
    it('should get business by slug successfully', async () => {
      // Arrange
      const slug = 'test-business';
      mockRequest.params = { slug };

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business',
        slug: 'test-business'
      };

      mockBusinessService.getBusinessBySlug.mockResolvedValue(mockBusiness);

      // Act
      await businessController.getBusinessBySlug(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessBySlug).toHaveBeenCalledWith(slug);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusiness
      });
    });
  });

  describe('getUserBusinesses', () => {
    it('should get user businesses successfully', async () => {
      // Arrange
      const mockBusinesses = [
        { id: 'business-1', name: 'Business 1' },
        { id: 'business-2', name: 'Business 2' }
      ];

      mockBusinessService.getUserBusinesses.mockResolvedValue(mockBusinesses);

      // Act
      await businessController.getUserBusinesses(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getUserBusinesses).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinesses
      });
    });
  });

  describe('updateBusiness', () => {
    it('should update business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const updateData = {
        name: 'Updated Business',
        description: 'Updated description'
      };

      mockRequest.params = { id: businessId };
      mockRequest.body = updateData;

      const mockUpdatedBusiness = {
        id: businessId,
        ...updateData
      };

      mockBusinessService.updateBusiness.mockResolvedValue(mockUpdatedBusiness);

      // Act
      await businessController.updateBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.updateBusiness).toHaveBeenCalledWith('user-123', businessId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedBusiness
      });
    });
  });

  describe('updateMyBusiness', () => {
    it('should update my business successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Business',
        description: 'Updated description'
      };

      mockBusinessContextRequest.body = updateData;

      const mockUpdatedBusiness = {
        id: 'business-123',
        ...updateData
      };

      mockBusinessService.updateMyBusiness.mockResolvedValue(mockUpdatedBusiness);

      // Act
      await businessController.updateMyBusiness(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.updateMyBusiness).toHaveBeenCalledWith('user-123', 'business-123', updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedBusiness
      });
    });
  });

  describe('updatePriceSettings', () => {
    it('should update price settings successfully', async () => {
      // Arrange
      const priceSettings = {
        currency: 'TRY',
        showPrices: true,
        hideAllPrices: false
      };

      mockBusinessContextRequest.body = priceSettings;

      const mockUpdatedSettings = {
        id: 'business-123',
        ...priceSettings
      };

      mockBusinessService.updatePriceSettings.mockResolvedValue(mockUpdatedSettings);

      // Act
      await businessController.updatePriceSettings(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.updatePriceSettings).toHaveBeenCalledWith('user-123', 'business-123', priceSettings);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });
  });

  describe('getPriceSettings', () => {
    it('should get price settings successfully', async () => {
      // Arrange
      const mockPriceSettings = {
        currency: 'TRY',
        showPrices: true,
        hideAllPrices: false
      };

      mockBusinessService.getPriceSettings.mockResolvedValue(mockPriceSettings);

      // Act
      await businessController.getPriceSettings(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getPriceSettings).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPriceSettings
      });
    });
  });

  describe('deleteBusiness', () => {
    it('should delete business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      mockBusinessService.deleteBusiness.mockResolvedValue(undefined);

      // Act
      await businessController.deleteBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.deleteBusiness).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Business deleted successfully'
      });
    });
  });

  describe('searchBusinesses', () => {
    it('should search businesses successfully', async () => {
      // Arrange
      const searchQuery = 'hair salon';
      const location = 'Istanbul';
      const businessType = 'beauty';

      mockRequest.query = { q: searchQuery, location, businessType };

      const mockSearchResults = {
        businesses: [
          { id: 'business-1', name: 'Hair Salon 1' },
          { id: 'business-2', name: 'Hair Salon 2' }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockBusinessService.searchBusinesses.mockResolvedValue(mockSearchResults);

      // Act
      await businessController.searchBusinesses(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.searchBusinesses).toHaveBeenCalledWith(searchQuery, location, businessType, 1, 20);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSearchResults
      });
    });
  });

  describe('getNearbyBusinesses', () => {
    it('should get nearby businesses successfully', async () => {
      // Arrange
      const latitude = 41.0082;
      const longitude = 28.9784;
      const radius = 5;

      mockRequest.query = { lat: latitude.toString(), lng: longitude.toString(), radius: radius.toString() };

      const mockNearbyBusinesses = [
        { id: 'business-1', name: 'Nearby Business 1', distance: 1.2 },
        { id: 'business-2', name: 'Nearby Business 2', distance: 2.5 }
      ];

      mockBusinessService.getNearbyBusinesses.mockResolvedValue(mockNearbyBusinesses);

      // Act
      await businessController.getNearbyBusinesses(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getNearbyBusinesses).toHaveBeenCalledWith(latitude, longitude, radius);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNearbyBusinesses
      });
    });
  });

  describe('verifyBusiness', () => {
    it('should verify business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      const mockVerifiedBusiness = {
        id: businessId,
        isVerified: true
      };

      mockBusinessService.verifyBusiness.mockResolvedValue(mockVerifiedBusiness);

      // Act
      await businessController.verifyBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.verifyBusiness).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockVerifiedBusiness
      });
    });
  });

  describe('unverifyBusiness', () => {
    it('should unverify business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      const mockUnverifiedBusiness = {
        id: businessId,
        isVerified: false
      };

      mockBusinessService.unverifyBusiness.mockResolvedValue(mockUnverifiedBusiness);

      // Act
      await businessController.unverifyBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.unverifyBusiness).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUnverifiedBusiness
      });
    });
  });

  describe('closeBusiness', () => {
    it('should close business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const reason = 'Temporary closure';

      mockRequest.params = { id: businessId };
      mockRequest.body = { reason };

      const mockClosedBusiness = {
        id: businessId,
        isClosed: true,
        closureReason: reason
      };

      mockBusinessService.closeBusiness.mockResolvedValue(mockClosedBusiness);

      // Act
      await businessController.closeBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.closeBusiness).toHaveBeenCalledWith('user-123', businessId, reason);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockClosedBusiness
      });
    });
  });

  describe('reopenBusiness', () => {
    it('should reopen business successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      const mockReopenedBusiness = {
        id: businessId,
        isClosed: false
      };

      mockBusinessService.reopenBusiness.mockResolvedValue(mockReopenedBusiness);

      // Act
      await businessController.reopenBusiness(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.reopenBusiness).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReopenedBusiness
      });
    });
  });

  describe('getBusinessStats', () => {
    it('should get business statistics successfully', async () => {
      // Arrange
      const mockStats = {
        totalAppointments: 100,
        totalRevenue: 5000,
        totalCustomers: 50,
        averageRating: 4.5
      };

      mockBusinessService.getBusinessStats.mockResolvedValue(mockStats);

      // Act
      await businessController.getBusinessStats(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessStats).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('updateBusinessHours', () => {
    it('should update business hours successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const businessHours = {
        monday: { open: '09:00', close: '18:00', isOpen: true },
        tuesday: { open: '09:00', close: '18:00', isOpen: true }
      };

      mockRequest.params = { id: businessId };
      mockRequest.body = { businessHours };

      const mockUpdatedHours = {
        id: 'business-123',
        businessHours
      };

      mockBusinessService.updateBusinessHours.mockResolvedValue(mockUpdatedHours);

      // Act
      await businessController.updateBusinessHours(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.updateBusinessHours).toHaveBeenCalledWith('user-123', businessId, businessHours);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedHours
      });
    });
  });

  describe('getBusinessHours', () => {
    it('should get business hours successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      const mockBusinessHours = {
        monday: { open: '09:00', close: '18:00', isOpen: true },
        tuesday: { open: '09:00', close: '18:00', isOpen: true }
      };

      mockBusinessService.getBusinessHours.mockResolvedValue(mockBusinessHours);

      // Act
      await businessController.getBusinessHours(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessHours).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinessHours
      });
    });
  });

  describe('getBusinessHoursStatus', () => {
    it('should get business hours status successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { id: businessId };

      const mockStatus = {
        isOpen: true,
        nextOpenTime: '2024-01-16T09:00:00Z',
        currentDay: 'monday'
      };

      mockBusinessService.getBusinessHoursStatus.mockResolvedValue(mockStatus);

      // Act
      await businessController.getBusinessHoursStatus(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessHoursStatus).toHaveBeenCalledWith(businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });
  });

  describe('checkSlugAvailability', () => {
    it('should check slug availability successfully', async () => {
      // Arrange
      const slug = 'test-business';
      mockRequest.query = { slug };

      const mockAvailability = {
        slug,
        isAvailable: true
      };

      mockBusinessService.checkSlugAvailability.mockResolvedValue(mockAvailability);

      // Act
      await businessController.checkSlugAvailability(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.checkSlugAvailability).toHaveBeenCalledWith(slug);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAvailability
      });
    });
  });

  describe('getAllBusinesses', () => {
    it('should get all businesses successfully', async () => {
      // Arrange
      const mockBusinesses = [
        { id: 'business-1', name: 'Business 1' },
        { id: 'business-2', name: 'Business 2' }
      ];

      mockBusinessService.getAllBusinesses.mockResolvedValue(mockBusinesses);

      // Act
      await businessController.getAllBusinesses(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getAllBusinesses).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinesses
      });
    });
  });

  describe('getBusinessesByType', () => {
    it('should get businesses by type successfully', async () => {
      // Arrange
      const businessTypeId = 'type-123';
      mockRequest.params = { typeId: businessTypeId };

      const mockBusinesses = [
        { id: 'business-1', name: 'Business 1', businessTypeId },
        { id: 'business-2', name: 'Business 2', businessTypeId }
      ];

      mockBusinessService.getBusinessesByType.mockResolvedValue(mockBusinesses);

      // Act
      await businessController.getBusinessesByType(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessesByType).toHaveBeenCalledWith(businessTypeId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinesses
      });
    });
  });

  describe('batchVerifyBusinesses', () => {
    it('should batch verify businesses successfully', async () => {
      // Arrange
      const businessIds = ['business-1', 'business-2'];
      mockRequest.body = { businessIds };

      const mockResult = {
        verified: 2,
        failed: 0,
        results: [
          { id: 'business-1', success: true },
          { id: 'business-2', success: true }
        ]
      };

      mockBusinessService.batchVerifyBusinesses.mockResolvedValue(mockResult);

      // Act
      await businessController.batchVerifyBusinesses(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.batchVerifyBusinesses).toHaveBeenCalledWith('user-123', businessIds);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('batchCloseBusinesses', () => {
    it('should batch close businesses successfully', async () => {
      // Arrange
      const businessIds = ['business-1', 'business-2'];
      const reason = 'Maintenance';
      mockRequest.body = { businessIds, reason };

      const mockResult = {
        closed: 2,
        failed: 0,
        results: [
          { id: 'business-1', success: true },
          { id: 'business-2', success: true }
        ]
      };

      mockBusinessService.batchCloseBusinesses.mockResolvedValue(mockResult);

      // Act
      await businessController.batchCloseBusinesses(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.batchCloseBusinesses).toHaveBeenCalledWith('user-123', businessIds, reason);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getAllBusinessesMinimalDetails', () => {
    it('should get all businesses with minimal details successfully', async () => {
      // Arrange
      const mockBusinesses = [
        { id: 'business-1', name: 'Business 1', slug: 'business-1' },
        { id: 'business-2', name: 'Business 2', slug: 'business-2' }
      ];

      mockBusinessService.getAllBusinessesMinimalDetails.mockResolvedValue(mockBusinesses);

      // Act
      await businessController.getAllBusinessesMinimalDetails(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getAllBusinessesMinimalDetails).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBusinesses
      });
    });
  });

  describe('getBusinessStaff', () => {
    it('should get business staff successfully', async () => {
      // Arrange
      const mockStaff = [
        { id: 'staff-1', name: 'Staff Member 1', role: 'STAFF' },
        { id: 'staff-2', name: 'Staff Member 2', role: 'MANAGER' }
      ];

      mockBusinessService.getBusinessStaff.mockResolvedValue(mockStaff);

      // Act
      await businessController.getBusinessStaff(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getBusinessStaff).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStaff
      });
    });
  });

  describe('inviteStaff', () => {
    it('should invite staff successfully', async () => {
      // Arrange
      const inviteData = {
        businessId: 'business-123',
        phoneNumber: '+905559876543',
        role: 'STAFF'
      };

      mockRequest.body = inviteData;

      const mockResult = {
        success: true,
        message: 'Staff invitation sent successfully'
      };

      mockBusinessService.inviteStaff.mockResolvedValue(mockResult);

      // Act
      await businessController.inviteStaff(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.inviteStaff).toHaveBeenCalledWith('user-123', inviteData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('verifyStaffInvitation', () => {
    it('should verify staff invitation successfully', async () => {
      // Arrange
      const verificationData = {
        businessId: 'business-123',
        phoneNumber: '+905559876543',
        verificationCode: '123456',
        role: 'STAFF'
      };

      mockRequest.body = verificationData;

      const mockResult = {
        success: true,
        message: 'Staff invitation verified successfully',
        staffMember: { id: 'staff-123', role: 'STAFF' }
      };

      mockBusinessService.verifyStaffInvitation.mockResolvedValue(mockResult);

      // Act
      await businessController.verifyStaffInvitation(mockRequest, mockResponse);

      // Assert
      expect(mockBusinessService.verifyStaffInvitation).toHaveBeenCalledWith('user-123', verificationData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getNotificationSettings', () => {
    it('should get notification settings successfully', async () => {
      // Arrange
      const mockSettings = {
        appointmentReminders: true,
        smsNotifications: true,
        emailNotifications: false
      };

      mockBusinessService.getNotificationSettings.mockResolvedValue(mockSettings);

      // Act
      await businessController.getNotificationSettings(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getNotificationSettings).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSettings
      });
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings successfully', async () => {
      // Arrange
      const settings = {
        appointmentReminders: true,
        smsNotifications: false,
        emailNotifications: true
      };

      mockBusinessContextRequest.body = settings;

      const mockUpdatedSettings = {
        id: 'business-123',
        ...settings
      };

      mockBusinessService.updateNotificationSettings.mockResolvedValue(mockUpdatedSettings);

      // Act
      await businessController.updateNotificationSettings(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.updateNotificationSettings).toHaveBeenCalledWith('user-123', 'business-123', settings);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });
  });

  describe('testReminder', () => {
    it('should test reminder successfully', async () => {
      // Arrange
      const mockResult = {
        success: true,
        message: 'Test reminder sent successfully'
      };

      mockBusinessService.testReminder.mockResolvedValue(mockResult);

      // Act
      await businessController.testReminder(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.testReminder).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getStaffPrivacySettings', () => {
    it('should get staff privacy settings successfully', async () => {
      // Arrange
      const mockSettings = {
        showStaffNames: true,
        showStaffPhotos: false,
        allowStaffBooking: true
      };

      mockBusinessService.getStaffPrivacySettings.mockResolvedValue(mockSettings);

      // Act
      await businessController.getStaffPrivacySettings(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.getStaffPrivacySettings).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSettings
      });
    });
  });

  describe('updateStaffPrivacySettings', () => {
    it('should update staff privacy settings successfully', async () => {
      // Arrange
      const settings = {
        showStaffNames: false,
        showStaffPhotos: true,
        allowStaffBooking: false
      };

      mockBusinessContextRequest.body = settings;

      const mockUpdatedSettings = {
        id: 'business-123',
        ...settings
      };

      mockBusinessService.updateStaffPrivacySettings.mockResolvedValue(mockUpdatedSettings);

      // Act
      await businessController.updateStaffPrivacySettings(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockBusinessService.updateStaffPrivacySettings).toHaveBeenCalledWith('user-123', 'business-123', settings);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });
  });
});
