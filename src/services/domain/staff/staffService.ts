import { VerificationPurpose as PrismaVerificationPurpose, BusinessStaffRole } from '@prisma/client';
import { BusinessStaffData, BusinessStaffPrivacySettings, BusinessNotificationSettingsData } from '../../../types/business';
import { StaffRepository, CreateStaffRequest, UpdateStaffRequest, StaffWithUser } from '../../../repositories/staffRepository';
import { RepositoryContainer } from '../../../repositories';
import { PhoneVerificationService } from '../sms/phoneVerificationService';
import { RBACService } from '../rbac/rbacService';
import { UsageService } from '../usage/usageService';
import { PermissionName, CreateUserData, UpdateUserData, UserProfile, UserSecurity } from '../../../types/auth';
import { ErrorContext, ForbiddenError, PhoneVerificationError } from '../../../types/errors';
import { ERROR_CODES } from '../../../constants/errorCodes';
import { AppError } from '../../../types/responseTypes';

import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { VerificationPurpose as SMSVerificationPurpose } from '../../../types/sms';
import logger from "../../../utils/Logger/logger";
export interface InviteStaffRequest {
  businessId: string;
  phoneNumber: string;
  role: BusinessStaffRole;
  permissions?: Record<string, boolean>;
  firstName?: string;
  lastName?: string;
}

export interface VerifyStaffInvitationRequest {
  businessId: string;
  phoneNumber: string;
  verificationCode: string;
  role: BusinessStaffRole;
  permissions?: Record<string, boolean>;
  firstName?: string;
  lastName?: string;
}

export interface StaffInvitationResult {
  success: boolean;
  message: string;
  staffMember?: StaffWithUser;
}

export class StaffService {
  constructor(
    private repositories: RepositoryContainer,
    private phoneVerificationService: PhoneVerificationService,
    private rbacService: RBACService,
    private usageService: UsageService
  ) {}

