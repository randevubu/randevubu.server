import { Prisma } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { BusinessContextRequest } from "../middleware/businessContext";
import {
  appointmentQuerySchema,
  appointmentSearchSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "../schemas/business.schemas";
import { AppointmentService } from "../services/appointmentService";
import { AuthenticatedRequest, BusinessOwnershipRequest } from "../types/auth";
import { AppointmentStatus, AppointmentWithDetails } from "../types/business";
import logger from "../utils/Logger/logger";
import {
  extractRequestDetails,
  logError,
  logSuccess,
} from "../utils/Logger/loggerHelper";
import { CustomError } from "../utils/errors/customError";

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  /**
   * Get user's appointments - staff see only their own, owners/managers see all (with optional staff filter)
   * GET /api/v1/appointments/my-appointments
   * Query params:
   *   - staffId: (owners/managers only) Filter by specific staff member
   *   - status, date, businessId: Standard filters
   */
  //.
  async getMyAppointments(
    req: BusinessContextRequest,
    res: Response,
    next: any
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      // SECURITY: Validate and sanitize all query parameters
      const validatedQuery = appointmentQuerySchema.parse(req.query);

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

      // SECURITY: Transform appointments to remove sensitive data
      const cleanedResult = {
        ...result,
        appointments: result.appointments.map(
          (apt: AppointmentWithDetails) => ({
            id: apt.id,
            date: apt.date,
            startTime: apt.startTime,
            endTime: apt.endTime,
            duration: apt.duration,
            status: apt.status,
            price: apt.price,
            currency: apt.currency,
            customerNotes: apt.customerNotes,
            service: {
              id: apt.service.id,
              name: apt.service.name,
              duration: apt.service.duration,
            },
            staff: apt.staff
              ? {
                  firstName: apt.staff.user.firstName,
                  lastName: apt.staff.user.lastName,
                }
              : null,
            customer: apt.customer
              ? {
                  firstName: apt.customer.firstName,
                  lastName: apt.customer.lastName,
                  phoneNumber: apt.customer.phoneNumber,
                }
              : null,
          })
        ),
      };

      const response = {
        status: "success",
        message: `Successfully fetched ${cleanedResult.appointments.length} appointments`,
        data: cleanedResult,
      };

      logSuccess(`Successfully fetched appointments`, {
        requestId: (req as any).requestId || "unknown",
        userId: userId,
        source: "AppointmentController.getMyAppointments",
        requestDetails: extractRequestDetails(req),
      });

      res.status(200).json(response);
    } catch (error) {
      if (
        error instanceof z.ZodError ||
        error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof CustomError
      ) {
        logError(
          `Validation or known error fetching appointments`,
          {
            requestId: (req as any).requestId || "unknown",
            userId: req.user?.id || "anonymous",
            source: "AppointmentController.getMyAppointments",
            requestDetails: extractRequestDetails(req),
          },
          error,
          res,
          next
        );
        next(error);
      } else {
        logError(
          `Unexpected error fetching appointments`,
          {
            requestId: (req as any).requestId || "unknown",
            userId: req.user?.id || "anonymous",
            source: "AppointmentController.getMyAppointments",
            requestDetails: extractRequestDetails(req),
          },
          error,
          res,
          next
        );
        res.status(500).json({
          status: "error",
          message: "Failed to fetch appointments",
          requestId: (req as any).requestId || "unknown",
          error: error instanceof Error ? error.message : String(error),
        });
      }
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

      res.status(201).json({
        success: true,
        data: appointment,
        message: "Appointment created successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create appointment",
      });
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
        res.status(400).json({
          success: false,
          error: "Invalid appointment ID",
        });
        return;
      }

      const appointment = await this.appointmentService.getAppointmentById(
        userId,
        id
      );

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: "Appointment not found",
        });
        return;
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      // SECURITY: Log error for monitoring
      logger.error("Failed to get appointment by ID", {
        userId: req.user?.id,
        appointmentId: req.params.id,
        error: error instanceof Error ? error.message : "Unknown error",
        ip: req.ip,
      });

      res.status(403).json({
        success: false,
        error: "Access denied",
      });
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
        res.status(400).json({
          success: false,
          error: "Invalid customer ID",
        });
        return;
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

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
        },
      });
    } catch (error) {
      // SECURITY: Log error for monitoring
      logger.error("Failed to get customer appointments", {
        userId: req.user?.id,
        customerId: req.params.customerId,
        error: error instanceof Error ? error.message : "Unknown error",
        ip: req.ip,
      });

      res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }
  }

  /**
   * Get appointments for a specific staff member (for owners/managers)
   * GET /api/v1/appointments/staff/:staffId
   */
  async getStaffAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const { status, date, page, limit } = req.query;

      const filters = {
        status: status as AppointmentStatus,
        date: date as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      };

      const result = await this.appointmentService.getStaffAppointments(
        userId,
        staffId,
        filters
      );

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          staffId,
        },
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : "Access denied",
      });
    }
  }

  async getBusinessAppointments(
    req: BusinessOwnershipRequest,
    res: Response
  ): Promise<void> {
    try {
      // Business ownership already validated by middleware
      const businessId = req.params.businessId;
      const business = req.business; // Properly typed business object
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
        limit,
        staffId as string // Pass staff filter
      );

      sendSuccessResponse(
        res,
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
        "Business appointments retrieved successfully"
      );
    } catch (error) {
      handleRouteError(error, req, res);
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

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          filters,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Invalid search parameters",
      });
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

      const appointment = await this.appointmentService.updateAppointment(
        userId,
        id,
        validatedData
      );

      res.json({
        success: true,
        data: appointment,
        message: "Appointment updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update appointment",
      });
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

      // Validate status
      const validStatuses = ["CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const appointment = await this.appointmentService.updateAppointment(
        userId,
        id,
        { status }
      );

      res.json({
        success: true,
        data: appointment,
        message: `Appointment status updated to ${status}`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update appointment status",
      });
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

      const appointment = await this.appointmentService.cancelAppointment(
        userId,
        id,
        reason
      );

      res.json({
        success: true,
        data: appointment,
        message: "Appointment cancelled successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel appointment",
      });
    }
  }

  async confirmAppointment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.confirmAppointment(
        userId,
        id
      );

      res.json({
        success: true,
        data: appointment,
        message: "Appointment confirmed successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm appointment",
      });
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

      const appointment = await this.appointmentService.completeAppointment(
        userId,
        id,
        internalNotes
      );

      res.json({
        success: true,
        data: appointment,
        message: "Appointment completed successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete appointment",
      });
    }
  }

  async markNoShow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.markNoShow(userId, id);

      res.json({
        success: true,
        data: appointment,
        message: "Appointment marked as no-show",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to mark no-show",
      });
    }
  }

  async getUpcomingAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const appointments =
        await this.appointmentService.getUpcomingAppointments(userId, limit);

      res.json({
        success: true,
        data: appointments,
        meta: {
          total: appointments.length,
          limit,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  async getTodaysAppointments(
    req: BusinessOwnershipRequest,
    res: Response
  ): Promise<void> {
    try {
      // Business ownership already validated by middleware
      const businessId = req.params.businessId;
      const business = req.business; // Properly typed business object
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

      // Clean appointment data with proper typing
      const cleanedAppointments = appointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        duration: apt.duration,
        status: apt.status,
        price: apt.price,
        currency: apt.currency,
        customerNotes: apt.customerNotes,
        service: {
          id: apt.service.id,
          name: apt.service.name,
          duration: apt.service.duration,
        },
        staff: apt.staff
          ? {
              firstName: apt.staff.firstName,
              lastName: apt.staff.lastName,
            }
          : null,
        customer: apt.customer
          ? {
              firstName: apt.customer.firstName,
              lastName: apt.customer.lastName,
              phoneNumber: apt.customer.phoneNumber,
            }
          : null,
      }));

      sendSuccessResponse(
        res,
        {
          appointments: cleanedAppointments,
          meta: {
            total: cleanedAppointments.length,
            businessId: business.id,
            businessName: business.name,
            date: new Date().toISOString().split("T")[0],
          },
        },
        "Today's appointments retrieved successfully"
      );
    } catch (error) {
      handleRouteError(error, req, res);
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
          res.status(400).json({
            success: false,
            error: "Invalid startDate format",
          });
          return;
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            error: "Invalid endDate format",
          });
          return;
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

      res.json({
        success: true,
        data: stats,
        meta: {
          businessId: requestedBusinessId || "all",
          accessibleBusinesses: req.businessContext?.businessIds.length || 0,
          startDate: startDate as string,
          endDate: endDate as string,
        },
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : "Access denied",
      });
    }
  }

  // Admin endpoints
  async getAllAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.appointmentService.getAllAppointments(
        userId,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
        },
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : "Access denied",
      });
    }
  }

  async batchUpdateAppointmentStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { appointmentIds, status } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "appointmentIds array is required",
        });
        return;
      }

      if (!Object.values(AppointmentStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: "Invalid appointment status",
        });
        return;
      }

      await this.appointmentService.batchUpdateAppointmentStatus(
        userId,
        appointmentIds,
        status
      );

      res.json({
        success: true,
        message: `${appointmentIds.length} appointments updated to ${status}`,
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update appointments",
      });
    }
  }

  async batchCancelAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { appointmentIds, reason } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "appointmentIds array is required",
        });
        return;
      }

      if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: "Reason must be at least 5 characters long",
        });
        return;
      }

      await this.appointmentService.batchCancelAppointments(
        userId,
        appointmentIds,
        reason
      );

      res.json({
        success: true,
        message: `${appointmentIds.length} appointments cancelled`,
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel appointments",
      });
    }
  }

  // Utility endpoints
  async getAppointmentsByDateRange(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: "startDate and endDate are required",
        });
        return;
      }

      const filters = {
        businessId,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const result = await this.appointmentService.getPublicAppointments(
        filters,
        1,
        1000
      );

      // Sanitize data for public access - remove sensitive customer information
      const sanitizedAppointments = result.appointments.map(
        (apt: AppointmentWithDetails) => ({
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          duration: apt.duration,
          status: apt.status,
          // Exclude customer data, service, staff and internal notes for public access
        })
      );

      res.json({
        success: true,
        data: sanitizedAppointments,
        meta: {
          total: result.total,
          businessId,
          startDate: startDate as string,
          endDate: endDate as string,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get appointments",
      });
    }
  }

  async getAppointmentsByStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { businessId, status } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (
        !Object.values(AppointmentStatus).includes(status as AppointmentStatus)
      ) {
        res.status(400).json({
          success: false,
          error: "Invalid appointment status",
        });
        return;
      }

      const filters = {
        businessId,
        status: status as AppointmentStatus,
      };

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          businessId,
          status,
        },
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : "Access denied",
      });
    }
  }

  async getAppointmentsByService(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { serviceId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = { serviceId };

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          serviceId,
        },
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : "Access denied",
      });
    }
  }

  async getAppointmentsByStaff(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = { staffId };

      const result = await this.appointmentService.searchAppointments(
        userId,
        filters,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          staffId,
        },
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : "Access denied",
      });
    }
  }

  /**
   * Get nearest appointment in current hour for the authenticated user
   * GET /api/v1/appointments/nearest-current-hour
   */
  async getNearestCurrentHour(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const appointment =
        await this.appointmentService.getNearestAppointmentInCurrentHour(
          userId
        );

      if (!appointment) {
        res.json({
          success: true,
          data: null,
          message: "No appointments found in the current hour",
        });
        return;
      }

      res.json({
        success: true,
        data: {
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
          timeUntilAppointment: Math.max(
            0,
            appointment.startTime.getTime() - Date.now()
          ),
        },
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all appointments in current hour for the authenticated user
   * GET /api/v1/appointments/current-hour
   */
  async getCurrentHourAppointments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const appointments =
        await this.appointmentService.getAppointmentsInCurrentHour(userId);

      res.json({
        success: true,
        data: appointments.map((appointment) => ({
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
          timeUntilAppointment: Math.max(
            0,
            appointment.startTime.getTime() - Date.now()
          ),
        })),
        meta: {
          count: appointments.length,
          currentHour: new Date().getHours(),
        },
      });
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
