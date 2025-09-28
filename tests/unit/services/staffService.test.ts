import { StaffService } from '../../../src/services/staffService';
import { RepositoryContainer } from '../../../src/repositories';
import { PhoneVerificationService } from '../../../src/services/phoneVerificationService';
import { RBACService } from '../../../src/services/rbacService';
import { UsageService } from '../../../src/services/usageService';
import { TestHelpers } from '../../utils/testHelpers';
import { testUsers } from '../../fixtures/testData';
import { PermissionName } from '../../../src/types/auth';
import { BusinessStaffRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/repositories');
jest.mock('../../../src/services/phoneVerificationService');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/services/usageService');
jest.mock('../../../src/utils/logger');

describe('StaffService', () => {
  let staffService: StaffService;
  let mockRepositories: any;
  let mockPhoneVerificationService: any;
  let mockRBACService: any;
  let mockUsageService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockRepositories = {
      staffRepository: {
        create: jest.fn(),
        findById: jest.fn(),
        findByBusinessId: jest.fn(),
        findByUserId: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn(),
        findPublicByBusinessId: jest.fn(),
        transferBetweenBusinesses: jest.fn()
      },
      userRepository: {
        findByPhoneNumber: jest.fn(),
        findById: jest.fn()
      },
      businessRepository: {
        findById: jest.fn()
      }
    };

    mockPhoneVerificationService = {
      sendCode: jest.fn(),
      verifyCode: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn(),
      assignRole: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50, displayName: 'Owner' }],
        permissions: []
      })
    };

    mockUsageService = {
      canAddStaffMember: jest.fn().mockResolvedValue({ allowed: true }),
      updateStaffUsage: jest.fn()
    };

    // Create StaffService instance
    staffService = new StaffService(
      mockRepositories,
      mockPhoneVerificationService,
      mockRBACService,
      mockUsageService
    );
  });

  describe('constructor', () => {
    it('should create StaffService instance', () => {
      expect(staffService).toBeInstanceOf(StaffService);
    });
  });

  describe('inviteStaff', () => {
    it('should invite staff successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const inviteData = {
        businessId: 'business-123',
        phoneNumber: '+905551234567',
        role: BusinessStaffRole.STAFF,
        permissions: {}
      };

      const mockStaff = {
        id: 'staff-123',
        businessId: 'business-123',
        userId: 'invited-user-123',
        role: BusinessStaffRole.STAFF,
        isActive: true
      };

      mockRepositories.businessRepository.findById.mockResolvedValue({ id: businessId, ownerId: userId });
      mockUsageService.canAddStaffMember.mockResolvedValue({ allowed: true });
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue({ id: 'invited-user-123' });
      mockRepositories.staffRepository.create.mockResolvedValue(mockStaff);

      // Act
      const result = await staffService.inviteStaff(userId, inviteData);

      // Assert
      expect(result).toEqual({
        success: true,
        staffMember: mockStaff
      });
      expect(mockRepositories.staffRepository.create).toHaveBeenCalled();
      expect(mockUsageService.updateStaffUsage).toHaveBeenCalledWith(businessId);
    });

    it('should throw error when business not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-999';
      const inviteData = {
        businessId: 'business-123',
        phoneNumber: '+905551234567',
        role: BusinessStaffRole.STAFF
      };

      mockRepositories.businessRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.inviteStaff(userId, inviteData))
        .rejects.toThrow('Business not found');
    });

    it('should throw error when usage limit exceeded', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const inviteData = {
        businessId: 'business-123',
        phoneNumber: '+905551234567',
        role: BusinessStaffRole.STAFF
      };

      mockRepositories.businessRepository.findById.mockResolvedValue({ id: businessId, ownerId: userId });
      mockUsageService.canAddStaffMember.mockResolvedValue({ 
        allowed: false, 
        reason: 'Staff limit exceeded' 
      });

      // Act & Assert
      await expect(staffService.inviteStaff(userId, inviteData))
        .rejects.toThrow('Staff limit exceeded');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const inviteData = {
        businessId: 'business-123',
        phoneNumber: '+905551234567',
        role: BusinessStaffRole.STAFF
      };

      mockRepositories.businessRepository.findById.mockResolvedValue({ id: businessId, ownerId: userId });
      mockUsageService.canAddStaffMember.mockResolvedValue({ allowed: true });
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(staffService.inviteStaff(userId, inviteData))
        .rejects.toThrow('User not found with this phone number');
    });
  });

  describe('verifyStaffInvitation', () => {
    it('should verify staff invitation successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const verificationData = {
        businessId: 'business-123',
        phoneNumber: '+905551234567',
        verificationCode: '123456',
        role: BusinessStaffRole.STAFF
      };

      const mockStaff = {
        id: 'staff-123',
        businessId: 'business-123',
        userId: 'invited-user-123',
        role: BusinessStaffRole.STAFF,
        isActive: true
      };

      mockPhoneVerificationService.verifyCode.mockResolvedValue(true);
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue({ id: 'invited-user-123' });
      mockRepositories.staffRepository.findByUserId.mockResolvedValue(mockStaff);

      // Act
      const result = await staffService.verifyStaffInvitation(userId, verificationData);

      // Assert
      expect(result).toEqual({
        success: true,
        staffMember: mockStaff
      });
      expect(mockPhoneVerificationService.verifyCode).toHaveBeenCalledWith(
        verificationData.phoneNumber,
        verificationData.verificationCode,
        'STAFF_INVITATION'
      );
    });

    it('should throw error when verification fails', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const verificationData = {
        businessId: 'business-123',
        phoneNumber: '+905551234567',
        verificationCode: 'wrong-code',
        role: BusinessStaffRole.STAFF
      };

      mockPhoneVerificationService.verifyCode.mockResolvedValue(false);

      // Act & Assert
      await expect(staffService.verifyStaffInvitation(userId, verificationData))
        .rejects.toThrow('Invalid verification code');
    });
  });

  describe('getBusinessStaff', () => {
    it('should return business staff successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockStaff = [
        { id: 'staff-1', businessId: 'business-123', role: BusinessStaffRole.STAFF },
        { id: 'staff-2', businessId: 'business-123', role: BusinessStaffRole.MANAGER }
      ];

      mockRepositories.staffRepository.findByBusinessId.mockResolvedValue(mockStaff);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await staffService.getBusinessStaff(userId, businessId);

      // Assert
      expect(result).toEqual(mockStaff);
      expect(mockRepositories.staffRepository.findByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getStaffById', () => {
    it('should return staff member when found', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-123';
      const mockStaff = {
        id: staffId,
        businessId: 'business-123',
        userId: 'user-456',
        role: BusinessStaffRole.STAFF
      };

      mockRepositories.staffRepository.findById.mockResolvedValue(mockStaff);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await staffService.getStaffById(staffId);

      // Assert
      expect(result).toEqual(mockStaff);
      expect(mockRepositories.staffRepository.findById).toHaveBeenCalledWith(staffId);
    });

    it('should throw error when staff not found', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-999';

      mockRepositories.staffRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(staffService.getStaffById(staffId))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('updateStaff', () => {
    it('should update staff successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-123';
      const updateData = {
        role: BusinessStaffRole.MANAGER,
        permissions: { canManageAppointments: true }
      };

      const mockStaff = {
        id: staffId,
        businessId: 'business-123',
        ...updateData
      };

      mockRepositories.staffRepository.findById.mockResolvedValue(mockStaff);
      mockRepositories.staffRepository.update.mockResolvedValue(mockStaff);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await staffService.updateStaff(userId, staffId, updateData);

      // Assert
      expect(result).toEqual(mockStaff);
      expect(mockRepositories.staffRepository.update).toHaveBeenCalledWith(staffId, updateData);
    });

    it('should throw error when staff not found', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-999';
      const updateData = { role: BusinessStaffRole.MANAGER };

      mockRepositories.staffRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(staffService.updateStaff(userId, staffId, updateData))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('removeStaff', () => {
    it('should remove staff successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-123';

      const mockStaff = {
        id: staffId,
        businessId: 'business-123',
        userId: 'user-456'
      };

      mockRepositories.staffRepository.findById.mockResolvedValue(mockStaff);
      mockRepositories.staffRepository.delete.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await staffService.removeStaff(userId, staffId);

      // Assert
      expect(mockRepositories.staffRepository.delete).toHaveBeenCalledWith(staffId);
    });

    it('should throw error when staff not found', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-999';

      mockRepositories.staffRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(staffService.removeStaff(userId, staffId))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('getStaffStats', () => {
    it('should return staff statistics successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockStats = {
        total: 5,
        active: 4,
        inactive: 1,
        byRole: {
          OWNER: 1,
          MANAGER: 1,
          STAFF: 2,
          RECEPTIONIST: 1
        }
      };

      mockRepositories.staffRepository.getStats.mockResolvedValue(mockStats);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await staffService.getStaffStats(userId, businessId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepositories.staffRepository.getStats).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getPublicBusinessStaff', () => {
    it('should return public business staff successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const mockStaff = [
        {
          id: 'staff-1',
          role: BusinessStaffRole.STAFF,
          displayName: 'John Doe',
          isActive: true
        },
        {
          id: 'staff-2',
          role: BusinessStaffRole.MANAGER,
          displayName: 'Jane Smith',
          isActive: true
        }
      ];

      mockRepositories.staffRepository.findPublicByBusinessId.mockResolvedValue(mockStaff);

      // Act
      const result = await staffService.getPublicBusinessStaff(businessId);

      // Assert
      expect(result).toEqual(mockStaff);
      expect(mockRepositories.staffRepository.findPublicByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('transferStaffBetweenBusinesses', () => {
    it('should transfer staff between businesses successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-123';
      const fromBusinessId = 'business-123';
      const toBusinessId = 'business-456';

      const mockStaff = {
        id: staffId,
        businessId: fromBusinessId,
        userId: 'user-456'
      };

      mockRepositories.staffRepository.findById.mockResolvedValue(mockStaff);
      mockRepositories.staffRepository.transferBetweenBusinesses.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await staffService.transferStaffBetweenBusinesses(userId, [staffId], fromBusinessId, toBusinessId);

      // Assert
      expect(mockRepositories.staffRepository.transferBetweenBusinesses).toHaveBeenCalledWith(
        staffId,
        fromBusinessId,
        toBusinessId
      );
    });

    it('should throw error when staff not found', async () => {
      // Arrange
      const userId = 'user-123';
      const staffId = 'staff-999';
      const fromBusinessId = 'business-123';
      const toBusinessId = 'business-456';

      mockRepositories.staffRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(staffService.transferStaffBetweenBusinesses(userId, [staffId], fromBusinessId, toBusinessId))
        .rejects.toThrow('Staff member not found');
    });
  });

  describe('validateBusinessOwnerPermission', () => {
    it('should validate business owner permission successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      mockRepositories.businessRepository.findById.mockResolvedValue({ id: businessId, ownerId: userId });

      // Act
      await (staffService as any).validateBusinessOwnerPermission(userId, businessId);

      // Assert
      expect(mockRepositories.businessRepository.findById).toHaveBeenCalledWith(businessId);
    });

    it('should throw error when business not found', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-999';

      mockRepositories.businessRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect((staffService as any).validateBusinessOwnerPermission(userId, businessId))
        .rejects.toThrow('Business not found');
    });

    it('should throw error when user is not owner', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      mockRepositories.businessRepository.findById.mockResolvedValue({ id: businessId, ownerId: 'other-user' });

      // Act & Assert
      await expect((staffService as any).validateBusinessOwnerPermission(userId, businessId))
        .rejects.toThrow('Access denied: Only business owner can perform this action');
    });
  });

  describe('validateBusinessAccess', () => {
    it('should validate business access successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      mockRBACService.hasPermission.mockResolvedValue(true);

      // Act
      await (staffService as any).validateBusinessAccess(userId, businessId);

      // Assert
      expect(mockRBACService.hasPermission).toHaveBeenCalledWith(userId, 'staff', 'manage_own', { businessId });
    });

    it('should throw error when access denied', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      mockRBACService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect((staffService as any).validateBusinessAccess(userId, businessId))
        .rejects.toThrow('Access denied: You do not have permission to manage staff for this business');
    });
  });

  describe('validateStaffLimit', () => {
    it('should validate staff limit successfully', async () => {
      // Arrange
      const businessId = 'business-123';

      mockUsageService.canAddStaffMember.mockResolvedValue({ allowed: true });

      // Act
      await (staffService as any).validateStaffLimit(businessId);

      // Assert
      expect(mockUsageService.canAddStaffMember).toHaveBeenCalledWith(businessId);
    });

    it('should throw error when staff limit exceeded', async () => {
      // Arrange
      const businessId = 'business-123';

      mockUsageService.canAddStaffMember.mockResolvedValue({ 
        allowed: false, 
        reason: 'Staff limit exceeded' 
      });

      // Act & Assert
      await expect((staffService as any).validateStaffLimit(businessId))
        .rejects.toThrow('Staff limit exceeded');
    });
  });

  describe('findUserIdByPhone', () => {
    it('should find user ID by phone successfully', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const mockUser = { id: 'user-123', phoneNumber };

      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(mockUser);

      // Act
      const result = await (staffService as any).findUserIdByPhone(phoneNumber);

      // Assert
      expect(result).toBe('user-123');
      expect(mockRepositories.userRepository.findByPhoneNumber).toHaveBeenCalledWith(phoneNumber);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const phoneNumber = '+905551234567';

      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(null);

      // Act
      const result = await (staffService as any).findUserIdByPhone(phoneNumber);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize phone number correctly', () => {
      // Arrange
      const phoneNumber = '0555 123 45 67';

      // Act
      const result = (staffService as any).normalizePhoneNumber(phoneNumber);

      // Assert
      expect(result).toBe('+905551234567');
    });

    it('should return null for invalid phone number', () => {
      // Arrange
      const phoneNumber = 'invalid-phone';

      // Act
      const result = (staffService as any).normalizePhoneNumber(phoneNumber);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask phone number correctly', () => {
      // Arrange
      const phoneNumber = '+905551234567';

      // Act
      const result = (staffService as any).maskPhoneNumber(phoneNumber);

      // Assert
      expect(result).toBe('+9055***4567');
    });
  });
});
