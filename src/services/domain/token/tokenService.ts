import bcrypt from "bcrypt";
import crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { config } from "../../../config/environment";
import { RepositoryContainer } from "../../../repositories";
import {
  DeviceInfo,
  JWTPayload,
  TokenPair,
  TokenServiceConfig,
} from "../../../types/auth";
import {
  ConfigurationError,
  ErrorContext,
  InvalidTokenError,
  TokenExpiredError,
  UnauthorizedError,
} from "../../../types/errors";
import logger from "../../../utils/Logger/logger";
export class TokenService {
  private static readonly DEFAULT_CONFIG: TokenServiceConfig = {
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "30d",
    accessTokenExpirySeconds: 15 * 60,
    refreshTokenExpirySeconds: 30 * 24 * 60 * 60,
  };

  // Bcrypt salt rounds for verification code hashing (12+ recommended for production)
  private static readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private repositories: RepositoryContainer,
    private tokenConfig: TokenServiceConfig = TokenService.DEFAULT_CONFIG
  ) {}

  private validateSecrets(context?: ErrorContext): { accessSecret: string; refreshSecret: string } {
    const accessSecret = config.JWT_ACCESS_SECRET || config.JWT_SECRET;
    const refreshSecret = config.JWT_REFRESH_SECRET || config.JWT_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new ConfigurationError(
        "JWT_SECRET",
        "JWT secrets are not configured",
        context
      );
    }

    // Ensure access and refresh tokens use different secrets for security
    if (accessSecret === refreshSecret) {
      throw new ConfigurationError(
        "JWT_SECRET",
        "Access and refresh token secrets must be different for security",
        context
      );
    }

    return { accessSecret, refreshSecret };
  }

  async generateTokenPair(
    userId: string,
    phoneNumber: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<TokenPair> {
    const { accessSecret, refreshSecret } = this.validateSecrets(context);

    const accessTokenPayload: JWTPayload = {
      userId,
      phoneNumber,
      type: "access",
    };

    const refreshTokenValue = this.generateSecureToken();
    const refreshTokenPayload: JWTPayload = {
      userId,
      phoneNumber,
      type: "refresh",
      tokenValue: refreshTokenValue,
    };

    try {
      // Generate JWT tokens with separate secrets
      const signOptions: jwt.SignOptions = {
        expiresIn: this.tokenConfig.accessTokenExpirySeconds,
        issuer: "randevubu-server",
        audience: "randevubu-client",
        algorithm: "HS256",
      };
      const accessToken = jwt.sign(
        accessTokenPayload,
        accessSecret,
        signOptions
      );

      const refreshSignOptions: jwt.SignOptions = {
        expiresIn: this.tokenConfig.refreshTokenExpirySeconds,
        issuer: "randevubu-server",
        audience: "randevubu-client",
        algorithm: "HS256",
      };
      const refreshToken = jwt.sign(
        refreshTokenPayload,
        refreshSecret,
        refreshSignOptions
      );

      // Store refresh token in database
      await this.repositories.refreshTokenRepository.create({
        userId,
        token: refreshTokenValue,
        isRevoked: false,
        expiresAt: new Date(
          Date.now() + this.tokenConfig.refreshTokenExpirySeconds * 1000
        ),
        deviceId: deviceInfo?.deviceId,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
      });

      // Log token generation
      await this.repositories.auditLogRepository.create({
        userId,
        action: "TOKEN_REFRESH",
        entity: "RefreshToken",
        details: {
          action: "token_generated",
          deviceInfo: this.sanitizeDeviceInfo(deviceInfo),
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      logger.info("Token pair generated", {
        userId,
        hasDeviceId: !!deviceInfo?.deviceId,
        requestId: context?.requestId,
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: this.tokenConfig.accessTokenExpirySeconds,
        refreshExpiresIn: this.tokenConfig.refreshTokenExpirySeconds,
      };
    } catch (error) {
      logger.error("Token generation failed", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        requestId: context?.requestId,
      });
      throw error;
    }
  }

  async verifyAccessToken(
    token: string,
    context?: ErrorContext
  ): Promise<JWTPayload> {
    const { accessSecret } = this.validateSecrets(context);

    try {
      const decoded = jwt.verify(token, accessSecret, {
        issuer: "randevubu-server",
        audience: "randevubu-client",
        algorithms: ["HS256"],
      }) as JWTPayload;

      if (decoded.type !== "access") {
        throw new InvalidTokenError("Invalid token type", context);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenError("Invalid access token format", context);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError("Access token has expired", context);
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new InvalidTokenError("Access token not active yet", context);
      }
      throw error;
    }
  }

  async refreshAccessToken(
    refreshToken: string,
    deviceInfo?: DeviceInfo,
    context?: ErrorContext
  ): Promise<TokenPair> {
    const { refreshSecret } = this.validateSecrets(context);

    try {
      logger.debug("Attempting JWT verification", {
        tokenStart: refreshToken.substring(0, 50),
        tokenLength: refreshToken.length,
        hasJwtRefreshSecret: !!refreshSecret,
        secretStart: refreshSecret?.substring(0, 10),
        requestId: context?.requestId,
      });

      // Verify refresh token JWT
      const decoded = jwt.verify(refreshToken, refreshSecret, {
        issuer: "randevubu-server",
        audience: "randevubu-client",
        algorithms: ["HS256"],
      }) as JWTPayload & { tokenValue: string };

      logger.debug("JWT verification successful", {
        userId: decoded.userId,
        tokenType: decoded.type,
        hasTokenValue: !!decoded.tokenValue,
        exp: decoded.exp,
        requestId: context?.requestId,
      });

      if (decoded.type !== "refresh") {
        throw new InvalidTokenError("Invalid refresh token type", context);
      }

      // Check if refresh token exists and is valid in database
      const storedToken =
        await this.repositories.refreshTokenRepository.findByTokenWithUser(
          decoded.tokenValue
        );

      logger.info('Token lookup result', {
        hasStoredToken: !!storedToken,
        isRevoked: storedToken?.isRevoked,
        expiresAt: storedToken?.expiresAt,
        now: new Date(),
        isExpired: storedToken ? storedToken.expiresAt < new Date() : 'N/A',
        tokenValue: decoded.tokenValue.substring(0, 20) + '...',
        requestId: context?.requestId,
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        logger.error('Token validation failed', {
          reason: !storedToken ? 'not_found_in_db' : storedToken.isRevoked ? 'revoked' : 'expired',
          hasStoredToken: !!storedToken,
          isRevoked: storedToken?.isRevoked,
          expiresAt: storedToken?.expiresAt,
          now: new Date(),
          requestId: context?.requestId,
        });
        throw new UnauthorizedError('Refresh token is invalid or expired', context);
      }

      if (storedToken.userId !== decoded.userId) {
        throw new UnauthorizedError("Token user mismatch", context);
      }

      if (!storedToken.user.isActive) {
        throw new UnauthorizedError("User account is deactivated", context);
      }

      // Update last used timestamp
      await this.repositories.refreshTokenRepository.updateLastUsed(
        decoded.tokenValue
      );

      // Generate new token pair FIRST to ensure user doesn't lose access
      const newTokenPair = await this.generateTokenPair(
        decoded.userId,
        decoded.phoneNumber,
        deviceInfo,
        context
      );

      // Revoke current refresh token AFTER new tokens are generated (token rotation)
      await this.repositories.refreshTokenRepository.revokeByToken(
        decoded.tokenValue
      );

      // Log token refresh
      await this.repositories.auditLogRepository.create({
        userId: decoded.userId,
        action: "TOKEN_REFRESH",
        entity: "RefreshToken",
        details: {
          action: "token_refreshed",
          oldTokenId: storedToken.id,
          deviceInfo: this.sanitizeDeviceInfo(deviceInfo),
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      logger.info("Access token refreshed", {
        userId: decoded.userId,
        oldTokenId: storedToken.id,
        requestId: context?.requestId,
      });

      return newTokenPair;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('JWT verification failed - JsonWebTokenError', {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          tokenStart: refreshToken.substring(0, 50),
          tokenLength: refreshToken.length,
          requestId: context?.requestId,
        });
        throw new InvalidTokenError("Invalid refresh token format", context);
      }
      if (error instanceof jwt.TokenExpiredError) {
        logger.error('Refresh token expired - TokenExpiredError', {
          errorName: error.name,
          errorMessage: error.message,
          expiredAt: error.expiredAt?.toISOString(),
          requestId: context?.requestId,
        });
        throw new TokenExpiredError("Refresh token has expired", context);
      }
      if (error instanceof jwt.NotBeforeError) {
        logger.error('Refresh token not active yet - NotBeforeError', {
          errorName: error.name,
          errorMessage: error.message,
          requestId: context?.requestId,
        });
        throw new InvalidTokenError("Refresh token not active yet", context);
      }

      logger.error('Token refresh failed - Unknown error', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        requestId: context?.requestId,
      });

      throw error;
    }
  }

  async revokeRefreshToken(
    token: string,
    context?: ErrorContext
  ): Promise<void> {
    await this.repositories.refreshTokenRepository.revokeByToken(token);

    logger.info("Refresh token revoked", {
      requestId: context?.requestId,
    });
  }

  async revokeAllUserTokens(
    userId: string,
    context?: ErrorContext
  ): Promise<void> {
    await this.repositories.refreshTokenRepository.revokeAllByUserId(userId);

    // Log security event
    await this.repositories.auditLogRepository.create({
      userId,
      action: "TOKEN_REFRESH",
      entity: "RefreshToken",
      details: {
        action: "all_tokens_revoked",
        reason: "security_event",
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info("All user tokens revoked", {
      userId,
      requestId: context?.requestId,
    });
  }

  async revokeDeviceTokens(
    userId: string,
    deviceId: string,
    context?: ErrorContext
  ): Promise<void> {
    await this.repositories.refreshTokenRepository.revokeByDevice(
      userId,
      deviceId
    );

    // Log security event
    await this.repositories.auditLogRepository.create({
      userId,
      action: "TOKEN_REFRESH",
      entity: "RefreshToken",
      details: {
        action: "device_tokens_revoked",
        deviceId,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.info("Device tokens revoked", {
      userId,
      deviceId,
      requestId: context?.requestId,
    });
  }

  async cleanupExpiredTokens(context?: ErrorContext): Promise<number> {
    const count = await this.repositories.refreshTokenRepository.cleanup();

    if (count > 0) {
      logger.info("Cleaned up expired tokens", {
        count,
        requestId: context?.requestId,
      });
    }

    return count;
  }

  async getUserTokenStats(userId: string, context?: ErrorContext) {
    try {
      return await this.repositories.refreshTokenRepository.getTokenStats(
        userId
      );
    } catch (error) {
      logger.error("Failed to get token stats", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        requestId: context?.requestId,
      });
      throw error;
    }
  }

  async limitUserTokens(
    userId: string,
    maxTokens: number = 5,
    context?: ErrorContext
  ): Promise<number> {
    const revokedCount =
      await this.repositories.refreshTokenRepository.revokeOldTokens(
        userId,
        maxTokens
      );

    if (revokedCount > 0) {
      // Log security event
      await this.repositories.auditLogRepository.create({
        userId,
        action: "TOKEN_REFRESH",
        entity: "RefreshToken",
        details: {
          action: "old_tokens_revoked",
          count: revokedCount,
          reason: "token_limit_enforcement",
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      logger.info("Old tokens revoked due to limit", {
        userId,
        revokedCount,
        maxTokens,
        requestId: context?.requestId,
      });
    }

    return revokedCount;
  }

  // Utility methods for verification codes
  generateSecureCode(length: number = 6): string {
    const digits = "0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      code += digits[randomIndex];
    }

    return code;
  }

  async hashCode(code: string): Promise<string> {
    // Use bcrypt for secure password hashing with automatic salting
    return await bcrypt.hash(code, TokenService.BCRYPT_SALT_ROUNDS);
  }

  async verifyCode(plainCode: string, hashedCode: string): Promise<boolean> {
    // Use bcrypt.compare for secure comparison with timing attack protection
    return await bcrypt.compare(plainCode, hashedCode);
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  private sanitizeDeviceInfo(deviceInfo?: DeviceInfo): Record<string, unknown> | null {
    if (!deviceInfo) return null;

    return {
      hasDeviceId: !!deviceInfo.deviceId,
      userAgentLength: deviceInfo.userAgent?.length || 0,
      ipAddress: deviceInfo.ipAddress,
    };
  }

  // Token validation utilities
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) return true;

      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  getTokenPayload(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  getTokenExpirationTime(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) return null;

      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}
