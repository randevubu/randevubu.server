import { VerificationPurpose, AuditAction } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { PhoneVerificationService } from './phoneVerificationService';
import { TokenService } from './tokenService';
import { 
  UserProfile,
  CreateUserData,
  UpdateUserData,
  LoginResult,
  DeviceInfo,
  UserStats
} from '../types/auth';
import {
  ErrorContext,
  UserNotFoundError,
  UnauthorizedError,
  UserLockedError,
  UserDeactivatedError,
  PhoneAlreadyExistsError,
  BusinessRuleViolationError
} from '../types/errors';
import { logger } from '../utils/logger';
import { parsePhoneNumber } from 'libphonenumber-js';

export class AuthService {
  constructor(
    private repositories: RepositoryContainer,
    private phoneVerificationService: PhoneVerificationService,
    private tokenService: TokenService
  ) {}

  async registerOrLogin(
    phoneNumber: string,
    verificationCode: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<LoginResult> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Verify the phone verification code
    const verificationResult = await this.phoneVerificationService.verifyCode(
      normalizedPhone,
      verificationCode,
      VerificationPurpose.REGISTRATION,
      context
    );

    if (!verificationResult.success) {
      await this.logFailedLoginAttempt(normalizedPhone, deviceInfo, context);
      throw new UnauthorizedError(verificationResult.message, context);
    }

    // Check if user exists
    let user = await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);
    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await this.createUser({
        phoneNumber: normalizedPhone,
      }, context);
    } else {
      // Validate existing user status
      await this.validateUserStatus(user, context);
      await this.repositories.userRepository.updateLastLogin(user.id, deviceInfo?.ipAddress);
    }

    // Mark user as verified if not already
    if (!user.isVerified) {
      await this.repositories.userRepository.markAsVerified(user.id);
      user.isVerified = true;
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.phoneNumber,
      deviceInfo,
      context
    );

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId: user.id,
      action: isNewUser ? AuditAction.USER_REGISTER : AuditAction.USER_LOGIN,
      entity: 'User',
      entityId: user.id,
      details: { 
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        isNewUser,
        deviceInfo: this.sanitizeDeviceInfo(deviceInfo)
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info(isNewUser ? 'User registered successfully' : 'User logged in successfully', {
      userId: user.id,
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      isNewUser,
      requestId: context?.requestId,
    });

    // Remove security fields from response
    const { failedLoginAttempts, lockedUntil, ...userResponse } = user;

    return {
      user: userResponse,
      tokens,
      isNewUser,
    };
  }

  async getUserProfile(userId: string, context?: ErrorContext): Promise<UserProfile> {
    const user = await this.repositories.userRepository.findById(userId);
    
    if (!user) {
      throw new UserNotFoundError('User profile not found', context);
    }

    return user;
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateUserData,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<UserProfile> {
    const existingUser = await this.repositories.userRepository.findById(userId);
    
    if (!existingUser) {
      throw new UserNotFoundError('User not found', context);
    }

    // Validate update constraints
    this.validateProfileUpdates(updates, context);

    const updatedUser = await this.repositories.userRepository.update(userId, updates);

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_UPDATE,
      entity: 'User',
      entityId: userId,
      details: { 
        updates: Object.keys(updates),
        changes: updates
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(updates),
      requestId: context?.requestId,
    });

    return updatedUser;
  }

  async changePhoneNumber(
    userId: string,
    newPhoneNumber: string,
    verificationCode: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<void> {
    const normalizedPhone = this.normalizePhoneNumber(newPhoneNumber);

    // Check if phone number is already in use
    const existingUser = await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new PhoneAlreadyExistsError(context);
    }

    // Verify the phone verification code for the new number
    const verificationResult = await this.phoneVerificationService.verifyCode(
      normalizedPhone,
      verificationCode,
      VerificationPurpose.PHONE_CHANGE,
      context
    );

    if (!verificationResult.success) {
      throw new UnauthorizedError(verificationResult.message, context);
    }

    const user = await this.repositories.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError('User not found', context);
    }

    const oldPhone = user.phoneNumber;

    // Update phone number
    await this.repositories.userRepository.updatePhoneNumber(userId, normalizedPhone);

    // Revoke all existing tokens for security
    await this.repositories.refreshTokenRepository.revokeAllByUserId(userId);

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_UPDATE,
      entity: 'User',
      entityId: userId,
      details: {
        action: 'phone_change',
        oldPhone: this.maskPhoneNumber(oldPhone),
        newPhone: this.maskPhoneNumber(normalizedPhone),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info('User phone number changed', {
      userId,
      oldPhone: this.maskPhoneNumber(oldPhone),
      newPhone: this.maskPhoneNumber(normalizedPhone),
      requestId: context?.requestId,
    });
  }

  async deactivateUser(
    userId: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<void> {
    const user = await this.repositories.userRepository.findById(userId);
    
    if (!user) {
      throw new UserNotFoundError('User not found', context);
    }

    // Deactivate user account
    await this.repositories.userRepository.deactivate(userId);

    // Revoke all tokens
    await this.repositories.refreshTokenRepository.revokeAllByUserId(userId);

    // Invalidate all verification codes
    await this.repositories.phoneVerificationRepository.invalidateUserVerifications(userId);

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_DELETE,
      entity: 'User',
      entityId: userId,
      details: { action: 'deactivate' },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info('User account deactivated', {
      userId,
      phoneNumber: this.maskPhoneNumber(user.phoneNumber),
      requestId: context?.requestId,
    });
  }

  async logout(
    userId: string,
    refreshToken?: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<void> {
    if (refreshToken) {
      await this.repositories.refreshTokenRepository.revokeByToken(refreshToken);
    }

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_LOGOUT,
      entity: 'User',
      entityId: userId,
      details: { 
        hasRefreshToken: !!refreshToken,
        deviceInfo: this.sanitizeDeviceInfo(deviceInfo)
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info('User logged out', {
      userId,
      requestId: context?.requestId,
    });
  }

  async getUserStats(context?: ErrorContext): Promise<UserStats> {
    try {
      return await this.repositories.userRepository.getUserStats();
    } catch (error) {
      logger.error('Failed to get user stats', {
        error: error instanceof Error ? error.message : String(error),
        requestId: context?.requestId,
      });
      throw error;
    }
  }

  private async createUser(
    data: CreateUserData,
    context?: ErrorContext
  ): Promise<UserProfile & { failedLoginAttempts: number; lockedUntil?: Date | null }> {
    const userData = {
      ...data,
      timezone: data.timezone || 'UTC',
      language: data.language || 'en',
    };

    const user = await this.repositories.userRepository.create(userData);

    logger.info('New user created', {
      userId: user.id,
      phoneNumber: this.maskPhoneNumber(user.phoneNumber),
      requestId: context?.requestId,
    });

    // Return user with security fields for internal use
    return {
      ...user,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
  }

  private async validateUserStatus(
    user: UserProfile & { failedLoginAttempts: number; lockedUntil?: Date | null },
    context?: ErrorContext
  ): Promise<void> {
    if (!user.isActive) {
      throw new UserDeactivatedError('Account is deactivated', context);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const unlockTime = user.lockedUntil.toISOString();
      throw new UserLockedError(
        `Account is temporarily locked until ${unlockTime}`,
        context,
        { retryAfter: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000) }
      );
    }

    // Auto-unlock if lock period has expired
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.repositories.userRepository.unlockUser(user.id);
      
      await this.repositories.auditLogRepository.create({
        userId: user.id,
        action: AuditAction.USER_UNLOCK,
        entity: 'User',
        entityId: user.id,
        details: { reason: 'auto_unlock_expired' },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    }
  }

  private async logFailedLoginAttempt(
    phoneNumber: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<void> {
    const user = await this.repositories.userRepository.findByPhoneNumber(phoneNumber);

    if (user) {
      const result = await this.repositories.userRepository.incrementFailedAttempts(user.id);

      if (result.shouldLock) {
        await this.repositories.auditLogRepository.create({
          userId: user.id,
          action: AuditAction.USER_LOCK,
          entity: 'User',
          entityId: user.id,
          details: { 
            reason: 'max_failed_attempts', 
            attempts: result.attempts,
            deviceInfo: this.sanitizeDeviceInfo(deviceInfo)
          },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });

        logger.warn('User account locked due to failed attempts', {
          userId: user.id,
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          attempts: result.attempts,
          requestId: context?.requestId,
        });
      }
    }
  }

  private validateProfileUpdates(updates: UpdateUserData, context?: ErrorContext): void {
    // Business rule validations
    if (updates.firstName && updates.firstName.length < 1) {
      throw new BusinessRuleViolationError(
        'first_name_length',
        'First name cannot be empty',
        context
      );
    }

    if (updates.lastName && updates.lastName.length < 1) {
      throw new BusinessRuleViolationError(
        'last_name_length', 
        'Last name cannot be empty',
        context
      );
    }

    if (updates.timezone && !this.isValidTimezone(updates.timezone)) {
      throw new BusinessRuleViolationError(
        'invalid_timezone',
        'Invalid timezone provided',
        context
      );
    }

    if (updates.language && !this.isValidLanguageCode(updates.language)) {
      throw new BusinessRuleViolationError(
        'invalid_language',
        'Invalid language code provided',
        context
      );
    }
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private isValidLanguageCode(language: string): boolean {
    const validLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
    ];
    return validLanguages.includes(language.toLowerCase());
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      return parsed.format('E.164');
    } catch {
      throw new Error('Invalid phone number format');
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

  private sanitizeDeviceInfo(deviceInfo?: DeviceInfo): any {
    if (!deviceInfo) return null;

    return {
      hasDeviceId: !!deviceInfo.deviceId,
      userAgentLength: deviceInfo.userAgent?.length || 0,
      ipAddress: deviceInfo.ipAddress,
    };
  }
}