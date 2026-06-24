import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import logger from "../Logger/logger";
import { sendErrorResponse } from "../responseUtils";
import { AppError } from "../../types/responseTypes";

function prismaCodeToStatus(code: string): number {
  switch (code) {
    case "P1000":        return 401;
    case "P1001":
    case "P1002":        return 503;
    case "P2002":        return 409;
    case "P2003":        return 422;
    case "P2004":
    case "P2025":
    case "P2021":        return 404;
    case "P3000":
    case "P3002":        return 500;
    default:             return 500;
  }
}

/**
 * Convert a Prisma error into an AppError for the global error middleware.
 * Does NOT send a response — the middleware handles that.
 */
export function convertPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  const statusCode = prismaCodeToStatus(err.code);

  return new AppError('DATABASE_ERROR', {
    message: `Prisma ${err.code}: ${err.message}`,
    statusCode,
    details: { prismaCode: err.code, meta: err.meta },
  });
}

// Legacy handler — kept for middleware error conversion
const prismaErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const statusCode = prismaCodeToStatus(err.code);

    logger.error("Prisma known request error", {
      requestId: (req as any).requestId || "unknown",
      prismaCode: err.code,
    });

    void sendErrorResponse(res, "Bir hata oluştu, lütfen tekrar deneyin.", statusCode, {
      code: "DATABASE_ERROR",
    });
    return;
  }

  next(err);
};

export default prismaErrorHandler;
