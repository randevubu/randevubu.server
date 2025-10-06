import { PrismaClient, Appointment, BusinessClosure, AppointmentStatus } from '@prisma/client';
import { NotificationService } from '../notification';
import { AppointmentData } from '../../../types/business';

import {
  TimeSlot,
  RescheduleSuggestion,
  RescheduleOptions,
  RescheduleResult,
  AvailabilitySlot,
  ClosureData
} from '../../../types/appointment';

export class AppointmentRescheduleService {
  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService
  ) {}

  async getAffectedAppointments(closureId: string): Promise<any[]> {
    try {
      const closure = await this.prisma.businessClosure.findUnique({
        where: { id: closureId }
      });

      if (!closure) {
        throw new Error('Closure not found');
      }

      const endDate = closure.endDate || new Date('2099-12-31');

      return await this.prisma.appointment.findMany({
        where: {
          businessId: closure.businessId,
          startTime: {
            gte: closure.startDate,
            lte: endDate
          },
          status: AppointmentStatus.CONFIRMED
        },
        include: {
          customer: true,
          service: true,
          staff: true,
          business: true
        }
      });
    } catch (error) {
      throw new Error(`Failed to get affected appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateRescheduleSuggestions(
    appointmentId: string,
    closureData: ClosureData
  ): Promise<RescheduleSuggestion[]> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          staff: true,
          business: true,
          customer: true
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
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
      
      await this.prisma.rescheduleSuggestion.create({
        data: {
          id: suggestionId,
          originalAppointmentId: appointmentId,
          closureId: closureData.id,
          suggestedDates: JSON.stringify(availableSlots),
          customerResponse: null
        }
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
      throw new Error(`Failed to generate reschedule suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async autoRescheduleAppointments(
    closureId: string,
    rescheduleOptions: RescheduleOptions
  ): Promise<RescheduleResult[]> {
    try {
      const affectedAppointments = await this.getAffectedAppointments(closureId);
      const results: RescheduleResult[] = [];

      const closure = await this.prisma.businessClosure.findUnique({
        where: { id: closureId }
      });

      if (!closure) {
        throw new Error('Closure not found');
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
      throw new Error(`Failed to auto-reschedule appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // Get business working hours
      const workingHours = await this.prisma.workingHours.findMany({
        where: {
          businessId,
          staffId: staffId || null,
          isActive: true
        }
      });

      // Get existing appointments in the date range
      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          businessId,
          staffId: staffId || undefined,
          startTime: {
            gte: startDate,
            lte: endDate
          },
          status: AppointmentStatus.CONFIRMED
        }
      });

      // Get business closures in the date range
      const closures = await this.prisma.businessClosure.findMany({
        where: {
          businessId,
          isActive: true,
          OR: [
            {
              startDate: {
                lte: endDate
              },
              endDate: {
                gte: startDate
              }
            },
            {
              startDate: {
                lte: endDate
              },
              endDate: null
            }
          ]
        }
      });

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
      throw new Error(`Failed to find available slots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recordCustomerResponse(
    suggestionId: string,
    customerId: string,
    response: 'ACCEPTED' | 'DECLINED' | 'NO_RESPONSE',
    selectedSlotIndex?: number
  ): Promise<void> {
    try {
      const suggestion = await this.prisma.rescheduleSuggestion.findUnique({
        where: { id: suggestionId },
        include: {
          originalAppointment: true
        }
      });

      if (!suggestion) {
        throw new Error('Reschedule suggestion not found');
      }

      if (suggestion.originalAppointment.customerId !== customerId) {
        throw new Error('Unauthorized to respond to this suggestion');
      }

      await this.prisma.rescheduleSuggestion.update({
        where: { id: suggestionId },
        data: {
          customerResponse: response,
          responseAt: new Date()
        }
      });

      if (response === 'ACCEPTED' && selectedSlotIndex !== undefined) {
        const suggestedSlots = JSON.parse(suggestion.suggestedDates as string) as TimeSlot[];
        const selectedSlot = suggestedSlots[selectedSlotIndex];

        if (selectedSlot) {
          // Update the original appointment with new time
          await this.prisma.appointment.update({
            where: { id: suggestion.originalAppointmentId },
            data: {
              startTime: new Date(selectedSlot.startTime),
              endTime: new Date(selectedSlot.endTime),
              status: AppointmentStatus.CONFIRMED
            }
          });
        }
      } else if (response === 'DECLINED') {
        // Cancel the original appointment
        await this.prisma.appointment.update({
          where: { id: suggestion.originalAppointmentId },
          data: {
            status: AppointmentStatus.CANCELED,
            cancelReason: 'Customer declined reschedule due to business closure',
            canceledAt: new Date()
          }
        });
      }
    } catch (error) {
      throw new Error(`Failed to record customer response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processAppointmentReschedule(
    appointment: AppointmentData,
    closure: BusinessClosure,
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
        console.error(`Failed to notify customer: ${error}`);
      }
    }

    // Auto-reschedule if enabled and slots are available
    if (options.autoReschedule && suggestions[0]?.suggestedSlots.length > 0) {
      try {
        const bestSlot = suggestions[0].suggestedSlots[0]; // Use first available slot
        
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            startTime: new Date(bestSlot.startTime),
            endTime: new Date(bestSlot.endTime),
            status: AppointmentStatus.CONFIRMED
          }
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
      const suggestions = await this.prisma.rescheduleSuggestion.findMany({
        where: { closureId },
        include: {
          originalAppointment: true
        }
      });

      const stats = {
        totalAffected: suggestions.length,
        suggested: suggestions.length,
        rescheduled: suggestions.filter(s => s.customerResponse === 'ACCEPTED').length,
        cancelled: suggestions.filter(s => s.customerResponse === 'DECLINED').length,
        pending: suggestions.filter(s => !s.customerResponse).length
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get reschedule statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}