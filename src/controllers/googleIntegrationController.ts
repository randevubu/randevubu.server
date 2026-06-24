import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { updateGoogleIntegrationSchema } from '../schemas/rating.schemas';
import { BusinessService } from '../services/domain/business';
import { ResponseHelper } from '../utils/responseHelper';
import logger from '../utils/Logger/logger';

interface GoogleReviewItem {
  id: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string | null;
  publishTime: Date | null;
  relativeTimeDescription: string | null;
}

interface GoogleIntegrationResponse {
  googlePlaceId?: string | null;
  googleOriginalUrl?: string | null;
  googleIntegrationEnabled: boolean;
  googleMapEnabled: boolean;
  googleLinkedAt?: Date | null;
  googleLinkedBy?: string | null;
  reviewsHidden?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  internalRatings: {
    averageRating?: number | null;
    totalRatings?: number;
    lastRatingAt?: Date | null;
  };
  googleAverageRating?: number | null;
  googleTotalRatings?: number | null;
  googleReviews: GoogleReviewItem[];
  urls: {
    maps?: string;
    reviews?: string;
    writeReview?: string;
    embed?: string;
  };
}

export class GoogleIntegrationController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  async updateGoogleIntegration(req: BusinessContextRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;
    const validatedData = updateGoogleIntegrationSchema.parse(req.body);

    const business = await this.businessService.updateGoogleIntegration(userId, id, validatedData);

    await this.responseHelper.success(res, 'success.business.googleIntegrationUpdated', { business }, 200, req);
  }

  async syncGoogleRating(req: BusinessContextRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await this.businessService.syncGoogleRating(userId, id);

    await this.responseHelper.success(res, 'success.business.googleRatingSynced', result, 200, req);
  }

  async getGoogleIntegration(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const settings = await this.businessService.getGoogleIntegrationSettings('', id);

    let urls: GoogleIntegrationResponse['urls'] = {};
    if (settings.googleIntegrationEnabled) {
      if (settings.googleOriginalUrl) {
        const originalUrl = settings.googleOriginalUrl;
        urls = {
          maps: originalUrl,
          reviews: originalUrl,
          writeReview: originalUrl,
          embed:
            settings.latitude && settings.longitude
              ? `https://maps.google.com/maps?q=${settings.latitude},${settings.longitude}&output=embed&z=17`
              : originalUrl,
        };
      } else if (settings.latitude && settings.longitude) {
        const lat = settings.latitude;
        const lng = settings.longitude;

        let embedUrl: string;
        let mapsUrl: string;
        let reviewsUrl: string;
        let writeReviewUrl: string;

        if (settings.googlePlaceId) {
          const googleId = settings.googlePlaceId;
          const isCIDFormat = googleId.includes(':') && googleId.includes('0x');

          if (isCIDFormat) {
            const cidParts = googleId.split(':');
            const hexCid = cidParts[1].replace('0x', '');
            const decimalCid = parseInt(hexCid, 16);

            embedUrl = `https://maps.google.com/maps?cid=${decimalCid}&output=embed`;
            mapsUrl = `https://www.google.com/maps?cid=${decimalCid}`;
            reviewsUrl = `https://www.google.com/maps?cid=${decimalCid}`;
            writeReviewUrl = `https://www.google.com/maps?cid=${decimalCid}`;
          } else {
            embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
            mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            reviewsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            writeReviewUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          }
        } else {
          embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
          mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          reviewsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          writeReviewUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        }

        urls = { maps: mapsUrl, reviews: reviewsUrl, writeReview: writeReviewUrl, embed: embedUrl };
      } else if (settings.googlePlaceId) {
        const googleId = settings.googlePlaceId;
        const isCIDFormat = googleId.includes(':') && googleId.includes('0x');
        const isPlaceIDFormat =
          googleId.startsWith('ChIJ') || googleId.startsWith('EI') || googleId.startsWith('GhIJ');

        if (isCIDFormat) {
          const cidParts = googleId.split(':');
          const hexCid = cidParts[1].replace('0x', '');
          const decimalCid = parseInt(hexCid, 16);

          urls = {
            maps: `https://www.google.com/maps?cid=${decimalCid}`,
            reviews: `https://www.google.com/maps?cid=${decimalCid}`,
            writeReview: `https://www.google.com/maps?cid=${decimalCid}`,
            embed: `https://maps.google.com/maps?cid=${decimalCid}&output=embed`,
          };
        } else if (isPlaceIDFormat) {
          urls = {
            maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}&query_place_id=${encodeURIComponent(googleId)}`,
            reviews: `https://search.google.com/local/reviews?placeid=${googleId}`,
            writeReview: `https://search.google.com/local/writereview?placeid=${googleId}`,
            embed: `https://maps.google.com/maps?q=place_id:${googleId}&output=embed`,
          };
        } else {
          urls = {
            maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
            reviews: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
            writeReview: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
            embed: `https://maps.google.com/maps?q=${encodeURIComponent(googleId)}&output=embed`,
          };
        }
      }
    }

    const googleReviews = await this.businessService.getGoogleReviews(id);

    const responseData: GoogleIntegrationResponse = {
      googlePlaceId: settings.googlePlaceId,
      googleOriginalUrl: settings.googleOriginalUrl,
      googleIntegrationEnabled: settings.googleIntegrationEnabled,
      googleMapEnabled: (settings as any).googleMapEnabled ?? false,
      googleLinkedAt: settings.googleLinkedAt,
      googleLinkedBy: (settings as any).googleLinkedBy ?? null,
      reviewsHidden: (settings as any).reviewsHidden ?? false,
      latitude: settings.latitude,
      longitude: settings.longitude,
      internalRatings: {
        averageRating: settings.averageRating,
        totalRatings: settings.totalRatings,
        lastRatingAt: settings.lastRatingAt,
      },
      googleAverageRating: settings.googleAverageRating,
      googleTotalRatings: settings.googleTotalRatings,
      googleReviews,
      urls,
    };

    await this.responseHelper.success(res, 'success.business.googleIntegrationRetrieved', responseData, 200, req);
  }
}
