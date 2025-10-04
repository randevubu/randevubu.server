/**
 * Error Response Utilities
 * 
 * Provides standardized error response handling and error creation utilities
 */

import { Response } from "express";
import { ErrorContext } from "../types/errors";
import { 
  BaseError, 
  BusinessRuleViolationError, 
  InternalServerError,
  createSecureErrorResponse 
} from "../types/errors";

/**
 * Send a standardized app error response
 */
export function sendAppErrorResponse(
  res: Response,
  error: BaseError | Error,
  statusCode?: number
): void {
  if (error instanceof BaseError) {
    const response = createSecureErrorResponse(error);
    res.status(statusCode || error.statusCode).json(response);
  } else {
    const response = {
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
    res.status(statusCode || 500).json(response);
  }
}

/**
 * Create error context for logging
 */
export function createErrorContext(req: any, userId?: string): ErrorContext {
  return {
    userId,
    requestId: req.id,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date(),
  };
}

/**
 * Business error factory functions
 */
export const BusinessErrors = {
  notFound: (message: string = 'Business not found', context?: ErrorContext) => 
    new BusinessRuleViolationError('BUSINESS_NOT_FOUND', message, context),
  
  noAccess: (message: string = 'Insufficient permissions', context?: ErrorContext) => 
    new BusinessRuleViolationError('INSUFFICIENT_PERMISSIONS', message, context),
  
  alreadyExists: (message: string = 'Business already exists', context?: ErrorContext) => 
    new BusinessRuleViolationError('BUSINESS_ALREADY_EXISTS', message, context),
  
  limitExceeded: (message: string = 'Business limit exceeded', context?: ErrorContext) => 
    new BusinessRuleViolationError('BUSINESS_LIMIT_EXCEEDED', message, context),
};

/**
 * Validation error factory functions
 */
export const ValidationErrors = {
  general: (message: string = 'Validation error', context?: ErrorContext) => 
    new BusinessRuleViolationError('VALIDATION_ERROR', message, context),
  
  invalidInput: (message: string = 'Invalid input', context?: ErrorContext) => 
    new BusinessRuleViolationError('INVALID_INPUT', message, context),
  
  missingField: (message: string = 'Missing required field', context?: ErrorContext) => 
    new BusinessRuleViolationError('MISSING_REQUIRED_FIELD', message, context),
};

/**
 * Internal error factory
 */
export class InternalError extends InternalServerError {
  public readonly customCode: string;
  public readonly customDetails: any;

  constructor(
    code: string,
    details: any,
    context?: ErrorContext
  ) {
    super(`Internal error: ${code}`, undefined, context);
    this.customCode = code;
    this.customDetails = { ...details };
  }
}
