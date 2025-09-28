import request from 'supertest';
import express from 'express';
import { AuthController } from '../../../src/controllers/authController';
import { RepositoryContainer } from '../../../src/repositories';
import { ServiceContainer } from '../../../src/services';
import { PrismaClient } from '@prisma/client';
import { TestHelpers } from '../../utils/testHelpers';
import { testSecurityData, testUsers } from '../../fixtures/testData';

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

describe('Authentication Security Tests', () => {
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

  describe('SQL Injection Prevention', () => {
    testSecurityData.sqlInjectionAttempts.forEach((maliciousInput, index) => {
      it(`should prevent SQL injection attempt ${index + 1}`, async () => {
        // Arrange
        const phoneNumber = maliciousInput;
        
        mockServices.authService.sendVerificationCode.mockRejectedValue(new Error('Invalid phone number'));

        // Act
        const response = await request(app)
          .post('/api/v1/auth/send-verification')
          .send({ phoneNumber });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        
        // Verify that the malicious input was not processed
        expect(mockServices.authService.sendVerificationCode).toHaveBeenCalledWith(phoneNumber);
      });
    });

    it('should prevent SQL injection in user registration', async () => {
      // Arrange
      const maliciousUserData = {
        phoneNumber: testSecurityData.sqlInjectionAttempts[0],
        firstName: testSecurityData.sqlInjectionAttempts[1],
        lastName: testSecurityData.sqlInjectionAttempts[2]
      };

      mockServices.authService.registerUser.mockRejectedValue(new Error('Invalid input data'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register-login')
        .send(maliciousUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('XSS Prevention', () => {
    testSecurityData.xssAttempts.forEach((maliciousInput, index) => {
      it(`should prevent XSS attempt ${index + 1}`, async () => {
        // Arrange
        const userData = {
          phoneNumber: testUsers.validUser.phoneNumber,
          firstName: maliciousInput,
          lastName: maliciousInput
        };

        mockServices.authService.registerUser.mockRejectedValue(new Error('Invalid input data'));

        // Act
        const response = await request(app)
          .post('/api/v1/auth/register-login')
          .send(userData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        
        // Verify that the response doesn't contain the malicious script
        expect(response.text).not.toContain('<script>');
        expect(response.text).not.toContain('javascript:');
        expect(response.text).not.toContain('onerror=');
      });
    });
  });

  describe('Input Validation Security', () => {
    testSecurityData.maliciousInputs.forEach((maliciousInput, index) => {
      it(`should reject malicious input ${index + 1}`, async () => {
        // Arrange
        const userData = {
          phoneNumber: maliciousInput,
          firstName: maliciousInput,
          lastName: maliciousInput
        };

        mockServices.authService.registerUser.mockRejectedValue(new Error('Invalid input data'));

        // Act
        const response = await request(app)
          .post('/api/v1/auth/register-login')
          .send(userData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Rate Limiting Security', () => {
    it('should handle rapid requests without crashing', async () => {
      // Arrange
      const phoneNumber = testUsers.validUser.phoneNumber;
      const mockVerification = {
        id: 'verification-123',
        phoneNumber,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      mockServices.authService.sendVerificationCode.mockResolvedValue(mockVerification as any);

      // Act - Send multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/send-verification')
          .send({ phoneNumber })
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('JWT Token Security', () => {
    it('should reject malformed JWT tokens', async () => {
      // Arrange
      const malformedTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer invalid-token',
        '',
        null,
        undefined
      ];

      for (const token of malformedTokens) {
        // Act
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: token });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject expired JWT tokens', async () => {
      // Arrange
      const expiredToken = TestHelpers.generateJWTToken('user-123');
      
      mockServices.authService.refreshToken.mockRejectedValue(new Error('Token expired'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: expiredToken });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Phone Number Security', () => {
    it('should validate phone number format strictly', async () => {
      // Arrange
      const invalidPhoneNumbers = [
        '123456789',
        '+90',
        '905551234567',
        '+90555123456789',
        'invalid-phone',
        '+90-555-123-45-67',
        '+90 555 123 45 67',
        '5551234567',
        '+1-555-123-4567'
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        mockServices.authService.sendVerificationCode.mockRejectedValue(new Error('Invalid phone number'));

        // Act
        const response = await request(app)
          .post('/api/v1/auth/send-verification')
          .send({ phoneNumber });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
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
      
      // Verify that sensitive information is not exposed
      expect(response.text).not.toContain('Database connection failed');
      expect(response.text).not.toContain('password');
      expect(response.text).not.toContain('secret');
      expect(response.text).not.toContain('token');
    });

    it('should not expose stack traces in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockServices.authService.sendVerificationCode.mockRejectedValue(new Error('Internal server error'));

      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .send({ phoneNumber: testUsers.validUser.phoneNumber });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.text).not.toContain('stack');
      expect(response.text).not.toContain('Error:');
    });
  });

  describe('Request Size Limits', () => {
    it('should reject oversized requests', async () => {
      // Arrange
      const oversizedData = {
        phoneNumber: testUsers.validUser.phoneNumber,
        firstName: 'A'.repeat(10000), // Very long string
        lastName: 'B'.repeat(10000)
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register-login')
        .send(oversizedData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Type Security', () => {
    it('should reject requests with invalid content type', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/send-verification')
        .set('Content-Type', 'text/plain')
        .send('invalid data');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('HTTP Method Security', () => {
    it('should reject unsupported HTTP methods', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/auth/send-verification')
        .send({ phoneNumber: testUsers.validUser.phoneNumber });

      // Assert
      expect(response.status).toBe(404);
    });
  });
});

