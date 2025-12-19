import { Request, Response } from 'express';
import { BusinessService } from '../services/domain/business';
import { AuthenticatedRequest } from '../types/request';
import { handleRouteError } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';

/**
 * Controller for managing business hours and overrides
 * Handles regular business hours, special hours, and holiday schedules
 */
export class BusinessHoursController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Get business hours for a specific business
   * GET /api/v1/businesses/{businessId}/hours
   */
  async getBusinessHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      const result = await this.businessService.getBusinessHours(userId, businessId);

      await this.responseHelper.success(res, 'success.business.hoursRetrieved', result, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update business hours for a specific business
   * PUT /api/v1/businesses/{businessId}/hours
   */
  async updateBusinessHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { businessHours } = req.body;
      const userId = req.user!.id;

      if (!businessHours || typeof businessHours !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid business hours format',
        });
        return;
      }

      const business = await this.businessService.updateBusinessHours(userId, id, businessHours);

      await this.responseHelper.success(
        res,
        'success.business.hoursUpdated',
        { business },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business hours status for a specific date
   * GET /api/v1/businesses/{businessId}/hours/status?date=2025-01-15&timezone=Europe/Istanbul
   */
  async getBusinessHoursStatus(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { date, timezone } = req.query;

      const result = await this.businessService.getBusinessHoursStatus(
        businessId,
        date as string,
        timezone as string
      );

      await this.responseHelper.success(
        res,
        'success.business.hoursStatusRetrieved',
        result,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Create business hours override for a specific date
   * POST /api/v1/businesses/{businessId}/hours/overrides
   */
  async createBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const overrideData = req.body;

      const result = await this.businessService.createBusinessHoursOverride(
        userId,
        businessId,
        overrideData
      );

      await this.responseHelper.success(
        res,
        'success.business.hoursOverrideCreated',
        result,
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update business hours override for a specific date
   * PUT /api/v1/businesses/{businessId}/hours/overrides/{date}
   */
  async updateBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, date } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const result = await this.businessService.updateBusinessHoursOverride(
        userId,
        businessId,
        date,
        updateData
      );

      await this.responseHelper.success(
        res,
        'success.business.hoursOverrideUpdated',
        result,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete business hours override for a specific date
   * DELETE /api/v1/businesses/{businessId}/hours/overrides/{date}
   */
  async deleteBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, date } = req.params;
      const userId = req.user!.id;

      await this.businessService.deleteBusinessHoursOverride(userId, businessId, date);

      await this.responseHelper.success(
        res,
        'success.business.hoursOverrideDeleted',
        undefined,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business hours overrides for a date range
   * GET /api/v1/businesses/{businessId}/hours/overrides?startDate=2025-01-01&endDate=2025-01-31
   */
  async getBusinessHoursOverrides(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      const result = await this.businessService.getBusinessHoursOverrides(
        userId,
        businessId,
        startDate as string,
        endDate as string
      );

      await this.responseHelper.success(
        res,
        'success.business.hoursOverridesRetrieved',
        result,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
