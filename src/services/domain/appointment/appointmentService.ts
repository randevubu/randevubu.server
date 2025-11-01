import {
  AppointmentData,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchFilters,
  AppointmentStatus
} from '../../../types/business';
// Removed DTO imports - keeping service layer focused on business logic
import { AppointmentRepository } from '../../../repositories/appointmentRepository';
import { ServiceRepository } from '../../../repositories/serviceRepository';
import { UserBehaviorRepository } from '../../../repositories/userBehaviorRepository';
import { BusinessClosureRepository } from '../../../repositories/businessClosureRepository';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { RepositoryContainer } from '../../../repositories';
import { RBACService } from '../rbac';
import { PermissionName } from '../../../types/auth';
import { createDateTimeInIstanbul, getCurrentTimeInIstanbul, formatDateTimeForAPI } from '../../../utils/timezoneHelper';
import { BusinessContext } from '../../../middleware/businessContext';
import { BusinessService } from '../business';
import { NotificationService } from '../notification';
import { UnifiedNotificationGateway } from '../notification/unifiedNotificationGateway';
import { ReservationSettings, BusinessSettings } from '../../../types/reservationSettings';
import { UsageService } from '../usage';
import { PrismaClient } from '@prisma/client';
import { CancellationPolicyService } from '../business/cancellationPolicyService';
import { PolicyEnforcementContext, PolicyCheckResult } from '../../../types/cancellationPolicy';
import { AuthorizationError } from '../../../utils/errors/customError';

export class AppointmentService {
  private cancellationPolicyService: CancellationPolicyService;
  private notificationGateway: UnifiedNotificationGateway;

  constructor(
    private appointmentRepository: AppointmentRepository,
    private serviceRepository: ServiceRepository,
    private userBehaviorRepository: UserBehaviorRepository,
    private businessClosureRepository: BusinessClosureRepository,
    private businessRepository: BusinessRepository,
    private rbacService: RBACService,
    private businessService: BusinessService,
    private notificationService: NotificationService,
    private usageService: UsageService,
    private repositories: RepositoryContainer,
    private prisma?: PrismaClient
  ) {
    this.cancellationPolicyService = new CancellationPolicyService(
      this.userBehaviorRepository,
      this.businessRepository
    );
    // Get prisma instance - use provided prisma or fall back to creating new client
    const prismaInstance = prisma || (repositories as any).prisma;
    if (!prismaInstance) {
      throw new Error('Prisma client is required for UnifiedNotificationGateway');
    }
    this.notificationGateway = new UnifiedNotificationGateway(
      prismaInstance,
      repositories,
      usageService
    );
  }

  // Helper method to split permission name into resource and action
  private splitPermissionName(permissionName: string): { resource: string; action: string } {
    const [resource, action] = permissionName.split(':');
    return { resource, action };
  }

  // Helper method to validate business reservation rules (for non-transaction use)
  private async validateBusinessReservationRules(
    businessId: string,
    appointmentDateTime: Date,
    customerId?: string,
    serviceDuration?: number,
    serviceMinAdvanceBooking?: number
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const settings = (business.settings as BusinessSettings) || {};
    const reservationSettings = settings.reservationSettings;

    // Use default values if settings not configured
    const rules: ReservationSettings = {
      maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
      minNotificationHours: reservationSettings?.minNotificationHours || 2,
      maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
    };

    const now = new Date();

    // 0. Check if appointment is in the past
    if (appointmentDateTime <= now) {
      throw new Error('Appointments cannot be booked in the past');
    }

    // 1. Check maximum advance booking days
    const daysDifference = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > rules.maxAdvanceBookingDays) {
      throw new Error(`Appointments cannot be booked more than ${rules.maxAdvanceBookingDays} days in advance`);
    }

    // 2. Check minimum advance booking - use service setting if provided, otherwise business setting
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const minAdvanceHours = serviceMinAdvanceBooking !== undefined ? serviceMinAdvanceBooking : rules.minNotificationHours;
    
    if (hoursDifference < minAdvanceHours) {
      throw new Error(`Appointments must be booked at least ${minAdvanceHours} hours in advance`);
    }

