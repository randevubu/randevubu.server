import {
  BusinessClosureData,
  CreateBusinessClosureRequest,
  UpdateBusinessClosureRequest,
  ClosureType
} from '../../../types/business';
import { BusinessClosureRepository } from '../../../repositories/businessClosureRepository';
import { AppointmentRepository } from '../../../repositories/appointmentRepository';
import { RBACService } from '../rbac/rbacService';
import { PermissionName } from '../../../types/auth';
import { getCurrentTimeInIstanbul } from '../../../utils/timezoneHelper';
import logger from "../../../utils/Logger/logger";
export class BusinessClosureService {
  constructor(
    private businessClosureRepository: BusinessClosureRepository,
    private appointmentRepository: AppointmentRepository,
    private rbacService: RBACService
  ) {}

  private parseDate(dateString: string): Date {
    // Check if it's a date-only string (YYYY-MM-DD)
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (dateOnlyRegex.test(dateString)) {
      // For date-only strings, create a date in local timezone at start of day
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    }
    
    // For datetime strings, use normal parsing
    return new Date(dateString);
  }

  async createClosure(
    userId: string,
    businessId: string,
    data: CreateBusinessClosureRequest
  ): Promise<BusinessClosureData> {
    // Check permissions to manage business closures
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    }

    // Validate dates - handle date-only strings properly
    const startDate = this.parseDate(data.startDate);
    const endDate = data.endDate ? this.parseDate(data.endDate) : undefined;
    const now = getCurrentTimeInIstanbul();
    
    // Allow a small buffer (5 minutes) to account for time differences and request processing
    const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    const minimumAllowedTime = new Date(now.getTime() - bufferMs);

    if (startDate < minimumAllowedTime) {
      throw new Error('Closure start date cannot be in the past');
    }

    if (endDate && endDate < startDate) {
      throw new Error('Closure end date must be at or after start date');
    }

    // Check for conflicting closures
    const conflicts = await this.businessClosureRepository.findConflictingClosures(
      businessId,
      startDate,
      endDate
    );

    if (conflicts.length > 0) {
      throw new Error('Closure period conflicts with existing closure');
    }

    // Check for existing appointments in the closure period
    const affectedAppointments = await this.findAffectedAppointments(
      businessId,
      startDate,
      endDate
    );

    if (affectedAppointments.length > 0) {
      // For now, we'll create the closure but businesses need to handle affected appointments
      // In a full implementation, we might automatically cancel or reschedule
      logger.warn(`Creating closure that affects ${affectedAppointments.length} appointments`);
    }

