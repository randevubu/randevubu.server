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
import { BusinessContext } from '../middleware/businessContext';
import { PrismaClient } from '@prisma/client';

export class BusinessService {
  constructor(
    private businessRepository: BusinessRepository,
    private rbacService: RBACService,
    private prisma: PrismaClient
  ) {}

  async createBusiness(
    userId: string,
    data: CreateBusinessRequest
  ): Promise<BusinessData> {
    // Check permissions
    await this.rbacService.requirePermission(userId, PermissionName.CREATE_BUSINESS);

    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.name);

    // Use transaction to ensure atomicity - either both business creation and role assignment succeed, or both fail
    const business = await this.prisma.$transaction(async (tx) => {
      // Create business directly using transaction client
      const businessId = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const createdBusiness = await tx.business.create({
        data: {
          id: businessId,
          ownerId: userId,
          businessTypeId: data.businessTypeId,
          name: data.name,
          slug: slug,
          description: data.description || '',
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          timezone: data.timezone,
          primaryColor: data.primaryColor,
          isActive: true,
          isVerified: false,
          isClosed: false,
          tags: data.tags || [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Get the OWNER role
      const ownerRole = await tx.role.findUnique({
        where: { name: 'OWNER' }
      });

      if (!ownerRole || !ownerRole.isActive) {
        throw new Error('OWNER role not found or inactive');
      }

      // Assign the role within the same transaction (upsert to handle existing roles)
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userId,
            roleId: ownerRole.id
          }
        },
        create: {
          id: `urole_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          userId: userId,
          roleId: ownerRole.id,
          grantedBy: userId,
          grantedAt: new Date(),
          isActive: true,
          metadata: {
            businessId: businessId
          }
        },
        update: {
          isActive: true,
          grantedBy: userId,
          grantedAt: new Date(),
          metadata: {
            businessId: businessId
          },
          updatedAt: new Date()
        }
      });

      // Convert the result to BusinessData format
      return {
        id: createdBusiness.id,
        ownerId: createdBusiness.ownerId,
        businessTypeId: createdBusiness.businessTypeId,
        name: createdBusiness.name,
        slug: createdBusiness.slug,
        description: createdBusiness.description,
        email: createdBusiness.email,
        phone: createdBusiness.phone,
        website: createdBusiness.website,
        address: createdBusiness.address,
        city: createdBusiness.city,
        state: createdBusiness.state,
        country: createdBusiness.country,
        postalCode: createdBusiness.postalCode,
        latitude: createdBusiness.latitude,
        longitude: createdBusiness.longitude,
        businessHours: createdBusiness.businessHours,
        timezone: createdBusiness.timezone,
        logoUrl: createdBusiness.logoUrl,
        coverImageUrl: createdBusiness.coverImageUrl,
        primaryColor: createdBusiness.primaryColor,
        theme: createdBusiness.theme,
        settings: createdBusiness.settings,
        isActive: createdBusiness.isActive,
        isVerified: createdBusiness.isVerified,
        verifiedAt: createdBusiness.verifiedAt,
        isClosed: createdBusiness.isClosed,
        closedUntil: createdBusiness.closedUntil,
        closureReason: createdBusiness.closureReason,
        tags: createdBusiness.tags,
        createdAt: createdBusiness.createdAt,
        updatedAt: createdBusiness.updatedAt,
        deletedAt: createdBusiness.deletedAt
      } as BusinessData;
    });

    // Clear RBAC cache for the user since they now have a new role
    // Note: This is a private method in RBACService, so we'll need to call it through a public method if available
    // For now, the cache will expire naturally or we could add a public method to clear it

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

  // Enhanced method with subscription information
  async getBusinessByIdWithSubscription(
    userId: string,
    businessId: string
  ): Promise<(BusinessData & {
    subscription?: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      trialStart?: Date;
      trialEnd?: Date;
      plan: {
        id: string;
        name: string;
        displayName: string;
        description: string | null;
        price: number;
        currency: string;
        billingInterval: string;
        maxBusinesses: number;
        maxStaffPerBusiness: number;
        maxAppointmentsPerDay: number;
        features: string[];
        isPopular: boolean;
      };
    };
  }) | null> {
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

    return await this.businessRepository.findByIdWithSubscription(businessId);
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

  async getBusinessesByStaff(userId: string): Promise<BusinessData[]> {
    // Staff can view businesses they work at
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    return await this.businessRepository.findByStaffUserId(userId);
  }

  async getMyBusinesses(userId: string): Promise<BusinessData[]> {
    // Get user permissions to determine what businesses they can access
    const userPermissions = await this.rbacService.getUserPermissions(userId);
    const roleNames = userPermissions.roles.map(role => role.name);

    let businesses: BusinessData[] = [];

    // If user is an owner, get their owned businesses
    if (roleNames.includes('OWNER')) {
      const ownedBusinesses = await this.businessRepository.findByOwnerId(userId);
      businesses.push(...ownedBusinesses);
    }

    // If user is staff, get businesses they work at
    if (roleNames.includes('STAFF')) {
      const staffBusinesses = await this.businessRepository.findByStaffUserId(userId);
      businesses.push(...staffBusinesses);
    }

    // Remove duplicates (in case user is both owner and staff of same business)
    const uniqueBusinesses = businesses.filter((business, index, self) => 
      self.findIndex(b => b.id === business.id) === index
    );

    return uniqueBusinesses;
  }

  // Enhanced method with subscription information
  async getMyBusinessesWithSubscription(userId: string): Promise<(BusinessData & {
    subscription?: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      plan: {
        id: string;
        name: string;
        displayName: string;
        description: string | null;
        price: number;
        currency: string;
        billingInterval: string;
        maxBusinesses: number;
        maxStaffPerBusiness: number;
        maxAppointmentsPerDay: number;
        features: string[];
        isPopular: boolean;
      };
    };
  })[]> {
    // Get user permissions to determine what businesses they can access
    const userPermissions = await this.rbacService.getUserPermissions(userId);
    const roleNames = userPermissions.roles.map(role => role.name);

    let businesses: (BusinessData & { subscription?: any })[] = [];

    // If user is an owner, get their owned businesses with subscription info
    if (roleNames.includes('OWNER')) {
      const ownedBusinesses = await this.businessRepository.findByOwnerIdWithSubscription(userId);
      businesses.push(...ownedBusinesses);
    }

    // If user is staff, get businesses they work at (basic info only)
    if (roleNames.includes('STAFF')) {
      const staffBusinesses = await this.businessRepository.findByStaffUserId(userId);
      businesses.push(...staffBusinesses.map(b => ({ ...b, subscription: undefined })));
    }

    // Remove duplicates (in case user is both owner and staff of same business)
    // Keep the version with subscription info if available
    const uniqueBusinesses = businesses.reduce((unique, current) => {
      const existing = unique.find(b => b.id === current.id);
      if (!existing) {
        unique.push(current);
      } else if (current.subscription && !existing.subscription) {
        // Replace with version that has subscription info
        const index = unique.findIndex(b => b.id === current.id);
        unique[index] = current;
      }
      return unique;
    }, [] as typeof businesses);

    return uniqueBusinesses;
  }

  async getMyServices(userId: string, options: {
    businessId?: string;
    active?: boolean;
    page: number;
    limit: number;
  }): Promise<{
    services: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Get user's accessible businesses
    const businesses = await this.getMyBusinesses(userId);
    const accessibleBusinessIds = businesses.map(b => b.id);

    if (accessibleBusinessIds.length === 0) {
      throw new Error('No accessible businesses found');
    }

    let businessIds: string[] = [];

    // If specific business is requested, validate access
    if (options.businessId) {
      if (!accessibleBusinessIds.includes(options.businessId)) {
        throw new Error('Access denied to this business');
      }
      businessIds = [options.businessId];
    } else {
      // Use all accessible businesses
      businessIds = accessibleBusinessIds;
    }

    // Get services from accessible businesses
    return await this.businessRepository.getServicesByBusinessIds(businessIds, {
      active: options.active,
      page: options.page,
      limit: options.limit
    });
  }

  async getMyBusinessStatsWithContext(businessContext: BusinessContext): Promise<Record<string, {
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  }>> {
    if (businessContext.businessIds.length === 0) {
      throw new Error('No accessible businesses found');
    }

    return await this.businessRepository.getMultipleBusinessStats(businessContext.businessIds);
  }

  async getMyBusinessStats(userId: string, businessId?: string): Promise<{
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  } | Record<string, {
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  }>> {
    // Get user's accessible businesses
    const businesses = await this.getMyBusinesses(userId);
    const businessIds = businesses.map(b => b.id);

    if (businessIds.length === 0) {
      throw new Error('No accessible businesses found');
    }

    // If specific business requested, validate access and return single stats
    if (businessId) {
      if (!businessIds.includes(businessId)) {
        throw new Error('Access denied to this business');
      }
      return await this.businessRepository.getBusinessStats(businessId);
    }

    // Return stats for all accessible businesses  
    return await this.businessRepository.getMultipleBusinessStats(businessIds);
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
    businessId?: string
  ): Promise<{
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  } | Record<string, {
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  }>> {
    // Get user's business context
    const businesses = await this.getMyBusinesses(userId);
    const businessIds = businesses.map(b => b.id);

    if (businessIds.length === 0) {
      throw new Error('No accessible businesses found');
    }

    // If specific business requested, validate access and return single stats
    if (businessId) {
      if (!businessIds.includes(businessId)) {
        throw new Error('Access denied to this business');
      }
      return await this.businessRepository.getBusinessStats(businessId);
    }

    // Return stats for all accessible businesses
    return await this.businessRepository.getMultipleBusinessStats(businessIds);
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

    return await this.businessRepository.updateBusinessHours(businessId, businessHours);
  }

  async getBusinessBySlug(slug: string): Promise<BusinessData | null> {
    // Public method - no authentication required
    return await this.businessRepository.findBySlug(slug);
  }

  async getBusinessBySlugWithServices(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    businessHours: any;
    timezone: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    primaryColor: string | null;
    isVerified: boolean;
    isClosed: boolean;
    tags: string[];
    businessType: {
      id: string;
      name: string;
      displayName: string;
      icon: string | null;
      category: string;
    };
    services: {
      id: string;
      name: string;
      description: string | null;
      duration: number;
      price: number;
      currency: string;
      isActive: boolean;
    }[];
  } | null> {
    // Public method - no authentication required
    return await this.businessRepository.findBySlugWithServices(slug);
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

  async getAllBusinessesMinimalDetails(
    page = 1,
    limit = 20
  ): Promise<{
    businesses: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      logoUrl: string | null;
      coverImageUrl: string | null;
      primaryColor: string | null;
      isVerified: boolean;
      isClosed: boolean;
      tags: string[];
      businessType: {
        id: string;
        name: string;
        displayName: string;
        icon: string | null;
        category: string;
      };
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Public method - no authentication required
    return await this.businessRepository.getAllBusinessesMinimalDetails(page, limit);
  }
}