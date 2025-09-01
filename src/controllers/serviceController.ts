import { Request, Response } from 'express';
import { ServiceService } from '../services/serviceService';
import { 
  createServiceSchema, 
  updateServiceSchema 
} from '../schemas/business.schemas';
import { AuthenticatedRequest, GuaranteedAuthRequest } from '../types/auth';

export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  async createService(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const validatedData = createServiceSchema.parse(req.body);
      const userId = req.user.id;

      const service = await this.serviceService.createService(userId, businessId, validatedData);

      res.status(201).json({
        success: true,
        data: service,
        message: 'Service created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create service'
      });
    }
  }

  async getServiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const service = await this.serviceService.getServiceById(userId, id);

      if (!service) {
        res.status(404).json({
          success: false,
          error: 'Service not found'
        });
        return;
      }

      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getBusinessServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { activeOnly } = req.query;
      const userId = req.user!.id;

      const services = await this.serviceService.getServicesByBusinessId(
        userId,
        businessId,
        activeOnly === 'true'
      );

      res.json({
        success: true,
        data: services,
        meta: {
          total: services.length,
          businessId,
          activeOnly: activeOnly === 'true'
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getPublicBusinessServices(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;

      const services = await this.serviceService.getPublicServicesByBusinessId(businessId);

      res.json({
        success: true,
        data: services,
        meta: {
          total: services.length,
          businessId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateServiceSchema.parse(req.body);
      const userId = req.user!.id;

      const service = await this.serviceService.updateService(userId, id, validatedData);

      res.json({
        success: true,
        data: service,
        message: 'Service updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update service'
      });
    }
  }

  async deleteService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await this.serviceService.deleteService(userId, id);

      res.json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete service'
      });
    }
  }

  async reorderServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { serviceOrders } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(serviceOrders)) {
        res.status(400).json({
          success: false,
          error: 'serviceOrders must be an array'
        });
        return;
      }

      // Validate each order item
      for (const order of serviceOrders) {
        if (!order.id || typeof order.sortOrder !== 'number') {
          res.status(400).json({
            success: false,
            error: 'Each order item must have id and sortOrder'
          });
          return;
        }
      }

      await this.serviceService.reorderServices(userId, businessId, serviceOrders);

      res.json({
        success: true,
        message: 'Services reordered successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder services'
      });
    }
  }


  async getServiceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const stats = await this.serviceService.getServiceStats(userId, id);

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

  async bulkUpdatePrices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { priceMultiplier } = req.body;
      const userId = req.user!.id;

      if (typeof priceMultiplier !== 'number' || priceMultiplier <= 0) {
        res.status(400).json({
          success: false,
          error: 'priceMultiplier must be a positive number'
        });
        return;
      }

      await this.serviceService.bulkUpdatePrices(userId, businessId, priceMultiplier);

      res.json({
        success: true,
        message: `Prices updated with multiplier ${priceMultiplier}`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update prices'
      });
    }
  }

  async getPopularServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;
      const userId = req.user!.id;

      const services = await this.serviceService.getPopularServices(userId, businessId, limit);

      res.json({
        success: true,
        data: services,
        meta: {
          businessId,
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

  async checkServiceAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date, startTime } = req.query;

      if (!date || !startTime) {
        res.status(400).json({
          success: false,
          error: 'date and startTime are required'
        });
        return;
      }

      const appointmentDate = new Date(date as string);
      const appointmentStartTime = new Date(`${date}T${startTime}`);

      if (isNaN(appointmentDate.getTime()) || isNaN(appointmentStartTime.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date or time format'
        });
        return;
      }

      const result = await this.serviceService.checkServiceAvailability(
        id,
        appointmentDate,
        appointmentStartTime
      );

      res.json({
        success: true,
        data: {
          serviceId: id,
          date: date as string,
          startTime: startTime as string,
          isAvailable: result.isAvailable,
          service: result.service
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async toggleServiceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const userId = req.user!.id;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isActive must be a boolean'
        });
        return;
      }

      const service = await this.serviceService.toggleServiceStatus(userId, id, isActive);

      res.json({
        success: true,
        data: service,
        message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle service status'
      });
    }
  }

  async duplicateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      const userId = req.user!.id;

      if (!newName || typeof newName !== 'string' || newName.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'newName is required and must be at least 2 characters'
        });
        return;
      }

      const service = await this.serviceService.duplicateService(userId, id, newName.trim());

      res.status(201).json({
        success: true,
        data: service,
        message: 'Service duplicated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate service'
      });
    }
  }

  // Batch operations
  async batchToggleServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { serviceIds, isActive } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'serviceIds array is required'
        });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isActive must be a boolean'
        });
        return;
      }

      await this.serviceService.batchToggleServices(userId, businessId, serviceIds, isActive);

      res.json({
        success: true,
        message: `${serviceIds.length} services ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle services'
      });
    }
  }

  async batchDeleteServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { serviceIds } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'serviceIds array is required'
        });
        return;
      }

      await this.serviceService.batchDeleteServices(userId, businessId, serviceIds);

      res.json({
        success: true,
        message: `${serviceIds.length} services deleted successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete services'
      });
    }
  }

}