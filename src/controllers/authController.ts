import { Request, Response } from 'express';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import {
  changePhoneSchema,
  logoutSchema,
  sendVerificationSchema,
  updateProfileSchema,
  verifyLoginSchema,
} from '../schemas/auth.schemas';
import { AuthService, PhoneVerificationService, TokenService } from '../services';
import { RBACService } from '../services/domain/rbac';
import {
  ChangePhoneRequest,
  DeviceInfo,
  LogoutRequest,
  SendVerificationRequest,
  UpdateProfileRequest,
  VerifyLoginRequest,
} from '../types/auth';
import { ErrorContext } from '../types/errors';
import { AppError } from '../types/responseTypes';

import { extractDeviceInfo, createErrorContext } from '../utils/requestUtils';
import { ResponseHelper } from '../utils/responseHelper';
import logger from '../utils/Logger/logger';
export class AuthController {
  constructor(
    private authService: AuthService,
    private phoneVerificationService: PhoneVerificationService,
    private tokenService: TokenService,
    private responseHelper: ResponseHelper,
    private rbacService?: RBACService
  ) {}

  private clearAuthCookies(res: Response, context: ErrorContext, req?: Request): void {
    const cookieDomain =
      process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN || undefined : 'localhost';
    const isSecureProduction = process.env.NODE_ENV === 'production' && req?.secure;

    // Must match ALL options used when setting the cookies, including httpOnly
    const baseCookieOptions = {
      path: '/',
      domain: cookieDomain,
      secure: isSecureProduction,
      sameSite: (isSecureProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
    };

    // Clear refreshToken cookie (was set with httpOnly: true)
    res.clearCookie('refreshToken', {
      ...baseCookieOptions,
      httpOnly: true,
    });

    // Clear hasAuth cookie (was set with httpOnly: false)
    res.clearCookie('hasAuth', {
      ...baseCookieOptions,
      httpOnly: false,
    });

    // Clear CSRF token cookie (was set with httpOnly: true)
    res.clearCookie('csrf-token', {
      ...baseCookieOptions,
      httpOnly: true,
    });

    logger.info('Cleared authentication cookies', {
      clearedCookies: ['refreshToken', 'hasAuth', 'csrf-token'],
      domain: cookieDomain,
      secure: isSecureProduction,
      sameSite: baseCookieOptions.sameSite,
      requestId: context.requestId,
    });
  }

  /**
   * Send verification code to phone number
   * POST /api/v1/auth/send-verification
   */
  sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
    const body = sendVerificationSchema.parse(req.body) as SendVerificationRequest;
    const deviceInfo = extractDeviceInfo(req);
    const context = createErrorContext(req);

    // Auto-detect purpose: check if user exists in database
    const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
    let purpose: 'LOGIN' | 'REGISTRATION' = 'REGISTRATION';

    if (isValidPhoneNumber(body.phoneNumber)) {
      try {
        const parsed = parsePhoneNumber(body.phoneNumber);
        const normalizedPhone = parsed?.format('E.164') || body.phoneNumber;
        const repositories = (this.phoneVerificationService as any).repositories;
        const existingUser = await repositories.userRepository.findByPhoneNumber(normalizedPhone);
        purpose = existingUser ? 'LOGIN' : 'REGISTRATION';
      } catch (error) {
        logger.warn('Failed to check if user exists, defaulting to REGISTRATION', {
          error: error instanceof Error ? error.message : String(error),
          requestId: context.requestId,
        });
      }
    }

    logger.info('Verification code request', {
      phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      purpose: purpose,
      ip: context.ipAddress,
      requestId: context.requestId,
    });

    await this.phoneVerificationService.sendVerificationCode({
      phoneNumber: body.phoneNumber,
      purpose: purpose as any,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    await this.responseHelper.success(
      res,
      'success.auth.verificationCodeSent',
      {
        phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        expiresIn: 600, // 10 minutes
        purpose: purpose,
      },
      200,
      req
    );
  };

  /**
   * Verify login code and authenticate user
   * POST /api/v1/auth/verify-login
   */
  verifyLogin = async (req: Request, res: Response): Promise<void> => {
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
          httpOnly: true, // JavaScript cannot access (XSS protection)
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain:
            process.env.NODE_ENV === 'production'
              ? process.env.COOKIE_DOMAIN || undefined
              : 'localhost',
          path: '/',
        });

        // Set hasAuth cookie for frontend auth state detection
        res.cookie('hasAuth', '1', {
          httpOnly: false, // Frontend can read this
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          domain:
            process.env.NODE_ENV === 'production'
              ? process.env.COOKIE_DOMAIN || undefined
              : 'localhost',
          path: '/',
        });
      }

