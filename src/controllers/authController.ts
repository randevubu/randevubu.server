import { Request, Response } from 'express';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import {
  changePhoneSchema,
  logoutSchema,
  sendVerificationSchema,
  updateProfileSchema,
  verifyLoginSchema
} from '../schemas/auth.schemas';
import {
  AuthService,
  PhoneVerificationService,
  TokenService
} from '../services';
import { RBACService } from '../services/domain/rbac';
import {
  ApiResponse,
  ChangePhoneRequest,
  DeviceInfo,
  LogoutRequest,
  SendVerificationRequest,
  UpdateProfileRequest,
  VerifyLoginRequest
} from '../types/auth';
import {
  BaseError,
  ErrorContext,
  InternalServerError,
  ForbiddenError,
  UserNotFoundError,
  UnauthorizedError,
  InvalidTokenError,
  TokenExpiredError
} from '../types/errors';
import logger from '../utils/Logger/logger';
import { extractDeviceInfo, createErrorContext } from '../utils/requestUtils';
import { sendSuccessResponse, sendBaseErrorResponse } from '../utils/responseUtils';

export class AuthController {
  constructor(
    private authService: AuthService,
    private phoneVerificationService: PhoneVerificationService,
    private tokenService: TokenService,
    private rbacService?: RBACService
  ) {}


  private clearAuthCookies(res: Response, context: ErrorContext, req?: Request): void {
    const cookieDomain = process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || undefined) : 'localhost';
    const isSecureProduction = process.env.NODE_ENV === 'production' && req?.secure;
    
    // Must match ALL options used when setting the cookies
    const cookieOptions = {
      path: '/',
      domain: cookieDomain,
      secure: isSecureProduction,
      sameSite: (isSecureProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict'
    };
    
    // Clear authentication cookies
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('hasAuth', cookieOptions);
    
    // Clear CSRF token for security (force new token on next login)
    res.clearCookie('csrf-token', cookieOptions);

    logger.info('Cleared authentication cookies', {
      clearedCookies: ['refreshToken', 'hasAuth', 'csrf-token'],
      domain: cookieDomain,
      secure: isSecureProduction,
      sameSite: cookieOptions.sameSite,
      requestId: context.requestId,
    });
  }