    // 3. Check maximum daily appointments for this specific business
    const appointmentDateStart = new Date(appointmentDateTime);
    appointmentDateStart.setHours(0, 0, 0, 0);
    
    const appointmentDateEnd = new Date(appointmentDateTime);
    appointmentDateEnd.setHours(23, 59, 59, 999);

    // Get existing appointments count for this business on this day
    const existingAppointments = await this.appointmentRepository.findByBusinessAndDateRange(
      businessId,
      appointmentDateStart,
      appointmentDateEnd
    );
    
    // Filter out cancelled appointments
    const activeAppointmentsCount = existingAppointments.filter(
      apt => apt.status !== 'CANCELED'
    ).length;

    if (activeAppointmentsCount >= rules.maxDailyAppointments) {
      throw new Error(`Maximum daily appointments (${rules.maxDailyAppointments}) has been reached for this business on this date`);
    }

    // 4. Check if customer already has a conflicting appointment with this business
    if (customerId) {
      const customerAppointmentsOnSameDay = existingAppointments.filter(
        (apt: any) => apt.customerId === customerId && apt.status !== 'CANCELED'
      );

      // Check for time conflicts with existing appointments
      const hasTimeConflict = customerAppointmentsOnSameDay.some((apt: any) => {
        const existingStart = new Date(apt.startTime);
        const existingEnd = new Date(apt.endTime);
        const newStart = appointmentDateTime;
        const duration = serviceDuration || 60; // Default to 60 minutes if not provided
        const newEnd = new Date(appointmentDateTime.getTime() + duration * 60000);
        
        // Check if appointments overlap
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasTimeConflict) {
        throw new Error('You already have an appointment at this time with this business');
      }
    }

    // 5. Additional business-specific validations could be added here
    // For example: business-specific customer limits, time restrictions, etc.
  }

