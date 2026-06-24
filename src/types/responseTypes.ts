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

  /** Request ID for tracing */
  requestId?: string;
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
 * App Error — the single error class for the application.
 *
 * New-style (preferred):
 *   throw new AppError('APPOINTMENT_TIME_CONFLICT');
 *   throw new AppError('VALIDATION_ERROR', { message: 'email is required', params: { field: 'email' } });
 *
 * Legacy-style (still supported until all callers migrate):
 *   throw new AppError('some message', 400, 'VALIDATION_ERROR', true, { field: 'email' });
 *
 * `code` is looked up in ERROR_CATALOG for status, i18n key, and log severity.
 * `message` is internal / log-only — never sent to the client.
 * `params` are interpolated into the translated i18n message.
 * `details` are log-only extra data — never sent to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly params?: Record<string, unknown>;
  public readonly details?: unknown;
  public readonly severity: 'warn' | 'error';

  constructor(
    codeOrMessage: string,
    optionsOrStatusCode?: number | {
      message?: string;
      statusCode?: number;
      params?: Record<string, unknown>;
      details?: unknown;
      isOperational?: boolean;
    },
    legacyCode?: string,
    legacyIsOperational?: boolean,
    legacyParams?: Record<string, unknown>
  ) {
    // Lazy import to avoid circular dependency
    const { getCatalogEntry } = require('../constants/errorCodes');

    // Detect legacy signature: second arg is a number
    if (typeof optionsOrStatusCode === 'number') {
      const code = legacyCode || 'APP_ERROR';
      const entry = getCatalogEntry(code);
      super(codeOrMessage);
      this.code = code;
      this.statusCode = optionsOrStatusCode;
      this.isOperational = legacyIsOperational ?? true;
      this.params = legacyParams;
      this.details = undefined;
      this.severity = entry?.severity ?? 'error';
    } else {
      // New signature: first arg is the error code
      const options = optionsOrStatusCode;
      const entry = getCatalogEntry(codeOrMessage);
      const resolvedStatus = options?.statusCode ?? entry?.status ?? 500;
      const internalMessage = options?.message ?? codeOrMessage;

      super(internalMessage);
      this.code = codeOrMessage;
      this.statusCode = resolvedStatus;
      this.isOperational = options?.isOperational ?? true;
      this.params = options?.params;
      this.details = options?.details;
      this.severity = entry?.severity ?? 'error';
    }

    Error.captureStackTrace(this, this.constructor);
  }
}