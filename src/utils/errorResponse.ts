/**
 * Error Response Utilities
 * 
 * Easy-to-use functions for creating standardized error responses.
 * Use these functions throughout your controllers and middleware.
 */

import { Request, Response } from 'express';
import { 
  ErrorCode, 
  ERROR_CODES, 
  getTranslationKey 
} from '../constants/errorCodes';
import { 
  StandardError, 
  ErrorResponse, 
  SuccessResponse, 
  ErrorContext,
  AppError,
  AuthError,
  BusinessError,
  AppointmentError,
  ValidationAppError,
  NotFoundError,
  RateLimitError,
  InternalError
} from '../types/errorResponse';
import { logger } from '../utils/logger';

// =============================================================================
// ERROR CREATION UTILITIES
// =============================================================================

/**
 * Create error context from Express request
 */
export function createErrorContext(req: Request, userId?: string): ErrorContext {
  return {
    requestId: Math.random().toString(36).substr(2, 9), // Simple request ID
    userId,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    endpoint: req.path,
    method: req.method
  };
}

/**
 * Extract standardized error message from unknown error
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

/**
 * Create standardized error response for simple cases
 */
export function sendSimpleErrorResponse(res: Response, statusCode: number, message: string): void {
  res.status(statusCode).json({
    success: false,
    error: message
  });
}

/**
 * Create standardized success response for simple cases
 */
export function sendStandardSuccessResponse(res: Response, data: any, message?: string, statusCode: number = 200): void {
  const response: any = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  res.status(statusCode).json(response);
}

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

// =============================================================================
// EXPRESS RESPONSE HELPERS
// =============================================================================

/**
 * Send an error response
 */
export function sendErrorResponse(
  res: Response,
  code: ErrorCode,
  params?: Record<string, any>,
  context?: ErrorContext,
  statusCode?: number
): void {
  // Determine status code if not provided
  if (!statusCode) {
    statusCode = getStatusCodeForErrorCode(code);
  }

  const errorResponse = createErrorResponse(code, params, context);
  
  // Log error for debugging
  logger.error('API Error Response', {
    code,
    params,
    context,
    statusCode
  });

  res.status(statusCode).json(errorResponse);
}

/**
 * Send a success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  data?: T,
  message?: string,
  meta?: Record<string, any>,
  statusCode: number = 200
): void {
  const successResponse = createSuccessResponse(data, message, meta);
  res.status(statusCode).json(successResponse);
}

/**
 * Send an error response from an AppError
 */
export function sendAppErrorResponse(res: Response, error: AppError): void {
  logger.error('AppError Response', {
    code: error.code,
    params: error.params,
    context: error.context,
    statusCode: error.statusCode,
    stack: error.stack
  });

  res.status(error.statusCode).json(error.toErrorResponse());
}

// =============================================================================
// QUICK ERROR CREATORS
// =============================================================================

/**
 * Authentication error shortcuts
 */
export const AuthErrors = {
  unauthorized: (context?: ErrorContext) => 
    new AuthError('UNAUTHORIZED', undefined, context),
  
  invalidToken: (context?: ErrorContext) => 
    new AuthError('INVALID_TOKEN', undefined, context),
  
  accessDenied: (context?: ErrorContext, params?: Record<string, any>) => 
    new AuthError('ACCESS_DENIED', params, context),
  
  invalidCredentials: (context?: ErrorContext) => 
    new AuthError('INVALID_CREDENTIALS', undefined, context),
  
  phoneNotRegistered: (phoneNumber?: string, context?: ErrorContext) => 
    new AuthError('PHONE_NOT_REGISTERED', { phoneNumber }, context),
  
  invalidVerificationCode: (context?: ErrorContext) => 
    new AuthError('INVALID_VERIFICATION_CODE', undefined, context),
  
  verificationCodeExpired: (context?: ErrorContext) => 
    new AuthError('VERIFICATION_CODE_EXPIRED', undefined, context)
};

/**
 * Business error shortcuts
 */
export const BusinessErrors = {
  accessDenied: (businessId?: string, context?: ErrorContext) => 
    new BusinessError('BUSINESS_ACCESS_DENIED', { businessId }, context),
  
  notFound: (businessId?: string, context?: ErrorContext) => 
    new BusinessError('BUSINESS_NOT_FOUND', { businessId }, context),
  
  inactive: (businessId?: string, context?: ErrorContext) => 
    new BusinessError('BUSINESS_INACTIVE', { businessId }, context),
  
  closed: (businessName?: string, context?: ErrorContext) => 
    new BusinessError('BUSINESS_CLOSED', { businessName }, context),
  
  noAccess: (context?: ErrorContext) => 
    new BusinessError('NO_BUSINESS_ACCESS', undefined, context),
  
  ownerRequired: (context?: ErrorContext) => 
    new BusinessError('BUSINESS_OWNER_REQUIRED', undefined, context),
  
  staffRequired: (context?: ErrorContext) => 
    new BusinessError('BUSINESS_STAFF_REQUIRED', undefined, context)
};

/**
 * Appointment error shortcuts
 */
