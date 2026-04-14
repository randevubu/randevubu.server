import { randomUUID } from 'crypto';
import {
  AppointmentData,
  AppointmentSearchFilters,
  AppointmentStatus,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  UpdateAppointmentRequest
} from '../../../types/business';
// Removed DTO imports - keeping service layer focused on business logic
import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../../../repositories';
import { AppointmentRepository } from '../../../repositories/appointmentRepository';
import { BusinessClosureRepository } from '../../../repositories/businessClosureRepository';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { ServiceRepository } from '../../../repositories/serviceRepository';
import { UserBehaviorRepository } from '../../../repositories/userBehaviorRepository';
import { ERROR_CODES } from '../../../constants/errorCodes';
import { PermissionName } from '../../../types/auth';
import { AppError } from '../../../types/responseTypes';
import { PolicyEnforcementContext } from '../../../types/cancellationPolicy';
import { BusinessSettings, ReservationSettings } from '../../../types/reservationSettings';
import { AuthorizationError } from '../../../utils/errors/customError';
import logger from "../../../utils/Logger/logger";
import { createDateTimeInIstanbul, formatDateTimeForAPI, getCurrentTimeInIstanbul } from '../../../utils/timezoneHelper';
import { BusinessService } from '../business';
import { CancellationPolicyService } from '../business/cancellationPolicyService';
import { NotificationService } from '../notification';
import { UnifiedNotificationGateway } from '../notification/unifiedNotificationGateway';
import { RBACService } from '../rbac';
import { UsageService } from '../usage';
export class AppointmentService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly userBehaviorRepository: UserBehaviorRepository,
    private readonly businessClosureRepository: BusinessClosureRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly rbacService: RBACService,
    private readonly businessService: BusinessService,
    private readonly notificationService: NotificationService,
    private readonly usageService: UsageService,
    private readonly repositories: RepositoryContainer,
    private readonly cancellationPolicyService: CancellationPolicyService,
    private readonly notificationGateway: UnifiedNotificationGateway,
    private readonly prisma?: PrismaClient
  ) {
    // No manual instantiation - all dependencies injected
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
      throw new AppError('Business not found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
    }

    const settings = (business.settings as BusinessSettings) || {};
    const reservationSettings = settings.reservationSettings;

    // Use default values if settings not configured
    const rules: ReservationSettings = {
      maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
      minNotificationHours: reservationSettings?.minNotificationHours ?? 0,
      maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
    };

    const now = new Date();

    // 0. Check if appointment is in the past
    if (appointmentDateTime <= now) {
      throw new AppError(
        'Cannot book appointment in the past',
        400,
        ERROR_CODES.APPOINTMENT_PAST_DATE
      );
    }

    // 1. Check maximum advance booking days
    const daysDifference = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference > rules.maxAdvanceBookingDays) {
      throw new AppError(
        `Cannot book more than ${rules.maxAdvanceBookingDays} days in advance`,
        400,
        ERROR_CODES.APPOINTMENT_TOO_FAR_FUTURE,
        true,
        { maxDays: rules.maxAdvanceBookingDays }
      );
    }

    // 2. Check minimum advance booking - use service setting if provided, otherwise business setting
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const minAdvanceHours = serviceMinAdvanceBooking !== undefined ? serviceMinAdvanceBooking : rules.minNotificationHours;

    if (hoursDifference < minAdvanceHours) {
      throw new AppError(
        `Appointment must be booked at least ${minAdvanceHours} hours in advance`,
        400,
        ERROR_CODES.APPOINTMENT_INSUFFICIENT_ADVANCE,
        true,
        { minHours: minAdvanceHours }
      );
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
      throw new AppError(
        `Daily appointment limit (${rules.maxDailyAppointments}) reached for this date`,
        409,
        ERROR_CODES.APPOINTMENT_DAILY_LIMIT_REACHED,
        true,
        { maxDaily: rules.maxDailyAppointments }
      );
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
        const duration = serviceDuration || 60;
        const newEnd = new Date(appointmentDateTime.getTime() + duration * 60000);

        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasTimeConflict) {
        throw new AppError(
          'You already have a conflicting appointment at this time',
          409,
          ERROR_CODES.APPOINTMENT_TIME_CONFLICT
        );
      }
    }
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
      throw new AppError('Business not found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
    }

    const settings = (business.settings as BusinessSettings) || {};
    const reservationSettings = settings.reservationSettings;

    // Use default values if settings not configured
    const rules: ReservationSettings = {
      maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
      minNotificationHours: reservationSettings?.minNotificationHours ?? 0,
      maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
    };

    const now = new Date();

    // 0. Check if appointment is in the past
    if (appointmentDateTime <= now) {
      throw new AppError(
        'Cannot book appointment in the past',
        400,
        ERROR_CODES.APPOINTMENT_PAST_DATE
      );
    }

    // 1. Check maximum advance booking days
    const daysDifference = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference > rules.maxAdvanceBookingDays) {
      throw new AppError(
        `Cannot book more than ${rules.maxAdvanceBookingDays} days in advance`,
        400,
        ERROR_CODES.APPOINTMENT_TOO_FAR_FUTURE,
        true,
        { maxDays: rules.maxAdvanceBookingDays }
      );
    }

    // 2. Check minimum notification period (transaction path: business rule only; service min applied in outer validate)
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < rules.minNotificationHours) {
      throw new AppError(
        `Appointment must be booked at least ${rules.minNotificationHours} hours in advance`,
        400,
        ERROR_CODES.APPOINTMENT_INSUFFICIENT_ADVANCE,
        true,
        { minHours: rules.minNotificationHours }
      );
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
      throw new AppError(
        `Daily appointment limit (${rules.maxDailyAppointments}) reached for this date`,
        409,
        ERROR_CODES.APPOINTMENT_DAILY_LIMIT_REACHED,
        true,
        { maxDaily: rules.maxDailyAppointments }
      );
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
        const duration = serviceDuration || 60;
        const newEnd = new Date(appointmentDateTime.getTime() + duration * 60000);

        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasTimeConflict) {
        throw new AppError(
          'You already have a conflicting appointment at this time',
          409,
          ERROR_CODES.APPOINTMENT_TIME_CONFLICT
        );
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
      throw new AppError('User repository not available', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }

    const customer = await this.repositories.userRepository.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, ERROR_CODES.CUSTOMER_NOT_FOUND);
    }

    if (!customer.firstName || !customer.lastName) {
      throw new AppError(
        'First name and last name are required to book an appointment',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
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
        throw new AppError(
          'You do not have permission to create appointments for other customers',
          403,
          ERROR_CODES.APPOINTMENT_ACCESS_DENIED
        );
      }
    }

    // Check if customer account is active
    if (!customer.isActive) {
      throw new AppError('Account is disabled', 403, ERROR_CODES.ACCOUNT_DISABLED);
    }

    // Check if user is banned (only check for the actual customer, not the person creating)
    const userBehavior = await this.userBehaviorRepository.findByUserId(customerId);
    if (userBehavior?.isBanned) {
      const banMessage = userBehavior.bannedUntil
        ? `Booking blocked: ban active until ${userBehavior.bannedUntil.toISOString().split('T')[0]}`
        : 'Booking blocked: account permanently banned';
      const detail = userBehavior.banReason ? ` Reason: ${userBehavior.banReason}` : '';
      throw new AppError(
        `${banMessage}${detail}`,
        403,
        ERROR_CODES.ACCESS_DENIED
      );
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
        .join(' ');
      throw new AppError(
        violationMessages
          ? `Booking policy violation: ${violationMessages}`
          : 'Booking blocked by business policy',
        409,
        ERROR_CODES.APPOINTMENT_BOOKING_POLICY_VIOLATION
      );
    }

    // Check if business is closed
    const { isClosed, closure } = await this.businessClosureRepository.isBusinessClosed(
      data.businessId,
      new Date(data.date)
    );

    if (isClosed) {
      throw new AppError(
        closure?.reason
          ? `Business is closed on this date: ${closure.reason}`
          : 'Business is closed on this date',
        400,
        ERROR_CODES.BUSINESS_CLOSED
      );
    }

    // Validate service exists and is active
    const service = await this.serviceRepository.findById(data.serviceId);
    if (!service || !service.isActive) {
      throw new AppError(
        'Service not found or inactive',
        400,
        ERROR_CODES.APPOINTMENT_SERVICE_UNAVAILABLE
      );
    }

    // If client does not provide staff, auto-pick an active staff assigned to this service.
    // If none is assigned, proceed as unassigned (staffId undefined/null).
    let staffId = data.staffId;
    if (!staffId) {
      if (!this.prisma) {
        throw new AppError('Prisma client not available for staff resolution', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
      }

      const assignedStaff = await this.prisma.serviceStaff.findFirst({
        where: {
          serviceId: data.serviceId,
          isActive: true,
          staff: {
            businessId: data.businessId,
            isActive: true
          }
        },
        select: { staffId: true },
        orderBy: { createdAt: 'asc' }
      });

      if (assignedStaff) {
        staffId = assignedStaff.staffId;
      }
    }

    // Validate staff member exists and is active for this business (when provided/resolved)
    if (staffId) {
      if (!this.repositories?.staffRepository) {
        throw new AppError('Staff repository not available', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
      }

      const staffMember = await this.repositories.staffRepository.findById(staffId);
      if (!staffMember) {
        // 400 — 404 is confused with "route not found" in browsers; id is invalid for this business
        throw new AppError('Staff member not found', 400, ERROR_CODES.STAFF_NOT_FOUND);
      }

      if (!staffMember.isActive) {
        throw new AppError('Staff member is not active', 400, ERROR_CODES.STAFF_NOT_AVAILABLE);
      }

      if (staffMember.businessId !== data.businessId) {
        throw new AppError('Staff member does not belong to this business', 400, ERROR_CODES.STAFF_NOT_FOUND);
      }
    }

    // Check appointment time constraints - convert to Istanbul timezone
    const now = getCurrentTimeInIstanbul();

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      logger.info('🕐 Timezone Debug:', {
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
      throw new AppError(
        `Service max advance booking of ${service.maxAdvanceBooking} days exceeded`,
        400,
        ERROR_CODES.APPOINTMENT_TOO_FAR_FUTURE,
        true,
        { maxDays: service.maxAdvanceBooking }
      );
    }

    // Check for staff-specific conflicts
    const endTime = new Date(appointmentDateTime.getTime() + service.duration * 60000);
    const appointmentDate = createDateTimeInIstanbul(data.date, '00:00');
    const conflicts = await this.appointmentRepository.findConflictingAppointments(
      data.businessId,
      appointmentDate,
      appointmentDateTime,
      endTime,
      staffId // Add staffId to check conflicts for specific staff
    );

    if (conflicts.length > 0) {
      throw new AppError(
        'Staff member is not available at the selected time',
        409,
        ERROR_CODES.APPOINTMENT_STAFF_NOT_AVAILABLE
      );
    }

    // CRITICAL: Use transaction to prevent race conditions
    if (!this.prisma) {
      throw new AppError('Prisma client not available for transaction', 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }

    let appointment: AppointmentData;
    try {
      appointment = await this.prisma.$transaction(async (tx) => {
        // Create appointment within transaction using the transaction client
        const service = await tx.service.findUnique({
          where: { id: data.serviceId }
        });

        if (!service) {
          throw new AppError('Service not found', 404, ERROR_CODES.SERVICE_NOT_FOUND);
        }

        // CRITICAL: Re-validate business rules within transaction using transaction client
        await this.validateBusinessReservationRulesInTransaction(tx, data.businessId, appointmentDateTime, customerId, service.duration);

        const startDateTime = createDateTimeInIstanbul(data.date, data.startTime);
        const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

        // Re-check conflicts IN TRANSACTION to prevent race conditions
        const conflicting = await tx.appointment.findMany({
          where: {
            businessId: data.businessId,
            ...(staffId ? { staffId } : {}),
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
          throw new AppError(
            'Time slot is taken or staff conflict exists',
            409,
            ERROR_CODES.APPOINTMENT_STAFF_NOT_AVAILABLE
          );
        }
        const appointmentId = `apt_${randomUUID()}`;

        const result = await tx.appointment.create({
          data: {
            id: appointmentId,
            businessId: data.businessId,
            serviceId: data.serviceId,
            staffId,
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
        throw new AppError(
          'This time slot was just booked by another customer',
          409,
          ERROR_CODES.APPOINTMENT_TIME_CONFLICT
        );
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
        logger.info('🔍 APPOINTMENT CREATION - About to call notifyNewAppointment for appointment:', appointment.id);
      }
      await this.notifyNewAppointment(appointment, service);
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔍 APPOINTMENT CREATION - notifyNewAppointment completed for appointment:', appointment.id);
      }
    } catch (notificationError) {
      // Log notification error but don't fail the appointment creation
      logger.error('❌ APPOINTMENT CREATION - Failed to send business owner notification:', notificationError);
    }

    // Send booking confirmation SMS to customer
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔍 APPOINTMENT CREATION - Sending booking confirmation to customer:', customer.id);
      }
      await this.sendCustomerBookingConfirmation(appointment, service, {
        id: customer.id,
        firstName: customer.firstName ?? null,
        lastName: customer.lastName ?? null,
        phoneNumber: customer.phoneNumber
      });
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔍 APPOINTMENT CREATION - Customer confirmation sent for appointment:', appointment.id);
      }
    } catch (notificationError) {
      // Log notification error but don't fail the appointment creation
      logger.error('❌ APPOINTMENT CREATION - Failed to send customer confirmation:', notificationError);
    }

    return appointment;
  }

  async getAppointmentById(
    userId: string,
    appointmentId: string
  ): Promise<AppointmentWithDetails | null> {
    await this.appointmentRepository.finalizeEndedAppointmentsIfStale({ appointmentId });

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
        throw new AppError('Access denied to view this appointment', 403, ERROR_CODES.APPOINTMENT_ACCESS_DENIED);
      }
    }

    return appointment;
  }

  // checked 
  async getCustomerAppointments(
    userId: string,
    customerId: string,
    page = 1,
    limit = 20,
    status?: AppointmentStatus
  ): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    if (userId !== customerId) {
      await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_APPOINTMENTS);
    }

    await this.appointmentRepository.finalizeEndedAppointmentsIfStale({ customerId });

    return await this.appointmentRepository.findByCustomerId(customerId, page, limit, status);
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

    await this.appointmentRepository.finalizeEndedAppointmentsIfStale();

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

    await this.appointmentRepository.finalizeEndedAppointmentsIfStale();

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

    // Past end time → COMPLETED for unchanged CONFIRMED/IN_PROGRESS (not CANCELED / NO_SHOW)
    if (filters.businessId) {
      await this.appointmentRepository.finalizeEndedAppointmentsIfStale({
        businessId: filters.businessId
      });
    } else if (filters.customerId) {
      await this.appointmentRepository.finalizeEndedAppointmentsIfStale({
        customerId: filters.customerId
      });
    } else {
      await this.appointmentRepository.finalizeEndedAppointmentsIfStale();
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
      throw new AppError('Business ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // SECURITY: Block sensitive filters that could expose private appointment data
    if (filters.customerId || filters.staffId) {
      throw new AppError('Invalid query parameters', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const safeFilters: AppointmentSearchFilters = {
      businessId: filters.businessId,
      serviceId: filters.serviceId,
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));

    await this.appointmentRepository.finalizeEndedAppointmentsIfStale({
      businessId: safeFilters.businessId
    });

    return await this.appointmentRepository.search(safeFilters, safePage, safeLimit);
  }

  async updateAppointment(
    userId: string,
    appointmentId: string,
    data: UpdateAppointmentRequest
  ): Promise<AppointmentData> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
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
        throw new AppError('Access denied to update this appointment', 403, ERROR_CODES.APPOINTMENT_ACCESS_DENIED);
      }
    }

    // Customer restrictions
    if (isCustomer) {
      const now = getCurrentTimeInIstanbul();
      if (appointment.startTime <= now) {
        throw new AppError('Cannot update past appointments', 400, ERROR_CODES.APPOINTMENT_PAST_DATE);
      }

      const allowedFields = ['customerNotes', 'status'];
      const hasRestrictedFields = Object.keys(data).some(key => !allowedFields.includes(key));

      if (hasRestrictedFields) {
        throw new AppError('Customers can only update notes or cancel appointments', 400, ERROR_CODES.APPOINTMENT_ACCESS_DENIED);
      }

      if (data.status && !['CANCELED'].includes(data.status)) {
        throw new AppError('Customers can only cancel appointments', 400, ERROR_CODES.APPOINTMENT_ACCESS_DENIED);
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
          throw new AppError('Selected time is not available', 409, ERROR_CODES.APPOINTMENT_TIME_CONFLICT);
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
      throw new AppError('Appointment not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
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
        throw new AppError(
          'Access denied: You do not have permission to cancel this appointment',
          403,
          ERROR_CODES.APPOINTMENT_ACCESS_DENIED
        );
      }
    }

    // Check if appointment can be cancelled
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new AppError(
        'Cannot cancel completed appointments',
        400,
        ERROR_CODES.APPOINTMENT_ALREADY_COMPLETED
      );
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new AppError(
        'Appointment is already cancelled',
        400,
        ERROR_CODES.APPOINTMENT_ALREADY_CANCELLED
      );
    }

    // Self-service limits (monthly cap, min. hours before start, bans) apply only when the
    // customer cancels their own booking. Staff / business users and platform-wide cancel
    // permission skip these checks so the salon can always override.
    const enforceCustomerSelfServicePolicies = isCustomer && !hasGlobalCancel;
    if (enforceCustomerSelfServicePolicies) {
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
          .filter((v) => v.isViolation)
          .map((v) => v.message)
          .join('; ');
        throw new AppError(
          violationMessages || 'Cancellation policy violation',
          409,
          ERROR_CODES.APPOINTMENT_CANNOT_CANCEL
        );
      }
    }

    const cancelledAppointment = await this.appointmentRepository.cancel(appointmentId, reason);

    // Update user behavior if customer cancelled (strikes for late cancel; sync stats)
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
      throw new AppError('Appointment not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
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
      throw new AppError(
        violationMessages ? `Cannot mark as no-show: ${violationMessages}` : 'No-show not allowed by business policy',
        409,
        ERROR_CODES.APPOINTMENT_NO_SHOW_NOT_ALLOWED
      );
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
    await this.appointmentRepository.finalizeEndedAppointmentsIfStale({ customerId: userId });
    return await this.appointmentRepository.findUpcomingByCustomerId(userId, limit);
  }

  async getNearestAppointmentInCurrentHour(userId: string): Promise<AppointmentWithDetails | null> {
    await this.appointmentRepository.finalizeEndedAppointmentsIfStale({ customerId: userId });
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
    await this.appointmentRepository.finalizeEndedAppointmentsIfStale({ customerId: userId });
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
      throw new AppError('No accessible businesses found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
    }

    // If specific business requested, validate access
    if (businessId) {
      if (!accessibleBusinessIds.includes(businessId)) {
        throw new AppError('Access denied to this business', 403, ERROR_CODES.ACCESS_DENIED);
      }
      await this.appointmentRepository.finalizeEndedAppointmentsIfStale({ businessId });
      return await this.appointmentRepository.findTodaysAppointments(businessId);
    }

    await Promise.all(
      accessibleBusinessIds.map((id) =>
        this.appointmentRepository.finalizeEndedAppointmentsIfStale({ businessId: id })
      )
    );

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
      throw new AppError('No accessible businesses found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
    }

    // If specific business requested, validate access and return single stats
    if (businessId) {
      if (!accessibleBusinessIds.includes(businessId)) {
        throw new AppError('Access denied to this business', 403, ERROR_CODES.ACCESS_DENIED);
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

    await Promise.all(
      businessIds.map((id) =>
        this.appointmentRepository.finalizeEndedAppointmentsIfStale({ businessId: id })
      )
    );

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
      throw new AppError('Appointment not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
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
      throw new AppError('Appointment not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
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
        logger.info('🔍 NOTIFY NEW APPOINTMENT - Starting notification process for appointment:', appointment.id);
      }

      // Get business details to find owner/staff
      const business = await this.repositories.businessRepository.findById(appointment.businessId);

      if (!business) {
        logger.error('Business not found for notification:', appointment.businessId);
        return;
      }

      if (!business.isActive) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('Business is inactive, skipping notification:', appointment.businessId);
        }
        return;
      }

      // Get customer details for the notification
      const customer = await this.repositories?.userRepository.findById(appointment.customerId);
      if (!customer) {
        logger.error('Customer not found for notification:', appointment.customerId);
        return;
      }

      // Format appointment date and time
      const appointmentDate = new Date(appointment.date).toLocaleDateString();
      const appointmentTime = new Date(appointment.startTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Create notification content using centralized templates for SMS
      const { SMSMessageTemplates } = await import('../../../utils/smsMessageTemplates');
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Müşteri';

      // For SMS: Use template
      const smsMessage = SMSMessageTemplates.business.newAppointmentBooking({
        customerName,
        serviceName: service.name,
        appointmentDate,
        appointmentTime,
        appointmentId: appointment.id,
      });

      // For push/email: Use English titles (can be translated later)
      const title = 'New Appointment Booking';
      const body = `${customerName} booked ${service.name} for ${appointmentDate} at ${appointmentTime}`;

      // Use unified notification gateway - respects all business settings
      // Note: SMS will use the template message, other channels use title/body
      const result = await this.notificationGateway.sendSystemAlert({
        businessId: appointment.businessId,
        userId: business.ownerId,
        title,
        body,
        smsMessage, // Pass SMS-specific message
        appointmentId: appointment.id,
        data: {
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          customerName,
          serviceName: service.name,
          businessName: business.name,
          appointmentDate,
          appointmentTime,
          type: 'new_appointment'
        },
        url: `/appointments/${appointment.id}`
      });

      if (result.success) {
        logger.info(`✅ Appointment notification sent to business owner: ${business.ownerId} via ${result.sentChannels.join(', ')}`);
      } else {
        logger.info(`⚠️ Appointment notification skipped: ${result.skippedChannels.map(sc => sc.reason).join(', ')}`);
      }

    } catch (error) {
      logger.error('Error sending new appointment notification:', error);
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
        logger.error('Business not found for booking confirmation:', appointment.businessId);
        return;
      }

      // Ensure customer has phone number
      if (!customer.phoneNumber) {
        logger.warn(`Customer ${customer.id} has no phone number for booking confirmation`);
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

      // Create confirmation message using centralized template
      const { SMSMessageTemplates } = await import('../../../utils/smsMessageTemplates');
      const message = SMSMessageTemplates.appointment.bookingConfirmation({
        businessName: business.name,
        serviceName: service.name,
        appointmentDate,
        appointmentTime,
        appointmentId: appointment.id,
      });

      // Send SMS directly - this is critical and should always attempt
      // We use the gateway's sendCriticalSMS for transactional confirmations
      const result = await this.notificationGateway.sendCriticalSMS(
        customer.phoneNumber,
        message,
        { requestId: `booking-${appointment.id}` }
      );

      if (result.success) {
        logger.info(`✅ Booking confirmation SMS sent to customer: ${customer.phoneNumber.slice(0, 3)}***${customer.phoneNumber.slice(-3)}`);
      } else {
        logger.error(`❌ Failed to send booking confirmation SMS: ${result.error}`);
      }

    } catch (error) {
      logger.error('❌ Error sending customer booking confirmation:', error);
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
      throw new AppError('Business not found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
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
      logger.info('🔍 Monitor Debug - Total appointments found:', appointmentsWithDetails.length);
      logger.info('🔍 Monitor Debug - Current time:', formatDateTimeForAPI(now));
      logger.info('🔍 Monitor Debug - Day range:', {
        start: formatDateTimeForAPI(dayStart),
        end: formatDateTimeForAPI(dayEnd)
      });
      appointmentsWithDetails.forEach(apt => {
        const aptStartTime = new Date(apt.startTime);
        const aptEndTime = new Date(apt.endTime);
        logger.info('🔍 Appointment:', {
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

    if (appointmentsToUpdate.length > 0) {
      await this.appointmentRepository.updateStatusBatch(
        appointmentsToUpdate.map(apt => apt.id),
        AppointmentStatus.IN_PROGRESS
      );

      // Update the status in our local array
      appointmentsToUpdate.forEach(apt => {
        apt.status = AppointmentStatus.IN_PROGRESS;
      });

      if (process.env.NODE_ENV === 'development') {
        logger.info('🔍 Monitor Debug - Auto-updated appointments to IN_PROGRESS:', appointmentsToUpdate.length);
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
      logger.info('🔍 Monitor Debug - Filtered results:', {
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
    bookedRanges: Array<{
      startTime: string;
      endTime: string;
      duration: number;
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
      throw new AppError('Invalid date format. Use YYYY-MM-DD', 400, ERROR_CODES.INVALID_DATE_FORMAT);
    }

    // Get the service to know duration
    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.businessId !== businessId) {
      throw new AppError('Service not found or does not belong to this business', 404, ERROR_CODES.APPOINTMENT_SERVICE_UNAVAILABLE);
    }

    const duration = service.duration;
    const dayOfWeek = targetDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Try workingHours table first, then fall back to businessHours JSON field
    let workingHours = await this.appointmentRepository.findWorkingHours(
      businessId,
      dayOfWeek,
      staffId || null
    );

    // If workingHours table is empty, read from the business's businessHours JSON field
    if (workingHours.length === 0) {
      const business = await this.businessRepository.findById(businessId);
      if (business?.businessHours) {
        const bhJson = business.businessHours as Record<string, any>;
        const dayHours = bhJson[dayName];
        if (dayHours?.isOpen) {
          const openTime = dayHours.openTime || dayHours.open;
          const closeTime = dayHours.closeTime || dayHours.close;
          if (openTime && closeTime) {
            workingHours = [{
              startTime: openTime,
              endTime: closeTime,
              dayOfWeek,
              staffId: null
            }];
          }
        }
      }
    }

    if (workingHours.length === 0) {
      return {
        date,
        businessId,
        serviceId,
        staffId,
        slots: [],
        bookedRanges: [],
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
        bookedRanges: [],
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

    // Build booked ranges from existing appointments (safe to expose - no customer data)
    const bookedRanges = existingAppointments.map(apt => ({
      startTime: new Date(apt.startTime).toISOString(),
      endTime: new Date(apt.endTime).toISOString(),
      duration: apt.duration
    }));

    // Generate time slots with 15-minute intervals
    const workingHour = workingHours[0];
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
    const slotInterval = 15;

    while (currentSlotTime < closingTime) {
      const slotEndTime = new Date(currentSlotTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      if (slotEndTime > closingTime) {
        break;
      }

      if (currentSlotTime > now) {
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

      currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotInterval);
    }

    return {
      date,
      businessId,
      serviceId,
      staffId,
      slots,
      bookedRanges,
      businessHours: {
        isOpen: true,
        openTime: workingHour.startTime,
        closeTime: workingHour.endTime
      },
      closures: []
    };
  }
}