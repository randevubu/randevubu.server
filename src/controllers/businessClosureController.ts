import { Request, Response } from 'express';
import { BusinessClosureService } from '../services/businessClosureService';
import { 
  createBusinessClosureSchema, 
  updateBusinessClosureSchema 
} from '../schemas/business.schemas';
import { AuthenticatedRequest } from '../types/auth';
import { ClosureType } from '../types/business';

export class BusinessClosureController {
  constructor(private businessClosureService: BusinessClosureService) {}

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
}