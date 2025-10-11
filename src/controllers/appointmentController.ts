import { NextFunction, Response } from "express";
import { BusinessContextRequest } from "../middleware/businessContext";
import {
  appointmentSearchSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "../schemas/business.schemas";
import { AppointmentService } from "../services/domain/appointment";
import { AuthenticatedRequest, BusinessOwnershipRequest } from "../types/request";
import { AppointmentStatus } from "../types/business";
import logger from "../utils/Logger/logger";
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from "../types/responseTypes";
import { ERROR_CODES } from "../constants/errorCodes";
import { formatDateForAPI, formatTimeForAPI } from '../utils/timezoneHelper';

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

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
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      // SECURITY: Validate and sanitize all query parameters
      const validatedQuery = appointmentSearchSchema.parse(req.query);

      // Log the request for security monitoring
      logger.info("Appointment query request", {
        userId,
        query: validatedQuery,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      const result = await this.appointmentService.getMyAppointments(
        userId,
        validatedQuery
      );

      // Simple transformation in controller (consistent with other methods)
      const formattedAppointments = result.appointments.map(apt => ({
        ...apt,
        date: formatDateForAPI(apt.date),
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime)
      }));

      sendSuccessResponse(res, 'Appointments retrieved successfully', {
        appointments: formattedAppointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });

    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async createAppointment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      const userId = req.user!.id;

      const appointment = await this.appointmentService.createAppointment(
        userId,
        validatedData
      );

      sendSuccessResponse(res, "Appointment created successfully", appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getAppointmentById(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // SECURITY: Validate appointment ID format
      if (!id || typeof id !== "string" || id.length < 1 || id.length > 50) {
        const error = new AppError(
          "Invalid appointment ID",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          "Invalid appointment ID format",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.getAppointmentById(
        userId,
        id
      );

      if (!appointment) {
        const error = new AppError(
          'Appointment not found',
          404,
          ERROR_CODES.APPOINTMENT_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      sendSuccessResponse(res, 'Appointment retrieved successfully', appointment);
    } catch (error) {
      // SECURITY: Log error for monitoring
      logger.error("Failed to get appointment by ID", {
        userId: req.user?.id,
        appointmentId: req.params.id,
        error: error instanceof Error ? error.message : "Unknown error",
        ip: req.ip,
      });

      handleRouteError(error, req, res);
    }
  }

  async getCustomerAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { customerId } = req.params;
      const userId = req.user!.id;

      // SECURITY: Validate customer ID format
      if (
        customerId &&
        (typeof customerId !== "string" ||
          customerId.length < 1 ||
          customerId.length > 50)
      ) {
        const error = new AppError(
          "Invalid customer ID",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate customer ID format if provided
      if (customerId) {
        const idRegex = /^[a-zA-Z0-9-_]+$/;
        if (!idRegex.test(customerId)) {
          const error = new AppError(
            "Invalid customer ID format",
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // SECURITY: Validate pagination parameters
      const page = Math.max(
        1,
        Math.min(1000, parseInt(req.query.page as string) || 1)
      );
      const limit = Math.max(
        1,
        Math.min(100, parseInt(req.query.limit as string) || 20)
      );

      const result = await this.appointmentService.getCustomerAppointments(
        userId,
        customerId || userId,
        page,
        limit
      );

      sendSuccessResponse(res, 'Customer appointments retrieved successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit,
      });
    } catch (error) {
      // SECURITY: Log error for monitoring
      logger.error("Failed to get customer appointments", {
        userId: req.user?.id,
        customerId: req.params.customerId,
        error: error instanceof Error ? error.message : "Unknown error",
        ip: req.ip,
      });

      handleRouteError(error, req, res);
    }
  }

  /**
   * Get appointments for a specific staff member (for owners/managers)
   * GET /api/v1/appointments/staff/:staffId
   */
  async getStaffAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const { status, date, page, limit } = req.query;

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

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const filters = {
        status: status as AppointmentStatus,
        date: date as string,
        page: pageNum,
        limit: limitNum,
      };

      const result = await this.appointmentService.getAllAppointments(
        userId,
        filters.page,
        filters.limit
      );

      sendSuccessResponse(res, 'Staff appointments retrieved successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        staffId,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getBusinessAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Business ownership already validated by middleware
      const businessId = req.params.businessId;
      const business = (req as BusinessOwnershipRequest).business; // Properly typed business object
      const userId = req.user!.id;
      const { staffId } = req.query; // Optional staff filter
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Type-safe access to business properties
      logger.info("Fetching appointments for business", {
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
        limit
      );

      sendSuccessResponse(
        res,
        "Business appointments retrieved successfully",
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
        }
      );
    } catch (error) {
      handleRouteError(error, req, res, next);
    }
  }

  async searchAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const validatedQuery = appointmentSearchSchema.parse(req.query);
      const userId = req.user!.id;

      const { page = 1, limit = 20, ...filters } = validatedQuery;

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        page,
        limit
      );

      sendSuccessResponse(res, 'Appointments search completed successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit,
        filters,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateAppointment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateAppointmentSchema.parse(req.body);
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Appointment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          'Invalid appointment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.updateAppointment(
        userId,
        id,
        validatedData
      );

      sendSuccessResponse(res, "Appointment updated successfully", appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateAppointmentStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Appointment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          'Invalid appointment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate status
      const validStatuses = ["CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"];
      if (!validStatuses.includes(status)) {
        const error = new AppError(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.updateAppointment(
        userId,
        id,
        { status }
      );

      sendSuccessResponse(res, `Appointment status updated to ${status}`, appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async cancelAppointment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Appointment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          'Invalid appointment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason if provided
      if (reason && (typeof reason !== 'string' || reason.trim().length > 500)) {
        const error = new AppError(
          'Reason must be a string and not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.cancelAppointment(
        userId,
        id,
        reason
      );

      sendSuccessResponse(res, "Appointment cancelled successfully", appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async confirmAppointment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Appointment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          'Invalid appointment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.confirmAppointment(
        userId,
        id
      );

      sendSuccessResponse(res, "Appointment confirmed successfully", appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async completeAppointment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { internalNotes } = req.body;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Appointment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          'Invalid appointment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate internalNotes if provided
      if (internalNotes && (typeof internalNotes !== 'string' || internalNotes.trim().length > 1000)) {
        const error = new AppError(
          'Internal notes must be a string and not exceed 1000 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.completeAppointment(
        userId,
        id,
        internalNotes
      );

      sendSuccessResponse(res, "Appointment completed successfully", appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async markNoShow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate appointment ID
      if (!id || typeof id !== 'string' || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Appointment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id)) {
        const error = new AppError(
          'Invalid appointment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const appointment = await this.appointmentService.markNoShow(userId, id);

      sendSuccessResponse(res, "Appointment marked as no-show", appointment);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getUpcomingAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit } = req.query;

      // Validate limit parameter
      let limitNum = 10;
      if (limit) {
        limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          const error = new AppError(
            'Limit must be between 1 and 100',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const appointments =
        await this.appointmentService.getUpcomingAppointments(userId, limitNum);

      sendSuccessResponse(res, 'Upcoming appointments retrieved successfully', {
        appointments,
        total: appointments.length,
        limit: limitNum,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getTodaysAppointments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
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

      const appointments = await this.appointmentService.getTodaysAppointments(
        userId,
        businessId
      );

      // Simple transformation in controller (consistent with other methods)
      const cleanedAppointments = appointments.map(apt => ({
        ...apt,
        date: formatDateForAPI(apt.date),
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime)
      }));

      sendSuccessResponse(
        res,
        "Today's appointments retrieved successfully",
        {
          appointments: cleanedAppointments,
          meta: {
            total: cleanedAppointments.length,
            businessId: business.id,
            businessName: business.name,
            date: new Date().toISOString().split("T")[0],
          },
        }
      );
    } catch (error) {
      handleRouteError(error, req, res, next);
    }
  }

  async getMyTodaysAppointments(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessContext = req.businessContext;

      if (!businessContext || businessContext.businessIds.length === 0) {
        res.status(404).json({
          success: false,
          error: "No businesses found for user",
        });
        return;
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
            // Continue with other businesses
          }
      }

      // Simple transformation in controller (consistent with other methods)
      const cleanedAppointments = allAppointments.map(apt => ({
        ...apt,
        date: formatDateForAPI(apt.date),
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime)
      }));

      sendSuccessResponse(
        res,
        "Today's appointments retrieved successfully",
        {
          appointments: cleanedAppointments,
          meta: {
            total: cleanedAppointments.length,
            businessIds: businessContext.businessIds,
            date: new Date().toISOString().split("T")[0],
          },
        }
      );
    } catch (error) {
      handleRouteError(error, req, res, next);
    }
  }

  async getAppointmentStats(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      // Business access validation is now handled by middleware

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          const error = new AppError(
            "Invalid startDate format",
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          const error = new AppError(
            "Invalid endDate format",
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Use context-based approach - if businessId is 'my', get stats for all accessible businesses
      const requestedBusinessId = businessId === "my" ? undefined : businessId;
      const stats = await this.appointmentService.getAppointmentStats(
        userId,
        requestedBusinessId,
        start,
        end
      );

      sendSuccessResponse(res, 'Appointment stats retrieved successfully', {
        stats,
        businessId: requestedBusinessId || "all",
        accessibleBusinesses: req.businessContext?.businessIds.length || 0,
        startDate: startDate as string,
        endDate: endDate as string,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Admin endpoints
  async getAllAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page, limit } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const result = await this.appointmentService.getAllAppointments(
        userId,
        pageNum,
        limitNum
      );

      sendSuccessResponse(res, 'All appointments retrieved successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limitNum,
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async batchUpdateAppointmentStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { appointmentIds, status } = req.body;
      const userId = req.user!.id;

      // Validate appointmentIds array
      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        const error = new AppError(
          'appointmentIds array is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (appointmentIds.length > 50) {
        const error = new AppError(
          'Cannot process more than 50 appointments at once',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate status
      if (!Object.values(AppointmentStatus).includes(status)) {
        const error = new AppError(
          "Invalid appointment status",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each appointment ID in the array
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      for (const appointmentId of appointmentIds) {
        if (!appointmentId || typeof appointmentId !== 'string' || !idRegex.test(appointmentId) || appointmentId.length < 1 || appointmentId.length > 50) {
          const error = new AppError(
            'Invalid appointment ID format in appointmentIds array',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      await this.appointmentService.batchUpdateAppointmentStatus(
        userId,
        appointmentIds,
        status
      );

      sendSuccessResponse(res, `${appointmentIds.length} appointments updated to ${status}`);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async batchCancelAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { appointmentIds, reason } = req.body;
      const userId = req.user!.id;

      // Validate appointmentIds array
      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        const error = new AppError(
          'appointmentIds array is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (appointmentIds.length > 50) {
        const error = new AppError(
          'Cannot process more than 50 appointments at once',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason
      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        const error = new AppError(
          'Reason must be at least 5 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason length limit
      if (reason.trim().length > 500) {
        const error = new AppError(
          'Reason must not exceed 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each appointment ID in the array
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      for (const appointmentId of appointmentIds) {
        if (!appointmentId || typeof appointmentId !== 'string' || !idRegex.test(appointmentId) || appointmentId.length < 1 || appointmentId.length > 50) {
          const error = new AppError(
            'Invalid appointment ID format in appointmentIds array',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      await this.appointmentService.batchCancelAppointments(userId, appointmentIds, reason);

      sendSuccessResponse(res, `${appointmentIds.length} appointments cancelled`);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Utility endpoints
  async getAppointmentsByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

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

      if (!startDate || !endDate) {
        const error = new AppError(
          'startDate and endDate are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date formats
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const error = new AppError(
          'Invalid date format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const filters = {
        businessId,
        startDate: startDate as string,
        endDate: endDate as string
      };

      const result = await this.appointmentService.getPublicAppointments(filters, 1, 1000);

      // Use service method to format data for public access (timezone handling is business logic)
      const sanitizedAppointments = result.appointments.map(apt => ({
        id: apt.id,
        startTime: formatTimeForAPI(apt.startTime),
        endTime: formatTimeForAPI(apt.endTime),
        duration: apt.duration,
        status: apt.status
      }));

      sendSuccessResponse(res, 'Appointments by date range retrieved successfully', {
        appointments: sanitizedAppointments,
        total: result.total,
        businessId,
        startDate: startDate as string,
        endDate: endDate as string
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getAppointmentsByStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, status } = req.params;
      const userId = req.user!.id;
      const { page, limit } = req.query;

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

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        const error = new AppError(
          'Invalid appointment status',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const filters = {
        businessId,
        status: status as AppointmentStatus
      };

      const result = await this.appointmentService.searchAppointments(userId, filters, pageNum, limitNum);

      sendSuccessResponse(res, 'Appointments by status retrieved successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limitNum,
        businessId,
        status
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getAppointmentsByService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const userId = req.user!.id;
      const { page, limit } = req.query;

      // Validate serviceId parameter
      if (!serviceId || typeof serviceId !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate serviceId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const filters = { serviceId };

      const result = await this.appointmentService.searchAppointments(userId, filters, pageNum, limitNum);

      sendSuccessResponse(res, 'Appointments by service retrieved successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limitNum,
        serviceId
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getAppointmentsByStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const { page, limit } = req.query;

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

      // Validate pagination parameters
      const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

      const filters = { staffId };

      const result = await this.appointmentService.searchAppointments(userId, filters, pageNum, limitNum);

      sendSuccessResponse(res, 'Appointments by staff retrieved successfully', {
        appointments: result.appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limitNum,
        staffId
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get nearest appointment in current hour for the authenticated user
   * GET /api/v1/appointments/nearest-current-hour
   */
  async getNearestCurrentHour(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      
      const appointment = await this.appointmentService.getNearestAppointmentInCurrentHour(userId);
      
      if (!appointment) {
        sendSuccessResponse(res, 'No appointments found in the current hour', null);
        return;
      }

      sendSuccessResponse(res, 'Nearest appointment in current hour retrieved successfully', {
        id: appointment.id,
        businessId: appointment.businessId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          duration: appointment.service.duration
        },
        business: {
          id: appointment.business.id,
          name: appointment.business.name,
          timezone: appointment.business.timezone
        },
        timeUntilAppointment: Math.max(0, appointment.startTime.getTime() - Date.now())
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all appointments in current hour for the authenticated user
   * GET /api/v1/appointments/current-hour
   */
  async getCurrentHourAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const appointments = await this.appointmentService.getAppointmentsInCurrentHour(userId);

      sendSuccessResponse(res, 'Current hour appointments retrieved successfully', {
        appointments: appointments.map(appointment => ({
          id: appointment.id,
          businessId: appointment.businessId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          service: {
            id: appointment.service.id,
            name: appointment.service.name,
            duration: appointment.service.duration
          },
          business: {
            id: appointment.business.id,
            name: appointment.business.name,
            timezone: appointment.business.timezone
          },
          timeUntilAppointment: Math.max(0, appointment.startTime.getTime() - Date.now())
        })),
        count: appointments.length,
        currentHour: new Date().getHours()
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get monitor appointments for a business
   * GET /api/v1/appointments/monitor/:businessId
   * Optimized endpoint for real-time queue display on monitor screens
   */
  async getMonitorAppointments(
    req: BusinessOwnershipRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { businessId } = req.params;
      const { date, includeStats, maxQueueSize } = req.query;

      // Business ownership already validated by middleware
      const business = req.business;

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

      // Validate maxQueueSize if provided
      let queueSize = 10;
      if (maxQueueSize) {
        queueSize = parseInt(maxQueueSize as string, 10);
        if (isNaN(queueSize) || queueSize < 1 || queueSize > 100) {
          const error = new AppError(
            'maxQueueSize must be between 1 and 100',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      logger.info("Fetching monitor appointments for business", {
        businessId: business.id,
        businessName: business.name,
        date: date as string | undefined,
        includeStats: includeStats as string | undefined
      });

      const monitorData = await this.appointmentService.getMonitorAppointments(
        businessId,
        date as string | undefined,
        includeStats === 'true' || includeStats === '1',
        queueSize
      );

      sendSuccessResponse(
        res,
        "Monitor appointments retrieved successfully",
        monitorData
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}