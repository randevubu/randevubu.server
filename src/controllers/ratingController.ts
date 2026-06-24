import { Request, Response } from 'express';
import { getRatingsQuerySchema, submitRatingSchema } from '../schemas/rating.schemas';
import { RatingService } from '../services/domain/rating/ratingService';
import { AuthenticatedRequest } from '../types/request';
import { ResponseHelper } from '../utils/responseHelper';

export class RatingController {
  constructor(
    private ratingService: RatingService,
    private responseHelper: ResponseHelper
  ) {}

  async submitRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;
    const validatedData = submitRatingSchema.parse(req.body);

    const rating = await this.ratingService.submitRating(userId, businessId, validatedData);

    await this.responseHelper.success(res, 'success.rating.submitted', { rating }, 201, req);
  }

  async getBusinessRatings(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;
    const validatedQuery = getRatingsQuerySchema.parse(req.query);

    const result = await this.ratingService.getBusinessRatings(businessId, {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      minRating: validatedQuery.minRating,
    });

    await this.responseHelper.success(
      res,
      'success.rating.retrieved',
      {
        ratings: result.ratings,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        averageRating: result.averageRating,
        totalRatings: result.totalRatings,
      },
      200,
      req
    );
  }

  async canUserRate(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, appointmentId } = req.params;
    const userId = req.user!.id;

    const result = await this.ratingService.canUserRate(userId, businessId, appointmentId);

    await this.responseHelper.success(res, 'success.rating.eligibilityChecked', result, 200, req);
  }

  async getUserRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { appointmentId } = req.params;
    const userId = req.user!.id;

    const rating = await this.ratingService.getUserRatingForAppointment(userId, appointmentId);

    if (!rating) {
      return await this.responseHelper.success(res, 'success.rating.notFound', { rating: null }, 200, req);
    }

    await this.responseHelper.success(res, 'success.rating.retrievedSingle', { rating }, 200, req);
  }

  async deleteRating(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, ratingId } = req.params;
    await this.ratingService.deleteRating(ratingId, businessId);
    await this.responseHelper.success(res, 'success.rating.deleted', {}, 200, req);
  }

  async refreshRatingCache(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;

    const result = await this.ratingService.refreshRatingCache(businessId);

    await this.responseHelper.success(res, 'success.rating.cacheRefreshed', result, 200, req);
  }
}
