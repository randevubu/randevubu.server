import { TokenService } from '../../../src/services/tokenService';
import { RepositoryContainer } from '../../../src/repositories';
import { JWTPayload, TokenPair, DeviceInfo, TokenServiceConfig } from '../../../src/types/auth';
import { ErrorContext, TokenExpiredError, InvalidTokenError, UnauthorizedError, ConfigurationError } from '../../../src/types/errors';
import { config } from '../../../src/config/environment';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('../../../src/config/environment');
jest.mock('../../../src/utils/logger');

// Mock JWT
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock crypto
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockRepositories: any;
  let mockConfig: TokenServiceConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock environment config
    (config as any).JWT_SECRET = 'test-secret';
    (config as any).JWT_ACCESS_SECRET = 'test-access-secret';
    (config as any).JWT_REFRESH_SECRET = 'test-refresh-secret';

    // Create mock repositories
    mockRepositories = {
      refreshTokenRepository: {
        create: jest.fn(),
        findByTokenWithUser: jest.fn(),
        updateLastUsed: jest.fn(),
        revokeByToken: jest.fn(),
        revokeAllByUserId: jest.fn(),
        revokeByDevice: jest.fn(),
        cleanup: jest.fn(),
        getTokenStats: jest.fn(),
        revokeOldTokens: jest.fn()
      },
      auditLogRepository: {
        create: jest.fn()
      }
    };

    mockConfig = {
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '30d',
      accessTokenExpirySeconds: 15 * 60,
      refreshTokenExpirySeconds: 30 * 24 * 60 * 60
    };

    // Create TokenService instance
    tokenService = new TokenService(mockRepositories as RepositoryContainer, mockConfig);
  });

  describe('constructor', () => {
    it('should create TokenService instance with default config', () => {
      const service = new TokenService(mockRepositories as RepositoryContainer);
      expect(service).toBeInstanceOf(TokenService);
    });

    it('should create TokenService instance with custom config', () => {
      const customConfig = {
        accessTokenExpiry: '30m',
        refreshTokenExpiry: '7d',
        accessTokenExpirySeconds: 30 * 60,
        refreshTokenExpirySeconds: 7 * 24 * 60 * 60
      };
      const service = new TokenService(mockRepositories as RepositoryContainer, customConfig);
      expect(service).toBeInstanceOf(TokenService);
    });
  });

  describe('generateTokenPair', () => {
    const mockDeviceInfo: DeviceInfo = {
      deviceId: 'device-123',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1'
    };

    const mockContext: ErrorContext = {
      requestId: 'req-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should generate token pair successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const phoneNumber = '+905551234567';
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';
      const mockTokenValue = 'token-value-123';

      mockJwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      mockCrypto.randomBytes.mockReturnValue(Buffer.from('mock-random-bytes'));
      mockCrypto.randomInt.mockReturnValue(5);

      mockRepositories.refreshTokenRepository.create.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await tokenService.generateTokenPair(userId, phoneNumber, mockDeviceInfo, mockContext);

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: mockConfig.accessTokenExpirySeconds,
        refreshExpiresIn: mockConfig.refreshTokenExpirySeconds
      });

      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockRepositories.refreshTokenRepository.create).toHaveBeenCalledWith({
        userId,
        token: expect.any(String),
        isRevoked: false,
        expiresAt: expect.any(Date),
        deviceId: mockDeviceInfo.deviceId,
        userAgent: mockDeviceInfo.userAgent,
        ipAddress: mockDeviceInfo.ipAddress
      });
    });

    it('should throw error when JWT secrets are not configured', async () => {
      // Arrange
      (config as any).JWT_SECRET = undefined;
      (config as any).JWT_ACCESS_SECRET = undefined;
      (config as any).JWT_REFRESH_SECRET = undefined;

      // Act & Assert
      await expect(tokenService.generateTokenPair('user-123', '+905551234567'))
        .rejects.toThrow(ConfigurationError);
    });

    it('should handle JWT signing error', async () => {
      // Arrange
      mockJwt.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      // Act & Assert
      await expect(tokenService.generateTokenPair('user-123', '+905551234567'))
        .rejects.toThrow('JWT signing failed');
    });
  });

  describe('verifyAccessToken', () => {
    const mockContext: ErrorContext = {
      requestId: 'req-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should verify access token successfully', async () => {
      // Arrange
      const token = 'valid-access-token';
      const mockPayload: JWTPayload = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'access'
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      // Act
      const result = await tokenService.verifyAccessToken(token, mockContext);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-access-secret', {
        issuer: 'randevubu-server',
        audience: 'randevubu-client',
        algorithms: ['HS256']
      });
    });

    it('should throw error when JWT access secret is not configured', async () => {
      // Arrange
      (config as any).JWT_ACCESS_SECRET = undefined;
      (config as any).JWT_SECRET = undefined;

      // Act & Assert
      await expect(tokenService.verifyAccessToken('token'))
        .rejects.toThrow(ConfigurationError);
    });

    it('should throw InvalidTokenError for invalid token type', async () => {
      // Arrange
      const token = 'invalid-token';
      const mockPayload = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'refresh' // Wrong type
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      // Act & Assert
      await expect(tokenService.verifyAccessToken(token, mockContext))
        .rejects.toThrow(InvalidTokenError);
    });

    it('should throw InvalidTokenError for malformed token', async () => {
      // Arrange
      const token = 'malformed-token';
      const jwtError = new jwt.JsonWebTokenError('Invalid token');

      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      // Act & Assert
      await expect(tokenService.verifyAccessToken(token, mockContext))
        .rejects.toThrow(InvalidTokenError);
    });

    it('should throw TokenExpiredError for expired token', async () => {
      // Arrange
      const token = 'expired-token';
      const jwtError = new jwt.TokenExpiredError('Token expired', new Date());

      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      // Act & Assert
      await expect(tokenService.verifyAccessToken(token, mockContext))
        .rejects.toThrow(TokenExpiredError);
    });

    it('should throw InvalidTokenError for token not active yet', async () => {
      // Arrange
      const token = 'future-token';
      const jwtError = new jwt.NotBeforeError('Token not active yet', new Date());

      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      // Act & Assert
      await expect(tokenService.verifyAccessToken(token, mockContext))
        .rejects.toThrow(InvalidTokenError);
    });
  });

  describe('refreshAccessToken', () => {
    const mockDeviceInfo: DeviceInfo = {
      deviceId: 'device-123',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1'
    };

    const mockContext: ErrorContext = {
      requestId: 'req-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should refresh access token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'refresh',
        tokenValue: 'token-value-123'
      };

      const mockStoredToken = {
        id: 'stored-token-123',
        userId: 'user-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        user: {
          isActive: true
        }
      };

      const mockNewTokenPair: TokenPair = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 2592000
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockRepositories.refreshTokenRepository.findByTokenWithUser.mockResolvedValue(mockStoredToken);
      mockRepositories.refreshTokenRepository.updateLastUsed.mockResolvedValue(undefined);
      mockRepositories.refreshTokenRepository.revokeByToken.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue(undefined);

      // Mock generateTokenPair method
      jest.spyOn(tokenService, 'generateTokenPair').mockResolvedValue(mockNewTokenPair);

      // Act
      const result = await tokenService.refreshAccessToken(refreshToken, mockDeviceInfo, mockContext);

      // Assert
      expect(result).toEqual(mockNewTokenPair);
      expect(mockRepositories.refreshTokenRepository.findByTokenWithUser).toHaveBeenCalledWith('token-value-123');
      expect(mockRepositories.refreshTokenRepository.revokeByToken).toHaveBeenCalledWith('token-value-123');
    });

    it('should throw error when JWT refresh secret is not configured', async () => {
      // Arrange
      (config as any).JWT_REFRESH_SECRET = undefined;
      (config as any).JWT_SECRET = undefined;

      // Act & Assert
      await expect(tokenService.refreshAccessToken('token'))
        .rejects.toThrow(ConfigurationError);
    });

    it('should throw UnauthorizedError when refresh token is not found', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      const mockDecoded = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'refresh',
        tokenValue: 'token-value-123'
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockRepositories.refreshTokenRepository.findByTokenWithUser.mockResolvedValue(null);

      // Act & Assert
      await expect(tokenService.refreshAccessToken(refreshToken, mockDeviceInfo, mockContext))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when refresh token is revoked', async () => {
      // Arrange
      const refreshToken = 'revoked-refresh-token';
      const mockDecoded = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'refresh',
        tokenValue: 'token-value-123'
      };

      const mockStoredToken = {
        id: 'stored-token-123',
        userId: 'user-123',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          isActive: true
        }
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockRepositories.refreshTokenRepository.findByTokenWithUser.mockResolvedValue(mockStoredToken);

      // Act & Assert
      await expect(tokenService.refreshAccessToken(refreshToken, mockDeviceInfo, mockContext))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when user is inactive', async () => {
      // Arrange
      const refreshToken = 'inactive-user-token';
      const mockDecoded = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'refresh',
        tokenValue: 'token-value-123'
      };

      const mockStoredToken = {
        id: 'stored-token-123',
        userId: 'user-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          isActive: false
        }
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockRepositories.refreshTokenRepository.findByTokenWithUser.mockResolvedValue(mockStoredToken);

      // Act & Assert
      await expect(tokenService.refreshAccessToken(refreshToken, mockDeviceInfo, mockContext))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully', async () => {
      // Arrange
      const token = 'token-to-revoke';
      mockRepositories.refreshTokenRepository.revokeByToken.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeRefreshToken(token);

      // Assert
      expect(mockRepositories.refreshTokenRepository.revokeByToken).toHaveBeenCalledWith(token);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all user tokens successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRepositories.refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeAllUserTokens(userId, context);

      // Assert
      expect(mockRepositories.refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepositories.auditLogRepository.create).toHaveBeenCalledWith({
        userId,
        action: 'TOKEN_REFRESH',
        entity: 'RefreshToken',
        details: {
          action: 'all_tokens_revoked',
          reason: 'security_event'
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
    });
  });

  describe('revokeDeviceTokens', () => {
    it('should revoke device tokens successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const deviceId = 'device-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRepositories.refreshTokenRepository.revokeByDevice.mockResolvedValue(undefined);
      mockRepositories.auditLogRepository.create.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeDeviceTokens(userId, deviceId, context);

      // Assert
      expect(mockRepositories.refreshTokenRepository.revokeByDevice).toHaveBeenCalledWith(userId, deviceId);
      expect(mockRepositories.auditLogRepository.create).toHaveBeenCalledWith({
        userId,
        action: 'TOKEN_REFRESH',
        entity: 'RefreshToken',
        details: {
          action: 'device_tokens_revoked',
          deviceId
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      // Arrange
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRepositories.refreshTokenRepository.cleanup.mockResolvedValue(5);

      // Act
      const result = await tokenService.cleanupExpiredTokens(context);

      // Assert
      expect(result).toBe(5);
      expect(mockRepositories.refreshTokenRepository.cleanup).toHaveBeenCalled();
    });
  });

  describe('getUserTokenStats', () => {
    it('should get user token stats successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const mockStats = {
        totalTokens: 3,
        activeTokens: 2,
        expiredTokens: 1
      };

      mockRepositories.refreshTokenRepository.getTokenStats.mockResolvedValue(mockStats);

      // Act
      const result = await tokenService.getUserTokenStats(userId, context);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepositories.refreshTokenRepository.getTokenStats).toHaveBeenCalledWith(userId);
    });

    it('should handle error in getUserTokenStats', async () => {
      // Arrange
      const userId = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRepositories.refreshTokenRepository.getTokenStats.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(tokenService.getUserTokenStats(userId, context))
        .rejects.toThrow('Database error');
    });
  });

  describe('limitUserTokens', () => {
    it('should limit user tokens successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const maxTokens = 3;
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRepositories.refreshTokenRepository.revokeOldTokens.mockResolvedValue(2);
      mockRepositories.auditLogRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await tokenService.limitUserTokens(userId, maxTokens, context);

      // Assert
      expect(result).toBe(2);
      expect(mockRepositories.refreshTokenRepository.revokeOldTokens).toHaveBeenCalledWith(userId, maxTokens);
      expect(mockRepositories.auditLogRepository.create).toHaveBeenCalledWith({
        userId,
        action: 'TOKEN_REFRESH',
        entity: 'RefreshToken',
        details: {
          action: 'old_tokens_revoked',
          count: 2,
          reason: 'token_limit_enforcement'
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
    });
  });

  describe('generateSecureCode', () => {
    it('should generate secure code with default length', () => {
      // Arrange
      mockCrypto.randomInt.mockReturnValue(5);

      // Act
      const result = tokenService.generateSecureCode();

      // Assert
      expect(result).toHaveLength(6);
      expect(mockCrypto.randomInt).toHaveBeenCalledTimes(6);
    });

    it('should generate secure code with custom length', () => {
      // Arrange
      mockCrypto.randomInt.mockReturnValue(3);

      // Act
      const result = tokenService.generateSecureCode(8);

      // Assert
      expect(result).toHaveLength(8);
      expect(mockCrypto.randomInt).toHaveBeenCalledTimes(8);
    });
  });

  describe('hashCode', () => {
    it('should hash code correctly', () => {
      // Arrange
      const code = '123456';
      const mockHash = 'hashed-code-123';
      mockCrypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash)
      } as any);

      // Act
      const result = tokenService.hashCode(code);

      // Assert
      expect(result).toBe(mockHash);
    });
  });

  describe('verifyCode', () => {
    it('should verify code correctly', () => {
      // Arrange
      const plainCode = '123456';
      const hashedCode = 'hashed-code-123';
      const mockHash = 'hashed-code-123';

      mockCrypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash)
      } as any);

      mockCrypto.timingSafeEqual.mockReturnValue(true);

      // Act
      const result = tokenService.verifyCode(plainCode, hashedCode);

      // Assert
      expect(result).toBe(true);
      expect(mockCrypto.timingSafeEqual).toHaveBeenCalled();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      // Arrange
      const expiredToken = 'expired-token';
      const mockPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };

      mockJwt.decode.mockReturnValue(mockPayload as any);

      // Act
      const result = tokenService.isTokenExpired(expiredToken);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for valid token', () => {
      // Arrange
      const validToken = 'valid-token';
      const mockPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      mockJwt.decode.mockReturnValue(mockPayload as any);

      // Act
      const result = tokenService.isTokenExpired(validToken);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for invalid token', () => {
      // Arrange
      const invalidToken = 'invalid-token';
      mockJwt.decode.mockReturnValue(null);

      // Act
      const result = tokenService.isTokenExpired(invalidToken);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getTokenPayload', () => {
    it('should return token payload for valid token', () => {
      // Arrange
      const token = 'valid-token';
      const mockPayload: JWTPayload = {
        userId: 'user-123',
        phoneNumber: '+905551234567',
        type: 'access'
      };

      mockJwt.decode.mockReturnValue(mockPayload);

      // Act
      const result = tokenService.getTokenPayload(token);

      // Assert
      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid token', () => {
      // Arrange
      const token = 'invalid-token';
      mockJwt.decode.mockReturnValue(null);

      // Act
      const result = tokenService.getTokenPayload(token);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return expiration time for valid token', () => {
      // Arrange
      const token = 'valid-token';
      const expTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockPayload = {
        exp: expTime
      };

      mockJwt.decode.mockReturnValue(mockPayload as any);

      // Act
      const result = tokenService.getTokenExpirationTime(token);

      // Assert
      expect(result).toEqual(new Date(expTime * 1000));
    });

    it('should return null for token without expiration', () => {
      // Arrange
      const token = 'token-without-exp';
      const mockPayload = {};

      mockJwt.decode.mockReturnValue(mockPayload as any);

      // Act
      const result = tokenService.getTokenExpirationTime(token);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      // Arrange
      const token = 'invalid-token';
      mockJwt.decode.mockReturnValue(null);

      // Act
      const result = tokenService.getTokenExpirationTime(token);

      // Assert
      expect(result).toBeNull();
    });
  });
});

