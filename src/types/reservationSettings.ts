/**
 * Reservation Settings Types
 * Defines the structure of business reservation settings
 */

export interface ReservationSettings {
  maxAdvanceBookingDays: number;
  minNotificationHours: number;
  maxDailyAppointments: number;
}

export interface BusinessReservationSettings extends ReservationSettings {
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationValidationResult {
  isValid: boolean;
  errors: ReservationValidationError[];
}

export interface ReservationValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface ReservationValidationRequest {
  businessId: string;
  appointmentDate: Date;
  customerId?: string;
}

export interface BusinessSettings {
  reservationSettings?: ReservationSettings;
  priceVisibility?: Record<string, unknown>;
  staffPrivacy?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  [key: string]: unknown;
}

