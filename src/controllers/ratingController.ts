import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/request';
import { RatingService } from '../services/domain/rating/ratingService';
import {
  submitRatingSchema,
  getRatingsQuerySchema
} from '../schemas/rating.schemas';
import {
  handleRouteError,
  sendSuccessResponse,
  sendAppErrorResponse
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';

export class RatingController {
  constructor(private ratingService: RatingService) {}

  /**
   * Submit a rating for a business
   * POST /api/v1/businesses/:businessId/ratings
   */
  async submitRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const validatedData = submitRatingSchema.parse(req.body);

      const rating = await this.ratingService.submitRating(
        userId,
        businessId,
        validatedData
      );

      sendSuccessResponse(
        res,
        'Rating submitted successfully',
        { rating },
        201
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get ratings for a business
   * GET /api/v1/businesses/:businessId/ratings
   */
  async getBusinessRatings(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const validatedQuery = getRatingsQuerySchema.parse(req.query);

      const result = await this.ratingService.getBusinessRatings(
        businessId,
        {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          minRating: validatedQuery.minRating
        }
      );

      sendSuccessResponse(res, 'Ratings retrieved successfully', {
        ratings: result.ratings,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        averageRating: result.averageRating,
        totalRatings: result.totalRatings
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Check if user can rate an appointment
   * GET /api/v1/businesses/:businessId/appointments/:appointmentId/can-rate
   */
  async canUserRate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, appointmentId } = req.params;
      const userId = req.user!.id;

      const result = await this.ratingService.canUserRate(
        userId,
        businessId,
        appointmentId
      );

      sendSuccessResponse(res, 'Rating eligibility checked', result);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get user's rating for an appointment
   * GET /api/v1/appointments/:appointmentId/rating
   */
  async getUserRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { appointmentId } = req.params;
      const userId = req.user!.id;

      const rating = await this.ratingService.getUserRatingForAppointment(
        userId,
        appointmentId
      );

      if (!rating) {
        return sendSuccessResponse(res, 'No rating found', { rating: null });
      }

      sendSuccessResponse(res, 'Rating retrieved successfully', { rating });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Refresh rating cache for a business
   * POST /api/v1/businesses/:businessId/ratings/refresh-cache
   */
  async refreshRatingCache(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;

      const result = await this.ratingService.refreshRatingCache(businessId);

      sendSuccessResponse(res, 'Rating cache refreshed successfully', result);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
