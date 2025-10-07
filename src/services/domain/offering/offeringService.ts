import {
  ServiceData,
  PublicServiceData,
  CreateServiceRequest,
  UpdateServiceRequest
} from '../../../types/business';
import { ServiceRepository } from '../../../repositories/serviceRepository';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { RBACService } from '../rbac/rbacService';
import { UsageService } from '../usage/usageService';
import { PermissionName } from '../../../types/auth';

export class OfferingService {
  constructor(
    private serviceRepository: ServiceRepository,
    private businessRepository: BusinessRepository,
    private rbacService: RBACService,
    private usageService: UsageService
  ) {}

  async createService(
    userId: string,
    businessId: string,
    data: CreateServiceRequest
  ): Promise<ServiceData> {
    // Check if business can add more services
    const canAddService = await this.usageService.canAddService(businessId);
    if (!canAddService.allowed) {
      throw new Error(`Cannot create service: ${canAddService.reason}`);
    }

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

    const service = await this.serviceRepository.create(businessId, data);

    // Update service usage tracking
    await this.usageService.updateServiceUsage(businessId);

    return service;
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

  async getPublicServicesByBusinessId(businessId: string): Promise<PublicServiceData[]> {
    // Get active services
    const services = await this.serviceRepository.findActiveByBusinessId(businessId);
    
    // Get business settings to check price visibility
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      // Return services with prices visible as fallback
      return services.map(service => ({
        ...service,
        showPrice: true
      }));
    }

    // Extract price visibility settings
    const settings = (business.settings as any) || {};
    const priceVisibility = settings.priceVisibility || {};
    const hideAllServicePrices = priceVisibility.hideAllServicePrices === true;

    // If prices should be hidden, remove price information
    if (hideAllServicePrices) {
      return services.map(service => ({
        ...service,
        price: null, // Hide the actual price
        showPrice: false, // Add flag to indicate price is hidden
        priceDisplayMessage: priceVisibility.priceDisplayMessage || 'Price available on request'
      }));
    }

    // Return services with prices visible
    return services.map(service => ({
      ...service,
      showPrice: true // Add flag to indicate price is visible
    }));
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

  /**
   * Process service data to hide/show prices based on business and service visibility settings
   */
  async processServicePriceVisibility(
    services: ServiceData[],
    businessSettings: any,
    context: 'list' | 'booking' | 'owner' = 'list'
  ): Promise<ServiceData[]> {
    const businessPriceSettings = businessSettings?.priceVisibility || {};
    
    return services.map(service => {
      // If context is 'owner', always show prices (for business owner/staff)
      if (context === 'owner') {
        return service;
      }

      // Determine if price should be shown based on hierarchical rules:
      // 1. Business-wide setting can override individual service settings
      // 2. Individual service showPrice setting
      // 3. Context-specific rules (booking vs list view)
      
      let shouldShowPrice = true;

      // Check business-wide setting first
      if (businessPriceSettings.hideAllServicePrices === true) {
        shouldShowPrice = false;
        
        // However, if we're in booking context and business allows showing price on booking
        if (context === 'booking' && businessPriceSettings.showPriceOnBooking === true) {
          shouldShowPrice = true;
        }
      } else {
        // Check individual service setting
        shouldShowPrice = service.showPrice !== false;
      }

      // Create a copy of the service with potentially hidden price info
      if (!shouldShowPrice) {
        return {
          ...service,
          price: 0, // Set to 0 instead of undefined to match type
          currency: service.currency || 'TRY', // Keep currency for consistency
          // Add custom message if available
          priceDisplayMessage: businessPriceSettings.priceDisplayMessage || 'Contact us for pricing',
          // Add flag to indicate price is hidden
          priceHidden: true
        };
      }

      return service;
    });
  }

  /**
   * Helper method to determine if user has owner-level access to a business
   */
  async hasOwnerAccess(userId: string, businessId: string): Promise<boolean> {
    try {
      // Check if user has global service management permission
      const [resource, action] = PermissionName.MANAGE_ALL_SERVICES.split(':');
      const hasGlobal = await this.rbacService.hasPermission(userId, resource, action);
      
      if (hasGlobal) return true;

      // Check if user has owner-level access to this specific business
      const [ownResource, ownAction] = PermissionName.MANAGE_OWN_SERVICES.split(':');
      return await this.rbacService.hasPermission(
        userId, 
        ownResource,
        ownAction,
        { businessId }
      );
    } catch {
      return false;
    }
  }

}