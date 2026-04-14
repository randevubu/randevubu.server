import { Appointment, AppointmentStatus } from '@prisma/client';
import { NotificationService } from '../notification';
import { AppointmentData, BusinessClosureData } from '../../../types/business';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { AppointmentRepository } from '../../../repositories/appointmentRepository';
import { BusinessClosureRepository } from '../../../repositories/businessClosureRepository';
import { ServiceRepository } from '../../../repositories/serviceRepository';
import { WorkingHoursRepository } from '../../../repositories/workingHoursRepository';
import { RescheduleSuggestionRepository } from '../../../repositories/rescheduleSuggestionRepository';
import { ReservationSettings, BusinessSettings } from '../../../types/reservationSettings';

import {
  TimeSlot,
  RescheduleSuggestion,
  RescheduleOptions,
  RescheduleResult,
  AvailabilitySlot,
  ClosureData
} from '../../../types/appointment';
import logger from "../../../utils/Logger/logger";
import { AppError } from '../../../types/responseTypes';
import { ERROR_CODES } from '../../../constants/errorCodes';

/**
 * AppointmentRescheduleService
 * 
 * Handles appointment rescheduling logic when business closures occur.
 * Uses repository pattern - no direct Prisma access.
 */
export class AppointmentRescheduleService {
  constructor(
    private readonly businessRepository: BusinessRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly businessClosureRepository: BusinessClosureRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly workingHoursRepository: WorkingHoursRepository,
    private readonly rescheduleSuggestionRepository: RescheduleSuggestionRepository,
    private readonly notificationService: NotificationService
  ) { }

