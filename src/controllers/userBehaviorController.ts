import { Request, Response } from 'express';
import { UserBehaviorService } from '../services/domain/userBehavior';
import { GuaranteedAuthRequest } from '../types/auth';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';

export class UserBehaviorController {
  constructor(private userBehaviorService: UserBehaviorService) {}

  async getUserBehavior(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const targetUserId = userId || requestingUserId;

      // Validate userId parameter if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format if provided
      if (userId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const behavior = await this.userBehaviorService.getUserBehavior(requestingUserId, targetUserId);

      if (!behavior) {
        const error = new AppError(
          'User behavior record not found',
          404,
          ERROR_CODES.CUSTOMER_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      sendSuccessResponse(res, 'User behavior retrieved successfully', behavior);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getUserSummary(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const targetUserId = userId || requestingUserId;

      // Validate userId parameter if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format if provided
      if (userId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const summary = await this.userBehaviorService.getUserSummary(requestingUserId, targetUserId);

      sendSuccessResponse(res, 'User summary retrieved successfully', summary);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getMyBehavior(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const [behavior, summary] = await Promise.all([
        this.userBehaviorService.getUserBehavior(userId, userId),
        this.userBehaviorService.getUserSummary(userId, userId)
      ]);

      sendSuccessResponse(res, 'User behavior and summary retrieved successfully', {
        behavior,
        summary
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async checkUserStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const targetUserId = userId || requestingUserId;

      // Validate userId parameter if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format if provided
      if (userId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Allow users to check their own status, require permissions for others
      if (requestingUserId !== targetUserId) {
        // This would require proper permission check in the service
        // For now, we'll allow business users to check customer status
      }

      const status = await this.userBehaviorService.checkUserStatus(targetUserId);

      sendSuccessResponse(res, 'User status retrieved successfully', status);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async addStrike(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const requestingUserId = req.user.id;

      // Validate userId parameter
      if (!userId || typeof userId !== 'string') {
        const error = new AppError(
          'User ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason parameter
      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        const error = new AppError(
          'Reason must be at least 5 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        const error = new AppError(
          'Reason must not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.addStrike(
        requestingUserId,
        userId,
        reason.trim()
      );

      sendSuccessResponse(res, 'Strike added successfully', behavior);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async removeStrike(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;

      // Validate userId parameter
      if (!userId || typeof userId !== 'string') {
        const error = new AppError(
          'User ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.removeStrike(requestingUserId, userId);

      sendSuccessResponse(res, 'Strike removed successfully', behavior);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async banUser(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { reason, durationDays, isTemporary } = req.body;
      const requestingUserId = req.user.id;

      // Validate customerId parameter
      if (!customerId || typeof customerId !== 'string') {
        const error = new AppError(
          'Customer ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate customerId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(customerId) || customerId.length < 1 || customerId.length > 50) {
        const error = new AppError(
          'Invalid customer ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason parameter
      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        const error = new AppError(
          'Ban reason must be at least 10 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        const error = new AppError(
          'Ban reason must not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Only validate durationDays if it's a temporary ban
      if (isTemporary !== false && (!durationDays || typeof durationDays !== 'number' || durationDays <= 0 || durationDays > 365)) {
        const error = new AppError(
          'Duration must be between 1 and 365 days for temporary bans',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.banUser(
        requestingUserId,
        customerId,
        reason.trim(),
        durationDays
      );

      const message = isTemporary === false 
        ? 'User banned permanently'
        : `User banned for ${durationDays} days`;

      sendSuccessResponse(res, message, behavior);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async unbanUser(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const requestingUserId = req.user.id;

      // Validate customerId parameter
      if (!customerId || typeof customerId !== 'string') {
        const error = new AppError(
          'Customer ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate customerId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(customerId) || customerId.length < 1 || customerId.length > 50) {
        const error = new AppError(
          'Invalid customer ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.unbanUser(requestingUserId, customerId);

      sendSuccessResponse(res, 'User unbanned successfully', behavior);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getProblematicUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user.id;
      const { limit } = req.query;

      // Validate and parse limit parameter
      let limitNum = 50;
      if (limit) {
        limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          const error = new AppError(
            'Limit must be between 1 and 100',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const users = await this.userBehaviorService.getProblematicUsers(requestingUserId, limitNum);

      sendSuccessResponse(res, 'Problematic users retrieved successfully', users);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getUserRiskAssessment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const targetUserId = userId || requestingUserId;

      // Validate userId parameter if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format if provided
      if (userId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const assessment = await this.userBehaviorService.getUserRiskAssessment(targetUserId);

      sendSuccessResponse(res, 'User risk assessment retrieved successfully', assessment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async calculateReliabilityScore(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const targetUserId = userId || requestingUserId;

      // Validate userId parameter if provided
      if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format if provided
      if (userId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const score = await this.userBehaviorService.calculateUserReliabilityScore(targetUserId);

      sendSuccessResponse(res, 'User reliability score calculated successfully', {
        userId: targetUserId,
        reliabilityScore: score
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getCustomerBehaviorForBusiness(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, customerId } = req.params;
      const requestingUserId = req.user.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate customerId parameter
      if (!customerId || typeof customerId !== 'string') {
        const error = new AppError(
          'Customer ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID formats
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(customerId) || customerId.length < 1 || customerId.length > 50) {
        const error = new AppError(
          'Invalid customer ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.userBehaviorService.getCustomerBehaviorForBusiness(
        requestingUserId,
        businessId,
        customerId
      );

      sendSuccessResponse(res, 'Customer behavior for business retrieved successfully', result);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async flagUserForReview(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const requestingUserId = req.user.id;

      // Validate userId parameter
      if (!userId || typeof userId !== 'string') {
        const error = new AppError(
          'User ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate userId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
        const error = new AppError(
          'Invalid user ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason parameter
      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        const error = new AppError(
          'Flag reason must be at least 10 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        const error = new AppError(
          'Flag reason must not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.userBehaviorService.flagUserForReview(
        requestingUserId,
        userId,
        reason.trim()
      );

      sendSuccessResponse(res, 'User flagged for review successfully');
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // System and admin endpoints
  async getUserBehaviorStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user.id;

      const stats = await this.userBehaviorService.getUserBehaviorStats(requestingUserId);

      sendSuccessResponse(res, 'User behavior stats retrieved successfully', stats);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async processAutomaticStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // This endpoint would typically be protected to admin-only or system calls
      const result = await this.userBehaviorService.processAutomaticStrikes();

      sendSuccessResponse(res, `Processed ${result.processed} users, ${result.banned} new bans`, result);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async resetExpiredStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.userBehaviorService.resetExpiredStrikes();

      sendSuccessResponse(res, `Reset strikes for ${count} users`, { resetCount: count });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async unbanExpiredBans(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.userBehaviorService.unbanExpiredBans();

      sendSuccessResponse(res, `Unbanned ${count} users with expired bans`, { unbannedCount: count });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Batch operations
  async batchAddStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userIds, reason } = req.body;
      const requestingUserId = req.user.id;

      // Validate userIds array
      if (!Array.isArray(userIds) || userIds.length === 0) {
        const error = new AppError(
          'userIds array is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (userIds.length > 50) {
        const error = new AppError(
          'Cannot process more than 50 users at once',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason parameter
      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        const error = new AppError(
          'Reason must be at least 5 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        const error = new AppError(
          'Reason must not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each userId in the array
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      for (const userId of userIds) {
        if (!userId || typeof userId !== 'string' || !idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format in userIds array',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const behavior = await this.userBehaviorService.addStrike(
            requestingUserId,
            userId,
            reason.trim()
          );
          results.push({ userId, success: true, behavior });
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      sendSuccessResponse(res, `Added strikes to ${successCount}/${userIds.length} users`, results);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async batchBanUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userIds, reason, durationDays } = req.body;
      const requestingUserId = req.user.id;

      // Validate userIds array
      if (!Array.isArray(userIds) || userIds.length === 0) {
        const error = new AppError(
          'userIds array is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (userIds.length > 50) {
        const error = new AppError(
          'Cannot process more than 50 users at once',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason parameter
      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        const error = new AppError(
          'Ban reason must be at least 10 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        const error = new AppError(
          'Ban reason must not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate duration parameter
      if (!durationDays || typeof durationDays !== 'number' || durationDays <= 0 || durationDays > 365) {
        const error = new AppError(
          'Duration must be between 1 and 365 days',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each userId in the array
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      for (const userId of userIds) {
        if (!userId || typeof userId !== 'string' || !idRegex.test(userId) || userId.length < 1 || userId.length > 50) {
          const error = new AppError(
            'Invalid user ID format in userIds array',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const behavior = await this.userBehaviorService.banUser(
            requestingUserId,
            userId,
            reason.trim(),
            durationDays
          );
          results.push({ userId, success: true, behavior });
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      sendSuccessResponse(res, `Banned ${successCount}/${userIds.length} users for ${durationDays} days`, results);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}