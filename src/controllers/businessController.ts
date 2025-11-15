import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  businessSearchSchema,
  createBusinessSchema,
  updateBusinessSchema,
  updateBusinessPriceSettingsSchema,
  updateBusinessStaffPrivacySettingsSchema,
  imageUploadSchema,
  deleteImageSchema,
  deleteGalleryImageSchema
} from '../schemas/business.schemas';
import { updateGoogleIntegrationSchema } from '../schemas/rating.schemas';
import { BusinessService } from '../services/domain/business';
import { RBACService } from '../services/domain/rbac';
import { TokenService } from '../services/domain/token';
import { StaffService } from '../services/domain/staff';
import { AuthenticatedRequest, AuthenticatedRequestWithFile } from '../types/request';
import { BusinessData, BusinessSubscriptionData } from '../types/business';
// Cache invalidation handled by routes, not controllers
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
  BusinessErrors
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';

export class BusinessController {
  constructor(
    private businessService: BusinessService,
    private tokenService?: TokenService,
    private rbacService?: RBACService,
    private staffService?: StaffService
  ) {
  }

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
        res.json({
          success: true,
          message: 'No businesses found',
          data: { 
            businesses: [],
            hasBusinesses: false,
            isFirstTimeUser: true,
            canCreateBusiness: true
          }
        });
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
      res.json({
        success: true,
        message: 'Business data retrieved successfully',
        data: { 
          businesses: businesses.map(business => {
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
              businessType: business.businessType ? {
                id: business.businessType.id,
                name: business.businessType.name,
                displayName: business.businessType.displayName,
                icon: business.businessType.icon,
                category: business.businessType.category
              } : null
            };

            // Add subscription info if requested and available
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
                  plan: plan ? {
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
                      maxStaffPerBusiness: plan.maxStaffPerBusiness
                    },
                    isPopular: plan.isPopular
                  } : undefined
                }
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
            includesSubscriptionInfo: includeSubscription
          }
        }
      });

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
      
      // Allow users with OWNER role to proceed even without businesses
      // This enables them to create their first business
      if (!req.businessContext || (req.businessContext.businessIds.length === 0 && !req.businessContext.isOwner)) {
        const context = createErrorContext(req, userId);
        const error = new AppError('Access denied', 403, BusinessErrors.noAccess);
        return sendAppErrorResponse(res, error);
      }

      // If user has no businesses yet, return empty services array
      if (req.businessContext.businessIds.length === 0) {
        return await sendSuccessResponse(res, 'success.business.noServicesFound', {
          services: [],
          total: 0,
          page: 1,
          totalPages: 0
        }, 200, req);
      }

      const { businessId, active, page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const services = await this.businessService.getMyServices(userId, {
        businessId: businessId as string,
        active: active ? active === 'true' : undefined,
        page: pageNum,
        limit: limitNum
      });

      await sendSuccessResponse(res, 'success.business.servicesRetrieved', services, 200, req);

    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async createBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = createBusinessSchema.parse(req.body);
      const userId = req.user!.id;
      // Get user's roles before business creation
      const userRolesBefore = req.user?.roles?.map(role => role.name) || [];

      // Create business (transaction will be committed inside the service)
      const business = await this.businessService.createBusiness(userId, validatedData);

      // ENTERPRISE-GRADE SOLUTION: Ensure role propagation with read-after-write consistency
      let tokens = null;
      if (this.rbacService && this.tokenService) {
        // Aggressively clear all cache entries for this user (primary cache clear)
        this.rbacService.forceInvalidateUser(userId);
        
        // Wait for database consistency + replication delay (enterprise pattern)
        const DB_CONSISTENCY_DELAY_MS = 100; // Increased from 50ms to 100ms
        await new Promise(resolve => setTimeout(resolve, DB_CONSISTENCY_DELAY_MS));
        
        // Get fresh user permissions after role assignment (bypass cache)
        const userPermissionsAfter = await this.rbacService.getUserPermissions(userId, false);
        const userRolesAfter = userPermissionsAfter.roles.map(role => role.name);
        
        // Validate role assignment was successful
        const ownerWasAdded = !userRolesBefore.includes('OWNER') && userRolesAfter.includes('OWNER');
        
        if (!ownerWasAdded) {
          // Retry with additional cache clearing (handles distributed cache scenarios)
          this.rbacService.forceInvalidateUser(userId);
          const RETRY_DELAY_MS = 150; // Increased from 100ms to 150ms
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          
          const retryPermissions = await this.rbacService.getUserPermissions(userId, false);
          const retryRoles = retryPermissions.roles.map(role => role.name);
          
          if (!retryRoles.includes('OWNER')) {
            throw new Error('Role assignment failed: OWNER role not found after business creation');
          }
        }
        
        // Final cache clear before token generation to ensure subsequent requests get fresh data
        this.rbacService.forceInvalidateUser(userId);
        
        // Generate new tokens with updated roles
        // These tokens will be fresh (iat timestamp will be current)
        // Auth middleware will bypass cache for tokens < 5 seconds old
        const tokenPair = await this.tokenService.generateTokenPair(
          userId,
          req.user!.phoneNumber
        );
        
        tokens = {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ ROLE UPDATE: OWNER role verified and new tokens generated', {
            userId,
            rolesBefore: userRolesBefore,
            rolesAfter: userRolesAfter,
            timestamp: new Date().toISOString()
          });
        }
      }

      const response: { success: boolean; data: BusinessData; message?: string; tokens?: any } = {
        success: true,
        data: business,
        message: 'Business created successfully'
      };

      // Always include new tokens since we guaranteed role assignment
      if (tokens) {
        response.tokens = tokens;
        response.message = 'Business created successfully. You have been upgraded to business owner.';
        
        // Set cache control headers to prevent stale profile responses
        res.set('X-Role-Update', 'true');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }

      res.status(201).json(response);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

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
        res.status(404).json({
          success: false,
          error: 'Business not found'
        });
        return;
      }

      // Format response based on what was requested
      let responseData: BusinessData | (BusinessData & { subscription?: any }) = business;
      if (includeSubscription === 'true' && 'subscription' in business) {
        const businessWithSub = business as Record<string, unknown>;
        const subscription = businessWithSub.subscription as Record<string, unknown> | undefined;
        const plan = subscription?.plan as Record<string, unknown> | undefined;
        
        responseData = {
          ...business,
          subscription: subscription ? {
            ...subscription,
            plan: plan ? {
              ...plan,
              limits: {
                maxBusinesses: plan.maxBusinesses,
                maxStaffPerBusiness: plan.maxStaffPerBusiness,
                maxAppointmentsPerDay: plan.maxAppointmentsPerDay
              }
            } : undefined
          } : null
        };
      }

      res.json({
        success: true,
        data: responseData,
        meta: {
          includesSubscriptionInfo: includeSubscription === 'true'
        }
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getBusinessBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const business = await this.businessService.getBusinessBySlugWithServices(slug);

      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found'
        });
        return;
      }

      res.json({
        success: true,
        data: business
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getUserBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { ownerId } = req.params;
      const targetUserId = ownerId || userId;

      const businesses = await this.businessService.getBusinessesByOwner(userId, targetUserId);

      res.json({
        success: true,
        data: businesses,
        meta: {
          total: businesses.length
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async updateBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateBusinessSchema.parse(req.body);
      const userId = req.user!.id;

      const business = await this.businessService.updateBusiness(userId, id, validatedData);

      res.json({
        success: true,
        data: business,
        message: 'Business updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'BUSINESS_NOT_FOUND'
          }
        });
      } else if (error instanceof Error && error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to update business',
            code: 'UPDATE_FAILED'
          }
        });
      }
    }
  }

  async updateMyBusiness(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const validatedData = updateBusinessSchema.parse(req.body);
      const userId = req.user!.id;

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No business found to update',
            code: 'BUSINESS_NOT_FOUND'
          }
        });
        return;
      }

      // Use the primary business ID or the first business if no primary is set
      const businessId = req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];
      
      const business = await this.businessService.updateBusiness(userId, businessId, validatedData);

      res.json({
        success: true,
        data: business,
        message: 'Business updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'BUSINESS_NOT_FOUND'
          }
        });
      } else if (error instanceof Error && error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to update business',
            code: 'UPDATE_FAILED'
          }
        });
      }
    }
  }

  async updatePriceSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const validatedData = updateBusinessPriceSettingsSchema.parse(req.body);
      const userId = req.user!.id;

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No business found to update',
            code: 'BUSINESS_NOT_FOUND'
          }
        });
        return;
      }

      // Use the primary business ID or the first business if no primary is set
      const businessId = req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];
      
      const updatedBusiness = await this.businessService.updateBusinessPriceSettings(userId, businessId, validatedData);

      res.json({
        success: true,
        data: updatedBusiness,
        message: 'Price settings updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'BUSINESS_NOT_FOUND'
          }
        });
      } else if (error instanceof Error && error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to update price settings',
            code: 'UPDATE_FAILED'
          }
        });
      }
    }
  }

  async getPriceSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No business found',
            code: 'BUSINESS_NOT_FOUND'
          }
        });
        return;
      }

      // Use the primary business ID or the first business if no primary is set
      const businessId = req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];
      
      const priceSettings = await this.businessService.getBusinessPriceSettings(userId, businessId);

      res.json({
        success: true,
        data: priceSettings,
        message: 'Price settings retrieved successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'BUSINESS_NOT_FOUND'
          }
        });
      } else if (error instanceof Error && error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve price settings',
            code: 'RETRIEVAL_FAILED'
          }
        });
      }
    }
  }

  async deleteBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await this.businessService.deleteBusiness(userId, id);

      res.json({
        success: true,
        message: 'Business deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete business'
      });
    }
  }

  async searchBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = businessSearchSchema.parse(req.query);
      const userId = (req as AuthenticatedRequest).user?.id;

      const {
        page = 1,
        limit = 20,
        ...filters
      } = validatedQuery;

      const result = await this.businessService.searchBusinesses(
        userId || '',
        filters,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.businesses,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit
        }
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getNearbyBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius = 10, limit = 10 } = req.query;

      // Validate required parameters
      if (!latitude || !longitude) {
        const error = new AppError(
          'Latitude and longitude are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Parse and validate coordinates
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      const lmt = parseInt(limit as string);

      // Validate coordinate ranges
      if (isNaN(lat) || isNaN(lng) || isNaN(rad) || isNaN(lmt)) {
        const error = new AppError(
          'Invalid coordinates, radius, or limit format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate coordinate bounds
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        const error = new AppError(
          'Coordinates are out of valid range',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate radius and limit bounds
      if (rad < 0 || rad > 1000 || lmt < 1 || lmt > 100) {
        const error = new AppError(
          'Radius must be between 0-1000km and limit between 1-100',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const businesses = await this.businessService.findNearbyBusinesses(lat, lng, rad, lmt);

      await sendSuccessResponse(res, 'success.business.nearbyRetrieved', {
        businesses,
        meta: {
          total: businesses.length,
          radius: rad,
          limit: lmt
        }
      }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async verifyBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const business = await this.businessService.verifyBusiness(userId, id);

      res.json({
        success: true,
        data: business,
        message: 'Business verified successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async unverifyBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const business = await this.businessService.unverifyBusiness(userId, id);

      res.json({
        success: true,
        data: business,
        message: 'Business verification removed successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

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

      res.json({
        success: true,
        data: business,
        message: 'Business closed successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async reopenBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const business = await this.businessService.reopenBusiness(userId, id);

      res.json({
        success: true,
        data: business,
        message: 'Business reopened successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getBusinessStats(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Use context-based stats if no specific business ID provided
      const businessId = id === 'my' ? undefined : id;
      const stats = await this.businessService.getMyBusinessStats(userId, businessId);

      await sendSuccessResponse(res, 'success.business.statsRetrieved', stats, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateBusinessHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { businessHours } = req.body;
      const userId = req.user!.id;

      if (!businessHours || typeof businessHours !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid business hours format'
        });
        return;
      }

      const business = await this.businessService.updateBusinessHours(userId, id, businessHours);

      res.json({
        success: true,
        data: business,
        message: 'Business hours updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business hours'
      });
    }
  }

  // Enhanced Business Hours Management Endpoints

  /**
   * Get business hours for a specific business
   * GET /api/v1/businesses/{businessId}/hours
   */
  async getBusinessHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      const result = await this.businessService.getBusinessHours(userId, businessId);

      res.json({
        success: true,
        data: result,
        message: 'Business hours retrieved successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve business hours'
      });
    }
  }

  /**
   * Get business hours status for a specific date
   * GET /api/v1/businesses/{businessId}/hours/status?date=2025-01-15&timezone=Europe/Istanbul
   */
  async getBusinessHoursStatus(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { date, timezone } = req.query;

      const result = await this.businessService.getBusinessHoursStatus(
        businessId,
        date as string,
        timezone as string
      );

      res.json({
        success: true,
        data: result,
        message: 'Business hours status retrieved successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve business hours status'
      });
    }
  }

  /**
   * Create business hours override for a specific date
   * POST /api/v1/businesses/{businessId}/hours/overrides
   */
  async createBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const overrideData = req.body;

      const result = await this.businessService.createBusinessHoursOverride(
        userId,
        businessId,
        overrideData
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Business hours override created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create business hours override'
      });
    }
  }

  /**
   * Update business hours override for a specific date
   * PUT /api/v1/businesses/{businessId}/hours/overrides/{date}
   */
  async updateBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, date } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const result = await this.businessService.updateBusinessHoursOverride(
        userId,
        businessId,
        date,
        updateData
      );

      res.json({
        success: true,
        data: result,
        message: 'Business hours override updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business hours override'
      });
    }
  }

  /**
   * Delete business hours override for a specific date
   * DELETE /api/v1/businesses/{businessId}/hours/overrides/{date}
   */
  async deleteBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, date } = req.params;
      const userId = req.user!.id;

      await this.businessService.deleteBusinessHoursOverride(userId, businessId, date);

      res.json({
        success: true,
        message: 'Business hours override deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete business hours override'
      });
    }
  }

  /**
   * Get business hours overrides for a date range
   * GET /api/v1/businesses/{businessId}/hours/overrides?startDate=2025-01-01&endDate=2025-01-31
   */
  async getBusinessHoursOverrides(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      const result = await this.businessService.getBusinessHoursOverrides(
        userId,
        businessId,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: result,
        message: 'Business hours overrides retrieved successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve business hours overrides'
      });
    }
  }

  async checkSlugAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { excludeId } = req.query;

      // Validate slug format
      if (!slug || typeof slug !== 'string') {
        const error = new AppError(
          'Slug is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate slug format (alphanumeric, hyphens, underscores only)
      const slugRegex = /^[a-zA-Z0-9-_]+$/;
      if (!slugRegex.test(slug)) {
        const error = new AppError(
          'Slug must contain only letters, numbers, hyphens, and underscores',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate slug length
      if (slug.length < 3 || slug.length > 50) {
        const error = new AppError(
          'Slug must be between 3 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const isAvailable = await this.businessService.checkSlugAvailability(
        slug,
        excludeId as string
      );

      await sendSuccessResponse(res, 'success.business.slugChecked', {
        slug,
        available: isAvailable
      }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Admin endpoints
  async getAllBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.businessService.getAllBusinesses(userId, page, limit);

      res.json({
        success: true,
        data: result.businesses,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getBusinessesByType(req: Request, res: Response): Promise<void> {
    try {
      const { businessTypeId } = req.params;

      const businesses = await this.businessService.getBusinessesByType(businessTypeId);

      res.json({
        success: true,
        data: businesses,
        meta: {
          total: businesses.length,
          businessTypeId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async batchVerifyBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessIds } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(businessIds) || businessIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'businessIds array is required'
        });
        return;
      }

      await this.businessService.batchVerifyBusinesses(userId, businessIds);

      res.json({
        success: true,
        message: `${businessIds.length} businesses verified successfully`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify businesses'
      });
    }
  }

  async batchCloseBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessIds, reason } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(businessIds) || businessIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'businessIds array is required'
        });
        return;
      }

      if (!reason || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Reason must be at least 5 characters long'
        });
        return;
      }

      await this.businessService.batchCloseBusinesses(userId, businessIds, reason);

      res.json({
        success: true,
        message: `${businessIds.length} businesses closed successfully`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close businesses'
      });
    }
  }

  async getAllBusinessesMinimalDetails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.businessService.getAllBusinessesMinimalDetails(page, limit);

      res.json({
        success: true,
        data: result.businesses,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve businesses'
      });
    }
  }

  /**
   * Get all staff for a business
   * GET /api/v1/businesses/{businessId}/staff
   */
  async getBusinessStaff(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const includeInactive = req.query.includeInactive === 'true';

      if (!this.staffService) {
        throw new Error('Staff service not available');
      }

      const staff = await this.staffService.getBusinessStaff(
        userId,
        businessId,
        includeInactive
      );

      await sendSuccessResponse(res, 'success.business.staffRetrieved', { staff }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Invite staff member to business
   * POST /api/v1/businesses/{businessId}/staff/invite
   */
  async inviteStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const { phoneNumber, role, permissions, firstName, lastName } = req.body;

      if (!this.staffService) {
        throw new Error('Staff service not available');
      }

      const context = createErrorContext(req, 'STAFF_INVITATION');

      const result = await this.staffService.inviteStaff(
        userId,
        {
          businessId,
          phoneNumber,
          role,
          permissions,
          firstName,
          lastName,
        },
        context
      );

      await sendSuccessResponse(res, 'success.business.staffAdded', result, 201, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Complete staff invitation with SMS verification
   * POST /api/v1/businesses/{businessId}/staff/verify-invitation
   */
  async verifyStaffInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const {
        phoneNumber,
        verificationCode,
        role,
        permissions,
        firstName,
        lastName,
      } = req.body;

      if (!this.staffService) {
        throw new Error('Staff service not available');
      }

      const context = createErrorContext(req, 'STAFF_VERIFICATION');

      const result = await this.staffService.verifyStaffInvitation(
        userId,
        {
          businessId,
          phoneNumber,
          verificationCode,
          role,
          permissions,
          firstName,
          lastName,
        },
        context
      );

      if (result.success) {
        await sendSuccessResponse(res, 'success.business.staffVerified', result, 201, req);
      } else {
        const error = new AppError(
          result.message,
          400,
          ERROR_CODES.INVALID_VERIFICATION_CODE
        );
        sendAppErrorResponse(res, error);
      }
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Upload business image (logo, cover, profile, gallery)
   * POST /api/v1/businesses/{businessId}/images/upload
   */
  async uploadImage(req: AuthenticatedRequestWithFile, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      
      // Validate request body
      const validatedData = imageUploadSchema.parse(req.body);
      
      // Check if file was uploaded
      if (!req.file) {
        const error = new AppError(
          'No image file provided',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        sendAppErrorResponse(res, error);
        return;
      }

      const { imageType } = validatedData;
      const file = req.file;

      const result = await this.businessService.uploadBusinessImage(
        userId,
        businessId,
        imageType,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      await sendSuccessResponse(res, 'success.business.imageUploaded', {
        imageUrl: result.imageUrl,
        business: result.business
      }, 200, req, { imageType });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete business image (logo, cover, profile)
   * DELETE /api/v1/businesses/{businessId}/images/{imageType}
   */
  async deleteImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      
      // Validate image type
      const validatedData = deleteImageSchema.parse(req.params);
      const { imageType } = validatedData;

      const business = await this.businessService.deleteBusinessImage(
        userId,
        businessId,
        imageType
      );

      await sendSuccessResponse(res, 'success.business.imageDeleted', {
        business
      }, 200, req, { imageType });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete gallery image
   * DELETE /api/v1/businesses/{businessId}/images/gallery
   */
  async deleteGalleryImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      
      // Validate request body
      const validatedData = deleteGalleryImageSchema.parse(req.body);
      const { imageUrl } = validatedData;

      const business = await this.businessService.deleteGalleryImage(
        userId,
        businessId,
        imageUrl
      );

      await sendSuccessResponse(res, 'success.business.galleryImageDeleted', {
        business
      }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business images
   * GET /api/v1/businesses/{businessId}/images
   */
  async getBusinessImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      const images = await this.businessService.getBusinessImages(userId, businessId);

      await sendSuccessResponse(res, 'success.business.imagesRetrieved', {
        images
      }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update gallery images order
   * PUT /api/v1/businesses/{businessId}/images/gallery
   */
  async updateGalleryImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const { imageUrls } = req.body;

      if (!Array.isArray(imageUrls)) {
        const error = new AppError(
          'imageUrls must be an array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        sendAppErrorResponse(res, error);
        return;
      }

      const business = await this.businessService.updateGalleryImages(
        userId,
        businessId,
        imageUrls
      );

      await sendSuccessResponse(res, 'success.business.galleryUpdated', {
        business
      }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Business Notification Settings Methods

  async getNotificationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settings = await this.businessService.getBusinessNotificationSettings(userId, businessId);

      if (!settings) {
        // Return default settings if none exist
        res.status(200).json({
          success: true,
          data: {
            id: '',
            businessId,
            enableAppointmentReminders: true,
            reminderChannels: ['PUSH'],
            reminderTiming: [60, 1440], // 1 hour and 24 hours
            smsEnabled: false,
            pushEnabled: true,
            emailEnabled: false,
            timezone: 'Europe/Istanbul',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          message: 'Default notification settings (not yet configured)'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Notification settings retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateNotificationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settings = await this.businessService.updateBusinessNotificationSettings(
        userId,
        businessId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async testReminder(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      // Import the services dynamically to avoid circular dependencies
      const { NotificationService } = await import('../services/domain/notification/notificationService');
      
      if (!this.rbacService) {
        throw new Error('RBAC service not available');
      }
      
      // Use existing usage service from business service
      const usageService = this.businessService['usageService'];
      const notificationService = new NotificationService(this.businessService['repositories'], usageService);

      const testData = req.body || {};

      // Get business notification settings
      const businessSettings = await this.businessService.getOrCreateBusinessNotificationSettings(businessId);

      // Create a mock appointment for testing
      const now = new Date();
      const testTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const testAppointment = {
        id: `test-${Date.now()}`,
        businessId,
        customerId: userId, // Use current user as customer
        date: testTime,
        startTime: testTime,
        endTime: new Date(testTime.getTime() + 60 * 60 * 1000), // 1 hour duration
        status: 'CONFIRMED' as any,
        service: {
          id: 'test-service',
          name: 'Test Service',
          duration: 60
        },
        business: {
          id: businessId,
          name: 'Test Business',
          timezone: businessSettings.timezone
        },
        customer: {
          id: userId,
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: req.user!.phoneNumber
        }
      };

      // Determine channels to test
      const channelsToTest = testData.channels || businessSettings.reminderChannels;
      const results = [];

      // Test push notification if enabled and requested
      if (channelsToTest.includes('PUSH') && businessSettings.pushEnabled) {
        const pushResults = await notificationService.sendAppointmentReminder(testAppointment);
        results.push(...pushResults);
      }

      // Test SMS if enabled and requested with rate limiting
      if (channelsToTest.includes('SMS') && businessSettings.smsEnabled) {
        // Check SMS rate limiting (5 minutes between SMS tests per user)
        const SMS_RATE_LIMIT_MINUTES = 5;
        const recentSmsTests = await this.businessService.findRecentAuditEvents(userId, 'SMS_TEST', SMS_RATE_LIMIT_MINUTES);
        const lastSmsTest = recentSmsTests.length > 0 ? recentSmsTests[0] : null;

        if (lastSmsTest) {
          const timeRemaining = Math.ceil((lastSmsTest.createdAt.getTime() + SMS_RATE_LIMIT_MINUTES * 60 * 1000 - Date.now()) / 1000 / 60);
          results.push({
            success: false,
            error: `SMS test rate limited. Please wait ${timeRemaining} more minute(s) before testing SMS again.`,
            channel: 'SMS',
            status: 'RATE_LIMITED'
          });
        } else {
          const smsResults = await notificationService.sendSMSAppointmentReminder(testAppointment);
          results.push(...smsResults);

          // Log SMS test activity for rate limiting
          await this.businessService.logAuditEvent({
            userId,
            action: 'SMS_TEST',
            entity: 'NOTIFICATION',
            entityId: testAppointment.id,
            details: { businessId, testId: testAppointment.id }
          });
        }
      }

      // Test email if enabled and requested (placeholder for now)
      if (channelsToTest.includes('EMAIL') && businessSettings.emailEnabled) {
        results.push({
          success: true,
          messageId: `test-email-${Date.now()}`,
          channel: 'EMAIL',
          status: 'SENT'
        });
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.status(200).json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
            channels: channelsToTest,
            testMessage: testData.customMessage || 'Test reminder sent'
          }
        },
        message: `Test reminder completed: ${successCount} successful, ${failureCount} failed`
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getStaffPrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settings = await this.businessService.getStaffPrivacySettings(userId, businessId);

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Staff privacy settings retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateStaffPrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const validatedData = updateBusinessStaffPrivacySettingsSchema.parse(req.body);
      
      const settings = await this.businessService.updateStaffPrivacySettings(
        userId,
        businessId,
        validatedData
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Staff privacy settings updated successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get stored payment methods for a business
   * GET /api/v1/businesses/:businessId/payment-methods
   */
  async getPaymentMethods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business ID is required'
        });
        return;
      }

      // Get payment methods for the business
      const paymentMethods = await this.businessService.getPaymentMethods(businessId, userId);

      res.status(200).json({
        success: true,
        data: paymentMethods,
        message: 'Payment methods retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Add a new payment method for a business
   * POST /api/v1/businesses/:businessId/payment-methods
   */
  async addPaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business ID is required'
        });
        return;
      }

      // Add payment method for the business
      const paymentMethod = await this.businessService.addPaymentMethod(
        businessId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: paymentMethod,
        message: 'Payment method added successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Business Reservation Settings Methods

  async getReservationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settings = await this.businessService.getBusinessReservationSettings(userId, businessId);

      if (!settings) {
        // Return default settings if none exist
        res.status(200).json({
          success: true,
          data: {
            businessId,
            maxAdvanceBookingDays: 30,
            minNotificationHours: 2,
            maxDailyAppointments: 50,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          message: 'Default reservation settings (not yet configured)'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Reservation settings retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateReservationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settingsData = req.body;
      const updatedSettings = await this.businessService.updateBusinessReservationSettings(
        userId,
        businessId,
        settingsData
      );

      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: 'Reservation settings updated successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Business Cancellation Policy Methods

  async getCancellationPolicies(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const policies = await this.businessService.getBusinessCancellationPolicies(userId, businessId);

      res.status(200).json({
        success: true,
        data: policies,
        message: 'Cancellation policies retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateCancellationPolicies(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const policyData = req.body;
      const updatedPolicies = await this.businessService.updateBusinessCancellationPolicies(
        userId,
        businessId,
        policyData
      );

      res.status(200).json({
        success: true,
        data: updatedPolicies,
        message: 'Cancellation policies updated successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getCustomerPolicyStatus(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const customerId = req.params.customerId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      if (!customerId) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required'
        });
        return;
      }

      const customerStatus = await this.businessService.getCustomerPolicyStatus(
        userId,
        businessId,
        customerId
      );

      res.status(200).json({
        success: true,
        data: customerStatus,
        message: 'Customer policy status retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Business Customer Management Methods

  async getCustomerManagementSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settings = await this.businessService.getBusinessCustomerManagementSettings(userId, businessId);

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Customer management settings retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateCustomerManagementSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      const settingsData = req.body;
      const updatedSettings = await this.businessService.updateBusinessCustomerManagementSettings(
        userId,
        businessId,
        settingsData
      );

      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: 'Customer management settings updated successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getCustomerNotes(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const customerId = req.params.customerId;
      const noteType = req.query.noteType as 'STAFF' | 'INTERNAL' | 'CUSTOMER' | undefined;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      if (!customerId) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required'
        });
        return;
      }

      const notes = await this.businessService.getCustomerNotes(userId, businessId, customerId, noteType);

      res.status(200).json({
        success: true,
        data: notes,
        message: 'Customer notes retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async addCustomerNote(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const customerId = req.params.customerId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      if (!customerId) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required'
        });
        return;
      }

      const noteData = req.body;
      const note = await this.businessService.addCustomerNote(userId, businessId, customerId, noteData);

      res.status(201).json({
        success: true,
        data: note,
        message: 'Customer note added successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getCustomerLoyaltyStatus(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const customerId = req.params.customerId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      if (!customerId) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required'
        });
        return;
      }

      const loyaltyStatus = await this.businessService.getCustomerLoyaltyStatus(userId, businessId, customerId);

      res.status(200).json({
        success: true,
        data: loyaltyStatus,
        message: 'Customer loyalty status retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getCustomerEvaluation(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const appointmentId = req.params.appointmentId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          error: 'Appointment ID is required'
        });
        return;
      }

      const evaluation = await this.businessService.getCustomerEvaluation(userId, businessId, appointmentId);

      res.status(200).json({
        success: true,
        data: evaluation,
        message: 'Customer evaluation retrieved successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async submitCustomerEvaluation(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const appointmentId = req.params.appointmentId;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: 'Business context is required'
        });
        return;
      }

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          error: 'Appointment ID is required'
        });
        return;
      }

      const evaluationData = req.body;
      const evaluation = await this.businessService.submitCustomerEvaluation(
        userId,
        businessId,
        appointmentId,
        evaluationData
      );

      res.status(201).json({
        success: true,
        data: evaluation,
        message: 'Customer evaluation submitted successfully'
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update Google integration settings
   * PUT /api/v1/businesses/:id/google-integration
   */
  async updateGoogleIntegration(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    console.log('✅ [CONTROLLER] updateGoogleIntegration - ENTRY POINT REACHED');
    try {
      console.log('🔍 [GOOGLE INTEGRATION PUT] Starting...', {
        params: req.params,
        body: req.body,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });

      const { id } = req.params;
      const userId = req.user!.id;
      const validatedData = updateGoogleIntegrationSchema.parse(req.body);

      console.log('🔍 [GOOGLE INTEGRATION PUT] Calling service...', { userId, businessId: id, data: validatedData });

      const business = await this.businessService.updateGoogleIntegration(
        userId,
        id,
        validatedData
      );

      console.log('🔍 [GOOGLE INTEGRATION PUT] Business updated:', business.id);

      await sendSuccessResponse(
        res,
        'success.business.googleIntegrationUpdated',
        { business },
        200,
        req
      );
      console.log('✅ [CONTROLLER] updateGoogleIntegration - RESPONSE SENT');
    } catch (error) {
      console.log('❌ [CONTROLLER] updateGoogleIntegration - ERROR:', error);
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get Google integration settings (PUBLIC ENDPOINT)
   * GET /api/v1/businesses/:id/google-integration
   * No authentication required - anyone can view Google integration info
   */
  async getGoogleIntegration(
    req: Request,
    res: Response
  ): Promise<void> {
    console.log('✅ [CONTROLLER] getGoogleIntegration - ENTRY POINT REACHED');
    try {
      console.log('🔍 [GOOGLE INTEGRATION GET] Starting...', {
        params: req.params,
        timestamp: new Date().toISOString()
      });

      const { id } = req.params;

      console.log('🔍 [GOOGLE INTEGRATION GET] Calling service...', { businessId: id });

      // Public endpoint - get settings including coordinates
      const settings = await this.businessService.getGoogleIntegrationSettings('', id);

      console.log('🔍 [GOOGLE INTEGRATION GET] Settings retrieved:', {
        googlePlaceId: settings.googlePlaceId,
        googleOriginalUrl: settings.googleOriginalUrl,
        googleIntegrationEnabled: settings.googleIntegrationEnabled,
        googleLinkedAt: settings.googleLinkedAt,
        latitude: settings.latitude,
        longitude: settings.longitude,
        averageRating: settings.averageRating,
        totalRatings: settings.totalRatings,
        lastRatingAt: settings.lastRatingAt
      });

      // Generate URLs if enabled and linked
      // These URLs work without any API key - completely free!
      let urls;
      if (settings.googleIntegrationEnabled) {
        // ✅ PRIORITY 1: Use original URL if available (BEST - Direct to full business profile)
        if (settings.googleOriginalUrl) {
          const originalUrl = settings.googleOriginalUrl;

          console.log('✅ [GOOGLE INTEGRATION GET] Using ORIGINAL URL (best option):', {
            originalUrl
          });

          urls = {
            // Use the original URL for all maps-related links
            maps: originalUrl,
            reviews: originalUrl,
            writeReview: originalUrl,
            // For embed, use coordinates if available, otherwise try to convert the URL
            embed: settings.latitude && settings.longitude
              ? `https://maps.google.com/maps?q=${settings.latitude},${settings.longitude}&output=embed&z=17`
              : originalUrl
          };

          console.log('✅ [GOOGLE INTEGRATION GET] Generated URLs from original URL:', urls);
        }
        // ✅ PRIORITY 2: Use coordinates if available (RELIABLE - Shows exact pin)
        else if (settings.latitude && settings.longitude) {
          const lat = settings.latitude;
          const lng = settings.longitude;

          console.log('✅ [GOOGLE INTEGRATION GET] Using COORDINATES (exact pin location):', {
            lat,
            lng
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
              
              console.log('✅ Using CID for business profile:', decimalCid);
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
            embed: embedUrl
          };

          console.log('✅ [GOOGLE INTEGRATION GET] Generated coordinate-based URLs:', urls);
        } 
        // FALLBACK: Use Place ID or CID if coordinates not available
        else if (settings.googlePlaceId) {
          const googleId = settings.googlePlaceId;

          // Detect format: CID (0x...:0x...) vs Place ID (ChIJ..., EI..., GhIJ...)
          const isCIDFormat = googleId.includes(':') && googleId.includes('0x');
          const isPlaceIDFormat = googleId.startsWith('ChIJ') ||
                                 googleId.startsWith('EI') ||
                                 googleId.startsWith('GhIJ');

          console.log('⚠️ [GOOGLE INTEGRATION GET] No coordinates - falling back to Google ID:', {
            googleId,
            isCIDFormat,
            isPlaceIDFormat
          });

          if (isCIDFormat) {
            // Handle CID format (e.g., 0x14c94904b01833f1:0x3411f4f9a81471)
            // Extract the second part and convert hex to decimal
            const cidParts = googleId.split(':');
            const hexCid = cidParts[1].replace('0x', '');
            const decimalCid = parseInt(hexCid, 16);

            console.log('🔍 [GOOGLE INTEGRATION GET] CID conversion:', {
              hexCid,
              decimalCid
            });

            urls = {
              // Direct link using CID
              maps: `https://www.google.com/maps?cid=${decimalCid}`,

              // Reviews and write review using CID
              reviews: `https://www.google.com/maps?cid=${decimalCid}`,
              writeReview: `https://www.google.com/maps?cid=${decimalCid}`,

              // Embed URL using CID (may show general area instead of exact pin)
              embed: `https://maps.google.com/maps?cid=${decimalCid}&output=embed`
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
              embed: `https://maps.google.com/maps?q=place_id:${googleId}&output=embed`
            };
          } else {
            // Unknown format - try to use it as-is
            console.warn('⚠️ [GOOGLE INTEGRATION GET] Unknown Google ID format:', googleId);
            urls = {
              maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
              reviews: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
              writeReview: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleId)}`,
              embed: `https://maps.google.com/maps?q=${encodeURIComponent(googleId)}&output=embed`
            };
          }

          console.log('🔍 [GOOGLE INTEGRATION GET] Generated ID-based URLs:', urls);
        } else {
          console.log('⚠️ [GOOGLE INTEGRATION GET] No URLs generated - no coordinates or place ID');
        }
      } else {
        console.log('🔍 [GOOGLE INTEGRATION GET] No URLs generated - integration disabled');
      }

      // Google Places API has been removed - ratings are no longer fetched from Google

      // Separate internal and Google ratings in the response
      const responseData: any = {
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
          lastRatingAt: settings.lastRatingAt
        },

        // URLs for maps embed and links
        urls
      };

      await sendSuccessResponse(
        res,
        'success.business.googleIntegrationRetrieved',
        responseData,
        200,
        req
      );
      console.log('✅ [CONTROLLER] getGoogleIntegration - RESPONSE SENT');
    } catch (error) {
      console.log('❌ [CONTROLLER] getGoogleIntegration - ERROR:', error);
      handleRouteError(error, req, res);
    }
  }
}