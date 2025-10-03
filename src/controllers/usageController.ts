import { Response } from "express";
import { z } from "zod";
import { BusinessContextRequest } from "../middleware/businessContext";
import { UsageService } from "../services/usageService";
import { AuthenticatedRequest } from "../types/auth";
import {
  BusinessErrors,
  ValidationErrors,
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse,
} from "../utils/responseUtils";

const usageQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30),
  months: z.coerce.number().min(1).max(24).optional().default(12),
});

export class UsageController {
  constructor(private usageService: UsageService) {}

  /**
   * Get business usage summary including current/previous month and quotas
   * GET /api/v1/businesses/:businessId/usage/summary
   */
  async getUsageSummary(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.params.businessId;

      const summary = await this.usageService.getBusinessUsageSummary(
        userId,
        businessId
      );

      if (!summary) {
        const context = createErrorContext(req, businessId);
        const error = BusinessErrors.notFound(businessId, context);
        return sendAppErrorResponse(res, error);
      }

      sendSuccessResponse(res, {
        data: summary,
        message: "Usage summary retrieved successfully",
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get usage alerts for the business
   * GET /api/v1/businesses/:businessId/usage/alerts
   */
  async getUsageAlerts(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.params.businessId;

      const alerts = await this.usageService.getUsageAlerts(userId, businessId);

      if (!alerts) {
        const context = createErrorContext(req, businessId);
        const error = BusinessErrors.notFound(businessId, context);
        return sendAppErrorResponse(res, error);
      }

      sendSuccessResponse(res, {
        data: alerts,
        message: "Usage alerts retrieved successfully",
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get daily SMS usage chart data
   * GET /api/v1/businesses/:businessId/usage/sms-daily
   * Query params: ?days=30 (default: 30, max: 365)
   */
  async getDailySmsUsage(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.params.businessId;

      const queryResult = usageQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        const context = createErrorContext(req);
        const error = ValidationErrors.general(
          "Invalid query parameters",
          context
        );
        return sendAppErrorResponse(res, error);
      }

      const { days } = queryResult.data;
      const usage = await this.usageService.getDailyUsageChart(
        userId,
        businessId,
        days
      );

      sendSuccessResponse(res, {
        data: usage,
        message: `Daily SMS usage for last ${days} days retrieved successfully`,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get monthly usage history
   * GET /api/v1/businesses/:businessId/usage/monthly-history
   * Query params: ?months=12 (default: 12, max: 24)
   */
  async getMonthlyUsageHistory(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.params.businessId;

      const queryResult = usageQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        const context = createErrorContext(req);
        const error = ValidationErrors.general(
          "Invalid query parameters",
          context
        );
        return sendAppErrorResponse(res, error);
      }

      const { months } = queryResult.data;
      const history = await this.usageService.getMonthlyUsageHistory(
        userId,
        businessId,
        months
      );

      sendSuccessResponse(res, {
        data: history,
        message: `Monthly usage history for last ${months} months retrieved successfully`,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Check if business can perform specific actions (useful for frontend validations)
   * GET /api/v1/businesses/:businessId/usage/limits-check
   */
  async checkLimits(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.params.businessId;

      const [smsCheck, staffCheck, serviceCheck, customerCheck] =
        await Promise.all([
          this.usageService.canSendSms(businessId),
          this.usageService.canAddStaffMember(businessId),
          this.usageService.canAddService(businessId),
          this.usageService.canAddCustomer(businessId),
        ]);

      sendSuccessResponse(res, {
        data: {
          sms: smsCheck,
          staff: staffCheck,
          service: serviceCheck,
          customer: customerCheck,
        },
        message: "Usage limits check completed successfully",
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async refreshUsageCounters(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const businessId = req.params.businessId;

      // Update all usage counters based on current database state
      await Promise.all([
        this.usageService.updateStaffUsage(businessId),
        this.usageService.updateServiceUsage(businessId),
      ]);

      sendSuccessResponse(res, {
        data: {
          refreshedCounters: ["staff", "services"],
          updatedAt: new Date().toISOString(),
        },
        message: "Usage data refreshed successfully",
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
