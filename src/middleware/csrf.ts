import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { ErrorContext, ForbiddenError } from "../types/errors";
import logger from "../utils/Logger/logger";
export interface CSRFOptions {
  cookieName?: string;
  headerName?: string;
  secretLength?: number;
  maxAge?: number;
}

export class CSRFMiddleware {
  private options: Required<CSRFOptions>;

  constructor(options: CSRFOptions = {}) {
    this.options = {
      cookieName: options.cookieName || 'csrf-token',
      headerName: options.headerName || 'x-csrf-token',
      secretLength: options.secretLength || 32,
      maxAge: options.maxAge || 3600000, // 1 hour
    };
  }

  private createErrorContext(req: Request, userId?: string): ErrorContext {
    return {
      userId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      requestId: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
    };
  }

  private generateToken(): string {
    return crypto.randomBytes(this.options.secretLength).toString('hex');
  }

  private hashToken(token: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  // Middleware to generate and set CSRF token
  generateTokenMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Only generate token for GET requests or when no token exists
      if (req.method === 'GET' || !req.cookies[this.options.cookieName]) {
        const token = this.generateToken();
        const secret = this.generateToken();
        
        const isSecureProduction = process.env.NODE_ENV === 'production' && req.secure;
        
        // Store secret in cookie (httpOnly, secure in production)
        // CRITICAL: Must specify path and domain to match clearCookie on logout
        res.cookie(this.options.cookieName, secret, {
          httpOnly: true,
          secure: isSecureProduction,
          sameSite: isSecureProduction ? 'none' : 'lax',
          maxAge: this.options.maxAge,
          path: '/',  // CRITICAL: Must match logout
          domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || undefined) : 'localhost'
        });

        // Send token in response header for client to use
        res.setHeader('X-CSRF-Token', token);
      }
      
      next();
    } catch (error) {
      logger.error("CSRF token generation failed", {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
        endpoint: req.path,
      });
      next(error);
    }
  };

  // Middleware to verify CSRF token for state-changing operations
  verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const context = this.createErrorContext(req);

      // Skip CSRF check for GET, HEAD, OPTIONS requests (safe methods)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // CSRF protection is required for all state-changing operations
      // Even with JWT authentication, CSRF protection prevents
      // malicious sites from making authenticated requests on behalf of users

      const token = req.headers[this.options.headerName] as string;
      const secret = req.cookies[this.options.cookieName];

      if (!token || !secret) {
        logger.warn("CSRF token missing", {
          ip: context.ipAddress,
          endpoint: context.endpoint,
          method: context.method,
          hasToken: !!token,
          hasSecret: !!secret,
        });

        throw new ForbiddenError(
          "CSRF token required for this operation",
          context
        );
      }

      // Verify token against secret
      const expectedHash = this.hashToken(token, secret);
      const providedHash = req.headers['x-csrf-hash'] as string;

      if (!providedHash || expectedHash !== providedHash) {
        logger.warn("CSRF token verification failed", {
          ip: context.ipAddress,
          endpoint: context.endpoint,
          method: context.method,
          requestId: context.requestId,
        });

        throw new ForbiddenError(
          "Invalid CSRF token",
          context
        );
      }

      next();
    } catch (error) {
      logger.warn("CSRF verification failed", {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };

  // Middleware to require CSRF token for specific routes
  requireCSRF = (req: Request, res: Response, next: NextFunction): void => {
    return this.verifyToken(req, res, next);
  };
}

// Export default instance
export const csrfMiddleware = new CSRFMiddleware();

// Export utility functions
export const generateCSRFToken = csrfMiddleware.generateTokenMiddleware;
export const verifyCSRFToken = csrfMiddleware.verifyToken;
export const requireCSRF = csrfMiddleware.requireCSRF;