      await this.responseHelper.success(
        res,
        result.isNewUser ? 'success.auth.registered' : 'success.auth.login',
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
            refreshExpiresIn: isMobileClient ? result.tokens.refreshExpiresIn : undefined,
          },
          isNewUser: result.isNewUser,
        },
        result.isNewUser ? 201 : 200,
        req
      );
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
    const refreshToken = isMobileClient ? bodyRefreshToken : cookieRefreshToken || bodyRefreshToken;

    const deviceInfo = extractDeviceInfo(req);
    const context = createErrorContext(req);

    logger.debug('Refresh token request received', {
      hasCookieToken: !!cookieRefreshToken,
      hasBodyToken: !!bodyRefreshToken,
      requestId: context.requestId,
    });

    if (!refreshToken) {
      this.clearAuthCookies(res, context, req);
      throw new AppError('UNAUTHORIZED', { message: 'Refresh token is required' });
    }

    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      this.clearAuthCookies(res, context, req);
      throw new AppError('INVALID_TOKEN', { message: 'Invalid refresh token format' });
    }

    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = refreshToken.split('.');
    if (tokenParts.length !== 3) {
      this.clearAuthCookies(res, context, req);
      throw new AppError('INVALID_TOKEN', { message: 'Invalid refresh token format' });
    }

    try {
      const tokens = await this.tokenService.refreshAccessToken(refreshToken, deviceInfo, context);

      // Handle response based on client type
      if (isMobileClient) {
        // Mobile: Return refresh token in response body (with secure storage on client)
        logger.info('Token refreshed for mobile client', {
          ip: context.ipAddress,
          requestId: context.requestId,
        });

        await this.responseHelper.success(
          res,
          'success.auth.tokenRefreshed',
          {
            tokens: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken, // Mobile apps need this for secure storage
              expiresIn: tokens.expiresIn,
              refreshExpiresIn: tokens.refreshExpiresIn,
            },
          },
          200,
          req
        );
      } else {
        // Web: Set refresh token as HttpOnly cookie (browser-managed)
        const isSecureProduction = process.env.NODE_ENV === 'production' && req.secure;

        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true, // JavaScript cannot access (XSS protection)
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain:
            process.env.NODE_ENV === 'production'
              ? process.env.COOKIE_DOMAIN || undefined
              : 'localhost',
          path: '/',
        });

        // Renew hasAuth cookie for frontend auth state detection
        res.cookie('hasAuth', '1', {
          httpOnly: false,
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          domain:
            process.env.NODE_ENV === 'production'
              ? process.env.COOKIE_DOMAIN || undefined
              : 'localhost',
          path: '/',
        });

        logger.info('Token refreshed for web client', {
          ip: context.ipAddress,
          requestId: context.requestId,
        });

        await this.responseHelper.success(
          res,
          'success.auth.tokenRefreshed',
          {
            tokens: {
              accessToken: tokens.accessToken,
              expiresIn: tokens.expiresIn,
              // ❌ No refreshToken in body for web (it's in HttpOnly cookie)
            },
          },
          200,
          req
        );
      }
    } catch (error) {
      // Clear HttpOnly cookies when refresh token is invalid/revoked/expired
      // Critical for web clients to prevent infinite refresh loops
      this.clearAuthCookies(res, context, req);
      throw error;
    }
  };

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const body = logoutSchema.parse(req.body) as LogoutRequest;
      const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req, req.user.id);

      // Detect client type: mobile apps send token in body, web apps use cookies
      const isMobileClient = req.headers['x-client-type'] === 'mobile' || !!body.refreshToken;

      // Get refresh token from appropriate source (same pattern as refresh endpoint)
      const cookieRefreshToken = req.cookies?.refreshToken;
      const bodyRefreshToken = body.refreshToken;
      const refreshToken = isMobileClient
        ? bodyRefreshToken
        : cookieRefreshToken || bodyRefreshToken;

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

      await this.responseHelper.success(res, 'success.auth.logout', undefined, 200, req);
  };

  /**
   * Get user profile
   * GET /api/v1/auth/profile?includeBusinessSummary=true
   */
  getProfile = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const context = createErrorContext(req, req.user.id);
      const includeBusinessSummary = req.query.includeBusinessSummary === 'true';
      const forceRefresh = req.headers['x-role-update'] === 'true';

      // ENTERPRISE PATTERN: If client indicates role update, bypass cache completely
      if (forceRefresh && this.rbacService) {
        this.rbacService.forceInvalidateUser(req.user.id);
      }

      let profile;
      if (includeBusinessSummary) {
        profile = await this.authService.getUserProfileWithBusinessSummary(
          requireAuthenticatedUser(req).id,
          context
        );
      } else {
        profile = await this.authService.getUserProfile(requireAuthenticatedUser(req).id, context);
      }

      await this.responseHelper.success(
        res,
        'success.auth.profileRetrieved',
        {
          user: profile,
          meta: {
            includesBusinessSummary: includeBusinessSummary,
          },
        },
        200,
        req
      );
  };

  /**
   * Update user profile
   * PATCH /api/v1/auth/profile
   */
  updateProfile = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
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

      await this.responseHelper.success(
        res,
        'success.auth.profileUpdated',
        { user: profile },
        200,
        req
      );
  };

  /**
   * Change phone number
   * POST /api/v1/auth/change-phone
   */
  changePhone = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
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

      await this.responseHelper.success(res, 'success.auth.phoneChanged', undefined, 200, req);
  };

  /**
   * Delete user account
   * DELETE /api/v1/auth/account
   */
  deleteAccount = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const deviceInfo = extractDeviceInfo(req);
      const context = createErrorContext(req, req.user.id);

      await this.authService.deactivateUser(requireAuthenticatedUser(req).id, deviceInfo, context);

      logger.info('Account deactivated', {
        userId: requireAuthenticatedUser(req).id,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      await this.responseHelper.success(
        res,
        'success.auth.accountDeactivated',
        undefined,
        200,
        req
      );
  };

  /**
   * Get user's customers from their businesses
   * GET /api/v1/auth/my-customers
   */
  getMyCustomers = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const userId = requireAuthenticatedUser(req).id;
      const { search, page, limit, status, sortBy, sortOrder } = req.query;

      const allowedStatus = new Set(['all', 'banned', 'flagged', 'active']);
      const allowedSortBy = new Set([
        'createdAt',
        'updatedAt',
        'firstName',
        'lastName',
        'lastLoginAt',
      ]);
      const allowedSortOrder = new Set(['asc', 'desc']);

      const parsedStatus =
        typeof status === 'string' && allowedStatus.has(status)
          ? (status as 'all' | 'banned' | 'flagged' | 'active')
          : undefined;
      const parsedSortBy =
        typeof sortBy === 'string' && allowedSortBy.has(sortBy)
          ? (sortBy as 'createdAt' | 'updatedAt' | 'firstName' | 'lastLoginAt' | 'lastName')
          : undefined;
      const parsedSortOrder =
        typeof sortOrder === 'string' && allowedSortOrder.has(sortOrder)
          ? (sortOrder as 'asc' | 'desc')
          : undefined;

      const filters = {
        search: (search as string) || undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: parsedStatus,
        sortBy: parsedSortBy,
        sortOrder: parsedSortOrder,
      };

      const result = await this.authService.getMyCustomers(userId, filters);

      await this.responseHelper.success(res, 'success.auth.customersRetrieved', result, 200, req);
  };

  /**
   * Get detailed customer information
   * GET /api/v1/users/customers/:customerId/details
   */
  getCustomerDetails = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const userId = requireAuthenticatedUser(req).id;
      const { customerId } = req.params;

      const customerDetails = await this.authService.getCustomerDetails(userId, customerId);

      await this.responseHelper.success(
        res,
        'success.auth.customerDetailsRetrieved',
        customerDetails,
        200,
        req
      );
  };

  /**
   * Get user statistics (admin/analytics)
   * GET /api/v1/auth/stats
   */
  getStats = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    const context = createErrorContext(req, req.user.id);

    const stats = await this.authService.getUserStats(context);

    await this.responseHelper.success(res, 'success.auth.statsRetrieved', { stats }, 200, req);
  };
}
