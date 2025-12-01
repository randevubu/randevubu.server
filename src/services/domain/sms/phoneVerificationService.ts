import { VerificationPurpose as PrismaVerificationPurpose } from "@prisma/client";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { RepositoryContainer } from "../../../repositories";
import { VerificationResult, VerificationStats } from "../../../types/auth";
import {
  CooldownActiveError,
  DailyLimitExceededError,
  ErrorContext,
  InvalidPhoneNumberError,
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  VerificationMaxAttemptsError,
} from "../../../types/errors";

import { SMSMessageTemplates } from "../../../utils/smsMessageTemplates";
import { SMSService } from "./smsService";
import { TokenService } from "../token";

import { SendVerificationOptions } from '../../../types/sms';
import logger from "../../../utils/Logger/logger";
export class PhoneVerificationService {
  private static readonly CODE_EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly COOLDOWN_MINUTES = process.env.NODE_ENV === 'development' ? 0.1 : 2; // Reduced from 5 to 2 minutes in production
  private static readonly DAILY_LIMIT = process.env.NODE_ENV === 'development' ? 1000 : 20; // Increased from 10 to 20 in production
  private static readonly IP_DAILY_LIMIT = process.env.NODE_ENV === 'development' ? 5000 : 100; // Increased from 50 to 100 in production

  private smsService: SMSService;

  constructor(
    private repositories: RepositoryContainer,
    private tokenService: TokenService
  ) {
    this.smsService = new SMSService();
  }

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
    const existingCode = 
      await this.repositories.phoneVerificationRepository.findLatest(
        normalizedPhone,
        purpose as PrismaVerificationPurpose
      );

    if (existingCode) {
      const timeSinceCreation = Date.now() - existingCode.createdAt.getTime();
      const cooldownMs = PhoneVerificationService.COOLDOWN_MINUTES * 60 * 1000;

      if (timeSinceCreation < cooldownMs) {
        const remainingCooldown = Math.ceil(
          (cooldownMs - timeSinceCreation) / 1000
        );
        throw new CooldownActiveError(remainingCooldown, context);
      }

      // Invalidate existing code
      await this.repositories.phoneVerificationRepository.markAsUsed(
        existingCode.id
      );
    }

