// Appointment Domain Types
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  reason?: string;
}

export interface RescheduleSuggestion {
  originalAppointmentId: string;
  suggestedSlots: TimeSlot[];
  message: string;
}

export interface RescheduleOptions {
  autoReschedule: boolean;
  maxRescheduleDays: number;
  preferredTimeSlots: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  notifyCustomers: boolean;
  allowWeekends: boolean;
  businessHoursOnly: boolean;
  respectStaffAvailability: boolean;
  maxSuggestions: number;
}

export interface RescheduleResult {
  appointmentId: string;
  originalDateTime: Date;
  suggestedSlots: TimeSlot[];
  status: 'SUGGESTED' | 'RESCHEDULED' | 'CANCELLED' | 'FAILED';
  newDateTime?: Date;
  customerNotified: boolean;
  error?: string;
}

export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  reason?: string;
  staffId?: string;
  serviceId?: string;
}

export interface ClosureData {
  id: string;
  businessId: string;
  startDate: Date;
  endDate?: Date;
  reason: string;
  type: string;
}

export interface AppointmentSchedulerConfig {
  autoCompleteSchedule?: string; // Cron expression, default: every 5 minutes
  timezone?: string; // Default: 'Europe/Istanbul'
  developmentMode?: boolean; // Enable for testing with accelerated schedules
  batchSize?: number; // Number of appointments to process at once
  maxRetries?: number; // Maximum retry attempts for failed operations
  retryDelay?: number; // Delay between retries in milliseconds
}
