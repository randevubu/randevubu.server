import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../utils/Logger/logger';
import { config } from '../config/environment';
import {
  BaseError,
  ErrorCode,
  ErrorContext,
  InternalServerError,
  createSecureErrorResponse,
} from "../types/errors";

class RouteNotFoundError extends BaseError {
  constructor(url: string, context?: ErrorContext) {
    super(
      `Route ${url} not found`,
      404,
      ErrorCode.ROUTE_NOT_FOUND,
      true,
      context
    );
  }
}

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

export const errorHandler = (
  err: Error | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
      config.NODE_ENV === "development" ? err.message : "Internal server error",
      err,
      context
    );
  }

  // Log the error with appropriate level
  const logLevel = error.statusCode >= 500 ? "error" : "warn";
  const logData = {
    requestId: error.context?.requestId || context.requestId,
    statusCode: error.statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: (req as any).user?.id,
    // Include error details only for operational errors in development
    ...(config.NODE_ENV === 'development' && error.isOperational && error.details && {
      details: error.details,
    }),
    // Always include stack trace for 500 errors in development
    ...(config.NODE_ENV === 'development' && error.statusCode >= 500 && { stack: err.stack }),
    // For production, only log minimal info about original error
    ...(config.NODE_ENV === 'production' && error.statusCode >= 500 && {
      errorType: err.constructor.name,
    }),
  };

  logger[logLevel](`[${logData.requestId}] ${error.message}`, logData);

  // Create secure response using utility function
  const response = createSecureErrorResponse(error);

  res.status(error.statusCode).json(response);
};