    return await this.businessClosureRepository.create(businessId, userId, data);
  }

  async getClosureById(
    userId: string,
    closureId: string
  ): Promise<BusinessClosureData | null> {
    const closure = await this.businessClosureRepository.findById(closureId);
    if (!closure) return null;

    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId: closure.businessId }
      );
    }

    return closure;
  }

  async getBusinessClosures(
    userId: string,
    businessId: string
  ): Promise<BusinessClosureData[]> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    return await this.businessClosureRepository.findByBusinessId(businessId);
  }

  async getActiveClosures(
    userId: string,
    businessId: string
  ): Promise<BusinessClosureData[]> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    return await this.businessClosureRepository.findActiveByBusinessId(businessId);
  }

  async getUpcomingClosures(
    userId: string,
    businessId: string
  ): Promise<BusinessClosureData[]> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    return await this.businessClosureRepository.findUpcomingByBusinessId(businessId);
  }

  async updateClosure(
    userId: string,
    closureId: string,
    data: UpdateBusinessClosureRequest
  ): Promise<BusinessClosureData> {
    const closure = await this.businessClosureRepository.findById(closureId);
    if (!closure) {
      throw new Error('Closure not found');
    }

    // Check permissions to manage business closures
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId: closure.businessId }
      );
    }

    // Validate dates if provided
    if (data.startDate || data.endDate) {
      const newStartDate = data.startDate ? new Date(data.startDate) : closure.startDate;
      const newEndDate = data.endDate ? new Date(data.endDate) : closure.endDate;

      if (newEndDate && newEndDate <= newStartDate) {
        throw new Error('Closure end date must be after start date');
      }

      // Check for conflicts with other closures
      const conflicts = await this.businessClosureRepository.findConflictingClosures(
        closure.businessId,
        newStartDate,
        newEndDate || undefined,
        closureId
      );

      if (conflicts.length > 0) {
        throw new Error('Updated closure period conflicts with existing closure');
      }
    }

    return await this.businessClosureRepository.update(closureId, data);
  }

  async deleteClosure(
    userId: string,
    closureId: string
  ): Promise<void> {
    const closure = await this.businessClosureRepository.findById(closureId);
    if (!closure) {
      throw new Error('Closure not found');
    }

    // Check permissions to manage business closures
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId: closure.businessId }
      );
    }

    await this.businessClosureRepository.delete(closureId);
  }

  async isBusinessClosed(
    businessId: string,
    checkDate: Date = getCurrentTimeInIstanbul()
  ): Promise<{
    isClosed: boolean;
    closure?: BusinessClosureData;
  }> {
    // Public method - no authentication required
    return await this.businessClosureRepository.isBusinessClosed(businessId, checkDate);
  }

  async extendClosure(
    userId: string,
    closureId: string,
    newEndDate: Date
  ): Promise<BusinessClosureData> {
    const closure = await this.businessClosureRepository.findById(closureId);
    if (!closure) {
      throw new Error('Closure not found');
    }

    // Check permissions to manage business closures
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId: closure.businessId }
      );
    }

    if (newEndDate <= closure.startDate) {
      throw new Error('New end date must be after closure start date');
    }

    // Check for conflicts
    const conflicts = await this.businessClosureRepository.findConflictingClosures(
      closure.businessId,
      closure.startDate,
      newEndDate,
      closureId
    );

    if (conflicts.length > 0) {
      throw new Error('Extended closure period conflicts with existing closure');
    }

    return await this.businessClosureRepository.extendClosure(closureId, newEndDate);
  }

  async endClosureEarly(
    userId: string,
    closureId: string,
    endDate: Date = getCurrentTimeInIstanbul()
  ): Promise<BusinessClosureData> {
    const closure = await this.businessClosureRepository.findById(closureId);
    if (!closure) {
      throw new Error('Closure not found');
    }

    // Check permissions to manage business closures
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId: closure.businessId }
      );
    }

    if (endDate < closure.startDate) {
      throw new Error('End date cannot be before closure start date');
    }

    return await this.businessClosureRepository.endClosureEarly(closureId, endDate);
  }

  async getClosuresByDateRange(
    userId: string,
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusinessClosureData[]> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    return await this.businessClosureRepository.findByDateRange(businessId, startDate, endDate);
  }

  async getClosuresByType(
    userId: string,
    businessId: string,
    type: ClosureType
  ): Promise<BusinessClosureData[]> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    return await this.businessClosureRepository.findByType(businessId, type);
  }

  async getClosureStats(
    userId: string,
    businessId: string,
    year?: number
  ): Promise<{
    totalClosures: number;
    totalDaysClosed: number;
    closuresByType: Record<ClosureType, number>;
    averageClosureDuration: number;
  }> {
    // Check permissions to view analytics
    const hasGlobalAnalytics = await this.rbacService.hasPermission(userId, 'analytics', 'view_all');
    
    if (!hasGlobalAnalytics) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_ANALYTICS,
        { businessId }
      );
    }

    return await this.businessClosureRepository.getClosureStats(businessId, year);
  }

  async createRecurringHoliday(
    userId: string,
    businessId: string,
    name: string,
    startDate: Date,
    endDate?: Date
  ): Promise<BusinessClosureData> {
    // Check permissions to manage business closures
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    }

    const closureData: CreateBusinessClosureRequest = {
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      reason: `Holiday: ${name}`,
      type: ClosureType.HOLIDAY
    };

    return await this.businessClosureRepository.create(businessId, userId, closureData);
  }

  async getRecurringHolidays(
    userId: string,
    businessId: string
  ): Promise<BusinessClosureData[]> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    return await this.businessClosureRepository.findRecurringHolidays(businessId);
  }

  async getAffectedAppointments(
    userId: string,
    businessId: string,
    startDate: Date,
    endDate?: Date
  ): Promise<any[]> {
    // Check permissions to view appointments
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'appointment', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_APPOINTMENTS,
        { businessId }
      );
    }

    return await this.findAffectedAppointments(businessId, startDate, endDate);
  }

  // System methods
  async autoExpireClosures(): Promise<number> {
    // System method to automatically expire past closures
    return await this.businessClosureRepository.autoExpireClosures();
  }

  // Private methods
  private async findAffectedAppointments(
    businessId: string,
    startDate: Date,
    endDate?: Date
  ): Promise<any[]> {
    // Use the actual end date or set to end of the start date if not provided
    const closureEndDate = endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1); // End of day
    
    // Find appointments that overlap with the closure period
    const appointments = await this.appointmentRepository.findByBusinessAndDateRange(
      businessId,
      startDate,
      closureEndDate
    );

    // Filter to only include active appointments
    return appointments.filter((apt: { status: string }) => 
      apt.status === 'CONFIRMED'
    );
  }

  // Batch operations
  async createEmergencyClosure(
    userId: string,
    businessId: string,
    reason: string,
    startDate: Date = getCurrentTimeInIstanbul(),
    durationHours?: number
  ): Promise<BusinessClosureData> {
    // Emergency closures can be created immediately
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    }

    const endDate = durationHours 
      ? new Date(startDate.getTime() + durationHours * 60 * 60 * 1000)
      : undefined;

    const closureData: CreateBusinessClosureRequest = {
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      reason: `Emergency: ${reason}`,
      type: ClosureType.EMERGENCY
    };

    // Emergency closures bypass the future date validation
    return await this.businessClosureRepository.create(businessId, userId, closureData);
  }

  async createMaintenanceClosure(
    userId: string,
    businessId: string,
    description: string,
    startDate: Date,
    estimatedHours: number
  ): Promise<BusinessClosureData> {
    const hasGlobalClosure = await this.rbacService.hasPermission(userId, 'closure', 'manage_all');
    
    if (!hasGlobalClosure) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
    }

    const endDate = new Date(startDate.getTime() + estimatedHours * 60 * 60 * 1000);

    const closureData: CreateBusinessClosureRequest = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: `Maintenance: ${description}`,
      type: ClosureType.MAINTENANCE
    };

    return await this.businessClosureRepository.create(businessId, userId, closureData);
  }

  async getClosuresCalendar(
    userId: string,
    businessId: string,
    year: number,
    month?: number
  ): Promise<{
    closures: BusinessClosureData[];
    totalDaysInPeriod: number;
    closedDays: number;
    openDays: number;
  }> {
    // Check permissions to view business closures
    const hasGlobalView = await this.rbacService.hasPermission(userId, 'closure', 'view_all');
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_CLOSURES,
        { businessId }
      );
    }

    const startDate = month 
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    
    const endDate = month
      ? new Date(year, month, 0) // Last day of month
      : new Date(year + 1, 0, 0); // Last day of year

    const closures = await this.businessClosureRepository.findByDateRange(
      businessId,
      startDate,
      endDate
    );

    const totalDaysInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Calculate closed days (simplified - would need more complex logic for overlapping closures)
    let closedDays = 0;
    closures.forEach(closure => {
      const closureStart = closure.startDate > startDate ? closure.startDate : startDate;
      const closureEnd = closure.endDate && closure.endDate < endDate ? closure.endDate : endDate;
      
      if (closureEnd) {
        closedDays += Math.ceil(
          (closureEnd.getTime() - closureStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
      }
    });

    return {
      closures,
      totalDaysInPeriod,
      closedDays,
      openDays: totalDaysInPeriod - closedDays
    };
  }
}