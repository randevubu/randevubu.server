/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each request and attaches it to the request object.
 * This should be used early in the middleware chain to ensure all subsequent middleware
 * and error handlers have access to the same request ID.
 */

import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { runWithContext, RequestContext } from "../utils/asyncContext";
import { BusinessContextRequest } from "../types/request";

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
  const requestId = uuidv4();
  req.requestId = requestId;

  // Set the request ID in response headers for client tracking
  res.set("X-Request-ID", requestId);

  // Create context and run the rest of the request in that context
  const context: RequestContext = {
    requestId,
    userId: (req as BusinessContextRequest).user?.id,
    businessId: (req as BusinessContextRequest).businessContext?.primaryBusinessId || undefined
  };

  runWithContext(context, () => {
    next();
  });
};