  // Helper method to validate business reservation rules within transaction
  private async validateBusinessReservationRulesInTransaction(
    tx: any,
    businessId: string,
    appointmentDateTime: Date,
    customerId?: string,
    serviceDuration?: number
  ): Promise<void> {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { id: true, settings: true }
    });
    
    if (!business) {
      throw new Error('Business not found');
    }

    const settings = (business.settings as BusinessSettings) || {};
    const reservationSettings = settings.reservationSettings;

    // Use default values if settings not configured
    const rules: ReservationSettings = {
      maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
      minNotificationHours: reservationSettings?.minNotificationHours || 2,
      maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
    };

    const now = new Date();

    // 0. Check if appointment is in the past
    if (appointmentDateTime <= now) {
      throw new Error('Appointments cannot be booked in the past');
    }

    // 1. Check maximum advance booking days
    const daysDifference = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > rules.maxAdvanceBookingDays) {
      throw new Error(`Appointments cannot be booked more than ${rules.maxAdvanceBookingDays} days in advance`);
    }

    // 2. Check minimum notification period
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < rules.minNotificationHours) {
      throw new Error(`Appointments must be booked at least ${rules.minNotificationHours} hours in advance`);
    }

    // 3. Check maximum daily appointments for this specific business
    const appointmentDateStart = new Date(appointmentDateTime);
    appointmentDateStart.setHours(0, 0, 0, 0);
    
    const appointmentDateEnd = new Date(appointmentDateTime);
    appointmentDateEnd.setHours(23, 59, 59, 999);

    // Get existing appointments count for this business on this day using transaction client
    const existingAppointments = await tx.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: appointmentDateStart,
          lte: appointmentDateEnd
        }
      }
    });
    
    // Filter out cancelled appointments
    const activeAppointmentsCount = existingAppointments.filter(
      (apt: any) => apt.status !== 'CANCELED'
    ).length;

    if (activeAppointmentsCount >= rules.maxDailyAppointments) {
      throw new Error(`Maximum daily appointments (${rules.maxDailyAppointments}) has been reached for this business on this date`);
    }

    // 4. Check if customer already has a conflicting appointment with this business
    if (customerId) {
      const customerAppointmentsOnSameDay = existingAppointments.filter(
        (apt: any) => apt.customerId === customerId && apt.status !== 'CANCELED'
      );

      // Check for time conflicts with existing appointments
      const hasTimeConflict = customerAppointmentsOnSameDay.some((apt: any) => {
        const existingStart = new Date(apt.startTime);
        const existingEnd = new Date(apt.endTime);
        const newStart = appointmentDateTime;
        const duration = serviceDuration || 60; // Default to 60 minutes if not provided
        const newEnd = new Date(appointmentDateTime.getTime() + duration * 60000);
        
        // Check if appointments overlap
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasTimeConflict) {
        throw new Error('You already have an appointment at this time with this business');
      }
    }
  }

  async createAppointment(
    userId: string,
    data: CreateAppointmentRequest
  ): Promise<AppointmentData> {
    // Determine the actual customer for this appointment
    const customerId = data.customerId || userId;
    const isBookingForOther = data.customerId && data.customerId !== userId;

    // Validate that customer has firstName and lastName before allowing booking
    if (!this.repositories?.userRepository) {
      throw new Error('User repository not available');
    }

    const customer = await this.repositories.userRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (!customer.firstName || !customer.lastName) {
      throw new Error('Please complete your profile with first name and last name before booking an appointment');
    }

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
    }

    // Check if customer account is active
    if (!customer.isActive) {
      throw new Error('Customer account is not active');
    }

    // Check if user is banned (only check for the actual customer, not the person creating)
    const userBehavior = await this.userBehaviorRepository.findByUserId(customerId);
    if (userBehavior?.isBanned) {
      const banMessage = userBehavior.bannedUntil
        ? `Customer is banned until ${userBehavior.bannedUntil.toLocaleDateString()}`
        : 'Customer is permanently banned';
      throw new Error(`Cannot book appointment: ${banMessage}. Reason: ${userBehavior.banReason}`);
    }

    // Check cancellation policies before allowing appointment booking
    const appointmentDateTime = createDateTimeInIstanbul(data.date, data.startTime);
    const policyContext: PolicyEnforcementContext = {
      customerId,
      businessId: data.businessId,
      appointmentDate: appointmentDateTime,
      action: 'BOOK',
      currentTime: getCurrentTimeInIstanbul()
    };

    const policyCheck = await this.cancellationPolicyService.checkPolicyViolations(policyContext);
    if (!policyCheck.allowed) {
      const violationMessages = policyCheck.violations
        .filter(v => v.isViolation)
        .map(v => v.message)
        .join('; ');
      throw new Error(`Cannot book appointment: ${violationMessages}`);
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
    const now = getCurrentTimeInIstanbul();

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
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
    }

    // Validate business-level reservation rules (includes service-level validation)
    await this.validateBusinessReservationRules(data.businessId, appointmentDateTime, customerId, service.duration, service.minAdvanceBooking);

    // Check service-level maximum advance booking (keep existing logic as fallback)
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
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

    // CRITICAL: Use transaction to prevent race conditions
    if (!this.prisma) {
      throw new Error('Prisma client not available for transaction');
    }
    
    let appointment: AppointmentData;
    try {
      appointment = await this.prisma.$transaction(async (tx) => {
      // Create appointment within transaction using the transaction client
      const service = await tx.service.findUnique({
        where: { id: data.serviceId }
      });

      if (!service) {
        throw new Error('Service not found');
      }

      // CRITICAL: Re-validate business rules within transaction using transaction client
      await this.validateBusinessReservationRulesInTransaction(tx, data.businessId, appointmentDateTime, customerId, service.duration);

      const startDateTime = createDateTimeInIstanbul(data.date, data.startTime);
      const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

      // Re-check conflicts IN TRANSACTION to prevent race conditions
      const conflicting = await tx.appointment.findMany({
        where: {
          businessId: data.businessId,
          staffId: data.staffId,
          date: createDateTimeInIstanbul(data.date, '00:00'),
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          OR: [
            { AND: [{ startTime: { lte: startDateTime } }, { endTime: { gt: startDateTime } }] },
            { AND: [{ startTime: { lt: endDateTime } }, { endTime: { gte: endDateTime } }] },
            { AND: [{ startTime: { gte: startDateTime } }, { endTime: { lte: endDateTime } }] }
          ]
        }
      });
      if (conflicting.length > 0) {
        throw new Error('Staff member is not available at the selected time');
      }
      const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await tx.appointment.create({
        data: {
          id: appointmentId,
          businessId: data.businessId,
          serviceId: data.serviceId,
          staffId: data.staffId,
          customerId,
          date: createDateTimeInIstanbul(data.date, '00:00'),
          startTime: startDateTime,
          endTime: endDateTime,
          duration: service.duration,
          status: AppointmentStatus.CONFIRMED,
          price: service.price,
          currency: service.currency,
          customerNotes: data.customerNotes,
          bookedAt: getCurrentTimeInIstanbul(),
          reminderSent: false
        }
      });
      
      // Map the result to AppointmentData format
      return {
        id: result.id,
        businessId: result.businessId,
        serviceId: result.serviceId,
        staffId: result.staffId || undefined,
        customerId: result.customerId,
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.duration,
        status: result.status as AppointmentStatus,
        price: Number(result.price),
        currency: result.currency,
        customerNotes: result.customerNotes || undefined,
        internalNotes: result.internalNotes || undefined,
        bookedAt: result.bookedAt,
        confirmedAt: result.confirmedAt || undefined,
        completedAt: result.completedAt || undefined,
        canceledAt: result.canceledAt || undefined,
        cancelReason: result.cancelReason || undefined,
        reminderSent: result.reminderSent,
        reminderSentAt: result.reminderSentAt || undefined,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const cause = String((e as any)?.meta?.cause || '');
      if (msg.includes('appointments_no_overlap_per_staff') || cause.includes('appointments_no_overlap_per_staff')) {
        throw new Error('This time slot was just booked by someone else. Please pick another.');
      }
      throw e;
    }

    // Record appointment usage for subscription tracking
    await this.usageService.recordAppointmentUsage(data.businessId);

    // Update user behavior for the customer (not the person creating the appointment)
    await this.userBehaviorRepository.createOrUpdate(customerId);

    // Send notification to business owner/staff about new appointment
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 APPOINTMENT CREATION - About to call notifyNewAppointment for appointment:', appointment.id);
      }
      await this.notifyNewAppointment(appointment, service);
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 APPOINTMENT CREATION - notifyNewAppointment completed for appointment:', appointment.id);
      }
    } catch (notificationError) {
      // Log notification error but don't fail the appointment creation
      console.error('❌ APPOINTMENT CREATION - Failed to send business owner notification:', notificationError);
    }

    // Send booking confirmation SMS to customer
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 APPOINTMENT CREATION - Sending booking confirmation to customer:', customer.id);
      }
      await this.sendCustomerBookingConfirmation(appointment, service, {
        id: customer.id,
        firstName: customer.firstName ?? null,
        lastName: customer.lastName ?? null,
        phoneNumber: customer.phoneNumber
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 APPOINTMENT CREATION - Customer confirmation sent for appointment:', appointment.id);
      }
    } catch (notificationError) {
      // Log notification error but don't fail the appointment creation
      console.error('❌ APPOINTMENT CREATION - Failed to send customer confirmation:', notificationError);
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
      throw new AuthorizationError('Access denied. Business role required.');
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

    // If rescheduling, check availability and business rules
    if (data.date || data.startTime) {
      const newDate = data.date ? createDateTimeInIstanbul(data.date, '00:00') : appointment.date;
      const dateStr = data.date || appointment.date.toISOString().split('T')[0];
      const newStartTime = data.startTime ? createDateTimeInIstanbul(dateStr, data.startTime) : appointment.startTime;
      
      // CRITICAL: Validate business reservation rules for rescheduling
      await this.validateBusinessReservationRules(appointment.businessId, newStartTime, appointment.customerId);
      
      const service = await this.serviceRepository.findById(appointment.serviceId);
      if (service) {
        const newEndTime = new Date(newStartTime.getTime() + service.duration * 60000);
        
        const conflicts = await this.appointmentRepository.findConflictingAppointments(
          appointment.businessId,
          newDate,
          newStartTime,
          newEndTime,
          undefined,
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

    // Check cancellation policies before allowing cancellation
    const policyContext: PolicyEnforcementContext = {
      customerId: appointment.customerId,
      businessId: appointment.businessId,
      appointmentDate: appointment.startTime,
      action: 'CANCEL',
      currentTime: getCurrentTimeInIstanbul()
    };

    const policyCheck = await this.cancellationPolicyService.checkPolicyViolations(policyContext);
    if (!policyCheck.allowed) {
      const violationMessages = policyCheck.violations
        .filter(v => v.isViolation)
        .map(v => v.message)
        .join('; ');
      throw new Error(`Cannot cancel appointment: ${violationMessages}`);
    }

    const cancelledAppointment = await this.appointmentRepository.cancel(appointmentId, reason);

    // Update user behavior if customer cancelled
    if (isCustomer) {
      await this.handleCustomerCancellation(userId, appointment);
      
      // Handle policy violation if customer exceeded limits
      await this.cancellationPolicyService.handlePolicyViolation(
        appointment.customerId,
        appointment.businessId,
        'CANCELLATION',
        'Customer exceeded monthly cancellation limit'
      );
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

    // Check no-show policies before marking as no-show
    const policyContext: PolicyEnforcementContext = {
      customerId: appointment.customerId,
      businessId: appointment.businessId,
      appointmentDate: appointment.startTime,
      action: 'NO_SHOW',
      currentTime: getCurrentTimeInIstanbul()
    };

    const policyCheck = await this.cancellationPolicyService.checkPolicyViolations(policyContext);
    if (!policyCheck.allowed) {
      const violationMessages = policyCheck.violations
        .filter(v => v.isViolation)
        .map(v => v.message)
        .join('; ');
      throw new Error(`Cannot mark as no-show: ${violationMessages}`);
    }

    const updatedAppointment = await this.appointmentRepository.markNoShow(appointmentId);

    // Add strike to customer for no-show and handle policy violation
    await this.userBehaviorRepository.addStrike(
      appointment.customerId,
      'No-show for appointment'
    );

    // Handle policy violation if customer exceeded limits
    await this.cancellationPolicyService.handlePolicyViolation(
      appointment.customerId,
      appointment.businessId,
      'NO_SHOW',
      'Customer exceeded monthly no-show limit'
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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 NOTIFY NEW APPOINTMENT - Starting notification process for appointment:', appointment.id);
      }
      
      // Get business details to find owner/staff
      const business = await this.repositories.businessRepository.findById(appointment.businessId);
      
      if (!business) {
        console.error('Business not found for notification:', appointment.businessId);
        return;
      }

      if (!business.isActive) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Business is inactive, skipping notification:', appointment.businessId);
        }
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

      // Use unified notification gateway - respects all business settings
      const result = await this.notificationGateway.sendSystemAlert({
        businessId: appointment.businessId,
        userId: business.ownerId,
        title,
        body,
        appointmentId: appointment.id,
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

      if (result.success) {
        console.log(`✅ Appointment notification sent to business owner: ${business.ownerId} via ${result.sentChannels.join(', ')}`);
      } else {
        console.log(`⚠️ Appointment notification skipped: ${result.skippedChannels.map(sc => sc.reason).join(', ')}`);
      }

    } catch (error) {
      console.error('Error sending new appointment notification:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation SMS to customer
   * Always sends SMS - this is a critical transactional message
   */
  private async sendCustomerBookingConfirmation(
    appointment: AppointmentData,
    service: { name: string; duration: number },
    customer: { id: string; firstName: string | null; lastName: string | null; phoneNumber: string }
  ): Promise<void> {
    try {
      // Get business details
      const business = await this.businessRepository.findById(appointment.businessId);
      if (!business) {
        console.error('Business not found for booking confirmation:', appointment.businessId);
        return;
      }

      // Ensure customer has phone number
      if (!customer.phoneNumber) {
        console.warn(`Customer ${customer.id} has no phone number for booking confirmation`);
        return;
      }

      // Format appointment date and time
      const appointmentDate = appointment.startTime.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const appointmentTime = appointment.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Create confirmation message in Turkish
      const message = `Randevunuz onaylandı!\n\n${business.name}\n${service.name}\n${appointmentDate} - ${appointmentTime}\n\nİptal için: https://randevubu.com/appointments/${appointment.id}`;

      // Send SMS directly - this is critical and should always attempt
      // We use the gateway's sendCriticalSMS for transactional confirmations
      const result = await this.notificationGateway.sendCriticalSMS(
        customer.phoneNumber,
        message,
        { requestId: `booking-${appointment.id}` }
      );

      if (result.success) {
        console.log(`✅ Booking confirmation SMS sent to customer: ${customer.phoneNumber.slice(0, 3)}***${customer.phoneNumber.slice(-3)}`);
      } else {
        console.error(`❌ Failed to send booking confirmation SMS: ${result.error}`);
      }

    } catch (error) {
      console.error('❌ Error sending customer booking confirmation:', error);
      // Don't throw - we don't want to fail appointment creation if notification fails
    }
  }


  /**
   * Get monitor appointments - Optimized endpoint for real-time queue display
   * Returns current, next, and waiting queue appointments for a business
   */
  async getMonitorAppointments(
    businessId: string,
    date?: string,
    includeStats: boolean = true,
    maxQueueSize: number = 10
  ): Promise<{
    current: {
      appointment: AppointmentWithDetails | null;
      room?: string;
      startedAt: string | null;
      estimatedEndTime: string | null;
    } | null;
    next: {
      appointment: AppointmentWithDetails | null;
      room?: string;
      estimatedStartTime: string | null;
      waitTimeMinutes: number | null;
    } | null;
    queue: Array<{
      appointment: AppointmentWithDetails;
      room?: string;
      estimatedStartTime: string;
      waitTimeMinutes: number;
      position: number;
    }>;
    stats: {
      completedToday: number;
      inProgress: number;
      waiting: number;
      averageWaitTime: number;
      averageServiceTime: number;
      totalScheduled: number;
    };
    lastUpdated: string;
    businessInfo: {
      name: string;
      timezone: string;
    };
  }> {
    // Validate business exists
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Parse date or default to today
    const targetDate = date
      ? createDateTimeInIstanbul(date, '00:00')
      : getCurrentTimeInIstanbul();

    // Set date range for the day
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch all appointments for the day with full details
    const appointmentsWithDetails = await this.appointmentRepository.findByBusinessAndDateRange(
      businessId,
      dayStart,
      dayEnd
    );

    const now = getCurrentTimeInIstanbul();

    // Debug logging to see what appointments we have
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Monitor Debug - Total appointments found:', appointmentsWithDetails.length);
      console.log('🔍 Monitor Debug - Current time:', formatDateTimeForAPI(now));
      console.log('🔍 Monitor Debug - Day range:', {
        start: formatDateTimeForAPI(dayStart),
        end: formatDateTimeForAPI(dayEnd)
      });
      appointmentsWithDetails.forEach(apt => {
        const aptStartTime = new Date(apt.startTime);
        const aptEndTime = new Date(apt.endTime);
        console.log('🔍 Appointment:', {
          id: apt.id,
          status: apt.status,
          startTime: formatDateTimeForAPI(aptStartTime),
          endTime: formatDateTimeForAPI(aptEndTime),
          isInProgress: aptStartTime <= now && aptEndTime > now,
          isFuture: aptStartTime > now,
          customerName: `${apt.customer.firstName} ${apt.customer.lastName}`
        });
      });
    }

    // Auto-update appointments to IN_PROGRESS if their time has arrived
    // Find CONFIRMED appointments that should be IN_PROGRESS
    const appointmentsToUpdate = appointmentsWithDetails.filter(
      apt => apt.status === AppointmentStatus.CONFIRMED &&
      new Date(apt.startTime) <= now &&
      new Date(apt.endTime) > now
    );

    // Update them to IN_PROGRESS
    if (appointmentsToUpdate.length > 0 && this.prisma) {
      const updatePromises = appointmentsToUpdate.map(apt =>
        this.prisma!.appointment.update({
          where: { id: apt.id },
          data: { status: AppointmentStatus.IN_PROGRESS }
        })
      );
      await Promise.all(updatePromises);

      // Update the status in our local array
      appointmentsToUpdate.forEach(apt => {
        apt.status = AppointmentStatus.IN_PROGRESS;
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Monitor Debug - Auto-updated appointments to IN_PROGRESS:', appointmentsToUpdate.length);
      }
    }

    // Filter appointments - show IN_PROGRESS and CONFIRMED appointments
    // Current appointment: IN_PROGRESS (currently happening)
    const inProgressAppointments = appointmentsWithDetails.filter(
      apt => apt.status === AppointmentStatus.IN_PROGRESS &&
      new Date(apt.startTime) <= now &&
      new Date(apt.endTime) > now
    );

    // Future appointments: CONFIRMED and starting in the future
    const confirmedAppointments = appointmentsWithDetails.filter(
      apt => apt.status === AppointmentStatus.CONFIRMED &&
      new Date(apt.startTime) > now
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Monitor Debug - Filtered results:', {
        inProgress: inProgressAppointments.length,
        confirmed: confirmedAppointments.length
      });
    }

    const completedAppointments = appointmentsWithDetails.filter(
      apt => apt.status === AppointmentStatus.COMPLETED
    );

    // Determine current appointment
    const current = inProgressAppointments.length > 0 ? {
      appointment: inProgressAppointments[0],
      room: undefined,
      startedAt: formatDateTimeForAPI(inProgressAppointments[0].startTime),
      estimatedEndTime: formatDateTimeForAPI(inProgressAppointments[0].endTime)
    } : null;

    // Determine next appointment
    const next = confirmedAppointments.length > 0 ? {
      appointment: confirmedAppointments[0],
      room: undefined,
      estimatedStartTime: formatDateTimeForAPI(confirmedAppointments[0].startTime),
      waitTimeMinutes: Math.max(0, Math.round(
        (new Date(confirmedAppointments[0].startTime).getTime() - now.getTime()) / (1000 * 60)
      ))
    } : null;

    // Build waiting queue
    const queueAppointments = confirmedAppointments.slice(1, maxQueueSize + 1);
    const queue = queueAppointments.map((apt, index) => ({
      appointment: apt,
      room: undefined,
      estimatedStartTime: formatDateTimeForAPI(apt.startTime),
      waitTimeMinutes: Math.max(0, Math.round(
        (new Date(apt.startTime).getTime() - now.getTime()) / (1000 * 60)
      )),
      position: index + 2 // Position 1 is "next"
    }));

    // Calculate statistics
    const stats = includeStats ? {
      completedToday: completedAppointments.length,
      inProgress: inProgressAppointments.length,
      waiting: confirmedAppointments.length,
      averageWaitTime: this.calculateAverageWaitTime(appointmentsWithDetails),
      averageServiceTime: this.calculateAverageServiceTime(completedAppointments),
      totalScheduled: appointmentsWithDetails.filter(
        apt => apt.status !== AppointmentStatus.CANCELED
      ).length
    } : {
      completedToday: 0,
      inProgress: 0,
      waiting: 0,
      averageWaitTime: 0,
      averageServiceTime: 0,
      totalScheduled: 0
    };

    return {
      current,
      next,
      queue,
      stats,
      lastUpdated: formatDateTimeForAPI(now),
      businessInfo: {
        name: business.name,
        timezone: business.timezone || 'Europe/Istanbul'
      }
    };
  }

  /**
   * Calculate average wait time for appointments
   */
  private calculateAverageWaitTime(appointments: AppointmentWithDetails[]): number {
    const completedAppointments = appointments.filter(
      apt => apt.status === AppointmentStatus.COMPLETED && apt.startTime && apt.bookedAt
    );

    if (completedAppointments.length === 0) {
      return 0;
    }

    const totalWaitTime = completedAppointments.reduce((sum, apt) => {
      const waitTime = new Date(apt.startTime).getTime() - new Date(apt.bookedAt).getTime();
      return sum + (waitTime / (1000 * 60)); // Convert to minutes
    }, 0);

    return Math.round(totalWaitTime / completedAppointments.length);
  }

  /**
   * Calculate average service time for completed appointments
   */
  private calculateAverageServiceTime(completedAppointments: AppointmentWithDetails[]): number {
    if (completedAppointments.length === 0) {
      return 0;
    }

    const totalServiceTime = completedAppointments.reduce((sum, apt) => {
      return sum + apt.duration;
    }, 0);

    return Math.round(totalServiceTime / completedAppointments.length);
  }

  // Removed formatting methods - keeping service layer focused on business logic
  // Data transformation handled in controller layer for consistency

  /**
   * Get available time slots for a business service (PUBLIC)
   * Used by customers to see available booking times
   */
  async getPublicAvailableSlots(params: {
    businessId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    staffId?: string;
  }): Promise<{
    date: string;
    businessId: string;
    serviceId: string;
    staffId?: string;
    slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      staffId?: string;
      staffName?: string;
    }>;
    businessHours: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
    closures: Array<{
      reason: string;
      type: string;
    }>;
  }> {
    const { businessId, serviceId, date, staffId } = params;

    // Parse the date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    // Get the service to know duration
    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.businessId !== businessId) {
      throw new Error('Service not found or does not belong to this business');
    }

    const duration = service.duration;
    const dayOfWeek = targetDate.getDay();

    // Get business working hours for this day (via repository layer)
    const workingHours = await this.appointmentRepository.findWorkingHours(
      businessId,
      dayOfWeek,
      staffId || null
    );

    // Check if business is closed on this day
    if (workingHours.length === 0) {
      return {
        date,
        businessId,
        serviceId,
        staffId,
        slots: [],
        businessHours: {
          isOpen: false
        },
        closures: []
      };
    }

    // Get business closures for this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const closures = await this.businessClosureRepository.findByBusinessId(businessId, {
      startDate: startOfDay,
      endDate: endOfDay
    });

    const activeClosure = closures.find(closure => {
      const closureStart = new Date(closure.startDate);
      const closureEnd = closure.endDate ? new Date(closure.endDate) : new Date('2099-12-31');
      return targetDate >= closureStart && targetDate <= closureEnd;
    });

    if (activeClosure) {
      return {
        date,
        businessId,
        serviceId,
        staffId,
        slots: [],
        businessHours: {
          isOpen: false
        },
        closures: [{
          reason: activeClosure.reason,
          type: activeClosure.type
        }]
      };
    }

    // Get existing appointments for this day (via repository layer)
    const existingAppointments = await this.appointmentRepository.findAppointmentsForDay(
      businessId,
      startOfDay,
      endOfDay,
      staffId
    );

    // Generate time slots
    const workingHour = workingHours[0]; // Use first working hours entry
    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      staffId?: string;
      staffName?: string;
    }> = [];

    const [openHour, openMinute] = workingHour.startTime.split(':').map(Number);
    const [closeHour, closeMinute] = workingHour.endTime.split(':').map(Number);

    let currentSlotTime = new Date(targetDate);
    currentSlotTime.setHours(openHour, openMinute, 0, 0);

    const closingTime = new Date(targetDate);
    closingTime.setHours(closeHour, closeMinute, 0, 0);

    const now = new Date();
    const slotInterval = 30; // 30-minute intervals

    while (currentSlotTime < closingTime) {
      const slotEndTime = new Date(currentSlotTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      // Don't offer slots that extend past closing time
      if (slotEndTime > closingTime) {
        break;
      }

      // Don't offer slots in the past
      if (currentSlotTime > now) {
        // Check if slot conflicts with existing appointments
        const isConflicting = existingAppointments.some(appointment => {
          const aptStart = new Date(appointment.startTime);
          const aptEnd = new Date(appointment.endTime);
          return (
            (currentSlotTime >= aptStart && currentSlotTime < aptEnd) ||
            (slotEndTime > aptStart && slotEndTime <= aptEnd) ||
            (currentSlotTime <= aptStart && slotEndTime >= aptEnd)
          );
        });

        slots.push({
          startTime: currentSlotTime.toISOString(),
          endTime: slotEndTime.toISOString(),
          available: !isConflicting,
          staffId: staffId,
          staffName: staffId && existingAppointments[0]?.staff
            ? `${existingAppointments[0].staff.user.firstName || ''} ${existingAppointments[0].staff.user.lastName || ''}`.trim()
            : undefined
        });
      }

      // Move to next slot
      currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotInterval);
    }

    return {
      date,
      businessId,
      serviceId,
      staffId,
      slots,
      businessHours: {
        isOpen: true,
        openTime: workingHour.startTime,
        closeTime: workingHour.endTime
      },
      closures: []
    };
  }
}