  // Helper method to validate business reservation rules for rescheduling
  private async validateBusinessReservationRules(
    businessId: string,
    appointmentDateTime: Date,
    customerId?: string,
    serviceMinAdvanceBooking?: number
  ): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppError('Business not found', 404, ERROR_CODES.BUSINESS_NOT_FOUND);
    }

    const settings = (business.settings as BusinessSettings) || {};
    const reservationSettings = settings.reservationSettings;

    const rules: ReservationSettings = {
      maxAdvanceBookingDays: reservationSettings?.maxAdvanceBookingDays || 30,
      minNotificationHours: reservationSettings?.minNotificationHours ?? 0,
      maxDailyAppointments: reservationSettings?.maxDailyAppointments || 50
    };

    const now = new Date();

    // 1. Check maximum advance booking days
    const daysDifference = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference > rules.maxAdvanceBookingDays) {
      throw new AppError(
        'Reschedule date is too far in the future',
        400,
        ERROR_CODES.APPOINTMENT_TOO_FAR_FUTURE,
        true,
        { maxDays: rules.maxAdvanceBookingDays }
      );
    }

    // 2. Check minimum advance booking
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const minAdvanceHours = serviceMinAdvanceBooking !== undefined ? serviceMinAdvanceBooking : rules.minNotificationHours;

    if (hoursDifference < minAdvanceHours) {
      throw new AppError(
        `Must reschedule at least ${minAdvanceHours} hours in advance`,
        400,
        ERROR_CODES.APPOINTMENT_INSUFFICIENT_ADVANCE,
        true,
        { minHours: minAdvanceHours }
      );
    }

    // 3. Check maximum daily appointments
    const appointmentDateStart = new Date(appointmentDateTime);
    appointmentDateStart.setHours(0, 0, 0, 0);

    const appointmentDateEnd = new Date(appointmentDateTime);
    appointmentDateEnd.setHours(23, 59, 59, 999);

    const count = await this.appointmentRepository.getAppointmentsCount({
      businessId,
      date: {
        gte: appointmentDateStart,
        lte: appointmentDateEnd
      },
      status: {
        not: 'CANCELED'
      }
    });

    if (count >= rules.maxDailyAppointments) {
      throw new AppError(
        `Daily appointment limit (${rules.maxDailyAppointments}) reached for this date`,
        409,
        ERROR_CODES.APPOINTMENT_DAILY_LIMIT_REACHED,
        true,
        { maxDaily: rules.maxDailyAppointments }
      );
    }

    // 4. Check if customer already has an appointment on the same day
    if (customerId) {
      const customerAppointmentsCount = await this.appointmentRepository.getAppointmentsCount({
        businessId,
        customerId,
        date: {
          gte: appointmentDateStart,
          lte: appointmentDateEnd
        },
        status: {
          not: 'CANCELED'
        }
      });

      if (customerAppointmentsCount > 0) {
        throw new AppError(
          'Customer already has appointment on this date',
          409,
          ERROR_CODES.APPOINTMENT_TIME_CONFLICT
        );
      }
    }
  }

  async getAffectedAppointments(closureId: string): Promise<any[]> {
    try {
      const closure = await this.businessClosureRepository.findById(closureId);

      if (!closure) {
        throw new AppError('Closure not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      const endDate = closure.endDate || new Date('2099-12-31');

      const result = await this.appointmentRepository.search({
        businessId: closure.businessId,
        status: AppointmentStatus.CONFIRMED as any,
        startDate: closure.startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      return result.appointments;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to get affected appointments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async generateRescheduleSuggestions(
    appointmentId: string,
    closureData: ClosureData
  ): Promise<RescheduleSuggestion[]> {
    try {
      const appointment = await this.appointmentRepository.findByIdWithDetails(appointmentId);

      if (!appointment) {
        throw new AppError('Appointment not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      // Calculate search window (typically 2-4 weeks after closure ends)
      const searchStartDate = closureData.endDate || new Date(closureData.startDate.getTime() + 24 * 60 * 60 * 1000);
      const searchEndDate = new Date(searchStartDate.getTime() + 28 * 24 * 60 * 60 * 1000); // 4 weeks

      // Generate time slots similar to original appointment
      const availableSlots = await this.findAvailableSlots(
        appointment.businessId,
        appointment.serviceId,
        appointment.staffId || undefined,
        appointment.duration,
        searchStartDate,
        searchEndDate,
        this.getPreferredTimeFromOriginal(appointment.startTime)
      );

      // Create reschedule suggestion record
      const suggestionId = `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await this.rescheduleSuggestionRepository.create({
        id: suggestionId,
        originalAppointment: {
          connect: { id: appointmentId }
        },
        closure: {
          connect: { id: closureData.id }
        },
        suggestedDates: JSON.stringify(availableSlots),
        customerResponse: null
      });

      return [{
        originalAppointmentId: appointmentId,
        suggestedSlots: availableSlots,
        message: this.generateRescheduleMessage({
          ...appointment,
          staffId: appointment.staffId || undefined,
          status: appointment.status as any,
          price: Number(appointment.price),
          customerNotes: appointment.customerNotes || undefined,
          internalNotes: appointment.internalNotes || undefined,
          confirmedAt: appointment.confirmedAt || undefined,
          completedAt: appointment.completedAt || undefined,
          canceledAt: appointment.canceledAt || undefined,
          cancelReason: appointment.cancelReason || undefined,
          reminderSentAt: appointment.reminderSentAt || undefined
        }, availableSlots, closureData)
      }];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to generate reschedule suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500, ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async autoRescheduleAppointments(
    closureId: string,
    rescheduleOptions: RescheduleOptions
  ): Promise<RescheduleResult[]> {
    try {
      const affectedAppointments = await this.getAffectedAppointments(closureId);
      const results: RescheduleResult[] = [];

      const closure = await this.businessClosureRepository.findById(closureId);

      if (!closure) {
        throw new AppError('Closure not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      for (const appointment of affectedAppointments) {
        try {
          const result = await this.processAppointmentReschedule(
            {
              ...appointment,
              staffId: appointment.staffId || undefined,
              status: appointment.status as any,
              price: Number(appointment.price),
              customerNotes: appointment.customerNotes || undefined,
              internalNotes: appointment.internalNotes || undefined,
              confirmedAt: appointment.confirmedAt || undefined,
              completedAt: appointment.completedAt || undefined,
              canceledAt: appointment.canceledAt || undefined,
              cancelReason: appointment.cancelReason || undefined,
              reminderSentAt: appointment.reminderSentAt || undefined
            },
            closure,
            rescheduleOptions
          );
          results.push(result);
        } catch (error) {
          results.push({
            appointmentId: appointment.id,
            originalDateTime: appointment.startTime,
            suggestedSlots: [],
            status: 'FAILED',
            customerNotified: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to auto-reschedule appointments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500, ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAvailableSlots(
    businessId: string,
    serviceId: string,
    staffId: string | undefined,
    duration: number,
    startDate: Date,
    endDate: Date,
    preferredTime: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY' = 'ANY'
  ): Promise<TimeSlot[]> {
    try {
      // Get business working hours using repository
      const workingHours = await this.workingHoursRepository.findByBusiness(
        businessId,
        staffId || null,
        true
      );

      // Get existing appointments in the date range using repository
      const existingAppointmentsResult = await this.appointmentRepository.search({
        businessId,
        staffId,
        status: AppointmentStatus.CONFIRMED as any,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      const existingAppointments = existingAppointmentsResult.appointments;

      // Get business closures in the date range using repository
      const closures = await this.businessClosureRepository.findByDateRange(
        businessId,
        startDate,
        endDate
      );

      const availableSlots: TimeSlot[] = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate && availableSlots.length < 10) { // Limit to 10 suggestions
        const dayOfWeek = currentDate.getDay();

        // Find working hours for this day
        const dayWorkingHours = workingHours.filter(wh => wh.dayOfWeek === dayOfWeek);

        if (dayWorkingHours.length > 0) {
          for (const workingHour of dayWorkingHours) {
            // Check if this day is during a closure
            const isClosedDay = closures.some(closure => {
              const closureStart = new Date(closure.startDate);
              const closureEnd = closure.endDate ? new Date(closure.endDate) : new Date('2099-12-31');
              return currentDate >= closureStart && currentDate <= closureEnd;
            });

            if (!isClosedDay) {
              const daySlots = this.generateDayTimeSlots(
                currentDate,
                workingHour.startTime,
                workingHour.endTime,
                duration,
                preferredTime
              );

              // Filter out conflicting appointments
              const availableDaySlots = daySlots.filter(slot => {
                return !existingAppointments.some(appointment => {
                  return this.isTimeSlotConflicting(slot, appointment.startTime, appointment.endTime);
                });
              });

              availableSlots.push(...availableDaySlots.slice(0, 3)); // Max 3 slots per day
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return availableSlots.slice(0, 10); // Return maximum 10 slots
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to find available slots: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500, ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  async recordCustomerResponse(
    suggestionId: string,
    customerId: string,
    response: 'ACCEPTED' | 'DECLINED' | 'NO_RESPONSE',
    selectedSlotIndex?: number
  ): Promise<void> {
    try {
      const suggestion = await this.rescheduleSuggestionRepository.findByIdWithAppointment(suggestionId);

      if (!suggestion) {
        throw new AppError('Reschedule suggestion not found', 404, ERROR_CODES.APPOINTMENT_NOT_FOUND);
      }

      if (suggestion.originalAppointment.customerId !== customerId) {
        throw new AppError('Unauthorized to respond to this suggestion', 403, ERROR_CODES.ACCESS_DENIED);
      }

      await this.rescheduleSuggestionRepository.updateCustomerResponse(suggestionId, response);

      if (response === 'ACCEPTED' && selectedSlotIndex !== undefined) {
        const suggestedSlots = JSON.parse(suggestion.suggestedDates as string) as TimeSlot[];
        const selectedSlot = suggestedSlots[selectedSlotIndex];

        if (selectedSlot) {
          // CRITICAL: Validate business reservation rules before rescheduling
          const appointment = await this.appointmentRepository.findByIdWithDetails(suggestion.originalAppointmentId);

          if (appointment) {
            const service = await this.serviceRepository.findById(appointment.serviceId);

            await this.validateBusinessReservationRules(
              appointment.businessId,
              new Date(selectedSlot.startTime),
              appointment.customerId,
              service?.minAdvanceBooking
            );
          }

          // Update the original appointment with new time using repository
          await this.appointmentRepository.update(suggestion.originalAppointmentId, {
            startTime: new Date(selectedSlot.startTime).toISOString(),
            status: AppointmentStatus.CONFIRMED as any
          });
        }
      } else if (response === 'DECLINED') {
        // Cancel the original appointment using repository
        await this.appointmentRepository.cancel(
          suggestion.originalAppointmentId,
          'Customer declined reschedule due to business closure'
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to record customer response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500, ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async processAppointmentReschedule(
    appointment: AppointmentData,
    closure: BusinessClosureData,
    options: RescheduleOptions
  ): Promise<RescheduleResult> {
    const closureData: ClosureData = {
      id: closure.id,
      businessId: closure.businessId,
      startDate: closure.startDate,
      endDate: closure.endDate || undefined,
      type: closure.type,
      reason: closure.reason
    };

    // Generate suggestions
    const suggestions = await this.generateRescheduleSuggestions(appointment.id, closureData);

    let customerNotified = false;

    // Notify customer if requested
    if (options.notifyCustomers && suggestions.length > 0) {
      try {
        await this.notificationService.sendRescheduleNotification(appointment.id, suggestions);
        customerNotified = true;
      } catch (error) {
        logger.error(`Failed to notify customer: ${error}`);
      }
    }

    // Auto-reschedule if enabled and slots are available
    if (options.autoReschedule && suggestions[0]?.suggestedSlots.length > 0) {
      try {
        const bestSlot = suggestions[0].suggestedSlots[0]; // Use first available slot

        // Get service information for validation
        const service = await this.serviceRepository.findById(appointment.serviceId);

        // CRITICAL: Validate business reservation rules before auto-rescheduling
        await this.validateBusinessReservationRules(
          appointment.businessId,
          new Date(bestSlot.startTime),
          appointment.customerId,
          service?.minAdvanceBooking
        );

        await this.appointmentRepository.update(appointment.id, {
          startTime: new Date(bestSlot.startTime).toISOString(),
          status: AppointmentStatus.CONFIRMED as any
        });

        return {
          appointmentId: appointment.id,
          originalDateTime: appointment.startTime,
          suggestedSlots: suggestions[0].suggestedSlots,
          status: 'RESCHEDULED',
          newDateTime: new Date(bestSlot.startTime),
          customerNotified
        };
      } catch (error) {
        return {
          appointmentId: appointment.id,
          originalDateTime: appointment.startTime,
          suggestedSlots: suggestions[0]?.suggestedSlots || [],
          status: 'SUGGESTED',
          customerNotified,
          error: `Auto-reschedule failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    return {
      appointmentId: appointment.id,
      originalDateTime: appointment.startTime,
      suggestedSlots: suggestions[0]?.suggestedSlots || [],
      status: suggestions[0]?.suggestedSlots.length > 0 ? 'SUGGESTED' : 'FAILED',
      customerNotified,
      error: suggestions[0]?.suggestedSlots.length === 0 ? 'No available slots found' : undefined
    };
  }

  private generateDayTimeSlots(
    date: Date,
    startTime: string,
    endTime: string,
    duration: number,
    preferredTime: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY'
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Apply preferred time filter
    let searchStart = new Date(dayStart);
    let searchEnd = new Date(dayEnd);

    switch (preferredTime) {
      case 'MORNING':
        searchEnd = new Date(date);
        searchEnd.setHours(12, 0, 0, 0);
        break;
      case 'AFTERNOON':
        searchStart = new Date(date);
        searchStart.setHours(12, 0, 0, 0);
        searchEnd = new Date(date);
        searchEnd.setHours(17, 0, 0, 0);
        break;
      case 'EVENING':
        searchStart = new Date(date);
        searchStart.setHours(17, 0, 0, 0);
        break;
    }

    // Ensure search window is within working hours
    searchStart = new Date(Math.max(searchStart.getTime(), dayStart.getTime()));
    searchEnd = new Date(Math.min(searchEnd.getTime(), dayEnd.getTime()));

    let currentSlot = new Date(searchStart);

    while (currentSlot.getTime() + (duration * 60 * 1000) <= searchEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + (duration * 60 * 1000));

      slots.push({
        startTime: new Date(currentSlot),
        endTime: slotEnd,
        isAvailable: true
      });

      // Move to next 30-minute slot
      currentSlot.setMinutes(currentSlot.getMinutes() + 30);
    }

    return slots;
  }

  private isTimeSlotConflicting(
    slot: TimeSlot,
    appointmentStart: Date,
    appointmentEnd: Date
  ): boolean {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);

    return (slotStart < appointmentEnd && slotEnd > appointmentStart);
  }

  private getPreferredTimeFromOriginal(originalTime: Date): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY' {
    const hour = originalTime.getHours();

    if (hour < 12) return 'MORNING';
    if (hour < 17) return 'AFTERNOON';
    return 'EVENING';
  }

  private generateRescheduleMessage(
    appointment: AppointmentData,
    suggestedSlots: TimeSlot[],
    closureData: ClosureData
  ): string {
    const formatDateTime = (date: Date) => date.toLocaleString();

    return `Your appointment at ${(appointment as any).business?.name || 'Business'} for ${(appointment as any).service?.name || 'Service'} scheduled on ${formatDateTime(appointment.startTime)} needs to be rescheduled due to: ${closureData.reason}. We have ${suggestedSlots.length} alternative times available.`;
  }

  async getRescheduleStatistics(closureId: string): Promise<{
    totalAffected: number;
    suggested: number;
    rescheduled: number;
    cancelled: number;
    pending: number;
  }> {
    try {
      const suggestions = await this.rescheduleSuggestionRepository.findByClosure(closureId);

      const stats = {
        totalAffected: suggestions.length,
        suggested: suggestions.length,
        rescheduled: suggestions.filter(s => s.customerResponse === 'ACCEPTED').length,
        cancelled: suggestions.filter(s => s.customerResponse === 'DECLINED').length,
        pending: suggestions.filter(s => !s.customerResponse).length
      };

      return stats;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to get reschedule statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500, ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
}