// Business Validation Types - Enterprise Architecture
import { ValidationResult, ValidationError, ValidationErrorType } from './notificationValidation'; // Reusing core validation types
import { BusinessStaffRole } from '@prisma/client';

// Re-export validation options from core validation service
export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
}

export interface ArrayValidationOptions {
  minLength?: number;
  maxLength?: number;
  itemValidator?: (item: unknown) => ValidationResult<unknown>;
  required?: boolean;
}

export interface NumberValidationOptions {
  min?: number;
  max?: number;
  required?: boolean;
}

// Business validation request interfaces
export interface BusinessValidationRequest {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  timezone?: string;
  currency?: string;
}

export interface ServiceValidationRequest {
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  showPrice?: boolean;
  bufferTime?: number;
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
}

export interface StaffValidationRequest {
  userId: string;
  role: BusinessStaffRole;
  permissions?: Record<string, unknown>;
}

export interface BusinessHoursValidationRequest {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface BusinessSettingsValidationRequest {
  notificationSettings?: Record<string, unknown>;
  privacySettings?: Record<string, unknown>;
  priceSettings?: Record<string, unknown>;
  staffPrivacySettings?: Record<string, unknown>;
}

// Business validation error types
export enum BusinessValidationErrorType {
  INVALID_BUSINESS_NAME = 'INVALID_BUSINESS_NAME',
  INVALID_DESCRIPTION = 'INVALID_DESCRIPTION',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TIMEZONE = 'INVALID_TIMEZONE',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  INVALID_SERVICE_NAME = 'INVALID_SERVICE_NAME',
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_BUFFER_TIME = 'INVALID_BUFFER_TIME',
  INVALID_ADVANCE_BOOKING = 'INVALID_ADVANCE_BOOKING',
  INVALID_STAFF_ROLE = 'INVALID_STAFF_ROLE',
  INVALID_PERMISSIONS = 'INVALID_PERMISSIONS',
  INVALID_BUSINESS_HOURS = 'INVALID_BUSINESS_HOURS',
  INVALID_SETTINGS = 'INVALID_SETTINGS',
  BUSINESS_NAME_REQUIRED = 'BUSINESS_NAME_REQUIRED',
  SERVICE_NAME_REQUIRED = 'SERVICE_NAME_REQUIRED',
  DURATION_REQUIRED = 'DURATION_REQUIRED',
  PRICE_REQUIRED = 'PRICE_REQUIRED',
  STAFF_ROLE_REQUIRED = 'STAFF_ROLE_REQUIRED',
  BUSINESS_NAME_TOO_LONG = 'BUSINESS_NAME_TOO_LONG',
  DESCRIPTION_TOO_LONG = 'DESCRIPTION_TOO_LONG',
  PHONE_INVALID_FORMAT = 'PHONE_INVALID_FORMAT',
  EMAIL_INVALID_FORMAT = 'EMAIL_INVALID_FORMAT',
  ADDRESS_TOO_LONG = 'ADDRESS_TOO_LONG',
  TIMEZONE_INVALID = 'TIMEZONE_INVALID',
  CURRENCY_INVALID = 'CURRENCY_INVALID',
  SERVICE_NAME_TOO_LONG = 'SERVICE_NAME_TOO_LONG',
  DURATION_TOO_SHORT = 'DURATION_TOO_SHORT',
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  PRICE_NEGATIVE = 'PRICE_NEGATIVE',
  PRICE_TOO_HIGH = 'PRICE_TOO_HIGH',
  BUFFER_TIME_INVALID = 'BUFFER_TIME_INVALID',
  ADVANCE_BOOKING_INVALID = 'ADVANCE_BOOKING_INVALID',
  STAFF_ROLE_INVALID = 'STAFF_ROLE_INVALID',
  PERMISSIONS_INVALID = 'PERMISSIONS_INVALID',
  BUSINESS_HOURS_INVALID = 'BUSINESS_HOURS_INVALID',
  SETTINGS_INVALID = 'SETTINGS_INVALID',
  BUSINESS_NAME_MALICIOUS = 'BUSINESS_NAME_MALICIOUS',
  DESCRIPTION_MALICIOUS = 'DESCRIPTION_MALICIOUS',
  PHONE_MALICIOUS = 'PHONE_MALICIOUS',
  EMAIL_MALICIOUS = 'EMAIL_MALICIOUS',
  ADDRESS_MALICIOUS = 'ADDRESS_MALICIOUS',
  SERVICE_NAME_MALICIOUS = 'SERVICE_NAME_MALICIOUS',
  STAFF_DATA_MALICIOUS = 'STAFF_DATA_MALICIOUS',
  SETTINGS_MALICIOUS = 'SETTINGS_MALICIOUS'
}

export interface BusinessValidationError {
  type: BusinessValidationErrorType;
  message: string;
  field?: string;
  code?: string;
}

// Business validation options
export interface BusinessValidationOptions {
  business?: {
    name?: StringValidationOptions;
    description?: StringValidationOptions;
    phone?: StringValidationOptions;
    email?: StringValidationOptions;
    address?: StringValidationOptions;
    timezone?: StringValidationOptions;
    currency?: StringValidationOptions;
  };
  service?: {
    name?: StringValidationOptions;
    description?: StringValidationOptions;
    duration?: NumberValidationOptions;
    price?: NumberValidationOptions;
    currency?: StringValidationOptions;
    bufferTime?: NumberValidationOptions;
    maxAdvanceBooking?: NumberValidationOptions;
    minAdvanceBooking?: NumberValidationOptions;
  };
  staff?: {
    userId?: StringValidationOptions;
    role?: StringValidationOptions;
    permissions?: {
      required?: boolean;
    };
  };
  businessHours?: {
    dayOfWeek?: NumberValidationOptions;
    isOpen?: {
      required?: boolean;
    };
    openTime?: StringValidationOptions;
    closeTime?: StringValidationOptions;
    breakStartTime?: StringValidationOptions;
    breakEndTime?: StringValidationOptions;
  };
  settings?: {
    notificationSettings?: {
      required?: boolean;
    };
    privacySettings?: {
      required?: boolean;
    };
    priceSettings?: {
      required?: boolean;
    };
    staffPrivacySettings?: {
      required?: boolean;
    };
  };
}

// Business validation configuration
export interface BusinessValidationConfig {
  business: {
    name: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
      required: boolean;
    };
    description: {
      maxLength: number;
      pattern: RegExp;
    };
    phone: {
      pattern: RegExp;
    };
    email: {
      pattern: RegExp;
    };
    address: {
      maxLength: number;
      pattern: RegExp;
    };
    timezone: {
      pattern: RegExp;
    };
    currency: {
      pattern: RegExp;
    };
  };
  service: {
    name: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
      required: boolean;
    };
    description: {
      maxLength: number;
      pattern: RegExp;
    };
    duration: {
      min: number;
      max: number;
      required: boolean;
    };
    price: {
      min: number;
      max: number;
      required: boolean;
    };
    currency: {
      pattern: RegExp;
    };
    bufferTime: {
      min: number;
      max: number;
    };
    maxAdvanceBooking: {
      min: number;
      max: number;
    };
    minAdvanceBooking: {
      min: number;
      max: number;
    };
  };
  staff: {
    userId: {
      pattern: RegExp;
      required: boolean;
    };
    role: {
      required: boolean;
    };
  };
  businessHours: {
    dayOfWeek: {
      min: number;
      max: number;
      required: boolean;
    };
    openTime: {
      pattern: RegExp;
    };
    closeTime: {
      pattern: RegExp;
    };
    breakStartTime: {
      pattern: RegExp;
    };
    breakEndTime: {
      pattern: RegExp;
    };
  };
}

