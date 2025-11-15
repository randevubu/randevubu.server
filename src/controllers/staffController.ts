import { BusinessStaffRole } from "@prisma/client";
import { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { BusinessContextRequest } from "../middleware/businessContext";
import {
  InviteStaffRequest,
  StaffService,
  VerifyStaffInvitationRequest,
} from "../services/domain/staff";
import { AuthenticatedRequest } from "../types/request";
import { AppError } from "../types/responseTypes";
import {
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse,
} from "../utils/responseUtils";

export class StaffController {
  constructor(private staffService: StaffService) {}

  /**
   * Initiate staff invitation - sends SMS code to staff member's phone
   * POST /api/v1/staff/invite
   */
  async inviteStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        businessId,
        phoneNumber,
        role,
        permissions,
        firstName,
        lastName,
      } = req.body;

      // Validate required fields
      if (!businessId || !phoneNumber || !role || !firstName || !lastName) {
        const error = new AppError(
          'Business ID, phone number, role, first name, and last name are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        const error = new AppError(
          'Invalid phone number format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate role
      if (!Object.values(BusinessStaffRole).includes(role as BusinessStaffRole)) {
        const error = new AppError(
          'Invalid staff role',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate names
      if (typeof firstName !== 'string' || firstName.trim().length < 1 || firstName.trim().length > 50) {
        const error = new AppError(
          'First name must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (typeof lastName !== 'string' || lastName.trim().length < 1 || lastName.trim().length > 50) {
        const error = new AppError(
          'Last name must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate permissions if provided
      if (permissions && (!Array.isArray(permissions) || !permissions.every((p: string) => typeof p === 'string'))) {
        const error = new AppError(
          'Permissions must be an array of strings',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const context = createErrorContext(req, "STAFF_INVITATION");

      const result = await this.staffService.inviteStaff(
        userId,
        {
          businessId,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          role,
          permissions: permissions || [],
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        } as InviteStaffRequest,
        context
      );

      await sendSuccessResponse(res, 'success.staff.invited', { success: result.success }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Complete staff invitation - verify SMS code and add staff to business
   * POST /api/v1/staff/verify-invitation
   */
  async verifyStaffInvitation(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        businessId,
        phoneNumber,
        verificationCode,
        role,
        permissions,
        firstName,
        lastName,
      } = req.body;

      // Validate required fields
      if (!businessId || !phoneNumber || !verificationCode || !role || !firstName || !lastName) {
        const error = new AppError(
          'Business ID, phone number, verification code, role, first name, and last name are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
        const error = new AppError(
          'Invalid phone number format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate verification code format (6 digits)
      const codeRegex = /^\d{6}$/;
      if (!codeRegex.test(verificationCode)) {
        const error = new AppError(
          'Verification code must be 6 digits',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate role
      if (!Object.values(BusinessStaffRole).includes(role as BusinessStaffRole)) {
        const error = new AppError(
          'Invalid staff role',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate names
      if (typeof firstName !== 'string' || firstName.trim().length < 1 || firstName.trim().length > 50) {
        const error = new AppError(
          'First name must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (typeof lastName !== 'string' || lastName.trim().length < 1 || lastName.trim().length > 50) {
        const error = new AppError(
          'Last name must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate permissions if provided
      if (permissions && (!Array.isArray(permissions) || !permissions.every((p: string) => typeof p === 'string'))) {
        const error = new AppError(
          'Permissions must be an array of strings',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const context = createErrorContext(req, "STAFF_VERIFICATION");

      const result = await this.staffService.verifyStaffInvitation(
        userId,
        {
          businessId,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          verificationCode,
          role,
          permissions: permissions || [],
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        } as VerifyStaffInvitationRequest,
        context
      );

      if (result.success) {
        await sendSuccessResponse(res, 'success.staff.verified', result, 201, req);
      } else {
        const error = new AppError(
          result.message,
          400,
          ERROR_CODES.INVALID_VERIFICATION_CODE
        );
        sendAppErrorResponse(res, error);
      }
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all staff for a business
   * GET /api/v1/staff/:businessId
   * Query params: ?includeInactive=true
   */
  async getBusinessStaff(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate includeInactive query parameter
      if (req.query.includeInactive && req.query.includeInactive !== 'true' && req.query.includeInactive !== 'false') {
        const error = new AppError(
          'includeInactive must be true or false',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const staff = await this.staffService.getBusinessStaff(
        userId,
        businessId,
        includeInactive
      );

      await sendSuccessResponse(res, 'success.staff.retrieved', { staff }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get staff member details
   * GET /api/v1/staff/member/:staffId
   */
  async getStaffMember(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { staffId } = req.params;

      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string') {
        const error = new AppError(
          'Staff ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate staffId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
        const error = new AppError(
          'Invalid staff ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const staff = await this.staffService.getStaffById(staffId);

      if (!staff) {
        const error = new AppError(
          'Staff member not found',
          404,
          ERROR_CODES.STAFF_NOT_FOUND
        );
        sendAppErrorResponse(res, error);
        return;
      }

      await sendSuccessResponse(res, 'success.staff.retrievedSingle', { staff }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update staff member
   * PUT /api/v1/staff/member/:staffId
   */
  async updateStaffMember(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { staffId } = req.params;
      const updates = req.body;

      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string') {
        const error = new AppError(
          'Staff ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate staffId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
        const error = new AppError(
          'Invalid staff ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate updates object
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        const error = new AppError(
          'Updates must be a valid object',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate specific fields if provided
      if (updates.firstName && (typeof updates.firstName !== 'string' || updates.firstName.trim().length < 1 || updates.firstName.trim().length > 50)) {
        const error = new AppError(
          'First name must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (updates.lastName && (typeof updates.lastName !== 'string' || updates.lastName.trim().length < 1 || updates.lastName.trim().length > 50)) {
        const error = new AppError(
          'Last name must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (updates.role && !Object.values(BusinessStaffRole).includes(updates.role as BusinessStaffRole)) {
        const error = new AppError(
          'Invalid staff role',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (updates.permissions && (!Array.isArray(updates.permissions) || !updates.permissions.every((p: string) => typeof p === 'string'))) {
        const error = new AppError(
          'Permissions must be an array of strings',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Sanitize string fields
      if (updates.firstName) updates.firstName = updates.firstName.trim();
      if (updates.lastName) updates.lastName = updates.lastName.trim();

      const staff = await this.staffService.updateStaff(
        userId,
        staffId,
        updates
      );

      await sendSuccessResponse(res, 'success.staff.updated', { staff }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Remove staff member (deactivate)
   * DELETE /api/v1/staff/member/:staffId
   */
  async removeStaffMember(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { staffId } = req.params;

      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string') {
        const error = new AppError(
          'Staff ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate staffId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
        const error = new AppError(
          'Invalid staff ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.staffService.removeStaff(userId, staffId);

      await sendSuccessResponse(res, "success.staff.removed", undefined, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get staff statistics for a business
   * GET /api/v1/staff/:businessId/stats
   */
  async getStaffStats(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const stats = await this.staffService.getStaffStats(userId, businessId);

      await sendSuccessResponse(res, 'success.staff.statsRetrieved', { stats }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get staff by role for a business
   * GET /api/v1/staff/:businessId/role/:role
   * Query params: ?includeInactive=true
   */
  async getStaffByRole(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, role } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate role parameter
      if (!role || typeof role !== 'string') {
        const error = new AppError(
          'Role is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate role value
      if (!Object.values(BusinessStaffRole).includes(role as BusinessStaffRole)) {
        const error = new AppError(
          "Invalid staff role",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate includeInactive query parameter
      if (req.query.includeInactive && req.query.includeInactive !== 'true' && req.query.includeInactive !== 'false') {
        const error = new AppError(
          'includeInactive must be true or false',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const staff = await this.staffService.getBusinessStaff(
        userId,
        businessId,
        includeInactive
      );
      const filteredStaff = staff.filter((s) => s.role === role);

      await sendSuccessResponse(res, 'success.staff.byRoleRetrieved', { staff: filteredStaff }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get current user's staff positions (businesses they work at)
   * GET /api/v1/staff/my-positions
   */
  async getMyStaffPositions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const positions = await this.staffService.getUserStaffPositions(userId);

      await sendSuccessResponse(res, 'success.staff.positionsRetrieved', { positions }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Transfer staff between businesses (admin function)
   * POST /api/v1/staff/transfer
   */
  async transferStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { staffIds, fromBusinessId, toBusinessId } = req.body;

      // Validate required fields
      if (!staffIds || !fromBusinessId || !toBusinessId) {
        const error = new AppError(
          'Staff IDs, from business ID, and to business ID are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate staffIds array
      if (!Array.isArray(staffIds)) {
        const error = new AppError(
          'Staff IDs must be an array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (staffIds.length === 0) {
        const error = new AppError(
          'Staff IDs array cannot be empty',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (staffIds.length > 50) {
        const error = new AppError(
          'Staff IDs array cannot exceed 50 items',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate business IDs
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(fromBusinessId) || fromBusinessId.length < 1 || fromBusinessId.length > 50) {
        const error = new AppError(
          'Invalid from business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(toBusinessId) || toBusinessId.length < 1 || toBusinessId.length > 50) {
        const error = new AppError(
          'Invalid to business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each staff ID
      for (let i = 0; i < staffIds.length; i++) {
        const staffId = staffIds[i];
        if (!staffId || typeof staffId !== 'string') {
          const error = new AppError(
            `staffIds[${i}] must be a non-empty string`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
          const error = new AppError(
            `staffIds[${i}] has invalid format`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      await this.staffService.transferStaffBetweenBusinesses(
        userId,
        staffIds,
        fromBusinessId,
        toBusinessId
      );

      await sendSuccessResponse(res, "success.staff.transferred", undefined, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Bulk invite staff members
   * POST /api/v1/staff/bulk-invite
   */
  async bulkInviteStaff(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, invitations } = req.body;

      // Validate required fields
      if (!businessId || !invitations) {
        const error = new AppError(
          'Business ID and invitations are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate invitations array
      if (!Array.isArray(invitations)) {
        const error = new AppError(
          'Invitations must be an array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (invitations.length === 0) {
        const error = new AppError(
          'Invitations array cannot be empty',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (invitations.length > 20) {
        const error = new AppError(
          'Invitations array cannot exceed 20 items',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each invitation
      for (let i = 0; i < invitations.length; i++) {
        const invitation = invitations[i];
        if (!invitation || typeof invitation !== 'object') {
          const error = new AppError(
            `invitations[${i}] must be an object`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (!invitation.phoneNumber || !invitation.role || !invitation.firstName || !invitation.lastName) {
          const error = new AppError(
            `invitations[${i}] must have phoneNumber, role, firstName, and lastName`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        // Validate phone number format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(invitation.phoneNumber.replace(/\s/g, ''))) {
          const error = new AppError(
            `invitations[${i}].phoneNumber has invalid format`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        // Validate role
        if (!Object.values(BusinessStaffRole).includes(invitation.role as BusinessStaffRole)) {
          const error = new AppError(
            `invitations[${i}].role is invalid`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        // Validate names
        if (typeof invitation.firstName !== 'string' || invitation.firstName.trim().length < 1 || invitation.firstName.trim().length > 50) {
          const error = new AppError(
            `invitations[${i}].firstName must be between 1 and 50 characters`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (typeof invitation.lastName !== 'string' || invitation.lastName.trim().length < 1 || invitation.lastName.trim().length > 50) {
          const error = new AppError(
            `invitations[${i}].lastName must be between 1 and 50 characters`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        // Validate permissions if provided
        if (invitation.permissions && (!Array.isArray(invitation.permissions) || !invitation.permissions.every((p: string) => typeof p === 'string'))) {
          const error = new AppError(
            `invitations[${i}].permissions must be an array of strings`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const results = [];
      const context = createErrorContext(req, "BULK_STAFF_INVITATION");

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
            } as InviteStaffRequest,
            context
          );
          results.push({
            phoneNumber: invitation.phoneNumber,
            ...result,
          });
        } catch (error) {
          results.push({
            phoneNumber: invitation.phoneNumber,
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      await sendSuccessResponse(res, 'success.staff.bulkInvited', { results }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get available staff roles
   * GET /api/v1/staff/roles
   */
  async getAvailableRoles(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const roles = Object.values(BusinessStaffRole).map((role) => ({
        value: role,
        label: this.getRoleDisplayName(role),
        description: this.getRoleDescription(role),
      }));

      await sendSuccessResponse(res, 'success.staff.rolesRetrieved', { roles }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  private getRoleDisplayName(role: BusinessStaffRole): string {
    const roleNames = {
      [BusinessStaffRole.OWNER]: "Owner",
      [BusinessStaffRole.MANAGER]: "Manager",
      [BusinessStaffRole.STAFF]: "Staff Member",
      [BusinessStaffRole.RECEPTIONIST]: "Receptionist",
    };
    return roleNames[role] || role;
  }

  private getRoleDescription(role: BusinessStaffRole): string {
    const roleDescriptions = {
      [BusinessStaffRole.OWNER]: "Full access to all business features",
      [BusinessStaffRole.MANAGER]: "Manage staff, services, and appointments",
      [BusinessStaffRole.STAFF]: "Handle appointments and basic operations",
      [BusinessStaffRole.RECEPTIONIST]:
        "Manage appointments and customer interactions",
    };
    return roleDescriptions[role] || "";
  }

  /**
   * Get public staff list for appointment booking (no authentication required)
   * GET /api/v1/public/businesses/:businessId/staff
   */
  async getPublicBusinessStaff(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const staff = await this.staffService.getPublicBusinessStaff(businessId);

      await sendSuccessResponse(res, 'success.staff.publicRetrieved', { staff }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
