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
import { BusinessService } from '../services/businessService';
import { RBACService } from '../services/rbacService';
import { TokenService } from '../services/tokenService';
import { StaffService } from '../services/staffService';
import { AuthenticatedRequest, AuthenticatedRequestWithFile } from '../types/auth';
import {
  BusinessErrors,
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse
} from '../utils/errorResponse';
import { AppError } from '../types/errorResponse';
import { ERROR_CODES } from '../constants/errorCodes';

export class BusinessController {
  constructor(
    private businessService: BusinessService,
    private tokenService?: TokenService,
    private rbacService?: RBACService,
    private staffService?: StaffService
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
      
      console.log('🔍 DEBUG getMyBusiness:');
      console.log('  User ID:', userId);
      console.log('  User roles:', req.user?.roles?.map(r => r.name) || 'undefined');
      console.log('  Business context:', req.businessContext);
      
      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        console.log('  ❌ Returning empty - no business context or empty business IDs');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json({
          success: true,
          message: 'No businesses found',
          data: { 
            businesses: [] 
          }
        });
        return;
      }

      let businesses;
      console.log('DEBUG: includeSubscription =', includeSubscription);
      if (includeSubscription) {
        console.log('DEBUG: Calling getMyBusinessesWithSubscription');
        businesses = await this.businessService.getMyBusinessesWithSubscription(userId);
        console.log('DEBUG: Received businesses with subscription:', businesses.length, 'businesses');
        console.log('DEBUG: First business subscription:', businesses[0]?.subscription);
      } else {
        console.log('DEBUG: Calling regular getMyBusinesses');
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
              const sub = business.subscription as any;
              return {
                ...baseData,
                subscription: {
                  id: sub.id,
                  status: sub.status,
                  currentPeriodStart: sub.currentPeriodStart,
                  currentPeriodEnd: sub.currentPeriodEnd,
                  cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                  plan: {
                    id: sub.plan.id,
                    name: sub.plan.name,
                    displayName: sub.plan.displayName,
                    description: sub.plan.description,
                    price: sub.plan.price,
                    currency: sub.plan.currency,
                    billingInterval: sub.plan.billingInterval,
                    features: sub.plan.features,
                    limits: {
                      maxBusinesses: sub.plan.maxBusinesses,
                      maxStaffPerBusiness: sub.plan.maxStaffPerBusiness
                    },
                    isPopular: sub.plan.isPopular
                  }
                }
              };
            }

