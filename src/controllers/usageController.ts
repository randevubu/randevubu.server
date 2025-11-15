import { Response } from "express";
import { z } from "zod";
import { BusinessContextRequest } from "../middleware/businessContext";
import { UsageService } from "../services/domain/usage";
import { AuthenticatedRequest } from "../types/request";
import {
  createErrorContext,
  handleRouteError,
  sendAppErrorResponse,
  sendSuccessResponse,
} from "../utils/responseUtils";
import { AppError } from "../types/responseTypes";
import { ERROR_CODES } from "../constants/errorCodes";

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

      const summary = await this.usageService.getBusinessUsageSummary(
        userId,
        businessId
      );

      if (!summary) {
        const error = new AppError(
          'Business not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await sendSuccessResponse(res, "success.usage.summaryRetrieved", summary, 200, req);
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

      const alerts = await this.usageService.getUsageAlerts(userId, businessId);

      if (!alerts) {
        const error = new AppError(
          'Business not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await sendSuccessResponse(res, "success.usage.alertsRetrieved", alerts, 200, req);
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

      const queryResult = usageQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        const error = new AppError(
          'Invalid query parameters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const { days } = queryResult.data;
      const usage = await this.usageService.getDailyUsageChart(
        userId,
        businessId,
        days
      );

      await sendSuccessResponse(
        res,
        "success.usage.dailySmsRetrieved",
        usage,
        200,
        req,
        { days }
      );
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

      const queryResult = usageQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        const error = new AppError(
          'Invalid query parameters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const { months } = queryResult.data;
      const history = await this.usageService.getMonthlyUsageHistory(
        userId,
        businessId,
        months
      );

      await sendSuccessResponse(
        res,
        "success.usage.monthlyHistoryRetrieved",
        history,
        200,
        req,
        { months }
      );
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

      const [smsCheck, staffCheck, serviceCheck, customerCheck] =
        await Promise.all([
          this.usageService.canSendSms(businessId),
          this.usageService.canAddStaffMember(businessId),
          this.usageService.canAddService(businessId),
          this.usageService.canAddCustomer(businessId),
        ]);

      await sendSuccessResponse(
        res,
        "success.usage.limitsChecked",
        {
          sms: smsCheck,
          staff: staffCheck,
          service: serviceCheck,
          customer: customerCheck,
        },
        200,
        req
      );
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

      // Update all usage counters based on current database state
      await Promise.all([
        this.usageService.updateStaffUsage(businessId),
        this.usageService.updateServiceUsage(businessId),
      ]);

      await sendSuccessResponse(
        res,
        "success.usage.dataRefreshed",
        {
          refreshedCounters: ["staff", "services"],
          updatedAt: new Date().toISOString(),
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
