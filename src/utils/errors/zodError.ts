import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import logger from "../Logger/logger";
import { sendErrorResponse } from "../responseUtils";
import { AppError } from "../../types/responseTypes";

/**
 * Convert a ZodError into an AppError for the global error middleware.
 * Does NOT send a response — the middleware handles that.
 */
export function convertZodError(err: ZodError): AppError {
  const formattedErrors = err.issues.map((issue) => ({
    message: issue.message,
    path: issue.path,
    code: issue.code,
  }));

  return new AppError('VALIDATION_ERROR', {
    message: `Zod validation: ${formattedErrors.map(e => e.message).join(', ')}`,
    statusCode: 422,
    details: formattedErrors,
  });
}

// Legacy handler — kept for middleware error conversion
const zodErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      message: issue.message,
      path: issue.path,
      code: issue.code,
    }));

    logger.warn("Validation error", {
      requestId: (req as any).requestId || "unknown",
      details: formattedErrors,
    });

    void sendErrorResponse(res, "Geçersiz veri gönderildi.", 422, {
      code: "VALIDATION_ERROR",
    });
    return;
  }

  next(err);
};

export default zodErrorHandler;
