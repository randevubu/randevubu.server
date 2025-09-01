import { Request, Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  createBusinessClosureSchema,
  updateBusinessClosureSchema
} from '../schemas/business.schemas';
import { AppointmentRescheduleService } from '../services/appointmentRescheduleService';
import { BusinessClosureService } from '../services/businessClosureService';
import { ClosureAnalyticsService } from '../services/closureAnalyticsService';
import { NotificationService } from '../services/notificationService';
import { AuthenticatedRequest } from '../types/auth';
import {
  AvailabilityAlertRequest,
  ClosureType,
  CreateEnhancedClosureRequest,
  NotificationRequest,
  RescheduleOptionsRequest
} from '../types/business';

export class BusinessClosureController {
  constructor(
    private businessClosureService: BusinessClosureService,
    private notificationService: NotificationService,
    private closureAnalyticsService: ClosureAnalyticsService,
    private appointmentRescheduleService: AppointmentRescheduleService
  ) {}

  async createClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const validatedData = createBusinessClosureSchema.parse(req.body);
      const userId = req.user!.id;

      const closure = await this.businessClosureService.createClosure(
        userId,
        businessId,
        validatedData
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Business closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create closure'
      });
    }
  }

  async getClosureById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const closure = await this.businessClosureService.getClosureById(userId, id);

      if (!closure) {
        res.status(404).json({
          success: false,
          error: 'Closure not found'
        });
        return;
      }

      res.json({
        success: true,
        data: closure
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getBusinessClosures(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
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

      res.json({
        success: true,
        data: closures,
        meta: {
          total: closures.length,
          businessId,
          filter: active || 'all'
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async updateClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateBusinessClosureSchema.parse(req.body);
      const userId = req.user!.id;

      const closure = await this.businessClosureService.updateClosure(userId, id, validatedData);

      res.json({
        success: true,
        data: closure,
        message: 'Closure updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update closure'
      });
    }
  }

  async deleteClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await this.businessClosureService.deleteClosure(userId, id);

      res.json({
        success: true,
        message: 'Closure deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete closure'
      });
    }
  }

  async isBusinessClosed(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { date } = req.query;

      let checkDate = new Date();
      if (date) {
        checkDate = new Date(date as string);
        if (isNaN(checkDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
          return;
        }
      }

      const result = await this.businessClosureService.isBusinessClosed(businessId, checkDate);

      res.json({
        success: true,
        data: {
          businessId,
          date: checkDate.toISOString(),
          isClosed: result.isClosed,
          closure: result.closure
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async extendClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newEndDate } = req.body;
      const userId = req.user!.id;

      if (!newEndDate) {
        res.status(400).json({
          success: false,
          error: 'newEndDate is required'
        });
        return;
      }

      const endDate = new Date(newEndDate);
      if (isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
        return;
      }

      const closure = await this.businessClosureService.extendClosure(userId, id, endDate);

      res.json({
        success: true,
        data: closure,
        message: 'Closure extended successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extend closure'
      });
    }
  }

  async endClosureEarly(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { endDate } = req.body;
      const userId = req.user!.id;

      let closureEndDate = new Date();
      if (endDate) {
        closureEndDate = new Date(endDate);
        if (isNaN(closureEndDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
          return;
        }
      }

      const closure = await this.businessClosureService.endClosureEarly(userId, id, closureEndDate);

      res.json({
        success: true,
        data: closure,
        message: 'Closure ended successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end closure'
      });
    }
  }

  async getClosuresByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
        return;
      }

      if (end <= start) {
        res.status(400).json({
          success: false,
          error: 'endDate must be after startDate'
        });
        return;
      }

      const closures = await this.businessClosureService.getClosuresByDateRange(
        userId,
        businessId,
        start,
        end
      );

      res.json({
        success: true,
        data: closures,
        meta: {
          total: closures.length,
          businessId,
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

  async getClosuresByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, type } = req.params;
      const userId = req.user!.id;

      if (!Object.values(ClosureType).includes(type as ClosureType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid closure type'
        });
        return;
      }

      const closures = await this.businessClosureService.getClosuresByType(
        userId,
        businessId,
        type as ClosureType
      );

      res.json({
        success: true,
        data: closures,
        meta: {
          total: closures.length,
          businessId,
          type
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getClosureStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { year } = req.query;
      const userId = req.user!.id;

      let statsYear: number | undefined;
      if (year) {
        statsYear = parseInt(year as string);
        if (isNaN(statsYear) || statsYear < 2000 || statsYear > 2100) {
          res.status(400).json({
            success: false,
            error: 'Invalid year'
          });
          return;
        }
      }

      const stats = await this.businessClosureService.getClosureStats(
        userId,
        businessId,
        statsYear
      );

      res.json({
        success: true,
        data: stats,
        meta: {
          businessId,
          year: statsYear || 'all-time'
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async createRecurringHoliday(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { name, startDate, endDate } = req.body;
      const userId = req.user!.id;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Holiday name is required and must be at least 2 characters'
        });
        return;
      }

      if (!startDate) {
        res.status(400).json({
          success: false,
          error: 'startDate is required'
        });
        return;
      }

      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        });
        return;
      }

      let end: Date | undefined;
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
          return;
        }
      }

      const closure = await this.businessClosureService.createRecurringHoliday(
        userId,
        businessId,
        name.trim(),
        start,
        end
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Holiday closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create holiday closure'
      });
    }
  }

  async getRecurringHolidays(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      const holidays = await this.businessClosureService.getRecurringHolidays(userId, businessId);

      res.json({
        success: true,
        data: holidays,
        meta: {
          total: holidays.length,
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

  async getAffectedAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user!.id;

      if (!startDate) {
        res.status(400).json({
          success: false,
          error: 'startDate is required'
        });
        return;
      }

      const start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        });
        return;
      }

      let end: Date | undefined;
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

      const appointments = await this.businessClosureService.getAffectedAppointments(
        userId,
        businessId,
        start,
        end
      );

      res.json({
        success: true,
        data: appointments,
        meta: {
          total: appointments.length,
          businessId,
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

  async createEmergencyClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { reason, durationHours, startDate } = req.body;
      const userId = req.user!.id;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Emergency reason must be at least 5 characters'
        });
        return;
      }

      let start = new Date();
      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format'
          });
          return;
        }
      }

      let duration: number | undefined;
      if (durationHours) {
        duration = parseInt(durationHours);
        if (isNaN(duration) || duration <= 0 || duration > 168) { // Max 1 week
          res.status(400).json({
            success: false,
            error: 'Duration must be between 1 and 168 hours'
          });
          return;
        }
      }

      const closure = await this.businessClosureService.createEmergencyClosure(
        userId,
        businessId,
        reason.trim(),
        start,
        duration
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Emergency closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create emergency closure'
      });
    }
  }

  async createMaintenanceClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { description, startDate, estimatedHours } = req.body;
      const userId = req.user!.id;

      if (!description || typeof description !== 'string' || description.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Maintenance description must be at least 5 characters'
        });
        return;
      }

      if (!startDate) {
        res.status(400).json({
          success: false,
          error: 'startDate is required'
        });
        return;
      }

      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        });
        return;
      }

      if (!estimatedHours || typeof estimatedHours !== 'number' || estimatedHours <= 0 || estimatedHours > 72) {
        res.status(400).json({
          success: false,
          error: 'Estimated hours must be between 1 and 72'
        });
        return;
      }

      const closure = await this.businessClosureService.createMaintenanceClosure(
        userId,
        businessId,
        description.trim(),
        start,
        estimatedHours
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Maintenance closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create maintenance closure'
      });
    }
  }

  async getClosuresCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { year, month } = req.query;
      const userId = req.user!.id;

      if (!year) {
        res.status(400).json({
          success: false,
          error: 'year is required'
        });
        return;
      }

      const calendarYear = parseInt(year as string);
      if (isNaN(calendarYear) || calendarYear < 2000 || calendarYear > 2100) {
        res.status(400).json({
          success: false,
          error: 'Invalid year'
        });
        return;
      }

      let calendarMonth: number | undefined;
      if (month) {
        calendarMonth = parseInt(month as string);
        if (isNaN(calendarMonth) || calendarMonth < 1 || calendarMonth > 12) {
          res.status(400).json({
            success: false,
            error: 'Month must be between 1 and 12'
          });
          return;
        }
      }

      const calendar = await this.businessClosureService.getClosuresCalendar(
        userId,
        businessId,
        calendarYear,
        calendarMonth
      );

      res.json({
        success: true,
        data: calendar,
        meta: {
          businessId,
          year: calendarYear,
          month: calendarMonth
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  // System endpoint
  async autoExpireClosures(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // This would typically be restricted to system/admin calls
      const count = await this.businessClosureService.autoExpireClosures();

      res.json({
        success: true,
        data: { expiredCount: count },
        message: `Expired ${count} past closures`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to expire closures'
      });
    }
  }

  // Context-aware methods (use business context from middleware)
  async createMyBusinessClosure(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const validatedData = createBusinessClosureSchema.parse(req.body);
      const userId = req.user!.id;
      const businessId = req.businessContext!.primaryBusinessId!;

      const closure = await this.businessClosureService.createClosure(
        userId,
        businessId,
        validatedData
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Business closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create closure'
      });
    }
  }

  async getMyBusinessClosures(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
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

      res.json({
        success: true,
        data: closures,
        meta: {
          total: closures.length,
          businessId,
          filter: active || 'all'
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async createMyEmergencyClosure(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const { reason, endDate } = req.body;
      const userId = req.user!.id;
      const businessId = req.businessContext!.primaryBusinessId!;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Emergency reason must be at least 5 characters'
        });
        return;
      }

      const start = new Date();
      let end: Date | undefined;
      
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
          return;
        }
      }

      const closure = await this.businessClosureService.createClosure(
        userId,
        businessId,
        {
          startDate: start.toISOString().split('T')[0],
          endDate: end?.toISOString().split('T')[0],
          reason: reason.trim(),
          type: ClosureType.EMERGENCY
        }
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Emergency closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create emergency closure'
      });
    }
  }

  async createMyMaintenanceClosure(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, reason } = req.body;
      const userId = req.user!.id;
      const businessId = req.businessContext!.primaryBusinessId!;

      if (!startDate || !endDate || !reason) {
        res.status(400).json({
          success: false,
          error: 'startDate, endDate, and reason are required for maintenance closure'
        });
        return;
      }

      const closure = await this.businessClosureService.createClosure(
        userId,
        businessId,
        {
          startDate,
          endDate,
          reason: reason.trim(),
          type: ClosureType.MAINTENANCE
        }
      );

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Maintenance closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create maintenance closure'
      });
    }
  }

  // Enhanced Closure System Endpoints

  async createEnhancedClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;
      const closureData = req.body as CreateEnhancedClosureRequest;

      // Create closure with enhanced features
      const closure = await this.businessClosureService.createClosure(userId, businessId, {
        startDate: closureData.startDate,
        endDate: closureData.endDate,
        reason: closureData.reason,
        type: closureData.type
      });

      // If notifications are enabled, send them
      if (closureData.notifyCustomers && closureData.notificationChannels.length > 0) {
        const affectedAppointments = await this.appointmentRescheduleService.getAffectedAppointments(closure.id);
        
        for (const appointment of affectedAppointments) {
          const enhancedClosureData = {
            id: closure.id,
            businessId: closure.businessId,
            businessName: 'Business Name', // TODO: Get from business service
            startDate: closure.startDate,
            endDate: closure.endDate || undefined,
            reason: closure.reason,
            type: closure.type,
            message: closureData.notificationMessage
          };

          await this.notificationService.sendClosureNotification(
            appointment.customerId,
            enhancedClosureData,
            closureData.notificationChannels
          );
        }
      }

      res.status(201).json({
        success: true,
        data: closure,
        message: 'Enhanced closure created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create enhanced closure'
      });
    }
  }

  async sendClosureNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const { channels, message, customTemplate } = req.body as NotificationRequest;
      const userId = req.user!.id;

      const affectedAppointments = await this.appointmentRescheduleService.getAffectedAppointments(closureId);
      const results = [];

      for (const appointment of affectedAppointments) {
        const enhancedClosureData = {
          id: closureId,
          businessId: appointment.businessId,
          businessName: 'Business Name', // TODO: Get from included business relation
          startDate: appointment.startTime,
          reason: 'Business closure notification',
          type: 'OTHER' as const,
          message
        };

        const result = await this.notificationService.sendClosureNotification(
          appointment.customerId,
          enhancedClosureData,
          channels
        );
        results.push(result);
      }

      res.json({
        success: true,
        data: {
          notificationsSent: results.length,
          results
        },
        message: 'Notifications sent successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notifications'
      });
    }
  }

  async getAffectedAppointmentsForClosure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const userId = req.user!.id;

      const appointments = await this.appointmentRescheduleService.getAffectedAppointments(closureId);

      res.json({
        success: true,
        data: appointments,
        meta: {
          total: appointments.length,
          closureId
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async generateRescheduleSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const userId = req.user!.id;

      const closure = await this.businessClosureService.getClosureById(userId, closureId);
      if (!closure) {
        res.status(404).json({
          success: false,
          error: 'Closure not found'
        });
        return;
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

      res.json({
        success: true,
        data: suggestions,
        meta: {
          total: suggestions.length,
          closureId
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate reschedule suggestions'
      });
    }
  }

  async autoRescheduleAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const rescheduleOptions = req.body as RescheduleOptionsRequest;
      const userId = req.user!.id;

      const results = await this.appointmentRescheduleService.autoRescheduleAppointments(
        closureId,
        rescheduleOptions
      );

      const stats = {
        totalProcessed: results.length,
        rescheduled: results.filter(r => r.status === 'RESCHEDULED').length,
        suggested: results.filter(r => r.status === 'SUGGESTED').length,
        failed: results.filter(r => r.status === 'FAILED').length
      };

      res.json({
        success: true,
        data: {
          results,
          statistics: stats
        },
        message: 'Auto-reschedule process completed'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to auto-reschedule appointments'
      });
    }
  }

  async getClosureAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const period = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const analytics = await this.closureAnalyticsService.getClosureImpactAnalytics(businessId, period);

      res.json({
        success: true,
        data: analytics,
        meta: {
          businessId,
          period
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getCustomerImpactReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const userId = req.user!.id;

      const report = await this.closureAnalyticsService.getCustomerImpactReport(closureId);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getRevenueImpactAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { closureId } = req.query;
      const userId = req.user!.id;

      if (!closureId) {
        res.status(400).json({
          success: false,
          error: 'closureId is required'
        });
        return;
      }

      const closure = await this.businessClosureService.getClosureById(userId, closureId as string);
      if (!closure) {
        res.status(404).json({
          success: false,
          error: 'Closure not found'
        });
        return;
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

      res.json({
        success: true,
        data: impact
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async createAvailabilityAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const alertRequest = req.body as AvailabilityAlertRequest;
      const userId = req.user!.id;

      // Validate that the requesting user matches the customer
      if (alertRequest.customerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Can only create alerts for your own account'
        });
        return;
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

      res.status(201).json({
        success: true,
        data: { alertId },
        message: 'Availability alert created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create availability alert'
      });
    }
  }

  async deactivateAvailabilityAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const userId = req.user!.id;

      await this.notificationService.deactivateAvailabilityAlert(alertId, userId);

      res.json({
        success: true,
        message: 'Availability alert deactivated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate availability alert'
      });
    }
  }

  async getNotificationDeliveryStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const userId = req.user!.id;

      const stats = await this.notificationService.getNotificationDeliveryStats(closureId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getRescheduleStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { closureId } = req.params;
      const userId = req.user!.id;

      const stats = await this.appointmentRescheduleService.getRescheduleStatistics(closureId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getClosureImpactPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, startDate, endDate, services } = req.body;
      const userId = req.user!.id;

      if (!businessId || !startDate) {
        res.status(400).json({
          success: false,
          error: 'businessId and startDate are required'
        });
        return;
      }

      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        });
        return;
      }

      let end: Date | undefined;
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
          return;
        }
      }

      // If no endDate provided or startDate equals endDate, treat as zero-duration closure
      let affectedAppointments: any[] = [];
      if (end && end > start) {
        // Only check for affected appointments if there's an actual time range
        affectedAppointments = await this.businessClosureService.getAffectedAppointments(
          userId,
          businessId,
          start,
          end
        );
      }

      // Calculate revenue impact
      const totalRevenue = affectedAppointments.reduce((sum, apt) => {
        // Assuming appointment has a price field or we need to calculate from service
        return sum + (apt.price || 0);
      }, 0);

      // Get closure analytics for business
      const period = {
        startDate: start,
        endDate: end || start // Use same date if no end date (zero duration)
      };
      
      let analytics;
      try {
        analytics = await this.closureAnalyticsService.getClosureImpactAnalytics(businessId, period);
      } catch (error) {
        // If analytics fail, provide basic impact data
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

      res.json({
        success: true,
        data: {
          impactSummary: {
            affectedAppointments: affectedAppointments.length,
            uniqueCustomers: new Set(affectedAppointments.map(apt => apt.customerId)).size,
            estimatedRevenueLoss: totalRevenue,
            period: {
              startDate: start.toISOString(),
              endDate: end?.toISOString()
            }
          },
          affectedAppointments: affectedAppointments.slice(0, 10), // Limit to first 10 for preview
          analytics,
          recommendations: {
            suggestNotifyCustomers: affectedAppointments.length > 0,
            suggestReschedule: affectedAppointments.length > 0,
            highImpact: affectedAppointments.length > 5 || totalRevenue > 1000
          }
        },
        message: 'Closure impact preview generated successfully'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }
}