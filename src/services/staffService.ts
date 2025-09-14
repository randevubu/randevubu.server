import { VerificationPurpose, BusinessStaffRole } from '@prisma/client';
import { BusinessStaffData } from '../types/business';
import { StaffRepository, CreateStaffRequest, UpdateStaffRequest, StaffWithUser } from '../repositories/staffRepository';
import { RepositoryContainer } from '../repositories';
import { PhoneVerificationService } from './phoneVerificationService';
import { RBACService } from './rbacService';
import { PermissionName, CreateUserData, UpdateUserData } from '../types/auth';
import { ErrorContext } from '../types/errors';
import { AuthError } from '../types/errorResponse';
import { ERROR_CODES } from '../constants/errorCodes';
import { logger } from '../utils/logger';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

export interface InviteStaffRequest {
  businessId: string;
  phoneNumber: string;
  role: BusinessStaffRole;
  permissions?: any;
  firstName?: string;
  lastName?: string;
}

export interface VerifyStaffInvitationRequest {
  businessId: string;
  phoneNumber: string;
  verificationCode: string;
  role: BusinessStaffRole;
  permissions?: any;
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
    private rbacService: RBACService
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
      throw new Error('Invalid phone number format');
    }

    // Check if owner has permission to manage staff for this business
    await this.validateBusinessOwnerPermission(ownerId, request.businessId);

    // Check subscription limits
    await this.validateStaffLimit(request.businessId);

    // Check if user is already staff member of this business
    const existingStaff = await this.repositories.staffRepository.findByBusinessIdAndUserId(
      request.businessId,
      await this.findUserIdByPhone(normalizedPhone) || 'nonexistent'
    );

    if (existingStaff && existingStaff.isActive) {
      throw new Error('This person is already a staff member of this business');
    }

    // Send verification code to staff member's phone
    await this.phoneVerificationService.sendVerificationCode(
      {
        phoneNumber: normalizedPhone,
        purpose: VerificationPurpose.STAFF_INVITATION,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
      context
    );

    logger.info('Staff invitation SMS sent', {
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

    // Verify the SMS code
    const verificationResult = await this.phoneVerificationService.verifyCode(
      normalizedPhone,
      request.verificationCode,
      VerificationPurpose.STAFF_INVITATION,
      context
    );

    if (!verificationResult.success) {
      logger.warn('Staff invitation verification failed', {
        ownerId,
        businessId: request.businessId,
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        requestId: context?.requestId,
      });
      return {
        success: false,
        message: 'Invalid verification code',
      };
    }

    // Check owner permissions again
    await this.validateBusinessOwnerPermission(ownerId, request.businessId);

    // Check subscription limits again
    await this.validateStaffLimit(request.businessId);

    // Find or create user with this phone number
    let staffUser: any = await this.repositories.userRepository.findByPhoneNumber(normalizedPhone);

    if (!staffUser) {
      // Create new user account for staff member
      const createUserData: CreateUserData = {
        phoneNumber: normalizedPhone,
        firstName: request.firstName || undefined,
        lastName: request.lastName || undefined,
      };
      staffUser = await this.repositories.userRepository.create(createUserData);
      
      // Mark user as verified since phone was verified through invitation
      await this.repositories.userRepository.update(staffUser!.id, {
        isVerified: true,
      });

      logger.info('New user account created for staff member', {
        userId: staffUser.id,
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
        const updatedStaff = await this.repositories.staffRepository.activate(existingStaff.id);
        
        logger.info('Existing staff member reactivated', {
          staffId: existingStaff.id,
          userId: staffUser!.id,
          businessId: request.businessId,
          role: request.role,
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

    logger.info('New staff member added to business', {
      staffId: newStaff.id,
      userId: staffUser!.id,
      businessId: request.businessId,
      role: request.role,
      phoneNumber: this.maskPhoneNumber(normalizedPhone),
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

    logger.info('Staff member removed', {
      staffId,
      businessId: staff.businessId,
      removedBy: userId,
    });
  }

  async getStaffStats(
    userId: string,
    businessId: string
  ): Promise<{
    totalStaff: number;
    activeStaff: number;
    byRole: Record<BusinessStaffRole, number>;
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

  private async validateBusinessOwnerPermission(userId: string, businessId: string): Promise<void> {
    // Check if user is owner of this business
    const business = await this.repositories.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
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
        throw new Error('Access denied: Only business owners can manage staff');
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
      throw new AuthError(
        ERROR_CODES.ACCESS_DENIED,
        { message: 'You do not have access to this business' }
      );
    }
  }

  private async validateStaffLimit(businessId: string): Promise<void> {
    const [currentStaffCount, business] = await Promise.all([
      this.repositories.staffRepository.countActiveStaffByBusinessId(businessId),
      this.repositories.businessRepository.findByIdWithSubscription(businessId),
    ]);

    if (!business?.subscription) {
      throw new Error('Business does not have an active subscription');
    }

    const maxStaff = business.subscription.plan.maxStaffPerBusiness;
    
    if (currentStaffCount >= maxStaff) {
      throw new Error(
        `Staff limit reached. Your ${business.subscription.plan.displayName} plan allows ${maxStaff} staff members. ` +
        `Please upgrade your subscription to add more staff.`
      );
    }
  }

  private async findUserIdByPhone(phoneNumber: string): Promise<string | null> {
    const user = await this.repositories.userRepository.findByPhoneNumber(phoneNumber);
    return user?.id || null;
  }

  private normalizePhoneNumber(phoneNumber: string): string | null {
    try {
      if (!isValidPhoneNumber(phoneNumber)) {
        return null;
      }

      const parsed = parsePhoneNumber(phoneNumber);
      return parsed?.format('E.164') || null;
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

  async getPublicBusinessStaff(businessId: string): Promise<Array<{
    id: string;
    role: BusinessStaffRole;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    };
  }>> {
    const business = await this.repositories.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const staff = await this.repositories.staffRepository.findByBusinessId(businessId);
    
    return staff.map(member => ({
      id: member.id,
      role: member.role,
      user: {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatar: member.user.avatar,
      },
    }));
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