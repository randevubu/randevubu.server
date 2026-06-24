import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import { config } from '../config/environment';
import { BaseError, ErrorContext } from '../types/errors';
import { AppError, ErrorResponse } from '../types/responseTypes';
import { getCatalogEntry, CatalogEntry } from '../constants/errorCodes';
import { CustomError } from '../utils/errors/customError';
import { convertZodError } from '../utils/errors/zodError';
import { convertPrismaError } from '../utils/errors/prismaError';
import { TranslationService } from '../services/core/translationService';
import { translateMessage } from '../utils/translationUtils';
import { getLanguageFromRequest } from '../middleware/language';
import { AuthenticatedRequest } from '../types/request';
import logger from '../utils/Logger/logger';

const FALLBACK_MESSAGES: Record<string, string> = {
  tr: 'Bir hata oluştu, lütfen tekrar deneyin.',
  en: 'An error occurred, please try again.',
};

const translationService = new TranslationService();

class RouteNotFoundError extends AppError {
  constructor(url: string) {
    super('ROUTE_NOT_FOUND', { message: `Route ${url} not found` });
  }
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new RouteNotFoundError(req.originalUrl));
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    return convertZodError(err);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return convertPrismaError(err);
  }

  // Legacy BaseError family — preserved until all throw sites migrate
  if (err instanceof BaseError) {
    return new AppError(String(err.code), {
      message: err.message,
      statusCode: err.statusCode,
      params: err.details ? {
        ...(err.details.field != null && { field: err.details.field }),
        ...(err.details.attemptCount != null && { attemptCount: err.details.attemptCount }),
        ...(err.details.maxAttempts != null && { maxAttempts: err.details.maxAttempts }),
        ...(err.details.retryAfter != null && { retryAfter: err.details.retryAfter }),
        ...(err.details.cooldownSeconds != null && { cooldownSeconds: err.details.cooldownSeconds }),
      } : undefined,
      details: {
        originalClass: err.constructor.name,
        context: err.context,
      },
      isOperational: err.isOperational,
    });
  }

  // Legacy CustomError family
  if (err instanceof CustomError) {
    return new AppError(err.name, {
      message: err.message,
      statusCode: err.statusCode,
    });
  }

  // Unknown / plain Error
  const message = err instanceof Error ? err.message : String(err);
  return new AppError('INTERNAL_SERVER_ERROR', {
    message: config.NODE_ENV === 'development' ? message : 'Internal server error',
    details: {
      originalClass: err instanceof Error ? err.constructor.name : 'unknown',
    },
    isOperational: false,
  });
}

export const errorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const requestId = req.requestId || randomUUID();
  const appError = toAppError(err);
  const entry: CatalogEntry | undefined = getCatalogEntry(appError.code);
  const translationKey = entry?.key ?? 'errors.system.internalError';
  const logSeverity = appError.severity === 'error' ? 'error' : 'warn';

  // ── Log ──────────────────────────────────────────────────────────────────
  const logPayload: Record<string, unknown> = {
    requestId,
    statusCode: appError.statusCode,
    code: appError.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as AuthenticatedRequest).user?.id,
  };

  if (config.NODE_ENV === 'development') {
    logPayload.internalMessage = appError.message;
    if (appError.details) logPayload.details = appError.details;
    if (appError.statusCode >= 500) logPayload.stack = err.stack;
  } else if (appError.statusCode >= 500) {
    logPayload.errorType = err.constructor.name;
  }

  logger[logSeverity](`[${requestId}] ${appError.message}`, logPayload);

  // ── Translate ────────────────────────────────────────────────────────────
  let language = getLanguageFromRequest(req);
  const user = (req as AuthenticatedRequest).user;
  if (user?.language && ['tr', 'en'].includes(user.language.toLowerCase())) {
    language = user.language.toLowerCase();
  }

  const translationParams: Record<string, string | number | boolean | Date> = {};
  if (appError.params) {
    for (const [k, v] of Object.entries(appError.params)) {
      if (v !== undefined && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof Date)) {
        translationParams[k] = v;
      }
    }
  }

  let userMessage: string;
  try {
    const translated = await translateMessage(
      translationService,
      translationKey,
      translationParams,
      language,
      req
    );
    if (translated && translated !== translationKey && !translated.includes('{{')) {
      userMessage = translated;
    } else {
      userMessage = FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.tr;
    }
  } catch {
    userMessage = FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.tr;
  }

  // ── Build whitelisted params for client ──────────────────────────────────
  const ALLOWED_PARAMS = ['field', 'retryAfter', 'cooldownSeconds', 'attemptCount', 'maxAttempts'];
  let clientParams: Record<string, unknown> | undefined;
  if (appError.params) {
    const filtered: Record<string, unknown> = {};
    for (const key of ALLOWED_PARAMS) {
      if (appError.params[key] !== undefined) {
        filtered[key] = appError.params[key];
      }
    }
    if (Object.keys(filtered).length > 0) {
      clientParams = filtered;
    }
  }

  // ── Respond ──────────────────────────────────────────────────────────────
  const response: ErrorResponse = {
    success: false,
    statusCode: appError.statusCode,
    error: {
      code: appError.code as any,
      key: translationKey as any,
      message: userMessage,
      requestId,
      ...(clientParams && { params: clientParams }),
    },
  };

  res.status(appError.statusCode).json(response);
};
