import { NextFunction, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  appointmentSearchSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../schemas/business.schemas';
import { AppointmentService } from '../services/domain/appointment';
import { ResponseHelper } from '../utils/responseHelper';
import { AppointmentStatus } from '../types/business';
import { AuthenticatedRequest, BusinessOwnershipRequest } from '../types/request';
import { AppError } from '../types/responseTypes';

import { formatDateForAPI, formatTimeForAPI } from '../utils/timezoneHelper';
import logger from '../utils/Logger/logger';
import { getAppointmentStatusLabelTr } from '../utils/appointmentStatusLabels';

const noopNext: NextFunction = (() => undefined) as NextFunction;
export class AppointmentController {
  constructor(
    private appointmentService: AppointmentService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Get user's appointments - staff see only their own, owners/managers see all (with optional staff filter)
   * GET /api/v1/appointments/my-appointments
   * Query params:
   *   - staffId: (owners/managers only) Filter by specific staff member
   *   - status, date, businessId: Standard filters
   */
  //checked
  async getMyAppointments(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
    const userId = req.user!.id;

      // SECURITY: Validate and sanitize all query parameters
      const validatedQuery = appointmentSearchSchema.parse(req.query);

      // Log the request for security monitoring
      logger.info('Appointment query request', {
        userId,
        query: validatedQuery,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const result = await this.appointmentService.getMyAppointments(userId, validatedQuery);

      // Simple transformation in controller (consistent with other methods)
      const formattedAppointments = result.appointments.map((apt) => ({
        ...apt,
        date: formatDateForAPI(apt.date),
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime),
        statusLabel: getAppointmentStatusLabelTr(apt.status),
      }));

      await this.responseHelper.success(
        res,
        'success.appointment.retrievedList',
        {
          appointments: formattedAppointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
        200,
        req
      );
  }

  async createAppointment(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const validatedData = createAppointmentSchema.parse(req.body);
    const userId = req.user!.id;

    const appointment = await this.appointmentService.createAppointment(userId, validatedData);

    await this.responseHelper.success(res, 'success.appointment.created', appointment, 201, req);
  }

  async getAppointmentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // SECURITY: Validate appointment ID format
    if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
    }

    // Validate ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id)) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
    }

    const appointment = await this.appointmentService.getAppointmentById(userId, id);

    if (!appointment) {
      throw new AppError('APPOINTMENT_NOT_FOUND', { message: 'Appointment not found' });
    }

    await this.responseHelper.success(
      res,
      'success.appointment.retrieved',
      {
        ...appointment,
        statusLabel: getAppointmentStatusLabelTr(appointment.status),
      },
      200,
      req
    );
  }

  async getCustomerAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { customerId } = req.params;
    const userId = req.user!.id;

    // SECURITY: Validate customer ID format
    if (
      customerId &&
      (typeof customerId !== 'string' || customerId.length < 1 || customerId.length > 50)
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid customer ID', params: { field: 'customerId' } });
    }

    // Validate customer ID format if provided
    if (customerId) {
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(customerId)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid customer ID format', params: { field: 'customerId' } });
      }
    }

      // SECURITY: Validate pagination parameters
      const page = Math.max(1, Math.min(1000, parseInt(req.query.page as string) || 1));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));

      const statusParam = req.query.status as string | undefined;
      let status: AppointmentStatus | undefined;
      if (statusParam && Object.values(AppointmentStatus).includes(statusParam as AppointmentStatus)) {
        status = statusParam as AppointmentStatus;
      }

      const result = await this.appointmentService.getCustomerAppointments(
        userId,
        customerId || userId,
        page,
        limit,
        status
      );

      await this.responseHelper.success(
        res,
        'success.appointment.customerRetrieved',
        {
          appointments: result.appointments.map((apt) => ({
            ...apt,
            startTime: formatTimeForAPI(new Date(apt.startTime)),
            endTime: formatTimeForAPI(new Date(apt.endTime)),
            date: formatDateForAPI(new Date(apt.date)),
            statusLabel: getAppointmentStatusLabelTr(apt.status),
          })),
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
        },
        200,
        req
      );
  }

  /**
   * Get appointments for a specific staff member (for owners/managers)
   * GET /api/v1/appointments/staff/:staffId
   */
  async getStaffAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const { status, date, page, limit } = req.query;

      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Staff ID is required', params: { field: 'staffId' } });
      }

      // Validate staffId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid staff ID format', params: { field: 'staffId' } });
      }

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const result = await this.appointmentService.searchAppointments(
        userId,
        {
          staffId,
          status: status as AppointmentStatus,
          startDate: date as string,
        },
        pageNum,
        limitNum
      );

      await this.responseHelper.success(
        res,
        'success.appointment.staffRetrieved',
        {
          appointments: result.appointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          staffId,
        },
        200,
        req
      );
  }

  async getBusinessAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      // Business ownership already validated by middleware
      const businessId = req.params.businessId;
      const business = (req as BusinessOwnershipRequest).business; // Properly typed business object
      const userId = req.user!.id;
      const { staffId } = req.query; // Optional staff filter
      const page = Math.max(1, Math.min(1000, parseInt(req.query.page as string) || 1));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));

      // Type-safe access to business properties
      logger.info('Fetching appointments for business', {
        businessId: business.id,
        businessName: business.name,
        ownerId: business.ownerId,
        userId,
        staffId: staffId as string | undefined,
      });

      const result = await this.appointmentService.getBusinessAppointments(
        userId,
        businessId,
        page,
        limit,
        staffId as string | undefined
      );

      await this.responseHelper.success(
        res,
        'success.appointment.businessRetrieved',
        {
          appointments: result.appointments,
          meta: {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            limit,
            businessId,
            businessName: business.name,
            ...(staffId && { staffId }), // Include staffId in meta if filtered
          },
        },
        200,
        req
      );
  }

  async searchAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
      const validatedQuery = appointmentSearchSchema.parse(req.query);
      const userId = req.user!.id;

      const { page = 1, limit = 20, ...filters } = validatedQuery;

      const result = await this.appointmentService.searchAppointments(userId, filters, page, limit);

      await this.responseHelper.success(
        res,
        'success.appointment.searchCompleted',
        {
          appointments: result.appointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          filters,
        },
        200,
        req
      );
  }

  async updateAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const validatedData = updateAppointmentSchema.parse(req.body);
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
      }

      const appointment = await this.appointmentService.updateAppointment(
        userId,
        id,
        validatedData
      );

      await this.responseHelper.success(res, 'success.appointment.updated', appointment, 200, req);
  }

  async updateAppointmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
      }

      // Validate status
      if (!Object.values(AppointmentStatus).includes(status)) {
        throw new AppError('VALIDATION_ERROR', { message: `Invalid status. Must be one of: ${Object.values(AppointmentStatus).join(', ')}` });
      }

      const appointment = await this.appointmentService.updateAppointment(userId, id, { status });

      await this.responseHelper.success(
        res,
        'success.appointment.statusUpdated',
        appointment,
        200,
        req,
        { status }
      );
  }

  async cancelAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
      }

      // Validate reason if provided
      if (reason && (typeof reason !== 'string' || reason.trim().length > 500)) {
        throw new AppError('VALIDATION_ERROR', { message: 'Reason must be a string and not exceed 500 characters' });
      }

      const appointment = await this.appointmentService.cancelAppointment(userId, id, reason);

      await this.responseHelper.success(
        res,
        'success.appointment.cancelled',
        appointment,
        200,
        req
      );
  }

  async confirmAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
      }

      const appointment = await this.appointmentService.confirmAppointment(userId, id);

      await this.responseHelper.success(
        res,
        'success.appointment.confirmed',
        appointment,
        200,
        req
      );
  }

  async completeAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const { internalNotes } = req.body;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
      }

      // Validate internalNotes if provided
      if (
        internalNotes &&
        (typeof internalNotes !== 'string' || internalNotes.trim().length > 1000)
      ) {
        throw new AppError('VALIDATION_ERROR', { message: 'Internal notes must be a string and not exceed 1000 characters' });
      }

      const appointment = await this.appointmentService.completeAppointment(
        userId,
        id,
        internalNotes
      );

      await this.responseHelper.success(
        res,
        'success.appointment.completed',
        appointment,
        200,
        req
      );
  }

  async markNoShow(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID is required', params: { field: 'id' } });
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid appointment ID format', params: { field: 'id' } });
      }

      const appointment = await this.appointmentService.markNoShow(userId, id);

      await this.responseHelper.success(
        res,
        'success.appointment.markedNoShow',
        appointment,
        200,
        req
      );
  }

  async approveAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.approveAppointment(userId, id);

      await this.responseHelper.success(
        res,
        'success.appointment.approved',
        appointment,
        200,
        req
      );
  }

  async rejectAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { id } = req.params;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.rejectAppointment(userId, id);

      await this.responseHelper.success(
        res,
        'success.appointment.rejected',
        appointment,
        200,
        req
      );
  }

  async getUpcomingAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
      const userId = req.user!.id;
      const { limit } = req.query;

      // Validate limit parameter
      let limitNum = 10;
      if (limit) {
        limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          throw new AppError('VALIDATION_ERROR', { message: 'Limit must be between 1 and 100' });
        }
      }

      const appointments = await this.appointmentService.getUpcomingAppointments(userId, limitNum);

      await this.responseHelper.success(
        res,
        'success.appointment.upcomingRetrieved',
        {
          appointments,
          total: appointments.length,
          limit: limitNum,
        },
        200,
        req
      );
  }

  async getTodaysAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      // Business ownership already validated by middleware
      const businessId = req.params.businessId;
      const business = (req as BusinessOwnershipRequest).business; // Properly typed business object
      const userId = req.user!.id;

      logger.info("Fetching today's appointments for business", {
        businessId: business.id,
        businessName: business.name,
        ownerId: business.ownerId,
        userId,
      });

      const appointments = await this.appointmentService.getTodaysAppointments(userId, businessId);

      // Simple transformation in controller (consistent with other methods)
      const cleanedAppointments = appointments.map((apt) => ({
        ...apt,
        date: formatDateForAPI(apt.date),
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime),
      }));

      await this.responseHelper.success(
        res,
        'success.appointment.todaysRetrieved',
        {
          appointments: cleanedAppointments,
          meta: {
            total: cleanedAppointments.length,
            businessId: business.id,
            businessName: business.name,
            date: new Date().toISOString().split('T')[0],
          },
        },
        200,
        req
      );
  }

  async getMyTodaysAppointments(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      const userId = req.user!.id;
      const businessContext = req.businessContext;

      if (!businessContext || businessContext.businessIds.length === 0) {
        throw new AppError('NO_BUSINESS_ACCESS', { message: 'No businesses found for user' });
      }

      // Get today's appointments for all user's businesses
      const allAppointments = [];
      for (const businessId of businessContext.businessIds) {
        try {
          const appointments = await this.appointmentService.getTodaysAppointments(
            userId,
            businessId
          );
          allAppointments.push(...appointments);
        } catch (error) {
          logger.warn('Failed to fetch appointments for business', {
            businessId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Simple transformation in controller (consistent with other methods)
      const cleanedAppointments = allAppointments.map((apt) => ({
        ...apt,
        date: formatDateForAPI(apt.date),
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime),
      }));

      await this.responseHelper.success(
        res,
        'success.appointment.todaysRetrieved',
        {
          appointments: cleanedAppointments,
          meta: {
            total: cleanedAppointments.length,
            businessIds: businessContext.businessIds,
            date: new Date().toISOString().split('T')[0],
          },
        },
        200,
        req
      );
  }

  async getAppointmentStats(req: BusinessContextRequest, res: Response): Promise<void> {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      // Business access validation is now handled by middleware

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
        }
      }

      // Use context-based approach - if businessId is 'my', get stats for all accessible businesses
      const requestedBusinessId = businessId === 'my' ? undefined : businessId;
      const stats = await this.appointmentService.getAppointmentStats(
        userId,
        requestedBusinessId,
        start,
        end
      );

      await this.responseHelper.success(
        res,
        'success.appointment.statsRetrieved',
        {
          stats,
          businessId: requestedBusinessId || 'all',
          accessibleBusinesses: req.businessContext?.businessIds.length || 0,
          startDate: startDate as string,
          endDate: endDate as string,
        },
        200,
        req
      );
  }

  // Admin endpoints
  async getAllAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
      const userId = req.user!.id;
      const { page, limit } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const result = await this.appointmentService.getAllAppointments(userId, pageNum, limitNum);

      await this.responseHelper.success(
        res,
        'success.appointment.allRetrieved',
        {
          appointments: result.appointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: limitNum,
        },
        200,
        req
      );
  }

  async batchUpdateAppointmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { appointmentIds, status } = req.body;
      const userId = req.user!.id;

      // Validate appointmentIds array
      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'appointmentIds array is required', params: { field: 'appointmentIds' } });
      }

      // Validate array size limit
      if (appointmentIds.length > 50) {
        throw new AppError('BATCH_SIZE_EXCEEDED', { message: 'Cannot process more than 50 appointments at once' });
      }

      // Validate status
      if (!Object.values(AppointmentStatus).includes(status)) {
        throw new AppError('VALIDATION_ERROR', { message: 'Invalid appointment status' });
      }

      // Validate each appointment ID in the array
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      for (const appointmentId of appointmentIds) {
        if (
          !appointmentId ||
          typeof appointmentId !== 'string' ||
          !idRegex.test(appointmentId) ||
          appointmentId.length < 1 ||
          appointmentId.length > 50
        ) {
          throw new AppError('VALIDATION_ERROR', { message: 'Invalid appointment ID format in appointmentIds array' });
        }
      }

      await this.appointmentService.batchUpdateAppointmentStatus(userId, appointmentIds, status);

      await this.responseHelper.success(
        res,
        'success.appointment.batchUpdated',
        undefined,
        200,
        req,
        { count: appointmentIds.length }
      );
  }

  async batchCancelAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { appointmentIds, reason } = req.body;
      const userId = req.user!.id;

      // Validate appointmentIds array
      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'appointmentIds array is required', params: { field: 'appointmentIds' } });
      }

      // Validate array size limit
      if (appointmentIds.length > 50) {
        throw new AppError('BATCH_SIZE_EXCEEDED', { message: 'Cannot process more than 50 appointments at once' });
      }

      // Validate reason
      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 5 characters long' });
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        throw new AppError('VALIDATION_ERROR', { message: 'Reason must not exceed 500 characters' });
      }

      // Validate each appointment ID in the array
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      for (const appointmentId of appointmentIds) {
        if (
          !appointmentId ||
          typeof appointmentId !== 'string' ||
          !idRegex.test(appointmentId) ||
          appointmentId.length < 1 ||
          appointmentId.length > 50
        ) {
          throw new AppError('VALIDATION_ERROR', { message: 'Invalid appointment ID format in appointmentIds array' });
        }
      }

      await this.appointmentService.batchCancelAppointments(userId, appointmentIds, reason);

      await this.responseHelper.success(
        res,
        'success.appointment.batchCancelled',
        undefined,
        200,
        req,
        { count: appointmentIds.length }
      );
  }

  // Utility endpoints
  async getAppointmentsByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
      }

      if (!startDate || !endDate) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'startDate and endDate are required', params: { field: 'startDate, endDate' } });
      }

      // Validate date formats
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid date format' });
      }

      const filters = {
        businessId,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      // SECURITY: Use permission-aware service method to prevent cross-business data exposure
      const result = await this.appointmentService.searchAppointments(userId, filters, 1, 1000);

      // Use service method to format data for public access (timezone handling is business logic)
      const sanitizedAppointments = result.appointments.map((apt) => ({
        id: apt.id,
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime),
        duration: apt.duration,
        status: apt.status,
      }));

      await this.responseHelper.success(
        res,
        'success.appointment.byDateRange',
        {
          appointments: sanitizedAppointments,
          total: result.total,
          businessId,
          startDate: startDate as string,
          endDate: endDate as string,
        },
        200,
        req
      );
  }

  async getAppointmentsByStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { businessId, status } = req.params;
      const userId = req.user!.id;
      const { page, limit } = req.query;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
      }

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        throw new AppError('VALIDATION_ERROR', { message: 'Invalid appointment status' });
      }

      const filters = {
        businessId,
        status: status as AppointmentStatus,
      };

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        pageNum,
        limitNum
      );

      await this.responseHelper.success(
        res,
        'success.appointment.byStatus',
        {
          appointments: result.appointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: limitNum,
          businessId,
          status,
        },
        200,
        req
      );
  }

  async getAppointmentsByService(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { serviceId } = req.params;
      const userId = req.user!.id;
      const { page, limit } = req.query;

      // Validate serviceId parameter
      if (!serviceId || typeof serviceId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'serviceId' } });
      }

      // Validate serviceId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'serviceId' } });
      }

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const filters = { serviceId };

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        pageNum,
        limitNum
      );

      await this.responseHelper.success(
        res,
        'success.appointment.byService',
        {
          appointments: result.appointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: limitNum,
          serviceId,
        },
        200,
        req
      );
  }

  async getAppointmentsByStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const { page, limit } = req.query;

      // Validate staffId parameter
      if (!staffId || typeof staffId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Staff ID is required', params: { field: 'staffId' } });
      }

      // Validate staffId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(staffId) || staffId.length < 1 || staffId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid staff ID format', params: { field: 'staffId' } });
      }

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const filters = { staffId };

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        pageNum,
        limitNum
      );

      await this.responseHelper.success(
        res,
        'success.appointment.byStaff',
        {
          appointments: result.appointments,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: limitNum,
          staffId,
        },
        200,
        req
      );
  }

  /**
   * Get nearest appointment in current hour for the authenticated user
   * GET /api/v1/appointments/nearest-current-hour
   */
  async getNearestCurrentHour(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      const userId = req.user!.id;

      const appointment = await this.appointmentService.getNearestAppointmentInCurrentHour(userId);

      if (!appointment) {
        await this.responseHelper.success(
          res,
          'success.appointment.currentHourNone',
          null,
          200,
          req
        );
        return;
      }

      await this.responseHelper.success(
        res,
        'success.appointment.currentHourNearest',
        {
          id: appointment.id,
          businessId: appointment.businessId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          service: {
            id: appointment.service.id,
            name: appointment.service.name,
            duration: appointment.service.duration,
          },
          business: {
            id: appointment.business.id,
            name: appointment.business.name,
            timezone: appointment.business.timezone,
          },
          timeUntilAppointment: Math.max(0, appointment.startTime.getTime() - Date.now()),
        },
        200,
        req
      );
  }

  /**
   * Get all appointments in current hour for the authenticated user
   * GET /api/v1/appointments/current-hour
   */
  async getCurrentHourAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      const userId = req.user!.id;

      const appointments = await this.appointmentService.getAppointmentsInCurrentHour(userId);

      await this.responseHelper.success(res, 'success.appointment.currentHourRetrieved', {
        appointments: appointments.map((appointment) => ({
          id: appointment.id,
          businessId: appointment.businessId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          service: {
            id: appointment.service.id,
            name: appointment.service.name,
            duration: appointment.service.duration,
          },
          business: {
            id: appointment.business.id,
            name: appointment.business.name,
            timezone: appointment.business.timezone,
          },
          timeUntilAppointment: Math.max(0, appointment.startTime.getTime() - Date.now()),
        })),
        count: appointments.length,
        currentHour: new Date().getHours(),
      });
  }

  /**
   * Get monitor appointments for a business
   * GET /api/v1/appointments/monitor/:businessId
   * Optimized endpoint for real-time queue display on monitor screens
   */
  async getMonitorAppointments(
    req: BusinessOwnershipRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      const { businessId } = req.params;
      const { date, includeStats, maxQueueSize, staffId: staffIdQuery } = req.query;
      const userId = req.user!.id;

      // Business ownership already validated by middleware
      const business = req.business;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
      }

      // Validate maxQueueSize if provided
      let queueSize = 10;
      if (maxQueueSize) {
        queueSize = parseInt(maxQueueSize as string, 10);
        if (isNaN(queueSize) || queueSize < 1 || queueSize > 100) {
          throw new AppError('VALIDATION_ERROR', { message: 'maxQueueSize must be between 1 and 100' });
        }
      }

      logger.info('Fetching monitor appointments for business', {
        businessId: business.id,
        businessName: business.name,
        date: date as string | undefined,
        includeStats: includeStats as string | undefined,
      });

      const monitorData = await this.appointmentService.getMonitorAppointments(
        businessId,
        userId,
        date as string | undefined,
        staffIdQuery as string | undefined,
        includeStats === 'true' || includeStats === '1',
        queueSize
      );

      await this.responseHelper.success(
        res,
        'success.appointment.monitorRetrieved',
        monitorData,
        200,
        req
      );
  }

  /**
   * Get available time slots for booking (PUBLIC - no authentication required)
   * GET /api/v1/public/businesses/:businessId/available-slots
   * Query params:
   *   - date: YYYY-MM-DD (required)
   *   - serviceId: string (required)
   *   - staffId: string (optional)
   */
  async getPublicAvailableSlots(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction = noopNext
  ): Promise<void> {
      const { businessId } = req.params;
      const { date, serviceId, staffId } = req.query;

      // Validate required parameters
      if (!date || typeof date !== 'string') {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Date is required and must be in YYYY-MM-DD format' });
      }

      if (!serviceId || typeof serviceId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'serviceId' } });
      }

      if (!businessId || typeof businessId !== 'string') {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
      }

      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
      }

      if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'serviceId' } });
      }

      if (
        staffId &&
        (typeof staffId !== 'string' ||
          !idRegex.test(staffId) ||
          staffId.length < 1 ||
          staffId.length > 50)
      ) {
        throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid staff ID format', params: { field: 'staffId' } });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid date format. Use YYYY-MM-DD' });
      }

      logger.info('Fetching available slots for public booking', {
        businessId,
        date,
        serviceId,
        staffId: staffId || 'any',
        ip: req.ip,
      });

      const availableSlots = await this.appointmentService.getPublicAvailableSlots({
        businessId,
        serviceId,
        date,
        staffId: staffId as string | undefined,
      });

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      await this.responseHelper.success(
        res,
        'success.appointment.availableSlotsRetrieved',
        availableSlots,
        200,
        req
      );
  }
}
