import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  businessSearchSchema,
  createBusinessSchema,
  updateBusinessSchema
} from '../schemas/business.schemas';
import { BusinessService } from '../services/businessService';
import { RBACService } from '../services/rbacService';
import { TokenService } from '../services/tokenService';
import { AuthenticatedRequest } from '../types/auth';
import {
  BusinessErrors,
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse
} from '../utils/errorResponse';

export class BusinessController {
  constructor(
    private businessService: BusinessService,
    private tokenService?: TokenService,
    private rbacService?: RBACService
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
              createdAt: business.createdAt
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
                      maxStaffPerBusiness: sub.plan.maxStaffPerBusiness,
                      maxAppointmentsPerDay: sub.plan.maxAppointmentsPerDay
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

      // Clear RBAC cache to ensure fresh role data
      if (this.rbacService) {
        this.rbacService.clearUserCache(userId);
      }

      // After business creation and role assignment are committed, generate new tokens
      let tokens = null;
      if (this.rbacService && this.tokenService) {
        // Get fresh user permissions after role assignment (bypass cache)
        const userPermissionsAfter = await this.rbacService.getUserPermissions(userId, false);
        const userRolesAfter = userPermissionsAfter.roles.map(role => role.name);
        
        // If roles changed (specifically, if OWNER was added), generate new tokens
        const ownerWasAdded = !userRolesBefore.includes('OWNER') && userRolesAfter.includes('OWNER');
        
        if (ownerWasAdded) {
          const tokenPair = await this.tokenService.generateTokenPair(
            userId,
            req.user!.phoneNumber
          );
          
          tokens = {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken
          };
        }
      }

      const response: any = {
        success: true,
        data: business,
        message: 'Business created successfully'
      };

      // Include new tokens if roles were upgraded
      if (tokens) {
        response.tokens = tokens;
        response.message = 'Business created successfully. You have been upgraded to business owner.';
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business'
      });
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
}