import { VerificationPurpose } from '@prisma/client';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { RepositoryContainer } from '../repositories';
import {
  VerificationResult,
  VerificationStats
} from '../types/auth';
import {
  CooldownActiveError,
  DailyLimitExceededError,
  ErrorContext,
  InvalidPhoneNumberError,
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  VerificationMaxAttemptsError
} from '../types/errors';
import { logger } from '../utils/logger';
import { TokenService } from './tokenService';

export interface SendVerificationOptions {
  phoneNumber: string;
  purpose: VerificationPurpose;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class PhoneVerificationService {
  private static readonly CODE_EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly COOLDOWN_MINUTES = process.env.NODE_ENV === 'development' ? 0.1 : 5; // Almost no cooldown in dev
  private static readonly DAILY_LIMIT = process.env.NODE_ENV === 'development' ? 1000 : 10; // Much higher in dev
  private static readonly IP_DAILY_LIMIT = process.env.NODE_ENV === 'development' ? 5000 : 50; // Much higher in dev

  constructor(
    private repositories: RepositoryContainer,
    private tokenService: TokenService
  ) {}

  async sendVerificationCode(
    options: SendVerificationOptions,
    context?: ErrorContext
  ): Promise<VerificationResult> {
    const { phoneNumber, purpose, userId, ipAddress, userAgent } = options;

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new InvalidPhoneNumberError(phoneNumber, context);
    }

    // Check rate limits
    await this.checkRateLimits(normalizedPhone, ipAddress, context);

    // Clean up expired codes
    await this.repositories.phoneVerificationRepository.cleanup();

    // Check for existing active code
    const existingCode = await this.repositories.phoneVerificationRepository.findLatest(
      normalizedPhone, 
      purpose
    );

    if (existingCode) {
      const timeSinceCreation = Date.now() - existingCode.createdAt.getTime();
      const cooldownMs = PhoneVerificationService.COOLDOWN_MINUTES * 60 * 1000;
      
      if (timeSinceCreation < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - timeSinceCreation) / 1000);
        throw new CooldownActiveError(remainingCooldown, context);
      }

