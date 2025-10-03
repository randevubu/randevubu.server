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
  params?: Record<string, any>;

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
export interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  data?: T;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
