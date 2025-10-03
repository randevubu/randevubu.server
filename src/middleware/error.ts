import { NextFunction, Request, Response } from "express";
import { config } from "../config/environment";
import {
  BaseError,
  ErrorCode,
  ErrorContext,
  InternalServerError,
  createSecureErrorResponse,
} from "../types/errors";
import { logger } from "../utils/Logger/logger";

class RouteNotFoundError extends BaseError {
  constructor(url: string, context?: ErrorContext) {
    super(
      `Route ${url} not found`,
      404,
      ErrorCode.USER_NOT_FOUND,
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
    userAgent: req.get("user-agent"),
    requestId: Math.random().toString(36).substring(7),
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
    userAgent: req.get("user-agent"),
    requestId: Math.random().toString(36).substring(7),
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
    ...(config.NODE_ENV === "development" && { stack: err.stack }),
  };

  logger[logLevel](`[${logData.requestId}] ${error.message}`, logData);

  // Create secure response using utility function
  const response = createSecureErrorResponse(error);

  res.status(error.statusCode).json(response);
};
