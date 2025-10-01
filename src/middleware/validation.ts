import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ErrorContext, ValidationError } from "../types/errors";
import { logger } from "../utils/Logger/logger";

export interface ValidationOptions {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}

export const validateRequest = (schemas: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const context: ErrorContext = {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        requestId: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method,
      };

      // Validate request body
      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error: unknown) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            throw new ValidationError(
              `Body validation failed: ${firstError.message}`,
              firstError.path.join("."),
              firstError.code,
              context
            );
          }
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      // Validate query parameters
      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error: unknown) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            throw new ValidationError(
              `Query validation failed: ${firstError.message}`,
              firstError.path.join("."),
              firstError.code,
              context
            );
          }
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      // Validate route parameters
      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error: unknown) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            throw new ValidationError(
              `Params validation failed: ${firstError.message}`,
              firstError.path.join("."),
              firstError.code,
              context
            );
          }
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      // Validate headers
      if (schemas.headers) {
        try {
          const headers = schemas.headers.parse(req.headers);
          // Update req.headers with validated/transformed values
          Object.assign(req.headers, headers);
        } catch (error: unknown) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            throw new ValidationError(
              `Headers validation failed: ${firstError.message}`,
              firstError.path.join("."),
              firstError.code,
              context
            );
          }
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      next();
    } catch (error) {
      logger.warn("Request validation failed", {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      next(error);
    }
  };
};

// Convenience functions for common validations
export const validateBody = (schema: z.ZodSchema) => {
  return validateRequest({ body: schema });
};

export const validateQuery = (schema: z.ZodSchema) => {
  return validateRequest({ query: schema });
};

export const validateParams = (schema: z.ZodSchema) => {
  return validateRequest({ params: schema });
};

export const validateHeaders = (schema: z.ZodSchema) => {
  return validateRequest({ headers: schema });
};

// Custom validation middleware for complex scenarios
export const validateCustom = <T>(
  validator: (req: Request) => T,
  errorMessage?: string
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = validator(req);
      (req as any).validated = result;
      next();
    } catch (error) {
      const context: ErrorContext = {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        requestId: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method,
      };

      throw new ValidationError(
        errorMessage ||
          (error instanceof Error ? error.message : String(error)) ||
          "Custom validation failed",
        undefined,
        undefined,
        context
      );
    }
  };
};

// Rate limiting validation
export const validateRateLimit = (
  identifier: (req: Request) => string,
  windowMs: number,
  maxRequests: number
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = identifier(req);
    const now = Date.now();
    const window = requests.get(key);

    if (!window || now > window.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (window.count >= maxRequests) {
      const resetIn = Math.ceil((window.resetTime - now) / 1000);

      const context: ErrorContext = {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        requestId: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method,
      };

      logger.warn("Rate limit exceeded", {
        key,
        count: window.count,
        resetIn,
        ip: req.ip,
        path: req.path,
      });

      res.status(429).json({
        success: false,
        error: {
          message: "Too many requests",
          retryAfter: resetIn,
        },
      });
      return;
    }

    window.count++;
    next();
  };
};
