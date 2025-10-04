// Closure Validation Types - Enterprise Architecture
import { ValidationResult, ValidationError, ValidationErrorType } from './notificationValidation'; // Reusing core validation types
import { ClosureType } from '@prisma/client';

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

// Closure validation request interfaces
export interface ClosureValidationRequest {
  startDate: string;
  endDate?: string;
  reason: string;
  type: ClosureType;
  affectedServices?: string[];
  isRecurring?: boolean;
  recurringPattern?: Record<string, unknown>;
  notifyCustomers?: boolean;
  notificationMessage?: string;
  notificationChannels?: string[];
}

export interface ClosureUpdateValidationRequest {
  startDate?: string;
  endDate?: string;
  reason?: string;
  type?: ClosureType;
  affectedServices?: string[];
  isRecurring?: boolean;
  recurringPattern?: Record<string, unknown>;
  notifyCustomers?: boolean;
  notificationMessage?: string;
  notificationChannels?: string[];
}

export interface ClosureAnalyticsValidationRequest {
  businessId: string;
  startDate?: string;
  endDate?: string;
  type?: ClosureType;
  includeRecurring?: boolean;
}

export interface RescheduleValidationRequest {
  closureId: string;
  businessId: string;
  autoReschedule?: boolean;
  maxRescheduleDays?: number;
  preferredTimeSlots?: string;
  notifyCustomers?: boolean;
  allowWeekends?: boolean;
}

// Closure validation error types
export enum ClosureValidationErrorType {
  INVALID_START_DATE = 'INVALID_START_DATE',
  INVALID_END_DATE = 'INVALID_END_DATE',
  INVALID_REASON = 'INVALID_REASON',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_AFFECTED_SERVICES = 'INVALID_AFFECTED_SERVICES',
  INVALID_RECURRING_PATTERN = 'INVALID_RECURRING_PATTERN',
  INVALID_NOTIFICATION_MESSAGE = 'INVALID_NOTIFICATION_MESSAGE',
  INVALID_NOTIFICATION_CHANNELS = 'INVALID_NOTIFICATION_CHANNELS',
  START_DATE_REQUIRED = 'START_DATE_REQUIRED',
  END_DATE_REQUIRED = 'END_DATE_REQUIRED',
  REASON_REQUIRED = 'REASON_REQUIRED',
  TYPE_REQUIRED = 'TYPE_REQUIRED',
  BUSINESS_ID_REQUIRED = 'BUSINESS_ID_REQUIRED',
  CLOSURE_ID_REQUIRED = 'CLOSURE_ID_REQUIRED',
  START_DATE_PAST = 'START_DATE_PAST',
  END_DATE_BEFORE_START = 'END_DATE_BEFORE_START',
  REASON_TOO_SHORT = 'REASON_TOO_SHORT',
  REASON_TOO_LONG = 'REASON_TOO_LONG',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_SERVICE_ID = 'INVALID_SERVICE_ID',
  INVALID_RECURRING_PATTERN_FORMAT = 'INVALID_RECURRING_PATTERN_FORMAT',
  NOTIFICATION_MESSAGE_TOO_LONG = 'NOTIFICATION_MESSAGE_TOO_LONG',
  INVALID_NOTIFICATION_CHANNEL = 'INVALID_NOTIFICATION_CHANNEL',
  INVALID_BUSINESS_ID = 'INVALID_BUSINESS_ID',
  INVALID_CLOSURE_ID = 'INVALID_CLOSURE_ID',
  START_DATE_MALICIOUS = 'START_DATE_MALICIOUS',
  END_DATE_MALICIOUS = 'END_DATE_MALICIOUS',
  REASON_MALICIOUS = 'REASON_MALICIOUS',
  NOTIFICATION_MESSAGE_MALICIOUS = 'NOTIFICATION_MESSAGE_MALICIOUS',
  RECURRING_PATTERN_MALICIOUS = 'RECURRING_PATTERN_MALICIOUS'
}

export interface ClosureValidationError {
  type: ClosureValidationErrorType;
  message: string;
  field?: string;
  code?: string;
}

