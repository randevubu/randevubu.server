import { NextFunction, Request, Response } from "express";
import { performance } from "perf_hooks";

import { AuthenticatedUser } from "../types/auth";
import logger from "./Logger/logger";
export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

export interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength: number;
  userAgent?: string;
  ip: string;
  timestamp: Date;
}

export class MonitoringService {

  static requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const startTime = performance.now();
    // requestId should already be set by requestIdMiddleware
    const requestId = req.requestId;

    // Log request start
    logger.info("Request started", {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      contentType: req.get("content-type"),
      contentLength: req.get("content-length"),
    });

    res.on("finish", () => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      
      const logData: RequestLogData = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: Math.round(responseTime * 100) / 100,
        contentLength: parseInt(res.get("content-length") || "0", 10),
        userAgent: req.get("user-agent") || undefined,
        ip: req.ip || "unknown",
        timestamp: new Date(),
      };
      
      logger[logLevel]("Request completed", logData);
    });

    next();
  };

  static performanceMonitor = (
    threshold: number = 1000 // 1 second threshold
  ) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = performance.now();

      res.on("finish", () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (responseTime > threshold) {
          logger.warn("Slow request detected", {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            responseTime: `${responseTime.toFixed(2)}ms`,
            threshold: `${threshold}ms`,
            statusCode: res.statusCode,
            userId: (req as Request & { user?: AuthenticatedUser }).user?.id,
          });
        }
      });

      next();
    };
  };

  static securityMonitor = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript injection
      /vbscript:/i, // VBScript injection
    ];

    const requestData = {
      url: req.url,
      body: JSON.stringify(req.body || {}),
      query: JSON.stringify(req.query || {}),
      headers: JSON.stringify(req.headers || {}),
    };

    let suspiciousActivity = false;
    const detectedPatterns: string[] = [];

    for (const [key, value] of Object.entries(requestData)) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          suspiciousActivity = true;
          detectedPatterns.push(`${key}: ${pattern.toString()}`);
        }
      }
    }

    if (suspiciousActivity) {
      logger.warn("Suspicious request detected", {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        method: req.method,
        url: req.url,
        detectedPatterns,
        userId: (req as Request & { user?: AuthenticatedUser }).user?.id,
      });
    }

    next();
  };

  static errorMonitor = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const errorDetails = {
      requestId: req.requestId,
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: (req as Request & { user?: AuthenticatedUser }).user?.id,
      timestamp: new Date().toISOString(),
    };

    logger.error("Unhandled request error", errorDetails);

    // Track error patterns
    if (err.message.includes("ECONNREFUSED")) {
      logger.error("Database connection error detected", {
        requestId: req.requestId,
        error: err.message,
      });
    }

    next(err);
  };

  static getSystemMetrics(): SystemMetrics {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date(),
    };
  }

  static createHealthCheck() {
    return (req: Request, res: Response): void => {
      const systemMetrics = this.getSystemMetrics();

      const memoryUsagePercent =
        (systemMetrics.memoryUsage.heapUsed /
          systemMetrics.memoryUsage.heapTotal) *
        100;
      const isHealthy = memoryUsagePercent < 90;

      const healthStatus = {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(systemMetrics.uptime),
        memory: {
          used: systemMetrics.memoryUsage.heapUsed,
          total: systemMetrics.memoryUsage.heapTotal,
          percentage: Math.round(memoryUsagePercent * 100) / 100,
        },
        performance: {
          // For deep performance, rely on external backend via OpenTelemetry
        },
        version: process.version,
        environment: process.env.NODE_ENV || "development",
      };

      res.status(isHealthy ? 200 : 503).json(healthStatus);
    };
  }
}

// Export convenience functions
export const {
  requestLogger,
  performanceMonitor,
  securityMonitor,
  errorMonitor,
  getSystemMetrics,
  createHealthCheck,
} = MonitoringService;
