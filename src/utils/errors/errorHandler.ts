/**
 * Comprehensive Error Handling Utility
 *
 * This utility provides standardized error handling for controllers,
 * using the existing error codes, response types, and logging utilities.
 */

import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  ERROR_CODES,
  ERROR_TRANSLATION_KEYS,
} from "../../constants/errorCodes";
import { ErrorResponse } from "../../types/responseTypes";
import { logError } from "../Logger/loggerHelper";
import { CustomError } from "./customError";

/**
 * Map Prisma error codes to application error codes
 */
const PRISMA_ERROR_MAPPING: Record<
  string,
  { code: string; statusCode: number }
> = {
  P1000: { code: ERROR_CODES.UNAUTHORIZED, statusCode: 401 },
  P1001: { code: ERROR_CODES.SERVICE_UNAVAILABLE, statusCode: 500 },
  P1002: { code: ERROR_CODES.SERVICE_UNAVAILABLE, statusCode: 408 },
  P2002: { code: ERROR_CODES.VALIDATION_ERROR, statusCode: 400 },
  P2003: { code: ERROR_CODES.VALIDATION_ERROR, statusCode: 400 },
  P2004: { code: ERROR_CODES.APPOINTMENT_NOT_FOUND, statusCode: 404 },
  P2021: { code: ERROR_CODES.DATABASE_ERROR, statusCode: 404 },
  P3000: { code: ERROR_CODES.DATABASE_ERROR, statusCode: 500 },
  P3002: { code: ERROR_CODES.DATABASE_ERROR, statusCode: 500 },
};

/**
 * Map CustomError types to application error codes
 */
const CUSTOM_ERROR_MAPPING: Record<
  string,
  { code: string; statusCode: number }
> = {
  UnauthorizedError: { code: ERROR_CODES.UNAUTHORIZED, statusCode: 401 },
  ValidationError: { code: ERROR_CODES.VALIDATION_ERROR, statusCode: 400 },
  UserNotFoundError: { code: ERROR_CODES.UNAUTHORIZED, statusCode: 404 },
  InvalidPasswordError: {
    code: ERROR_CODES.INVALID_CREDENTIALS,
    statusCode: 400,
  },
  AuthorizationError: { code: ERROR_CODES.ACCESS_DENIED, statusCode: 403 },
  DatabaseError: { code: ERROR_CODES.DATABASE_ERROR, statusCode: 500 },
  BusinessNotFoundError: {
    code: ERROR_CODES.BUSINESS_NOT_FOUND,
    statusCode: 404,
  },
  AppointmentNotFoundError: {
    code: ERROR_CODES.APPOINTMENT_NOT_FOUND,
    statusCode: 404,
  },
  ServiceNotFoundError: {
    code: ERROR_CODES.SERVICE_NOT_FOUND,
    statusCode: 404,
  },
  CustomerNotFoundError: {
    code: ERROR_CODES.CUSTOMER_NOT_FOUND,
    statusCode: 404,
  },
  StaffNotFoundError: { code: ERROR_CODES.STAFF_NOT_FOUND, statusCode: 404 },
};

/**
 * Create a standardized error response
 */
function createErrorResponse(
  errorCode: string,
  statusCode: number,
  message: string,
  details?: any,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    statusCode,
    error: {
      code: errorCode,
      key:
        ERROR_TRANSLATION_KEYS[
          errorCode as keyof typeof ERROR_TRANSLATION_KEYS
        ] || "errors.system.internalError",
      details: message,
      message: message,
      ...(details && { params: details }),
    },
    ...(requestId && { requestId }),
  };
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError, req: Request, res: Response): void {
  const formattedErrors = error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path,
    code: issue.code,
  }));

  const response = createErrorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    422,
    "Validation Error",
    { validationErrors: formattedErrors },
    (req as any).requestId
  );

  res.status(422).json(response);
}

/**
 * Handle Prisma errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response
): void {
  const mapping = PRISMA_ERROR_MAPPING[error.code] || {
    code: ERROR_CODES.DATABASE_ERROR,
    statusCode: 500,
  };

  const response = createErrorResponse(
    mapping.code,
    mapping.statusCode,
    error.message,
    { prismaCode: error.code },
    (req as any).requestId
  );

  res.status(mapping.statusCode).json(response);
}

/**
 * Handle custom errors
 */
function handleCustomError(
  error: CustomError,
  req: Request,
  res: Response
): void {
  const mapping = CUSTOM_ERROR_MAPPING[error.constructor.name] || {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: error.statusCode || 500,
  };

  const response = createErrorResponse(
    mapping.code,
    mapping.statusCode,
    error.message,
    error.data,
    (req as any).requestId
  );

  res.status(mapping.statusCode).json(response);
}

/**
 * Handle unexpected errors
 */
function handleUnexpectedError(
  error: unknown,
  req: Request,
  res: Response
): void {
  const message = error instanceof Error ? error.message : String(error);

  const response = createErrorResponse(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    500,
    "An unexpected error occurred",
    { originalMessage: message },
    (req as any).requestId
  );

  res.status(500).json(response);
}

/**
 * Main error handler for controllers
 *
 * This function should be used in controller catch blocks to handle
 * all types of errors in a standardized way.
 */
export function handleControllerError(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
  context: {
    source: string;
    requestId?: string;
    userId?: string;
    requestDetails?: any;
  }
): void {
  // Log the error using the existing logging utility
  logError(
    `Error in ${context.source}`,
    {
      requestId: context.requestId || (req as any).requestId || "unknown",
      userId: context.userId || req.user?.id || "anonymous",
      source: context.source,
      requestDetails: context.requestDetails || {},
    },
    error,
    res,
    next
  );

  // Handle different error types
  if (error instanceof ZodError) {
    handleZodError(error, req, res);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, req, res);
  } else if (error instanceof CustomError) {
    handleCustomError(error, req, res);
  } else {
    handleUnexpectedError(error, req, res);
  }
}

/**
 * Simplified error handler for common controller patterns
 *
 * This is a more convenient version that extracts common context automatically.
 */
export function handleError(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
  source: string
): void {
  handleControllerError(error, req, res, next, {
    source,
    requestId: (req as any).requestId,
    userId: req.user?.id,
    requestDetails: req.body || req.query || req.params,
  });
}
