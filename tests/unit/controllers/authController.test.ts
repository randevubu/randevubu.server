import { Request, Response } from 'express';
import { AuthController } from '../../../src/controllers/authController';
import { AuthService } from '../../../src/services/authService';
import { PhoneVerificationService } from '../../../src/services/phoneVerificationService';
import { TokenService } from '../../../src/services/tokenService';
import { RBACService } from '../../../src/services/rbacService';
import { TestHelpers } from '../../utils/testHelpers';
import { GuaranteedAuthRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/authService');
jest.mock('../../../src/services/phoneVerificationService');
jest.mock('../../../src/services/tokenService');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: any;
  let mockPhoneVerificationService: any;
  let mockTokenService: any;
  let mockRBACService: any;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockGuaranteedAuthRequest: GuaranteedAuthRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock services
    mockAuthService = {
      registerOrLogin: jest.fn(),
      logout: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      changePhoneNumber: jest.fn(),
      deactivateUser: jest.fn(),
      getUserProfileWithBusinessSummary: jest.fn(),
      getMyCustomers: jest.fn(),
      getCustomerDetails: jest.fn()
    };

    mockPhoneVerificationService = {
      sendVerificationCode: jest.fn(),
      verifyCode: jest.fn()
    };

    mockTokenService = {
      generateTokenPair: jest.fn(),
      refreshAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn()
    };

    mockRBACService = {
      getUserPermissions: jest.fn(),
      hasPermission: jest.fn()
    };

    // Create AuthController instance
    authController = new AuthController(
      mockAuthService,
      mockPhoneVerificationService,
      mockTokenService,
      mockRBACService
    );

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();

    mockGuaranteedAuthRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockGuaranteedAuthRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };
  });

  describe('constructor', () => {
    it('should create AuthController instance', () => {
      expect(authController).toBeInstanceOf(AuthController);
    });
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully', async () => {
      // Arrange
      const requestData = {
        phoneNumber: '+905551234567',
        purpose: 'REGISTRATION'
      };

      mockRequest.body = requestData;
      (mockRequest as any).ip = '192.168.1.1';
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const mockResult = {
        success: true,
        message: 'Verification code sent successfully'
      };

      mockPhoneVerificationService.sendVerificationCode.mockResolvedValue(mockResult);

      // Act
      await authController.sendVerificationCode(mockRequest, mockResponse);

      // Assert
      expect(mockPhoneVerificationService.sendVerificationCode).toHaveBeenCalledWith({
        phoneNumber: requestData.phoneNumber,
        purpose: requestData.purpose,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
        data: {
          phoneNumber: '+9055****4567',
          expiresIn: 600,
          purpose: 'REGISTRATION'
        }
      });
    });

    it('should handle rate limiting error', async () => {
      // Arrange
      const requestData = {
        phoneNumber: '+905551234567',
        purpose: 'REGISTRATION'
      };

      mockRequest.body = requestData;
      (mockRequest as any).ip = '192.168.1.1';
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const mockResult = {
        success: false,
        message: 'Too many requests',
        cooldownSeconds: 60
      };

      mockPhoneVerificationService.sendVerificationCode.mockResolvedValue(mockResult);

      // Act
      await authController.sendVerificationCode(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: mockResult.message,
        error: {
          message: mockResult.message,
          retryAfter: 60
        }
      });
    });
  });

  describe('verifyLogin', () => {
    it('should verify login successfully', async () => {
      // Arrange
      const requestData = {
        phoneNumber: '+905551234567',
        code: '123456',
        purpose: 'REGISTRATION'
      };

      mockRequest.body = requestData;
      (mockRequest as any).ip = '192.168.1.1';
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const mockResult = {
        user: {
          id: 'user-123',
          phoneNumber: '+905551234567',
          isVerified: true
        },
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123'
        },
        isNewUser: false
      };

      mockAuthService.registerOrLogin.mockResolvedValue(mockResult);

      // Act
      await authController.verifyLogin(mockRequest, mockResponse);

      // Assert
      expect(mockAuthService.registerOrLogin).toHaveBeenCalledWith(
        requestData.phoneNumber,
        requestData.code,
        requestData.purpose,
        {
          deviceId: undefined,
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1'
        }
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-123', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully with cookie', async () => {
      // Arrange
      const refreshToken = 'refresh-token-123';
      mockRequest.cookies = { refreshToken };
      mockRequest.body = {};

      const mockTokens = {
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-123'
      };

      mockTokenService.refreshAccessToken.mockResolvedValue(mockTokens);

      // Act
      await authController.refreshToken(mockRequest, mockResponse);

      // Assert
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh-token-123', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should refresh token successfully with body token', async () => {
      // Arrange
      const refreshToken = 'refresh-token-123';
      mockRequest.cookies = {};
      mockRequest.body = { refreshToken };

      const mockTokens = {
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-123'
      };

      mockTokenService.refreshAccessToken.mockResolvedValue(mockTokens);

      // Act
      await authController.refreshToken(mockRequest, mockResponse);

      // Assert
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing refresh token', async () => {
      // Arrange
      mockRequest.cookies = {};
      mockRequest.body = {};

      // Act
      await authController.refreshToken(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token is required',
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
          details: 'No refresh token provided in cookies or request body'
        }
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const requestData = {
        refreshToken: 'refresh-token-123'
      };

      mockGuaranteedAuthRequest.body = requestData;

      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await authController.logout(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'user-123',
        requestData.refreshToken
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-123',
        phoneNumber: '+905551234567',
        firstName: 'John',
        lastName: 'Doe',
        isVerified: true
      };

      mockAuthService.getUserProfile.mockResolvedValue(mockProfile);

      // Act
      await authController.getProfile(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved successfully',
        data: mockProfile
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      mockGuaranteedAuthRequest.body = requestData;

      const mockUpdatedProfile = {
        id: 'user-123',
        phoneNumber: '+905551234567',
        ...requestData,
        isVerified: true
      };

      mockAuthService.updateUserProfile.mockResolvedValue(mockUpdatedProfile);

      // Act
      await authController.updateProfile(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith('user-123', requestData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockUpdatedProfile
      });
    });
  });

  describe('changePhone', () => {
    it('should change phone number successfully', async () => {
      // Arrange
      const requestData = {
        newPhoneNumber: '+905559876543',
        verificationCode: '123456'
      };

      mockGuaranteedAuthRequest.body = requestData;

      mockAuthService.changePhoneNumber.mockResolvedValue(undefined);

      // Act
      await authController.changePhone(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.changePhoneNumber).toHaveBeenCalledWith(
        'user-123',
        requestData.newPhoneNumber,
        requestData.verificationCode
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Phone number changed successfully'
      });
    });
  });

  describe('getProfileWithBusinessSummary', () => {
    it('should get profile with business summary successfully', async () => {
      // Arrange
      const mockProfileWithBusiness = {
        user: {
          id: 'user-123',
          phoneNumber: '+905551234567',
          firstName: 'John',
          lastName: 'Doe'
        },
        businessSummary: {
          totalBusinesses: 2,
          activeBusinesses: 1,
          totalAppointments: 50
        }
      };

      mockAuthService.getUserProfileWithBusinessSummary.mockResolvedValue(mockProfileWithBusiness);

      // Act
      // await authController.getProfileWithBusinessSummary(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.getUserProfileWithBusinessSummary).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile with business summary retrieved successfully',
        data: mockProfileWithBusiness
      });
    });
  });

  describe('getMyCustomers', () => {
    it('should get user customers successfully', async () => {
      // Arrange
      const mockCustomers = [
        { id: 'customer-1', firstName: 'Jane', lastName: 'Smith' },
        { id: 'customer-2', firstName: 'Bob', lastName: 'Johnson' }
      ];

      mockAuthService.getMyCustomers.mockResolvedValue(mockCustomers);

      // Act
      await authController.getMyCustomers(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.getMyCustomers).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Customers retrieved successfully',
        data: mockCustomers
      });
    });
  });

  describe('getCustomerDetails', () => {
    it('should get customer details successfully', async () => {
      // Arrange
      const customerId = 'customer-123';
      mockGuaranteedAuthRequest.params = { customerId };

      const mockCustomerDetails = {
        id: 'customer-123',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+905559876543',
        totalAppointments: 10,
        lastAppointment: '2024-01-15'
      };

      mockAuthService.getCustomerDetails.mockResolvedValue(mockCustomerDetails);

      // Act
      await authController.getCustomerDetails(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.getCustomerDetails).toHaveBeenCalledWith('user-123', customerId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Customer details retrieved successfully',
        data: mockCustomerDetails
      });
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account successfully', async () => {
      // Arrange
      mockAuthService.deactivateUser.mockResolvedValue(undefined);

      // Act
      // await authController.deactivateAccount(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.deactivateUser).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deactivated successfully'
      });
    });
  });
});
