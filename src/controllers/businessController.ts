import { Request, Response } from 'express';
import { BusinessService } from '../services/businessService';
import { 
  createBusinessSchema, 
  updateBusinessSchema, 
  businessSearchSchema 
} from '../schemas/business.schemas';
import { AuthenticatedRequest } from '../types/auth';

export class BusinessController {
  constructor(private businessService: BusinessService) {}

  async createBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = createBusinessSchema.parse(req.body);
      const userId = req.user!.id;

      const business = await this.businessService.createBusiness(userId, validatedData);

      res.status(201).json({
        success: true,
        data: business,
        message: 'Business created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create business'
      });
    }
  }

  async getBusinessById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { includeDetails } = req.query;
      const userId = req.user!.id;

      const business = await this.businessService.getBusinessById(
        userId, 
        id, 
        includeDetails === 'true'
      );

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
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getBusinessBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const business = await this.businessService.getBusinessBySlug(slug);

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

  async getBusinessStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const stats = await this.businessService.getBusinessStats(userId, id);

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
}