  /**
   * Step 1: Owner initiates staff invitation by entering phone number
   * This sends SMS code to the staff member's phone
   */
  async inviteStaff(
    ownerId: string,
    request: InviteStaffRequest,
    context?: ErrorContext
  ): Promise<{ success: boolean; message: string }> {
    // Check if business can add more staff members
    const canAddStaff = await this.usageService.canAddStaffMember(request.businessId);
    if (!canAddStaff.allowed) {
      throw new AppError(
        `Cannot invite staff member: ${canAddStaff.reason}`,
        422,
        ERROR_CODES.STAFF_LIMIT_EXCEEDED
      );
    }

    logger.info('Staff invitation initiated', {
      ownerId,
      businessId: request.businessId,
      role: request.role,
      phoneNumber: this.maskPhoneNumber(request.phoneNumber),
      requestId: context?.requestId,
    });

    // Validate phone number
    const normalizedPhone = this.normalizePhoneNumber(request.phoneNumber);
    if (!normalizedPhone) {
      throw new AppError('Invalid phone number format', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Check if owner has permission to manage staff for this business
    await this.validateBusinessOwnerPermission(ownerId, request.businessId);

    // Check if user is already an active staff member before hitting subscription/SMS limits
    const existingUserId = await this.findUserIdByPhone(normalizedPhone);
    if (existingUserId) {
      const existingStaff = await this.repositories.staffRepository.findByBusinessIdAndUserId(
        request.businessId,
        existingUserId
      );
      if (existingStaff && existingStaff.isActive) {
        logger.warn('Staff invitation rejected: phone already registered as active staff', {
          ownerId,
          businessId: request.businessId,
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          requestId: context?.requestId,
        });
        return {
          success: false,
          message: 'This person is already a staff member of this business',
        };
      }
    }

    // Check subscription limits
    await this.validateStaffLimit(request.businessId);

    // Check SMS quota before sending verification code
    const canSendSms = await this.usageService.canSendSms(request.businessId);
    if (!canSendSms.allowed) {
      throw new AppError(
        `Cannot send staff invitation SMS: ${canSendSms.reason}`,
        429,
        ERROR_CODES.SMS_QUOTA_EXCEEDED
      );
    }

    // Send verification code to staff member's phone
    await this.phoneVerificationService.sendVerificationCode(
      {
        phoneNumber: normalizedPhone,
        purpose: SMSVerificationPurpose.STAFF_INVITATION,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
      context
    );

    // Record SMS usage for staff invitation verification
    await this.usageService.recordSmsUsage(request.businessId, 1);

    logger.info('Staff invitation SMS sent and usage recorded', {
      ownerId,
      businessId: request.businessId,
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      role: request.role,
      requestId: context?.requestId,
    });

    return {
      success: true,
      message: 'Verification code sent to staff member. Please enter the code they received.',
    };
  }

  /**
   * Step 2: Owner enters the verification code received on staff member's phone
   * This completes the invitation and adds staff to business
   */
  async verifyStaffInvitation(
    ownerId: string,
    request: VerifyStaffInvitationRequest,
    context?: ErrorContext
  ): Promise<StaffInvitationResult> {
    logger.info('Staff invitation verification started', {
      ownerId,
      businessId: request.businessId,
      phoneNumber: this.maskPhoneNumber(request.phoneNumber),
      role: request.role,
      requestId: context?.requestId,
    });

    const normalizedPhone = this.normalizePhoneNumber(request.phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number format');
    }

    // Verify the SMS code — verifyCode throws PhoneVerificationError subclasses on failure
    try {
      await this.phoneVerificationService.verifyCode(
        normalizedPhone,
        request.verificationCode,
        PrismaVerificationPurpose.STAFF_INVITATION,
        context
      );
    } catch (error) {
      if (error instanceof PhoneVerificationError) {
        logger.warn('Staff invitation verification failed', {
          ownerId,
          businessId: request.businessId,
          phoneNumber: this.maskPhoneNumber(normalizedPhone),
          errorCode: error.code,
          requestId: context?.requestId,
        });
        return { success: false, message: error.message };
      }
      throw error;
    }

    // Check owner permissions again
    await this.validateBusinessOwnerPermission(ownerId, request.businessId);

    // Check subscription limits again
    await this.validateStaffLimit(request.businessId);

    // Find or create user with this phone number
    let staffUser: (UserProfile & UserSecurity) | null = await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);

    if (!staffUser) {
      // Create new user account for staff member
      const createUserData: CreateUserData = {
        phoneNumber: normalizedPhone,
        firstName: request.firstName || undefined,
        lastName: request.lastName || undefined,
      };
      const newUser = await this.repositories.userRepository.create(createUserData);

      // Mark user as verified since phone was verified through invitation
      await this.repositories.userRepository.update(newUser.id, {
        isVerified: true,
      });

      // Assign CUSTOMER role so the new user can use all app features
      await this.ensureUserRole(newUser.id, 'CUSTOMER', newUser.id);

      // Fetch the full user data with security info
      staffUser = await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);

      if (!staffUser) {
        throw new Error('Failed to fetch newly created user');
      }

      logger.info('New user account created for staff member', {
        userId: newUser.id,
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        businessId: request.businessId,
        requestId: context?.requestId,
      });
    } else if (request.firstName || request.lastName) {
      // Update user name if provided and user doesn't have names set
      const shouldUpdate = (!staffUser!.firstName && request.firstName) || 
                          (!staffUser!.lastName && request.lastName);
      
      if (shouldUpdate) {
        const updateData: UpdateUserData = {};
        if (request.firstName && !staffUser!.firstName) updateData.firstName = request.firstName;
        if (request.lastName && !staffUser!.lastName) updateData.lastName = request.lastName;
        
        await this.repositories.userRepository.update(staffUser!.id, updateData);
      }
    }

    // Check if already staff member (edge case)
    let existingStaff = await this.repositories.staffRepository.findByBusinessIdAndUserId(
      request.businessId,
      staffUser!.id
    );

    if (existingStaff) {
      if (existingStaff.isActive) {
        return {
          success: false,
          message: 'This person is already a staff member of this business',
        };
      } else {
        // Reactivate existing inactive staff member
        await this.repositories.staffRepository.activate(existingStaff.id);

        // Ensure correct platform role: MANAGER gets MANAGER role, others get STAFF
        const platformRole = request.role === BusinessStaffRole.MANAGER ? 'MANAGER' : 'STAFF';
        await this.ensureUserRole(staffUser!.id, platformRole, ownerId);

        // CRITICAL: Invalidate user's permission cache since their staff access was reactivated
        this.rbacService.forceInvalidateUser(staffUser!.id);
        
        logger.info('Existing staff member reactivated', {
          staffId: existingStaff.id,
          userId: staffUser!.id,
          businessId: request.businessId,
          role: request.role,
          cacheInvalidated: true,
          requestId: context?.requestId,
        });

        // Get full staff info with user details
        const staffWithUser = await this.getStaffById(existingStaff.id);
        
        return {
          success: true,
          message: 'Staff member successfully added to business',
          staffMember: staffWithUser || undefined,
        };
      }
    }

    // Create new staff member
    const newStaff = await this.repositories.staffRepository.create({
      businessId: request.businessId,
      userId: staffUser!.id,
      role: request.role,
      permissions: request.permissions,
    });

    // Ensure correct platform role: MANAGER gets MANAGER role, others get STAFF
    const platformRole = request.role === BusinessStaffRole.MANAGER ? 'MANAGER' : 'STAFF';
    await this.ensureUserRole(staffUser!.id, platformRole, ownerId);

    // CRITICAL: Invalidate user's permission cache since they now have staff access
    // Staff roles are loaded from businessStaff table and affect user permissions
    this.rbacService.forceInvalidateUser(staffUser!.id);

    // Update staff usage tracking
    await this.usageService.updateStaffUsage(request.businessId);

    logger.info('New staff member added to business', {
      staffId: newStaff.id,
      userId: staffUser!.id,
      businessId: request.businessId,
      role: request.role,
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
      cacheInvalidated: true,
      requestId: context?.requestId,
    });

    // Get full staff info with user details
    const staffWithUser = await this.getStaffById(newStaff.id);

    return {
      success: true,
      message: 'Staff member successfully added to business',
      staffMember: staffWithUser || undefined,
    };
  }

  async getBusinessStaff(
    userId: string,
    businessId: string,
    includeInactive = false
  ): Promise<StaffWithUser[]> {
    await this.validateBusinessAccess(userId, businessId);
    return this.repositories.staffRepository.findByBusinessId(businessId, includeInactive);
  }

  async getStaffById(staffId: string): Promise<StaffWithUser | null> {
    const staff = await this.repositories.staffRepository.findById(staffId);
    if (!staff) return null;

    // Get staff with user details
    const staffList = await this.repositories.staffRepository.findByBusinessId(staff.businessId);
    return staffList.find(s => s.id === staffId) || null;
  }

  /**
   * Fetch a staff member by ID after enforcing business-level access control.
   *
   * Access is granted when the requester satisfies ANY of:
   *   1. Has global staff:manage_all permission (platform admin).
   *   2. Is the owner of the same business as the target staff record.
   *   3. Is an active staff member of the same business.
   *
   * Throws ForbiddenError (403) for every other authenticated caller.
   */
  async getStaffByIdAuthorized(requestingUserId: string, staffId: string): Promise<StaffWithUser | null> {
    const staffRecord = await this.repositories.staffRepository.findById(staffId);
    if (!staffRecord) return null;

    // Global admin bypass — checked first to avoid extra DB queries for admins
    const hasGlobalAccess = await this.rbacService.hasPermission(
      requestingUserId,
      'staff',
      'manage_all'
    );

    if (!hasGlobalAccess) {
      // Throws ForbiddenError if requester is neither owner nor active staff of this business
      await this.validateBusinessAccess(requestingUserId, staffRecord.businessId);
    }

    const staffList = await this.repositories.staffRepository.findByBusinessId(staffRecord.businessId);
    return staffList.find(s => s.id === staffId) || null;
  }

  async getUserStaffPositions(userId: string): Promise<StaffWithUser[]> {
    return this.repositories.staffRepository.findByUserId(userId);
  }

  async updateStaff(
    userId: string,
    staffId: string,
    updates: UpdateStaffRequest
  ): Promise<BusinessStaffData> {
    const staff = await this.repositories.staffRepository.findById(staffId);
    if (!staff) {
      throw new Error('Staff member not found');
    }

    await this.validateBusinessOwnerPermission(userId, staff.businessId);

    return this.repositories.staffRepository.update(staffId, updates);
  }

  async removeStaff(
    userId: string,
    staffId: string
  ): Promise<void> {
    const staff = await this.repositories.staffRepository.findById(staffId);
    if (!staff) {
      throw new Error('Staff member not found');
    }

    await this.validateBusinessOwnerPermission(userId, staff.businessId);

    // Prevent removing business owner
    if (staff.role === BusinessStaffRole.OWNER) {
      throw new Error('Cannot remove business owner');
    }

    await this.repositories.staffRepository.deactivate(staffId);

    // Remove this staff member from all service assignments
    await this.repositories.serviceRepository.removeStaffFromAllServices(staffId);

    // CRITICAL: Invalidate user's permission cache since their staff access was removed
    this.rbacService.forceInvalidateUser(staff.userId);

    // Update staff usage tracking
    await this.usageService.updateStaffUsage(staff.businessId);

    logger.info('Staff member removed', {
      staffId,
      userId: staff.userId,
      businessId: staff.businessId,
      removedBy: userId,
      cacheInvalidated: true,
    });
  }

  async getStaffStats(
    userId: string,
    businessId: string
  ): Promise<{
    totalStaff: number;
    activeStaff: number;
    byRole: Record<string, number>;
    subscriptionLimit: number;
    remainingSlots: number;
  }> {
    await this.validateBusinessAccess(userId, businessId);

    const [stats, business] = await Promise.all([
      this.repositories.staffRepository.getBusinessStaffStats(businessId),
      this.repositories.businessRepository.findByIdWithSubscription(businessId),
    ]);

    const subscriptionLimit = business?.subscription?.plan.maxStaffPerBusiness || 1;
    const remainingSlots = Math.max(0, subscriptionLimit - stats.activeStaff);

    return {
      ...stats,
      subscriptionLimit,
      remainingSlots,
    };
  }

  private async ensureUserRole(userId: string, roleName: string, grantedBy: string): Promise<void> {
    const role = await this.repositories.roleRepository.getRoleByName(roleName);
    if (!role) {
      logger.warn(`Role '${roleName}' not found in database, skipping assignment`, { userId });
      return;
    }
    const existing = await this.repositories.roleRepository.getUserRoles(userId);
    if (existing.some((r: any) => r.name === roleName)) {
      return;
    }
    await this.repositories.roleRepository.assignRoleToUser(userId, role.id, grantedBy, undefined, {
      source: 'staff_invitation',
    });
    logger.info(`Role '${roleName}' assigned to user`, { userId, grantedBy });
  }

  private async validateBusinessOwnerPermission(userId: string, businessId: string): Promise<void> {
    // Check if user is owner of this business
    const business = await this.repositories.businessRepository.findById(businessId);
    if (!business) {
      throw new AppError('Business not found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
    }

    if (business.ownerId !== userId) {
      // Also check if user has staff management permissions
      const hasPermission = await this.rbacService.hasPermission(
        userId,
        'staff',
        'manage',
        { businessId }
      );

      if (!hasPermission) {
        throw new ForbiddenError('Access denied: Only business owners can manage staff');
      }
    }
  }

  private async validateBusinessAccess(userId: string, businessId: string): Promise<void> {
    const business = await this.repositories.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Check if user is owner or staff member
    const isOwner = business.ownerId === userId;
    const isStaffMember = await this.repositories.staffRepository.checkUserExistsInBusiness(
      businessId,
      userId
    );

    if (!isOwner && !isStaffMember) {
      throw new ForbiddenError(
        'You do not have access to this business'
      );
    }
  }

  private async validateStaffLimit(businessId: string): Promise<void> {
    const [currentStaffCount, business] = await Promise.all([
      this.repositories.staffRepository.countActiveStaffByBusinessId(businessId),
      this.repositories.businessRepository.findByIdWithSubscription(businessId),
    ]);

    if (!business?.subscription) {
      throw new AppError(
        'Business does not have an active subscription. Please activate a subscription to manage staff.',
        422,
        ERROR_CODES.SUBSCRIPTION_REQUIRED
      );
    }

    const maxStaff = business.subscription.plan.maxStaffPerBusiness;

    if (currentStaffCount >= maxStaff) {
      throw new AppError(
        `Staff limit reached. Your ${business.subscription.plan.displayName} plan allows ${maxStaff} staff members (including owner). ` +
        `Current: ${currentStaffCount}/${maxStaff}. Please upgrade your subscription to add more staff.`,
        422,
        ERROR_CODES.STAFF_LIMIT_EXCEEDED
      );
    }
  }

  private async findUserIdByPhone(phoneNumber: string): Promise<string | null> {
    const user = await this.repositories.userRepository.findByPhoneNumber(phoneNumber);
    return user?.id || null;
  }

  private normalizePhoneNumber(phoneNumber: string): string | null {
    try {
      // Attempt direct validation first
      if (isValidPhoneNumber(phoneNumber)) {
        const parsed = parsePhoneNumber(phoneNumber);
        return parsed?.format('E.164') || null;
      }

      // Fallback: try parsing with TR country context (handles local formats)
      try {
        const parsed = parsePhoneNumber(phoneNumber, 'TR');
        if (parsed && isValidPhoneNumber(parsed.format('E.164'))) {
          return parsed.format('E.164');
        }
      } catch {
        // ignore fallback error
      }

      return null;
    } catch (error) {
      logger.warn('Phone number parsing failed', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private maskPhoneNumber(phoneNumber: string): string { 
    if (phoneNumber.length < 4) {
      return '*'.repeat(phoneNumber.length);
    }

    const visibleDigits = 3;
    const maskedPart = '*'.repeat(phoneNumber.length - visibleDigits);
    return maskedPart + phoneNumber.slice(-visibleDigits);
  }

  private getStaffPrivacySettings(businessSettings: any): BusinessStaffPrivacySettings {
    const staffPrivacy = (businessSettings?.staffPrivacy as Record<string, unknown>) || {};
    const customLabels = (staffPrivacy.customStaffLabels as Record<string, unknown>) || {};
    return {
      hideStaffNames: (staffPrivacy.hideStaffNames as boolean) || false,
      staffDisplayMode: (staffPrivacy.staffDisplayMode as 'NAMES' | 'ROLES' | 'GENERIC') || 'NAMES',
      customStaffLabels: {
        owner: (customLabels.owner as string) || 'Owner',
        manager: (customLabels.manager as string) || 'Manager',
        staff: (customLabels.staff as string) || 'Staff',
        receptionist: (customLabels.receptionist as string) || 'Receptionist',
      },
    };
  }

  private getStaffDisplayName(role: BusinessStaffRole, privacySettings: BusinessStaffPrivacySettings): string {
    if (privacySettings.staffDisplayMode === 'ROLES') {
      const roleNames: Record<string, string> = {
        [BusinessStaffRole.OWNER]: 'Owner',
        [BusinessStaffRole.MANAGER]: 'Manager',
        [BusinessStaffRole.STAFF]: 'Staff Member',
      };
      return roleNames[role] || 'Staff';
    }

    if (privacySettings.staffDisplayMode === 'GENERIC') {
      return privacySettings.customStaffLabels[role.toLowerCase() as keyof typeof privacySettings.customStaffLabels] || 'Staff';
    }

    // Default to NAMES mode (shouldn't reach here if hideStaffNames is true)
    return 'Staff';
  }

  async getPublicBusinessStaff(businessId: string, serviceId?: string): Promise<Array<{
    id: string;
    role: BusinessStaffRole;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    };
    displayName?: string;
  }>> {
    const business = await this.repositories.businessRepository.findByIdWithOwner(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    let staff = await this.repositories.staffRepository.findByBusinessId(businessId);

    // Filter by service assignment when serviceId is provided
    if (serviceId) {
      const assignedStaffIds = await this.repositories.serviceRepository.getServiceStaffIds(serviceId);
      // Only filter if the service has explicit assignments; otherwise show all (backward compat)
      if (assignedStaffIds.length > 0) {
        staff = staff.filter(member => assignedStaffIds.includes(member.id));
      }
    }

    // If no staff records exist, ensure the owner has a staff record and return it
    if (staff.length === 0 && business.owner) {
      const owner = business.owner;
      let ownerStaff = await this.repositories.staffRepository.findByBusinessIdAndUserId(businessId, owner.id);
      if (!ownerStaff) {
        ownerStaff = await this.repositories.staffRepository.create({
          businessId,
          userId: owner.id,
          role: 'OWNER' as BusinessStaffRole,
        });
      }
      return [{
        id: ownerStaff.id,
        role: 'OWNER' as BusinessStaffRole,
        user: {
          id: owner.id,
          firstName: owner.firstName ?? null,
          lastName: owner.lastName ?? null,
          avatar: owner.avatar ?? null,
        },
      }];
    }

    // Get privacy settings from business settings
    const privacySettings = this.getStaffPrivacySettings(business.settings);

    return staff.map(member => {
      const baseStaff = {
        id: member.id,
        role: member.role,
        user: {
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          avatar: member.user.avatar,
        },
      };

      // Apply privacy settings
      if (privacySettings.hideStaffNames) {
        const displayName = this.getStaffDisplayName(member.role, privacySettings);
        return {
          ...baseStaff,
          user: {
            ...baseStaff.user,
            firstName: null,
            lastName: null,
          },
          displayName,
        };
      }

      return baseStaff;
    });
  }

  // Utility methods
  async transferStaffBetweenBusinesses(
    userId: string,
    staffIds: string[],
    fromBusinessId: string,
    toBusinessId: string
  ): Promise<void> {
    await this.validateBusinessOwnerPermission(userId, fromBusinessId);
    await this.validateBusinessOwnerPermission(userId, toBusinessId);

    // Check staff limits for target business
    const targetStaffCount = await this.repositories.staffRepository.countActiveStaffByBusinessId(toBusinessId);
    const targetBusiness = await this.repositories.businessRepository.findByIdWithSubscription(toBusinessId);
    
    if (!targetBusiness?.subscription) {
      throw new Error('Target business does not have an active subscription');
    }

    if (targetStaffCount + staffIds.length > targetBusiness.subscription.plan.maxStaffPerBusiness) {
      throw new Error('Target business does not have enough staff slots available');
    }

    await this.repositories.staffRepository.transferStaffToNewBusiness(
      fromBusinessId,
      toBusinessId,
      staffIds
    );

    logger.info('Staff transferred between businesses', {
      staffIds,
      fromBusinessId,
      toBusinessId,
      transferredBy: userId,
    });
  }
}
