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
  UserNotFoundError
} from '../types/errors';
import { logger } from '../utils/logger';

export class AuthController {
  constructor(
    private authService: AuthService,
    private phoneVerificationService: PhoneVerificationService,
    private tokenService: TokenService
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

  private extractDeviceInfo(req: Request): DeviceInfo {
    return {
      deviceId: req.headers['x-device-id'] as string,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    };
  }

  private sendSuccessResponse<T>(
    res: Response, 
    message: string, 
    data?: T, 
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    res.status(statusCode).json(response);
  }

  private sendErrorResponse(res: Response, error: BaseError): void {
    const response: ApiResponse = {
      success: false,
      message: error.message,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        requestId: error.context?.requestId,
      },
    };
    res.status(error.statusCode).json(response);
  }

  /**
   * Send verification code to phone number
   * POST /api/v1/auth/send-verification
   */
  sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = sendVerificationSchema.parse(req.body) as SendVerificationRequest;
      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req);

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

      this.sendSuccessResponse(res, result.message, {
        phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        expiresIn: 600, // 10 minutes
        purpose: body.purpose || 'REGISTRATION',
      });

    } catch (error) {
      logger.error('Send verification code error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId: this.createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to send verification code',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req)
        );
        this.sendErrorResponse(res, internalError);
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
      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req);

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

      // Set refresh token as HttpOnly cookie (web security best practice)
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,           // Prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',       // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth/refresh' // Limit cookie scope
      });

      // Set hasAuth cookie for frontend auth state detection (Industry Standard)
      res.cookie('hasAuth', '1', {
        httpOnly: false,          // Frontend can read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      this.sendSuccessResponse(
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
          },
          tokens: {
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
            // Don't return refresh token in body for web security
            // Mobile apps can still use it if needed
            ...(process.env.NODE_ENV === 'development' && { refreshToken: result.tokens.refreshToken })
          },
          isNewUser: result.isNewUser,
        }
      );

    } catch (error) {
      logger.error('Verify login error', {
        error: error instanceof Error ? error.message : String(error),
        phoneNumber: req.body.phoneNumber?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        requestId: this.createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Login verification failed',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req)
        );
        this.sendErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      // Try to get refresh token from cookie first (web app), then from body (mobile app)
      const cookieRefreshToken = req.cookies?.refreshToken;
      const bodyRefreshToken = req.body?.refreshToken;
      const refreshToken = cookieRefreshToken || bodyRefreshToken;

      logger.debug('Refresh token debug info', {
        hasCookieToken: !!cookieRefreshToken,
        hasBodyToken: !!bodyRefreshToken,
        cookieTokenLength: cookieRefreshToken?.length,
        bodyTokenLength: bodyRefreshToken?.length,
        cookieTokenStart: cookieRefreshToken?.substring(0, 20),
        bodyTokenStart: bodyRefreshToken?.substring(0, 20),
        requestId: this.createErrorContext(req).requestId,
      });

      if (!refreshToken) {
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
          requestId: this.createErrorContext(req).requestId,
        });
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
          requestId: this.createErrorContext(req).requestId,
        });
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid refresh token format',
            code: 'INVALID_REFRESH_TOKEN_STRUCTURE'
          }
        });
        return;
      }

      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req);

      console.log('🚀 About to call tokenService.refreshAccessToken');
      logger.debug('About to call tokenService.refreshAccessToken', {
        tokenLength: refreshToken.length,
        requestId: context.requestId,
      });

      const tokens = await this.tokenService.refreshAccessToken(
        refreshToken,
        deviceInfo,
        context
      );

      logger.debug('TokenService returned successfully', {
        hasAccessToken: !!tokens.accessToken,
        requestId: context.requestId,
      });

      // Update the refresh token cookie if it was used from cookie
      if (cookieRefreshToken) {
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/api/v1/auth/refresh'
        });

        // Renew hasAuth cookie on successful refresh
        res.cookie('hasAuth', '1', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }

      logger.info('Token refreshed', {
        source: cookieRefreshToken ? 'cookie' : 'body',
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      this.sendSuccessResponse(res, 'Token refreshed successfully', { 
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
          // Only return refresh token in body if it wasn't from cookie (mobile apps)
          ...(!cookieRefreshToken && { refreshToken: tokens.refreshToken })
        }
      });

    } catch (error) {
      logger.error('Refresh token error', {
        error: error instanceof Error ? error.message : String(error),
        requestId: this.createErrorContext(req).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Token refresh failed',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req)
        );
        this.sendErrorResponse(res, internalError);
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
      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req, req.user.id);

      await this.authService.logout(
        requireAuthenticatedUser(req).id,
        body.refreshToken,
        deviceInfo,
        context
      );

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        path: '/api/v1/auth/refresh'
      });

      // Clear hasAuth cookie (Industry Standard)
      res.clearCookie('hasAuth');

      logger.info('User logged out', {
        userId: requireAuthenticatedUser(req).id,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      this.sendSuccessResponse(res, 'Logged out successfully');

    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Logout failed',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Get user profile
   * GET /api/v1/auth/profile?includeBusinessSummary=true
   */
  getProfile = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const context = this.createErrorContext(req, req.user.id);
      const includeBusinessSummary = req.query.includeBusinessSummary === 'true';

      let profile;
      if (includeBusinessSummary) {
        profile = await this.authService.getUserProfileWithBusinessSummary(requireAuthenticatedUser(req).id, context);
      } else {
        profile = await this.authService.getUserProfile(requireAuthenticatedUser(req).id, context);
      }

      this.sendSuccessResponse(res, 'Profile retrieved successfully', { 
        user: profile,
        meta: {
          includesBusinessSummary: includeBusinessSummary
        }
      });

    } catch (error) {
      logger.error('Get profile error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve profile',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
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
      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req, req.user.id);

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

      this.sendSuccessResponse(res, 'Profile updated successfully', { user: profile });

    } catch (error) {
      logger.error('Update profile error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        updates: Object.keys(req.body),
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to update profile',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
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
      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req, req.user.id);

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

      this.sendSuccessResponse(
        res,
        'Phone number changed successfully. Please login again with new number.'
      );

    } catch (error) {
      logger.error('Change phone error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        newPhone: req.body.newPhoneNumber?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to change phone number',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Delete user account
   * DELETE /api/v1/auth/account
   */
  deleteAccount = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const deviceInfo = this.extractDeviceInfo(req);
      const context = this.createErrorContext(req, req.user.id);

      await this.authService.deactivateUser(requireAuthenticatedUser(req).id, deviceInfo, context);

      logger.info('Account deactivated', {
        userId: requireAuthenticatedUser(req).id,
        ip: context.ipAddress,
        requestId: context.requestId,
      });

      this.sendSuccessResponse(res, 'Account deactivated successfully');

    } catch (error) {
      logger.error('Account deactivation error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to deactivate account',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
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

      const filters = {
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string
      };

      const result = await this.authService.getMyCustomers(userId, filters);

      this.sendSuccessResponse(res, 'Customers retrieved successfully', result);

    } catch (error) {
      logger.error('Get my customers error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof Error && error.message.includes('Access denied')) {
        const response: ApiResponse = {
          success: false,
          message: 'Access denied. Business role required.',
          error: {
            message: 'Access denied. Business role required.',
            code: 'CUSTOMER_ACCESS_DENIED',
            requestId: this.createErrorContext(req, req.user.id).requestId,
          },
        };
        res.status(403).json(response);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve customers',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
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

      this.sendSuccessResponse(res, 'Customer details retrieved successfully', customerDetails);

    } catch (error) {
      logger.error('Get customer details error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        customerId: req.params.customerId,
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        const notFoundError = new UserNotFoundError(
          'Customer not found or not accessible',
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, notFoundError);
      } else if (error instanceof Error && error.message.includes('Access denied')) {
        const accessError = new ForbiddenError(
          'Access denied. You can only view customers from your own businesses.',
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, accessError);
      } else if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve customer details',
          error instanceof Error ? error : undefined,
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
      }
    }
  };

  /**
   * Get user statistics (admin/analytics)
   * GET /api/v1/auth/stats
   */
  getStats = async (req: GuaranteedAuthRequest, res: Response): Promise<void> => {
    try {
      const context = this.createErrorContext(req, req.user.id);

      const stats = await this.authService.getUserStats(context);

      this.sendSuccessResponse(res, 'Stats retrieved successfully', { stats });

    } catch (error) {
      logger.error('Get stats error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestId: this.createErrorContext(req, req.user.id).requestId,
      });

      if (error instanceof BaseError) {
        this.sendErrorResponse(res, error);
      } else {
        const internalError = new InternalServerError(
          'Failed to retrieve stats',
          error instanceof Error ? error : new Error(String(error)),
          this.createErrorContext(req, req.user.id)
        );
        this.sendErrorResponse(res, internalError);
      }
    }
  };
}