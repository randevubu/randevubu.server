import { Request, Response } from 'express';
import { UserBehaviorService } from '../services/domain/userBehavior';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import { handleRouteError, sendAppErrorResponse } from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import { ResponseHelper } from '../utils/responseHelper';

export class UserBehaviorController {
  constructor(
    private userBehaviorService: UserBehaviorService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get user behavior data
   *     description: Retrieve behavior data for a specific user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User behavior data retrieved successfully
   *       404:
   *         description: User behavior data not found
   */
  async getUserBehavior(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.getUserBehavior(requestingUserId, userId);

      if (!behavior) {
        const error = new AppError(
          'User behavior data not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await this.responseHelper.success(res, 'success.userBehavior.retrieved', behavior, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/summary:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get user behavior summary
   *     description: Retrieve behavior summary for a specific user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User behavior summary retrieved successfully
   */
  async getUserSummary(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const summary = await this.userBehaviorService.getUserSummary(requestingUserId, userId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.summaryRetrieved',
        summary,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/status:
   *   get:
   *     tags: [User Behavior]
   *     summary: Check user status
   *     description: Check if user is banned, has strikes, etc.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User status retrieved successfully
   */
  async checkUserStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const status = await this.userBehaviorService.checkUserStatus(userId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.statusRetrieved',
        status,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/strike:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Add strike to user
   *     description: Add a strike to a user's record (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Strike added successfully
   */
  async addStrike(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;
      const { reason } = req.body;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        const error = new AppError(
          'Reason is required and must be at least 3 characters',
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

      await this.responseHelper.success(
        res,
        'success.userBehavior.strikeAdded',
        behavior,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/strike:
   *   delete:
   *     tags: [Admin - User Behavior]
   *     summary: Remove strike from user
   *     description: Remove a strike from a user's record (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Strike removed successfully
   */
  async removeStrike(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.removeStrike(requestingUserId, userId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.strikeRemoved',
        behavior,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/ban:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Ban user
   *     description: Ban a user from the platform (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *               durationDays:
   *                 type: integer
   *     responses:
   *       200:
   *         description: User banned successfully
   */
  async banUser(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;
      const { reason, durationDays } = req.body;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        const error = new AppError(
          'Reason is required and must be at least 3 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (durationDays !== undefined && (typeof durationDays !== 'number' || durationDays <= 0)) {
        const error = new AppError(
          'Duration must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.banUser(
        requestingUserId,
        userId,
        reason.trim(),
        durationDays
      );

      await this.responseHelper.success(res, 'success.userBehavior.userBanned', behavior, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/ban:
   *   delete:
   *     tags: [Admin - User Behavior]
   *     summary: Unban user
   *     description: Remove ban from a user (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User unbanned successfully
   */
  async unbanUser(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.unbanUser(requestingUserId, userId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.userUnbanned',
        behavior,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/problematic:
   *   get:
   *     tags: [Admin - User Behavior]
   *     summary: Get problematic users
   *     description: Retrieve list of users with behavior issues (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Problematic users retrieved successfully
   */
  async getProblematicUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { limit } = req.query;

      const limitNum = limit ? parseInt(limit as string, 10) : 50;

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
        const error = new AppError(
          'Limit must be between 1 and 200',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const users = await this.userBehaviorService.getProblematicUsers(requestingUserId, limitNum);

      await this.responseHelper.success(
        res,
        'success.userBehavior.problematicUsersRetrieved',
        users,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/banned:
   *   get:
   *     tags: [Admin - User Behavior]
   *     summary: Get banned users
   *     description: Retrieve list of currently banned users (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Banned users retrieved successfully
   */
  async getBannedUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;

      const users = await this.userBehaviorService.getBannedUsers(requestingUserId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.bannedUsersRetrieved',
        users,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/strikes:
   *   get:
   *     tags: [Admin - User Behavior]
   *     summary: Get users with strikes
   *     description: Retrieve list of users with strikes (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: minStrikes
   *         schema:
   *           type: integer
   *           default: 1
   *     responses:
   *       200:
   *         description: Users with strikes retrieved successfully
   */
  async getUsersWithStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { minStrikes } = req.query;

      const minStrikesNum = minStrikes ? parseInt(minStrikes as string, 10) : 1;

      if (isNaN(minStrikesNum) || minStrikesNum < 1) {
        const error = new AppError(
          'Minimum strikes must be a positive integer',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const users = await this.userBehaviorService.getUsersWithStrikes(
        requestingUserId,
        minStrikesNum
      );

      await this.responseHelper.success(
        res,
        'success.userBehavior.usersWithStrikesRetrieved',
        users,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/stats:
   *   get:
   *     tags: [Admin - User Behavior]
   *     summary: Get user behavior statistics
   *     description: Retrieve overall user behavior statistics (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   */
  async getUserBehaviorStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;

      const stats = await this.userBehaviorService.getUserBehaviorStats(requestingUserId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.statsRetrieved',
        stats,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/business/{businessId}/customer/{customerId}:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get customer behavior for business
   *     description: Retrieve customer behavior data specific to a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Customer behavior retrieved successfully
   */
  async getCustomerBehaviorForBusiness(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { businessId, customerId } = req.params;

      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      if (!customerId || typeof customerId !== 'string') {
        const error = new AppError(
          'Customer ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      const behavior = await this.userBehaviorService.getCustomerBehaviorForBusiness(
        requestingUserId,
        businessId,
        customerId
      );

      await this.responseHelper.success(
        res,
        'success.userBehavior.customerBehaviorRetrieved',
        behavior,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/flag:
   *   post:
   *     tags: [User Behavior]
   *     summary: Flag user for review
   *     description: Flag a user for administrative review
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: User flagged successfully
   */
  async flagUserForReview(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userId } = req.params;
      const { reason } = req.body;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        const error = new AppError(
          'Reason is required and must be at least 3 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.userBehaviorService.flagUserForReview(requestingUserId, userId, reason.trim());

      await this.responseHelper.success(
        res,
        'success.userBehavior.userFlagged',
        undefined,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/my/behavior:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get my own behavior data
   *     description: Retrieve behavior data for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User behavior data retrieved successfully
   */
  async getMyBehavior(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;

      const behavior = await this.userBehaviorService.getUserBehavior(userId, userId);

      if (!behavior) {
        const error = new AppError(
          'User behavior data not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await this.responseHelper.success(res, 'success.userBehavior.retrieved', behavior, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/risk-assessment:
   *   get:
   *     tags: [User Behavior]
   *     summary: Get user risk assessment
   *     description: Retrieve risk assessment for a specific user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Risk assessment retrieved successfully
   */
  async getUserRiskAssessment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const assessment = await this.userBehaviorService.getUserRiskAssessment(userId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.riskAssessmentRetrieved',
        assessment,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/{userId}/reliability-score:
   *   get:
   *     tags: [User Behavior]
   *     summary: Calculate user reliability score
   *     description: Calculate and retrieve reliability score for a specific user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Reliability score calculated successfully
   */
  async calculateReliabilityScore(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        const error = new AppError('User ID is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        return sendAppErrorResponse(res, error);
      }

      const score = await this.userBehaviorService.calculateUserReliabilityScore(userId);

      await this.responseHelper.success(
        res,
        'success.userBehavior.reliabilityScoreCalculated',
        { score },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/admin/process-automatic-strikes:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Process automatic strikes
   *     description: Process automatic strikes for users with no-shows and cancellations (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Automatic strikes processed successfully
   */
  async processAutomaticStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      requireAuthenticatedUser(req);

      const result = await this.userBehaviorService.processAutomaticStrikes();

      await this.responseHelper.success(
        res,
        'success.userBehavior.automaticStrikesProcessed',
        result,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/admin/reset-expired-strikes:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Reset expired strikes
   *     description: Reset strikes that have expired (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Expired strikes reset successfully
   */
  async resetExpiredStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      requireAuthenticatedUser(req);

      const count = await this.userBehaviorService.resetExpiredStrikes();

      await this.responseHelper.success(
        res,
        'success.userBehavior.expiredStrikesReset',
        { count },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/admin/unban-expired:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Unban users with expired bans
   *     description: Automatically unban users whose ban period has expired (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Expired bans processed successfully
   */
  async unbanExpiredBans(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      requireAuthenticatedUser(req);

      const count = await this.userBehaviorService.unbanExpiredBans();

      await this.responseHelper.success(
        res,
        'success.userBehavior.expiredBansProcessed',
        { count },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/admin/batch-strikes:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Batch add strikes to multiple users
   *     description: Add strikes to multiple users at once (Admin only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userIds
   *               - reason
   *             properties:
   *               userIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Strikes added successfully
   */
  async batchAddStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userIds, reason } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        const error = new AppError(
          'User IDs array is required and must not be empty',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        const error = new AppError(
          'Reason is required and must be at least 3 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const results = await Promise.allSettled(
        userIds.map((userId) =>
          this.userBehaviorService.addStrike(requestingUserId, userId, reason.trim())
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      await this.responseHelper.success(
        res,
        'success.userBehavior.batchStrikesAdded',
        { successful, failed, total: userIds.length },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/user-behavior/admin/batch-ban:
   *   post:
   *     tags: [Admin - User Behavior]
   *     summary: Batch ban multiple users
   *     description: Ban multiple users at once (Admin only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userIds
   *               - reason
   *             properties:
   *               userIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               reason:
   *                 type: string
   *               durationDays:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Users banned successfully
   */
  async batchBanUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = requireAuthenticatedUser(req).id;
      const { userIds, reason, durationDays } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        const error = new AppError(
          'User IDs array is required and must not be empty',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        const error = new AppError(
          'Reason is required and must be at least 3 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (durationDays !== undefined && (typeof durationDays !== 'number' || durationDays <= 0)) {
        const error = new AppError(
          'Duration must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const results = await Promise.allSettled(
        userIds.map((userId) =>
          this.userBehaviorService.banUser(requestingUserId, userId, reason.trim(), durationDays)
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      await this.responseHelper.success(
        res,
        'success.userBehavior.batchUsersBanned',
        { successful, failed, total: userIds.length },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
