import { RatingRepository } from '../../../repositories/ratingRepository';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { CustomerEvaluationData, SubmitRatingRequest } from '../../../types/business';
import { ValidationError } from '../../../types/errors';

export class RatingService {
  constructor(
    private ratingRepository: RatingRepository,
    private businessRepository: BusinessRepository
  ) {}

  async submitRating(
    userId: string,
    businessId: string,
    data: SubmitRatingRequest
  ): Promise<CustomerEvaluationData> {
    // Validate user can rate this appointment
    const validation = await this.ratingRepository.canUserRateBusiness(
      userId,
      businessId,
      data.appointmentId
    );

    if (!validation.canRate) {
      throw new ValidationError(
        validation.reason || 'Cannot rate this business'
      );
    }

    // Create rating
    const rating = await this.ratingRepository.createRating({
      customerId: userId,
      businessId,
      appointmentId: data.appointmentId,
      rating: data.rating,
      comment: data.comment,
      isAnonymous: data.isAnonymous || false
    });

    // Update business rating cache
    await this.businessRepository.updateRatingCache(businessId);

    return rating;
  }

  async getBusinessRatings(
    businessId: string,
    options: {
      page: number;
      limit: number;
      minRating?: number;
    }
  ): Promise<{
    ratings: CustomerEvaluationData[];
    total: number;
    averageRating: number;
    totalRatings: number;
    totalPages: number;
  }> {
    const result = await this.businessRepository.getBusinessRatings(
      businessId,
      options
    );

    return {
      ...result,
      totalPages: Math.ceil(result.total / options.limit)
    };
  }

  async getUserRatingForAppointment(
    userId: string,
    appointmentId: string
  ): Promise<CustomerEvaluationData | null> {
    return await this.ratingRepository.getRatingByAppointmentId(appointmentId);
  }

  async canUserRate(
    userId: string,
    businessId: string,
    appointmentId: string
  ): Promise<{ canRate: boolean; reason?: string }> {
    const validation = await this.ratingRepository.canUserRateBusiness(
      userId,
      businessId,
      appointmentId
    );

    return {
      canRate: validation.canRate,
      reason: validation.reason
    };
  }

  async refreshRatingCache(businessId: string): Promise<{
    averageRating: number;
    totalRatings: number;
    lastRatingAt: Date | null;
  }> {
    await this.businessRepository.updateRatingCache(businessId);

    // Get the updated values
    const settings = await this.businessRepository.getGoogleIntegrationSettings(businessId);

    return {
      averageRating: settings?.averageRating || 0,
      totalRatings: settings?.totalRatings || 0,
      lastRatingAt: settings?.lastRatingAt || null
    };
  }
}
