import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  createBusinessClosureSchema,
  updateBusinessClosureSchema
} from '../schemas/business.schemas';
import { AppointmentRescheduleService } from '../services/domain/appointment';
import { BusinessClosureService, ClosureAnalyticsService } from '../services/domain/closure';
import { NotificationService } from '../services/domain/notification';
import { AuthenticatedRequest } from '../types/request';
import {
  AppointmentData,
  AvailabilityAlertRequest,
  ClosureType,
  CreateEnhancedClosureRequest,
  NotificationRequest,
  RescheduleOptionsRequest
} from '../types/business';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class BusinessClosureController {
  constructor(
    private businessClosureService: BusinessClosureService,
    private notificationService: NotificationService,
    private closureAnalyticsService: ClosureAnalyticsService,
    private appointmentRescheduleService: AppointmentRescheduleService,
    private responseHelper: ResponseHelper
  ) {}

  async createClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const validatedData = createBusinessClosureSchema.parse(req.body);
    const userId = req.user!.id;

    const closure = await this.businessClosureService.createClosure(
      userId,
      businessId,
      validatedData
    );

    await this.responseHelper.success(res, 'success.closure.created', closure, 201, req);
  }

  async getClosureById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    const closure = await this.businessClosureService.getClosureById(userId, id);

    if (!closure) {
      throw new AppError('CLOSURE_NOT_FOUND', { message: `Closure ${id} not found` });
    }

    await this.responseHelper.success(res, 'success.closure.retrieved', closure, 200, req);
  }

  async getBusinessClosures(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { active } = req.query;
    const userId = req.user!.id;

    let closures;
    if (active === 'true') {
      closures = await this.businessClosureService.getActiveClosures(userId, businessId);
    } else if (active === 'upcoming') {
      closures = await this.businessClosureService.getUpcomingClosures(userId, businessId);
    } else {
      closures = await this.businessClosureService.getBusinessClosures(userId, businessId);
    }

    await this.responseHelper.successWithMeta(res, 'success.closure.listRetrieved', closures, { total: closures.length, businessId, filter: active || 'all' }, 200, req);
  }

  async updateClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const validatedData = updateBusinessClosureSchema.parse(req.body);
    const userId = req.user!.id;

    const closure = await this.businessClosureService.updateClosure(userId, id, validatedData);

    await this.responseHelper.success(res, 'success.closure.updated', closure, 200, req);
  }

  async deleteClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    await this.businessClosureService.deleteClosure(userId, id);

    await this.responseHelper.success(res, 'success.closure.deleted', undefined, 200, req);
  }

  async isBusinessClosed(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { date } = req.query;

    let checkDate = new Date();
    if (date) {
      checkDate = new Date(date as string);
      if (isNaN(checkDate.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid date query parameter' });
      }
    }

    const result = await this.businessClosureService.isBusinessClosed(businessId, checkDate);

    await this.responseHelper.success(res, 'success.closure.statusChecked', { businessId, date: checkDate.toISOString(), isClosed: result.isClosed, closure: result.closure }, 200, req);
  }

  async extendClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { newEndDate } = req.body;
    const userId = req.user!.id;

    if (!newEndDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'newEndDate is required', params: { field: 'newEndDate' } });
    }

    const endDate = new Date(newEndDate);
    if (isNaN(endDate.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid newEndDate format' });
    }

    const closure = await this.businessClosureService.extendClosure(userId, id, endDate);

    await this.responseHelper.success(res, 'success.closure.extended', closure, 200, req);
  }

  async endClosureEarly(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { endDate } = req.body;
    const userId = req.user!.id;

    let closureEndDate = new Date();
    if (endDate) {
      closureEndDate = new Date(endDate);
      if (isNaN(closureEndDate.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
      }
    }

    const closure = await this.businessClosureService.endClosureEarly(userId, id, closureEndDate);

    await this.responseHelper.success(res, 'success.closure.endedEarly', closure, 200, req);
  }

  async getClosuresByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user!.id;

    if (!startDate || !endDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate and endDate are required', params: { field: 'startDate,endDate' } });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid date format' });
    }

    if (end <= start) {
      throw new AppError('CLOSURE_END_BEFORE_START', { message: 'endDate must be after startDate' });
    }

    const closures = await this.businessClosureService.getClosuresByDateRange(userId, businessId, start, end);

    await this.responseHelper.successWithMeta(res, 'success.closure.listRetrieved', closures, { total: closures.length, businessId, startDate: startDate as string, endDate: endDate as string }, 200, req);
  }

  async getClosuresByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, type } = req.params;
    const userId = req.user!.id;

    if (!Object.values(ClosureType).includes(type as ClosureType)) {
      throw new AppError('VALIDATION_ERROR', { message: `Invalid closure type: ${type}` });
    }

    const closures = await this.businessClosureService.getClosuresByType(userId, businessId, type as ClosureType);

    await this.responseHelper.successWithMeta(res, 'success.closure.listRetrieved', closures, { total: closures.length, businessId, type }, 200, req);
  }

  async getClosureStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { year } = req.query;
    const userId = req.user!.id;

    let statsYear: number | undefined;
    if (year) {
      statsYear = parseInt(year as string);
      if (isNaN(statsYear) || statsYear < 2000 || statsYear > 2100) {
        throw new AppError('VALIDATION_ERROR', { message: 'Invalid year' });
      }
    }

    const stats = await this.businessClosureService.getClosureStats(userId, businessId, statsYear);

    await this.responseHelper.successWithMeta(res, 'success.closure.statsRetrieved', stats, { businessId, year: statsYear || 'all-time' }, 200, req);
  }

  async createRecurringHoliday(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { name, startDate, endDate } = req.body;
    const userId = req.user!.id;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Holiday name is required', params: { field: 'name' } });
    }
    if (name.trim().length < 2) {
      throw new AppError('VALIDATION_ERROR', { message: 'Holiday name must be at least 2 characters' });
    }

    if (!startDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate is required', params: { field: 'startDate' } });
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
    }

    let end: Date | undefined;
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
      }
    }

    const closure = await this.businessClosureService.createRecurringHoliday(userId, businessId, name.trim(), start, end);

    await this.responseHelper.success(res, 'success.closure.holidayCreated', closure, 201, req);
  }

  async getRecurringHolidays(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;

    const holidays = await this.businessClosureService.getRecurringHolidays(userId, businessId);

    await this.responseHelper.successWithMeta(res, 'success.closure.holidaysRetrieved', holidays, { total: holidays.length, businessId }, 200, req);
  }

  async getAffectedAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user!.id;

    if (!startDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate is required', params: { field: 'startDate' } });
    }

    const start = new Date(startDate as string);
    if (isNaN(start.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
    }

    let end: Date | undefined;
    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
      }
    }

    const appointments = await this.businessClosureService.getAffectedAppointments(userId, businessId, start, end);

    await this.responseHelper.successWithMeta(res, 'success.closure.affectedAppointmentsRetrieved', appointments, { total: appointments.length, businessId, startDate: startDate as string, endDate: endDate as string }, 200, req);
  }

  async createEmergencyClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { reason, durationHours, startDate } = req.body;
    const userId = req.user!.id;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new AppError('VALIDATION_ERROR', { message: 'Emergency reason must be at least 5 characters' });
    }

    let start = new Date();
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
      }
    }

    let duration: number | undefined;
    if (durationHours) {
      duration = parseInt(durationHours);
      if (isNaN(duration) || duration <= 0 || duration > 168) {
        throw new AppError('VALIDATION_ERROR', { message: 'Duration must be between 1 and 168 hours' });
      }
    }

    const closure = await this.businessClosureService.createEmergencyClosure(userId, businessId, reason.trim(), start, duration);

    await this.responseHelper.success(res, 'success.closure.emergencyCreated', closure, 201, req);
  }

  async createMaintenanceClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { description, startDate, estimatedHours } = req.body;
    const userId = req.user!.id;

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      throw new AppError('VALIDATION_ERROR', { message: 'Maintenance description must be at least 5 characters' });
    }

    if (!startDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate is required', params: { field: 'startDate' } });
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
    }

    if (!estimatedHours || typeof estimatedHours !== 'number' || estimatedHours <= 0 || estimatedHours > 72) {
      throw new AppError('VALIDATION_ERROR', { message: 'Estimated hours must be between 1 and 72' });
    }

    const closure = await this.businessClosureService.createMaintenanceClosure(userId, businessId, description.trim(), start, estimatedHours);

    await this.responseHelper.success(res, 'success.closure.maintenanceCreated', closure, 201, req);
  }

  async getClosuresCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { year, month } = req.query;
    const userId = req.user!.id;

    if (!year) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'year is required', params: { field: 'year' } });
    }

    const calendarYear = parseInt(year as string);
    if (isNaN(calendarYear) || calendarYear < 2000 || calendarYear > 2100) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid year' });
    }

    let calendarMonth: number | undefined;
    if (month) {
      calendarMonth = parseInt(month as string);
      if (isNaN(calendarMonth) || calendarMonth < 1 || calendarMonth > 12) {
        throw new AppError('VALIDATION_ERROR', { message: 'Month must be between 1 and 12' });
      }
    }

    const calendar = await this.businessClosureService.getClosuresCalendar(userId, businessId, calendarYear, calendarMonth);

    await this.responseHelper.successWithMeta(res, 'success.closure.calendarRetrieved', calendar, { businessId, year: calendarYear, month: calendarMonth }, 200, req);
  }

  async autoExpireClosures(req: AuthenticatedRequest, res: Response): Promise<void> {
    const count = await this.businessClosureService.autoExpireClosures();

    await this.responseHelper.success(res, 'success.closure.autoExpired', { expiredCount: count }, 200, req);
  }

  // Context-aware methods
  async createMyBusinessClosure(req: BusinessContextRequest, res: Response): Promise<void> {
    const validatedData = createBusinessClosureSchema.parse(req.body);
    const userId = req.user!.id;
    const businessId = req.businessContext!.primaryBusinessId!;

    const closure = await this.businessClosureService.createClosure(userId, businessId, validatedData);

    await this.responseHelper.success(res, 'success.closure.created', closure, 201, req);
  }

  async getMyBusinessClosures(req: BusinessContextRequest, res: Response): Promise<void> {
    const { active } = req.query;
    const userId = req.user!.id;
    const businessId = req.businessContext!.primaryBusinessId!;

    let closures;
    if (active === 'true') {
      closures = await this.businessClosureService.getActiveClosures(userId, businessId);
    } else if (active === 'upcoming') {
      closures = await this.businessClosureService.getUpcomingClosures(userId, businessId);
    } else {
      closures = await this.businessClosureService.getBusinessClosures(userId, businessId);
    }

    await this.responseHelper.successWithMeta(res, 'success.closure.listRetrieved', closures, { total: closures.length, businessId, filter: active || 'all' }, 200, req);
  }

  async createMyEmergencyClosure(req: BusinessContextRequest, res: Response): Promise<void> {
    const { reason, endDate } = req.body;
    const userId = req.user!.id;
    const businessId = req.businessContext!.primaryBusinessId!;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new AppError('VALIDATION_ERROR', { message: 'Emergency reason must be at least 5 characters' });
    }

    const start = new Date();
    let end: Date | undefined;

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
      }
    }

    const closure = await this.businessClosureService.createClosure(userId, businessId, {
      startDate: start.toISOString().split('T')[0],
      endDate: end?.toISOString().split('T')[0],
      reason: reason.trim(),
      type: ClosureType.EMERGENCY
    });

    await this.responseHelper.success(res, 'success.closure.emergencyCreated', closure, 201, req);
  }

  async createMyMaintenanceClosure(req: BusinessContextRequest, res: Response): Promise<void> {
    const { startDate, endDate, reason } = req.body;
    const userId = req.user!.id;
    const businessId = req.businessContext!.primaryBusinessId!;

    if (!startDate || !endDate || !reason) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate, endDate, and reason are required for maintenance closure', params: { field: 'startDate,endDate,reason' } });
    }

    const closure = await this.businessClosureService.createClosure(userId, businessId, {
      startDate,
      endDate,
      reason: reason.trim(),
      type: ClosureType.MAINTENANCE
    });

    await this.responseHelper.success(res, 'success.closure.maintenanceCreated', closure, 201, req);
  }

  // Enhanced Closure System Endpoints

  async createEnhancedClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;
    const closureData = req.body as CreateEnhancedClosureRequest;

    const closure = await this.businessClosureService.createClosure(userId, businessId, {
      startDate: closureData.startDate,
      endDate: closureData.endDate,
      reason: closureData.reason,
      type: closureData.type
    });

    if (closureData.notifyCustomers && closureData.notificationChannels.length > 0) {
      const affectedAppointments = await this.appointmentRescheduleService.getAffectedAppointments(closure.id);

      for (const appointment of affectedAppointments) {
        const businessName = appointment.business?.name || closure.businessName || 'Unknown Business';
        const enhancedClosureData = {
          id: closure.id,
          businessId: closure.businessId,
          businessName,
          startDate: closure.startDate,
          endDate: closure.endDate || new Date(),
          reason: closure.reason,
          type: closure.type,
          message: closureData.notificationMessage,
          isRecurring: false,
          affectedAppointments: 0,
          rescheduledAppointments: 0,
          cancelledAppointments: 0,
          totalRevenueImpact: 0
        };

        await this.notificationService.sendClosureNotification(
          appointment.customerId,
          enhancedClosureData,
          closureData.notificationChannels
        );
      }
    }

    await this.responseHelper.success(res, 'success.closure.created', closure, 201, req);
  }

  async sendClosureNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;
    const { channels, message } = req.body as NotificationRequest;

    const affectedAppointments = await this.appointmentRescheduleService.getAffectedAppointments(closureId);
    const results = [];

    for (const appointment of affectedAppointments) {
      const businessName = appointment.business?.name || 'Unknown Business';
      const enhancedClosureData = {
        id: closureId,
        businessId: appointment.businessId,
        businessName,
        startDate: appointment.startTime,
        endDate: new Date(),
        reason: 'Business closure notification',
        type: ClosureType.OTHER,
        message,
        isRecurring: false,
        affectedAppointments: 0,
        rescheduledAppointments: 0,
        cancelledAppointments: 0,
        totalRevenueImpact: 0
      };

      const result = await this.notificationService.sendClosureNotification(
        appointment.customerId,
        enhancedClosureData,
        channels
      );
      results.push(result);
    }

    await this.responseHelper.success(res, 'success.closure.notificationsSent', { notificationsSent: results.length, results }, 200, req);
  }

  async getAffectedAppointmentsForClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;

    const appointments = await this.appointmentRescheduleService.getAffectedAppointments(closureId);

    await this.responseHelper.successWithMeta(res, 'success.closure.affectedAppointmentsRetrieved', appointments, { total: appointments.length, closureId }, 200, req);
  }

  async generateRescheduleSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;
    const userId = req.user!.id;

    const closure = await this.businessClosureService.getClosureById(userId, closureId);
    if (!closure) {
      throw new AppError('CLOSURE_NOT_FOUND', { message: `Closure ${closureId} not found` });
    }

    const affectedAppointments = await this.appointmentRescheduleService.getAffectedAppointments(closureId);
    const suggestions = [];

    for (const appointment of affectedAppointments) {
      const closureData = {
        id: closure.id,
        businessId: closure.businessId,
        startDate: closure.startDate,
        endDate: closure.endDate || undefined,
        type: closure.type,
        reason: closure.reason
      };

      const appointmentSuggestions = await this.appointmentRescheduleService.generateRescheduleSuggestions(
        appointment.id,
        closureData
      );
      suggestions.push(...appointmentSuggestions);
    }

    await this.responseHelper.successWithMeta(res, 'success.closure.rescheduleSuggestionsRetrieved', suggestions, { total: suggestions.length, closureId }, 200, req);
  }

  async autoRescheduleAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;
    const rescheduleOptions = req.body as RescheduleOptionsRequest;

    const results = await this.appointmentRescheduleService.autoRescheduleAppointments(
      closureId,
      {
        ...rescheduleOptions,
        businessHoursOnly: rescheduleOptions.businessHoursOnly ?? true,
        respectStaffAvailability: rescheduleOptions.respectStaffAvailability ?? true,
        maxSuggestions: rescheduleOptions.maxSuggestions ?? 3
      }
    );

    const stats = {
      totalProcessed: results.length,
      rescheduled: results.filter(r => r.status === 'RESCHEDULED').length,
      suggested: results.filter(r => r.status === 'SUGGESTED').length,
      failed: results.filter(r => r.status === 'FAILED').length
    };

    await this.responseHelper.success(res, 'success.closure.autoRescheduled', { results, statistics: stats }, 200, req);
  }

  async getClosureAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate and endDate are required', params: { field: 'startDate,endDate' } });
    }

    const period = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const analytics = await this.closureAnalyticsService.getClosureImpactAnalytics(businessId, period);

    await this.responseHelper.successWithMeta(res, 'success.closure.analyticsRetrieved', analytics, { businessId, period }, 200, req);
  }

  async getCustomerImpactReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;

    const report = await this.closureAnalyticsService.getCustomerImpactReport(closureId);

    await this.responseHelper.success(res, 'success.closure.customerImpactRetrieved', report, 200, req);
  }

  async getRevenueImpactAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { closureId } = req.query;
    const userId = req.user!.id;

    if (!closureId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'closureId is required', params: { field: 'closureId' } });
    }

    const closure = await this.businessClosureService.getClosureById(userId, closureId as string);
    if (!closure) {
      throw new AppError('CLOSURE_NOT_FOUND', { message: `Closure ${closureId} not found` });
    }

    const closureData = {
      id: closure.id,
      businessId: closure.businessId,
      startDate: closure.startDate,
      endDate: closure.endDate || undefined,
      type: closure.type,
      reason: closure.reason
    };

    const impact = await this.closureAnalyticsService.getRevenueImpactAnalysis(businessId, closureData);

    await this.responseHelper.success(res, 'success.closure.revenueImpactRetrieved', impact, 200, req);
  }

  async createAvailabilityAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    const alertRequest = req.body as AvailabilityAlertRequest;
    const userId = req.user!.id;

    if (alertRequest.customerId !== userId) {
      throw new AppError('ACCESS_DENIED', { message: 'Can only create alerts for your own account' });
    }

    const preferredDates = alertRequest.preferredDates.map(date => ({
      startDate: new Date(date.startDate),
      endDate: new Date(date.endDate)
    }));

    const alertId = await this.notificationService.createAvailabilityAlert(
      alertRequest.customerId,
      alertRequest.businessId,
      alertRequest.serviceId || null,
      preferredDates,
      alertRequest.notificationChannels
    );

    await this.responseHelper.success(res, 'success.closure.availabilityAlertCreated', { alertId }, 201, req);
  }

  async deactivateAvailabilityAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { alertId } = req.params;
    const userId = req.user!.id;

    await this.notificationService.deactivateAvailabilityAlert(alertId, userId);

    await this.responseHelper.success(res, 'success.closure.availabilityAlertDeactivated', undefined, 200, req);
  }

  async getNotificationDeliveryStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;

    const stats = await this.notificationService.getNotificationDeliveryStats(closureId);

    await this.responseHelper.success(res, 'success.closure.notificationStatsRetrieved', stats, 200, req);
  }

  async getRescheduleStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { closureId } = req.params;

    const stats = await this.appointmentRescheduleService.getRescheduleStatistics(closureId);

    await this.responseHelper.success(res, 'success.closure.rescheduleStatsRetrieved', stats, 200, req);
  }

  async getClosureImpactPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, startDate, endDate, services } = req.body;
    const userId = req.user!.id;

    if (!businessId || !startDate) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'businessId and startDate are required', params: { field: 'businessId,startDate' } });
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
    }

    let end: Date | undefined;
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
      }
    }

    let affectedAppointments: AppointmentData[] = [];
    if (end && end > start) {
      affectedAppointments = await this.businessClosureService.getAffectedAppointments(
        userId, businessId, start, end
      );
    }

    const totalRevenue = affectedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);

    const period = { startDate: start, endDate: end || start };

    let analytics;
    try {
      analytics = await this.closureAnalyticsService.getClosureImpactAnalytics(businessId, period);
    } catch {
      analytics = {
        totalClosures: 1,
        totalAffectedAppointments: affectedAppointments.length,
        estimatedRevenueLoss: totalRevenue,
        customerImpact: {
          uniqueCustomers: new Set(affectedAppointments.map(apt => apt.customerId)).size,
          repeatCustomers: 0
        }
      };
    }

    await this.responseHelper.success(res, 'success.closure.impactPreviewGenerated', {
      impactSummary: {
        affectedAppointments: affectedAppointments.length,
        uniqueCustomers: new Set(affectedAppointments.map(apt => apt.customerId)).size,
        estimatedRevenueLoss: totalRevenue,
        period: { startDate: start.toISOString(), endDate: end?.toISOString() }
      },
      affectedAppointments: affectedAppointments.slice(0, 10),
      analytics,
      recommendations: {
        suggestNotifyCustomers: affectedAppointments.length > 0,
        suggestReschedule: affectedAppointments.length > 0,
        highImpact: affectedAppointments.length > 5 || totalRevenue > 1000
      }
    }, 200, req);
  }
}
