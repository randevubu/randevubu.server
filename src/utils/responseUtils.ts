import logger from './Logger/logger';
/**
 * Response Utility Functions
 *
 * Standardized response handling for consistent API responses across all controllers.
 */

import { Request, Response } from 'express';
import { ErrorResponse, SuccessResponse } from '../types/responseTypes';
import { TranslationService } from '../services/core/translationService';
import { translateMessage } from './translationUtils';
import { getLanguageFromRequest } from '../middleware/language';
import { getTranslationKey, ErrorCode } from '../constants/errorCodes';

// Reuse the existing translation service/util. The error helpers translate the
// same way `sendSuccessResponse` does (translateMessage + request language),
// instead of introducing a separate mechanism.
const errorTranslationService = new TranslationService();

/**
 * Localize an error message on the backend using its translation key, reusing
 * the existing `translateMessage` util and request language. Returns the
 * localized string when a translation exists; otherwise returns the original
 * (caller-provided) message so specific/ad-hoc messages are preserved.
 */
/**
 * Collect safe interpolation params for error translations from an error's
 * `params`/`details`. Only whitelisted, primitive fields are forwarded.
 */
function collectTranslationParams(error?: any): Record<string, string | number | boolean | Date> {
  const params: Record<string, string | number | boolean | Date> = {
    ...(error?.params || {}),
  };
  if (error?.details && typeof error.details === 'object') {
    const d = error.details as Record<string, unknown>;
    for (const field of ['field', 'attemptCount', 'maxAttempts', 'retryAfter']) {
      const value = d[field];
      if (value !== undefined && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date)) {
        params[field] = value;
      }
    }
  }
  return params;
}

async function localizeError(
  res: Response,
  errorKey: string,
  originalMessage: string,
  params: Record<string, string | number | boolean | Date> = {}
): Promise<string> {
  try {
    const req = res.req as Request | undefined;
    const language = req ? getLanguageFromRequest(req) : 'tr';
    const translated = await translateMessage(
      errorTranslationService,
      errorKey,
      params,
      language,
      req
    );
    // Skip when the key was not found (translate returns the key itself) or when
    // a required interpolation param was missing (leaves "{{...}}" placeholders).
    if (translated && translated !== errorKey && !translated.includes('{{')) {
      return translated;
    }
  } catch {
    // Fall through to the original message on any translation failure.
  }
  return originalMessage;
}

/**
 * Send a standardized success response
 * Automatically translates messages if they are translation keys (start with "success.")
 *
 * @param res - Express response object
 * @param message - Success message or translation key (e.g., "success.appointment.created")
 * @param data - Optional response data
 * @param statusCode - HTTP status code (default: 200)
 * @param req - Optional request object for language detection
 * @param params - Optional parameters for message translation (e.g., {count: 5})
 * @param translationService - Optional TranslationService instance for translation
 */
export async function sendSuccessResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  req?: Request,
  params?: Record<string, string | number | boolean | Date>,
  translationService?: TranslationService
): Promise<void> {
  // Check if message is a translation key (starts with "success.")
  const isTranslationKey = message.startsWith('success.');

  let translatedMessage = message;
  let translationKey: string | undefined = undefined;

  if (isTranslationKey && req && translationService) {
    translationKey = message;
    try {
      // Get language from request
      const language = getLanguageFromRequest(req);

      // Translate the message
      translatedMessage = await translateMessage(
        translationService,
        message,
        params || {},
        language,
        req
      );
    } catch (error) {
      // If translation fails, use the original message/key
      // Don't log in production to avoid noise
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Translation failed for success message', { message, error });
      }
    }
  }

  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message: translatedMessage,
    ...(translationKey && { key: translationKey }),
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a standardized error response
 */
export async function sendErrorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: any
): Promise<void> {
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorKey: string = 'errors.system.internalError';

  if (error?.code && typeof error.code === 'string') {
    errorCode = error.code;
    // Use the canonical ERROR_TRANSLATION_KEYS mapping when available
    const mappedKey = getTranslationKey(errorCode as ErrorCode);
    errorKey = mappedKey || `errors.${error.code.toLowerCase()}`;
  } else if (error?.name) {
    errorCode = error.name;
    errorKey = `errors.${error.name.toLowerCase()}.${statusCode}`;
  }

  // Backend-side localization (same approach as sendSuccessResponse): translate
  // the message into the request language using the resolved error key, so the
  // frontend can simply display error.message.
  const translationParams = collectTranslationParams(error);
  const localizedMessage = await localizeError(res, errorKey, message, translationParams);

  const response: ErrorResponse = {
    success: false,
    statusCode,
    message: localizedMessage,
    error: {
      code: errorCode as any,
      key: errorKey as any,
      message: localizedMessage,
      details: localizedMessage,
      ...(error?.params && { params: error.params }),
      ...(error?.data && { data: error.data }),
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a paginated success response
 * Automatically translates messages if they are translation keys (start with "success.")
 */
export async function sendPaginatedResponse<T>(
  res: Response,
  message: string,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200,
  req?: Request,
  params?: Record<string, string | number | boolean | Date>,
  translationService?: TranslationService
): Promise<void> {
  // Check if message is a translation key (starts with "success.")
  const isTranslationKey = message.startsWith('success.');

  let translatedMessage = message;
  let translationKey: string | undefined = undefined;

  if (isTranslationKey && req && translationService) {
    translationKey = message;
    try {
      const language = getLanguageFromRequest(req);
      translatedMessage = await translateMessage(
        translationService,
        message,
        params || {},
        language,
        req
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Translation failed for success message', { message, error });
      }
    }
  }

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
    message: translatedMessage,
    ...(translationKey && { key: translationKey }),
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
 * Automatically translates messages if they are translation keys (start with "success.")
 */
export async function sendSuccessWithMeta<T>(
  res: Response,
  message: string,
  data: T,
  meta: Record<string, unknown>,
  statusCode: number = 200,
  req?: Request,
  params?: Record<string, string | number | boolean | Date>,
  translationService?: TranslationService
): Promise<void> {
  // Check if message is a translation key (starts with "success.")
  const isTranslationKey = message.startsWith('success.');

  let translatedMessage = message;
  let translationKey: string | undefined = undefined;

  if (isTranslationKey && req && translationService) {
    translationKey = message;
    try {
      const language = getLanguageFromRequest(req);
      translatedMessage = await translateMessage(
        translationService,
        message,
        params || {},
        language,
        req
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Translation failed for success message', { message, error });
      }
    }
  }

  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message: translatedMessage,
    ...(translationKey && { key: translationKey }),
    data,
    meta,
  };
  res.status(statusCode).json(response);
}



