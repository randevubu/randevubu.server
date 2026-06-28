import { Request, Response } from 'express';
import { BusinessService } from '../services/domain/business';
import { AuthenticatedRequest } from '../types/request';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';
import type { CacheService } from '../services/core/cacheService';

export class BusinessHoursController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper,
    private cacheService?: CacheService
  ) {}

  async getBusinessHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;

    const result = await this.businessService.getBusinessHours(userId, businessId);

    await this.responseHelper.success(res, 'success.business.hoursRetrieved', result, 200, req);
  }

  async updateBusinessHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { businessHours } = req.body;
    const userId = req.user!.id;

    if (!businessHours || typeof businessHours !== 'object') {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid business hours format' });
    }

    const business = await this.businessService.updateBusinessHours(userId, id, businessHours);

    await this.cacheService?.invalidateBusiness(id, userId);

    await this.responseHelper.success(res, 'success.business.hoursUpdated', { business }, 200, req);
  }

  async getBusinessHoursStatus(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { date, timezone } = req.query;

    const result = await this.businessService.getBusinessHoursStatus(
      businessId,
      date as string,
      timezone as string
    );

    await this.responseHelper.success(res, 'success.business.hoursStatusRetrieved', result, 200, req);
  }

  async createBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;
    const overrideData = req.body;

    const result = await this.businessService.createBusinessHoursOverride(userId, businessId, overrideData);

    await this.cacheService?.invalidateBusiness(businessId, userId);

    await this.responseHelper.success(res, 'success.business.hoursOverrideCreated', result, 201, req);
  }

  async updateBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, date } = req.params;
    const userId = req.user!.id;
    const updateData = req.body;

    const result = await this.businessService.updateBusinessHoursOverride(userId, businessId, date, updateData);

    await this.cacheService?.invalidateBusiness(businessId, userId);

    await this.responseHelper.success(res, 'success.business.hoursOverrideUpdated', result, 200, req);
  }

  async deleteBusinessHoursOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, date } = req.params;
    const userId = req.user!.id;

    await this.businessService.deleteBusinessHoursOverride(userId, businessId, date);

    await this.cacheService?.invalidateBusiness(businessId, userId);

    await this.responseHelper.success(res, 'success.business.hoursOverrideDeleted', undefined, 200, req);
  }

  async getAffectedAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;
    const { type, date, dayOfWeek, isOpen, newOpenTime, newCloseTime } = req.query as Record<string, string>;

    const result = await this.businessService.getAffectedAppointmentsForScheduleChange(
      userId,
      businessId,
      {
        type: type as 'weekly' | 'special_day',
        date,
        dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : undefined,
        isOpen: isOpen === 'true',
        newOpenTime,
        newCloseTime
      }
    );

    await this.responseHelper.success(res, 'success.business.affectedAppointmentsRetrieved', result, 200, req);
  }

  async bulkCancelAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;
    const { appointmentIds, reason } = req.body as { appointmentIds: string[]; reason: 'DAY_CLOSED' | 'HOURS_CHANGE' };

    if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'appointmentIds array is required', params: { field: 'appointmentIds' } });
    }

    const result = await this.businessService.bulkCancelForScheduleChange(userId, businessId, appointmentIds, reason);
    await this.responseHelper.success(res, 'success.appointment.batchCancelled', result, 200, req);
  }

  async getBusinessHoursOverrides(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user!.id;

    const result = await this.businessService.getBusinessHoursOverrides(
      userId,
      businessId,
      startDate as string,
      endDate as string
    );

    await this.responseHelper.success(res, 'success.business.hoursOverridesRetrieved', result, 200, req);
  }
}
