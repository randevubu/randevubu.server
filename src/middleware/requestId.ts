/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each request and attaches it to the request object.
 * This should be used early in the middleware chain to ensure all subsequent middleware
 * and error handlers have access to the same request ID.
 */

import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

// Extend the Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware to generate and attach a unique request ID to each request
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate a unique request ID
  req.requestId = uuidv4();

  // Set the request ID in response headers for client tracking
  res.set("X-Request-ID", req.requestId);

  next();
};
