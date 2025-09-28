import { PhoneVerificationService, SendVerificationOptions } from '../../../src/services/phoneVerificationService';
import { RepositoryContainer } from '../../../src/repositories';
import { TokenService } from '../../../src/services/tokenService';
import { SMSService } from '../../../src/services/smsService';
import { VerificationPurpose, VerificationResult, VerificationStats } from '../../../src/types/auth';
import { ErrorContext } from '../../../src/types/errors';
import {
  CooldownActiveError,
  DailyLimitExceededError,
  InvalidPhoneNumberError,
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  VerificationMaxAttemptsError
} from '../../../src/types/errors';

// Mock dependencies
jest.mock('../../../src/repositories');
jest.mock('../../../src/services/tokenService');
jest.mock('../../../src/services/smsService');
jest.mock('libphonenumber-js');
jest.mock('../../../src/utils/logger');

describe('PhoneVerificationService', () => {
  let phoneVerificationService: PhoneVerificationService;
  let mockRepositories: jest.Mocked<RepositoryContainer>;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockSmsService: jest.Mocked<SMSService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockRepositories = {
      phoneVerificationRepository: {
        cleanup: jest.fn(),
        findLatest: jest.fn(),
        markAsUsed: jest.fn(),
        create: jest.fn(),
        incrementAttempts: jest.fn(),
        getStats: jest.fn(),
        invalidateUserVerifications: jest.fn(),
        countDailyRequests: jest.fn()
      },
      auditLogRepository: {
        create: jest.fn()
      }
    } as any;

    mockTokenService = {
      generateSecureCode: jest.fn(),
      hashCode: jest.fn(),
      verifyCode: jest.fn()
    } as any;

    mockSmsService = {
      sendSMS: jest.fn()
    } as any;

    // Create PhoneVerificationService instance
    phoneVerificationService = new PhoneVerificationService(mockRepositories, mockTokenService);
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully', async () => {
      // Arrange
      const options: SendVerificationOptions = {
        phoneNumber: '+905551234567',
        purpose: VerificationPurpose.REGISTRATION,
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const mockVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(),
        createdAt: new Date()
      };

      const mockSmsResult = {
        success: true,
        messageId: 'sms-123'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.cleanup.mockResolvedValue(0);
      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(null);
      mockRepositories.phoneVerificationRepository.countDailyRequests.mockResolvedValue({ phoneCount: 0, ipCount: 0 });
      mockRepositories.phoneVerificationRepository.create.mockResolvedValue(mockVerification);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});
      mockTokenService.generateSecureCode.mockReturnValue('123456');
      mockTokenService.hashCode.mockReturnValue('hashed-code');
      mockSmsService.sendSMS.mockResolvedValue(mockSmsResult);

      // Act
      const result = await phoneVerificationService.sendVerificationCode(options, context);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Verification code sent successfully'
      });
      expect(mockRepositories.phoneVerificationRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: expect.any(Date)
      });
      expect(mockSmsService.sendSMS).toHaveBeenCalledWith({
        phoneNumber: '+905551234567',
        message: expect.any(String),
        context
      });
    });

    it('should throw error for invalid phone number', async () => {
      // Arrange
      const options: SendVerificationOptions = {
        phoneNumber: 'invalid-phone',
        purpose: VerificationPurpose.REGISTRATION
      };

      // Mock phone number validation
      const { isValidPhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(false);

      // Act & Assert
      await expect(phoneVerificationService.sendVerificationCode(options))
        .rejects.toThrow(InvalidPhoneNumberError);
    });

    it('should throw error when daily limit exceeded', async () => {
      // Arrange
      const options: SendVerificationOptions = {
        phoneNumber: '+905551234567',
        purpose: VerificationPurpose.REGISTRATION,
        ipAddress: '192.168.1.1'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.cleanup.mockResolvedValue(0);
      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(null);
      mockRepositories.phoneVerificationRepository.countDailyRequests.mockResolvedValue({ phoneCount: 15, ipCount: 0 });

      // Act & Assert
      await expect(phoneVerificationService.sendVerificationCode(options))
        .rejects.toThrow(DailyLimitExceededError);
    });

    it('should throw error when IP daily limit exceeded', async () => {
      // Arrange
      const options: SendVerificationOptions = {
        phoneNumber: '+905551234567',
        purpose: VerificationPurpose.REGISTRATION,
        ipAddress: '192.168.1.1'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.cleanup.mockResolvedValue(0);
      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(null);
      mockRepositories.phoneVerificationRepository.countDailyRequests.mockResolvedValue({ phoneCount: 0, ipCount: 60 });

      // Act & Assert
      await expect(phoneVerificationService.sendVerificationCode(options))
        .rejects.toThrow(DailyLimitExceededError);
    });

    it('should throw error when cooldown is active', async () => {
      // Arrange
      const options: SendVerificationOptions = {
        phoneNumber: '+905551234567',
        purpose: VerificationPurpose.REGISTRATION
      };

      const existingVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(),
        createdAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.cleanup.mockResolvedValue(0);
      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(existingVerification);
      mockRepositories.phoneVerificationRepository.countDailyRequests.mockResolvedValue({ phoneCount: 0, ipCount: 0 });

      // Act & Assert
      await expect(phoneVerificationService.sendVerificationCode(options))
        .rejects.toThrow(CooldownActiveError);
    });

    it('should invalidate existing code and create new one', async () => {
      // Arrange
      const options: SendVerificationOptions = {
        phoneNumber: '+905551234567',
        purpose: VerificationPurpose.REGISTRATION
      };

      const existingVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(),
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      };

      const newVerification = {
        id: 'verification-456',
        phoneNumber: '+905551234567',
        code: 'new-hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(),
        createdAt: new Date()
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.cleanup.mockResolvedValue(0);
      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(existingVerification);
      mockRepositories.phoneVerificationRepository.countDailyRequests.mockResolvedValue({ phoneCount: 0, ipCount: 0 });
      mockRepositories.phoneVerificationRepository.markAsUsed.mockResolvedValue({});
      mockRepositories.phoneVerificationRepository.create.mockResolvedValue(newVerification);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});
      mockTokenService.generateSecureCode.mockReturnValue('654321');
      mockTokenService.hashCode.mockReturnValue('new-hashed-code');
      mockSmsService.sendSMS.mockResolvedValue({ success: true, messageId: 'sms-456' });

      // Act
      const result = await phoneVerificationService.sendVerificationCode(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockRepositories.phoneVerificationRepository.markAsUsed).toHaveBeenCalledWith('verification-123');
      expect(mockRepositories.phoneVerificationRepository.create).toHaveBeenCalledWith({
        userId: undefined,
        phoneNumber: '+905551234567',
        code: 'new-hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: expect.any(Date)
      });
    });
  });

  describe('verifyCode', () => {
    it('should verify code successfully', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const code = '123456';
      const purpose = VerificationPurpose.REGISTRATION;
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const mockVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        createdAt: new Date(),
        userId: 'user-123'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(mockVerification);
      mockRepositories.phoneVerificationRepository.incrementAttempts.mockResolvedValue(1);
      mockRepositories.phoneVerificationRepository.markAsUsed.mockResolvedValue({});
      mockRepositories.auditLogRepository.create.mockResolvedValue({});
      mockTokenService.verifyCode.mockReturnValue(true);

      // Act
      const result = await phoneVerificationService.verifyCode(phoneNumber, code, purpose, context);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Phone number verified successfully'
      });
      expect(mockTokenService.verifyCode).toHaveBeenCalledWith('123456', 'hashed-code');
      expect(mockRepositories.phoneVerificationRepository.markAsUsed).toHaveBeenCalledWith('verification-123');
    });

    it('should throw error if verification not found', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const code = '123456';
      const purpose = VerificationPurpose.REGISTRATION;

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(null);

      // Act & Assert
      await expect(phoneVerificationService.verifyCode(phoneNumber, code, purpose))
        .rejects.toThrow(VerificationCodeExpiredError);
    });

    it('should throw error if max attempts exceeded', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const code = '123456';
      const purpose = VerificationPurpose.REGISTRATION;

      const mockVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 3,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date(),
        userId: 'user-123'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(mockVerification);
      mockRepositories.phoneVerificationRepository.markAsUsed.mockResolvedValue({});

      // Act & Assert
      await expect(phoneVerificationService.verifyCode(phoneNumber, code, purpose))
        .rejects.toThrow(VerificationMaxAttemptsError);
    });

    it('should throw error for invalid code', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const code = 'wrong-code';
      const purpose = VerificationPurpose.REGISTRATION;

      const mockVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 1,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date(),
        userId: 'user-123'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(mockVerification);
      mockRepositories.phoneVerificationRepository.incrementAttempts.mockResolvedValue(2);
      mockRepositories.auditLogRepository.create.mockResolvedValue({});
      mockTokenService.verifyCode.mockReturnValue(false);

      // Act & Assert
      await expect(phoneVerificationService.verifyCode(phoneNumber, code, purpose))
        .rejects.toThrow(VerificationCodeInvalidError);
    });

    it('should throw error when max attempts reached after invalid code', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const code = 'wrong-code';
      const purpose = VerificationPurpose.REGISTRATION;

      const mockVerification = {
        id: 'verification-123',
        phoneNumber: '+905551234567',
        code: 'hashed-code',
        purpose: VerificationPurpose.REGISTRATION,
        isUsed: false,
        attempts: 2,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date(),
        userId: 'user-123'
      };

      // Mock phone number validation
      const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
      isValidPhoneNumber.mockReturnValue(true);
      parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

      mockRepositories.phoneVerificationRepository.findLatest.mockResolvedValue(mockVerification);
      mockRepositories.phoneVerificationRepository.incrementAttempts.mockResolvedValue(3);
      mockRepositories.phoneVerificationRepository.markAsUsed.mockResolvedValue({});
      mockRepositories.auditLogRepository.create.mockResolvedValue({});
      mockTokenService.verifyCode.mockReturnValue(false);

      // Act & Assert
      await expect(phoneVerificationService.verifyCode(phoneNumber, code, purpose))
        .rejects.toThrow(VerificationMaxAttemptsError);
    });
  });

  describe('getVerificationStats', () => {
    it('should return verification stats', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const purpose = VerificationPurpose.REGISTRATION;
      const context: ErrorContext = {
        requestId: 'req-123'
      };

      const mockStats: VerificationStats = {
        totalSent: 10,
        totalVerified: 8,
        totalFailed: 2,
        successRate: 0.8,
        averageAttempts: 1.5
      };

      mockRepositories.phoneVerificationRepository.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await phoneVerificationService.getVerificationStats(phoneNumber, purpose, context);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepositories.phoneVerificationRepository.getStats).toHaveBeenCalledWith(phoneNumber, purpose);
    });

    it('should handle errors in getVerificationStats', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const context: ErrorContext = {
        requestId: 'req-123'
      };

      mockRepositories.phoneVerificationRepository.getStats.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(phoneVerificationService.getVerificationStats(phoneNumber, undefined, context))
        .rejects.toThrow('Database error');
    });
  });

  describe('invalidateUserVerifications', () => {
    it('should invalidate user verifications', async () => {
      // Arrange
      const userId = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123'
      };

      mockRepositories.phoneVerificationRepository.invalidateUserVerifications.mockResolvedValue(5);

      // Act
      await phoneVerificationService.invalidateUserVerifications(userId, context);

      // Assert
      expect(mockRepositories.phoneVerificationRepository.invalidateUserVerifications).toHaveBeenCalledWith(userId);
    });
  });

  describe('cleanupExpiredVerifications', () => {
    it('should cleanup expired verifications', async () => {
      // Arrange
      mockRepositories.phoneVerificationRepository.cleanup.mockResolvedValue(10);

      // Act
      const result = await phoneVerificationService.cleanupExpiredVerifications();

      // Assert
      expect(result).toBe(10);
      expect(mockRepositories.phoneVerificationRepository.cleanup).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    describe('normalizePhoneNumber', () => {
      it('should normalize valid phone number', () => {
        // Arrange
        const phoneNumber = '+905551234567';

        // Mock phone number validation
        const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
        isValidPhoneNumber.mockReturnValue(true);
        parsePhoneNumber.mockReturnValue({ format: () => '+905551234567' });

        // Act
        const result = (phoneVerificationService as any).normalizePhoneNumber(phoneNumber);

        // Assert
        expect(result).toBe('+905551234567');
      });

      it('should return null for invalid phone number', () => {
        // Arrange
        const phoneNumber = 'invalid-phone';

        // Mock phone number validation
        const { isValidPhoneNumber } = require('libphonenumber-js');
        isValidPhoneNumber.mockReturnValue(false);

        // Act
        const result = (phoneVerificationService as any).normalizePhoneNumber(phoneNumber);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('maskPhoneNumber', () => {
      it('should mask phone number correctly', () => {
        // Act
        const result = (phoneVerificationService as any).maskPhoneNumber('+905551234567');

        // Assert
        expect(result).toBe('*********567');
      });

      it('should handle short phone numbers', () => {
        // Act
        const result = (phoneVerificationService as any).maskPhoneNumber('123');

        // Assert
        expect(result).toBe('***');
      });
    });
  });
});