      // Invalidate existing code
      await this.repositories.phoneVerificationRepository.markAsUsed(existingCode.id);
    }

    // Generate new verification code
    const code = this.tokenService.generateSecureCode(6);
    const hashedCode = this.tokenService.hashCode(code);
    const expiresAt = new Date(Date.now() + PhoneVerificationService.CODE_EXPIRY_MINUTES * 60 * 1000);

    // Store verification code
    await this.repositories.phoneVerificationRepository.create({
      userId,
      phoneNumber: normalizedPhone,
      code: hashedCode,
      purpose,
      isUsed: false,
      attempts: 0,
      maxAttempts: PhoneVerificationService.MAX_ATTEMPTS,
      expiresAt,
    });

    // Log verification attempt
    await this.repositories.auditLogRepository.create({
      userId,
      action: 'PHONE_VERIFY',
      entity: 'PhoneVerification',
      details: {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        action: 'code_sent'
      },
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    logger.info('Verification code sent', {
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      purpose,
      userId,
      requestId: context?.requestId,
    });

    // Send SMS code (in production, integrate with SMS provider)
    await this.sendSMSCode(normalizedPhone, code, context);

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  async verifyCode(
    phoneNumber: string,
    code: string,
    purpose: VerificationPurpose,
    context?: ErrorContext
  ): Promise<VerificationResult> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new InvalidPhoneNumberError(phoneNumber, context);
    }

    const verification = await this.repositories.phoneVerificationRepository.findLatest(
      normalizedPhone,
      purpose
    );

    if (!verification) {
      logger.warn('Verification code not found or expired', {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        requestId: context?.requestId,
      });
      
      throw new VerificationCodeExpiredError(context);
    }

    // Check if max attempts exceeded
    if (verification.attempts >= verification.maxAttempts) {
      await this.repositories.phoneVerificationRepository.markAsUsed(verification.id);

      logger.warn('Max verification attempts exceeded', {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        attempts: verification.attempts,
        requestId: context?.requestId,
      });

      throw new VerificationMaxAttemptsError(undefined, context);
    }

    // Verify the code
    const isValidCode = this.tokenService.verifyCode(code, verification.code);

    // Update attempt count
    const newAttempts = await this.repositories.phoneVerificationRepository.incrementAttempts(verification.id);

    if (!isValidCode) {
      const attemptsRemaining = verification.maxAttempts - newAttempts;
      
      logger.warn('Invalid verification code attempt', {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        attempts: newAttempts,
        attemptsRemaining,
        requestId: context?.requestId,
      });

      // Log failed verification attempt
      await this.repositories.auditLogRepository.create({
        userId: verification.userId || undefined,
        action: 'PHONE_VERIFY',
        entity: 'PhoneVerification',
        entityId: verification.id,
        details: {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          purpose,
          action: 'code_failed',
          attempts: newAttempts,
          attemptsRemaining
        },
        ipAddress: context?.ipAddress || undefined,
        userAgent: context?.userAgent || undefined,
      });

      if (attemptsRemaining <= 0) {
        await this.repositories.phoneVerificationRepository.markAsUsed(verification.id);
        throw new VerificationMaxAttemptsError(undefined, context);
      }

      throw new VerificationCodeInvalidError(attemptsRemaining, context);
    }

    // Mark as used on successful verification
    await this.repositories.phoneVerificationRepository.markAsUsed(verification.id);

    // Log successful verification
    await this.repositories.auditLogRepository.create({
      userId: verification.userId || undefined,
      action: 'PHONE_VERIFY',
      entity: 'PhoneVerification',
      entityId: verification.id,
      details: {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        action: 'code_verified',
        attempts: newAttempts
      },
      ipAddress: context?.ipAddress || undefined,
      userAgent: context?.userAgent || undefined,
    });

    logger.info('Phone verification successful', {
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      purpose,
      userId: verification.userId,
      attempts: newAttempts,
      requestId: context?.requestId,
    });

    return {
      success: true,
      message: 'Phone number verified successfully',
    };
  }

  async getVerificationStats(
    phoneNumber?: string, 
    purpose?: VerificationPurpose,
    context?: ErrorContext
  ): Promise<VerificationStats> {
    try {
      return await this.repositories.phoneVerificationRepository.getStats(phoneNumber, purpose);
    } catch (error) {
      logger.error('Failed to get verification stats', {
        error: error instanceof Error ? error.message : String(error),
        requestId: context?.requestId,
      });
      throw error;
    }
  }

  async invalidateUserVerifications(userId: string, context?: ErrorContext): Promise<void> {
    await this.repositories.phoneVerificationRepository.invalidateUserVerifications(userId);

    logger.info('All user verification codes invalidated', {
      userId,
      requestId: context?.requestId,
    });
  }

  private async checkRateLimits(
    phoneNumber: string, 
    ipAddress?: string,
    context?: ErrorContext
  ): Promise<void> {
    const { phoneCount, ipCount } = await this.repositories.phoneVerificationRepository
      .countDailyRequests(phoneNumber, ipAddress);

    if (phoneCount >= PhoneVerificationService.DAILY_LIMIT) {
      logger.warn('Daily phone verification limit exceeded', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        count: phoneCount,
        limit: PhoneVerificationService.DAILY_LIMIT,
        requestId: context?.requestId,
      });
      
      throw new DailyLimitExceededError(context);
    }

    if (ipAddress && ipCount >= PhoneVerificationService.IP_DAILY_LIMIT) {
      logger.warn('Daily IP verification limit exceeded', {
        ipAddress,
        count: ipCount,
        limit: PhoneVerificationService.IP_DAILY_LIMIT,
        requestId: context?.requestId,
      });
      
      throw new DailyLimitExceededError(context);
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string | null {
    try {
      if (!isValidPhoneNumber(phoneNumber)) {
        return null;
      }

      const parsed = parsePhoneNumber(phoneNumber);
      return parsed?.format('E.164') || null;
    } catch (error) {
      logger.warn('Phone number parsing failed', { 
        phoneNumber: this.maskPhoneNumber(phoneNumber), 
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) {
      return '*'.repeat(phoneNumber.length);
    }
    
    const visibleDigits = 3;
    const maskedPart = '*'.repeat(phoneNumber.length - visibleDigits);
    return maskedPart + phoneNumber.slice(-visibleDigits);
  }

  private async sendSMSCode(
    phoneNumber: string, 
    code: string, 
    context?: ErrorContext
  ): Promise<void> {
    // In production, integrate with SMS providers like:
    // - Twilio
    // - AWS SNS
    // - Azure Communication Services
    // - SendGrid
    
    const message = `Your RandevuBu verification code is: ${code}. Valid for ${PhoneVerificationService.CODE_EXPIRY_MINUTES} minutes. Do not share this code.`;

    if (process.env.NODE_ENV === 'development') {
      logger.info('SMS Code (Development Mode)', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        code,
        message,
        requestId: context?.requestId,
      });
    } else {
      // Production SMS sending logic would go here
      logger.info('SMS sent (Production)', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        messageLength: message.length,
        requestId: context?.requestId,
      });
    }
  }

  // Cleanup expired verifications (call this periodically)
  async cleanupExpiredVerifications(): Promise<number> {
    const count = await this.repositories.phoneVerificationRepository.cleanup();
    
    if (count > 0) {
      logger.info('Cleaned up expired verification codes', { count });
    }
    
    return count;
  }
}