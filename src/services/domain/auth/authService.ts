import { AuditAction, VerificationPurpose } from "@prisma/client";
import { parsePhoneNumber } from "libphonenumber-js";
import { RepositoryContainer } from "../../../repositories";
import {
  CreateUserData,
  DeviceInfo,
  LoginResult,
  UpdateUserData,
  UserProfile,
  UserStats,
} from "../../../types/auth";
import { BusinessSubscriptionData } from "../../../types/business";
import {
  BusinessRuleViolationError,
  ErrorContext,
  InternalServerError,
  PhoneAlreadyExistsError,
  UnauthorizedError,
  UserDeactivatedError,
  UserLockedError,
  UserNotFoundError,
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  VerificationMaxAttemptsError,
} from "../../../types/errors";
import { ReliabilityScoreCalculator } from "../userBehavior/reliabilityScoreCalculator";
import { PhoneVerificationService } from "../sms/phoneVerificationService";
import { RBACService } from "../rbac/rbacService";
import { TokenService } from "../token/tokenService";
import logger from "../../../utils/Logger/logger";
export class AuthService {
  constructor(
    private repositories: RepositoryContainer,
    private phoneVerificationService: PhoneVerificationService,
    private tokenService: TokenService,
    private rbacService?: RBACService
  ) {}