export const AppointmentErrors = {
  notFound: (appointmentId?: string, context?: ErrorContext) => 
    new AppointmentError('APPOINTMENT_NOT_FOUND', { appointmentId }, context),
  
  accessDenied: (appointmentId?: string, context?: ErrorContext) => 
    new AppointmentError('APPOINTMENT_ACCESS_DENIED', { appointmentId }, context),
  
  timeConflict: (date?: string, time?: string, context?: ErrorContext) => 
    new AppointmentError('APPOINTMENT_TIME_CONFLICT', { date, time }, context),
  
  pastDate: (date?: string, context?: ErrorContext) => 
    new AppointmentError('APPOINTMENT_PAST_DATE', { date }, context),
  
  alreadyConfirmed: (appointmentId?: string, context?: ErrorContext) => 
    new AppointmentError('APPOINTMENT_ALREADY_CONFIRMED', { appointmentId }, context),
  
  cannotCancel: (reason?: string, context?: ErrorContext) => 
    new AppointmentError('APPOINTMENT_CANNOT_CANCEL', { reason }, context)
};

/**
 * Validation error shortcuts
 */
export const ValidationErrors = {
  general: (message?: string, context?: ErrorContext) => 
    new ValidationAppError('VALIDATION_ERROR', undefined, { message }, context),
  
  requiredField: (fieldName: string, context?: ErrorContext) => 
    new ValidationAppError('REQUIRED_FIELD_MISSING', undefined, { fieldName }, context),
  
  invalidEmail: (email?: string, context?: ErrorContext) => 
    new ValidationAppError('INVALID_EMAIL_FORMAT', undefined, { email }, context),
  
  invalidPhone: (phoneNumber?: string, context?: ErrorContext) => 
    new ValidationAppError('INVALID_PHONE_FORMAT', undefined, { phoneNumber }, context),
  
  invalidDate: (date?: string, context?: ErrorContext) => 
    new ValidationAppError('INVALID_DATE_FORMAT', undefined, { date }, context)
};

/**
 * Not found error shortcuts
 */
export const NotFoundErrors = {
  business: (businessId?: string, context?: ErrorContext) => 
    new NotFoundError('BUSINESS_NOT_FOUND', { businessId }, context),
  
  appointment: (appointmentId?: string, context?: ErrorContext) => 
    new NotFoundError('APPOINTMENT_NOT_FOUND', { appointmentId }, context),
  
  service: (serviceId?: string, context?: ErrorContext) => 
    new NotFoundError('SERVICE_NOT_FOUND', { serviceId }, context),
  
  customer: (customerId?: string, context?: ErrorContext) => 
    new NotFoundError('CUSTOMER_NOT_FOUND', { customerId }, context),
  
  staff: (staffId?: string, context?: ErrorContext) => 
    new NotFoundError('STAFF_NOT_FOUND', { staffId }, context)
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get appropriate HTTP status code for an error code
 */
function getStatusCodeForErrorCode(code: ErrorCode): number {
  // Authentication errors (401)
  if (['UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'INVALID_CREDENTIALS'].includes(code)) {
    return 401;
  }
  
  // Authorization/Access errors (403)
  if (code.includes('ACCESS_DENIED') || code.includes('PERMISSION') || code.includes('FORBIDDEN')) {
    return 403;
  }
  
  // Not found errors (404)
  if (code.includes('NOT_FOUND')) {
    return 404;
  }
  
  // Conflict errors (409)
  if (code.includes('CONFLICT') || code.includes('ALREADY_EXISTS')) {
    return 409;
  }
  
  // Rate limiting (429)
  if (code.includes('RATE_LIMIT')) {
    return 429;
  }
  
  // Server errors (500)
  if (code.includes('INTERNAL') || code.includes('DATABASE') || code.includes('EXTERNAL_SERVICE')) {
    return 500;
  }
  
  // Default to 400 for validation and other client errors
  return 400;
}

/**
 * Handle Express route errors consistently
 */
export function handleRouteError(error: unknown, req: Request, res: Response): void {
  const context = createErrorContext(req, (req as any).user?.id);
  
  // If it's already an AppError, send it directly
  if (error instanceof AppError) {
    // Create a new error with merged context since context is readonly
    const mergedContext = { ...error.context, ...context };
    const newError = new (error.constructor as any)(
      error.code,
      error.params,
      mergedContext
    );
    sendAppErrorResponse(res, newError);
    return;
  }
  
  // Log unexpected errors
  logger.error('Unexpected route error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context
  });
  
  // Send generic internal server error
  const internalError = new InternalError('INTERNAL_SERVER_ERROR', undefined, context);
  sendAppErrorResponse(res, internalError);
}

// =============================================================================
// EXPRESS MIDDLEWARE HELPERS
// =============================================================================

/**
 * Async route wrapper to handle errors automatically
 */
export function asyncHandler(fn: (req: Request, res: Response, next: Function) => Promise<any>) {
  return (req: Request, res: Response, next: Function) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      handleRouteError(error, req, res);
    });
  };
}

/**
 * Create middleware to require business access
 */
export function requireBusinessAccess(
  businessIdParam: string = 'businessId'
) {
  return (req: any, res: Response, next: Function) => {
    const context = createErrorContext(req, req.user?.id);
    
    // Check if user has business context
    if (!req.businessContext || req.businessContext.businessIds.length === 0) {
      const error = BusinessErrors.noAccess(context);
      return sendAppErrorResponse(res, error);
    }
    
    // If specific business ID is requested, validate access
    const requestedBusinessId = req.params[businessIdParam];
    if (requestedBusinessId && !req.businessContext.businessIds.includes(requestedBusinessId)) {
      const error = BusinessErrors.accessDenied(requestedBusinessId, context);
      return sendAppErrorResponse(res, error);
    }
    
    next();
  };
}