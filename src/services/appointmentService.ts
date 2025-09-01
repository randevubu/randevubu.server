import {
  AppointmentData,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchFilters,
  AppointmentStatus
} from '../types/business';
import { AppointmentRepository } from '../repositories/appointmentRepository';
import { ServiceRepository } from '../repositories/serviceRepository';
import { UserBehaviorRepository } from '../repositories/userBehaviorRepository';
import { BusinessClosureRepository } from '../repositories/businessClosureRepository';
import { RBACService } from './rbacService';
import { PermissionName } from '../types/auth';
import { BusinessContext } from '../middleware/businessContext';
import { BusinessService } from './businessService';

export class AppointmentService {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private serviceRepository: ServiceRepository,
    private userBehaviorRepository: UserBehaviorRepository,
    private businessClosureRepository: BusinessClosureRepository,
    private rbacService: RBACService,
    private businessService: BusinessService
  ) {}

  // Helper method to split permission name into resource and action
  private splitPermissionName(permissionName: string): { resource: string; action: string } {
    const [resource, action] = permissionName.split(':');
    return { resource, action };
  }

  async createAppointment(
    userId: string,
    data: CreateAppointmentRequest
  ): Promise<AppointmentData> {
    // Check if user is banned
    const userBehavior = await this.userBehaviorRepository.findByUserId(userId);
    if (userBehavior?.isBanned) {
      const banMessage = userBehavior.bannedUntil 
        ? `You are banned until ${userBehavior.bannedUntil.toLocaleDateString()}`
        : 'You are permanently banned';
      throw new Error(`Cannot book appointment: ${banMessage}. Reason: ${userBehavior.banReason}`);
    }

    // Check if business is closed
    const { isClosed, closure } = await this.businessClosureRepository.isBusinessClosed(
      data.businessId,
      new Date(data.date)
    );
    
    if (isClosed) {
      throw new Error(`Business is closed: ${closure?.reason || 'Unknown reason'}`);
    }

    // Validate service exists and is active
    const service = await this.serviceRepository.findById(data.serviceId);
    if (!service || !service.isActive) {
      throw new Error('Service not found or not available');
    }

    // Check appointment time constraints
    const appointmentDateTime = new Date(`${data.date}T${data.startTime}`);
    const now = new Date();
    
    // Check minimum advance booking
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilAppointment < service.minAdvanceBooking) {
      throw new Error(`Appointments must be booked at least ${service.minAdvanceBooking} hours in advance`);
    }

    // Check maximum advance booking
    const daysUntilAppointment = hoursUntilAppointment / 24;
    if (daysUntilAppointment > service.maxAdvanceBooking) {
      throw new Error(`Appointments cannot be booked more than ${service.maxAdvanceBooking} days in advance`);
    }

    // Check for conflicts
    const endTime = new Date(appointmentDateTime.getTime() + service.duration * 60000);
    const conflicts = await this.appointmentRepository.findConflictingAppointments(
      data.businessId,
      new Date(data.date),
      appointmentDateTime,
      endTime
    );

    if (conflicts.length > 0) {
      throw new Error('Time slot not available');
    }

    // Create appointment
    const appointment = await this.appointmentRepository.create(userId, data);

    // Update user behavior
    await this.userBehaviorRepository.createOrUpdate(userId);

    return appointment;
  }

  async getAppointmentById(
    userId: string,
    appointmentId: string
  ): Promise<AppointmentWithDetails | null> {
    const appointment = await this.appointmentRepository.findByIdWithDetails(appointmentId);
    if (!appointment) return null;

    // Check permissions - users can view their own appointments, businesses can view theirs
    const isCustomer = appointment.customer.id === userId;
    const { resource: viewAllResource, action: viewAllAction } = this.splitPermissionName(PermissionName.VIEW_ALL_APPOINTMENTS);
    const hasGlobalView = await this.rbacService.hasPermission(userId, viewAllResource, viewAllAction);
    
    if (!isCustomer && !hasGlobalView) {
      const { resource: viewOwnResource, action: viewOwnAction } = this.splitPermissionName(PermissionName.VIEW_OWN_APPOINTMENTS);
      const hasBusinessView = await this.rbacService.hasPermission(
        userId,
        viewOwnResource,
        viewOwnAction,
        { businessId: appointment.businessId }
      );
      
      if (!hasBusinessView) {
        throw new Error('Access denied: You do not have permission to view this appointment');
      }
    }

    return appointment;
  }

  async getCustomerAppointments(
    userId: string,
    customerId: string,
    page = 1,
    limit = 20
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Users can view their own appointments, admins can view any
    if (userId !== customerId) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_APPOINTMENTS);
    }

    return await this.appointmentRepository.findByCustomerId(customerId, page, limit);
  }

  async getMyAppointments(
    userId: string,
    filters?: {
      status?: AppointmentStatus;
      date?: string;
      businessId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Check if user has business role - only OWNER and STAFF can access
    const userPermissions = await this.rbacService.getUserPermissions(userId);
    const roleNames = userPermissions.roles.map(role => role.name);
    const hasBusinessRole = roleNames.some(role => ['OWNER', 'STAFF'].includes(role));
    
    if (!hasBusinessRole) {
      throw new Error('Access denied. Business role required.');
    }

    // Get appointments from all businesses user has access to
    return await this.appointmentRepository.findByUserBusinesses(userId, filters);
  }

  async getBusinessAppointments(
    userId: string,
    businessId: string,
    page = 1,
    limit = 20
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Check permissions to view business appointments
    const { resource: viewAllResource, action: viewAllAction } = this.splitPermissionName(PermissionName.VIEW_ALL_APPOINTMENTS);
    const hasGlobalView = await this.rbacService.hasPermission(userId, viewAllResource, viewAllAction);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_APPOINTMENTS,
        { businessId }
      );
    }

    return await this.appointmentRepository.findByBusinessId(businessId, page, limit);
  }

  async searchAppointments(
    userId: string,
    filters: AppointmentSearchFilters,
    page = 1,
    limit = 20
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Check permissions based on filters
    if (filters.businessId) {
      const { resource: viewAllResource, action: viewAllAction } = this.splitPermissionName(PermissionName.VIEW_ALL_APPOINTMENTS);
      const hasGlobalView = await this.rbacService.hasPermission(userId, viewAllResource, viewAllAction);
      
      if (!hasGlobalView) {
        await this.rbacService.requirePermission(
          userId,
          PermissionName.VIEW_OWN_APPOINTMENTS,
          { businessId: filters.businessId }
        );
      }
    } else if (filters.customerId) {
      if (userId !== filters.customerId) {
        await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_APPOINTMENTS);
      }
    } else {
      // Global search requires admin permissions
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_APPOINTMENTS);
    }

    return await this.appointmentRepository.search(filters, page, limit);
  }

  // Public method for checking appointment availability - no permissions required
  async getPublicAppointments(
    filters: AppointmentSearchFilters,
    page = 1,
    limit = 20
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Only allow specific businessId queries for public access
    if (!filters.businessId) {
      throw new Error('Business ID is required for public appointment queries');
    }

    return await this.appointmentRepository.search(filters, page, limit);
  }

  async updateAppointment(
    userId: string,
    appointmentId: string,
    data: UpdateAppointmentRequest
  ): Promise<AppointmentData> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Check permissions
    const isCustomer = appointment.customerId === userId;
    const { resource: editAllResource, action: editAllAction } = this.splitPermissionName(PermissionName.EDIT_ALL_APPOINTMENTS);
    const hasGlobalEdit = await this.rbacService.hasPermission(userId, editAllResource, editAllAction);
    
    if (!isCustomer && !hasGlobalEdit) {
      const { resource: editOwnResource, action: editOwnAction } = this.splitPermissionName(PermissionName.EDIT_OWN_APPOINTMENTS);
      const hasBusinessEdit = await this.rbacService.hasPermission(
        userId,
        editOwnResource,
        editOwnAction,
        { businessId: appointment.businessId }
      );
      
      if (!hasBusinessEdit) {
        throw new Error('Access denied: You do not have permission to update this appointment');
      }
    }

    // Customer restrictions
    if (isCustomer) {
      // Customers can only update certain fields and only for future appointments
      const now = new Date();
      if (appointment.startTime <= now) {
        throw new Error('Cannot update past appointments');
      }

      // Customers can only update notes and cancel
      const allowedFields = ['customerNotes', 'status'];
      const hasRestrictedFields = Object.keys(data).some(key => !allowedFields.includes(key));
      
      if (hasRestrictedFields) {
        throw new Error('Customers can only update notes or cancel appointments');
      }

      // Status changes are restricted
      if (data.status && !['CANCELED'].includes(data.status)) {
        throw new Error('Customers can only cancel appointments');
      }
    }

    // If rescheduling, check availability
    if (data.date || data.startTime) {
      const newDate = data.date ? new Date(data.date) : appointment.date;
      const newStartTime = data.startTime ? new Date(`${data.date || appointment.date.toISOString().split('T')[0]}T${data.startTime}`) : appointment.startTime;
      
      const service = await this.serviceRepository.findById(appointment.serviceId);
      if (service) {
        const newEndTime = new Date(newStartTime.getTime() + service.duration * 60000);
        
        const conflicts = await this.appointmentRepository.findConflictingAppointments(
          appointment.businessId,
          newDate,
          newStartTime,
          newEndTime,
          appointmentId
        );

        if (conflicts.length > 0) {
          throw new Error('New time slot not available');
        }
      }
    }

    const updatedAppointment = await this.appointmentRepository.update(appointmentId, data);

    // Handle status changes
    if (data.status) {
      await this.handleStatusChange(userId, appointment, data.status);
    }

    return updatedAppointment;
  }

  async cancelAppointment(
    userId: string,
    appointmentId: string,
    reason?: string
  ): Promise<AppointmentData> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Check permissions
    const isCustomer = appointment.customerId === userId;
    const { resource: cancelAllResource, action: cancelAllAction } = this.splitPermissionName(PermissionName.CANCEL_ALL_APPOINTMENTS);
    const hasGlobalCancel = await this.rbacService.hasPermission(userId, cancelAllResource, cancelAllAction);
    
    if (!isCustomer && !hasGlobalCancel) {
      const { resource: cancelOwnResource, action: cancelOwnAction } = this.splitPermissionName(PermissionName.CANCEL_OWN_APPOINTMENTS);
      const hasBusinessCancel = await this.rbacService.hasPermission(
        userId,
        cancelOwnResource,
        cancelOwnAction,
        { businessId: appointment.businessId }
      );
      
      if (!hasBusinessCancel) {
        throw new Error('Access denied: You do not have permission to cancel this appointment');
      }
    }

    // Check if appointment can be cancelled
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new Error('Cannot cancel completed appointments');
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new Error('Appointment is already cancelled');
    }

    const cancelledAppointment = await this.appointmentRepository.cancel(appointmentId, reason);

    // Update user behavior if customer cancelled
    if (isCustomer) {
      await this.handleCustomerCancellation(userId, appointment);
    }

    return cancelledAppointment;
  }

  async markNoShow(
    userId: string,
    appointmentId: string
  ): Promise<AppointmentData> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Only businesses can mark no-shows
    const { resource: noShowResource, action: noShowAction } = this.splitPermissionName(PermissionName.MARK_NO_SHOW);
    const hasGlobalNoShow = await this.rbacService.hasPermission(userId, noShowResource, noShowAction);
    
    if (!hasGlobalNoShow) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MARK_NO_SHOW,
        { businessId: appointment.businessId }
      );
    }

    const updatedAppointment = await this.appointmentRepository.markNoShow(appointmentId);

    // Add strike to customer for no-show
    await this.userBehaviorRepository.addStrike(
      appointment.customerId,
      'No-show for appointment'
    );

    return updatedAppointment;
  }

  async getUpcomingAppointments(
    userId: string,
    limit = 10
  ): Promise<AppointmentWithDetails[]> {
    return await this.appointmentRepository.findUpcomingByCustomerId(userId, limit);
  }

  async getTodaysAppointments(
    userId: string,
    businessId?: string
  ): Promise<any[]> {
    // Get user's accessible businesses
    const businesses = await this.businessService.getMyBusinesses(userId);
    const accessibleBusinessIds = businesses.map(b => b.id);

    if (accessibleBusinessIds.length === 0) {
      throw new Error('No accessible businesses found');
    }

    // If specific business requested, validate access
    if (businessId) {
      if (!accessibleBusinessIds.includes(businessId)) {
        throw new Error('Access denied to this business');
      }
      return await this.appointmentRepository.findTodaysAppointments(businessId);
    }

    // Return today's appointments for all accessible businesses
    return await this.appointmentRepository.findTodaysAppointmentsForBusinesses(accessibleBusinessIds);
  }

  async getAppointmentStats(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    totalRevenue: number;
    averageValue: number;
  } | Record<string, {
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    totalRevenue: number;
    averageValue: number;
  }>> {
    // Get user's accessible businesses
    const businesses = await this.businessService.getMyBusinesses(userId);
    const accessibleBusinessIds = businesses.map(b => b.id);

    if (accessibleBusinessIds.length === 0) {
      throw new Error('No accessible businesses found');
    }

    // If specific business requested, validate access and return single stats
    if (businessId) {
      if (!accessibleBusinessIds.includes(businessId)) {
        throw new Error('Access denied to this business');
      }
      return await this.appointmentRepository.getAppointmentStats(businessId, startDate, endDate);
    }

    // Return stats for all accessible businesses
    return await this.appointmentRepository.getAppointmentStatsForBusinesses(accessibleBusinessIds, startDate, endDate);
  }

  async getMyTodaysAppointments(userId: string): Promise<any[]> {
    // Get user's accessible businesses
    const businesses = await this.businessService.getMyBusinesses(userId);
    const businessIds = businesses.map(b => b.id);

    if (businessIds.length === 0) {
      return [];
    }

    return await this.appointmentRepository.findTodaysAppointmentsForBusinesses(businessIds);
  }

  async getMyAppointmentStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, {
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    totalRevenue: number;
    averageValue: number;
  }>> {
    // Get user's accessible businesses
    const businesses = await this.businessService.getMyBusinesses(userId);
    const businessIds = businesses.map(b => b.id);

    if (businessIds.length === 0) {
      return {};
    }

    return await this.appointmentRepository.getAppointmentStatsForBusinesses(businessIds, startDate, endDate);
  }

  async confirmAppointment(
    userId: string,
    appointmentId: string
  ): Promise<AppointmentData> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Only businesses can confirm appointments
    const { resource: confirmResource, action: confirmAction } = this.splitPermissionName(PermissionName.CONFIRM_APPOINTMENTS);
    const hasGlobalConfirm = await this.rbacService.hasPermission(userId, confirmResource, confirmAction);
    
    if (!hasGlobalConfirm) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.CONFIRM_APPOINTMENTS,
        { businessId: appointment.businessId }
      );
    }

    return await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.CONFIRMED
    });
  }

  async completeAppointment(
    userId: string,
    appointmentId: string,
    internalNotes?: string
  ): Promise<AppointmentData> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Only businesses can complete appointments
    const { resource: completeResource, action: completeAction } = this.splitPermissionName(PermissionName.COMPLETE_APPOINTMENTS);
    const hasGlobalComplete = await this.rbacService.hasPermission(userId, completeResource, completeAction);
    
    if (!hasGlobalComplete) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.COMPLETE_APPOINTMENTS,
        { businessId: appointment.businessId }
      );
    }

    const completedAppointment = await this.appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.COMPLETED,
      internalNotes
    });

    // Update user behavior for completion
    await this.userBehaviorRepository.createOrUpdate(appointment.customerId);

    return completedAppointment;
  }

  async markReminderSent(appointmentId: string): Promise<void> {
    await this.appointmentRepository.markReminderSent(appointmentId);
  }

  // Private methods
  private async handleStatusChange(
    userId: string,
    appointment: AppointmentData,
    newStatus: AppointmentStatus
  ): Promise<void> {
    switch (newStatus) {
      case AppointmentStatus.CANCELED:
        if (appointment.customerId === userId) {
          await this.handleCustomerCancellation(userId, appointment);
        }
        break;
      case AppointmentStatus.NO_SHOW:
        await this.userBehaviorRepository.addStrike(
          appointment.customerId,
          'No-show for appointment'
        );
        break;
      case AppointmentStatus.COMPLETED:
        await this.userBehaviorRepository.createOrUpdate(appointment.customerId);
        break;
    }
  }

  private async handleCustomerCancellation(
    customerId: string,
    appointment: AppointmentData
  ): Promise<void> {
    const now = new Date();
    const hoursUntilAppointment = (appointment.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Add strike if cancellation is too close to appointment time
    if (hoursUntilAppointment < 24) {
      await this.userBehaviorRepository.addStrike(
        customerId,
        'Late cancellation (less than 24 hours notice)'
      );
    } else {
      // Just update the behavior record
      await this.userBehaviorRepository.createOrUpdate(customerId);
    }
  }

  // Admin methods
  async getAllAppointments(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_APPOINTMENTS);

    const filters: AppointmentSearchFilters = {};
    return await this.appointmentRepository.search(filters, page, limit);
  }

  async batchUpdateAppointmentStatus(
    userId: string,
    appointmentIds: string[],
    status: AppointmentStatus
  ): Promise<void> {
    await this.rbacService.requirePermission(userId, PermissionName.EDIT_ALL_APPOINTMENTS);

    for (const appointmentId of appointmentIds) {
      await this.appointmentRepository.update(appointmentId, { status });
    }
  }

  async batchCancelAppointments(
    userId: string,
    appointmentIds: string[],
    reason: string
  ): Promise<void> {
    await this.rbacService.requirePermission(userId, PermissionName.CANCEL_ALL_APPOINTMENTS);

    for (const appointmentId of appointmentIds) {
      await this.appointmentRepository.cancel(appointmentId, reason);
    }
  }
}