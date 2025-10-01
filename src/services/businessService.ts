import { BusinessStaffRole, Prisma, PrismaClient } from "@prisma/client";
import { BusinessContext } from "../middleware/businessContext";
import { BusinessRepository } from "../repositories/businessRepository";
import {
  UpdateBusinessPriceSettingsSchema,
  UpdateBusinessStaffPrivacySettingsSchema,
} from "../schemas/business.schemas";
import { PermissionName } from "../types/auth";
import {
  BusinessData,
  BusinessNotificationSettingsData,
  BusinessNotificationSettingsRequest,
  BusinessSearchFilters,
  BusinessStaffPrivacySettings,
  BusinessWithDetails,
  CreateBusinessRequest,
  UpdateBusinessRequest,
} from "../types/business";
import { ValidationError } from "../types/errors";
import { logger } from "../utils/Logger/logger";
import { RBACService } from "./rbacService";
import { UsageService } from "./usageService";
import { WorkingHoursService } from "./workingHoursService";

export class BusinessService {
  private workingHoursService: WorkingHoursService;

  constructor(
    private businessRepository: BusinessRepository,
    private rbacService: RBACService,
    private prisma: PrismaClient,
    private usageService?: UsageService
  ) {
    this.workingHoursService = new WorkingHoursService(this.prisma);
  }

  async createBusiness(
    userId: string,
    data: CreateBusinessRequest
  ): Promise<BusinessData> {
    console.log("🔧 BUSINESS SERVICE: createBusiness called");
    console.log("🔧 BUSINESS SERVICE: User ID:", userId);
    console.log("🔧 BUSINESS SERVICE: Data:", data);

    // Check permissions
    await this.rbacService.requirePermission(
      userId,
      PermissionName.CREATE_BUSINESS
    );

    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.name);

    // Generate website URL automatically
    const website = `https://randevubu.com/business/${slug}`;

    // Create default business hours (Monday-Friday 9AM-6PM, weekends closed)
    const defaultBusinessHours = {
      monday: { openTime: "09:00", closeTime: "18:00", isOpen: true },
      tuesday: { openTime: "09:00", closeTime: "18:00", isOpen: true },
      wednesday: { openTime: "09:00", closeTime: "18:00", isOpen: true },
      thursday: { openTime: "09:00", closeTime: "18:00", isOpen: true },
      friday: { openTime: "09:00", closeTime: "18:00", isOpen: true },
      saturday: { openTime: "10:00", closeTime: "16:00", isOpen: false },
      sunday: { openTime: "10:00", closeTime: "16:00", isOpen: false },
    };

