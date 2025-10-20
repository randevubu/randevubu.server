import { NextFunction, Request, Response } from "express";
import { RepositoryContainer } from "../repositories";
import { RBACService } from "../services/domain/rbac";
import { TokenService } from "../services/domain/token";
import { JWTPayload } from "../types/auth";
import {
  ErrorContext,
  UnauthorizedError,
  UserDeactivatedError,
  UserLockedError,
  UserNotVerifiedError,
} from "../types/errors";
import { AuthenticatedRequest } from "../types/request";
import logger from "../utils/Logger/logger";

export class AuthMiddleware {
  constructor(
    private repositories: RepositoryContainer,
    private tokenService: TokenService,
    private rbacService?: RBACService
  ) {}

  private createErrorContext(req: Request, userId?: string): ErrorContext {
    return {
      userId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      requestId: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
    };
  }

  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('Starting authentication', {
      url: req.url,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      timestamp: new Date().toISOString()
    });

    try {
      const context = this.createErrorContext(req);
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        logger.debug('No authorization header provided');
        throw new UnauthorizedError(
          "Authorization header is required",
          context
        );
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        logger.debug('No token provided in authorization header');
        throw new UnauthorizedError("Access token is required", context);
      }

      logger.debug('Verifying access token');
      const decoded = await this.tokenService.verifyAccessToken(token, context);
      logger.debug('Token verified successfully', { userId: decoded.userId });

      // Get user with security information in a single query
      logger.debug('Fetching user from database', { userId: decoded.userId });
      const user = await this.repositories.userRepository.findByIdWithSecurity(
        decoded.userId
      );
      logger.debug('User fetched from database', { userId: decoded.userId, found: !!user });

      if (!user) {
        logger.debug('User not found in database', { userId: decoded.userId });
        throw new UnauthorizedError("User not found", context);
      }

      if (!user.isActive) {
        logger.debug('User account is not active', { userId: user.id });
        throw new UserDeactivatedError("Account is deactivated", context);
      }

      // Check for account lockout
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        logger.debug('User account is locked', { userId: user.id, lockedUntil: user.lockedUntil });
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

      // Get user roles and permissions if RBAC service is available
      let roles, permissions, effectiveLevel;
      if (this.rbacService) {
        try {
          logger.debug('Loading user permissions from RBAC', { userId: user.id });
          
          // CRITICAL FIX: Check if this is a fresh token (recently created)
          // If the token is less than 5 seconds old, bypass cache to ensure fresh role data
          const tokenAge = decoded.iat ? Date.now() - (decoded.iat * 1000) : Infinity;
          const shouldBypassCache = tokenAge < 5000; // 5 seconds
          
          const userPermissions = await this.rbacService.getUserPermissions(
            user.id,
            !shouldBypassCache // bypass cache if token is fresh
          );
          logger.debug('RBAC permissions loaded successfully', { 
            userId: user.id, 
            roleCount: userPermissions.roles.length,
            bypassedCache: shouldBypassCache
          });
          roles = userPermissions.roles.map((role) => ({
            id: role.id,
            name: role.name,
            level: role.level,
          }));
          permissions = userPermissions.permissions.map((permission) => ({
            resource: permission.resource,
            action: permission.action,
          }));
          effectiveLevel = userPermissions.effectiveLevel;
        } catch (error) {
          logger.warn("Failed to load user permissions during authentication", {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue without permissions - don't fail authentication
          // This ensures degraded functionality rather than complete failure
        }
      }

      logger.debug('Setting user on request object', { userId: user.id });
      req.user = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isActive: user.isActive,
        roles,
        permissions,
        effectiveLevel,
      };
      req.token = decoded;

      logger.debug('Authentication completed successfully', { userId: user.id });
      next();
    } catch (error) {
      logger.debug('Authentication failed', { error: error instanceof Error ? error.message : String(error) });
      const context = this.createErrorContext(req);

      logger.warn("Authentication failed", {
        ip: context.ipAddress,
        userAgent: context.userAgent,
        url: context.endpoint,
        method: context.method,
        error: error instanceof Error ? error.message : String(error),
        requestId: context.requestId,
      });

      next(error);
    }
  };

  requireVerified = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const context = this.createErrorContext(req, req.user?.id);

    if (!req.user?.isVerified) {
      throw new UserNotVerifiedError(
        "Phone number verification required",
        context
      );
    }
    next();
  };

  optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.createErrorContext(req);
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return next();
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        return next();
      }

      try {
        const decoded = await this.tokenService.verifyAccessToken(
          token,
          context
        );
        const user = await this.repositories.userRepository.findByIdWithSecurity(
          decoded.userId
        );

        if (user && user.isActive) {
          // Only set user if account is not locked
          if (
            !user.lockedUntil ||
            user.lockedUntil <= new Date()
          ) {
            // Get user roles and permissions if RBAC service is available
            let roles, permissions, effectiveLevel;
            if (this.rbacService) {
              try {
                // CRITICAL FIX: Check if this is a fresh token for optional auth too
                const tokenAge = decoded.iat ? Date.now() - (decoded.iat * 1000) : Infinity;
                const shouldBypassCache = tokenAge < 5000; // 5 seconds
                
                const userPermissions =
                  await this.rbacService.getUserPermissions(user.id, !shouldBypassCache);
                roles = userPermissions.roles.map((role) => ({
                  id: role.id,
                  name: role.name,
                  level: role.level,
                }));
                permissions = userPermissions.permissions.map((permission) => ({
                  resource: permission.resource,
                  action: permission.action,
                }));
                effectiveLevel = userPermissions.effectiveLevel;
              } catch (error) {
                logger.debug(
                  "Failed to load user permissions during optional authentication",
                  {
                    userId: user.id,
                    error:
                      error instanceof Error ? error.message : String(error),
                  }
                );
                // Continue without permissions - this is optional auth
              }
            }

            req.user = {
              id: user.id,
              phoneNumber: user.phoneNumber,
              isVerified: user.isVerified,
              isActive: user.isActive,
              roles,
              permissions,
              effectiveLevel,
            };
            req.token = decoded;
          }
        }
      } catch (error) {
        logger.debug("Optional authentication failed", {
          ip: context.ipAddress,
          error: error instanceof Error ? error.message : String(error),
          requestId: context.requestId,
        });
      }

      next();
    } catch (error) {
      next();
    }
  };
}

// Utility functions
export const createUserContext = (user: { id: string; phoneNumber: string; isVerified: boolean; isActive: boolean; createdAt: Date }) => ({
  id: user.id,
  phoneNumber: user.phoneNumber,
  isVerified: user.isVerified,
  isActive: user.isActive,
});

export const extractDeviceInfo = (req: Request) => ({
  deviceId: req.headers["x-device-id"] as string,
  userAgent: req.get("user-agent"),
  ipAddress: req.ip,
});

export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userId = req.user?.id;
    const ip = req.ip;
    const key = userId || ip;

    if (!key) {
      return next();
    }

    const now = Date.now();
    const userLimit = userRequestCounts.get(key);

    if (!userLimit || now > userLimit.resetTime) {
      userRequestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      const resetIn = Math.ceil((userLimit.resetTime - now) / 1000);

      logger.warn("User rate limit exceeded", {
        userId,
        ip,
        count: userLimit.count,
        resetIn,
      });

      res.status(429).json({
        success: false,
        error: {
          message: "Too many requests",
          retryAfter: resetIn,
        },
      });
      return;
    }

    userLimit.count++;
    next();
  };
};
