import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { updateGoogleIntegrationSchema } from '../schemas/rating.schemas';
import { BusinessService } from '../services/domain/business';
import { handleRouteError } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';
import logger from '../utils/Logger/logger';

interface GoogleIntegrationResponse {
  googlePlaceId?: string | null;
  googleOriginalUrl?: string | null;
  googleIntegrationEnabled: boolean;
  googleLinkedAt?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  internalRatings: {
    averageRating?: number | null;
    totalRatings?: number;
    lastRatingAt?: Date | null;
  };
  urls: {
    maps?: string;
    reviews?: string;
    writeReview?: string;
    embed?: string;
  };
}

/**
 * Controller for managing Google My Business integration
 * Handles Google Places linking, coordinate management, and map URL generation
 */
export class GoogleIntegrationController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Update Google integration settings
   * PUT /api/v1/businesses/:id/google-integration
   */
  async updateGoogleIntegration(req: BusinessContextRequest, res: Response): Promise<void> {
    logger.info('✅ [CONTROLLER] updateGoogleIntegration - ENTRY POINT REACHED');
    try {
      logger.info('🔍 [GOOGLE INTEGRATION PUT] Starting...', {
        params: req.params,
        body: req.body,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      });

      const { id } = req.params;
      const userId = req.user!.id;
      const validatedData = updateGoogleIntegrationSchema.parse(req.body);

      logger.info('🔍 [GOOGLE INTEGRATION PUT] Calling service...', {
        userId,
        businessId: id,
        data: validatedData,
      });

      const business = await this.businessService.updateGoogleIntegration(
        userId,
        id,
        validatedData
      );

      logger.info('🔍 [GOOGLE INTEGRATION PUT] Business updated:', business.id);

      await this.responseHelper.success(
        res,
        'success.business.googleIntegrationUpdated',
        { business },
        200,
        req
      );
      logger.info('✅ [CONTROLLER] updateGoogleIntegration - RESPONSE SENT');
    } catch (error) {
      logger.info('❌ [CONTROLLER] updateGoogleIntegration - ERROR:', error);
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get Google integration settings (PUBLIC ENDPOINT)
   * GET /api/v1/businesses/:id/google-integration
   * No authentication required - anyone can view Google integration info
   */
  async getGoogleIntegration(req: Request, res: Response): Promise<void> {
    logger.info('✅ [CONTROLLER] getGoogleIntegration - ENTRY POINT REACHED');
    try {
      logger.info('🔍 [GOOGLE INTEGRATION GET] Starting...', {
        params: req.params,
        timestamp: new Date().toISOString(),
      });

      const { id } = req.params;

      logger.info('🔍 [GOOGLE INTEGRATION GET] Calling service...', { businessId: id });

      // Public endpoint - get settings including coordinates
      const settings = await this.businessService.getGoogleIntegrationSettings('', id);

      logger.info('🔍 [GOOGLE INTEGRATION GET] Settings retrieved:', {
        googlePlaceId: settings.googlePlaceId,
        googleOriginalUrl: settings.googleOriginalUrl,
        googleIntegrationEnabled: settings.googleIntegrationEnabled,
        googleLinkedAt: settings.googleLinkedAt,
        latitude: settings.latitude,
        longitude: settings.longitude,
        averageRating: settings.averageRating,
        totalRatings: settings.totalRatings,
        lastRatingAt: settings.lastRatingAt,
      });

      // Generate URLs if enabled and linked
      // These URLs work without any API key - completely free!
      let urls: GoogleIntegrationResponse['urls'] = {};
      if (settings.googleIntegrationEnabled) {
        // ✅ PRIORITY 1: Use original URL if available (BEST - Direct to full business profile)
        if (settings.googleOriginalUrl) {
          const originalUrl = settings.googleOriginalUrl;

          logger.info('✅ [GOOGLE INTEGRATION GET] Using ORIGINAL URL (best option):', {
            originalUrl,
          });

          urls = {
            // Use the original URL for all maps-related links
            maps: originalUrl,
            reviews: originalUrl,
            writeReview: originalUrl,
            // For embed, use coordinates if available, otherwise try to convert the URL
            embed:
              settings.latitude && settings.longitude
                ? `https://maps.google.com/maps?q=${settings.latitude},${settings.longitude}&output=embed&z=17`
                : originalUrl,
          };

          logger.info('✅ [GOOGLE INTEGRATION GET] Generated URLs from original URL:', urls);
        }
        // ✅ PRIORITY 2: Use coordinates if available (RELIABLE - Shows exact pin)
        else if (settings.latitude && settings.longitude) {
          const lat = settings.latitude;
          const lng = settings.longitude;

          logger.info('✅ [GOOGLE INTEGRATION GET] Using COORDINATES (exact pin location):', {
            lat,
            lng,
          });

          // Generate URLs based on what we have
          let embedUrl: string;
          let mapsUrl: string;
          let reviewsUrl: string;
          let writeReviewUrl: string;

          if (settings.googlePlaceId) {
            const googleId = settings.googlePlaceId;
            const isCIDFormat = googleId.includes(':') && googleId.includes('0x');

            if (isCIDFormat) {
              // Convert hex CID to decimal
              const cidParts = googleId.split(':');
              const hexCid = cidParts[1].replace('0x', '');
              const decimalCid = parseInt(hexCid, 16);

              // USE CID for business profile (shows reviews, name, etc.)
              embedUrl = `https://maps.google.com/maps?cid=${decimalCid}&output=embed`;
              mapsUrl = `https://www.google.com/maps?cid=${decimalCid}`;
              reviewsUrl = `https://www.google.com/maps?cid=${decimalCid}`;
              writeReviewUrl = `https://www.google.com/maps?cid=${decimalCid}`;

              logger.info('✅ Using CID for business profile:', decimalCid);
            } else {
              // PlaceID format - use coordinates as fallback
              embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
              mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
              reviewsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
              writeReviewUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            }
          } else {
            // No Place ID - use coordinates only
            embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
            mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            reviewsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            writeReviewUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          }

          urls = {
            maps: mapsUrl,
            reviews: reviewsUrl,
            writeReview: writeReviewUrl,
            embed: embedUrl,
          };

          logger.info('✅ [GOOGLE INTEGRATION GET] Generated coordinate-based URLs:', urls);
        }
        // FALLBACK: Use Place ID or CID if coordinates not available
        else if (settings.googlePlaceId) {
          const googleId = settings.googlePlaceId;

          // Detect format: CID (0x...:0x...) vs Place ID (ChIJ..., EI..., GhIJ...)
          const isCIDFormat = googleId.includes(':') && googleId.includes('0x');
          const isPlaceIDFormat =
            googleId.startsWith('ChIJ') || googleId.startsWith('EI') || googleId.startsWith('GhIJ');

          logger.info('⚠️ [GOOGLE INTEGRATION GET] No coordinates - falling back to Google ID:', {
            googleId,
            isCIDFormat,
            isPlaceIDFormat,
          });

          if (isCIDFormat) {
            // Handle CID format (e.g., 0x14c94904b01833f1:0x3411f4f9a81471)
            // Extract the second part and convert hex to decimal
            const cidParts = googleId.split(':');
            const hexCid = cidParts[1].replace('0x', '');
            const decimalCid = parseInt(hexCid, 16);

            logger.info('🔍 [GOOGLE INTEGRATION GET] CID conversion:', {
              hexCid,
              decimalCid,
            });

            urls = {
              // Direct link using CID
              maps: `https://www.google.com/maps?cid=${decimalCid}`,

              // Reviews and write review using CID
              reviews: `https://www.google.com/maps?cid=${decimalCid}`,
              writeReview: `https://www.google.com/maps?cid=${decimalCid}`,

              // Embed URL using CID (may show general area instead of exact pin)
              embed: `https://maps.google.com/maps?cid=${decimalCid}&output=embed`,
            };
          } else if (isPlaceIDFormat) {
            // Handle Place ID format (e.g., ChIJN1t_tDeuEmsRUsoyG83frY4)
            urls = {
              // Direct link to open in Google Maps
              maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}&query_place_id=${encodeURIComponent(googleId)}`,

              // Link to view all reviews
              reviews: `https://search.google.com/local/reviews?placeid=${googleId}`,

              // Link to write a review
              writeReview: `https://search.google.com/local/writereview?placeid=${googleId}`,

              // Embed URL
              embed: `https://maps.google.com/maps?q=place_id:${googleId}&output=embed`,
            };
          } else {
            // Unknown format - try to use it as-is
            logger.warn('⚠️ [GOOGLE INTEGRATION GET] Unknown Google ID format:', googleId);
            urls = {
              maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
              reviews: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
              writeReview: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
              embed: `https://maps.google.com/maps?q=${encodeURIComponent(googleId)}&output=embed`,
            };
          }

          logger.info('🔍 [GOOGLE INTEGRATION GET] Generated ID-based URLs:', urls);
        } else {
          logger.info('⚠️ [GOOGLE INTEGRATION GET] No URLs generated - no coordinates or place ID');
        }
      } else {
        logger.info('🔍 [GOOGLE INTEGRATION GET] No URLs generated - integration disabled');
      }

      // Separate internal and Google ratings in the response
      const responseData: GoogleIntegrationResponse = {
        // Google integration settings
        googlePlaceId: settings.googlePlaceId,
        googleOriginalUrl: settings.googleOriginalUrl,
        googleIntegrationEnabled: settings.googleIntegrationEnabled,
        googleLinkedAt: settings.googleLinkedAt,
        latitude: settings.latitude,
        longitude: settings.longitude,

        // Internal ratings (from your app)
        internalRatings: {
          averageRating: settings.averageRating,
          totalRatings: settings.totalRatings,
          lastRatingAt: settings.lastRatingAt,
        },

        // URLs for maps embed and links
        urls,
      };

      await this.responseHelper.success(
        res,
        'success.business.googleIntegrationRetrieved',
        responseData,
        200,
        req
      );
      logger.info('✅ [CONTROLLER] getGoogleIntegration - RESPONSE SENT');
    } catch (error) {
      logger.info('❌ [CONTROLLER] getGoogleIntegration - ERROR:', error);
      handleRouteError(error, req, res);
    }
  }
}
