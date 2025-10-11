/**
 * Response Utility Functions
 *
 * Standardized response handling for consistent API responses across all controllers.
 */

import { Response } from "express";
import { ErrorResponse, SuccessResponse } from "../types/responseTypes";
import { BaseError } from "../types/errors";

/**
 * Send a standardized success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void {
  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: any
): void {
  // Determine error code and key based on error type
  let errorCode = "INTERNAL_SERVER_ERROR";
  let errorKey = "errors.system.internalError";
  
  if (error?.name) {
    // Use the error class name as code
    errorCode = error.name;
    // Create a more specific key based on error name and status code
    errorKey = `errors.${error.name.toLowerCase()}.${statusCode}`;
  } else if (error?.code) {
    errorCode = error.code;
    errorKey = `errors.${error.code.toLowerCase()}`;
  }

  const response: ErrorResponse = {
    success: false,
    statusCode,
    error: {
      code: errorCode,
      key: errorKey,
      details: message,
      // Include additional data if available
      ...(error?.data && { data: error.data })
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a BaseError response with proper error handling
 */
export function sendBaseErrorResponse(res: Response, error: BaseError): void {
  const response: ErrorResponse = {
    success: false,
    statusCode: error.statusCode,
    error: {
      code: error.code as any, // Type assertion needed due to enum vs string type mismatch
      key: `errors.${error.code.toLowerCase()}` as any,
      details: error.details,
      message: error.message,
    },
  };
  res.status(error.statusCode).json(response);
}

/**
 * Send a paginated success response
 */
export function sendPaginatedResponse<T>(
  res: Response,
  message: string,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200
): void {
  const response: SuccessResponse<{
    items: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> = {
    success: true,
    statusCode,
    message,
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a success response with custom metadata
 */
export function sendSuccessWithMeta<T>(
  res: Response,
  message: string,
  data: T,
  meta: Record<string, any>,
  statusCode: number = 200
): void {
  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
    meta,
  };
  res.status(statusCode).json(response);
}

/**
 * Handle route errors with standardized error response
 */
export function handleRouteError(
  error: any,
  req: any,
  res: Response,
  next?: any
): void {
  console.error('Route error:', error);
  
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';
  
  const errorResponse: ErrorResponse = {
    success: false,
    statusCode,
    message,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      key: error.key || 'INTERNAL_ERROR',
      details: error.details || undefined,
    },
  };
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Create error context for logging
 */
export function createErrorContext(req: any, userId?: string): any {
  return {
    userId,
    requestId: req.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get error message from error object
 */
export function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Send simple error response
 */
export function sendSimpleErrorResponse(
  res: Response,
  message: string,
  statusCode: number = 400
): void {
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
}

/**
 * Send standard success response
 */
export function sendStandardSuccessResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void {
  sendSuccessResponse(res, message, data, statusCode);
}

/**
 * Send app error response
 */
export function sendAppErrorResponse(
  res: Response,
  error: any,
  statusCode: number = 500
): void {
  const message = getErrorMessage(error);
  sendErrorResponse(res, message, statusCode);
}

/**
 * Business error constants
 */
export const BusinessErrors = {
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  BUSINESS_ALREADY_EXISTS: 'BUSINESS_ALREADY_EXISTS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  BUSINESS_LIMIT_EXCEEDED: 'BUSINESS_LIMIT_EXCEEDED',
  notFound: 'BUSINESS_NOT_FOUND',
  noAccess: 'INSUFFICIENT_PERMISSIONS',
} as const;

/**
 * Validation error constants
 */
export const ValidationErrors = {
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  general: 'INVALID_INPUT',
} as const;