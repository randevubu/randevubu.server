import { AuthService } from '../../../src/services/authService';
import { RepositoryContainer } from '../../../src/repositories';
import { PhoneVerificationService } from '../../../src/services/phoneVerificationService';
import { TokenService } from '../../../src/services/tokenService';
import { RBACService } from '../../../src/services/rbacService';
import { TestHelpers } from '../../utils/testHelpers';
import { testUsers } from '../../fixtures/testData';

// Mock dependencies
jest.mock('../../../src/services/phoneVerificationService');
jest.mock('../../../src/services/tokenService');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepositories: any;
  let mockPhoneVerificationService: any;
  let mockTokenService: any;
  let mockRBACService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories with all required methods
    mockRepositories = {
      userRepository: {
        create: jest.fn(),
        findById: jest.fn(),
        findByPhoneNumber: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
        incrementFailedAttempts: jest.fn(),
        getUserStats: jest.fn(),
        updateLastLogin: jest.fn(),
        markAsVerified: jest.fn(),
        updatePhoneNumber: jest.fn(),
        getMyCustomers: jest.fn(),
        getCustomerDetails: jest.fn(),
        findCustomersByUserBusinesses: jest.fn()
      },
      appointmentRepository: {
        getCustomerAppointmentStats: jest.fn()
      },
      userBehaviorRepository: {
        findByUserId: jest.fn()
      },
      phoneVerificationRepository: {
        create: jest.fn(),
        findValidCode: jest.fn(),
        markAsUsed: jest.fn(),
        delete: jest.fn(),
        invalidateUserVerifications: jest.fn()
      },
      refreshTokenRepository: {
        create: jest.fn(),
        findByToken: jest.fn(),
        revokeToken: jest.fn(),
        revokeAllUserTokens: jest.fn(),
        revokeAllByUserId: jest.fn(),
        revokeByToken: jest.fn(),
        delete: jest.fn()
      },
      auditLogRepository: {
        create: jest.fn()
      }
    };

    // Create mock services
    mockPhoneVerificationService = {
      verifyCode: jest.fn(),
      sendCode: jest.fn()
    };

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn()
    };

    mockRBACService = {
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [
          { name: 'OWNER', level: 50 },
          { name: 'STAFF', level: 10 }
        ],
        permissions: []
      }),
      hasPermission: jest.fn(),
      requirePermission: jest.fn()
    };

    // Initialize AuthService
    authService = new AuthService(
      mockRepositories,
      mockPhoneVerificationService,
      mockTokenService,
      mockRBACService
    );
  });

  describe('constructor', () => {
    it('should create AuthService instance', () => {
      expect(authService).toBeInstanceOf(AuthService);
    });
  });

  describe('registerOrLogin', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };

      const mockUser = {
        id: 'user-123',
        phoneNumber,
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: true,
        roles: [
          { name: 'OWNER', level: 50, displayName: undefined },
          { name: 'STAFF', level: 10, displayName: undefined }
        ],
        effectiveLevel: undefined
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      // Mock verification service to return success
      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });

      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(null);
      mockRepositories.userRepository.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokenPair.mockResolvedValue({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken
      });

      // Act
      const result = await authService.registerOrLogin(phoneNumber, verificationCode, deviceInfo);

      // Assert
      expect(result).toEqual({
        user: mockUser,
        tokens: {
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken
        },
        isNewUser: true
      });
      expect(mockPhoneVerificationService.verifyCode).toHaveBeenCalledWith(
        phoneNumber,
        verificationCode,
        'REGISTRATION',
        undefined
      );
    });

    it('should login existing user successfully', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };

      const mockUser = {
        id: 'user-123',
        phoneNumber,
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: true,
        roles: [
          { name: 'OWNER', level: 50, displayName: undefined },
          { name: 'STAFF', level: 10, displayName: undefined }
        ],
        effectiveLevel: undefined
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      // Mock verification service to return success
      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });

      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(mockUser);
      mockRepositories.userRepository.updateLastLogin.mockResolvedValue(undefined);
      mockTokenService.generateTokenPair.mockResolvedValue({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken
      });

      // Act
      const result = await authService.registerOrLogin(phoneNumber, verificationCode, deviceInfo);

      // Assert
      expect(result).toEqual({
        user: mockUser,
        tokens: {
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken
        },
        isNewUser: false
      });
    });

    it('should handle verification failure', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };

      // Mock verification service to return failure
      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: false,
        message: 'Invalid verification code'
      });

      // Act & Assert
      await expect(authService.registerOrLogin(phoneNumber, verificationCode, deviceInfo))
        .rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: true,
        roles: [
          { name: 'OWNER', level: 50, displayName: undefined },
          { name: 'STAFF', level: 10, displayName: undefined }
        ],
        effectiveLevel: undefined
      };

      mockRepositories.userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepositories.userRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'user-999';
      mockRepositories.userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getUserProfile(userId))
        .rejects.toThrow();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const mockUpdatedUser = {
        id: userId,
        phoneNumber: '+905551234567',
        ...updateData,
        isVerified: true,
        isActive: true,
        roles: [
          { name: 'OWNER', level: 50, displayName: undefined },
          { name: 'STAFF', level: 10, displayName: undefined }
        ],
        effectiveLevel: undefined
      };

      mockRepositories.userRepository.findById.mockResolvedValue({ id: userId });
      mockRepositories.userRepository.update.mockResolvedValue(mockUpdatedUser);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});

      // Act
      const result = await authService.updateUserProfile(userId, updateData);

      // Assert
      expect(result).toEqual(mockUpdatedUser);
      expect(mockRepositories.userRepository.update).toHaveBeenCalledWith(userId, updateData);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'user-999';
      const updateData = { firstName: 'Updated' };
      mockRepositories.userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.updateUserProfile(userId, updateData))
        .rejects.toThrow();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User'
      };
      
      mockRepositories.userRepository.findById.mockResolvedValue(mockUser);
      mockRepositories.userRepository.deactivate.mockResolvedValue(undefined);
      mockRepositories.refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);
      mockRepositories.phoneVerificationRepository.invalidateUserVerifications.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});

      // Act
      await authService.deactivateUser(userId);

      // Assert
      expect(mockRepositories.userRepository.deactivate).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'user-999';
      mockRepositories.userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.deactivateUser(userId))
        .rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token';
      mockRepositories.refreshTokenRepository.revokeByToken.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});

      // Act
      await authService.logout(userId, refreshToken);

      // Assert
      expect(mockRepositories.refreshTokenRepository.revokeByToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      // Arrange
      const mockStats = {
        totalUsers: 100,
        activeUsers: 80,
        verifiedUsers: 75,
        newUsersToday: 5,
        verificationRate: '75.00'
      };

      mockRepositories.userRepository.getUserStats.mockResolvedValue(mockStats);

      // Act
      const result = await authService.getUserStats();

      // Assert
      expect(result).toEqual(mockStats);
    });
  });

  describe('getUserProfileWithBusinessSummary', () => {
    it('should return user profile with business summary successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: true,
        roles: [
          { name: 'OWNER', level: 50, displayName: undefined },
          { name: 'STAFF', level: 10, displayName: undefined }
        ],
        effectiveLevel: undefined
      };

      const mockBusinessSummary = {
        totalBusinesses: 2,
        activeBusinesses: 1,
        totalAppointments: 50,
        upcomingAppointments: 5
      };

      mockRepositories.userRepository.findById.mockResolvedValue(mockUser);
      mockRepositories.userRepository.getUserStats.mockResolvedValue(mockBusinessSummary);

      // Act
      const result = await authService.getUserProfileWithBusinessSummary(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepositories.userRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'user-999';
      mockRepositories.userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getUserProfileWithBusinessSummary(userId))
        .rejects.toThrow();
    });

    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user-123';
      mockRepositories.userRepository.findById.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(authService.getUserProfileWithBusinessSummary(userId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('changePhoneNumber', () => {
    it('should change phone number successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const newPhoneNumber = '+905559876543';
      const verificationCode = '123456';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Test Browser' };

      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: true
      };

      const mockUpdatedUser = {
        ...mockUser,
        phoneNumber: newPhoneNumber
      };

      // Mock verification service to return success
      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });

      mockRepositories.userRepository.findById.mockResolvedValue(mockUser);
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(null);
      mockRepositories.userRepository.updatePhoneNumber.mockResolvedValue(undefined);
      mockRepositories.userRepository.findById.mockResolvedValue(mockUpdatedUser);
      mockRepositories.refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});

      // Act
      await authService.changePhoneNumber(userId, newPhoneNumber, verificationCode, context);

      // Assert
      expect(mockPhoneVerificationService.verifyCode).toHaveBeenCalledWith(
        newPhoneNumber,
        verificationCode,
        'PHONE_CHANGE',
        undefined
      );
      expect(mockRepositories.userRepository.updatePhoneNumber).toHaveBeenCalledWith(userId, newPhoneNumber);
      expect(mockRepositories.refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
    });

    it('should handle verification failure', async () => {
      // Arrange
      const userId = 'user-123';
      const newPhoneNumber = '+905559876543';
      const verificationCode = 'wrong-code';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Test Browser' };

      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        isVerified: true,
        isActive: true
      };

      mockRepositories.userRepository.findById.mockResolvedValue(mockUser);
      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: false,
        message: 'Invalid verification code'
      });

      // Act & Assert
      await expect(authService.changePhoneNumber(userId, newPhoneNumber, verificationCode, context))
        .rejects.toThrow();
  });

    it('should handle phone number already exists', async () => {
      // Arrange
      const userId = 'user-123';
      const newPhoneNumber = '+905559876543';
      const verificationCode = '123456';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Test Browser' };

      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        isVerified: true,
        isActive: true
      };

      const existingUser = {
        id: 'other-user-123',
        phoneNumber: newPhoneNumber
      };

      mockRepositories.userRepository.findById.mockResolvedValue(mockUser);
      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.changePhoneNumber(userId, newPhoneNumber, verificationCode, context))
        .rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'user-999';
      const newPhoneNumber = '+905559876543';
      const verificationCode = '123456';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Test Browser' };

      mockRepositories.userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.changePhoneNumber(userId, newPhoneNumber, verificationCode, context))
        .rejects.toThrow();
    });
  });

  describe('getMyCustomers', () => {
    it('should return customers with filters', async () => {
      // Arrange
      const userId = 'user-123';
      const filters = {
        search: 'test',
        limit: 10,
        offset: 0
      };

      const mockCustomers = [
        {
          id: 'customer-1',
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber: '+905551234567',
          totalAppointments: 5,
          lastAppointment: new Date()
        },
        {
          id: 'customer-2',
          firstName: 'Another',
          lastName: 'Customer',
          phoneNumber: '+905559876543',
          totalAppointments: 3,
          lastAppointment: new Date()
        }
      ];

      mockRepositories.userRepository.findCustomersByUserBusinesses.mockResolvedValue(mockCustomers);

      // Act
      const result = await authService.getMyCustomers(userId, filters);

      // Assert
      expect(result).toEqual(mockCustomers);
      expect(mockRepositories.userRepository.findCustomersByUserBusinesses).toHaveBeenCalledWith(userId, filters);
    });

    it('should return customers without filters', async () => {
      // Arrange
      const userId = 'user-123';
      const mockCustomers = [
        {
          id: 'customer-1',
          firstName: 'Test',
          lastName: 'Customer',
          phoneNumber: '+905551234567',
          totalAppointments: 5,
          lastAppointment: new Date()
        }
      ];

      mockRepositories.userRepository.findCustomersByUserBusinesses.mockResolvedValue(mockCustomers);

      // Act
      const result = await authService.getMyCustomers(userId);

      // Assert
      expect(result).toEqual(mockCustomers);
      expect(mockRepositories.userRepository.findCustomersByUserBusinesses).toHaveBeenCalledWith(userId, undefined);
    });

    it('should handle empty results', async () => {
      // Arrange
      const userId = 'user-123';
      const filters = { search: 'nonexistent' };

      mockRepositories.userRepository.findCustomersByUserBusinesses.mockResolvedValue([]);

      // Act
      const result = await authService.getMyCustomers(userId, filters);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user-123';
      const filters = { search: 'test' };

      mockRepositories.userRepository.findCustomersByUserBusinesses.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(authService.getMyCustomers(userId, filters))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getCustomerDetails', () => {
    it('should return customer details successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const customerId = 'customer-456';
      const mockCustomerDetails = {
        id: customerId,
        firstName: 'Test',
        lastName: 'Customer',
        phoneNumber: '+905551234567',
        email: 'customer@example.com',
        totalAppointments: 10,
        upcomingAppointments: 2,
        lastAppointment: new Date(),
        notes: 'Regular customer',
        preferences: {
          preferredTime: 'morning',
          services: ['haircut', 'styling']
        }
      };

      // Mock RBAC service to return business role
      mockRBACService.getUserPermissions.mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50 }],
        permissions: []
      });

      // Mock customer lookup
      mockRepositories.userRepository.findById.mockResolvedValue(mockCustomerDetails);
      
      // Mock customer accessibility check
      mockRepositories.userRepository.findCustomersByUserBusinesses.mockResolvedValue({
        customers: [mockCustomerDetails],
        total: 1
      });

      // Mock appointment statistics
      mockRepositories.appointmentRepository.getCustomerAppointmentStats.mockResolvedValue({
        totalAppointments: 10,
        upcomingAppointments: 2,
        lastAppointment: new Date()
      });

      // Mock user behavior
      mockRepositories.userBehaviorRepository.findByUserId.mockResolvedValue({
        isBanned: false,
        reliabilityScore: 85
      });

      // Act
      const result = await authService.getCustomerDetails(userId, customerId);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: customerId,
        firstName: 'Test',
        lastName: 'Customer',
        phoneNumber: '+905551234567',
        totalAppointments: 10
      }));
      expect(mockRepositories.userRepository.findById).toHaveBeenCalledWith(customerId);
    });

    it('should handle customer not found', async () => {
      // Arrange
      const userId = 'user-123';
      const customerId = 'customer-999';

      mockRepositories.userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getCustomerDetails(userId, customerId))
        .rejects.toThrow();
    });

    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user-123';
      const customerId = 'customer-456';

      // Mock RBAC service to return business role
      mockRBACService.getUserPermissions.mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50 }],
        permissions: []
      });

      mockRepositories.userRepository.findById.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(authService.getCustomerDetails(userId, customerId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('registerOrLogin - Additional Test Cases', () => {
    it('should handle unverified user login attempt', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };
      
      const mockUnverifiedUser = {
        id: 'user-123',
        phoneNumber,
        firstName: 'Test',
        lastName: 'User',
        isVerified: false,
        isActive: true,
        roles: [
          { name: 'OWNER', level: 50, displayName: undefined },
          { name: 'STAFF', level: 10, displayName: undefined }
        ],
        effectiveLevel: undefined
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });
      
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(mockUnverifiedUser);
      mockRepositories.userRepository.markAsVerified.mockResolvedValue(undefined);
      mockRepositories.userRepository.updateLastLogin.mockResolvedValue(undefined);
      mockTokenService.generateTokenPair.mockResolvedValue(mockTokens);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});

      // Act
      const result = await authService.registerOrLogin(phoneNumber, verificationCode, deviceInfo);

      // Assert - The user should be marked as verified and login should succeed
      expect(result).toEqual({
        user: { ...mockUnverifiedUser, isVerified: true },
        tokens: mockTokens,
        isNewUser: false
      });
      expect(mockRepositories.userRepository.markAsVerified).toHaveBeenCalledWith(mockUnverifiedUser.id);
    });

    it('should handle inactive user login attempt', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };
      
      const mockInactiveUser = {
        id: 'user-123',
        phoneNumber,
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isActive: false
      };

      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });
      
      mockRepositories.userRepository.findByPhoneNumber.mockResolvedValue(mockInactiveUser);

      // Act & Assert
      await expect(authService.registerOrLogin(phoneNumber, verificationCode, deviceInfo))
        .rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };

      mockPhoneVerificationService.verifyCode.mockResolvedValue({
        success: true,
        message: 'Verification successful'
      });
      
      mockRepositories.userRepository.findByPhoneNumber.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(authService.registerOrLogin(phoneNumber, verificationCode, deviceInfo))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle malformed phone numbers', async () => {
      // Arrange
      const invalidPhoneNumber = 'invalid-phone';
      const verificationCode = '123456';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };

      // Act & Assert
      await expect(authService.registerOrLogin(invalidPhoneNumber, verificationCode, deviceInfo))
        .rejects.toThrow();
    });

    it('should handle empty verification code', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const emptyCode = '';
      const deviceInfo = { ip: '127.0.0.1', userAgent: 'test' };

      // Act & Assert
      await expect(authService.registerOrLogin(phoneNumber, emptyCode, deviceInfo))
        .rejects.toThrow();
    });
  });

  describe('logout - Additional Test Cases', () => {
    it('should handle invalid refresh token', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidRefreshToken = 'invalid-token';

      mockRepositories.refreshTokenRepository.revokeByToken.mockRejectedValue(
        new Error('Token not found')
      );

      // Act & Assert
      await expect(authService.logout(userId, invalidRefreshToken))
        .rejects.toThrow('Token not found');
    });

    it('should handle database errors during logout', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'valid-token';

      mockRepositories.refreshTokenRepository.revokeByToken.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(authService.logout(userId, refreshToken))
        .rejects.toThrow('Database connection failed');
    });
  });
});