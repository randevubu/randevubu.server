import { Request, Response, NextFunction } from 'express';
import { RepositoryContainer } from '../repositories';
import { TokenService } from '../services/tokenService';
import { JWTPayload, AuthenticatedUser } from '../types/auth';
import { 
  UnauthorizedError, 
  ForbiddenError, 
  UserNotVerifiedError,
  UserDeactivatedError,
  UserLockedError,
  ErrorContext
} from '../types/errors';
import { logger } from '../utils/logger';
import { RBACService } from '../services/rbacService';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: JWTPayload;
}

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
      userAgent: req.get('user-agent'),
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
    try {
      const context = this.createErrorContext(req);
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw new UnauthorizedError('Authorization header is required', context);
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        throw new UnauthorizedError('Access token is required', context);
      }

      const decoded = await this.tokenService.verifyAccessToken(token, context);

      const user = await this.repositories.userRepository.findById(decoded.userId);

      if (!user) {
        throw new UnauthorizedError('User not found', context);
      }

      if (!user.isActive) {
        throw new UserDeactivatedError('Account is deactivated', context);
      }

      // Check for any security issues via the full user record
      const userWithSecurity = await this.repositories.userRepository.findByPhoneNumber(user.phoneNumber);
      
      if (userWithSecurity?.lockedUntil && userWithSecurity.lockedUntil > new Date()) {
        const unlockTime = userWithSecurity.lockedUntil.toISOString();
        throw new UserLockedError(
          `Account is temporarily locked until ${unlockTime}`, 
          context,
          { retryAfter: Math.ceil((userWithSecurity.lockedUntil.getTime() - Date.now()) / 1000) }
        );
      }

      // Get user roles and permissions if RBAC service is available
      let roles, permissions, effectiveLevel;
      if (this.rbacService) {
        try {
          const userPermissions = await this.rbacService.getUserPermissions(user.id);
          roles = userPermissions.roles.map(role => ({
            id: role.id,
            name: role.name,
            level: role.level
          }));
          permissions = userPermissions.permissions.map(permission => ({
            resource: permission.resource,
            action: permission.action
          }));
          effectiveLevel = userPermissions.effectiveLevel;
        } catch (error) {
          logger.warn('Failed to load user permissions during authentication', {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      req.user = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isActive: user.isActive,
        roles,
        permissions,
        effectiveLevel
      };
      req.token = decoded;

      next();
    } catch (error) {
      const context = this.createErrorContext(req);
      
      logger.warn('Authentication failed', {
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
      throw new UserNotVerifiedError('Phone number verification required', context);
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

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        return next();
      }

      try {
        const decoded = await this.tokenService.verifyAccessToken(token, context);
        const user = await this.repositories.userRepository.findById(decoded.userId);

        if (user && user.isActive) {
          const userWithSecurity = await this.repositories.userRepository.findByPhoneNumber(user.phoneNumber);
          
          // Only set user if account is not locked
          if (!userWithSecurity?.lockedUntil || userWithSecurity.lockedUntil <= new Date()) {
            // Get user roles and permissions if RBAC service is available
            let roles, permissions, effectiveLevel;
            if (this.rbacService) {
              try {
                const userPermissions = await this.rbacService.getUserPermissions(user.id);
                roles = userPermissions.roles.map(role => ({
                  id: role.id,
                  name: role.name,
                  level: role.level
                }));
                permissions = userPermissions.permissions.map(permission => ({
                  resource: permission.resource,
                  action: permission.action
                }));
                effectiveLevel = userPermissions.effectiveLevel;
              } catch (error) {
                logger.debug('Failed to load user permissions during optional authentication', {
                  userId: user.id,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            req.user = {
              id: user.id,
              phoneNumber: user.phoneNumber,
              isVerified: user.isVerified,
              isActive: user.isActive,
              roles,
              permissions,
              effectiveLevel
            };
            req.token = decoded;
          }
        }
      } catch (error) {
        logger.debug('Optional authentication failed', {
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
export const createUserContext = (user: any) => ({
  id: user.id,
  phoneNumber: user.phoneNumber,
  isVerified: user.isVerified,
  isActive: user.isActive,
});

export const extractDeviceInfo = (req: Request) => ({
  deviceId: req.headers['x-device-id'] as string,
  userAgent: req.get('user-agent'),
  ipAddress: req.ip,
});

export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
      
      logger.warn('User rate limit exceeded', {
        userId,
        ip,
        count: userLimit.count,
        resetIn,
      });

      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests',
          retryAfter: resetIn,
        },
      });
      return;
    }

    userLimit.count++;
    next();
  };
};