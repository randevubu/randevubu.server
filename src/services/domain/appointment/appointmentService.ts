import {
  AppointmentData,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchFilters,
  AppointmentStatus
} from '../../../types/business';
import { AppointmentRepository } from '../../../repositories/appointmentRepository';
import { ServiceRepository } from '../../../repositories/serviceRepository';
import { UserBehaviorRepository } from '../../../repositories/userBehaviorRepository';
import { BusinessClosureRepository } from '../../../repositories/businessClosureRepository';
import { RepositoryContainer } from '../../../repositories';
import { RBACService } from '../rbac';
import { PermissionName } from '../../../types/auth';
import { createDateTimeInIstanbul, getCurrentTimeInIstanbul } from '../../../utils/timezoneHelper';
import { BusinessContext } from '../../../middleware/businessContext';
import { BusinessService } from '../business';
import { NotificationService } from '../notification';
import { UsageService } from '../usage';
import { PrismaClient } from '@prisma/client';

export class AppointmentService {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private serviceRepository: ServiceRepository,
    private userBehaviorRepository: UserBehaviorRepository,
    private businessClosureRepository: BusinessClosureRepository,
    private rbacService: RBACService,
    private businessService: BusinessService,
    private notificationService: NotificationService,
    private usageService: UsageService,
    private prisma: PrismaClient,
    private repositories?: RepositoryContainer
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
    // Determine the actual customer for this appointment
    const customerId = data.customerId || userId;
    const isBookingForOther = data.customerId && data.customerId !== userId;

    // If booking for another customer, check permissions
    if (isBookingForOther) {
      const { resource, action } = this.splitPermissionName(PermissionName.EDIT_ALL_APPOINTMENTS);
      const hasPermission = await this.rbacService.hasPermission(
        userId,
        resource,
        action,
        { businessId: data.businessId }
      );

      if (!hasPermission) {
        throw new Error('You do not have permission to create appointments for other customers');
      }

      // Validate that the customer exists
      if (!this.repositories?.userRepository) {
        throw new Error('User repository not available');
      }

      const customer = await this.repositories.userRepository.findById(data.customerId!);
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (!customer.isActive) {
        throw new Error('Customer account is not active');
      }
    }