            return baseData;
          }),
          context: {
            primaryBusinessId: req.businessContext.primaryBusinessId,
            totalBusinesses: req.businessContext.businessIds.length,
            includesSubscriptionInfo: includeSubscription
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve business data',
          code: 'INTERNAL_SERVER_ERROR'
        }
      });
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
        const error = BusinessErrors.noAccess(context);
        return sendAppErrorResponse(res, error);
      }

      // If user has no businesses yet, return empty services array
      if (req.businessContext.businessIds.length === 0) {
        return sendSuccessResponse(res, {
          services: [],
          total: 0,
          page: 1,
          totalPages: 0
        }, 'No services found - create a business first');
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

      sendSuccessResponse(res, services, 'Services retrieved successfully');

    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async createBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    console.log('🚀 BUSINESS CREATION STARTED - Method called');
    console.log('🚀 BUSINESS CREATION - Request body:', req.body);
    console.log('🚀 BUSINESS CREATION - User:', req.user?.id);
    console.log('🚀 BUSINESS CREATION - Token service available:', !!this.tokenService);
    console.log('🚀 BUSINESS CREATION - RBAC service available:', !!this.rbacService);
    try {
      const validatedData = createBusinessSchema.parse(req.body);
      const userId = req.user!.id;
      console.log('🚀 BUSINESS CREATION - User ID:', userId);
      
      // Get user's roles before business creation
      const userRolesBefore = req.user?.roles?.map(role => role.name) || [];
      console.log('🔍 DEBUG Business Creation - Roles before:', userRolesBefore);

      // Create business (transaction will be committed inside the service)
      const business = await this.businessService.createBusiness(userId, validatedData);

      // ENTERPRISE-GRADE SOLUTION: Ensure role propagation with read-after-write consistency
      let tokens = null;
      if (this.rbacService && this.tokenService) {
        // Aggressively clear all cache entries for this user
        this.rbacService.forceInvalidateUser(userId);
        
        // Wait for database consistency (enterprise pattern)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get fresh user permissions after role assignment (bypass cache)
        const userPermissionsAfter = await this.rbacService.getUserPermissions(userId, false);
        const userRolesAfter = userPermissionsAfter.roles.map(role => role.name);
        
        // Validate role assignment was successful
        const ownerWasAdded = !userRolesBefore.includes('OWNER') && userRolesAfter.includes('OWNER');
        
        if (!ownerWasAdded) {
          console.warn('⚠️ OWNER role was not found immediately after assignment. Retrying...');
          // Retry with additional cache clearing (handles distributed cache scenarios)
          this.rbacService.forceInvalidateUser(userId);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const retryPermissions = await this.rbacService.getUserPermissions(userId, false);
          const retryRoles = retryPermissions.roles.map(role => role.name);
          
          if (!retryRoles.includes('OWNER')) {
            throw new Error('Role assignment failed: OWNER role not found after business creation');
          }
        }
        
        // Generate new tokens with updated roles
        const tokenPair = await this.tokenService.generateTokenPair(
          userId,
          req.user!.phoneNumber
        );
        
        tokens = {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        };
        
        console.log('✅ Role propagation validated successfully:', userRolesAfter);
      }

      const response: any = {
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
      } else {
        console.warn('⚠️ No tokens generated after business creation');
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ BUSINESS CREATION ERROR:', error);
      console.error('❌ BUSINESS CREATION ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create business'
      });
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
      let responseData: any = business;
      if (includeSubscription === 'true' && 'subscription' in business) {
        const businessWithSub = business as any;
        responseData = {
          ...business,
          subscription: businessWithSub.subscription ? {
            ...businessWithSub.subscription,
            plan: businessWithSub.subscription.plan ? {
              ...businessWithSub.subscription.plan,
              limits: {
                maxBusinesses: businessWithSub.subscription.plan.maxBusinesses,
                maxStaffPerBusiness: businessWithSub.subscription.plan.maxStaffPerBusiness,
                maxAppointmentsPerDay: businessWithSub.subscription.plan.maxAppointmentsPerDay
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
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid search parameters'
      });
    }
  }

  async getNearbyBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius = 10, limit = 10 } = req.query;

      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
        return;
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      const lmt = parseInt(limit as string);

      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        res.status(400).json({
          success: false,
          error: 'Invalid coordinates or radius'
        });
        return;
      }

      const businesses = await this.businessService.findNearbyBusinesses(lat, lng, rad, lmt);

      res.json({
        success: true,
        data: businesses,
        meta: {
          total: businesses.length,
          radius: rad
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
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
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify business'
      });
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
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unverify business'
      });
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close business'
      });
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reopen business'
      });
    }
  }

  async getBusinessStats(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Use context-based stats if no specific business ID provided
      const businessId = id === 'my' ? undefined : id;
      const stats = await this.businessService.getMyBusinessStats(userId, businessId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
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

      const isAvailable = await this.businessService.checkSlugAvailability(
        slug,
        excludeId as string
      );

      res.json({
        success: true,
        data: {
          slug,
          available: isAvailable
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
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

      sendSuccessResponse(res, { staff });
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

      sendSuccessResponse(res, result);
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
        sendSuccessResponse(res, result, undefined, undefined, 201);
      } else {
        const error = new AppError(
          ERROR_CODES.INVALID_VERIFICATION_CODE,
          { message: result.message },
          context,
          400
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
      console.log('🔍 Upload Image - Starting');
      const userId = req.user!.id;
      const { businessId } = req.params;
      
      console.log('🔍 Upload Image - User ID:', userId);
      console.log('🔍 Upload Image - Business ID:', businessId);
      console.log('🔍 Upload Image - Request body:', req.body);
      console.log('🔍 Upload Image - File info:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file');
      
      // Validate request body
      const validatedData = imageUploadSchema.parse(req.body);
      console.log('🔍 Upload Image - Validated data:', validatedData);
      
      // Check if file was uploaded
      if (!req.file) {
        const error = new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          { message: 'No image file provided' },
          createErrorContext(req, 'IMAGE_UPLOAD'),
          400
        );
        sendAppErrorResponse(res, error);
        return;
      }

      const { imageType } = validatedData;
      const file = req.file;

      console.log('🔍 Upload Image - Calling business service...');
      const result = await this.businessService.uploadBusinessImage(
        userId,
        businessId,
        imageType,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      console.log('🔍 Upload Image - Success:', result.imageUrl);
      sendSuccessResponse(res, {
        message: `${imageType} image uploaded successfully`,
        imageUrl: result.imageUrl,
        business: result.business
      });
    } catch (error) {
      console.error('🚨 Upload Image Error:', error);
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

      sendSuccessResponse(res, {
        message: `${imageType} image deleted successfully`,
        business
      });
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

      sendSuccessResponse(res, {
        message: 'Gallery image deleted successfully',
        business
      });
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

      sendSuccessResponse(res, {
        message: 'Business images retrieved successfully',
        images
      });
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
          ERROR_CODES.VALIDATION_ERROR,
          { message: 'imageUrls must be an array' },
          createErrorContext(req, 'IMAGE_UPDATE'),
          400
        );
        sendAppErrorResponse(res, error);
        return;
      }

      const business = await this.businessService.updateGalleryImages(
        userId,
        businessId,
        imageUrls
      );

      sendSuccessResponse(res, {
        message: 'Gallery images updated successfully',
        business
      });
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
      const { NotificationService } = await import('../services/notificationService');
      const notificationService = new NotificationService(this.businessService['prisma']);

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
        const lastSmsTest = await this.businessService['prisma'].auditLog.findFirst({
          where: {
            userId,
            entity: 'SMS_TEST',
            createdAt: {
              gte: new Date(Date.now() - SMS_RATE_LIMIT_MINUTES * 60 * 1000)
            }
          },
          orderBy: { createdAt: 'desc' }
        });

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
          await this.businessService['prisma'].auditLog.create({
            data: {
              id: `sms-test-${Date.now()}`,
              action: 'USER_UPDATE',
              entity: 'SMS_TEST',
              entityId: testAppointment.id,
              userId,
              details: { businessId, testId: testAppointment.id }
            }
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
}