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
import { extractRequestDetails, logError } from "../Logger/loggerHelper";
import { sendErrorResponse } from "../responseUtils";
import { CustomError } from "./customError";
import zodErrorHandler from "./zodError";
import prismaErrorHandler from "./prismaError";



/**
 * Handle Zod validation errors using existing handler
 */
function handleZodError(
  error: ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  zodErrorHandler(error, req, res, () => {});
}

/**
 * Handle Prisma errors using existing handler
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response
): void {
  prismaErrorHandler(error, req, res, () => {});
}

/**
 * Handle custom errors
 */
function handleCustomError(
  error: CustomError,
  req: Request,
  res: Response
): void {
  logError(
    `Custom error: ${error.constructor.name}`,
    {
      requestId: (req as any).requestId || "unknown",
      userId: (req as any).user?.id || "anonymous",
      source: "ErrorHandler.handleCustomError",
      requestDetails: extractRequestDetails(req),
      },
    error,
    res
  );
  
  sendErrorResponse(res, error.message, error.statusCode || 500, error);
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
  
  logError(
    `Unexpected error: ${error instanceof Error ? error.constructor.name : 'Unknown'}`,
    {
      requestId: (req as any).requestId || "unknown",
      userId: (req as any).user?.id || "anonymous",
      source: "ErrorHandler.handleUnexpectedError",
      requestDetails: extractRequestDetails(req),
    },
    error,
    res
  );
  
  sendErrorResponse(res, "An unexpected error occurred", 500, { originalMessage: message });
}

/**
 * Main error handler for controllers
 *
 * This function can be used in two ways:
 * 1. With a string source: handleError(error, req, res, next, 'ControllerName.method')
 * 2. With a context object: handleError(error, req, res, next, { source: '...', ... })
 */
export function handleControllerError(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
  sourceOrContext: string | {
    source: string;
    requestId?: string;
    userId?: string;
    requestDetails?: any;
  }
): void {
  // Normalize the context parameter
  const context = typeof sourceOrContext === 'string' 
    ? {
        source: sourceOrContext,
        requestId: (req as any).requestId,
        userId: (req as any).user?.id,
        requestDetails: req.body || req.query || req.params,
      }
    : sourceOrContext;

  // Log the error using the existing logging utility
  logError(
    `Error in ${context.source}`,
    {
      requestId: context.requestId || (req as any).requestId || "unknown",
      userId: context.userId || (req as any).user?.id || "anonymous",
      source: context.source,
      requestDetails: context.requestDetails || {},
    },
    error,
    res,
    next
  );

  // Handle different error types
  if (error instanceof ZodError) {
    handleZodError(error, req, res, next);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, req, res);
  } else if (error instanceof CustomError) {
    handleCustomError(error, req, res);
  } else {
    handleUnexpectedError(error, req, res);
  }
}
