import {
  BusinessData,
  BusinessWithDetails,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessSearchFilters,
  BusinessNotificationSettingsData,
  BusinessNotificationSettingsRequest,
  BusinessStaffPrivacySettings,
  BusinessStaffPrivacySettingsRequest,
  ServiceData,
  BusinessSubscriptionData,
  BusinessHours,
  BreakPeriod,
  RecurringPattern,
  NotificationChannel
} from '../../../types/business';
import { UpdateBusinessPriceSettingsSchema, UpdateBusinessStaffPrivacySettingsSchema, updateBusinessCancellationPolicySchema } from '../../../schemas/business.schemas';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { RBACService } from '../rbac/rbacService';
import { PermissionName } from '../../../types/auth';
import { BusinessContext } from '../../../middleware/businessContext';
import { BusinessStaffRole, AuditAction } from '@prisma/client';
import { ValidationError, ForbiddenError } from '../../../types/errors';
import { UsageService } from '../usage/usageService';
import { RepositoryContainer } from '../../../repositories';
import { CancellationPolicyService } from './cancellationPolicyService';
import { CustomerManagementService } from './customerManagementService';
import { CancellationPolicySettings } from '../../../types/businessSettings';
import { CustomerPolicyStatus } from '../../../types/cancellationPolicy';
import { CustomerManagementSettings, CustomerNote, CustomerEvaluation, CustomerLoyaltyStatus } from '../../../types/customerManagement';
import logger from "../../../utils/Logger/logger";
export class BusinessService {
  private cancellationPolicyService: CancellationPolicyService;
  private customerManagementService: CustomerManagementService;

  constructor(
    private businessRepository: BusinessRepository,
    private rbacService: RBACService,
    private repositories: RepositoryContainer,
    private usageService?: UsageService
  ) {
    this.cancellationPolicyService = new CancellationPolicyService(
      this.repositories.userBehaviorRepository,
      this.businessRepository
    );
    this.customerManagementService = new CustomerManagementService(
      this.businessRepository,
      this.repositories.userBehaviorRepository,
      this.repositories.prismaClient
    );
  }

  async createBusiness(
    userId: string,
    data: CreateBusinessRequest
  ): Promise<BusinessData> {
    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      logger.info('🔧 BUSINESS SERVICE: createBusiness called');
      logger.info('🔧 BUSINESS SERVICE: User ID:', userId);
      logger.info('🔧 BUSINESS SERVICE: Data:', data);
    }