    // Check if user is banned (only check for the actual customer, not the person creating)
    const userBehavior = await this.userBehaviorRepository.findByUserId(customerId);
    if (userBehavior?.isBanned) {
      const banMessage = userBehavior.bannedUntil
        ? `Customer is banned until ${userBehavior.bannedUntil.toLocaleDateString()}`
        : 'Customer is permanently banned';
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

    // Validate staff member exists and is active for this business
    if (!this.repositories?.staffRepository) {
      throw new Error('Staff repository not available');
    }
    
    const staffMember = await this.repositories.staffRepository.findById(data.staffId);
    if (!staffMember) {
      throw new Error('Staff member not found');
    }
    
    if (!staffMember.isActive) {
      throw new Error('Staff member is not active');
    }
    
    if (staffMember.businessId !== data.businessId) {
      throw new Error('Staff member does not belong to this business');
    }

    // Check appointment time constraints - convert to Istanbul timezone
    const appointmentDateTime = createDateTimeInIstanbul(data.date, data.startTime);
    const now = getCurrentTimeInIstanbul();

    console.log('🕐 Timezone Debug:', {
      inputDate: data.date,
      inputTime: data.startTime,
      appointmentDateTime: appointmentDateTime.toISOString(),
      now: now.toISOString(),
      appointmentDateTimeLocal: appointmentDateTime.toString(),
      nowLocal: now.toString(),
      appointmentTimestamp: appointmentDateTime.getTime(),
      nowTimestamp: now.getTime(),
      diff: appointmentDateTime.getTime() - now.getTime(),
      hoursUntil: (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    });

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

    // Check for staff-specific conflicts
    const endTime = new Date(appointmentDateTime.getTime() + service.duration * 60000);
    const appointmentDate = createDateTimeInIstanbul(data.date, '00:00');
    const conflicts = await this.appointmentRepository.findConflictingAppointments(
      data.businessId,
      appointmentDate,
      appointmentDateTime,
      endTime,
      data.staffId // Add staffId to check conflicts for specific staff
    );

    if (conflicts.length > 0) {
      throw new Error('Staff member is not available at the selected time');
    }

    // Create appointment
    const appointment = await this.appointmentRepository.create(customerId, data);

    // Record appointment usage for subscription tracking
    await this.usageService.recordAppointmentUsage(data.businessId);

    // Update user behavior for the customer (not the person creating the appointment)
    await this.userBehaviorRepository.createOrUpdate(customerId);

    // Send notification to business owner/staff about new appointment
    try {
      console.log('🔍 APPOINTMENT CREATION - About to call notifyNewAppointment for appointment:', appointment.id);
      await this.notifyNewAppointment(appointment, service);
      console.log('🔍 APPOINTMENT CREATION - notifyNewAppointment completed for appointment:', appointment.id);
    } catch (notificationError) {
      // Log notification error but don't fail the appointment creation
      console.error('❌ APPOINTMENT CREATION - Failed to send appointment notification:', notificationError);
    }

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

  // checked 
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
      const now = getCurrentTimeInIstanbul();
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
      const newDate = data.date ? createDateTimeInIstanbul(data.date, '00:00') : appointment.date;
      const dateStr = data.date || appointment.date.toISOString().split('T')[0];
      const newStartTime = data.startTime ? createDateTimeInIstanbul(dateStr, data.startTime) : appointment.startTime;
      
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

  async getNearestAppointmentInCurrentHour(userId: string): Promise<AppointmentWithDetails | null> {
    const now = getCurrentTimeInIstanbul();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
    
    return await this.appointmentRepository.findNearestAppointmentInTimeRange(
      userId, 
      currentHour, 
      nextHour
    );
  }

  async getAppointmentsInCurrentHour(userId: string): Promise<AppointmentWithDetails[]> {
    const now = getCurrentTimeInIstanbul();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
    
    return await this.appointmentRepository.findAppointmentsInTimeRange(
      userId, 
      currentHour, 
      nextHour
    );
  }

  async markReminderSent(appointmentId: string): Promise<void> {
    await this.appointmentRepository.markReminderSent(appointmentId);
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
    const now = getCurrentTimeInIstanbul();
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

  /**
   * Send notification to business owner/staff about new appointment booking
   */
  private async notifyNewAppointment(appointment: AppointmentData, service: { name: string; duration: number; price: number; currency: string }): Promise<void> {
    try {
      console.log('🔍 NOTIFY NEW APPOINTMENT - Starting notification process for appointment:', appointment.id);
      
      // Get business details to find owner/staff (direct Prisma query to avoid RBAC issues)
      const business = await this.prisma.business.findUnique({
        where: { id: appointment.businessId },
        select: { id: true, name: true, ownerId: true, isActive: true }
      });
      
      if (!business) {
        console.error('Business not found for notification:', appointment.businessId);
        return;
      }

      if (!business.isActive) {
        console.log('Business is inactive, skipping notification:', appointment.businessId);
        return;
      }

      // Get business notification settings
      console.log('🔍 Getting business notification settings for businessId:', appointment.businessId);
      const businessSettings = await this.businessService.getOrCreateBusinessNotificationSettings(appointment.businessId);
      
      // Debug: Log current notification settings
      console.log('🔍 Business notification settings retrieved:', {
        businessId: appointment.businessId,
        pushEnabled: businessSettings.pushEnabled,
        smsEnabled: businessSettings.smsEnabled,
        emailEnabled: businessSettings.emailEnabled,
        settingsId: businessSettings.id
      });
      
      // Check if any notifications are enabled
      if (!businessSettings.pushEnabled && !businessSettings.smsEnabled) {
        console.log('All notifications disabled for business, skipping notification:', appointment.businessId);
        return;
      }

      // Get customer details for the notification
      const customer = await this.repositories?.userRepository.findById(appointment.customerId);
      if (!customer) {
        console.error('Customer not found for notification:', appointment.customerId);
        return;
      }

      // Format appointment date and time
      const appointmentDate = new Date(appointment.date).toLocaleDateString();
      const appointmentTime = new Date(appointment.startTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Create notification content
      const title = 'New Appointment Booking';
      const body = `${customer.firstName} ${customer.lastName} booked ${service.name} for ${appointmentDate} at ${appointmentTime}`;

      // Send push notification to business owner (if enabled)
      if (businessSettings.pushEnabled) {
        await this.notificationService.sendPushNotification({
          userId: business.ownerId,
          appointmentId: appointment.id,
          businessId: appointment.businessId,
          title,
          body,
          icon: undefined,
          badge: undefined,
          data: {
            appointmentId: appointment.id,
            customerId: appointment.customerId,
            customerName: `${customer.firstName} ${customer.lastName}`,
            serviceName: service.name,
            businessName: business.name,
            appointmentDate,
            appointmentTime,
            type: 'new_appointment'
          },
          url: `/appointments/${appointment.id}`
        });
        console.log(`Push notification sent to business owner: ${business.ownerId}`);
      } else {
        console.log('Push notifications disabled for business, skipping push notification');
      }

      // Send SMS notification to business owner (if enabled)
      if (businessSettings.smsEnabled) {
        console.log('SMS notifications enabled, sending SMS to business owner');
        
        // Validate that customer has required fields for SMS notification
        if (!customer.firstName || !customer.lastName || !customer.phoneNumber) {
          console.warn('Customer missing required fields for SMS notification:', {
            customerId: customer.id,
            hasFirstName: !!customer.firstName,
            hasLastName: !!customer.lastName,
            hasPhoneNumber: !!customer.phoneNumber
          });
          console.log('Skipping SMS notification due to missing customer data');
        } else {
          await this.sendSMSAppointmentNotification(business, {
            firstName: customer.firstName,
            lastName: customer.lastName,
            phoneNumber: customer.phoneNumber
          }, service, appointment, appointmentDate, appointmentTime);
        }
      } else {
        console.log('SMS notifications disabled for business, skipping SMS notification');
      }

      console.log(`Appointment notification processing completed for business: ${business.ownerId}`);

    } catch (error) {
      console.error('Error sending new appointment notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification to business owner about new appointment booking
   */
  private async sendSMSAppointmentNotification(
    business: { id: string; name: string; ownerId: string },
    customer: { firstName: string; lastName: string; phoneNumber: string },
    service: { name: string },
    appointment: AppointmentData,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<void> {
    try {
      console.log('🔍 SMS Notification Debug - Starting SMS notification process');
      
      // Get business owner's phone number
      const businessOwner = await this.prisma.user.findUnique({
        where: { id: business.ownerId },
        select: { phoneNumber: true, firstName: true, lastName: true }
      });

      console.log('🔍 SMS Notification Debug - Business owner data:', {
        ownerId: business.ownerId,
        hasPhoneNumber: !!businessOwner?.phoneNumber,
        phoneNumber: businessOwner?.phoneNumber ? `${businessOwner.phoneNumber.slice(0, 3)}***${businessOwner.phoneNumber.slice(-3)}` : 'N/A'
      });

      if (!businessOwner || !businessOwner.phoneNumber) {
        console.log('❌ Business owner phone number not found, skipping SMS notification');
        return;
      }

      // Check if business can send SMS based on subscription limits
      if (this.usageService) {
        console.log('🔍 SMS Notification Debug - Checking SMS quota...');
        const canSendSms = await this.usageService.canSendSms(business.id);
        console.log('🔍 SMS Notification Debug - SMS quota check result:', canSendSms);
        
        if (!canSendSms.allowed) {
          console.log(`❌ SMS quota exceeded for business ${business.id}: ${canSendSms.reason}`);
          return;
        }
      } else {
        console.log('⚠️ Usage service not available, skipping SMS quota check');
      }

      // Create SMS message
      const message = `Yeni Randevu: ${customer.firstName} ${customer.lastName} ${service.name} hizmeti için ${appointmentDate} tarihinde saat ${appointmentTime}'de randevu aldı. Detaylar: https://randevubu.com/appointments/${appointment.id}`;
      
      console.log('🔍 SMS Notification Debug - SMS message created:', {
        messageLength: message.length,
        customerName: `${customer.firstName} ${customer.lastName}`,
        serviceName: service.name,
        appointmentDate,
        appointmentTime
      });

      // Send SMS using the existing SMS service
      console.log('🔍 SMS Notification Debug - Importing SMS service...');
      const { SMSService } = await import('../sms/smsService');
      const smsService = new SMSService();
      
      // Check SMS service configuration
      console.log('🔍 SMS Notification Debug - SMS service configuration:', {
        hasApiKey: !!process.env.ILETI_MERKEZI_API_KEY,
        hasSecretKey: !!process.env.ILETI_MERKEZI_SECRET_KEY,
        sender: process.env.ILETI_MERKEZI_SENDER || 'APITEST',
        nodeEnv: process.env.NODE_ENV
      });

      console.log('🔍 SMS Notification Debug - Sending SMS...');
      const result = await smsService.sendSMS({
        phoneNumber: businessOwner.phoneNumber,
        message,
        context: { requestId: `appointment-${appointment.id}` }
      });

      console.log('🔍 SMS Notification Debug - SMS service result:', {
        success: result.success,
        error: result.error,
        messageId: result.messageId
      });

      if (result.success) {
        // Record SMS usage after successful sending
        if (this.usageService) {
          console.log('🔍 SMS Notification Debug - Recording SMS usage...');
          await this.usageService.recordSmsUsage(business.id, 1);
        }
        console.log(`✅ SMS notification sent to business owner: ${businessOwner.phoneNumber.slice(0, 3)}***${businessOwner.phoneNumber.slice(-3)}`);
      } else {
        console.error('❌ Failed to send SMS notification:', result.error);
      }

    } catch (error) {
      console.error('❌ Error sending SMS appointment notification:', error);
      // Don't throw error to avoid breaking the appointment creation process
    }
  }
}