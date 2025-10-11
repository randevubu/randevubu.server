// Appointment Validation Constants - Enterprise Architecture
import { AppointmentStatus } from '../types/business';
import { AppointmentValidationConfig, AppointmentSanitizationConfig } from '../types/appointmentValidation';

// Validation configuration
export const APPOINTMENT_VALIDATION_CONFIG: AppointmentValidationConfig = {
  maxNotesLength: 500,
  maxCancelReasonLength: 200,
  maxInternalNotesLength: 500,
  minAdvanceBookingHours: 1,
  maxAdvanceBookingDays: 30,
  allowedTimeFormats: ['HH:MM', 'H:MM', 'HH:mm', 'h:mm A'],
  allowedDateFormats: ['YYYY-MM-DD'],
  timezone: 'Europe/Istanbul'
};

// Sanitization configuration
export const APPOINTMENT_SANITIZATION_CONFIG: AppointmentSanitizationConfig = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
  allowedAttributes: [],
  maxNotesLength: 500,
  stripHtml: true,
  escapeSpecialChars: true
};

// Malicious patterns for appointment data
export const APPOINTMENT_MALICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /eval\s*\(/i,
  /document\.write/i,
  /innerHTML/i,
  /outerHTML/i,
  /insertAdjacentHTML/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<form/i,
  /<input/i,
  /<textarea/i,
  /<select/i,
  /<button/i
] as const;

// Regex patterns
export const APPOINTMENT_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const APPOINTMENT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const APPOINTMENT_TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
export const APPOINTMENT_VALID_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

// Error messages
export const APPOINTMENT_ERROR_MESSAGES = {
  // General validation errors
  INVALID_FORMAT: 'Invalid format provided',
  MISSING_REQUIRED: 'Required field is missing',
  INVALID_TYPE: 'Invalid data type provided',
  
  // Date and time errors
  INVALID_DATE_FORMAT: 'Date must be in YYYY-MM-DD format',
  INVALID_TIME_FORMAT: 'Time must be in HH:MM format',
  PAST_DATE_NOT_ALLOWED: 'Cannot book appointments in the past',
  INVALID_DATE_RANGE: 'Invalid date range provided',
  INVALID_TIME_RANGE: 'Invalid time range provided',
  
  // Business validation errors
  BUSINESS_NOT_FOUND: 'Business not found',
  BUSINESS_INACTIVE: 'Business is not active',
  BUSINESS_CLOSED: 'Business is closed on this date',
  INVALID_BUSINESS_ID: 'Invalid business ID format',
  
  // Service validation errors
  SERVICE_NOT_FOUND: 'Service not found',
  SERVICE_INACTIVE: 'Service is not active',
  INVALID_SERVICE_ID: 'Invalid service ID format',
  SERVICE_NOT_AVAILABLE: 'Service is not available for booking',
  
  // Staff validation errors
  STAFF_NOT_FOUND: 'Staff member not found',
  STAFF_INACTIVE: 'Staff member is not active',
  STAFF_NOT_AVAILABLE: 'Staff member is not available',
  INVALID_STAFF_ID: 'Invalid staff ID format',
  STAFF_NOT_IN_BUSINESS: 'Staff member does not belong to this business',
  
  // Customer validation errors
  CUSTOMER_NOT_FOUND: 'Customer not found',
  CUSTOMER_INACTIVE: 'Customer is not active',
  INVALID_CUSTOMER_ID: 'Invalid customer ID format',
  
  // Appointment validation errors
  APPOINTMENT_NOT_FOUND: 'Appointment not found',
  APPOINTMENT_ALREADY_EXISTS: 'Appointment already exists at this time',
  TIME_CONFLICT: 'Time conflict with existing appointment',
  INVALID_ADVANCE_BOOKING: 'Appointment must be booked in advance',
  TOO_FAR_IN_ADVANCE: 'Cannot book appointment too far in advance',
  WEEKEND_BOOKING_NOT_ALLOWED: 'Weekend booking not allowed',
  HOLIDAY_BOOKING_NOT_ALLOWED: 'Holiday booking not allowed',
  
  // Notes validation errors
  NOTES_TOO_LONG: 'Notes exceed maximum length',
  INVALID_NOTES_FORMAT: 'Invalid notes format',
  MALICIOUS_CONTENT: 'Content contains potentially malicious patterns',
  
  // Status validation errors
  INVALID_STATUS: 'Invalid appointment status',
  STATUS_TRANSITION_NOT_ALLOWED: 'Status transition not allowed',
  CANNOT_CANCEL_COMPLETED: 'Cannot cancel completed appointment',
  CANNOT_MODIFY_CANCELLED: 'Cannot modify cancelled appointment',
  
  // Security errors
  UNAUTHORIZED_ACCESS: 'Unauthorized access to appointment',
  INVALID_PERMISSIONS: 'Insufficient permissions',
  SECURITY_VIOLATION: 'Security violation detected',
  
  // System errors
  VALIDATION_FAILED: 'Validation failed',
  SANITIZATION_FAILED: 'Sanitization failed',
  UNKNOWN_ERROR: 'Unknown error occurred'
} as const;

// Appointment status transitions
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.COMPLETED]: [], // Terminal state
  [AppointmentStatus.CANCELED]: [], // Terminal state
  [AppointmentStatus.NO_SHOW]: [AppointmentStatus.CONFIRMED] // Can be rescheduled
};

// Time constraints
export const APPOINTMENT_TIME_CONSTRAINTS = {
  MIN_ADVANCE_BOOKING_HOURS: 1,
  MAX_ADVANCE_BOOKING_DAYS: 30,
  MIN_APPOINTMENT_DURATION_MINUTES: 15,
  MAX_APPOINTMENT_DURATION_HOURS: 8,
  BUSINESS_HOURS_START: 8, // 8 AM
  BUSINESS_HOURS_END: 22, // 10 PM
  LUNCH_BREAK_START: 12, // 12 PM
  LUNCH_BREAK_END: 13 // 1 PM
} as const;

// Validation limits
export const APPOINTMENT_VALIDATION_LIMITS = {
  MAX_NOTES_LENGTH: 500,
  MAX_CANCEL_REASON_LENGTH: 200,
  MAX_INTERNAL_NOTES_LENGTH: 500,
  MAX_SEARCH_RESULTS: 100,
  MAX_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 1,
  DEFAULT_PAGE_SIZE: 20
} as const;
