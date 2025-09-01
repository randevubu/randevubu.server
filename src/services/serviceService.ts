import {
  ServiceData,
  CreateServiceRequest,
  UpdateServiceRequest
} from '../types/business';
import { ServiceRepository } from '../repositories/serviceRepository';
import { RBACService } from './rbacService';
import { PermissionName } from '../types/auth';

export class ServiceService {
  constructor(
    private serviceRepository: ServiceRepository,
    private rbacService: RBACService
  ) {}

  async createService(
    userId: string,
    businessId: string,
    data: CreateServiceRequest
  ): Promise<ServiceData> {
    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId }
      );
    }

    return await this.serviceRepository.create(businessId, data);
  }

  async getServiceById(
    userId: string,
    serviceId: string
  ): Promise<ServiceData | null> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) return null;

    // Check permissions to view services
    const [resource, action] = PermissionName.VIEW_ALL_SERVICES.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_SERVICES,
        { businessId: service.businessId }
      );
    }

    return service;
  }

  async getServicesByBusinessId(
    userId: string,
    businessId: string,
    activeOnly = false
  ): Promise<ServiceData[]> {
    // Check permissions to view services for this business
    const [resource, action] = PermissionName.VIEW_ALL_SERVICES.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_SERVICES,
        { businessId }
      );
    }

    if (activeOnly) {
      return await this.serviceRepository.findActiveByBusinessId(businessId);
    }

    return await this.serviceRepository.findByBusinessId(businessId);
  }

  async getPublicServicesByBusinessId(businessId: string): Promise<ServiceData[]> {
    // Public method - returns only active services for booking
    return await this.serviceRepository.findActiveByBusinessId(businessId);
  }

  async updateService(
    userId: string,
    serviceId: string,
    data: UpdateServiceRequest
  ): Promise<ServiceData> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId: service.businessId }
      );
    }

    return await this.serviceRepository.update(serviceId, data);
  }

  async deleteService(userId: string, serviceId: string): Promise<void> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId: service.businessId }
      );
    }

    await this.serviceRepository.delete(serviceId);
  }

  async reorderServices(
    userId: string,
    businessId: string,
    serviceOrders: { id: string; sortOrder: number }[]
  ): Promise<void> {
    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId }
      );
    }

    await this.serviceRepository.reorderServices(businessId, serviceOrders);
  }


  async getServiceStats(
    userId: string,
    serviceId: string
  ): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    totalRevenue: number;
    averageRating?: number;
  }> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Check permissions to view analytics for this business
    const [resource, action] = PermissionName.VIEW_ALL_ANALYTICS.split(':');
    const hasGlobalAnalytics = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalAnalytics) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_ANALYTICS,
        { businessId: service.businessId }
      );
    }

    return await this.serviceRepository.getServiceStats(serviceId);
  }

  async bulkUpdatePrices(
    userId: string,
    businessId: string,
    priceMultiplier: number
  ): Promise<void> {
    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId }
      );
    }

    if (priceMultiplier <= 0) {
      throw new Error('Price multiplier must be positive');
    }

    await this.serviceRepository.bulkUpdatePrices(businessId, priceMultiplier);
  }

  async getPopularServices(
    userId: string,
    businessId: string,
    limit = 5
  ): Promise<Array<ServiceData & { appointmentCount: number }>> {
    // Check permissions to view analytics for this business
    const [resource, action] = PermissionName.VIEW_ALL_ANALYTICS.split(':');
    const hasGlobalAnalytics = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalAnalytics) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_ANALYTICS,
        { businessId }
      );
    }

    return await this.serviceRepository.findPopularServices(businessId, limit);
  }

  async checkServiceAvailability(
    serviceId: string,
    date: Date,
    startTime: Date
  ): Promise<{
    isAvailable: boolean;
    service: ServiceData | null;
  }> {
    // Public method for booking availability check
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      return { isAvailable: false, service: null };
    }

    const isAvailable = await this.serviceRepository.checkServiceAvailability(
      serviceId,
      date,
      startTime
    );

    return { isAvailable, service };
  }

  // Admin methods
  async getAllServices(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    services: ServiceData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SERVICES);

    // This would need to be implemented in the repository
    // For now, we'll throw an error
    throw new Error('Admin service listing not implemented');
  }

  async toggleServiceStatus(
    userId: string,
    serviceId: string,
    isActive: boolean
  ): Promise<ServiceData> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId: service.businessId }
      );
    }

    return await this.serviceRepository.update(serviceId, { isActive });
  }

  async duplicateService(
    userId: string,
    serviceId: string,
    newName: string
  ): Promise<ServiceData> {
    const originalService = await this.serviceRepository.findById(serviceId);
    if (!originalService) {
      throw new Error('Service not found');
    }

    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId: originalService.businessId }
      );
    }

    const duplicateData: CreateServiceRequest = {
      name: newName,
      description: originalService.description,
      duration: originalService.duration,
      price: originalService.price,
      currency: originalService.currency,
      bufferTime: originalService.bufferTime,
      maxAdvanceBooking: originalService.maxAdvanceBooking,
      minAdvanceBooking: originalService.minAdvanceBooking
    };

    return await this.serviceRepository.create(originalService.businessId, duplicateData);
  }

  // Batch operations
  async batchToggleServices(
    userId: string,
    businessId: string,
    serviceIds: string[],
    isActive: boolean
  ): Promise<void> {
    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId }
      );
    }

    for (const serviceId of serviceIds) {
      await this.serviceRepository.update(serviceId, { isActive });
    }
  }

  async batchDeleteServices(
    userId: string,
    businessId: string,
    serviceIds: string[]
  ): Promise<void> {
    // Check permissions to manage services for this business
    const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
    const hasGlobalService = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalService) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SERVICES,
        { businessId }
      );
    }

    for (const serviceId of serviceIds) {
      await this.serviceRepository.delete(serviceId);
    }
  }

}