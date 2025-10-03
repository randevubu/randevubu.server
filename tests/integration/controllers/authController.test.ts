/* import request from 'supertest';
import express from 'express';
import { AuthController } from '../../../src/controllers/authController';
import { RepositoryContainer } from '../../../src/repositories';
import { ServiceContainer } from '../../../src/services';
import { PrismaClient } from '@prisma/client';
import { TestHelpers } from '../../utils/testHelpers';
import { testUsers, testErrorMessages } from '../../fixtures/testData';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    phoneVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }))
}));

describe('AuthController Integration Tests', () => {
  let app: express.Application;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRepositories: jest.Mocked<RepositoryContainer>;
  let mockServices: jest.Mocked<ServiceContainer>;
  let authController: AuthController;

  beforeAll(async () => {
    // Create mock Prisma instance
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    
    // Create mock repositories
    mockRepositories = {
      userRepository: {
        create: jest.fn(),
        findById: jest.fn(),
        findByPhoneNumber: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      } as any,
      phoneVerificationRepository: {
        create: jest.fn(),
        findValidCode: jest.fn(),
        markAsUsed: jest.fn(),
        delete: jest.fn()
      } as any,
      refreshTokenRepository: {
        create: jest.fn(),
        findByToken: jest.fn(),
        revokeToken: jest.fn(),
        revokeAllUserTokens: jest.fn(),
        delete: jest.fn()
      } as any
    } as jest.Mocked<RepositoryContainer>;

    // Create mock services
    mockServices = {
      authService: {
        registerUser: jest.fn(),
        loginUser: jest.fn(),
        verifyPhoneNumber: jest.fn(),
        refreshToken: jest.fn(),
        logoutUser: jest.fn(),
        sendVerificationCode: jest.fn()
      } as any,
      tokenService: {
        generateAccessToken: jest.fn(),
        generateRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
        verifyRefreshToken: jest.fn()
      } as any
    } as jest.Mocked<ServiceContainer>;

    // Initialize controller
    authController = new AuthController(mockRepositories, mockServices);

    // Create Express app
    app = express();
    app.use(express.json());

    // Set up routes
    app.post('/api/v1/auth/send-verification', authController.sendVerificationCode.bind(authController));
    app.post('/api/v1/auth/register-login', authController.registerLogin.bind(authController));
    app.post('/api/v1/auth/verify', authController.verifyPhoneNumber.bind(authController));
    app.post('/api/v1/auth/refresh', authController.refreshToken.bind(authController));
    app.post('/api/v1/auth/logout', authController.logout.bind(authController));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/send-verification', () => {
    it('should send verification code successfully', async () => {
      // Arrange
      const phoneNumber = testUsers.validUser.phoneNumber;
      const mockVerification = {
        id: 'verification-123',
        phoneNumber,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      mockServices.authService.sendVerificationCode.mockResolvedValue(mockVerification as any);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({ phoneNumber });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(mockServices.authService.sendVerificationCode).toHaveBeenCalledWith(phoneNumber);
    });

    it('should return 400 for invalid phone number', async () => {
      // Arrange
      const phoneNumber = testUsers.invalidUser.phoneNumber;

      mockServices.authService.sendVerificationCode.mockRejectedValue(new Error('Invalid phone number'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({ phoneNumber });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing phone number', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register-login', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const userData = testUsers.validUser;
      const mockUser = { id: 'user-123', ...userData };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      mockServices.authService.registerUser.mockResolvedValue(mockUser as any);
      mockServices.tokenService.generateAccessToken.mockReturnValue(mockTokens.accessToken);
      mockServices.tokenService.generateRefreshToken.mockReturnValue(mockTokens.refreshToken);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register-login')
        .send(userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.accessToken).toBe(mockTokens.accessToken);
      expect(response.body.data.refreshToken).toBe(mockTokens.refreshToken);
    });

    it('should login existing user successfully', async () => {
      // Arrange
      const phoneNumber = testUsers.validUser.phoneNumber;
      const mockUser = { id: 'user-123', ...testUsers.validUser };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      mockServices.authService.loginUser.mockResolvedValue({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken
      });

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register-login')
        .send({ phoneNumber });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.accessToken).toBe(mockTokens.accessToken);
    });

    it('should return 400 for invalid user data', async () => {
      // Arrange
      const userData = testUsers.invalidUser;

      mockServices.authService.registerUser.mockRejectedValue(new Error('Invalid user data'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register-login')
        .send(userData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify', () => {
    it('should verify phone number successfully', async () => {
      // Arrange
      const phoneNumber = testUsers.validUser.phoneNumber;
      const verificationCode = '123456';
      const mockUser = { id: 'user-123', ...testUsers.validUser, isVerified: true };

      mockServices.authService.verifyPhoneNumber.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, verificationCode });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isVerified).toBe(true);
      expect(mockServices.authService.verifyPhoneNumber).toHaveBeenCalledWith(phoneNumber, verificationCode);
    });

    it('should return 400 for invalid verification code', async () => {
      // Arrange
      const phoneNumber = testUsers.validUser.phoneNumber;
      const verificationCode = '000000';

      mockServices.authService.verifyPhoneNumber.mockRejectedValue(new Error('Invalid verification code'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, verificationCode });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing verification code', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber: testUsers.validUser.phoneNumber });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockUser = { id: 'user-123', ...testUsers.validUser };
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      mockServices.authService.refreshToken.mockResolvedValue({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken
      });

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(mockTokens.accessToken);
      expect(response.body.data.refreshToken).toBe(mockTokens.refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';

      mockServices.authService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'valid-refresh-token';

      mockServices.authService.logoutUser.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ userId, refreshToken });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockServices.authService.logoutUser).toHaveBeenCalledWith(userId, refreshToken);
    });

    it('should return 400 for missing userId', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'valid-refresh-token' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Arrange
      mockServices.authService.sendVerificationCode.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({ phoneNumber: testUsers.validUser.phoneNumber });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle validation errors properly', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({ phoneNumber: '' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
}); */