    // Check permissions
    await this.rbacService.requirePermission(userId, PermissionName.CREATE_BUSINESS);

    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.name);

    // Generate website URL automatically
    const website = `https://randevubu.com/business/${slug}`;

    // Create default business hours (Monday-Friday 9AM-6PM, weekends closed)
    const defaultBusinessHours = {
      monday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
      tuesday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
      wednesday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
      thursday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
      friday: { openTime: '09:00', closeTime: '18:00', isOpen: true },
      saturday: { openTime: '10:00', closeTime: '16:00', isOpen: false },
      sunday: { openTime: '10:00', closeTime: '16:00', isOpen: false }
    };

    // Debug logging for business hours
    if (process.env.NODE_ENV === 'development') {
      logger.info('🔧 BUSINESS SERVICE: Default business hours created:', JSON.stringify(defaultBusinessHours, null, 2));
    }

    // Use repository method that handles transaction and role assignment
    const business = await this.businessRepository.createWithRoleAssignment({
      ...data,
      ownerId: userId,
      slug: slug,
      website: website,
      businessHours: defaultBusinessHours
    });

    // Populate workingHours table for booking availability
    // Map day names to day of week numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMapping: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    // Create working hours records for each day that is open
    for (const [day, hours] of Object.entries(defaultBusinessHours)) {
      if (hours.isOpen) {
        await this.repositories.appointmentRepository.createWorkingHours({
          businessId: business.id,
          dayOfWeek: dayMapping[day],
          startTime: hours.openTime,
          endTime: hours.closeTime,
          isActive: true
        });
      }
    }

    if (process.env.NODE_ENV === 'development') {
      logger.info('🔧 BUSINESS SERVICE: Working hours populated for business:', business.id);
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
      // Map the subscription data to match BusinessSubscriptionData interface
      const mappedBusinesses = ownedBusinesses.map(business => ({
        ...business,
        subscription: business.subscription ? {
          id: business.subscription.id,
          businessId: business.id,
          planId: business.subscription.plan.id,
          status: business.subscription.status as string,
          currentPeriodStart: business.subscription.currentPeriodStart,
          currentPeriodEnd: business.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: business.subscription.cancelAtPeriodEnd,
          autoRenewal: true, // Default value
          failedPaymentCount: 0, // Default value
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined
      }));
      businesses.push(...mappedBusinesses);
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
    services: ServiceData[];
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

    // If name is being updated, regenerate slug and website URL
    if (data.name) {
      const slug = await this.generateUniqueSlug(data.name, businessId);
      const website = `https://randevubu.com/business/${slug}`;

      // Add slug and website to update data
      const updateData = {
        ...data,
        slug,
        website
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
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');

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
      throw new Error('Business not found');
    }

    // Merge price settings into existing business settings
    const currentSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const currentPriceVisibility = (currentSettings.priceVisibility as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      priceVisibility: {
        ...currentPriceVisibility,
        hideAllServicePrices: priceSettings.hideAllServicePrices ?? currentPriceVisibility.hideAllServicePrices ?? false,
        showPriceOnBooking: priceSettings.showPriceOnBooking ?? currentPriceVisibility.showPriceOnBooking ?? true,
        priceDisplayMessage: priceSettings.priceDisplayMessage ?? currentPriceVisibility.priceDisplayMessage ?? null
      }
    };

    // Update business with new settings
    return await this.businessRepository.update(businessId, {
      settings: updatedSettings
    });
  }

  async getBusinessPriceSettings(
    userId: string,
    businessId: string
  ): Promise<any> {
    // Check permissions - either global or business-specific
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');

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
      throw new Error('Business not found');
    }

    // Extract price visibility settings
    const settings = (currentBusiness.settings as Record<string, unknown>) || {};
    const priceVisibility = (settings.priceVisibility as Record<string, unknown>) || {};

    return {
      hideAllServicePrices: priceVisibility.hideAllServicePrices || false,
      showPriceOnBooking: priceVisibility.showPriceOnBooking || true,
      priceDisplayMessage: priceVisibility.priceDisplayMessage || null
    };
  }

  async updateStaffPrivacySettings(
    userId: string,
    businessId: string,
    staffPrivacySettings: UpdateBusinessStaffPrivacySettingsSchema
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

    // Get current business settings
    const currentBusiness = await this.businessRepository.findById(businessId);
    if (!currentBusiness) {
      throw new Error('Business not found');
    }

    // Merge staff privacy settings into existing business settings
    const currentSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const currentStaffPrivacy = (currentSettings.staffPrivacy as Record<string, unknown>) || {};
    const currentCustomStaffLabels = (currentStaffPrivacy.customStaffLabels as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      staffPrivacy: {
        ...currentStaffPrivacy,
        hideStaffNames: staffPrivacySettings.hideStaffNames ?? currentStaffPrivacy.hideStaffNames ?? false,
        staffDisplayMode: staffPrivacySettings.staffDisplayMode ?? currentStaffPrivacy.staffDisplayMode ?? 'NAMES',
        customStaffLabels: {
          owner: staffPrivacySettings.customStaffLabels?.owner ?? currentCustomStaffLabels.owner ?? 'Owner',
          manager: staffPrivacySettings.customStaffLabels?.manager ?? currentCustomStaffLabels.manager ?? 'Manager',
          staff: staffPrivacySettings.customStaffLabels?.staff ?? currentCustomStaffLabels.staff ?? 'Staff',
          receptionist: staffPrivacySettings.customStaffLabels?.receptionist ?? currentCustomStaffLabels.receptionist ?? 'Receptionist',
        }
      }
    };

    // Update business with new settings
    const updatedBusiness = await this.businessRepository.update(businessId, {
      settings: updatedSettings
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
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');

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
      throw new Error('Business not found');
    }

    // Extract staff privacy settings from business settings
    const settings = (currentBusiness.settings as Record<string, unknown>) || {};
    const staffPrivacy = (settings.staffPrivacy as Record<string, unknown>) || {};
    const customStaffLabels = (staffPrivacy.customStaffLabels as Record<string, unknown>) || {};

    return {
      hideStaffNames: (staffPrivacy.hideStaffNames as boolean) || false,
      staffDisplayMode: (staffPrivacy.staffDisplayMode as 'NAMES' | 'ROLES' | 'GENERIC') || 'NAMES',
      customStaffLabels: {
        owner: (customStaffLabels.owner as string) || 'Owner',
        manager: (customStaffLabels.manager as string) || 'Manager',
        staff: (customStaffLabels.staff as string) || 'Staff',
        receptionist: (customStaffLabels.receptionist as string) || 'Receptionist',
      }
    };
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
    businessHours: BusinessHours
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

  // Enhanced Business Hours Management Methods

  async getBusinessHours(
    userId: string,
    businessId: string
  ): Promise<{ businessHours: BusinessHours }> {
    // Check permissions
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS,
        { businessId }
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    return { businessHours: business.businessHours || {} as BusinessHours };
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
    breaks?: BreakPeriod[];
    nextOpenTime?: string;
    nextCloseTime?: string;
    isOverride: boolean;
    overrideReason?: string;
    timezone: string;
  }> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const targetDate = date ? new Date(date) : new Date();
    const businessTimezone = timezone || business.timezone || 'Europe/Istanbul';

    // Check for business hours override first
    const override = await this.repositories.businessRepository.findBusinessHoursOverride(businessId, targetDate.toISOString().split('T')[0]);

    if (override) {
      return {
        businessId,
        date: targetDate.toISOString().split('T')[0],
        isOpen: override.isOpen,
        openTime: override.openTime || undefined,
        closeTime: override.closeTime || undefined,
        breaks: (override.breaks as BreakPeriod[]) || [],
        isOverride: true,
        overrideReason: override.reason || undefined,
        timezone: businessTimezone
      };
    }

    // Use regular business hours
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const businessHours = business.businessHours as Record<string, unknown>;
    const dayHours = (businessHours?.[dayName] as Record<string, unknown>) || {};

    if (!dayHours || !dayHours.isOpen) {
      // Find next open day
      const nextOpenTime = await this.findNextOpenTime(business, targetDate, businessTimezone);

      return {
        businessId,
        date: targetDate.toISOString().split('T')[0],
        isOpen: false,
        isOverride: false,
        nextOpenTime,
        timezone: businessTimezone
      };
    }

    return {
      businessId,
      date: targetDate.toISOString().split('T')[0],
      isOpen: true,
      openTime: dayHours.openTime as string,
      closeTime: dayHours.closeTime as string,
      breaks: (dayHours.breaks as BreakPeriod[]) || [],
      isOverride: false,
      timezone: businessTimezone
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
      breaks?: BreakPeriod[];
      reason?: string;
      isRecurring?: boolean;
      recurringPattern?: Record<string, unknown>;
    }
  ): Promise<any> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    const override = await this.repositories.businessRepository.createBusinessHoursOverride({
      businessId,
      date: new Date(data.date),
      isOpen: data.isOpen,
      openTime: data.openTime,
      closeTime: data.closeTime,
      breaks: data.breaks,
      reason: data.reason,
      isRecurring: data.isRecurring || false,
      recurringPattern: data.recurringPattern ? {
        frequency: ((data.recurringPattern as Record<string, unknown>).frequency as 'WEEKLY' | 'MONTHLY' | 'YEARLY') || 'WEEKLY',
        interval: (data.recurringPattern as Record<string, unknown>).interval as number || 1,
        endDate: (data.recurringPattern as Record<string, unknown>).endDate as string
      } : undefined
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
      breaks?: BreakPeriod[];
      reason?: string;
      isRecurring?: boolean;
      recurringPattern?: Record<string, unknown>;
    }
  ): Promise<any> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    const updateData: {
      isOpen?: boolean;
      openTime?: string;
      closeTime?: string;
      breaks?: BreakPeriod[];
      reason?: string;
      isRecurring?: boolean;
      recurringPattern?: RecurringPattern;
    } = {
      ...data,
      recurringPattern: data.recurringPattern ? {
        frequency: ((data.recurringPattern as Record<string, unknown>).frequency as 'WEEKLY' | 'MONTHLY' | 'YEARLY') || 'WEEKLY',
        interval: (data.recurringPattern as Record<string, unknown>).interval as number || 1,
        endDate: (data.recurringPattern as Record<string, unknown>).endDate as string
      } : undefined
    };

    const override = await this.repositories.businessRepository.updateBusinessHoursOverride(
      businessId,
      new Date(date),
      updateData
    );

    return override;
  }

  async deleteBusinessHoursOverride(
    userId: string,
    businessId: string,
    date: string
  ): Promise<void> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    await this.repositories.businessRepository.deleteBusinessHoursOverride(businessId, new Date(date));
  }

  async getBusinessHoursOverrides(
    userId: string,
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    // Check permissions
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_BUSINESS,
        { businessId }
      );
    }

    const where: { businessId: string; date?: { gte: Date; lte: Date } } = { businessId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const overrides = await this.repositories.businessRepository.findBusinessHoursOverrides(
      businessId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return overrides;
  }

  // Helper method to find next open time
  private async findNextOpenTime(
    business: BusinessData,
    fromDate: Date,
    timezone: string
  ): Promise<string | undefined> {
    const businessHours = business.businessHours as Record<string, unknown>;
    if (!businessHours) return undefined;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() + i);

      const dayOfWeek = checkDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const dayHours = (businessHours[dayName] as Record<string, unknown>) || {};

      if (dayHours && dayHours.isOpen && dayHours.openTime) {
        return `${checkDate.toISOString().split('T')[0]}T${dayHours.openTime as string}:00`;
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
    businessHours: Record<string, unknown>;
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
    reservationSettings: {
      maxAdvanceBookingDays: number;
      minNotificationHours: number;
      maxDailyAppointments: number;
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
    const businessWithServices = await this.businessRepository.findBySlugWithServices(slug);

    if (!businessWithServices) {
      return null;
    }

    // Extract price visibility settings
    const settings = (businessWithServices.settings as Record<string, unknown>) || {};
    const priceVisibility = (settings.priceVisibility as Record<string, unknown>) || {};
    const hideAllServicePrices = priceVisibility.hideAllServicePrices === true;

    // Extract reservation settings with defaults
    const reservationSettings = (settings.reservationSettings as Record<string, unknown>) || {};
    const maxAdvanceBookingDays = (reservationSettings.maxAdvanceBookingDays as number) || 30;
    const minNotificationHours = (reservationSettings.minNotificationHours as number) || 2;
    const maxDailyAppointments = (reservationSettings.maxDailyAppointments as number) || 50;

    // Apply price visibility logic to services
    const processedServices = businessWithServices.services.map(service => {
      if (hideAllServicePrices) {
        return {
          ...service,
          price: null, // Hide the actual price
          showPrice: false, // Add flag to indicate price is hidden
          priceDisplayMessage: (priceVisibility.priceDisplayMessage as string) || 'Price available on request'
        };
      }

      return {
        ...service,
        showPrice: true // Add flag to indicate price is visible
      };
    });

    return {
      ...businessWithServices,
      reservationSettings: {
        maxAdvanceBookingDays,
        minNotificationHours,
        maxDailyAppointments
      },
      services: processedServices
    };
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
    permissions?: Record<string, boolean>
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
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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

  // Image management methods
  async uploadBusinessImage(
    userId: string,
    businessId: string,
    imageType: 'logo' | 'cover' | 'profile' | 'gallery',
    imageBuffer: Buffer,
    originalName: string,
    contentType: string
  ): Promise<{ imageUrl: string; business?: BusinessData }> {
    // Check if user is the owner of the business
    const business = await this.businessRepository.findById(businessId);

    if (!business) {
      throw new ValidationError('Business not found');
    }

    // Check permissions - user must have either global business edit permission or own this specific business
    await this.rbacService.requireAny(userId, [
      PermissionName.EDIT_ALL_BUSINESSES,
      PermissionName.EDIT_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, verify they own this business
    const hasGlobalUpdate = await this.rbacService.hasPermission(userId, 'business', 'update_all');

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        'business',
        'edit_own',
        { businessId }
      );

      if (!hasBusinessAccess || business.ownerId !== userId) {
        throw new Error('Access denied: You do not have permission to update this business');
      }
    }

    // Import ImageStorageService dynamically to avoid circular dependencies
    const { getImageStorageService } = await import('../storage/imageStorageService');
    const imageStorageService = getImageStorageService();

    try {
      // Upload image to S3
      const uploadResult = await imageStorageService.uploadBusinessImage(
        businessId,
        imageType,
        imageBuffer,
        originalName,
        contentType,
        {
          generatePresignedUrl: false, // We'll use the public URL
        }
      );

      const imageUrl = uploadResult.publicUrl;

      if (imageType === 'gallery') {
        // Add to gallery
        const business = await this.businessRepository.addGalleryImage(businessId, imageUrl);
        return { imageUrl, business };
      } else {
        // Update business image field
        const business = await this.businessRepository.updateBusinessImage(businessId, imageType, imageUrl);
        return { imageUrl, business };
      }
    } catch (error) {
      logger.error('Error uploading business image:', error);
      throw new Error('Failed to upload image');
    }
  }

  async deleteBusinessImage(
    userId: string,
    businessId: string,
    imageType: 'logo' | 'cover' | 'profile'
  ): Promise<BusinessData> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.EDIT_ALL_BUSINESSES,
      PermissionName.EDIT_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalUpdate = await this.rbacService.hasPermission(userId, 'business', 'update_all');

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        'business',
        'update_own',
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error('Access denied: You do not have permission to update this business');
      }
    }

    // Get current image URL to delete from S3
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    let currentImageUrl: string | null = null;
    switch (imageType) {
      case 'logo':
        currentImageUrl = business.logoUrl || null;
        break;
      case 'cover':
        currentImageUrl = business.coverImageUrl || null;
        break;
      case 'profile':
        currentImageUrl = business.profileImageUrl || null;
        break;
    }

    try {
      // Delete from S3 if image exists
      if (currentImageUrl) {
        const { getImageStorageService } = await import('../storage/imageStorageService');
        const imageStorageService = getImageStorageService();
        await imageStorageService.deleteBusinessImageByUrl(currentImageUrl);
      }

      // Update business record
      return await this.businessRepository.deleteBusinessImage(businessId, imageType);
    } catch (error) {
      logger.error('Error deleting business image:', error);
      throw new Error('Failed to delete image');
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
      PermissionName.EDIT_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalUpdate = await this.rbacService.hasPermission(userId, 'business', 'update_all');

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        'business',
        'update_own',
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error('Access denied: You do not have permission to update this business');
      }
    }

    try {
      // Delete from S3
      const { getImageStorageService } = await import('../storage/imageStorageService');
      const imageStorageService = getImageStorageService();
      await imageStorageService.deleteBusinessImageByUrl(imageUrl);

      // Remove from gallery
      return await this.businessRepository.removeGalleryImage(businessId, imageUrl);
    } catch (error) {
      logger.error('Error deleting gallery image:', error);
      throw new Error('Failed to delete gallery image');
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
      PermissionName.EDIT_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalUpdate = await this.rbacService.hasPermission(userId, 'business', 'update_all');

    if (!hasGlobalUpdate) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        'business',
        'update_own',
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error('Access denied: You do not have permission to update this business');
      }
    }

    return await this.businessRepository.updateGalleryImages(businessId, imageUrls);
  }

  // Business Notification Settings Methods

  async getBusinessNotificationSettings(
    userId: string,
    businessId: string
  ): Promise<BusinessNotificationSettingsData | null> {
    // Check permissions
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');

    if (!hasGlobalView) {
      const hasBusinessAccess = await this.rbacService.hasPermission(
        userId,
        'business',
        'view_own',
        { businessId }
      );

      if (!hasBusinessAccess) {
        throw new Error('Access denied: You do not have permission to view this business settings');
      }
    }

    const settings = await this.repositories.businessRepository.findBusinessNotificationSettings(businessId);

    if (!settings) return null;

    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: settings.reminderChannels as NotificationChannel[],
      reminderTiming: settings.reminderTiming as number[],
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: settings.quietHours as { start: string; end: string } | undefined,
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  }

  async updateBusinessNotificationSettings(
    userId: string,
    businessId: string,
    data: BusinessNotificationSettingsRequest
  ): Promise<BusinessNotificationSettingsData> {
    // Check permissions - use specific business notification permissions
    const hasGlobalNotificationEdit = await this.rbacService.hasPermission(userId, 'business_notification', 'edit_all');

    if (!hasGlobalNotificationEdit) {
      const hasOwnNotificationEdit = await this.rbacService.hasPermission(
        userId,
        'business_notification',
        'edit_own',
        { businessId }
      );

      if (!hasOwnNotificationEdit) {
        throw new Error('Access denied: You do not have permission to update this business settings');
      }
    }

    // Verify business exists
    const business = await this.repositories.businessRepository.findById(businessId);

    if (!business) {
      throw new ValidationError('Business not found');
    }

    // Get current settings for smart validation
    const currentSettings = await this.getBusinessNotificationSettings(userId, businessId);

    // Merge with incoming updates for smart validation
    const mergedSettings = {
      ...currentSettings,
      ...data
    };

    // Smart validation: Auto-sync reminder channels with enabled channels
    const enabledChannels: string[] = [];
    if (mergedSettings.smsEnabled) enabledChannels.push('SMS');
    if (mergedSettings.pushEnabled) enabledChannels.push('PUSH');
    if (mergedSettings.emailEnabled) enabledChannels.push('EMAIL');

    // Auto-sync: ensure all enabled channels are in reminderChannels
    const syncedReminderChannels = [...new Set([
      ...(mergedSettings.reminderChannels || []),
      ...enabledChannels
    ])];

    // Remove disabled channels from reminderChannels
    const finalReminderChannels = syncedReminderChannels.filter(channel => {
      switch (channel) {
        case 'SMS': return mergedSettings.smsEnabled;
        case 'PUSH': return mergedSettings.pushEnabled;
        case 'EMAIL': return mergedSettings.emailEnabled;
        default: return true;
      }
    });

    // Use the synced reminder channels
    const validatedData = {
      ...data,
      reminderChannels: finalReminderChannels
    };

    // Prepare update data
    const updateData: Partial<BusinessNotificationSettingsData> = {};

    if (validatedData.enableAppointmentReminders !== undefined) {
      updateData.enableAppointmentReminders = validatedData.enableAppointmentReminders;
    }

    if (validatedData.reminderChannels !== undefined) {
      updateData.reminderChannels = validatedData.reminderChannels as NotificationChannel[];
    }

    if (validatedData.reminderTiming !== undefined) {
      updateData.reminderTiming = validatedData.reminderTiming;
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

    if (validatedData.quietHours !== undefined) {
      updateData.quietHours = validatedData.quietHours;
    }

    if (validatedData.timezone !== undefined) {
      updateData.timezone = validatedData.timezone;
    }

    // Upsert notification settings
    const settings = await this.repositories.businessRepository.upsertBusinessNotificationSettings(businessId, {
      id: `bns_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      businessId: businessId,
      enableAppointmentReminders: validatedData.enableAppointmentReminders ?? true,
      reminderChannels: (validatedData.reminderChannels ?? ['PUSH']) as NotificationChannel[],
      reminderTiming: validatedData.reminderTiming ?? [60, 1440],
      smsEnabled: validatedData.smsEnabled ?? false,
      pushEnabled: validatedData.pushEnabled ?? true,
      emailEnabled: validatedData.emailEnabled ?? false,
      quietHours: validatedData.quietHours,
      timezone: validatedData.timezone ?? business.timezone ?? 'Europe/Istanbul',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: settings.reminderChannels as NotificationChannel[],
      reminderTiming: settings.reminderTiming as number[],
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: settings.quietHours as { start: string; end: string } | undefined,
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  }

  async getOrCreateBusinessNotificationSettings(
    businessId: string
  ): Promise<BusinessNotificationSettingsData> {
    // This method is used internally by other services
    let settings = await this.repositories.businessRepository.findBusinessNotificationSettings(businessId);

    if (!settings) {
      // Get business timezone for defaults
      const business = await this.repositories.businessRepository.findById(businessId);

      const settingsId = `bns_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // Create default settings
      settings = await this.repositories.businessRepository.upsertBusinessNotificationSettings(businessId, {
        id: `bns_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: businessId,
        enableAppointmentReminders: true,
        reminderChannels: ['PUSH'] as NotificationChannel[],
        reminderTiming: [60, 1440], // 1 hour and 24 hours
        smsEnabled: false,
        pushEnabled: true,
        emailEnabled: false,
        timezone: business?.timezone ?? 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: settings.reminderChannels as NotificationChannel[],
      reminderTiming: settings.reminderTiming as number[],
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: settings.quietHours as { start: string; end: string } | undefined,
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };
  }

  /**
   * Get stored payment methods for a business
   */
  async getPaymentMethods(businessId: string, userId: string): Promise<any[]> {
    // Verify user has access to this business
    const business = await this.repositories.businessRepository.findById(businessId);

    if (!business) {
      throw new Error('Business not found or access denied');
    }

    // Get stored payment methods for the business
    const paymentMethods = await this.repositories.businessRepository.findStoredPaymentMethods(businessId);

    return paymentMethods;
  }

  /**
   * Add a new payment method for a business
   */
  async addPaymentMethod(businessId: string, userId: string, paymentData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Verify user has access to this business
    const business = await this.repositories.businessRepository.findById(businessId);

    if (!business) {
      throw new Error('Business not found or access denied');
    }

    // Extract payment method data
    const { cardHolderName, cardNumber, expireMonth, expireYear, cvc, isDefault = false } = paymentData as {
      cardHolderName: string;
      cardNumber: string;
      expireMonth: number;
      expireYear: number;
      cvc: string;
      isDefault?: boolean;
    };

    // Validate required fields
    if (!cardHolderName || !cardNumber || !expireMonth || !expireYear || !cvc) {
      throw new Error('Missing required payment method fields');
    }

    // Get last 4 digits and detect card brand
    const lastFourDigits = (cardNumber as string).slice(-4);
    const cardBrand = this.detectCardBrand(cardNumber as string);

    // Generate a unique ID for the payment method
    const paymentMethodId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If this is set as default, unset other default payment methods
    if (isDefault) {
      await this.repositories.businessRepository.updateStoredPaymentMethodsDefault(businessId);
    }

    // Create the stored payment method
    const storedPaymentMethod = await this.repositories.businessRepository.createStoredPaymentMethod({
      businessId: businessId,
      cardHolderName: cardHolderName as string,
      lastFourDigits: lastFourDigits,
      cardBrand: cardBrand,
      isDefault: isDefault as boolean
    });

    return storedPaymentMethod as unknown as Record<string, unknown>;
  }

  /**
   * Detect card brand from card number
   */
  private detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s+/g, '');

    if (number.startsWith('4')) {
      return 'VISA';
    } else if (number.startsWith('5') || (number.length >= 2 && parseInt(number.substring(0, 2)) >= 51 && parseInt(number.substring(0, 2)) <= 55)) {
      return 'MASTERCARD';
    } else if (number.startsWith('34') || number.startsWith('37')) {
      return 'AMEX';
    } else if (number.startsWith('6011') || number.startsWith('65')) {
      return 'DISCOVER';
    }

    return 'UNKNOWN';
  }

  // Audit logging methods
  async logAuditEvent(data: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.repositories.auditLogRepository.create({
      userId: data.userId,
      action: data.action as AuditAction,
      entity: data.entity,
      entityId: data.entityId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  async findRecentAuditEvents(userId: string, entity: string, minutes: number): Promise<any[]> {
    // Use the existing findByUserId method and filter by entity and time
    const logs = await this.repositories.auditLogRepository.findByUserId(userId, 100, 0);
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    return logs.filter(log =>
      log.entity === entity &&
      new Date(log.createdAt) >= cutoffTime
    );
  }

  // Business Reservation Settings Methods

  async getBusinessReservationSettings(userId: string, businessId: string): Promise<any> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Get reservation settings from business settings JSON
    const settings = (business.settings as Record<string, unknown>) || {};
    const reservationSettings = (settings.reservationSettings as Record<string, unknown>) || {};

    if (Object.keys(reservationSettings).length === 0) {
      return null; // No settings configured yet
    }

    return {
      businessId,
      maxAdvanceBookingDays: reservationSettings.maxAdvanceBookingDays || 30,
      minNotificationHours: reservationSettings.minNotificationHours || 2,
      maxDailyAppointments: reservationSettings.maxDailyAppointments || 50,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt
    };
  }

  async updateBusinessReservationSettings(
    userId: string,
    businessId: string,
    settingsData: any
  ): Promise<any> {
    // Check permissions
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, 'business', 'edit_all');

    if (!hasGlobalEdit) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.EDIT_OWN_BUSINESS,
        { businessId }
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Merge reservation settings into existing business settings
    const currentSettings = (business.settings as Record<string, unknown>) || {};
    const currentReservationSettings = (currentSettings.reservationSettings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      reservationSettings: {
        maxAdvanceBookingDays: settingsData.maxAdvanceBookingDays ?? currentReservationSettings.maxAdvanceBookingDays ?? 30,
        minNotificationHours: settingsData.minNotificationHours ?? currentReservationSettings.minNotificationHours ?? 2,
        maxDailyAppointments: settingsData.maxDailyAppointments ?? currentReservationSettings.maxDailyAppointments ?? 50
      }
    };

    // Update business with new settings
    const updatedBusiness = await this.businessRepository.update(businessId, {
      settings: updatedSettings
    });

    return {
      businessId,
      maxAdvanceBookingDays: updatedSettings.reservationSettings.maxAdvanceBookingDays,
      minNotificationHours: updatedSettings.reservationSettings.minNotificationHours,
      maxDailyAppointments: updatedSettings.reservationSettings.maxDailyAppointments,
      createdAt: business.createdAt,
      updatedAt: new Date()
    };
  }

  // Business Cancellation Policy Methods

  async getBusinessCancellationPolicies(
    userId: string,
    businessId: string
  ): Promise<CancellationPolicySettings> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.cancellationPolicyService.getBusinessPolicySettings(businessId);
  }

  async updateBusinessCancellationPolicies(
    userId: string,
    businessId: string,
    policyData: Partial<CancellationPolicySettings>
  ): Promise<CancellationPolicySettings> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    // Validate the policy data
    const validatedData = updateBusinessCancellationPolicySchema.parse(policyData);

    return await this.cancellationPolicyService.updateBusinessPolicySettings(businessId, validatedData);
  }

  async getCustomerPolicyStatus(
    userId: string,
    businessId: string,
    customerId: string
  ): Promise<CustomerPolicyStatus> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.cancellationPolicyService.getCustomerPolicyStatus(customerId, businessId);
  }

  // Business Customer Management Methods

  async getBusinessCustomerManagementSettings(
    userId: string,
    businessId: string
  ): Promise<CustomerManagementSettings> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.getBusinessCustomerManagementSettings(businessId);
  }

  async updateBusinessCustomerManagementSettings(
    userId: string,
    businessId: string,
    settings: Partial<CustomerManagementSettings>
  ): Promise<CustomerManagementSettings> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.updateBusinessCustomerManagementSettings(businessId, settings);
  }

  async getCustomerNotes(
    userId: string,
    businessId: string,
    customerId: string,
    noteType?: 'STAFF' | 'INTERNAL' | 'CUSTOMER'
  ): Promise<CustomerNote[]> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.getCustomerNotes(businessId, customerId, noteType);
  }

  async addCustomerNote(
    userId: string,
    businessId: string,
    customerId: string,
    noteData: {
      content: string;
      noteType: 'STAFF' | 'INTERNAL' | 'CUSTOMER';
      isPrivate?: boolean;
    }
  ): Promise<CustomerNote> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.addCustomerNote(businessId, customerId, userId, noteData);
  }

  async getCustomerLoyaltyStatus(
    userId: string,
    businessId: string,
    customerId: string
  ): Promise<CustomerLoyaltyStatus | null> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.getCustomerLoyaltyStatus(businessId, customerId);
  }

  async isCustomerActive(
    userId: string,
    businessId: string,
    customerId: string
  ): Promise<boolean> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.isCustomerActive(businessId, customerId);
  }

  async getCustomerEvaluation(
    userId: string,
    businessId: string,
    appointmentId: string
  ): Promise<CustomerEvaluation | null> {
    // Check permissions
    await this.rbacService.requireAny(userId, [
      PermissionName.VIEW_ALL_BUSINESSES,
      PermissionName.VIEW_OWN_BUSINESS
    ]);

    // If user doesn't have global permission, check business-specific access
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
    }

    return await this.customerManagementService.getCustomerEvaluation(businessId, appointmentId);
  }

  async submitCustomerEvaluation(
    userId: string,
    businessId: string,
    appointmentId: string,
    evaluationData: {
      customerId: string;
      rating: number;
      comment?: string;
      answers: Array<{
        questionId: string;
        answer: string | number;
      }>;
      isAnonymous?: boolean;
    }
  ): Promise<CustomerEvaluation> {
    // Check permissions - customers can submit evaluations for their own appointments
    const hasGlobalPermission = await this.rbacService.hasPermission(userId, 'business', 'view_all');
    if (!hasGlobalPermission) {
      // Check if this is the customer's own appointment
      const appointment = await this.repositories.appointmentRepository.findById(appointmentId);
      if (!appointment || appointment.customerId !== userId) {
        await this.rbacService.requirePermission(userId, PermissionName.VIEW_OWN_BUSINESS, { businessId });
      }
    }

    return await this.customerManagementService.submitCustomerEvaluation(businessId, appointmentId, evaluationData);
  }

  // Google Integration Methods
  async updateGoogleIntegration(
    userId: string,
    businessId: string,
    data: {
      googlePlaceId?: string;
      googleUrl?: string;
      enabled: boolean;
    }
  ): Promise<BusinessData> {
    // Quick ownership check first (faster than full RBAC)
    const business = await this.businessRepository.findById(businessId);
    if (!business || business.ownerId !== userId) {
      throw new ForbiddenError("You don't have permission to edit this business");
    }

    let finalPlaceId: string | undefined = data.googlePlaceId;
    let coordinates: { lat: number; lng: number } | null = null;

    // If URL is provided, extract both Place ID and coordinates
    if (data.googleUrl) {
      const { GooglePlaceIdExtractor } = await import('../../../utils/googlePlaceIdExtractor');

      // Extract coordinates (PRIORITY for embedding)
      coordinates = GooglePlaceIdExtractor.extractCoordinates(data.googleUrl);

      // Also extract Place ID if not provided
      if (!data.googlePlaceId) {
        finalPlaceId = GooglePlaceIdExtractor.extractPlaceId(data.googleUrl) || undefined;
      }

      if (!finalPlaceId && !coordinates && data.enabled) {
        // Could not extract Place ID or coordinates from URL
        const businessName = GooglePlaceIdExtractor.extractBusinessName(data.googleUrl);
        throw new ValidationError(
          `Could not extract Google location data from the provided URL${businessName ? ` for "${businessName}"` : ''}. Please provide a direct Google Maps link with coordinates or Place ID.`
        );
      }
    }

    // If enabling and providing Place ID, validate it
    if (data.enabled && finalPlaceId) {
      // Validate format
      const { GooglePlaceIdExtractor } = await import('../../../utils/googlePlaceIdExtractor');
      if (!GooglePlaceIdExtractor.isValidPlaceId(finalPlaceId)) {
        throw new ValidationError(
          'Invalid Google identifier format. Please provide either a Place ID (starts with "Ch") or a Google Maps URL with a valid location.'
        );
      }

      // Check if it's not used by another business
      const existing = await this.businessRepository.findByGooglePlaceId(
        finalPlaceId
      );

      if (existing && existing.id !== businessId) {
        throw new ValidationError(
          'This Google Place ID is already linked to another business'
        );
      }
    }

    // Update business with Google integration data AND coordinates
    const updateData: {
      googlePlaceId?: string;
      googleOriginalUrl?: string;
      enabled: boolean;
      linkedBy: string;
      latitude?: number;
      longitude?: number;
    } = {
      googlePlaceId: finalPlaceId,
      googleOriginalUrl: data.googleUrl, // Store the original URL
      enabled: data.enabled,
      linkedBy: userId
    };

    // Add coordinates if extracted
    if (coordinates) {
      updateData.latitude = coordinates.lat;
      updateData.longitude = coordinates.lng;

      logger.info('✅ Coordinates extracted and will be stored:', {
        businessId,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      });
    }

    // Log that we're storing the original URL
    if (data.googleUrl) {
      logger.info('✅ Storing original Google Maps URL:', {
        businessId,
        originalUrl: data.googleUrl
      });
    }

    return await this.businessRepository.updateGoogleIntegration(businessId, updateData);
  }

  async getGoogleIntegrationSettings(
    userId: string, // Can be empty for public access
    businessId: string
  ): Promise<{
    googlePlaceId: string | null;
    googleOriginalUrl: string | null;
    googleIntegrationEnabled: boolean;
    googleLinkedAt: Date | null;
    latitude: number | null;
    longitude: number | null;
    averageRating: number | null;
    totalRatings: number;
    lastRatingAt: Date | null;
  }> {
    // Public method - no ownership check needed
    // Google integration info is public data (anyone can see Google Maps/reviews)
    const settings = await this.businessRepository.getGoogleIntegrationSettings(
      businessId
    );

    if (!settings) {
      throw new Error('Business not found');
    }

    return settings;
  }
}