// Business sanitization configuration
export interface BusinessSanitizationConfig {
  business: {
    name: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    description: {
      allowedTags: string[];
      allowedAttributes: string[];
      maxLength: number;
    };
    phone: {
      allowedCharacters: RegExp;
    };
    email: {
      allowedCharacters: RegExp;
    };
    address: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    timezone: {
      allowedCharacters: RegExp;
    };
    currency: {
      allowedCharacters: RegExp;
    };
  };
  service: {
    name: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    description: {
      allowedTags: string[];
      allowedAttributes: string[];
      maxLength: number;
    };
    duration: {
      min: number;
      max: number;
    };
    price: {
      min: number;
      max: number;
    };
    currency: {
      allowedCharacters: RegExp;
    };
    bufferTime: {
      min: number;
      max: number;
    };
    maxAdvanceBooking: {
      min: number;
      max: number;
    };
    minAdvanceBooking: {
      min: number;
      max: number;
    };
  };
  staff: {
    userId: {
      allowedCharacters: RegExp;
    };
    role: {
      allowedValues: string[];
    };
    permissions: {
      allowedKeys: RegExp;
    };
  };
  businessHours: {
    dayOfWeek: {
      min: number;
      max: number;
    };
    openTime: {
      allowedCharacters: RegExp;
    };
    closeTime: {
      allowedCharacters: RegExp;
    };
    breakStartTime: {
      allowedCharacters: RegExp;
    };
    breakEndTime: {
      allowedCharacters: RegExp;
    };
  };
  settings: {
    notificationSettings: {
      allowedKeys: RegExp;
    };
    privacySettings: {
      allowedKeys: RegExp;
    };
    priceSettings: {
      allowedKeys: RegExp;
    };
    staffPrivacySettings: {
      allowedKeys: RegExp;
    };
  };
}

// Business data object for sanitization
export interface BusinessDataObject {
  [key: string]: string | number | boolean | BusinessDataObject | BusinessDataObject[] | null | undefined;
}

// Sanitized business data object
export interface SanitizedBusinessDataObject {
  [key: string]: string | number | boolean | SanitizedBusinessDataObject | SanitizedBusinessDataObject[] | null | undefined;
}

// Sanitized business data interfaces
export interface SanitizedBusinessData {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  timezone?: string;
  currency?: string;
}

export interface SanitizedServiceData {
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  showPrice?: boolean;
  bufferTime?: number;
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
}

export interface SanitizedStaffData {
  userId: string;
  role: BusinessStaffRole;
  permissions?: Record<string, unknown>;
}

export interface SanitizedBusinessHoursData {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface SanitizedBusinessSettingsData {
  notificationSettings?: Record<string, unknown>;
  privacySettings?: Record<string, unknown>;
  priceSettings?: Record<string, unknown>;
  staffPrivacySettings?: Record<string, unknown>;
}