  /**
   * Send verification code to phone number
   * POST /api/v1/auth/send-verification
   */
  sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = sendVerificationSchema.parse(req.body) as SendVerificationRequest;
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req);

      logger.info('Verification code request', {
        phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        purpose: body.purpose,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      const result = await this.phoneVerificationService.sendVerificationCode({
        phoneNumber: body.phoneNumber,
        purpose: body.purpose || 'REGISTRATION' as any,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
      });

      if (!result.success) {
        res.status(429).json({
          success: false,
          message: result.message,
          error: {
            message: result.message,
            ...(result.cooldownSeconds && { retryAfter: result.cooldownSeconds }),
          },
        });
        return;
      }

      sendSuccessResponse(res, result.message, {
        phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        expiresIn: 600, // 10 minutes
        purpose: body.purpose || 'REGISTRATION',
      });

    } catch (error) {
      logger.error('Send verification code error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId: createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to send verification code',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Verify login code and authenticate user
   * POST /api/v1/auth/verify-login
   */
  verifyLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = verifyLoginSchema.parse(req.body) as VerifyLoginRequest;
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req);

      logger.info('Login verification attempt', {
        phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      const result = await this.authService.registerOrLogin(
        body.phoneNumber,
        body.verificationCode,
        deviceInfo,
        context
      );

      logger.info(result.isNewUser ? 'User registered' : 'User logged in', {
        userId: result.user.id,
        phoneNumber: result.user.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        isNewUser: result.isNewUser,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      // Detect client type: mobile apps send header, web apps use cookies
      const isMobileClient = req.headers['x-client-type'] === 'mobile';
      const isSecureProduction = process.env.NODE_ENV === 'production' && req.secure;

      if (!isMobileClient) {
        // Web: Set refresh token as HttpOnly cookie (browser-managed)
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,           // JavaScript cannot access (XSS protection)
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || undefined) : 'localhost',
          path: '/'
        });

        // Set hasAuth cookie for frontend auth state detection
        res.cookie('hasAuth', '1', {
          httpOnly: false,          // Frontend can read this
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || undefined) : 'localhost',
          path: '/'
        });
      }

      sendSuccessResponse(
        res,
        result.isNewUser ? 'Registration successful' : 'Login successful',
        {
          user: {
            id: result.user.id,
            phoneNumber: result.user.phoneNumber,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            avatar: result.user.avatar,
            timezone: result.user.timezone,
            language: result.user.language,
            isVerified: result.user.isVerified,
            createdAt: result.user.createdAt,
            lastLoginAt: result.user.lastLoginAt,
            roles: (result.user as { roles?: string[] }).roles || [],
            effectiveLevel: (result.user as { effectiveLevel?: number }).effectiveLevel || 0,
          },
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: isMobileClient ? result.tokens.refreshToken : undefined, // Only for mobile
            expiresIn: result.tokens.expiresIn,
            refreshExpiresIn: isMobileClient ? result.tokens.refreshExpiresIn : undefined
          },
          isNewUser: result.isNewUser,
        }
      );

    } catch (error) {
      logger.error('Verify login error', {
        error: error instanceof Error ? error.message : String(error),
        phoneNumber: req.body.phoneNumber?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        requestId: createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Login verification failed',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    // Detect client type: mobile apps send token in body, web apps use cookies
    const isMobileClient = req.headers['x-client-type'] === 'mobile' || !!req.body?.refreshToken;
    
    // Get refresh token from appropriate source
    const cookieRefreshToken = req.cookies?.refreshToken;
    const bodyRefreshToken = req.body?.refreshToken;
    const refreshToken = isMobileClient ? bodyRefreshToken : (cookieRefreshToken || bodyRefreshToken);

    const deviceInfo = extractDeviceInfo(req);
    const context = createErrorContext(req);

    logger.info('Refresh token debug info', {
      hasCookieToken: !!cookieRefreshToken,
      hasBodyToken: !!bodyRefreshToken,
      cookieTokenLength: cookieRefreshToken?.length,
      cookieTokenStart: cookieRefreshToken?.substring(0, 50),
      allCookies: Object.keys(req.cookies || {}),
      requestId: context.requestId,
    });

    if (!refreshToken) {
      this.clearAuthCookies(res, context, req);
      res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required. Provide it in cookie or request body.',
          code: 'REFRESH_TOKEN_MISSING'
        }
      });
      return;
    }

    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      logger.error('Invalid refresh token type or empty', {
        tokenType: typeof refreshToken,
        tokenValue: refreshToken,
        requestId: context.requestId,
      });
      this.clearAuthCookies(res, context, req);
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token format',
          code: 'INVALID_REFRESH_TOKEN_FORMAT'
        }
      });
      return;
    }

    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = refreshToken.split('.');
    if (tokenParts.length !== 3) {
      logger.error('Refresh token does not have JWT structure', {
        tokenParts: tokenParts.length,
        token: refreshToken.substring(0, 50) + '...',
        requestId: context.requestId,
      });
      this.clearAuthCookies(res, context, req);
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token format',
          code: 'INVALID_REFRESH_TOKEN_STRUCTURE'
        }
      });
      return;
    }

    try {
      const tokens = await this.tokenService.refreshAccessToken(
        refreshToken,
        deviceInfo,
        context
      );

      // Handle response based on client type
      if (isMobileClient) {
        // Mobile: Return refresh token in response body (with secure storage on client)
        logger.info('Token refreshed for mobile client', {
          ip: context.ipAddress,
          requestId: context.requestId,
        });

        sendSuccessResponse(res, 'Token refreshed successfully', {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken, // Mobile apps need this for secure storage
            expiresIn: tokens.expiresIn,
            refreshExpiresIn: tokens.refreshExpiresIn
          }
        });
      } else {
        // Web: Set refresh token as HttpOnly cookie (browser-managed)
        const isSecureProduction = process.env.NODE_ENV === 'production' && req.secure;

        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,          // JavaScript cannot access (XSS protection)
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || undefined) : 'localhost',
          path: '/'
        });

        // Renew hasAuth cookie for frontend auth state detection
        res.cookie('hasAuth', '1', {
          httpOnly: false,
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || undefined) : 'localhost',
          path: '/'
        });

        logger.info('Token refreshed for web client', {
          ip: context.ipAddress,
          requestId: context.requestId,
        });

        sendSuccessResponse(res, 'Token refreshed successfully', {
          tokens: {
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn
            // ❌ No refreshToken in body for web (it's in HttpOnly cookie)
          }
        });
      }

    } catch (error) {
      logger.error('Refresh token error', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        requestId: context.requestId,
      });

      // Clear HttpOnly cookies when refresh token is invalid/revoked/expired
      // This is critical for web clients to prevent infinite refresh loops
      logger.info('About to clear authentication cookies', {
        requestId: context.requestId,
      });
      this.clearAuthCookies(res, context, req);

      // Handle specific token error types with appropriate status codes
      if (error instanceof BaseError) {
        // For revoked/invalid/expired tokens, return 401 to trigger re-authentication
        if (error instanceof UnauthorizedError || 
            error instanceof InvalidTokenError || 
            error instanceof TokenExpiredError) {
          res.status(401).json({
            success: false,
            message: 'Authentication required. Please login again.',
            error: {
              message: error.message,
              code: error.code,
              details: error.details,
              requestId: context.requestId,
            },
          });
          return;
        }
        
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Token refresh failed',
          error instanceof Error ? error : new Error(String(error)),
          context
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const body = logoutSchema.parse(req.body) as LogoutRequest;
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req, req.user.id);

      // Detect client type: mobile apps send token in body, web apps use cookies
      const isMobileClient = req.headers['x-client-type'] === 'mobile' || !!body.refreshToken;

      // Get refresh token from appropriate source (same pattern as refresh endpoint)
      const cookieRefreshToken = req.cookies?.refreshToken;
      const bodyRefreshToken = body.refreshToken;
      const refreshToken = isMobileClient ? bodyRefreshToken : (cookieRefreshToken || bodyRefreshToken);

      await this.authService.logout(
        requireAuthenticatedUser(req).id,
        refreshToken,
        deviceInfo,
        context
      );

      // Clear authentication cookies properly (must match domain used when setting)
      this.clearAuthCookies(res, context, req);

      logger.info('User logged out', {
        userId: requireAuthenticatedUser(req).id,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      sendSuccessResponse(res, 'Logged out successfully');

    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Logout failed',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Get user profile
   * GET /api/v1/auth/profile?includeBusinessSummary=true
   */
  getProfile = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const context = createErrorContext(req, req.user.id);
      const includeBusinessSummary = req.query.includeBusinessSummary === 'true';
      const forceRefresh = req.headers['x-role-update'] === 'true';

      // ENTERPRISE PATTERN: If client indicates role update, bypass cache completely
      if (forceRefresh && this.rbacService) {
        this.rbacService.forceInvalidateUser(req.user.id);
      }

      let profile;
      if (includeBusinessSummary) {
        profile = await this.authService.getUserProfileWithBusinessSummary(requireAuthenticatedUser(req).id, context);
      } else {
        profile = await this.authService.getUserProfile(requireAuthenticatedUser(req).id, context);
      }

      sendSuccessResponse(res, 'Profile retrieved successfully', { 
        user: profile,
        meta: {
          includesBusinessSummary: includeBusinessSummary
        }
      });

    } catch (error) {
      logger.error('Get profile error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve profile',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Update user profile
   * PATCH /api/v1/auth/profile
   */
  updateProfile = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const body = updateProfileSchema.parse(req.body) as UpdateProfileRequest;
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req, req.user.id);

      const profile = await this.authService.updateUserProfile(
        requireAuthenticatedUser(req).id,
        body,
        deviceInfo,
        context
      );

      logger.info('Profile updated', {
        userId: requireAuthenticatedUser(req).id,
        updates: Object.keys(body),
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      sendSuccessResponse(res, 'Profile updated successfully', { user: profile });

    } catch (error) {
      logger.error('Update profile error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        updates: Object.keys(req.body),
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to update profile',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Change phone number
   * POST /api/v1/auth/change-phone
   */
  changePhone = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const body = changePhoneSchema.parse(req.body) as ChangePhoneRequest;
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req, req.user.id);

      await this.authService.changePhoneNumber(
        requireAuthenticatedUser(req).id,
        body.newPhoneNumber,
        body.verificationCode,
        deviceInfo,
        context
      );

      logger.info('Phone number changed', {
        userId: requireAuthenticatedUser(req).id,
        newPhone: body.newPhoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      sendSuccessResponse(
        res,
        'Phone number changed successfully. Please login again with new number.'
      );

    } catch (error) {
      logger.error('Change phone error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        newPhone: req.body.newPhoneNumber?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to change phone number',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Delete user account
   * DELETE /api/v1/auth/account
   */
  deleteAccount = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req, req.user.id);

      await this.authService.deactivateUser(requireAuthenticatedUser(req).id, deviceInfo, context);

      logger.info('Account deactivated', {
        userId: requireAuthenticatedUser(req).id,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      sendSuccessResponse(res, 'Account deactivated successfully');

    } catch (error) {
      logger.error('Account deactivation error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to deactivate account',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Get user's customers from their businesses
   * GET /api/v1/auth/my-customers
   */
  getMyCustomers = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { search, page, limit, status, sortBy, sortOrder } = req.query;

      const allowedStatus = new Set(['all', 'banned', 'flagged', 'active']);
      const allowedSortBy = new Set(['createdAt', 'updatedAt', 'firstName', 'lastName', 'lastLoginAt']);
      const allowedSortOrder = new Set(['asc', 'desc']);

      const parsedStatus = typeof status === 'string' && allowedStatus.has(status)
        ? (status as 'all' | 'banned' | 'flagged' | 'active')
        : undefined;
      const parsedSortBy = typeof sortBy === 'string' && allowedSortBy.has(sortBy)
        ? (sortBy as 'createdAt' | 'updatedAt' | 'firstName' | 'lastLoginAt' | 'lastName')
        : undefined;
      const parsedSortOrder = typeof sortOrder === 'string' && allowedSortOrder.has(sortOrder)
        ? (sortOrder as 'asc' | 'desc')
        : undefined;

      const filters = {
        search: (search as string) || undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: parsedStatus,
        sortBy: parsedSortBy,
        sortOrder: parsedSortOrder
      };

      const result = await this.authService.getMyCustomers(userId, filters);

      sendSuccessResponse(res, 'Customers retrieved successfully', result);

    } catch (error) {
      logger.error('Get my customers error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof Error && error.message.includes('Access denied')) {
        const response: ApiResponse = {
          success: false,
          message: 'Access denied. Business role required.',
          error: {
            message: 'Access denied. Business role required.',
            code: 'CUSTOMER_ACCESS_DENIED',
            requestId: createErrorContext(req, req.user.id).requestId,
          },
        };
        res.status(403).json(response);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve customers',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Get detailed customer information
   * GET /api/v1/users/customers/:customerId/details
   */
  getCustomerDetails = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { customerId } = req.params;

      const customerDetails = await this.authService.getCustomerDetails(userId, customerId);

      sendSuccessResponse(res, 'Customer details retrieved successfully', customerDetails);

    } catch (error) {
      logger.error('Get customer details error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        customerId: req.params.customerId,
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        const notFoundError = new UserNotFoundError(
          'Customer not found or not accessible',
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, notFoundError);
      } else if (error instanceof Error && error.message.includes('Access denied')) {
        const accessError = new ForbiddenError(
          'Access denied. You can only view customers from your own businesses.',
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, accessError);
      } else if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve customer details',
          error instanceof Error ? error : undefined,
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Get user statistics (admin/analytics)
   * GET /api/v1/auth/stats
   */
  getStats = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const context = createErrorContext(req, req.user.id);

      const stats = await this.authService.getUserStats(context);

      sendSuccessResponse(res, 'Stats retrieved successfully', { stats });

    } catch (error) {
      logger.error('Get stats error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        sendBaseErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve stats',
          error instanceof Error ? error : new Error(String(error)),
          createErrorContext(req, req.user.id)
        );
        sendBaseErrorResponse(res, internalError);
      }
    }
  };
}