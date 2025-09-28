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
          phoneNumber: '+905****34567',
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
        verificationCode: '123456'
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
        requestData.verificationCode,
        {
          deviceId: undefined,
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1'
        },
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET'
        })
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-123', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth/refresh'
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith('hasAuth', '1', {
        httpOnly: false,
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
      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
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
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({
          deviceId: undefined,
          userAgent: undefined,
          ipAddress: '127.0.0.1'
        }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: undefined
        })
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh-token-123', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth/refresh'
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith('hasAuth', '1', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should refresh token successfully with body token', async () => {
      // Arrange
      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
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
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({
          deviceId: undefined,
          userAgent: undefined,
          ipAddress: '127.0.0.1'
        }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: undefined
        })
      );
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
        error: {
          message: 'Refresh token is required. Provide it in cookie or request body.',
          code: 'REFRESH_TOKEN_MISSING'
        }
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const requestData = {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      };

      mockGuaranteedAuthRequest.body = requestData;

      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      await authController.logout(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'user-123',
        requestData.refreshToken,
        expect.objectContaining({
          deviceId: undefined,
          userAgent: undefined,
          ipAddress: '127.0.0.1'
        }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: 'user-123'
        })
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/api/v1/auth/refresh'
      });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('hasAuth');
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
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: 'user-123'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: mockProfile,
          meta: {
            includesBusinessSummary: false
          }
        }
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const requestData = {
        firstName: 'John',
        lastName: 'Doe'
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
      expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith(
        'user-123', 
        requestData,
        expect.objectContaining({
          deviceId: undefined,
          userAgent: undefined,
          ipAddress: '127.0.0.1'
        }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: 'user-123'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: mockUpdatedProfile
        }
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
        requestData.verificationCode,
        expect.objectContaining({
          deviceId: undefined,
          userAgent: undefined,
          ipAddress: '127.0.0.1'
        }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: 'user-123'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Phone number changed successfully. Please login again with new number.',
        data: undefined
      });
    });
  });

  describe('getProfile with business summary', () => {
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

      mockGuaranteedAuthRequest.query = { includeBusinessSummary: 'true' };
      mockAuthService.getUserProfileWithBusinessSummary.mockResolvedValue(mockProfileWithBusiness);

      // Act
      await authController.getProfile(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.getUserProfileWithBusinessSummary).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: 'user-123'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: mockProfileWithBusiness,
          meta: {
            includesBusinessSummary: true
          }
        }
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
      expect(mockAuthService.getMyCustomers).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          limit: undefined,
          page: undefined,
          search: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          status: undefined
        })
      );
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

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      // Arrange
      mockAuthService.deactivateUser.mockResolvedValue(undefined);

      // Act
      await authController.deleteAccount(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockAuthService.deactivateUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          deviceId: undefined,
          userAgent: undefined,
          ipAddress: '127.0.0.1'
        }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: undefined,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          endpoint: '/test',
          method: 'GET',
          userId: 'user-123'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deactivated successfully'
      });
    });
  });
});