  async registerOrLogin(
    phoneNumber: string,
    verificationCode: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<LoginResult> {
    logger.info("🚀 AUTH SERVICE CALLED:", {
      phoneNumber,
      verificationCode,
      requestId: context?.requestId,
    });

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    logger.info("✅ AUTH SERVICE PHONE NORMALIZED:", {
      original: phoneNumber,
      normalized: normalizedPhone,
    });

    // Debug logging
    logger.info("Auth service verification attempt", {
      originalPhone: phoneNumber,
      normalizedPhone: this.maskPhoneNumber(normalizedPhone),
      verificationCode: verificationCode,
      requestId: context?.requestId,
    });

    // Auto-detect purpose: check if user exists (same logic as sendVerificationCode)
    let purpose: VerificationPurpose = VerificationPurpose.REGISTRATION;
    try {
      const existingUser = await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);
      purpose = existingUser ? VerificationPurpose.LOGIN : VerificationPurpose.REGISTRATION;
      logger.info("Detected verification purpose", {
        normalizedPhone: this.maskPhoneNumber(normalizedPhone),
        purpose,
        userExists: !!existingUser,
        requestId: context?.requestId,
      });
    } catch (error) {
      logger.warn("Failed to check if user exists, defaulting to REGISTRATION", {
        error: error instanceof Error ? error.message : String(error),
        requestId: context?.requestId,
      });
    }

    // Verify the phone verification code
    try {
      const verificationResult = await this.phoneVerificationService.verifyCode(
        normalizedPhone,
        verificationCode,
        purpose,
        context
      );

      if (!verificationResult.success) {
        await this.logFailedLoginAttempt(normalizedPhone, deviceInfo, context);
        throw new UnauthorizedError(verificationResult.message, context);
      }
    } catch (error) {
      // Handle verification service exceptions
      if (error instanceof VerificationCodeExpiredError || 
          error instanceof VerificationCodeInvalidError || 
          error instanceof VerificationMaxAttemptsError) {
        await this.logFailedLoginAttempt(normalizedPhone, deviceInfo, context);
        throw error; // Re-throw the verification error
      }
      throw error; // Re-throw other errors
    }

    // Check if user exists and handle race conditions
    let user = await this.repositories.userRepository.findByPhoneNumber(
      normalizedPhone
    );
    let isNewUser = !user;

    if (!user) {
      try {
        // Create new user with proper error handling for race conditions
        user = await this.createUser(
          {
            phoneNumber: normalizedPhone,
          },
          context
        );
      } catch (error: unknown) {
        // Handle unique constraint violation (race condition)
        if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('phoneNumber')) {
          // Another request created the user, fetch it
          user = await this.repositories.userRepository.findByPhoneNumber(
            normalizedPhone
          );
          if (!user) {
            throw new UnauthorizedError(
              "User creation failed due to concurrent access",
              context
            );
          }
          isNewUser = false;
        } else {
          throw error;
        }
      }
    } else {
      // Validate existing user status
      await this.validateUserStatus(user, context);
      await this.repositories.userRepository.updateLastLogin(
        user.id,
        deviceInfo?.ipAddress
      );
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
      entity: "User",
      entityId: user.id,
      details: {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        isNewUser,
        deviceInfo: this.sanitizeDeviceInfo(deviceInfo),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info(
      isNewUser
        ? "User registered successfully"
        : "User logged in successfully",
      {
        userId: user.id,
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        isNewUser,
        requestId: context?.requestId,
      }
    );

    // Remove security fields from response
    const { failedLoginAttempts, lockedUntil, ...userResponse } = user;

    // Include role information if RBAC service is available
    let userWithRoles = userResponse;
    if (this.rbacService) {
      try {
        const userPermissions = await this.rbacService.getUserPermissions(
          user.id
        );
        userWithRoles = {
          ...userResponse,
          roles: userPermissions.roles.map((role) => ({
            name: role.name,
            displayName: role.displayName,
            level: role.level,
          })),
          effectiveLevel: userPermissions.effectiveLevel,
        };
      } catch (error) {
        logger.warn("Failed to fetch user roles during login", {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with user without roles if RBAC fails
      }
    }

    return {
      user: userWithRoles,
      tokens,
      isNewUser,
    };
  }

  async getUserProfile(
    userId: string,
    context?: ErrorContext
  ): Promise<UserProfile> {
    const user = await this.repositories.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundError("User profile not found", context);
    }

    // Include role information if RBAC service is available
    if (this.rbacService) {
      try {
        const userPermissions = await this.rbacService.getUserPermissions(
          userId
        );
        return {
          ...user,
          roles: userPermissions.roles.map((role) => ({
            name: role.name,
            displayName: role.displayName,
            level: role.level,
          })),
          effectiveLevel: userPermissions.effectiveLevel,
        };
      } catch (error) {
        logger.warn("Failed to fetch user roles", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Return user without roles if RBAC fails
        return user;
      }
    }

    return user;
  }

  async getUserProfileWithBusinessSummary(
    userId: string,
    context?: ErrorContext
  ): Promise<
    UserProfile & {
      businessSummary?: {
        totalBusinesses: number;
        activeSubscriptions: number;
        subscriptionStatus: string[];
        primaryBusiness?: {
          id: string;
          name: string;
          slug: string;
          isVerified: boolean;
        };
      };
    }
  > {
    const user = await this.getUserProfile(userId, context);

    try {
      // Check if user has OWNER role to fetch business summary
      const userPermissions = await this.rbacService?.getUserPermissions(
        userId
      );
      const roleNames = userPermissions?.roles.map((role) => role.name) || [];

      if (roleNames.includes("OWNER")) {
        // Get owned businesses with subscription info using repositories
        const [ownedBusinesses, activeSubscriptions] = await Promise.all([
          this.repositories.businessRepository.findByOwnerId(userId),
          this.repositories.subscriptionRepository.findActiveByOwnerId(userId),
        ]);

        const businesses = ownedBusinesses || [];
        const subscriptions = activeSubscriptions || [];
        const subscriptionStatuses: string[] = [
          ...new Set(subscriptions.map((s: BusinessSubscriptionData) => s.status)),
        ];

        return {
          ...user,
          businessSummary: {
            totalBusinesses: businesses.length,
            activeSubscriptions: subscriptions.length,
            subscriptionStatus: subscriptionStatuses,
            primaryBusiness:
              businesses.length > 0
                ? {
                    id: businesses[0].id,
                    name: businesses[0].name,
                    slug: businesses[0].slug,
                    isVerified: businesses[0].isVerified,
                  }
                : undefined,
          },
        };
      }
    } catch (error) {
      logger.warn("Failed to fetch business summary", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return user;
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateUserData,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<UserProfile> {
    const existingUser = await this.repositories.userRepository.findById(
      userId
    );

    if (!existingUser) {
      throw new UserNotFoundError("User not found", context);
    }

    // Validate update constraints
    this.validateProfileUpdates(updates, context);

    const updatedUser = await this.repositories.userRepository.update(
      userId,
      updates
    );

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_UPDATE,
      entity: "User",
      entityId: userId,
      details: {
        updates: Object.keys(updates),
        changes: updates,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info("User profile updated", {
      userId,
      updatedFields: Object.keys(updates),
      requestId: context?.requestId,
    });

    // Include role information if RBAC service is available
    if (this.rbacService) {
      try {
        const userPermissions = await this.rbacService.getUserPermissions(
          userId
        );
        return {
          ...updatedUser,
          roles: userPermissions.roles.map((role) => ({
            name: role.name,
            displayName: role.displayName,
            level: role.level,
          })),
          effectiveLevel: userPermissions.effectiveLevel,
        };
      } catch (error) {
        logger.warn("Failed to fetch user roles after update", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Return user without roles if RBAC fails
        return updatedUser;
      }
    }

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
    const existingUser =
      await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);
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
      throw new UserNotFoundError("User not found", context);
    }

    const oldPhone = user.phoneNumber;

    // Update phone number
    await this.repositories.userRepository.updatePhoneNumber(
      userId,
      normalizedPhone
    );

    // Revoke all existing tokens for security
    await this.repositories.refreshTokenRepository.revokeAllByUserId(userId);

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_UPDATE,
      entity: "User",
      entityId: userId,
      details: {
        action: "phone_change",
        oldPhone: this.maskPhoneNumber(oldPhone),
        newPhone: this.maskPhoneNumber(normalizedPhone),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info("User phone number changed", {
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
      throw new UserNotFoundError("User not found", context);
    }

    // Deactivate user account
    await this.repositories.userRepository.deactivate(userId);

    // Revoke all tokens
    await this.repositories.refreshTokenRepository.revokeAllByUserId(userId);

    // Invalidate all verification codes
    await this.repositories.phoneVerificationRepository.invalidateUserVerifications(
      userId
    );

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_DELETE,
      entity: "User",
      entityId: userId,
      details: { action: "deactivate" },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info("User account deactivated", {
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
      await this.repositories.refreshTokenRepository.revokeByToken(
        refreshToken
      );
    }

    // Log audit event
    await this.repositories.auditLogRepository.create({
      userId,
      action: AuditAction.USER_LOGOUT,
      entity: "User",
      entityId: userId,
      details: {
        hasRefreshToken: !!refreshToken,
        deviceInfo: this.sanitizeDeviceInfo(deviceInfo),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info("User logged out", {
      userId,
      requestId: context?.requestId,
    });
  }

  async getUserStats(context?: ErrorContext): Promise<UserStats> {
    try {
      return await this.repositories.userRepository.getUserStats();
    } catch (error) {
      logger.error("Failed to get user stats", {
        error: error instanceof Error ? error.message : String(error),
        requestId: context?.requestId,
      });
      throw error;
    }
  }

  private async createUser(
    data: CreateUserData,
    context?: ErrorContext
  ): Promise<
    UserProfile & { failedLoginAttempts: number; lockedUntil?: Date | null }
  > {
    const userData = {
      ...data,
      timezone: data.timezone || "Europe/Istanbul",
      language: data.language || "tr",
    };

    const user = await this.repositories.userRepository.create(userData);

    // Assign default CUSTOMER role to new user - THIS IS CRITICAL
    // Without a role, the user has no permissions and cannot use the system
    if (!this.rbacService) {
      // If RBAC service is not available, we cannot create users safely
      logger.error("RBAC service not available during user creation", {
        userId: user.id,
        requestId: context?.requestId,
      });
      throw new InternalServerError(
        "System configuration error: RBAC service unavailable",
        undefined,
        context
      );
    }

    try {
      await this.rbacService.assignRole(
        user.id,
        "CUSTOMER",
        user.id, // Self-assigned during registration
        undefined, // no expiration
        { source: "auto_registration" }
      );

      logger.info("Default CUSTOMER role assigned to new user", {
        userId: user.id,
        phoneNumber: this.maskPhoneNumber(user.phoneNumber),
        requestId: context?.requestId,
      });
    } catch (error) {
      // CRITICAL: If role assignment fails, the user account is unusable
      // We must fail the registration entirely
      logger.error("CRITICAL: Failed to assign default role to new user", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        requestId: context?.requestId,
      });
      
      // Try to clean up the created user
      try {
        await this.repositories.userRepository.delete(user.id);
        logger.info("Cleaned up user account after role assignment failure", {
          userId: user.id,
          requestId: context?.requestId,
        });
      } catch (cleanupError) {
        logger.error("Failed to clean up user after role assignment failure", {
          userId: user.id,
          cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          requestId: context?.requestId,
        });
      }

      throw new InternalServerError(
        "Failed to set up user account. Please try again.",
        error instanceof Error ? error : new Error(String(error)),
        context
      );
    }

    logger.info("New user created with CUSTOMER role", {
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
    user: UserProfile & {
      failedLoginAttempts: number;
      lockedUntil?: Date | null;
    },
    context?: ErrorContext
  ): Promise<void> {
    if (!user.isActive) {
      throw new UserDeactivatedError("Account is deactivated", context);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000
      );
      throw new UserLockedError(
        "Account is temporarily locked due to multiple failed attempts",
        context,
        {
          retryAfter,
        }
      );
    }

    // Auto-unlock if lock period has expired
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.repositories.userRepository.unlockUser(user.id);

      await this.repositories.auditLogRepository.create({
        userId: user.id,
        action: AuditAction.USER_UNLOCK,
        entity: "User",
        entityId: user.id,
        details: { reason: "auto_unlock_expired" },
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
    const user = await this.repositories.userRepository.findByPhoneNumber(
      phoneNumber
    );

    if (user) {
      const result =
        await this.repositories.userRepository.incrementFailedAttempts(user.id);

      if (result.shouldLock) {
        await this.repositories.auditLogRepository.create({
          userId: user.id,
          action: AuditAction.USER_LOCK,
          entity: "User",
          entityId: user.id,
          details: {
            reason: "max_failed_attempts",
            attempts: result.attempts,
            deviceInfo: this.sanitizeDeviceInfo(deviceInfo),
          },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });

        logger.warn("User account locked due to failed attempts", {
          userId: user.id,
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          attempts: result.attempts,
          requestId: context?.requestId,
        });
      }
    }
  }

  private validateProfileUpdates(
    updates: UpdateUserData,
    context?: ErrorContext
  ): void {
    // Business rule validations
    if (updates.firstName && updates.firstName.length < 1) {
      throw new BusinessRuleViolationError(
        "first_name_length",
        "First name cannot be empty",
        context
      );
    }

    if (updates.lastName && updates.lastName.length < 1) {
      throw new BusinessRuleViolationError(
        "last_name_length",
        "Last name cannot be empty",
        context
      );
    }

    if (updates.timezone && !this.isValidTimezone(updates.timezone)) {
      throw new BusinessRuleViolationError(
        "invalid_timezone",
        "Invalid timezone provided",
        context
      );
    }

    if (updates.language && !this.isValidLanguageCode(updates.language)) {
      throw new BusinessRuleViolationError(
        "invalid_language",
        "Invalid language code provided",
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
      "en",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "ru",
      "ja",
      "ko",
      "zh",
      "ar",
      "hi",
      "tr",
      "pl",
      "nl",
      "sv",
      "da",
      "no",
      "fi",
    ];
    return validLanguages.includes(language.toLowerCase());
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      return parsed.format("E.164");
    } catch {
      throw new Error("Invalid phone number format");
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

  async getMyCustomers(
    userId: string,
    filters?: {
      search?: string;
      page?: number;
      limit?: number;
      status?: 'all' | 'banned' | 'flagged' | 'active';
      sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'lastLoginAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    customers: UserProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Check if user has business role - only OWNER and STAFF can access
    if (this.rbacService) {
      const userPermissions = await this.rbacService.getUserPermissions(userId);
      const roleNames = userPermissions.roles.map((role) => role.name);
      const hasBusinessRole = roleNames.some((role) =>
        ["OWNER", "STAFF"].includes(role)
      );

      if (!hasBusinessRole) {
        throw new Error("Access denied. Business role required.");
      }
    }

    // Get customers who have appointments at user's businesses
    return await this.repositories.userRepository.findCustomersByUserBusinesses(
      userId,
      filters   
    );
  }

  async getCustomerDetails(
    userId: string,
    customerId: string
  ): Promise<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber: string;
    avatar?: string | null;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
    lastLoginAt?: Date | null;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowCount: number;
    reliabilityScore: number;
    lastAppointmentDate?: Date | null;
    isBanned: boolean;
    bannedUntil?: Date | null;
    banReason?: string | null;
    currentStrikes: number;
  }> {
    // Check if user has business role
    if (this.rbacService) {
      const userPermissions = await this.rbacService.getUserPermissions(userId);
      const roleNames = userPermissions.roles.map((role) => role.name);
      const hasBusinessRole = roleNames.some((role) =>
        ["OWNER", "STAFF"].includes(role)
      );

      if (!hasBusinessRole) {
        throw new Error("Access denied. Business role required.");
      }
    }

    // Get basic customer information
    const customer = await this.repositories.userRepository.findById(
      customerId
    );
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if customer is accessible by verifying they have appointments with user's businesses
    try {
      const customerList =
        await this.repositories.userRepository.findCustomersByUserBusinesses(
          userId,
          {
            search: customer.phoneNumber,
            limit: 1,
          }
        );

      const isAccessible = customerList.customers.some(
        (c) => c.id === customerId
      );
      if (!isAccessible) {
        throw new Error("Customer not found or not accessible");
      }
    } catch (error) {
      throw new Error("Customer not found or not accessible");
    }

    // Get actual appointment statistics for this customer
    const appointmentStats =
      await this.repositories.appointmentRepository.getCustomerAppointmentStats(
        customerId,
        userId
      );

    // Get user behavior data including ban status
    const userBehavior =
      await this.repositories.userBehaviorRepository.findByUserId(customerId);

    // Calculate reliability score based on actual data
    const {
      totalAppointments,
      completedAppointments,
      cancelledAppointments: canceledAppointments,
      noShowCount,
      lastAppointmentDate,
    } = appointmentStats;

    // Calculate reliability score using centralized calculator
    const reliabilityResult = ReliabilityScoreCalculator.calculate({
      totalAppointments,
      completedAppointments,
      cancelledAppointments: canceledAppointments,
      noShowAppointments: noShowCount,
      currentStrikes: userBehavior?.currentStrikes || 0,
      isBanned: userBehavior?.isBanned || false,
      bannedUntil: userBehavior?.bannedUntil,
    });

    const reliabilityScore = reliabilityResult.score;

    // Check if user is currently banned
    const now = new Date();
    const isBanned =
      userBehavior?.isBanned &&
      (!userBehavior.bannedUntil || userBehavior.bannedUntil > now);

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phoneNumber,
      avatar: customer.avatar,
      isActive: customer.isActive,
      isVerified: customer.isVerified,
      createdAt: customer.createdAt,
      lastLoginAt: customer.lastLoginAt,
      totalAppointments,
      completedAppointments,
      cancelledAppointments: canceledAppointments,
      noShowCount,
      reliabilityScore: reliabilityScore,
      lastAppointmentDate,
      // Ban status information
      isBanned: isBanned || false,
      bannedUntil: userBehavior?.bannedUntil || null,
      banReason: isBanned ? userBehavior?.banReason || null : null,
      currentStrikes: userBehavior?.currentStrikes || 0,
    };
  }

  private sanitizeDeviceInfo(deviceInfo?: DeviceInfo): Record<string, unknown> | null {
    if (!deviceInfo) return null;

    return {
      hasDeviceId: !!deviceInfo.deviceId,
      userAgentLength: deviceInfo.userAgent?.length || 0,
      ipAddress: deviceInfo.ipAddress,
    };
  }
}
