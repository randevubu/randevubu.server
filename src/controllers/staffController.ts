import { BusinessStaffRole } from "@prisma/client";
import { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import { BusinessContextRequest } from "../middleware/businessContext";
import {
  InviteStaffRequest,
  StaffService,
  VerifyStaffInvitationRequest,
} from "../services/domain/staff";
import { AuthenticatedRequest } from "../types/auth";
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

      const context = createErrorContext(req, "STAFF_INVITATION");

      const result = await this.staffService.inviteStaff(
        userId,
        {
          businessId,
          phoneNumber,
          role,
          permissions,
          firstName,
          lastName,
        } as InviteStaffRequest,
        context
      );

      sendSuccessResponse(res, result.message, { success: result.success });
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

      const context = createErrorContext(req, "STAFF_VERIFICATION");

      const result = await this.staffService.verifyStaffInvitation(
        userId,
        {
          businessId,
          phoneNumber,
          verificationCode,
          role,
          permissions,
          firstName,
          lastName,
        } as VerifyStaffInvitationRequest,
        context
      );

      if (result.success) {
        sendSuccessResponse(res, 'Staff member verified successfully', result, 201);
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

      const staff = await this.staffService.getBusinessStaff(
        userId,
        businessId,
        includeInactive
      );

      sendSuccessResponse(res, 'Staff retrieved successfully', { staff });
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

      sendSuccessResponse(res, 'Staff member retrieved successfully', { staff });
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

      const staff = await this.staffService.updateStaff(
        userId,
        staffId,
        updates
      );

      sendSuccessResponse(res, 'Staff member updated successfully', { staff });
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

      await this.staffService.removeStaff(userId, staffId);

      sendSuccessResponse(res, "Staff member removed successfully");
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

      const stats = await this.staffService.getStaffStats(userId, businessId);

      sendSuccessResponse(res, 'Staff statistics retrieved successfully', { stats });
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

      // Validate role
      if (
        !Object.values(BusinessStaffRole).includes(role as BusinessStaffRole)
      ) {
        const error = new AppError(
          "Invalid staff role",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        sendAppErrorResponse(res, error);
        return;
      }

      const staff = await this.staffService.getBusinessStaff(
        userId,
        businessId,
        includeInactive
      );
      const filteredStaff = staff.filter((s) => s.role === role);

      sendSuccessResponse(res, 'Staff by role retrieved successfully', { staff: filteredStaff });
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

      // This would need a new method in StaffService to get user's staff positions
      // For now, we'll use the repository directly through the service
      const positions = await this.staffService[
        "repositories"
      ].staffRepository.findByUserId(userId);

      sendSuccessResponse(res, 'Staff positions retrieved successfully', { positions });
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

      await this.staffService.transferStaffBetweenBusinesses(
        userId,
        staffIds,
        fromBusinessId,
        toBusinessId
      );

      sendSuccessResponse(res, "Staff transferred successfully");
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

      const results = [];
      const context = createErrorContext(req, "BULK_STAFF_INVITATION");

      for (const invitation of invitations) {
        try {
          const result = await this.staffService.inviteStaff(
            userId,
            {
              businessId,
              ...invitation,
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

      sendSuccessResponse(res, 'Bulk invitation completed', { results });
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

      sendSuccessResponse(res, 'Available staff roles retrieved successfully', { roles });
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

      const staff = await this.staffService.getPublicBusinessStaff(businessId);

      sendSuccessResponse(res, 'Public business staff retrieved successfully', { staff });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
