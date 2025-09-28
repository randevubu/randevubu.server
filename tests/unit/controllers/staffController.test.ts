import { Request, Response } from 'express';
import { StaffController } from '../../../src/controllers/staffController';
import { StaffService } from '../../../src/services/staffService';
import { TestHelpers } from '../../utils/testHelpers';
import { AuthenticatedRequest } from '../../../src/types/auth';
import { BusinessContextRequest } from '../../../src/middleware/businessContext';

// Mock dependencies
jest.mock('../../../src/services/staffService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('StaffController', () => {
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
      getStaffMember: jest.fn(),
      updateStaffMember: jest.fn(),
      removeStaffMember: jest.fn(),
      getStaffStats: jest.fn(),
      getStaffByRole: jest.fn(),
      getMyStaffPositions: jest.fn(),
      transferStaff: jest.fn(),
      bulkInviteStaff: jest.fn(),
      getAvailableRoles: jest.fn(),
      getPublicBusinessStaff: jest.fn()
    };

    // Create StaffController instance
    staffController = new StaffController(mockStaffService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };
    mockBusinessContextRequest.business = { id: 'business-123', name: 'Test Business' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create StaffController instance', () => {
      expect(staffController).toBeInstanceOf(StaffController);
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

      mockStaffService.inviteStaff.mockResolvedValue(mockResult);

      // Act
      await staffController.inviteStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.inviteStaff).toHaveBeenCalledWith('user-123', inviteData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
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

      mockStaffService.verifyStaffInvitation.mockResolvedValue(mockResult);

      // Act
      await staffController.verifyStaffInvitation(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.verifyStaffInvitation).toHaveBeenCalledWith('user-123', verificationData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
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

      mockStaffService.getBusinessStaff.mockResolvedValue(mockStaff);

      // Act
      await staffController.getBusinessStaff(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockStaffService.getBusinessStaff).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStaff
      });
    });
  });

  describe('getStaffMember', () => {
    it('should get staff member successfully', async () => {
      // Arrange
      const staffId = 'staff-123';
      mockRequest.params = { id: staffId };

      const mockStaffMember = {
        id: staffId,
        name: 'Staff Member',
        role: 'STAFF',
        businessId: 'business-123'
      };

      mockStaffService.getStaffMember.mockResolvedValue(mockStaffMember);

      // Act
      await staffController.getStaffMember(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.getStaffMember).toHaveBeenCalledWith('user-123', staffId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStaffMember
      });
    });
  });

  describe('updateStaffMember', () => {
    it('should update staff member successfully', async () => {
      // Arrange
      const staffId = 'staff-123';
      const updateData = {
        role: 'MANAGER',
        permissions: ['MANAGE_APPOINTMENTS']
      };

      mockRequest.params = { id: staffId };
      mockRequest.body = updateData;

      const mockUpdatedStaff = {
        id: staffId,
        ...updateData
      };

      mockStaffService.updateStaffMember.mockResolvedValue(mockUpdatedStaff);

      // Act
      await staffController.updateStaffMember(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.updateStaffMember).toHaveBeenCalledWith('user-123', staffId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedStaff
      });
    });
  });

  describe('removeStaffMember', () => {
    it('should remove staff member successfully', async () => {
      // Arrange
      const staffId = 'staff-123';
      mockRequest.params = { id: staffId };

      mockStaffService.removeStaffMember.mockResolvedValue(undefined);

      // Act
      await staffController.removeStaffMember(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.removeStaffMember).toHaveBeenCalledWith('user-123', staffId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff member removed successfully'
      });
    });
  });

  describe('getStaffStats', () => {
    it('should get staff statistics successfully', async () => {
      // Arrange
      const mockStats = {
        totalStaff: 5,
        activeStaff: 4,
        staffByRole: {
          STAFF: 3,
          MANAGER: 1,
          ADMIN: 1
        }
      };

      mockStaffService.getStaffStats.mockResolvedValue(mockStats);

      // Act
      await staffController.getStaffStats(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockStaffService.getStaffStats).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getStaffByRole', () => {
    it('should get staff by role successfully', async () => {
      // Arrange
      const role = 'STAFF';
      mockBusinessContextRequest.query = { role };

      const mockStaff = [
        { id: 'staff-1', name: 'Staff Member 1', role: 'STAFF' },
        { id: 'staff-2', name: 'Staff Member 2', role: 'STAFF' }
      ];

      mockStaffService.getStaffByRole.mockResolvedValue(mockStaff);

      // Act
      await staffController.getStaffByRole(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockStaffService.getStaffByRole).toHaveBeenCalledWith('user-123', 'business-123', role);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStaff
      });
    });
  });

  describe('getMyStaffPositions', () => {
    it('should get my staff positions successfully', async () => {
      // Arrange
      const mockPositions = [
        { businessId: 'business-1', role: 'STAFF', businessName: 'Business 1' },
        { businessId: 'business-2', role: 'MANAGER', businessName: 'Business 2' }
      ];

      mockStaffService.getMyStaffPositions.mockResolvedValue(mockPositions);

      // Act
      await staffController.getMyStaffPositions(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.getMyStaffPositions).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPositions
      });
    });
  });

  describe('transferStaff', () => {
    it('should transfer staff successfully', async () => {
      // Arrange
      const transferData = {
        staffIds: ['staff-1', 'staff-2'],
        fromBusinessId: 'business-1',
        toBusinessId: 'business-2'
      };

      mockRequest.body = transferData;

      const mockResult = {
        success: true,
        message: 'Staff transferred successfully',
        transferred: 2
      };

      mockStaffService.transferStaff.mockResolvedValue(mockResult);

      // Act
      await staffController.transferStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.transferStaff).toHaveBeenCalledWith('user-123', transferData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('bulkInviteStaff', () => {
    it('should bulk invite staff successfully', async () => {
      // Arrange
      const bulkInviteData = {
        businessId: 'business-123',
        invitations: [
          { phoneNumber: '+905551234567', role: 'STAFF' },
          { phoneNumber: '+905559876543', role: 'MANAGER' }
        ]
      };

      mockRequest.body = bulkInviteData;

      const mockResult = {
        success: true,
        message: 'Bulk staff invitations sent successfully',
        sent: 2,
        failed: 0
      };

      mockStaffService.bulkInviteStaff.mockResolvedValue(mockResult);

      // Act
      await staffController.bulkInviteStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.bulkInviteStaff).toHaveBeenCalledWith('user-123', bulkInviteData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getAvailableRoles', () => {
    it('should get available roles successfully', async () => {
      // Arrange
      const mockRoles = [
        { name: 'STAFF', level: 10, displayName: 'Staff Member' },
        { name: 'MANAGER', level: 20, displayName: 'Manager' },
        { name: 'ADMIN', level: 30, displayName: 'Administrator' }
      ];

      mockStaffService.getAvailableRoles.mockResolvedValue(mockRoles);

      // Act
      await staffController.getAvailableRoles(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.getAvailableRoles).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
      });
    });
  });

  describe('getPublicBusinessStaff', () => {
    it('should get public business staff successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockPublicStaff = [
        { id: 'staff-1', name: 'Staff Member 1', role: 'STAFF', showName: true },
        { id: 'staff-2', name: 'Staff Member 2', role: 'MANAGER', showName: true }
      ];

      mockStaffService.getPublicBusinessStaff.mockResolvedValue(mockPublicStaff);

      // Act
      await staffController.getPublicBusinessStaff(mockRequest, mockResponse);

      // Assert
      expect(mockStaffService.getPublicBusinessStaff).toHaveBeenCalledWith(businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPublicStaff
      });
    });
  });
});
