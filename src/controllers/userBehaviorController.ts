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

      await sendSuccessResponse(res, 'success.userBehavior.retrieved', behavior, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.summaryRetrieved', summary, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.bothRetrieved', {
        behavior,
        summary
      }, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.statusRetrieved', status, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.strikeAdded', behavior, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.strikeRemoved', behavior, 200, req);
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

      await sendSuccessResponse(
        res,
        'success.userBehavior.statusUpdated',
        behavior,
        200,
        req,
        isTemporary === false ? undefined : { durationDays }
      );
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

      await sendSuccessResponse(res, 'success.userBehavior.unbanned', behavior, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.problematicRetrieved', users, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.riskAssessmentRetrieved', assessment, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.reliabilityScoreCalculated', {
        userId: targetUserId,
        reliabilityScore: score
      }, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.customerBehaviorRetrieved', result, 200, req);
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

      await sendSuccessResponse(res, 'success.userBehavior.flaggedForReview', undefined, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // System and admin endpoints
  async getUserBehaviorStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user.id;

      const stats = await this.userBehaviorService.getUserBehaviorStats(requestingUserId);

      await sendSuccessResponse(res, 'success.userBehavior.statsRetrieved', stats, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async processAutomaticStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // This endpoint would typically be protected to admin-only or system calls
      const result = await this.userBehaviorService.processAutomaticStrikes();

      await sendSuccessResponse(
        res,
        'success.userBehavior.processed',
        result,
        200,
        req,
        { processed: result.processed, banned: result.banned }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async resetExpiredStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.userBehaviorService.resetExpiredStrikes();

      await sendSuccessResponse(
        res,
        'success.userBehavior.strikesReset',
        { resetCount: count },
        200,
        req,
        { count }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async unbanExpiredBans(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.userBehaviorService.unbanExpiredBans();

      await sendSuccessResponse(
        res,
        'success.userBehavior.unbannedExpired',
        { unbannedCount: count },
        200,
        req,
        { count }
      );
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

      await sendSuccessResponse(
        res,
        'success.userBehavior.strikesAdded',
        results,
        200,
        req,
        { successCount, total: userIds.length }
      );
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

      await sendSuccessResponse(
        res,
        'success.userBehavior.banned',
        results,
        200,
        req,
        { successCount, total: userIds.length, durationDays }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}