import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { CustomError } from "../errors/customError";
import Logger from "./logger";

interface RequestDetails {
  path: string;
  method: string;
  ip: string;
}

interface LogMeta {
  requestId: string;
  userId?: number | string;
  resourceId?: string | number;
  source: string;
  requestDetails: RequestDetails;
  extra?: Record<string, unknown>;
}

// Helper function to extract request details safely
export function extractRequestDetails(req: Request): RequestDetails {
  return {
    path: req.originalUrl || req.url || "unknown",
    method: req.method || "unknown",
    ip: req.ip || req.socket?.remoteAddress || "unknown",
  };
}

export function logSuccess(message: string, meta: LogMeta) {
  Logger.info(message, {
    requestId: meta.requestId,
    userId: meta.userId || "anonymous",
    ...(meta.resourceId && { resourceId: meta.resourceId }),
    requestDetails: meta.requestDetails,
    timestamp: new Date().toISOString(),
    source: meta.source,
    ...meta.extra,
  });
}

export function logError(
  message: string,
  meta: LogMeta,
  error: unknown,
  res?: Response,
  next?: NextFunction
) {
  const isExpectedError =
    error instanceof z.ZodError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof CustomError;

  const errorLog = {
    requestId: meta.requestId,
    userId: meta.userId || "anonymous",
    ...(meta.resourceId && { resourceId: meta.resourceId }),
    requestDetails: meta.requestDetails,
    timestamp: new Date().toISOString(),
    errorDetails: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : "UnknownError",
    },
    source: meta.source,
    ...meta.extra,
  };

  // Use appropriate log level based on error type
  const logLevel = isExpectedError ? "warn" : "error";
  Logger[logLevel](message, errorLog);

  if (isExpectedError && next) return next(error);

  if (res && !res.headersSent) {
    res.status(500).json({
      status: "error",
      message: "Unexpected server error",
      requestId: meta.requestId, // Include requestId for debugging
    });
  }
}

// Service-level logging functions
