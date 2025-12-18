import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

import { config } from '../config/environment';
import {
  BaseError,
  ErrorCode,
  ErrorContext,
  InternalServerError,
  createSecureErrorResponse,
} from '../types/errors';
import {
  getTranslationKey,
  ErrorCode as ErrorCodeString,
  ErrorTranslationKey,
} from '../constants/errorCodes';
import { TranslationService } from '../services/core/translationService';
import { translateMessage } from '../utils/translationUtils';
import { AuthenticatedRequest } from '../types/request';
import { ErrorResponse, StandardError } from '../types/responseTypes';
import logger from '../utils/Logger/logger';
/**
 * Validate if language code is supported
 */
function isValidLanguage(
  lang: string | null | undefined,
  supportedLanguages: readonly string[]
): boolean {
  if (!lang || typeof lang !== 'string') {
    return false;
  }
  return supportedLanguages.includes(lang.toLowerCase());
}

class RouteNotFoundError extends BaseError {
  constructor(url: string, context?: ErrorContext) {
    super(`Route ${url} not found`, 404, ErrorCode.ROUTE_NOT_FOUND, true, context);
  }
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const context: ErrorContext = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId || randomUUID(),
    timestamp: new Date(),
    endpoint: req.path,
    method: req.method,
  };

  const error = new RouteNotFoundError(req.originalUrl, context);

  next(error);
};

export const errorHandler = async (
  err: Error | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const context: ErrorContext = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId || randomUUID(),
    timestamp: new Date(),
    endpoint: req.path,
    method: req.method,
  };

  let error: BaseError;

  // Handle known BaseError instances
  if (err instanceof BaseError) {
    error = err;
  } else {
    // Convert unknown errors to InternalServerError
    error = new InternalServerError(
      config.NODE_ENV === 'development' ? err.message : 'Internal server error',
      err,
      context
    );
  }

  // Log the error with appropriate level
  const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
  const logData = {
    requestId: error.context?.requestId || context.requestId,
    statusCode: error.statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as AuthenticatedRequest).user?.id,
    // Include error details only for operational errors in development
    ...(config.NODE_ENV === 'development' &&
      error.isOperational &&
      error.details && {
        details: error.details,
      }),
    // Always include stack trace for 500 errors in development
    ...(config.NODE_ENV === 'development' && error.statusCode >= 500 && { stack: err.stack }),
    // For production, only log minimal info about original error
    ...(config.NODE_ENV === 'production' &&
      error.statusCode >= 500 && {
        errorType: err.constructor.name,
      }),
  };

  logger[logLevel](`[${logData.requestId}] ${error.message}`, logData);

  // Get translation key for the error
  // error.code is ErrorCode enum, but getTranslationKey expects string from ERROR_CODES
  // Convert to string first
  const errorCodeString = String(error.code);
  let translationKey: ErrorTranslationKey;
  try {
    // Try to get translation key (may fail if error code doesn't exist in ERROR_CODES)
    // ErrorCode enum values should match ERROR_CODES keys
    translationKey = getTranslationKey(errorCodeString as ErrorCodeString);
  } catch {
    // Fallback to generic error key if translation key not found
    translationKey = 'errors.system.internalError' as ErrorTranslationKey;
  }
  // Get language from request (may have been set by language middleware)
  // Override with user preference if authenticated (user preference takes priority)
  let language = req.language || 'tr';
  const user = (req as AuthenticatedRequest).user;
  if (user?.language && isValidLanguage(user.language, ['tr', 'en'])) {
    language = user.language.toLowerCase();
  }

  // Create secure response using utility function
  const response = createSecureErrorResponse(error);

  // Convert error.details to TranslationParams format (filter safe fields only)
  // TranslationParams allows string | number | boolean | Date
  const translationParams: Record<string, string | number | boolean | Date> = {};
  if (error.details) {
    // Only include safe fields that can be used in translations
    if (error.details.field) translationParams.field = error.details.field;
    if (error.details.attemptCount !== undefined)
      translationParams.attemptCount = error.details.attemptCount;
    if (error.details.maxAttempts !== undefined)
      translationParams.maxAttempts = error.details.maxAttempts;
    if (error.details.retryAfter !== undefined)
      translationParams.retryAfter = error.details.retryAfter;
  }

  // Try to translate the message (non-blocking - falls back to original message)
  let translatedMessage = error.message;
  try {
    // Create translation service instance for error translation
    // TODO: Consider passing this via middleware initialization or service container
    const translationService = new TranslationService();

    translatedMessage = await translateMessage(
      translationService,
      translationKey,
      translationParams,
      language,
      req
    );
  } catch (translationError) {
    // If translation fails, keep original message
    // Don't log translation errors in production to avoid noise
    if (config.NODE_ENV === 'development') {
      logger.debug('Translation failed', { translationKey, language, error: translationError });
    }
  }

  // Enhance response with translation key and translated message
  const enhancedResponse: ErrorResponse = {
    success: false,
    statusCode: error.statusCode,
    error: {
      code: error.code,
      key: translationKey,
      message: translatedMessage,
      requestId: response.error.requestId,
      ...(response.error.details && { details: response.error.details }),
    },
  };

  // Send response with translated message (or original if translation failed)
  res.status(error.statusCode).json(enhancedResponse);
};