// Closure validation options
export interface ClosureValidationOptions {
  closure?: {
    startDate?: StringValidationOptions;
    endDate?: StringValidationOptions;
    reason?: StringValidationOptions;
    type?: {
      required?: boolean;
    };
    affectedServices?: ArrayValidationOptions;
    recurringPattern?: {
      required?: boolean;
    };
    notificationMessage?: StringValidationOptions;
    notificationChannels?: ArrayValidationOptions;
  };
  analytics?: {
    businessId?: StringValidationOptions;
    startDate?: StringValidationOptions;
    endDate?: StringValidationOptions;
    type?: {
      required?: boolean;
    };
  };
  reschedule?: {
    closureId?: StringValidationOptions;
    businessId?: StringValidationOptions;
    maxRescheduleDays?: NumberValidationOptions;
    preferredTimeSlots?: StringValidationOptions;
  };
}

// Closure validation configuration
export interface ClosureValidationConfig {
  closure: {
    startDate: {
      pattern: RegExp;
      required: boolean;
    };
    endDate: {
      pattern: RegExp;
    };
    reason: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
      required: boolean;
    };
    type: {
      required: boolean;
    };
    affectedServices: {
      maxLength: number;
      itemPattern: RegExp;
    };
    recurringPattern: {
      maxKeys: number;
      allowedKeys: RegExp;
    };
    notificationMessage: {
      maxLength: number;
      pattern: RegExp;
    };
    notificationChannels: {
      maxLength: number;
      allowedValues: string[];
    };
  };
  analytics: {
    businessId: {
      pattern: RegExp;
      required: boolean;
    };
    startDate: {
      pattern: RegExp;
    };
    endDate: {
      pattern: RegExp;
    };
    type: {
      required: boolean;
    };
  };
  reschedule: {
    closureId: {
      pattern: RegExp;
      required: boolean;
    };
    businessId: {
      pattern: RegExp;
      required: boolean;
    };
    maxRescheduleDays: {
      min: number;
      max: number;
    };
    preferredTimeSlots: {
      allowedValues: string[];
    };
  };
}

// Closure sanitization configuration
export interface ClosureSanitizationConfig {
  closure: {
    startDate: {
      allowedCharacters: RegExp;
    };
    endDate: {
      allowedCharacters: RegExp;
    };
    reason: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    affectedServices: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    recurringPattern: {
      allowedKeys: RegExp;
      maxKeys: number;
    };
    notificationMessage: {
      allowedTags: string[];
      allowedAttributes: string[];
      maxLength: number;
    };
    notificationChannels: {
      allowedValues: string[];
      maxLength: number;
    };
  };
  analytics: {
    businessId: {
      allowedCharacters: RegExp;
    };
    startDate: {
      allowedCharacters: RegExp;
    };
    endDate: {
      allowedCharacters: RegExp;
    };
  };
  reschedule: {
    closureId: {
      allowedCharacters: RegExp;
    };
    businessId: {
      allowedCharacters: RegExp;
    };
    maxRescheduleDays: {
      min: number;
      max: number;
    };
    preferredTimeSlots: {
      allowedValues: string[];
    };
  };
}

// Closure data object for sanitization
export interface ClosureDataObject {
  [key: string]: string | number | boolean | ClosureDataObject | ClosureDataObject[] | null | undefined;
}

// Sanitized closure data object
export interface SanitizedClosureDataObject {
  [key: string]: string | number | boolean | SanitizedClosureDataObject | SanitizedClosureDataObject[] | null | undefined;
}

// Sanitized closure data interfaces
export interface SanitizedClosureData {
  startDate: string;
  endDate?: string;
  reason: string;
  type: ClosureType;
  affectedServices?: string[];
  isRecurring?: boolean;
  recurringPattern?: Record<string, unknown>;
  notifyCustomers?: boolean;
  notificationMessage?: string;
  notificationChannels?: string[];
}

export interface SanitizedClosureUpdateData {
  startDate?: string;
  endDate?: string;
  reason?: string;
  type?: ClosureType;
  affectedServices?: string[];
  isRecurring?: boolean;
  recurringPattern?: Record<string, unknown>;
  notifyCustomers?: boolean;
  notificationMessage?: string;
  notificationChannels?: string[];
}

export interface SanitizedClosureAnalyticsData {
  businessId: string;
  startDate?: string;
  endDate?: string;
  type?: ClosureType;
  includeRecurring?: boolean;
}

export interface SanitizedRescheduleData {
  closureId: string;
  businessId: string;
  autoReschedule?: boolean;
  maxRescheduleDays?: number;
  preferredTimeSlots?: string;
  notifyCustomers?: boolean;
  allowWeekends?: boolean;
}
