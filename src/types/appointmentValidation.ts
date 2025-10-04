// Appointment Validation Types - Enterprise Architecture
import { AppointmentStatus } from './business';

// Core validation result type
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

// Appointment-specific validation interfaces
export interface AppointmentValidationRequest {
  businessId: string;
  serviceId: string;
  staffId: string;
  customerId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
}

export interface AppointmentUpdateRequest {
  date?: string;
  startTime?: string;
  status?: AppointmentStatus;
  customerNotes?: string;
  internalNotes?: string;
  cancelReason?: string;
}

export interface SanitizedAppointmentData {
  businessId: string;
  serviceId: string;
  staffId: string;
  customerId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
  internalNotes?: string;
  cancelReason?: string;
}

// Business settings validation
export interface BusinessSettingsValidation {
  priceVisibility?: {
    hideAllServicePrices?: boolean;
  };
  staffPrivacy?: {
    hideStaffNames?: boolean;
    staffDisplayMode?: 'ROLES' | 'GENERIC' | 'FULL';
    customStaffLabels?: Record<string, string>;
  };
}

// Appointment search filters validation
export interface AppointmentSearchValidation {
  businessId?: string;
  staffId?: string;
  customerId?: string;
  status?: AppointmentStatus;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Time validation
export interface TimeValidation {
  date: string;
  startTime: string;
  endTime?: string;
  timezone?: string;
}

// Staff validation
export interface StaffValidation {
  staffId: string;
  businessId: string;
  isActive: boolean;
  role: string;
}

// Service validation
export interface ServiceValidation {
  serviceId: string;
  businessId: string;
  isActive: boolean;
  duration: number;
  price: number;
  currency: string;
  showPrice: boolean;
}

// Customer validation
export interface CustomerValidation {
  customerId: string;
  businessId?: string;
  isActive: boolean;
}

// Validation error types
export enum AppointmentValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_TIME = 'INVALID_TIME',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_BUSINESS = 'INVALID_BUSINESS',
  INVALID_SERVICE = 'INVALID_SERVICE',
  INVALID_STAFF = 'INVALID_STAFF',
  INVALID_CUSTOMER = 'INVALID_CUSTOMER',
  BUSINESS_CLOSED = 'BUSINESS_CLOSED',
  TIME_CONFLICT = 'TIME_CONFLICT',
  INVALID_ADVANCE_BOOKING = 'INVALID_ADVANCE_BOOKING',
  INVALID_NOTES = 'INVALID_NOTES',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION'
}

export interface AppointmentValidationError {
  type: AppointmentValidationErrorType;
  field?: string;
  message: string;
  value?: unknown;
}

// Validation options
export interface AppointmentValidationOptions {
  allowPastDates?: boolean;
  minAdvanceBooking?: number; // in hours
  maxAdvanceBooking?: number; // in days
  allowWeekendBooking?: boolean;
  allowHolidayBooking?: boolean;
  timezone?: string;
  strictMode?: boolean;
}

// Sanitization options
export interface AppointmentSanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxNotesLength?: number;
  stripHtml?: boolean;
  escapeSpecialChars?: boolean;
}

// Validation configuration
export interface AppointmentValidationConfig {
  maxNotesLength: number;
  maxCancelReasonLength: number;
  maxInternalNotesLength: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  allowedTimeFormats: string[];
  allowedDateFormats: string[];
  timezone: string;
}

// Sanitization configuration
export interface AppointmentSanitizationConfig {
  allowedTags: string[];
  allowedAttributes: string[];
  maxNotesLength: number;
  stripHtml: boolean;
  escapeSpecialChars: boolean;
}

// Appointment data object for sanitization
export interface AppointmentDataObject {
  [key: string]: string | number | boolean | AppointmentDataObject | AppointmentDataObject[] | null | undefined;
}

// Sanitized appointment data object
export interface SanitizedAppointmentDataObject {
  [key: string]: string | number | boolean | SanitizedAppointmentDataObject | SanitizedAppointmentDataObject[] | null | undefined;
}

// Sanitized appointment data interfaces
export interface SanitizedAppointmentData {
  businessId: string;
  serviceId: string;
  staffId: string;
  customerId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
  internalNotes?: string;
  cancelReason?: string;
}

export interface SanitizedAppointmentSearchData {
  businessId?: string;
  staffId?: string;
  customerId?: string;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
