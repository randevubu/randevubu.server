import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  appointmentSearchSchema,
  createAppointmentSchema,
  updateAppointmentSchema
} from '../schemas/business.schemas';
import { AppointmentService } from '../services/appointmentService';
import { AuthenticatedRequest } from '../types/auth';
import { AppointmentStatus } from '../types/business';
import {
  handleRouteError,
  sendSuccessResponse
} from '../utils/errorResponse';

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  /**
   * Get user's appointments from their businesses
   * GET /api/v1/appointments/my-appointments
   */
  async getMyAppointments(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      
      // Business access validation is now handled by middleware

      const { status, date, businessId, page, limit } = req.query;

      const filters = {
        status: status as AppointmentStatus,
        date: date as string,
        businessId: businessId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const result = await this.appointmentService.getMyAppointments(userId, filters);

      // Transform appointments to remove unnecessary data
      const cleanedResult = {
        ...result,
        appointments: result.appointments.map((apt: any) => ({
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
            duration: apt.service.duration
          },
          staff: apt.staff ? {
            firstName: apt.staff.firstName,
            lastName: apt.staff.lastName
          } : null,
          customer: apt.customer ? {
            firstName: apt.customer.firstName,
            lastName: apt.customer.lastName,
            phoneNumber: apt.customer.phoneNumber
          } : null
        }))
      };

      sendSuccessResponse(res, cleanedResult, 'Appointments retrieved successfully');

    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async createAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      const userId = req.user!.id;

      const appointment = await this.appointmentService.createAppointment(userId, validatedData);

      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Appointment created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create appointment'
      });
    }
  }

  async getAppointmentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.getAppointmentById(userId, id);

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getCustomerAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

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
          limit
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getBusinessAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.appointmentService.getBusinessAppointments(
        userId,
        businessId,
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
          businessId
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async searchAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validatedQuery = appointmentSearchSchema.parse(req.query);
      const userId = req.user!.id;

      const {
        page = 1,
        limit = 20,
        ...filters
      } = validatedQuery;

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
          filters
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid search parameters'
      });
    }
  }

  async updateAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateAppointmentSchema.parse(req.body);
      const userId = req.user!.id;

      const appointment = await this.appointmentService.updateAppointment(userId, id, validatedData);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update appointment'
      });
    }
  }

  async updateAppointmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      // Validate status
      const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      const appointment = await this.appointmentService.updateAppointment(userId, id, { status });

      res.json({
        success: true,
        data: appointment,
        message: `Appointment status updated to ${status}`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update appointment status'
      });
    }
  }

  async cancelAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.cancelAppointment(userId, id, reason);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment cancelled successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel appointment'
      });
    }
  }

  async confirmAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const appointment = await this.appointmentService.confirmAppointment(userId, id);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment confirmed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm appointment'
      });
    }
  }

  async completeAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        message: 'Appointment completed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete appointment'
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
        message: 'Appointment marked as no-show'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark no-show'
      });
    }
  }

  async getUpcomingAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const appointments = await this.appointmentService.getUpcomingAppointments(userId, limit);

      res.json({
        success: true,
        data: appointments,
        meta: {
          total: appointments.length,
          limit
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTodaysAppointments(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      // Business access validation is now handled by middleware

      // Use context-based approach - if businessId is 'my', get all accessible businesses
      const requestedBusinessId = businessId === 'my' ? undefined : businessId;
      const appointments = await this.appointmentService.getTodaysAppointments(userId, requestedBusinessId);

      // Clean appointment data
      const cleanedAppointments = appointments.map((apt: any) => ({
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
          duration: apt.service.duration
        },
        staff: apt.staff ? {
          firstName: apt.staff.firstName,
          lastName: apt.staff.lastName
        } : null,
        customer: apt.customer ? {
          firstName: apt.customer.firstName,
          lastName: apt.customer.lastName,
          phoneNumber: apt.customer.phoneNumber
        } : null
      }));

      res.json({
        success: true,
        data: cleanedAppointments,
        meta: {
          total: appointments.length,
          businessId: requestedBusinessId || 'all',
          accessibleBusinesses: req.businessContext?.businessIds.length || 0,
          date: new Date().toISOString().split('T')[0]
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getAppointmentStats(req: BusinessContextRequest, res: Response): Promise<void> {
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
            error: 'Invalid startDate format'
          });
          return;
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
          return;
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

      res.json({
        success: true,
        data: stats,
        meta: {
          businessId: requestedBusinessId || 'all',
          accessibleBusinesses: req.businessContext?.businessIds.length || 0,
          startDate: startDate as string,
          endDate: endDate as string
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  // Admin endpoints
  async getAllAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.appointmentService.getAllAppointments(userId, page, limit);

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async batchUpdateAppointmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { appointmentIds, status } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'appointmentIds array is required'
        });
        return;
      }

      if (!Object.values(AppointmentStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid appointment status'
        });
        return;
      }

      await this.appointmentService.batchUpdateAppointmentStatus(userId, appointmentIds, status);

      res.json({
        success: true,
        message: `${appointmentIds.length} appointments updated to ${status}`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update appointments'
      });
    }
  }

  async batchCancelAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { appointmentIds, reason } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'appointmentIds array is required'
        });
        return;
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Reason must be at least 5 characters long'
        });
        return;
      }

      await this.appointmentService.batchCancelAppointments(userId, appointmentIds, reason);

      res.json({
        success: true,
        message: `${appointmentIds.length} appointments cancelled`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel appointments'
      });
    }
  }

  // Utility endpoints
  async getAppointmentsByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
        return;
      }

      const filters = {
        businessId,
        startDate: startDate as string,
        endDate: endDate as string
      };

      const result = await this.appointmentService.getPublicAppointments(filters, 1, 1000);

      // Sanitize data for public access - remove sensitive customer information
      const sanitizedAppointments = result.appointments.map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        duration: apt.duration,
        status: apt.status,
        service: apt.service ? {
          id: apt.service.id,
          name: apt.service.name,
          duration: apt.service.duration
        } : null,
        staff: apt.staff ? {
          id: apt.staff.id,
          firstName: apt.staff.firstName,
          lastName: apt.staff.lastName
        } : null
        // Exclude customer data and internal notes for public access
      }));

      res.json({
        success: true,
        data: sanitizedAppointments,
        meta: {
          total: result.total,
          businessId,
          startDate: startDate as string,
          endDate: endDate as string
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get appointments'
      });
    }
  }

  async getAppointmentsByStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, status } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid appointment status'
        });
        return;
      }

      const filters = {
        businessId,
        status: status as AppointmentStatus
      };

      const result = await this.appointmentService.searchAppointments(userId, filters, page, limit);

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          businessId,
          status
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getAppointmentsByService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = { serviceId };

      const result = await this.appointmentService.searchAppointments(userId, filters, page, limit);

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          serviceId
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getAppointmentsByStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { staffId } = req.params;
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = { staffId };

      const result = await this.appointmentService.searchAppointments(userId, filters, page, limit);

      res.json({
        success: true,
        data: result.appointments,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit,
          staffId
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }
}