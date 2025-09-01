/**
 * Error Response Types
 * 
 * Standard types for consistent error handling across the application.
 */

import { ErrorCode, ErrorTranslationKey } from '../constants/errorCodes';

// =============================================================================
// CORE ERROR TYPES
// =============================================================================

/**
 * Standard error object returned by the API
 */
export interface StandardError {
  /** Error code for programmatic handling */
  code: ErrorCode;
  
  /** Translation key for frontend i18n */
  key: ErrorTranslationKey;
  
  /** Parameters for dynamic translation (e.g., {businessName: "My Salon"}) */
  params?: Record<string, any>;
  
  /** Additional error details for debugging */
  details?: any;
  
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Standard API error response
 */
export interface ErrorResponse {
  success: false;
  error: StandardError;
  message?: string; // Deprecated: for backward compatibility only
}

/**
 * Validation error for form fields
 */
export interface ValidationFieldError {
  field: string;
  code: ErrorCode;
  key: ErrorTranslationKey;
  params?: Record<string, any>;
}

/**
 * Extended error for validation errors
 */
export interface ValidationError extends StandardError {
  code: 'VALIDATION_ERROR';
  fields?: ValidationFieldError[];
}

// =============================================================================
// SUCCESS RESPONSE TYPES
// =============================================================================

/**
 * Standard API success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// =============================================================================
// ERROR CONTEXT TYPES
// =============================================================================

/**
 * Context information for error creation
 */
export interface ErrorContext {
  requestId: string;
  userId?: string;
  businessId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
}

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Base class for application errors
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly key: ErrorTranslationKey;
  public readonly params?: Record<string, any>;
  public readonly context?: ErrorContext;
  public readonly statusCode: number;

  constructor(
    code: ErrorCode,
    params?: Record<string, any>,
    context?: ErrorContext,
    statusCode: number = 500
  ) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.key = getTranslationKey(code);
    this.params = params;
    this.context = context;
    this.statusCode = statusCode;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError);
  }

  /**
   * Convert to standard error object
   */
  toStandardError(): StandardError {
    return {
      code: this.code,
      key: this.key,
      params: this.params,
      details: this.context,
      requestId: this.context?.requestId
    };
  }

  /**
   * Convert to API error response
   */
  toErrorResponse(): ErrorResponse {
    return {
      success: false,
      error: this.toStandardError()
    };
  }
}

/**
 * Authentication/Authorization errors (401/403)
 */
export class AuthError extends AppError {
  constructor(
    code: Extract<ErrorCode, 'UNAUTHORIZED' | 'ACCESS_DENIED' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'INVALID_CREDENTIALS' | 'PHONE_NOT_REGISTERED' | 'INVALID_VERIFICATION_CODE' | 'VERIFICATION_CODE_EXPIRED'>,
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    const statusCode = code === 'UNAUTHORIZED' ? 401 : 403;
    super(code, params, context, statusCode);
    this.name = 'AuthError';
  }
}

/**
 * Business-related errors (403/404)
 */
export class BusinessError extends AppError {
  constructor(
    code: Extract<ErrorCode, 'BUSINESS_ACCESS_DENIED' | 'BUSINESS_NOT_FOUND' | 'BUSINESS_INACTIVE' | 'BUSINESS_CLOSED' | 'NO_BUSINESS_ACCESS' | 'BUSINESS_OWNER_REQUIRED' | 'BUSINESS_STAFF_REQUIRED'>,
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    const statusCode = code === 'BUSINESS_NOT_FOUND' ? 404 : 403;
    super(code, params, context, statusCode);
    this.name = 'BusinessError';
  }
}

/**
 * Appointment-related errors (400/404/409)
 */
export class AppointmentError extends AppError {
  constructor(
    code: Extract<ErrorCode, 'APPOINTMENT_NOT_FOUND' | 'APPOINTMENT_ACCESS_DENIED' | 'APPOINTMENT_TIME_CONFLICT' | 'APPOINTMENT_PAST_DATE' | 'APPOINTMENT_ALREADY_CONFIRMED' | 'APPOINTMENT_CANNOT_CANCEL'>,
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    let statusCode = 400;
    if (code === 'APPOINTMENT_NOT_FOUND') statusCode = 404;
    if (code === 'APPOINTMENT_ACCESS_DENIED') statusCode = 403;
    if (code === 'APPOINTMENT_TIME_CONFLICT') statusCode = 409;
    
    super(code, params, context, statusCode);
    this.name = 'AppointmentError';
  }
}

/**
 * Validation errors (400)
 */
export class ValidationAppError extends AppError {
  public readonly fields?: ValidationFieldError[];

  constructor(
    code: Extract<ErrorCode, 'VALIDATION_ERROR' | 'REQUIRED_FIELD_MISSING' | 'INVALID_EMAIL_FORMAT' | 'INVALID_PHONE_FORMAT' | 'INVALID_DATE_FORMAT'>,
    fields?: ValidationFieldError[],
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    super(code, params, context, 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }

  toStandardError(): ValidationError {
    return {
      ...super.toStandardError(),
      fields: this.fields
    } as ValidationError;
  }
}

/**
 * Not Found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(
    code: Extract<ErrorCode, 'BUSINESS_NOT_FOUND' | 'APPOINTMENT_NOT_FOUND' | 'SERVICE_NOT_FOUND' | 'CUSTOMER_NOT_FOUND' | 'STAFF_NOT_FOUND'>,
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    super(code, params, context, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends AppError {
  constructor(
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    super('RATE_LIMIT_EXCEEDED', params, context, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Internal server errors (500)
 */
export class InternalError extends AppError {
  constructor(
    code: Extract<ErrorCode, 'INTERNAL_SERVER_ERROR' | 'DATABASE_ERROR' | 'EXTERNAL_SERVICE_ERROR'> = 'INTERNAL_SERVER_ERROR',
    params?: Record<string, any>,
    context?: ErrorContext
  ) {
    super(code, params, context, 500);
    this.name = 'InternalError';
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

import { getTranslationKey } from '../constants/errorCodes';

/**
 * Create a standard error object
 */
export function createStandardError(
  code: ErrorCode,
  params?: Record<string, any>,
  context?: ErrorContext
): StandardError {
  return {
    code,
    key: getTranslationKey(code),
    params,
    details: context,
    requestId: context?.requestId
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: ErrorCode,
  params?: Record<string, any>,
  context?: ErrorContext
): ErrorResponse {
  return {
    success: false,
    error: createStandardError(code, params, context)
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  meta?: Record<string, any>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    meta
  };
}