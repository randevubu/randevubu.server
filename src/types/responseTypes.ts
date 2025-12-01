/**
 * Error Response Types
 *
 * Standard types for consistent error handling across the application.
 */

import { ErrorCode, ErrorTranslationKey } from "../constants/errorCodes";

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
  params?: Record<string, unknown>;

  /** Additional error details for debugging */
  details?: any;

  /** Message for frontend display */
  message?: string;
}

/**
 * Standard API error response
 */
export interface ErrorResponse {
  success: false;
  statusCode: number;
  error: StandardError;
  message?: string; // Deprecated: for backward compatibility only
}

// =============================================================================
// SUCCESS RESPONSE TYPES
// =============================================================================

/**
 * Standard API success response
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  data?: T;
  message?: string;
  key?: string; // Translation key for frontend i18n (e.g., 'success.appointment.created')
  meta?: Record<string, unknown>;
}

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * App Error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'APP_ERROR', isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}