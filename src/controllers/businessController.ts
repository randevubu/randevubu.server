import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  businessSearchSchema,
  createBusinessSchema,
  updateBusinessSchema,
} from '../schemas/business.schemas';
import { BusinessService } from '../services/domain/business';
import { RBACService } from '../services/domain/rbac';
import { TokenService } from '../services/domain/token';
import { AuthenticatedRequest } from '../types/request';
import { BusinessData } from '../types/business';
import { TokenPair } from '../types/auth';
import { handleRouteError, createErrorContext } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import logger from '../utils/Logger/logger';

interface BusinessCreationResponse {
  success: boolean;
  data: BusinessData;
  message?: string;
  tokens?: TokenPair;
}

/**
 * Controller for core business operations
 * Handles business CRUD, search, verification, and stats
 */
export class BusinessController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper,
    private tokenService: TokenService,
    private rbacService: RBACService
  ) {}

  /**
   * Get user's business(es) based on their role
   * GET /api/v1/business/my-business
   * Query params: ?includeSubscription=true to include subscription info
   */
  async getMyBusiness(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const includeSubscription = req.query.includeSubscription === 'true';

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        await this.responseHelper.success(
          res,
          'success.business.noBusinessesFound',
          {
            businesses: [],
            hasBusinesses: false,
            isFirstTimeUser: true,
            canCreateBusiness: true,
          },
          200,
          req
        );
        return;
      }

      let businesses;
      if (includeSubscription) {
        businesses = await this.businessService.getMyBusinessesWithSubscription(userId);
      } else {
        businesses = await this.businessService.getMyBusinesses(userId);
      }

      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      await this.responseHelper.success(
        res,
        'success.business.retrieved',
        {
          businesses: businesses.map((business) => {
            const baseData = {
              id: business.id,
              name: business.name,
              slug: business.slug,
              email: business.email,
              phone: business.phone,
              address: business.address,
              city: business.city,
              state: business.state,
              country: business.country,
              isActive: business.isActive,
              isVerified: business.isVerified,
              isClosed: business.isClosed,
              primaryColor: business.primaryColor,
              timezone: business.timezone,
              logoUrl: business.logoUrl,
              businessHours: business.businessHours,
              createdAt: business.createdAt,
              businessType: business.businessType
                ? {
                    id: business.businessType.id,
                    name: business.businessType.name,
                    displayName: business.businessType.displayName,
                    icon: business.businessType.icon,
                    category: business.businessType.category,
                  }
                : null,
              averageRating: business.averageRating ?? null,
              totalRatings: business.totalRatings ?? 0,
              lastRatingAt: business.lastRatingAt ?? null,
            };

            if (includeSubscription && 'subscription' in business && business.subscription) {
              const sub = business.subscription as Record<string, unknown>;
              const plan = sub.plan as Record<string, unknown> | undefined;

              return {
                ...baseData,
                subscription: {
                  id: sub.id,
                  status: sub.status,
                  currentPeriodStart: sub.currentPeriodStart,
                  currentPeriodEnd: sub.currentPeriodEnd,
                  cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                  plan: plan
                    ? {
                        id: plan.id,
                        name: plan.name,
                        displayName: plan.displayName,
                        description: plan.description,
                        price: plan.price,
                        currency: plan.currency,
                        billingInterval: plan.billingInterval,
                        features: plan.features,
                        limits: {
                          maxBusinesses: plan.maxBusinesses,
                          maxStaffPerBusiness: plan.maxStaffPerBusiness,
                        },
                        isPopular: plan.isPopular,
                      }
                    : undefined,
                },
              };
            }

            return baseData;
          }),
          hasBusinesses: businesses.length > 0,
          isFirstTimeUser: businesses.length === 0,
          canCreateBusiness: true,
          context: {
            primaryBusinessId: req.businessContext.primaryBusinessId,
            totalBusinesses: req.businessContext.businessIds.length,
            includesSubscriptionInfo: includeSubscription,
          },
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get user's services from their businesses
   * GET /api/v1/businesses/my-services
   */
  async getMyServices(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      if (
        !req.businessContext ||
        (req.businessContext.businessIds.length === 0 && !req.businessContext.isOwner)
      ) {
        const context = createErrorContext(req, userId);
        const error = new AppError('Access denied', 403, ERROR_CODES.ACCESS_DENIED);
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (req.businessContext.businessIds.length === 0) {
        await this.responseHelper.success(
          res,
          'success.business.noServicesFound',
          {
            services: [],
            total: 0,
            page: 1,
            totalPages: 0,
          },
          200,
          req
        );
        return;
      }

      const { businessId, active, page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const services = await this.businessService.getMyServices(userId, {
        businessId: businessId as string,
        active: active ? active === 'true' : undefined,
        page: pageNum,
        limit: limitNum,
      });

      await this.responseHelper.success(
        res,
        'success.business.servicesRetrieved',
        services,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Create a new business
   * POST /api/v1/businesses
   */
  async createBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = createBusinessSchema.parse(req.body);
      const userId = req.user!.id;
      const userRolesBefore = req.user?.roles?.map((role) => role.name) || [];

      const business = await this.businessService.createBusiness(userId, validatedData);

      // Ensure role propagation with read-after-write consistency
      this.rbacService.forceInvalidateUser(userId);

      const DB_CONSISTENCY_DELAY_MS = 100;
      await new Promise((resolve) => setTimeout(resolve, DB_CONSISTENCY_DELAY_MS));

      const userPermissionsAfter = await this.rbacService.getUserPermissions(userId, false);
      const userRolesAfter = userPermissionsAfter.roles.map((role) => role.name);

      const ownerWasAdded = !userRolesBefore.includes('OWNER') && userRolesAfter.includes('OWNER');

      if (!ownerWasAdded) {
        this.rbacService.forceInvalidateUser(userId);
        const RETRY_DELAY_MS = 150;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

        const retryPermissions = await this.rbacService.getUserPermissions(userId, false);
        const retryRoles = retryPermissions.roles.map((role) => role.name);

        if (!retryRoles.includes('OWNER')) {
          throw new Error('Role assignment failed: OWNER role not found after business creation');
        }
      }

      this.rbacService.forceInvalidateUser(userId);

      const tokenPair = await this.tokenService.generateTokenPair(userId, req.user!.phoneNumber);

      const tokens = {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        refreshExpiresIn: tokenPair.refreshExpiresIn,
      };

      if (process.env.NODE_ENV === 'development') {
        logger.info('✅ ROLE UPDATE: OWNER role verified and new tokens generated', {
          userId,
          rolesBefore: userRolesBefore,
          rolesAfter: userRolesAfter,
          timestamp: new Date().toISOString(),
        });
      }

      const response: BusinessCreationResponse = {
        success: true,
        data: business,
        message: 'Business created successfully. You have been upgraded to business owner.',
        tokens,
      };

      res.set('X-Role-Update', 'true');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      res.status(201).json(response);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business by ID
   * GET /api/v1/businesses/:id
   */
  async getBusinessById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { includeDetails, includeSubscription } = req.query;
      const userId = req.user!.id;

      let business;
      if (includeSubscription === 'true') {
        business = await this.businessService.getBusinessByIdWithSubscription(userId, id);
      } else {
        business = await this.businessService.getBusinessById(
          userId,
          id,
          includeDetails === 'true'
        );
      }

      if (!business) {
        await this.responseHelper.success(res, 'error.business.notFound', null, 404, req);
        return;
      }

      await this.responseHelper.success(res, 'success.business.retrieved', business, 200, req, {
        includesSubscriptionInfo: includeSubscription === 'true',
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business by slug (public endpoint)
   * GET /api/v1/businesses/slug/:slug
   */
  async getBusinessBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const business = await this.businessService.getBusinessBySlugWithServices(slug);

      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      await this.responseHelper.success(res, 'success.business.retrieved', business, 200, req);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get businesses by owner
   * GET /api/v1/businesses/owner/:ownerId
   */
  async getUserBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { ownerId } = req.params;
      const targetUserId = ownerId || userId;

      const businesses = await this.businessService.getBusinessesByOwner(userId, targetUserId);

      await this.responseHelper.success(res, 'success.business.retrieved', businesses, 200, req, {
        total: businesses.length,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update business
   * PUT /api/v1/businesses/:id
   */
  async updateBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateBusinessSchema.parse(req.body);
      const userId = req.user!.id;

      const business = await this.businessService.updateBusiness(userId, id, validatedData);

      await this.responseHelper.success(res, 'success.business.updated', business, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update my business
   * PUT /api/v1/businesses/my-business
   */
  async updateMyBusiness(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const validatedData = updateBusinessSchema.parse(req.body);
      const userId = req.user!.id;

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No business found to update',
        });
        return;
      }

      const businessId =
        req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];

      const business = await this.businessService.updateBusiness(userId, businessId, validatedData);

      await this.responseHelper.success(res, 'success.business.updated', business, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete business
   * DELETE /api/v1/businesses/:id
   */
  async deleteBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await this.businessService.deleteBusiness(userId, id);

      await this.responseHelper.success(res, 'success.business.deleted', undefined, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Search businesses
   * GET /api/v1/businesses/search
   */
  async searchBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = businessSearchSchema.parse(req.query);
      const userId = (req as AuthenticatedRequest).user?.id;

      const { page = 1, limit = 20, ...filters } = validatedQuery;

      const result = await this.businessService.searchBusinesses(
        userId || '',
        filters,
        page,
        limit
      );

      await this.responseHelper.paginated(
        res,
        'success.business.searchCompleted',
        result.businesses,
        result.total,
        result.page,
        limit,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get nearby businesses
   * GET /api/v1/businesses/nearby
   */
  async getNearbyBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius = 10, limit = 10 } = req.query;

      if (!latitude || !longitude) {
        const error = new AppError(
          'Latitude and longitude are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      const lmt = parseInt(limit as string);

      if (isNaN(lat) || isNaN(lng) || isNaN(rad) || isNaN(lmt)) {
        res.status(400).json({
          success: false,
          error: 'Invalid coordinates, radius, or limit format',
        });
        return;
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        res.status(400).json({
          success: false,
          error: 'Coordinates are out of valid range',
        });
        return;
      }

      if (rad < 0 || rad > 1000 || lmt < 1 || lmt > 100) {
        res.status(400).json({
          success: false,
          error: 'Radius must be between 0-1000km and limit between 1-100',
        });
        return;
      }

      const businesses = await this.businessService.findNearbyBusinesses(lat, lng, rad, lmt);

      await this.responseHelper.success(
        res,
        'success.business.nearbyRetrieved',
        {
          businesses,
          meta: {
            total: businesses.length,
            radius: rad,
            limit: lmt,
          },
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Check slug availability
   * GET /api/v1/businesses/slug/:slug/availability
   */
  async checkSlugAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { excludeId } = req.query;

      if (!slug || typeof slug !== 'string') {
        const error = new AppError('Slug is required', 400, ERROR_CODES.REQUIRED_FIELD_MISSING);
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      const slugRegex = /^[a-zA-Z0-9-_]+$/;
      if (!slugRegex.test(slug)) {
        res.status(400).json({
          success: false,
          error: 'Slug must contain only letters, numbers, hyphens, and underscores',
        });
        return;
      }

      if (slug.length < 3 || slug.length > 50) {
        res.status(400).json({
          success: false,
          error: 'Slug must be between 3 and 50 characters',
        });
        return;
      }

      const isAvailable = await this.businessService.checkSlugAvailability(
        slug,
        excludeId as string
      );

      await this.responseHelper.success(
        res,
        'success.business.slugChecked',
        {
          slug,
          available: isAvailable,
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business stats
   * GET /api/v1/businesses/:id/stats
   */
  async getBusinessStats(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const businessId = id === 'my' ? undefined : id;
      const stats = await this.businessService.getMyBusinessStats(userId, businessId);

      await this.responseHelper.success(res, 'success.business.statsRetrieved', stats, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Admin endpoints

  /**
   * Verify business (admin)
   * POST /api/v1/businesses/:id/verify
   */
  async verifyBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const business = await this.businessService.verifyBusiness(userId, id);

      await this.responseHelper.success(res, 'success.business.verified', business, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Unverify business (admin)
   * POST /api/v1/businesses/:id/unverify
   */
  async unverifyBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const business = await this.businessService.unverifyBusiness(userId, id);

      await this.responseHelper.success(res, 'success.business.unverified', business, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Close business (admin)
   * POST /api/v1/businesses/:id/close
   */
  async closeBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { closedUntil, reason } = req.body;
      const userId = req.user!.id;

      const business = await this.businessService.closeBusiness(
        userId,
        id,
        closedUntil ? new Date(closedUntil) : undefined,
        reason
      );

      await this.responseHelper.success(res, 'success.business.closed', business, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Reopen business (admin)
   * POST /api/v1/businesses/:id/reopen
   */
  async reopenBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const business = await this.businessService.reopenBusiness(userId, id);

      await this.responseHelper.success(res, 'success.business.reopened', business, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all businesses (admin)
   * GET /api/v1/businesses/admin/all
   */
  async getAllBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.businessService.getAllBusinesses(userId, page, limit);

      await this.responseHelper.paginated(
        res,
        'success.business.allRetrieved',
        result.businesses,
        result.total,
        result.page,
        limit,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get businesses by type
   * GET /api/v1/businesses/type/:businessTypeId
   */
  async getBusinessesByType(req: Request, res: Response): Promise<void> {
    try {
      const { businessTypeId } = req.params;

      const businesses = await this.businessService.getBusinessesByType(businessTypeId);

      await this.responseHelper.success(
        res,
        'success.business.byTypeRetrieved',
        businesses,
        200,
        req,
        { total: businesses.length, businessTypeId }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Batch verify businesses (admin)
   * POST /api/v1/businesses/admin/batch-verify
   */
  async batchVerifyBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessIds } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(businessIds) || businessIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'businessIds array is required',
        });
        return;
      }

      await this.businessService.batchVerifyBusinesses(userId, businessIds);

      await this.responseHelper.success(
        res,
        'success.business.batchVerified',
        undefined,
        200,
        req,
        { count: businessIds.length }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Batch close businesses (admin)
   * POST /api/v1/businesses/admin/batch-close
   */
  async batchCloseBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessIds, reason } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(businessIds) || businessIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'businessIds array is required',
        });
        return;
      }

      if (!reason || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Reason must be at least 5 characters long',
        });
        return;
      }

      await this.businessService.batchCloseBusinesses(userId, businessIds, reason);

      await this.responseHelper.success(res, 'success.business.batchClosed', undefined, 200, req, {
        count: businessIds.length,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get minimal business details (for listings)
   * GET /api/v1/businesses/minimal
   */
  async getAllBusinessesMinimalDetails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.businessService.getAllBusinessesMinimalDetails(page, limit);

      await this.responseHelper.paginated(
        res,
        'success.business.minimalRetrieved',
        result.businesses,
        result.total,
        result.page,
        limit,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