    // Generate new verification code
    const code = this.tokenService.generateSecureCode(6);
    const hashedCode = await this.tokenService.hashCode(code);
    const expiresAt = new Date(
      Date.now() + PhoneVerificationService.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    if (process.env.NODE_ENV === 'development') {
      logger.info('DEV verification code generated', {
        phoneNumber: normalizedPhone,
        purpose,
        code,
        requestId: context?.requestId,
      });
    }

    logger.info("📝 STORING VERIFICATION CODE:", {
      normalizedPhone,
      codeLength: code.length,
      hashedCodeLength: hashedCode.length,
      expiresAt: expiresAt.toISOString(),
      purpose,
    });

    // Store verification code
    await this.repositories.phoneVerificationRepository.create({
      userId,
      phoneNumber: normalizedPhone,
      code: hashedCode,
      purpose: purpose as PrismaVerificationPurpose,
      isUsed: false,
      attempts: 0,
      maxAttempts: PhoneVerificationService.MAX_ATTEMPTS,
      expiresAt,
    });

    // Log verification attempt
    await this.repositories.auditLogRepository.create({
      userId,
      action: "PHONE_VERIFY",
      entity: "PhoneVerification",
      details: {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        action: "code_sent",
      },
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    logger.info("Verification code sent", {
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      purpose,
      userId,
      requestId: context?.requestId,
    });

    // Send SMS code (in production, integrate with SMS provider)
    await this.sendSMSCode(normalizedPhone, code, purpose as PrismaVerificationPurpose, context);

    return {
      success: true,
      message: "Verification code sent successfully",
    };
  }

  async verifyCode(
    phoneNumber: string,
    code: string,
    purpose: PrismaVerificationPurpose,
    context?: ErrorContext
  ): Promise<VerificationResult> {
    logger.info("🔍 VERIFICATION SERVICE CALLED:", {
      phoneNumber,
      code,
      purpose,
      requestId: context?.requestId,
    });

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      logger.info("❌ PHONE NUMBER INVALID:", phoneNumber);
      throw new InvalidPhoneNumberError(phoneNumber, context);
    }

    logger.info("✅ PHONE NUMBER NORMALIZED:", {
      original: phoneNumber,
      normalized: normalizedPhone,
    });

    // Debug logging
    logger.info("Verification attempt started", {
      originalPhone: phoneNumber,
      normalizedPhone: this.maskPhoneNumber(normalizedPhone),
      code: code,
      purpose,
      requestId: context?.requestId,
    });

    let verification =
      await this.repositories.phoneVerificationRepository.findLatest(
        normalizedPhone,
        purpose
      );

    logger.info("🔎 DATABASE LOOKUP RESULT:", {
      found: !!verification,
      verificationId: verification?.id,
      phoneMatch: verification?.phoneNumber === normalizedPhone,
      isUsed: verification?.isUsed,
      expiresAt: verification?.expiresAt,
      attempts: verification?.attempts,
      maxAttempts: verification?.maxAttempts,
      searchedPhone: normalizedPhone,
      foundPhone: verification?.phoneNumber,
    });

    if (!verification) {
      // Check if there are any recent codes that might have just expired
      const recentVerification = await this.repositories.phoneVerificationRepository.findMostRecent(
        normalizedPhone,
        purpose
      );

      if (recentVerification) {
        const now = new Date();
        const expiresAt = new Date(recentVerification.expiresAt);
        const timeDiff = now.getTime() - expiresAt.getTime();
        
        // If the code expired very recently (within 5 minutes), allow verification
        if (timeDiff > 0 && timeDiff < 5 * 60 * 1000) {
          logger.info("Using recently expired verification code within grace period", {
            phoneNumber: this.maskPhoneNumber(normalizedPhone),
            purpose,
            requestId: context?.requestId,
            expiredAt: expiresAt.toISOString(),
            currentTime: now.toISOString(),
            timeDiffSeconds: Math.round(timeDiff / 1000),
          });
          
          // Use the recent verification code
          verification = recentVerification;
        } else {
          logger.warn("Verification code expired", {
            phoneNumber: this.maskPhoneNumber(normalizedPhone),
            purpose,
            requestId: context?.requestId,
            expiredAt: expiresAt.toISOString(),
            currentTime: now.toISOString(),
            timeDiffSeconds: Math.round(timeDiff / 1000),
            attempts: recentVerification.attempts,
            maxAttempts: recentVerification.maxAttempts
          });
          
          throw new VerificationCodeExpiredError(context);
        }
      } else {
        logger.warn("No verification code found", {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          purpose,
          requestId: context?.requestId,
        });
        
        throw new VerificationCodeExpiredError(context);
      }
    }

    // Check if max attempts exceeded
    if (verification.attempts >= verification.maxAttempts) {
      await this.repositories.phoneVerificationRepository.markAsUsed(
        verification.id
      );

      logger.warn("Max verification attempts exceeded", {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        attempts: verification.attempts,
        requestId: context?.requestId,
      });

      throw new VerificationMaxAttemptsError(undefined, context);
    }

    // Verify the code
    logger.info("🔐 VERIFYING CODE:", {
      providedCode: code,
      providedCodeLength: code.length,
      hashedCodeFromDB: verification.code.substring(0, 20) + '...',
    });

    const isValidCode = await this.tokenService.verifyCode(code, verification.code);

    logger.info("✔️ CODE VERIFICATION RESULT:", {
      isValid: isValidCode,
      providedCode: code,
    });

    // Update attempt count
    const newAttempts =
      await this.repositories.phoneVerificationRepository.incrementAttempts(
        verification.id
      );

    if (!isValidCode) {
      const attemptsRemaining = verification.maxAttempts - newAttempts;

      logger.warn("Invalid verification code attempt", {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        attempts: newAttempts,
        attemptsRemaining,
        requestId: context?.requestId,
      });

      // Log failed verification attempt
      await this.repositories.auditLogRepository.create({
        userId: verification.userId || undefined,
        action: "PHONE_VERIFY",
        entity: "PhoneVerification",
        entityId: verification.id,
        details: {
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          purpose,
          action: "code_failed",
          attempts: newAttempts,
          attemptsRemaining,
        },
        ipAddress: context?.ipAddress || undefined,
        userAgent: context?.userAgent || undefined,
      });

      if (attemptsRemaining <= 0) {
        await this.repositories.phoneVerificationRepository.markAsUsed(
          verification.id
        );
        throw new VerificationMaxAttemptsError(undefined, context);
      }

      throw new VerificationCodeInvalidError(attemptsRemaining, context);
    }

    // Mark as used on successful verification
    await this.repositories.phoneVerificationRepository.markAsUsed(
      verification.id
    );

    // Log successful verification
    await this.repositories.auditLogRepository.create({
      userId: verification.userId || undefined,
      action: "PHONE_VERIFY",
      entity: "PhoneVerification",
      entityId: verification.id,
      details: {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        purpose,
        action: "code_verified",
        attempts: newAttempts,
      },
      ipAddress: context?.ipAddress || undefined,
      userAgent: context?.userAgent || undefined,
    });

    logger.info("Phone verification successful", {
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      purpose,
      userId: verification.userId,
      attempts: newAttempts,
      requestId: context?.requestId,
    });

    return {
      success: true,
      message: "Phone number verified successfully",
    };
  }

  async getVerificationStats(
    phoneNumber?: string,
    purpose?: PrismaVerificationPurpose,
    context?: ErrorContext
  ): Promise<VerificationStats> {
    try {
      return await this.repositories.phoneVerificationRepository.getStats(
        phoneNumber,
        purpose
      );
    } catch (error) {
      logger.error("Failed to get verification stats", {
        error: error instanceof Error ? error.message : String(error),
        requestId: context?.requestId,
      });
      throw error;
    }
  }

  async invalidateUserVerifications(
    userId: string,
    context?: ErrorContext
  ): Promise<void> {
    await this.repositories.phoneVerificationRepository.invalidateUserVerifications(
      userId
    );

    logger.info("All user verification codes invalidated", {
      userId,
      requestId: context?.requestId,
    });
  }

  private async checkRateLimits(
    phoneNumber: string,
    ipAddress?: string,
    context?: ErrorContext
  ): Promise<void> {
    const { phoneCount, ipCount } =
      await this.repositories.phoneVerificationRepository.countDailyRequests(
        phoneNumber,
        ipAddress
      );

    if (phoneCount >= PhoneVerificationService.DAILY_LIMIT) {
      logger.warn("Daily phone verification limit exceeded", {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        count: phoneCount,
        limit: PhoneVerificationService.DAILY_LIMIT,
        requestId: context?.requestId,
      });

      throw new DailyLimitExceededError(context);
    }

    if (ipAddress && ipCount >= PhoneVerificationService.IP_DAILY_LIMIT) {
      logger.warn("Daily IP verification limit exceeded", {
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
      return parsed?.format("E.164") || null;
    } catch (error) {
      logger.warn("Phone number parsing failed", {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) {
      return "*".repeat(phoneNumber.length);
    }

    const visibleDigits = 3;
    const maskedPart = "*".repeat(phoneNumber.length - visibleDigits);
    return maskedPart + phoneNumber.slice(-visibleDigits);
  }

  private async sendSMSCode(
    phoneNumber: string,
    code: string,
    purpose: PrismaVerificationPurpose,
    context?: ErrorContext
  ): Promise<void> {
    // In development mode: Only log the code, don't send actual SMS
    if (process.env.NODE_ENV === 'development') {
      logger.info(
        `🔐 [DEV MODE] Verification code generated (SMS NOT sent): ${code}`,
        {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          purpose,
          code,
          requestId: context?.requestId,
          note: 'SMS sending is disabled in development mode. Use this code for testing.',
        }
      );
      return; // Skip actual SMS sending in development
    }

    // Production mode: Send actual SMS via NetGSM
    const message = SMSMessageTemplates.verification.getMessage(code, purpose);

    logger.info("Sending SMS verification code", {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      purpose,
      messageLength: message.length,
      requestId: context?.requestId,
    });

    try {
      const result = await this.smsService.sendSMS({
        phoneNumber,
        message,
        context,
      });

      if (result.success) {
        logger.info("SMS verification code sent successfully", {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          purpose,
          messageId: result.messageId,
          requestId: context?.requestId,
        });
      } else {
        const errorMessage = result.error || "Unknown error";
        logger.error("SMS verification code failed to send", {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          purpose,
          error: errorMessage,
          requestId: context?.requestId,
        });
        // Don't throw error to prevent breaking the flow, but log it prominently
        // The code is still stored and can be verified manually if needed
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("SMS sending exception occurred", {
        error: errorMessage,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
        requestId: context?.requestId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw error to prevent breaking the flow, but log it prominently
    }
  }


  // Cleanup expired verifications (call this periodically)
  async cleanupExpiredVerifications(): Promise<number> {
    const count = await this.repositories.phoneVerificationRepository.cleanup();

    if (count > 0) {
      logger.info("Cleaned up expired verification codes", { count });
    }

    return count;
  }
}
