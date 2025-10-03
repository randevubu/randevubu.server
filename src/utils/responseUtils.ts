/**
 * Response Utility Functions
 *
 * Standardized response handling for consistent API responses across all controllers.
 */

import { Response } from "express";
import { ErrorResponse, SuccessResponse } from "../types/responseTypes";

/**
 * Send a standardized success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void {
  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: any
): void {
  const response: ErrorResponse = {
    success: false,
    statusCode,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      key: "errors.system.internalError",
      details: message,
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a paginated success response
 */
export function sendPaginatedResponse<T>(
  res: Response,
  message: string,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200
): void {
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
    message,
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
 */
export function sendSuccessWithMeta<T>(
  res: Response,
  message: string,
  data: T,
  meta: Record<string, any>,
  statusCode: number = 200
): void {
  const response: SuccessResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
    meta,
  };
  res.status(statusCode).json(response);
}
