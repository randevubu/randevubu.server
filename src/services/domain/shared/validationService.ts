import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../../../repositories';
import { AppError } from '../../../types/responseTypes';
import { secureLoggingService } from './secureLoggingService';

/**
 * ValidationService
 *
 * Enterprise Pattern: Centralized validation logic
 * Following Amazon/Google patterns for data validation
 *
 * Responsibilities:
 * - Entity existence validation
 * - Business rule validation
 * - Data integrity validation
 * - Consistent validation patterns
 */
export class ValidationService {
  constructor(
    private prisma: PrismaClient,
    private repositories: RepositoryContainer
  ) {}

  /**
   * Validate that a business exists and is active
   * Industry Standard: Business validation
   */
  async validateBusinessExists(
    businessId: string,
    context?: Record<string, unknown>
  ): Promise<{ id: string; name: string; ownerId: string; isActive: boolean }> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          ownerId: true,
          isActive: true
        }
      });

      if (!business) {
        secureLoggingService.logSecurityEvent('BUSINESS_NOT_FOUND', {
          businessId,
          ...(context && { context })
        });
        throw new AppError('BUSINESS_NOT_FOUND', { message: 'Business not found' });
      }

      secureLoggingService.logBusinessOperation('BUSINESS_VALIDATED', businessId, context?.userId as string || 'system', {
        businessName: business.name,
        isActive: business.isActive
      });

      return business;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('BUSINESS_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Business validation failed' });
    }
  }

  /**
   * Validate that a user exists and is active
   * Industry Standard: User validation
   */
  async validateUserExists(
    userId: string,
    context?: Record<string, unknown>
  ): Promise<{ id: string; phoneNumber: string; isActive: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phoneNumber: true,
          isActive: true
        }
      });

      if (!user) {
        secureLoggingService.logSecurityEvent('USER_NOT_FOUND', {
          userId,
          ...(context && { context })
        });
        throw new AppError('USER_NOT_FOUND', { message: 'User not found' });
      }

      if (!user.isActive) {
        secureLoggingService.logSecurityEvent('USER_INACTIVE', {
          userId,
          ...(context && { context })
        });
        throw new AppError('VALIDATION_ERROR', { message: 'User account is inactive' });
      }

      secureLoggingService.logUserOperation('USER_VALIDATED', userId, {
        isActive: user.isActive
      });

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('USER_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'User validation failed' });
    }
  }

  /**
   * Validate that a service exists and is active
   * Industry Standard: Service validation
   */
  async validateServiceExists(
    serviceId: string,
    context?: Record<string, unknown>
  ): Promise<{ id: string; name: string; businessId: string; isActive: boolean }> {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          name: true,
          businessId: true,
          isActive: true
        }
      });

      if (!service) {
        secureLoggingService.logSecurityEvent('SERVICE_NOT_FOUND', {
          serviceId,
          ...(context && { context })
        });
        throw new AppError('SERVICE_NOT_FOUND', { message: 'Service not found' });
      }

      if (!service.isActive) {
        secureLoggingService.logSecurityEvent('SERVICE_INACTIVE', {
          serviceId,
          serviceName: service.name,
          ...(context && { context })
        });
        throw new AppError('VALIDATION_ERROR', { message: 'Service is not active' });
      }

      secureLoggingService.logBusinessOperation('SERVICE_VALIDATED', service.businessId, context?.userId as string || 'system', {
        serviceId,
        serviceName: service.name,
        isActive: service.isActive
      });

      return service;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('SERVICE_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Service validation failed' });
    }
  }

  /**
   * Validate that a staff member exists and is active
   * Industry Standard: Staff validation
   */
  async validateStaffExists(
    staffId: string,
    context?: Record<string, unknown>
  ): Promise<{ id: string; userId: string; businessId: string; isActive: boolean }> {
    try {
      const staff = await this.prisma.businessStaff.findUnique({
        where: { id: staffId },
        select: {
          id: true,
          userId: true,
          businessId: true,
          isActive: true
        }
      });

      if (!staff) {
        secureLoggingService.logSecurityEvent('STAFF_NOT_FOUND', {
          staffId,
          ...(context && { context })
        });
        throw new AppError('STAFF_NOT_FOUND', { message: 'Staff member not found' });
      }

      if (!staff.isActive) {
        secureLoggingService.logSecurityEvent('STAFF_INACTIVE', {
          staffId,
          userId: staff.userId,
          businessId: staff.businessId,
          ...(context && { context })
        });
        throw new AppError('VALIDATION_ERROR', { message: 'Staff member is not active' });
      }

      secureLoggingService.logBusinessOperation('STAFF_VALIDATED', staff.businessId, staff.userId, {
        staffId,
        isActive: staff.isActive
      });

      return staff;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('STAFF_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Staff validation failed' });
    }
  }

  /**
   * Validate that an appointment exists
   * Industry Standard: Appointment validation
   */
  async validateAppointmentExists(
    appointmentId: string,
    context?: Record<string, unknown>
  ): Promise<{ id: string; customerId: string; businessId: string; status: string }> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          customerId: true,
          businessId: true,
          status: true
        }
      });

      if (!appointment) {
        secureLoggingService.logSecurityEvent('APPOINTMENT_NOT_FOUND', {
          appointmentId,
          ...(context && { context })
        });
        throw new AppError('APPOINTMENT_NOT_FOUND', { message: 'Appointment not found' });
      }

      secureLoggingService.logAppointmentOperation(
        'APPOINTMENT_VALIDATED',
        appointmentId,
        appointment.businessId,
        appointment.customerId,
        {
          status: appointment.status
        }
      );

      return appointment;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('APPOINTMENT_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Appointment validation failed' });
    }
  }

  /**
   * Validate that a subscription exists and is active
   * Industry Standard: Subscription validation
   */
  async validateSubscriptionExists(
    subscriptionId: string,
    context?: Record<string, unknown>
  ): Promise<{ id: string; businessId: string; status: string; isActive: boolean }> {
    try {
      const subscription = await this.prisma.businessSubscription.findUnique({
        where: { id: subscriptionId },
        select: {
          id: true,
          businessId: true,
          status: true
        }
      });

      if (!subscription) {
        secureLoggingService.logSecurityEvent('SUBSCRIPTION_NOT_FOUND', {
          subscriptionId,
          ...(context && { context })
        });
        throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: 'Subscription not found' });
      }

      // Check if subscription is active based on status
      const isActive = subscription.status === 'ACTIVE' || subscription.status === 'TRIAL';

      if (!isActive) {
        secureLoggingService.logSecurityEvent('SUBSCRIPTION_INACTIVE', {
          subscriptionId,
          businessId: subscription.businessId,
          status: subscription.status,
          ...(context && { context })
        });
        throw new AppError('VALIDATION_ERROR', { message: 'Subscription is not active' });
      }

      secureLoggingService.logBusinessOperation('SUBSCRIPTION_VALIDATED', subscription.businessId, context?.userId as string || 'system', {
        subscriptionId,
        status: subscription.status,
        isActive
      });

      return { ...subscription, isActive };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('SUBSCRIPTION_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Subscription validation failed' });
    }
  }

  /**
   * Validate business hours
   * Industry Standard: Business hours validation
   */
  validateBusinessHours(hours: any, context?: Record<string, unknown>): void {
    try {
      if (!hours) {
        throw new AppError('VALIDATION_ERROR', { message: 'Business hours are required' });
      }

      const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      for (const day of requiredDays) {
        if (!hours[day]) {
          throw new AppError('VALIDATION_ERROR', { message: `Business hours for ${day} are required`, params: { field: day } });
        }

        const dayHours = hours[day];
        if (!dayHours.isOpen && !dayHours.isClosed) {
          throw new AppError('VALIDATION_ERROR', { message: `Business hours for ${day} must specify if open or closed`, params: { field: day } });
        }

        if (dayHours.isOpen) {
          if (!dayHours.openTime || !dayHours.closeTime) {
            throw new AppError('VALIDATION_ERROR', { message: `Open and close times are required for ${day}`, params: { field: day } });
          }

          // Validate time format (HH:MM)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(dayHours.openTime) || !timeRegex.test(dayHours.closeTime)) {
            throw new AppError('INVALID_TIME_FORMAT', { message: `Invalid time format for ${day}. Use HH:MM format`, params: { field: day } });
          }

          // Validate that open time is before close time
          const openTime = this.parseTime(dayHours.openTime);
          const closeTime = this.parseTime(dayHours.closeTime);

          if (openTime >= closeTime) {
            throw new AppError('VALIDATION_ERROR', { message: `Open time must be before close time for ${day}`, params: { field: day } });
          }
        }
      }

      secureLoggingService.logServiceCall('ValidationService', 'validateBusinessHours', {
        validated: true
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('BUSINESS_HOURS_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Business hours validation failed' });
    }
  }

  /**
   * Validate appointment time constraints
   * Industry Standard: Appointment time validation
   */
  validateAppointmentTime(
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    minAdvanceBooking: number,
    context?: Record<string, unknown>
  ): void {
    try {
      const now = new Date();
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(
        parseInt(startTime.split(':')[0]),
        parseInt(startTime.split(':')[1])
      );

      // Check if appointment is in the past
      if (appointmentDateTime <= now) {
        throw new AppError('APPOINTMENT_PAST_DATE', { message: 'Appointment cannot be scheduled in the past' });
      }

      // Check minimum advance booking
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilAppointment < minAdvanceBooking) {
        throw new AppError('APPOINTMENT_INSUFFICIENT_ADVANCE', {
          message: `Appointments must be booked at least ${minAdvanceBooking} hours in advance`
        });
      }

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        throw new AppError('INVALID_TIME_FORMAT', { message: 'Invalid time format. Use HH:MM format' });
      }

      // Validate that start time is before end time
      const startTimeMinutes = this.parseTime(startTime);
      const endTimeMinutes = this.parseTime(endTime);

      if (startTimeMinutes >= endTimeMinutes) {
        throw new AppError('VALIDATION_ERROR', { message: 'Start time must be before end time' });
      }

      secureLoggingService.logServiceCall('ValidationService', 'validateAppointmentTime', {
        appointmentDate: appointmentDate.toISOString(),
        startTime,
        endTime,
        minAdvanceBooking
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('APPOINTMENT_TIME_VALIDATION_FAILED', error as Error, context);

      throw new AppError('VALIDATION_ERROR', { message: 'Appointment time validation failed' });
    }
  }

  /**
   * Parse time string to minutes for comparison
   * Industry Standard: Time parsing utility
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validate phone number format
   * Industry Standard: Phone number validation
   */
  validatePhoneNumber(phoneNumber: string, context?: Record<string, unknown>): void {
    try {
      if (!phoneNumber) {
        throw new AppError('INVALID_PHONE_FORMAT', { message: 'Phone number is required', params: { field: 'phoneNumber' } });
      }

      // Remove all non-digit characters
      const cleanNumber = phoneNumber.replace(/\D/g, '');

      // Check if it's a valid Turkish phone number
      if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        throw new AppError('INVALID_PHONE_FORMAT', { message: 'Invalid phone number format', params: { field: 'phoneNumber' } });
      }

      // Check if it starts with valid country code or local format
      if (!cleanNumber.startsWith('90') && !cleanNumber.startsWith('0')) {
        throw new AppError('INVALID_PHONE_FORMAT', { message: 'Phone number must start with country code (90) or local format (0)', params: { field: 'phoneNumber' } });
      }

      secureLoggingService.logServiceCall('ValidationService', 'validatePhoneNumber', {
        phoneNumber: this.maskPhoneNumber(phoneNumber)
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      secureLoggingService.logErrorEvent('PHONE_NUMBER_VALIDATION_FAILED', error as Error, context);

      throw new AppError('INVALID_PHONE_FORMAT', { message: 'Phone number validation failed', params: { field: 'phoneNumber' } });
    }
  }

  /**
   * Mask phone number for logging
   * Industry Standard: Phone number masking
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) return '***';
    return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-3)}`;
  }
}

// Export factory function for dependency injection
export function createValidationService(
  prisma: PrismaClient,
  repositories: RepositoryContainer
): ValidationService {
  return new ValidationService(prisma, repositories);
}
