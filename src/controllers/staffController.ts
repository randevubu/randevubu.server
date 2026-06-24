import { BusinessStaffRole } from '@prisma/client';
import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import {
  InviteStaffRequest,
  StaffService,
  VerifyStaffInvitationRequest,
} from '../services/domain/staff';
import { AuthenticatedRequest } from '../types/request';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class StaffController {
  constructor(
    private staffService: StaffService,
    private responseHelper: ResponseHelper
  ) {}

  private requireId(params: Record<string, string>, name: string): string {
    const id = params[name];
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: `${name} is required`,
        params: { field: name },
      });
    }
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', {
        message: `Invalid ${name} format`,
        params: { field: name },
      });
    }
    return id;
  }

  private validateName(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: `${fieldName} must be between 1 and 50 characters` });
    }
    return value.trim();
  }

  private validateRole(role: unknown): BusinessStaffRole {
    if (!role || !Object.values(BusinessStaffRole).includes(role as BusinessStaffRole)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid staff role' });
    }
    return role as BusinessStaffRole;
  }

  private validatePhoneNumber(phoneNumber: unknown): string {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: 'Phone number is required',
        params: { field: 'phoneNumber' },
      });
    }
    const cleaned = phoneNumber.replace(/\s/g, '');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleaned)) {
      throw new AppError('INVALID_PHONE_FORMAT', { message: 'Invalid phone number format' });
    }
    return cleaned;
  }

  private validatePermissions(permissions: unknown): string[] {
    if (!permissions) return [];
    if (!Array.isArray(permissions) || !permissions.every((p: unknown) => typeof p === 'string')) {
      throw new AppError('VALIDATION_ERROR', { message: 'Permissions must be an array of strings' });
    }
    return permissions;
  }

  /**
   * Initiate staff invitation - sends SMS code to staff member's phone
   * POST /api/v1/staff/invite
   */
  async inviteStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { businessId, phoneNumber, role, permissions, firstName, lastName } = req.body;

    if (!businessId || !phoneNumber || !role || !firstName || !lastName) {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: 'Business ID, phone number, role, first name, and last name are required',
      });
    }

    this.requireId({ businessId }, 'businessId');
    const cleanedPhone = this.validatePhoneNumber(phoneNumber);
    this.validateRole(role);
    const trimmedFirst = this.validateName(firstName, 'First name');
    const trimmedLast = this.validateName(lastName, 'Last name');
    const normalizedPermissions = this.validatePermissions(permissions);

    const result = await this.staffService.inviteStaff(
      userId,
      {
        businessId,
        phoneNumber: cleanedPhone,
        role,
        permissions: normalizedPermissions,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      } as InviteStaffRequest
    );

    if (!result.success) {
      throw new AppError('STAFF_ALREADY_EXISTS', { message: result.message });
    }

    await this.responseHelper.success(res, 'success.staff.invited', { success: true }, 200, req);
  }

  /**
   * Complete staff invitation - verify SMS code and add staff to business
   * POST /api/v1/staff/verify-invitation
   */
  async verifyStaffInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { businessId, phoneNumber, verificationCode, role, permissions, firstName, lastName } =
      req.body;

    if (!businessId || !phoneNumber || !verificationCode || !role || !firstName || !lastName) {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: 'Business ID, phone number, verification code, role, first name, and last name are required',
      });
    }

    this.requireId({ businessId }, 'businessId');
    const cleanedPhone = this.validatePhoneNumber(phoneNumber);
    this.validateRole(role);
    const trimmedFirst = this.validateName(firstName, 'First name');
    const trimmedLast = this.validateName(lastName, 'Last name');
    const normalizedPermissions = this.validatePermissions(permissions);

    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(verificationCode)) {
      throw new AppError('INVALID_VERIFICATION_CODE', { message: 'Verification code must be 6 digits' });
    }

    const result = await this.staffService.verifyStaffInvitation(
      userId,
      {
        businessId,
        phoneNumber: cleanedPhone,
        verificationCode,
        role,
        permissions: normalizedPermissions,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      } as VerifyStaffInvitationRequest
    );

    if (!result.success) {
      throw new AppError('INVALID_VERIFICATION_CODE', { message: result.message });
    }

    await this.responseHelper.success(res, 'success.staff.verified', result, 201, req);
  }

  /**
   * Get all staff for a business
   * GET /api/v1/staff/:businessId
   */
  async getBusinessStaff(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const businessId = this.requireId(req.params, 'businessId');
    const includeInactive = !!req.query.includeInactive;

    const staff = await this.staffService.getBusinessStaff(userId, businessId, includeInactive);

    await this.responseHelper.success(res, 'success.staff.retrieved', { staff }, 200, req);
  }

  /**
   * Get staff member details
   * GET /api/v1/staff/member/:staffId
   */
  async getStaffMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const staffId = this.requireId(req.params, 'staffId');

    const staff = await this.staffService.getStaffByIdAuthorized(userId, staffId);

    if (!staff) {
      throw new AppError('STAFF_NOT_FOUND', { message: 'Staff member not found' });
    }

    await this.responseHelper.success(res, 'success.staff.retrievedSingle', { staff }, 200, req);
  }

  /**
   * Update staff member
   * PUT /api/v1/staff/member/:staffId
   */
  async updateStaffMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const staffId = this.requireId(req.params, 'staffId');
    const updates = req.body;

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Updates must be a valid object' });
    }

    if (updates.firstName) updates.firstName = this.validateName(updates.firstName, 'First name');
    if (updates.lastName) updates.lastName = this.validateName(updates.lastName, 'Last name');
    if (updates.role) this.validateRole(updates.role);
    if (updates.permissions) this.validatePermissions(updates.permissions);

    const staff = await this.staffService.updateStaff(userId, staffId, updates);

    await this.responseHelper.success(res, 'success.staff.updated', { staff }, 200, req);
  }

  /**
   * Remove staff member (deactivate)
   * DELETE /api/v1/staff/member/:staffId
   */
  async removeStaffMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const staffId = this.requireId(req.params, 'staffId');

    await this.staffService.removeStaff(userId, staffId);

    await this.responseHelper.success(res, 'success.staff.removed', undefined, 200, req);
  }

  /**
   * Get staff statistics for a business
   * GET /api/v1/staff/:businessId/stats
   */
  async getStaffStats(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const businessId = this.requireId(req.params, 'businessId');

    const stats = await this.staffService.getStaffStats(userId, businessId);

    await this.responseHelper.success(res, 'success.staff.statsRetrieved', { stats }, 200, req);
  }

  /**
   * Get staff by role for a business
   * GET /api/v1/staff/:businessId/role/:role
   */
  async getStaffByRole(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const businessId = this.requireId(req.params, 'businessId');
    const includeInactive = !!req.query.includeInactive;

    const { role } = req.params;
    if (!role || typeof role !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Role is required' });
    }
    this.validateRole(role);

    const staff = await this.staffService.getBusinessStaff(userId, businessId, includeInactive);
    const filteredStaff = staff.filter((s) => s.role === role);

    await this.responseHelper.success(
      res,
      'success.staff.byRoleRetrieved',
      { staff: filteredStaff },
      200,
      req
    );
  }

  /**
   * Get current user's staff positions (businesses they work at)
   * GET /api/v1/staff/my-positions
   */
  async getMyStaffPositions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;

    const positions = await this.staffService.getUserStaffPositions(userId);

    await this.responseHelper.success(
      res,
      'success.staff.positionsRetrieved',
      { positions },
      200,
      req
    );
  }

  /**
   * Transfer staff between businesses (admin function)
   * POST /api/v1/staff/transfer
   */
  async transferStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { staffIds, fromBusinessId, toBusinessId } = req.body;

    if (!staffIds || !fromBusinessId || !toBusinessId) {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: 'Staff IDs, from business ID, and to business ID are required',
      });
    }

    if (!Array.isArray(staffIds)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Staff IDs must be an array' });
    }
    if (staffIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'Staff IDs array cannot be empty' });
    }
    if (staffIds.length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: 'Staff IDs array cannot exceed 50 items' });
    }

    this.requireId({ fromBusinessId }, 'fromBusinessId');
    this.requireId({ toBusinessId }, 'toBusinessId');

    const idRegex = /^[a-zA-Z0-9-_]+$/;
    for (let i = 0; i < staffIds.length; i++) {
      const staffId = staffIds[i];
      if (!staffId || typeof staffId !== 'string') {
        throw new AppError('VALIDATION_ERROR', { message: `staffIds[${i}] must be a non-empty string` });
      }
      if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
        throw new AppError('VALIDATION_ERROR', { message: `staffIds[${i}] has invalid format` });
      }
    }

    await this.staffService.transferStaffBetweenBusinesses(
      userId,
      staffIds,
      fromBusinessId,
      toBusinessId
    );

    await this.responseHelper.success(res, 'success.staff.transferred', undefined, 200, req);
  }

  /**
   * Bulk invite staff members
   * POST /api/v1/staff/bulk-invite
   */
  async bulkInviteStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { businessId, invitations } = req.body;

    if (!businessId || !invitations) {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: 'Business ID and invitations are required',
      });
    }

    this.requireId({ businessId }, 'businessId');

    if (!Array.isArray(invitations)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invitations must be an array' });
    }
    if (invitations.length === 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invitations array cannot be empty' });
    }
    if (invitations.length > 20) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invitations array cannot exceed 20 items' });
    }

    for (let i = 0; i < invitations.length; i++) {
      const invitation = invitations[i];
      if (!invitation || typeof invitation !== 'object') {
        throw new AppError('VALIDATION_ERROR', { message: `invitations[${i}] must be an object` });
      }
      if (!invitation.phoneNumber || !invitation.role || !invitation.firstName || !invitation.lastName) {
        throw new AppError('VALIDATION_ERROR', {
          message: `invitations[${i}] must have phoneNumber, role, firstName, and lastName`,
        });
      }
      this.validatePhoneNumber(invitation.phoneNumber);
      this.validateRole(invitation.role);
      this.validateName(invitation.firstName, `invitations[${i}].firstName`);
      this.validateName(invitation.lastName, `invitations[${i}].lastName`);
      if (invitation.permissions) this.validatePermissions(invitation.permissions);
    }

    const results = [];

    // Intentional try/catch per invitation — one failure should not abort the batch
    for (const invitation of invitations) {
      try {
        const result = await this.staffService.inviteStaff(
          userId,
          {
            businessId,
            phoneNumber: invitation.phoneNumber.replace(/\s/g, ''),
            role: invitation.role,
            permissions: invitation.permissions || [],
            firstName: invitation.firstName.trim(),
            lastName: invitation.lastName.trim(),
          } as InviteStaffRequest
        );
        results.push({
          phoneNumber: invitation.phoneNumber,
          ...result,
        });
      } catch (error) {
        results.push({
          phoneNumber: invitation.phoneNumber,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.responseHelper.success(res, 'success.staff.bulkInvited', { results }, 200, req);
  }

  /**
   * Get available staff roles
   * GET /api/v1/staff/roles
   */
  async getAvailableRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    const roles = Object.values(BusinessStaffRole).map((role) => ({
      value: role,
      label: this.getRoleDisplayName(role),
      description: this.getRoleDescription(role),
    }));

    await this.responseHelper.success(res, 'success.staff.rolesRetrieved', { roles }, 200, req);
  }

  private getRoleDisplayName(role: BusinessStaffRole): string {
    const roleNames: Record<string, string> = {
      [BusinessStaffRole.OWNER]: 'Owner',
      [BusinessStaffRole.MANAGER]: 'Manager',
      [BusinessStaffRole.STAFF]: 'Staff Member',
    };
    return roleNames[role] || role;
  }

  private getRoleDescription(role: BusinessStaffRole): string {
    const roleDescriptions: Record<string, string> = {
      [BusinessStaffRole.OWNER]: 'Full access to all business features',
      [BusinessStaffRole.MANAGER]: 'Manage staff, services, and appointments',
      [BusinessStaffRole.STAFF]: 'Handle appointments and basic operations',
    };
    return roleDescriptions[role] || '';
  }

  /**
   * Get public staff list for appointment booking (no authentication required)
   * GET /api/v1/public/businesses/:businessId/staff
   */
  async getPublicBusinessStaff(req: Request, res: Response): Promise<void> {
    const businessId = this.requireId(req.params, 'businessId');

    const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined;
    const staff = await this.staffService.getPublicBusinessStaff(businessId, serviceId);

    await this.responseHelper.success(res, 'success.staff.publicRetrieved', { staff }, 200, req);
  }
}