    // Use transaction to ensure atomicity - either both business creation and role assignment succeed, or both fail
    const business = await this.prisma.$transaction(async (tx) => {
      // Create business directly using transaction client
      const businessId = `biz_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const createdBusiness = await tx.business.create({
        data: {
          id: businessId,
          ownerId: userId,
          businessTypeId: data.businessTypeId,
          name: data.name,
          slug: slug,
          description: data.description || "",
          email: data.email,
          phone: data.phone,
          website: website,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          businessHours: defaultBusinessHours,
          timezone: data.timezone,
          primaryColor: data.primaryColor,
          galleryImages: data.galleryImages || [],
          isActive: true,
          isVerified: false,
          isClosed: false,
          tags: data.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Get the OWNER role
      const ownerRole = await tx.role.findUnique({
        where: { name: "OWNER" },
      });

      if (!ownerRole || !ownerRole.isActive) {
        throw new Error("OWNER role not found or inactive");
      }

      // Assign the role within the same transaction (upsert to handle existing roles)
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userId,
            roleId: ownerRole.id,
          },
        },
        create: {
          id: `urole_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          userId: userId,
          roleId: ownerRole.id,
          grantedBy: userId,
          grantedAt: new Date(),
          isActive: true,
          metadata: {
            businessId: businessId,
          },
        },
        update: {
          isActive: true,
          grantedBy: userId,
          grantedAt: new Date(),
          metadata: {
            businessId: businessId,
          },
          updatedAt: new Date(),
        },
      });

      // Create owner as staff member in the business
      await tx.businessStaff.create({
        data: {
          id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          businessId: businessId,
          userId: userId,
          role: BusinessStaffRole.OWNER,
          permissions: {},
          isActive: true,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
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
        profileImageUrl: createdBusiness.profileImageUrl,
        galleryImages: createdBusiness.galleryImages || [],
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
        deletedAt: createdBusiness.deletedAt,
      } as BusinessData;
    });

    // Create default working hours in the WorkingHours table (9AM-6PM, Mon-Fri)
    try {
      await this.workingHoursService.createDefaultBusinessHours(business.id);
    } catch (error) {
      logger.error("Failed to create default working hours", {
        businessId: business.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't fail business creation if working hours creation fails
    }

    // Update staff usage to count the owner
    if (this.usageService) {
      await this.usageService.updateStaffUsage(business.id);
    }

    // ENTERPRISE PATTERN: Aggressively clear all cache for this user
    // This ensures immediate consistency for role-based operations
    this.rbacService.forceInvalidateUser(userId);

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
      PermissionName.VIEW_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "view_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to view this business"
        );
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
  ): Promise<
    | (BusinessData & {
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
            features: string[];
            isPopular: boolean;
          };
        };
      })
    | null
  > {
    // Check if user has access to this business
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "view_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to view this business"
        );
      }
    }

    return await this.businessRepository.findByIdWithSubscription(businessId);
  }

  async getBusinessesByOwner(
    userId: string,
    ownerId: string
  ): Promise<BusinessData[]> {
    // Users can view their own businesses, or admins can view any
    if (userId !== ownerId) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_ALL_BUSINESSES
      );
    } else {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS
      );
    }

    return await this.businessRepository.findByOwnerId(ownerId);
  }

  async getBusinessesByStaff(userId: string): Promise<BusinessData[]> {
    // Staff can view businesses they work at
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS,
    ]);

    return await this.businessRepository.findByStaffUserId(userId);
  }

  async getMyBusinesses(userId: string): Promise<BusinessData[]> {
    let businesses: BusinessData[] = [];

    // Get businesses owned by the user (owners should have OWNER RBAC role)
    const ownedBusinesses = await this.businessRepository.findByOwnerId(userId);
    businesses.push(...ownedBusinesses);

    // Get businesses where user is staff (based on staff records, not RBAC roles)
    // Staff members are added to businessStaff table but may not have STAFF RBAC role
    const staffBusinesses = await this.businessRepository.findByStaffUserId(
      userId
    );
    businesses.push(...staffBusinesses);

    // Remove duplicates (in case user is both owner and staff of same business)
    const uniqueBusinesses = businesses.filter(
      (business, index, self) =>
        self.findIndex((b) => b.id === business.id) === index
    );

    return uniqueBusinesses;
  }

  // Enhanced method with subscription information
  async getMyBusinessesWithSubscription(userId: string): Promise<
    (BusinessData & {
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
          features: string[];
          isPopular: boolean;
        };
      };
    })[]
  > {
    let businesses: (BusinessData & { subscription?: any })[] = [];

    // Get businesses owned by the user (with subscription info)
    const ownedBusinesses =
      await this.businessRepository.findByOwnerIdWithSubscription(userId);
    businesses.push(...ownedBusinesses);

    // Get businesses where user is staff (based on staff records, not RBAC roles)
    // Staff members are added to businessStaff table but may not have STAFF RBAC role
    const staffBusinesses = await this.businessRepository.findByStaffUserId(
      userId
    );
    businesses.push(
      ...staffBusinesses.map((b) => ({ ...b, subscription: undefined }))
    );

    // Remove duplicates (in case user is both owner and staff of same business)
    // Keep the version with subscription info if available
    const uniqueBusinesses = businesses.reduce((unique, current) => {
      const existing = unique.find((b) => b.id === current.id);
      if (!existing) {
        unique.push(current);
      } else if (current.subscription && !existing.subscription) {
        // Replace with version that has subscription info
        const index = unique.findIndex((b) => b.id === current.id);
        unique[index] = current;
      }
      return unique;
    }, [] as typeof businesses);

    return uniqueBusinesses;
  }

  async getMyServices(
    userId: string,
    options: {
      businessId?: string;
      active?: boolean;
      page: number;
      limit: number;
    }
  ): Promise<{
    services: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Get user's accessible businesses
    const businesses = await this.getMyBusinesses(userId);
    const accessibleBusinessIds = businesses.map((b) => b.id);

    if (accessibleBusinessIds.length === 0) {
      throw new Error("No accessible businesses found");
    }

    let businessIds: string[] = [];

    // If specific business is requested, validate access
    if (options.businessId) {
      if (!accessibleBusinessIds.includes(options.businessId)) {
        throw new Error("Access denied to this business");
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
      limit: options.limit,
    });
  }

  async getMyBusinessStatsWithContext(
    businessContext: BusinessContext
  ): Promise<
    Record<
      string,
      {
        totalAppointments: number;
        activeServices: number;
        totalStaff: number;
        isSubscribed: boolean;
      }
    >
  > {
    if (businessContext.businessIds.length === 0) {
      throw new Error("No accessible businesses found");
    }

    return await this.businessRepository.getMultipleBusinessStats(
      businessContext.businessIds
    );
  }

  async getMyBusinessStats(
    userId: string,
    businessId?: string
  ): Promise<
    | {
        totalAppointments: number;
        activeServices: number;
        totalStaff: number;
        isSubscribed: boolean;
      }
    | Record<
        string,
        {
          totalAppointments: number;
          activeServices: number;
          totalStaff: number;
          isSubscribed: boolean;
        }
      >
  > {
    // Get user's accessible businesses
    const businesses = await this.getMyBusinesses(userId);
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      throw new Error("No accessible businesses found");
    }

    // If specific business requested, validate access and return single stats
    if (businessId) {
      if (!businessIds.includes(businessId)) {
        throw new Error("Access denied to this business");
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
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    // If name is being updated, regenerate slug and website URL
    if (data.name) {
      const slug = await this.generateUniqueSlug(data.name, businessId);
      const website = `https://randevubu.com/business/${slug}`;

      // Add slug and website to update data
      const updateData = {
        ...data,
        slug,
        website,
      };

      return await this.businessRepository.update(businessId, updateData);
    }

    return await this.businessRepository.update(businessId, data);
  }

  async updateBusinessPriceSettings(
    userId: string,
    businessId: string,
    priceSettings: UpdateBusinessPriceSettingsSchema
  ): Promise<BusinessData> {
    // Check permissions - either global or business-specific
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    // Get current business settings
    const currentBusiness = await this.businessRepository.findById(businessId);
    if (!currentBusiness) {
      throw new Error("Business not found");
    }

    // Merge price settings into existing business settings
    const currentSettings = (currentBusiness.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      priceVisibility: {
        ...currentSettings.priceVisibility,
        hideAllServicePrices:
          priceSettings.hideAllServicePrices ??
          currentSettings.priceVisibility?.hideAllServicePrices ??
          false,
        showPriceOnBooking:
          priceSettings.showPriceOnBooking ??
          currentSettings.priceVisibility?.showPriceOnBooking ??
          true,
        priceDisplayMessage:
          priceSettings.priceDisplayMessage ??
          currentSettings.priceVisibility?.priceDisplayMessage ??
          null,
      },
    };

    // Update business with new settings
    return await this.businessRepository.update(businessId, {
      settings: updatedSettings,
    });
  }

  async getBusinessPriceSettings(
    userId: string,
    businessId: string
  ): Promise<any> {
    // Check permissions - either global or business-specific
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS,
        { businessId }
      );
    }

    // Get current business settings
    const currentBusiness = await this.businessRepository.findById(businessId);
    if (!currentBusiness) {
      throw new Error("Business not found");
    }

    // Extract price visibility settings
    const settings = (currentBusiness.settings as any) || {};
    const priceVisibility = settings.priceVisibility || {};

    return {
      hideAllServicePrices: priceVisibility.hideAllServicePrices || false,
      showPriceOnBooking: priceVisibility.showPriceOnBooking || true,
      priceDisplayMessage: priceVisibility.priceDisplayMessage || null,
    };
  }

  async updateStaffPrivacySettings(
    userId: string,
    businessId: string,
    staffPrivacySettings: UpdateBusinessStaffPrivacySettingsSchema
  ): Promise<BusinessData> {
    // Check permissions - either global or business-specific
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    // Get current business settings
    const currentBusiness = await this.businessRepository.findById(businessId);
    if (!currentBusiness) {
      throw new Error("Business not found");
    }

    // Merge staff privacy settings into existing business settings
    const currentSettings = (currentBusiness.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      staffPrivacy: {
        ...currentSettings.staffPrivacy,
        hideStaffNames:
          staffPrivacySettings.hideStaffNames ??
          currentSettings.staffPrivacy?.hideStaffNames ??
          false,
        staffDisplayMode:
          staffPrivacySettings.staffDisplayMode ??
          currentSettings.staffPrivacy?.staffDisplayMode ??
          "NAMES",
        customStaffLabels: {
          owner:
            staffPrivacySettings.customStaffLabels?.owner ??
            currentSettings.staffPrivacy?.customStaffLabels?.owner ??
            "Owner",
          manager:
            staffPrivacySettings.customStaffLabels?.manager ??
            currentSettings.staffPrivacy?.customStaffLabels?.manager ??
            "Manager",
          staff:
            staffPrivacySettings.customStaffLabels?.staff ??
            currentSettings.staffPrivacy?.customStaffLabels?.staff ??
            "Staff",
          receptionist:
            staffPrivacySettings.customStaffLabels?.receptionist ??
            currentSettings.staffPrivacy?.customStaffLabels?.receptionist ??
            "Receptionist",
        },
      },
    };

    // Update business with new settings
    const updatedBusiness = await this.businessRepository.update(businessId, {
      settings: updatedSettings,
    });

    // ENTERPRISE PATTERN: Clear all cache for this user to ensure immediate consistency
    // This ensures that any cached business data is refreshed with the new settings
    this.rbacService.forceInvalidateUser(userId);

    return updatedBusiness;
  }

  async getStaffPrivacySettings(
    userId: string,
    businessId: string
  ): Promise<BusinessStaffPrivacySettings> {
    // Check permissions - either global or business-specific
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS,
        { businessId }
      );
    }

    // Get current business settings
    const currentBusiness = await this.businessRepository.findById(businessId);
    if (!currentBusiness) {
      throw new Error("Business not found");
    }

    // Extract staff privacy settings from business settings
    const settings = (currentBusiness.settings as any) || {};
    const staffPrivacy = settings.staffPrivacy || {};

    return {
      hideStaffNames: staffPrivacy.hideStaffNames || false,
      staffDisplayMode: staffPrivacy.staffDisplayMode || "NAMES",
      customStaffLabels: {
        owner: staffPrivacy.customStaffLabels?.owner || "Owner",
        manager: staffPrivacy.customStaffLabels?.manager || "Manager",
        staff: staffPrivacy.customStaffLabels?.staff || "Staff",
        receptionist:
          staffPrivacy.customStaffLabels?.receptionist || "Receptionist",
      },
    };
  }

  async deleteBusiness(userId: string, businessId: string): Promise<void> {
    // Check permissions
    const hasGlobalDelete = await this.rbacService.hasPermission(
      userId,
      "business",
      "delete_all"
    );

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

  async verifyBusiness(
    userId: string,
    businessId: string
  ): Promise<BusinessData> {
    // Only admins can verify businesses
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VERIFY_BUSINESS
    );

    return await this.businessRepository.updateVerificationStatus(
      businessId,
      true
    );
  }

  async unverifyBusiness(
    userId: string,
    businessId: string
  ): Promise<BusinessData> {
    // Only admins can unverify businesses
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VERIFY_BUSINESS
    );

    return await this.businessRepository.updateVerificationStatus(
      businessId,
      false
    );
  }

  async closeBusiness(
    userId: string,
    businessId: string,
    closedUntil?: Date,
    reason?: string
  ): Promise<BusinessData> {
    // Check permissions
    const hasGlobalClose = await this.rbacService.hasPermission(
      userId,
      "business",
      "close_all"
    );

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

  async reopenBusiness(
    userId: string,
    businessId: string
  ): Promise<BusinessData> {
    // Check permissions
    const hasGlobalReopen = await this.rbacService.hasPermission(
      userId,
      "business",
      "close_all"
    );

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
  ): Promise<
    | {
        totalAppointments: number;
        activeServices: number;
        totalStaff: number;
        isSubscribed: boolean;
      }
    | Record<
        string,
        {
          totalAppointments: number;
          activeServices: number;
          totalStaff: number;
          isSubscribed: boolean;
        }
      >
  > {
    // Get user's business context
    const businesses = await this.getMyBusinesses(userId);
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      throw new Error("No accessible businesses found");
    }

    // If specific business requested, validate access and return single stats
    if (businessId) {
      if (!businessIds.includes(businessId)) {
        throw new Error("Access denied to this business");
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
    return await this.businessRepository.findNearby(
      latitude,
      longitude,
      radiusKm,
      limit
    );
  }

  async updateBusinessHours(
    userId: string,
    businessId: string,
    businessHours: any
  ): Promise<BusinessData> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    return await this.businessRepository.updateBusinessHours(
      businessId,
      businessHours
    );
  }

  // Enhanced Business Hours Management Methods

  async getBusinessHours(
    userId: string,
    businessId: string
  ): Promise<{ businessHours: any }> {
    // Check permissions
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS,
        { businessId }
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    return { businessHours: business.businessHours };
  }

  async getBusinessHoursStatus(
    businessId: string,
    date?: string,
    timezone?: string
  ): Promise<{
    businessId: string;
    date: string;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breaks?: any[];
    nextOpenTime?: string;
    nextCloseTime?: string;
    isOverride: boolean;
    overrideReason?: string;
    timezone: string;
  }> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    const targetDate = date ? new Date(date) : new Date();
    const businessTimezone = timezone || business.timezone || "Europe/Istanbul";

    // Check for business hours override first
    const override = await this.prisma.businessHoursOverride.findUnique({
      where: {
        businessId_date: {
          businessId,
          date: targetDate,
        },
      },
    });

    if (override) {
      return {
        businessId,
        date: targetDate.toISOString().split("T")[0],
        isOpen: override.isOpen,
        openTime: override.openTime || undefined,
        closeTime: override.closeTime || undefined,
        breaks: (override.breaks as any[]) || [],
        isOverride: true,
        overrideReason: override.reason || undefined,
        timezone: businessTimezone,
      };
    }

    // Use regular business hours
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayNames[dayOfWeek];

    const businessHours = business.businessHours as any;
    const dayHours = businessHours?.[dayName];

    if (!dayHours || !dayHours.isOpen) {
      // Find next open day
      const nextOpenTime = await this.findNextOpenTime(
        business,
        targetDate,
        businessTimezone
      );

      return {
        businessId,
        date: targetDate.toISOString().split("T")[0],
        isOpen: false,
        isOverride: false,
        nextOpenTime,
        timezone: businessTimezone,
      };
    }

    return {
      businessId,
      date: targetDate.toISOString().split("T")[0],
      isOpen: true,
      openTime: dayHours.openTime,
      closeTime: dayHours.closeTime,
      breaks: dayHours.breaks || [],
      isOverride: false,
      timezone: businessTimezone,
    };
  }

  async createBusinessHoursOverride(
    userId: string,
    businessId: string,
    data: {
      date: string;
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
      breaks?: any[];
      reason?: string;
      isRecurring?: boolean;
      recurringPattern?: any;
    }
  ): Promise<any> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    const overrideId = `override_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const override = await this.prisma.businessHoursOverride.create({
      data: {
        id: overrideId,
        businessId,
        date: new Date(data.date),
        isOpen: data.isOpen,
        openTime: data.openTime,
        closeTime: data.closeTime,
        breaks: data.breaks,
        reason: data.reason,
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return override;
  }

  async updateBusinessHoursOverride(
    userId: string,
    businessId: string,
    date: string,
    data: {
      isOpen?: boolean;
      openTime?: string;
      closeTime?: string;
      breaks?: any[];
      reason?: string;
      isRecurring?: boolean;
      recurringPattern?: any;
    }
  ): Promise<any> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    const override = await this.prisma.businessHoursOverride.update({
      where: {
        businessId_date: {
          businessId,
          date: new Date(date),
        },
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return override;
  }

  async deleteBusinessHoursOverride(
    userId: string,
    businessId: string,
    date: string
  ): Promise<void> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(
      userId,
      "business",
      "edit_all"
    );

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    await this.prisma.businessHoursOverride.delete({
      where: {
        businessId_date: {
          businessId,
          date: new Date(date),
        },
      },
    });
  }

  async getBusinessHoursOverrides(
    userId: string,
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    // Check permissions
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS,
        { businessId }
      );
    }

    const where: any = { businessId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const overrides = await this.prisma.businessHoursOverride.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return overrides;
  }

  // Helper method to find next open time
  private async findNextOpenTime(
    business: BusinessData,
    fromDate: Date,
    timezone: string
  ): Promise<string | undefined> {
    const businessHours = business.businessHours as any;
    if (!businessHours) return undefined;

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() + i);

      const dayOfWeek = checkDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const dayHours = businessHours[dayName];

      if (dayHours && dayHours.isOpen && dayHours.openTime) {
        return `${checkDate.toISOString().split("T")[0]}T${
          dayHours.openTime
        }:00`;
      }
    }

    return undefined;
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
      price: number | null; // Can be null when price visibility is hidden
      currency: string;
      isActive: boolean;
      showPrice?: boolean;
      priceDisplayMessage?: string;
    }[];
  } | null> {
    // Public method - no authentication required
    const businessWithServices =
      await this.businessRepository.findBySlugWithServices(slug);

    if (!businessWithServices) {
      return null;
    }

    // Extract price visibility settings
    const settings = (businessWithServices.settings as any) || {};
    const priceVisibility = settings.priceVisibility || {};
    const hideAllServicePrices = priceVisibility.hideAllServicePrices === true;

    // Apply price visibility logic to services
    const processedServices = businessWithServices.services.map((service) => {
      if (hideAllServicePrices) {
        return {
          ...service,
          price: null, // Hide the actual price
          showPrice: false, // Add flag to indicate price is hidden
          priceDisplayMessage:
            priceVisibility.priceDisplayMessage || "Price available on request",
        };
      }

      return {
        ...service,
        showPrice: true, // Add flag to indicate price is visible
      };
    });

    return {
      ...businessWithServices,
      services: processedServices,
    };
  }

  async checkSlugAvailability(
    slug: string,
    excludeBusinessId?: string
  ): Promise<boolean> {
    return await this.businessRepository.checkSlugAvailability(
      slug,
      excludeBusinessId
    );
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
    const hasGlobalStaff = await this.rbacService.hasPermission(
      userId,
      "staff",
      "manage_all"
    );

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
      permissions,
    });
  }

  async removeStaffMember(
    userId: string,
    businessId: string,
    staffUserId: string
  ): Promise<void> {
    // Check permissions to manage staff
    const hasGlobalStaff = await this.rbacService.hasPermission(
      userId,
      "staff",
      "manage_all"
    );

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
  private async generateUniqueSlug(
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (!(await this.checkSlugAvailability(slug, excludeId))) {
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
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VIEW_ALL_BUSINESSES
    );

    const filters: BusinessSearchFilters = {};
    return await this.businessRepository.search(filters, page, limit);
  }

  async getBusinessesByType(businessTypeId: string): Promise<BusinessData[]> {
    // Public method
    return await this.businessRepository.findByBusinessTypeId(businessTypeId);
  }

  // Batch operations for admins
  async batchVerifyBusinesses(
    userId: string,
    businessIds: string[]
  ): Promise<void> {
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VERIFY_BUSINESS
    );

    for (const businessId of businessIds) {
      await this.businessRepository.updateVerificationStatus(businessId, true);
    }
  }

  async batchCloseBusinesses(
    userId: string,
    businessIds: string[],
    reason: string
  ): Promise<void> {
    await this.rbacService.requirePermission(
      userId,
      PermissionName.CLOSE_ALL_BUSINESSES
    );

    for (const businessId of businessIds) {
      await this.businessRepository.updateClosureStatus(
        businessId,
        true,
        undefined,
        reason
      );
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
    return await this.businessRepository.getAllBusinessesMinimalDetails(
      page,
      limit
    );
  }

  // Image management methods
  async uploadBusinessImage(
    userId: string,
    businessId: string,
    imageType: "logo" | "cover" | "profile" | "gallery",
    imageBuffer: Buffer,
    originalName: string,
    contentType: string
  ): Promise<{ imageUrl: string; business?: BusinessData }> {
    // Check if user is the owner of the business
    const business = await this.businessRepository.findById(businessId);

    if (!business) {
      throw new ValidationError("Business not found");
    }

    // Check permissions - user must have either global business edit permission or own this specific business
    await this.rbacService.requireAny(userId, [
      PermissionName.EDIT_ALL_BUSINESSES,
      PermissionName.EDIT_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, verify they own this business
    const hasGlobalUpdate = await this.rbacService.hasPermission(
      userId,
      "business",
      "update_all"
    );

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "edit_own",
        { businessId }
      );

      if (!hasBusinessAccess || business.ownerId !== userId) {
        throw new Error(
          "Access denied: You do not have permission to update this business"
        );
      }
    }

    // Import S3Service dynamically to avoid circular dependencies
    const { getS3Service } = await import("../utils/s3Service");
    const s3Service = getS3Service();

    try {
      // Upload image to S3
      const imageUrl = await s3Service.uploadBusinessImage(
        businessId,
        imageType,
        imageBuffer,
        originalName,
        contentType
      );

      if (imageType === "gallery") {
        // Add to gallery
        const business = await this.businessRepository.addGalleryImage(
          businessId,
          imageUrl
        );
        return { imageUrl, business };
      } else {
        // Update business image field
        const business = await this.businessRepository.updateBusinessImage(
          businessId,
          imageType,
          imageUrl
        );
        return { imageUrl, business };
      }
    } catch (error) {
      console.error("Error uploading business image:", error);
      throw new Error("Failed to upload image");
    }
  }

  async deleteBusinessImage(
    userId: string,
    businessId: string,
    imageType: "logo" | "cover" | "profile"
  ): Promise<BusinessData> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.EDIT_ALL_BUSINESSES,
      PermissionName.EDIT_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalUpdate = await this.rbacService.hasPermission(
      userId,
      "business",
      "update_all"
    );

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "update_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to update this business"
        );
      }
    }

    // Get current image URL to delete from S3
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    let currentImageUrl: string | null = null;
    switch (imageType) {
      case "logo":
        currentImageUrl = business.logoUrl || null;
        break;
      case "cover":
        currentImageUrl = business.coverImageUrl || null;
        break;
      case "profile":
        currentImageUrl = business.profileImageUrl || null;
        break;
    }

    try {
      // Delete from S3 if image exists
      if (currentImageUrl) {
        const { getS3Service } = await import("../utils/s3Service");
        const s3Service = getS3Service();
        await s3Service.deleteImageByUrl(currentImageUrl);
      }

      // Update business record
      return await this.businessRepository.deleteBusinessImage(
        businessId,
        imageType
      );
    } catch (error) {
      console.error("Error deleting business image:", error);
      throw new Error("Failed to delete image");
    }
  }

  async deleteGalleryImage(
    userId: string,
    businessId: string,
    imageUrl: string
  ): Promise<BusinessData> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.EDIT_ALL_BUSINESSES,
      PermissionName.EDIT_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalUpdate = await this.rbacService.hasPermission(
      userId,
      "business",
      "update_all"
    );

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "update_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to update this business"
        );
      }
    }

    try {
      // Delete from S3
      const { getS3Service } = await import("../utils/s3Service");
      const s3Service = getS3Service();
      await s3Service.deleteImageByUrl(imageUrl);

      // Remove from gallery
      return await this.businessRepository.removeGalleryImage(
        businessId,
        imageUrl
      );
    } catch (error) {
      console.error("Error deleting gallery image:", error);
      throw new Error("Failed to delete gallery image");
    }
  }

  async getBusinessImages(
    userId: string,
    businessId: string
  ): Promise<{
    logoUrl: string | null;
    coverImageUrl: string | null;
    profileImageUrl: string | null;
    galleryImages: string[];
  }> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "view_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to view this business"
        );
      }
    }

    return await this.businessRepository.getBusinessImages(businessId);
  }

  async updateGalleryImages(
    userId: string,
    businessId: string,
    imageUrls: string[]
  ): Promise<BusinessData> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.EDIT_ALL_BUSINESSES,
      PermissionName.EDIT_OWN_BUSINESS,
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalUpdate = await this.rbacService.hasPermission(
      userId,
      "business",
      "update_all"
    );

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "update_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to update this business"
        );
      }
    }

    return await this.businessRepository.updateGalleryImages(
      businessId,
      imageUrls
    );
  }

  // Business Notification Settings Methods

  async getBusinessNotificationSettings(
    userId: string,
    businessId: string
  ): Promise<BusinessNotificationSettingsData | null> {
    // Check permissions
    const hasGlobalView = await this.rbacService.hasPermission(
      userId,
      "business",
      "view_all"
    );

    if (!hasGlobalView) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        "business",
        "view_own",
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error(
          "Access denied: You do not have permission to view this business settings"
        );
      }
    }

    const settings = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId },
    });

    if (!settings) return null;

    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: JSON.parse(settings.reminderChannels as string),
      reminderTiming: JSON.parse(settings.reminderTiming as string),
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: settings.quietHours
        ? JSON.parse(settings.quietHours as string)
        : undefined,
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updateBusinessNotificationSettings(
    userId: string,
    businessId: string,
    data: BusinessNotificationSettingsRequest
  ): Promise<BusinessNotificationSettingsData> {
    // Check permissions - use specific business notification permissions
    const hasGlobalNotificationEdit = await this.rbacService.hasPermission(
      userId,
      "business_notification",
      "edit_all"
    );

    if (!hasGlobalNotificationEdit) {
      const hasOwnNotificationEdit = await this.rbacService.hasPermission(
        userId,
        "business_notification",
        "edit_own",
        { businessId }
      );

      if (!hasOwnNotificationEdit) {
        throw new Error(
          "Access denied: You do not have permission to update this business settings"
        );
      }
    }

    // Verify business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new ValidationError("Business not found");
    }

    // Get current settings for smart validation
    const currentSettings = await this.getBusinessNotificationSettings(
      userId,
      businessId
    );

    // Merge with incoming updates for smart validation
    const mergedSettings = {
      ...currentSettings,
      ...data,
    };

    // Smart validation: Auto-sync reminder channels with enabled channels
    const enabledChannels: string[] = [];
    if (mergedSettings.smsEnabled) enabledChannels.push("SMS");
    if (mergedSettings.pushEnabled) enabledChannels.push("PUSH");
    if (mergedSettings.emailEnabled) enabledChannels.push("EMAIL");

    // Auto-sync: ensure all enabled channels are in reminderChannels
    const syncedReminderChannels = [
      ...new Set([
        ...(mergedSettings.reminderChannels || []),
        ...enabledChannels,
      ]),
    ];

    // Remove disabled channels from reminderChannels
    const finalReminderChannels = syncedReminderChannels.filter((channel) => {
      switch (channel) {
        case "SMS":
          return mergedSettings.smsEnabled;
        case "PUSH":
          return mergedSettings.pushEnabled;
        case "EMAIL":
          return mergedSettings.emailEnabled;
        default:
          return true;
      }
    });

    // Use the synced reminder channels
    const validatedData = {
      ...data,
      reminderChannels: finalReminderChannels,
    };

    // Prepare update data
    const updateData: any = {};

    if (validatedData.enableAppointmentReminders !== undefined) {
      updateData.enableAppointmentReminders =
        validatedData.enableAppointmentReminders;
    }

    if (validatedData.reminderChannels !== undefined) {
      updateData.reminderChannels = JSON.stringify(
        validatedData.reminderChannels
      );
    }

    if (validatedData.reminderTiming !== undefined) {
      updateData.reminderTiming = JSON.stringify(validatedData.reminderTiming);
    }

    if (validatedData.smsEnabled !== undefined) {
      updateData.smsEnabled = validatedData.smsEnabled;
    }

    if (validatedData.pushEnabled !== undefined) {
      updateData.pushEnabled = validatedData.pushEnabled;
    }

    if (validatedData.emailEnabled !== undefined) {
      updateData.emailEnabled = validatedData.emailEnabled;
    }

    // Handle quietHours field presence/absence logic
    if ("quietHours" in data) {
      // quietHours field is present in request - use the provided object
      updateData.quietHours = validatedData.quietHours
        ? JSON.stringify(validatedData.quietHours)
        : Prisma.DbNull;
    } else {
      // quietHours field is absent from request - set to null to disable
      updateData.quietHours = Prisma.DbNull;
    }

    if (validatedData.timezone !== undefined) {
      updateData.timezone = validatedData.timezone;
    }

    // Upsert notification settings
    const settingsId = `bns_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const settings = await this.prisma.businessNotificationSettings.upsert({
      where: { businessId },
      create: {
        id: settingsId,
        businessId,
        enableAppointmentReminders:
          validatedData.enableAppointmentReminders ?? true,
        reminderChannels: JSON.stringify(
          validatedData.reminderChannels ?? ["PUSH"]
        ),
        reminderTiming: JSON.stringify(
          validatedData.reminderTiming ?? [60, 1440]
        ),
        smsEnabled: validatedData.smsEnabled ?? false,
        pushEnabled: validatedData.pushEnabled ?? true,
        emailEnabled: validatedData.emailEnabled ?? false,
        quietHours:
          "quietHours" in data
            ? validatedData.quietHours
              ? JSON.stringify(validatedData.quietHours)
              : Prisma.DbNull
            : Prisma.DbNull,
        timezone:
          validatedData.timezone ?? business.timezone ?? "Europe/Istanbul",
      },
      update: updateData,
    });

    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: JSON.parse(settings.reminderChannels as string),
      reminderTiming: JSON.parse(settings.reminderTiming as string),
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: settings.quietHours
        ? JSON.parse(settings.quietHours as string)
        : undefined,
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async getOrCreateBusinessNotificationSettings(
    businessId: string
  ): Promise<BusinessNotificationSettingsData> {
    // This method is used internally by other services
    let settings = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId },
    });

    if (!settings) {
      // Get business timezone for defaults
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { timezone: true },
      });

      const settingsId = `bns_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      // Create default settings
      settings = await this.prisma.businessNotificationSettings.create({
        data: {
          id: settingsId,
          businessId,
          enableAppointmentReminders: true,
          reminderChannels: JSON.stringify(["PUSH"]),
          reminderTiming: JSON.stringify([60, 1440]), // 1 hour and 24 hours
          smsEnabled: false,
          pushEnabled: true,
          emailEnabled: false,
          timezone: business?.timezone ?? "Europe/Istanbul",
        },
      });
    }

    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: JSON.parse(settings.reminderChannels as string),
      reminderTiming: JSON.parse(settings.reminderTiming as string),
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: settings.quietHours
        ? JSON.parse(settings.quietHours as string)
        : undefined,
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
