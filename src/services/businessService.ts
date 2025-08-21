import {
  BusinessData,
  BusinessWithDetails,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessSearchFilters
} from '../types/business';
import { BusinessRepository } from '../repositories/businessRepository';
import { RBACService } from './rbacService';
import { PermissionName } from '../types/auth';

export class BusinessService {
  constructor(
    private businessRepository: BusinessRepository,
    private rbacService: RBACService
  ) {}

  async createBusiness(
    userId: string,
    data: CreateBusinessRequest
  ): Promise<BusinessData> {
    // Check permissions
    await this.rbacService.requirePermission(userId, PermissionName.CREATE_BUSINESS);

    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.name);

    // Create business
    const business = await this.businessRepository.create({
      ...data,
      ownerId: userId,
      slug
    });

    // Assign business owner role to user for this business
    await this.rbacService.assignRole(userId, 'BUSINESS_OWNER', userId, undefined, {
      businessId: business.id
    });

    return business;
  }

  async getBusinessById(
    userId: string,
    businessId: string,
    includeDetails = false
  ): Promise<BusinessData | BusinessWithDetails | null> {
    // Check if user has access to this business
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    
    if (!hasGlobalView) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId, 
        'business',
        'view_own',
        { businessId }
      );
      
      if (!hasBusinessAccess) {
        throw new Error('Access denied: You do not have permission to view this business');
      }
    }

    if (includeDetails) {
      return await this.businessRepository.findByIdWithDetails(businessId);
    }

    return await this.businessRepository.findById(businessId);
  }

  async getBusinessesByOwner(userId: string, ownerId: string): Promise<BusinessData[]> {
    // Users can view their own businesses, or admins can view any
    if (userId !== ownerId) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_BUSINESSES);
    } else {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS);
    }

    return await this.businessRepository.findByOwnerId(ownerId);
  }

  async updateBusiness(
    userId: string,
    businessId: string,
    data: UpdateBusinessRequest
  ): Promise<BusinessData> {
    // Check permissions - either global or business-specific
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');
    
    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId, 
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    return await this.businessRepository.update(businessId, data);
  }

  async deleteBusiness(userId: string, businessId: string): Promise<void> {
    // Check permissions
    const hasGlobalDelete = await this.rbacService.hasPermission(userId, 'business', 'delete_all');
    
    if (!hasGlobalDelete) {
      await this.rbacService.requirePermission(
        userId, 
        PermissionName.DELETE_OWN_BUSINESS,
        { businessId }
      );
    }

    await this.businessRepository.delete(businessId);
  }

  async searchBusinesses(
    userId: string,
    filters: BusinessSearchFilters,
    page = 1,
    limit = 20
  ): Promise<{
    businesses: BusinessData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Public search - no permission required for basic search
    // However, some filters might require permissions
    
    return await this.businessRepository.search(filters, page, limit);
  }

  async verifyBusiness(userId: string, businessId: string): Promise<BusinessData> {
    // Only admins can verify businesses
    await this.rbacService.requirePermission(userId, PermissionName.VERIFY_BUSINESS);

    return await this.businessRepository.updateVerificationStatus(businessId, true);
  }

  async unverifyBusiness(userId: string, businessId: string): Promise<BusinessData> {
    // Only admins can unverify businesses
    await this.rbacService.requirePermission(userId, PermissionName.VERIFY_BUSINESS);

    return await this.businessRepository.updateVerificationStatus(businessId, false);
  }

  async closeBusiness(
    userId: string,
    businessId: string,
    closedUntil?: Date,
    reason?: string
  ): Promise<BusinessData> {
    // Check permissions
    const hasGlobalClose = await this.rbacService.hasPermission(userId, 'business', 'close_all');
    
    if (!hasGlobalClose) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.CLOSE_OWN_BUSINESS,
        { businessId }
      );
    }

    return await this.businessRepository.updateClosureStatus(
      businessId,
      true,
      closedUntil,
      reason
    );
  }

  async reopenBusiness(userId: string, businessId: string): Promise<BusinessData> {
    // Check permissions
    const hasGlobalReopen = await this.rbacService.hasPermission(userId, 'business', 'close_all');
    
    if (!hasGlobalReopen) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.CLOSE_OWN_BUSINESS,
        { businessId }
      );
    }

    return await this.businessRepository.updateClosureStatus(businessId, false);
  }

  async getBusinessStats(
    userId: string,
    businessId: string
  ): Promise<{
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  }> {
    // Check if user has access to business analytics
    const hasGlobalAnalytics = await this.rbacService.hasPermission(userId, 'analytics', 'view_all');
    
    if (!hasGlobalAnalytics) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_ANALYTICS,
        { businessId }
      );
    }

    return await this.businessRepository.getBusinessStats(businessId);
  }

  async findNearbyBusinesses(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit = 10
  ): Promise<BusinessData[]> {
    // Public method - no authentication required
    return await this.businessRepository.findNearby(latitude, longitude, radiusKm, limit);
  }

  async updateBusinessHours(
    userId: string,
    businessId: string,
    businessHours: any
  ): Promise<BusinessData> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');
    
    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    return await this.businessRepository.bulkUpdateBusinessHours(businessId, businessHours);
  }

  async getBusinessBySlug(slug: string): Promise<BusinessData | null> {
    // Public method - no authentication required
    return await this.businessRepository.findBySlug(slug);
  }

  async checkSlugAvailability(slug: string, excludeBusinessId?: string): Promise<boolean> {
    return await this.businessRepository.checkSlugAvailability(slug, excludeBusinessId);
  }

  // Business staff management
  async addStaffMember(
    userId: string,
    businessId: string,
    staffUserId: string,
    role: string,
    permissions?: any
  ): Promise<void> {
    // Check permissions to manage staff
    const hasGlobalStaff = await this.rbacService.hasPermission(userId, 'staff', 'manage_all');
    
    if (!hasGlobalStaff) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_STAFF,
        { businessId }
      );
    }

    // Assign role to the staff member for this business
    await this.rbacService.assignRole(staffUserId, role, userId, undefined, {
      businessId,
      permissions
    });
  }

  async removeStaffMember(
    userId: string,
    businessId: string,
    staffUserId: string
  ): Promise<void> {
    // Check permissions to manage staff
    const hasGlobalStaff = await this.rbacService.hasPermission(userId, 'staff', 'manage_all');
    
    if (!hasGlobalStaff) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_STAFF,
        { businessId }
      );
    }

    // Remove staff member's business-specific roles
    // This would need to be implemented in RBACService
    // await this.rbacService.removeBusinessRoles(staffUserId, businessId);
  }

  async getUserBusinesses(userId: string): Promise<BusinessData[]> {
    return await this.businessRepository.findActiveBusinessesByOwner(userId);
  }

  // Utility methods
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (!(await this.checkSlugAvailability(slug))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Admin methods
  async getAllBusinesses(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    businesses: BusinessData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_BUSINESSES);

    const filters: BusinessSearchFilters = {};
    return await this.businessRepository.search(filters, page, limit);
  }

  async getBusinessesByType(businessTypeId: string): Promise<BusinessData[]> {
    // Public method
    return await this.businessRepository.findByBusinessTypeId(businessTypeId);
  }

  // Batch operations for admins
  async batchVerifyBusinesses(userId: string, businessIds: string[]): Promise<void> {
    await this.rbacService.requirePermission(userId, PermissionName.VERIFY_BUSINESS);

    for (const businessId of businessIds) {
      await this.businessRepository.updateVerificationStatus(businessId, true);
    }
  }

  async batchCloseBusinesses(
    userId: string, 
    businessIds: string[], 
    reason: string
  ): Promise<void> {
    await this.rbacService.requirePermission(userId, PermissionName.CLOSE_ALL_BUSINESSES);

    for (const businessId of businessIds) {
      await this.businessRepository.updateClosureStatus(businessId, true, undefined, reason);
    }
  }
}