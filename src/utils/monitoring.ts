import { NextFunction, Request, Response } from "express";
import { performance } from "perf_hooks";
import { logger } from "./Logger/logger";

export interface RequestMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength?: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  timestamp: Date;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

export class MonitoringService {
  private static requestMetrics: RequestMetrics[] = [];
  private static readonly MAX_STORED_METRICS = 1000;

  static requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = performance.now();

    // Add request ID to request object
    (req as any).requestId = requestId;

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

    // Override res.end to capture response metrics
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const metrics: RequestMetrics = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
        contentLength: parseInt(res.get("content-length") || "0", 10),
        userAgent: req.get("user-agent") || undefined,
        ip: req.ip || "unknown",
        userId: (req as any).user?.id,
        timestamp: new Date(),
      };

      // Store metrics
      MonitoringService.storeRequestMetrics(metrics);

      // Log response
      const logLevel = res.statusCode >= 400 ? "warn" : "info";
      logger[logLevel]("Request completed", {
        ...metrics,
        duration: `${responseTime.toFixed(2)}ms`,
      });

      // Call original end method and return its result
      return originalEnd(chunk, encoding, cb);
    };

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
            requestId: (req as any).requestId,
            method: req.method,
            url: req.url,
            responseTime: `${responseTime.toFixed(2)}ms`,
            threshold: `${threshold}ms`,
            statusCode: res.statusCode,
            userId: (req as any).user?.id,
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
        requestId: (req as any).requestId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        method: req.method,
        url: req.url,
        detectedPatterns,
        userId: (req as any).user?.id,
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
      requestId: (req as any).requestId,
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
    };

    logger.error("Unhandled request error", errorDetails);

    // Track error patterns
    if (err.message.includes("ECONNREFUSED")) {
      logger.error("Database connection error detected", {
        requestId: (req as any).requestId,
        error: err.message,
      });
    }

    next(err);
  };

  private static storeRequestMetrics(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);

    // Keep only the last N metrics to prevent memory leaks
    if (this.requestMetrics.length > this.MAX_STORED_METRICS) {
      this.requestMetrics = this.requestMetrics.slice(-this.MAX_STORED_METRICS);
    }
  }

  static getRequestMetrics(
    limit: number = 100,
    filter?: {
      method?: string;
      statusCode?: number;
      minResponseTime?: number;
      since?: Date;
    }
  ): RequestMetrics[] {
    let filtered = this.requestMetrics;

    if (filter) {
      filtered = filtered.filter((metric) => {
        if (filter.method && metric.method !== filter.method) return false;
        if (filter.statusCode && metric.statusCode !== filter.statusCode)
          return false;
        if (
          filter.minResponseTime &&
          metric.responseTime < filter.minResponseTime
        )
          return false;
        if (filter.since && metric.timestamp < filter.since) return false;
        return true;
      });
    }

    return filtered.slice(-limit);
  }

  static getSystemMetrics(): SystemMetrics {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date(),
    };
  }

  static getPerformanceStats(minutes: number = 60): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
    requestsPerMinute: number;
  } {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.getRequestMetrics(Infinity, { since });

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        requestsPerMinute: 0,
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorRequests = recentMetrics.filter(
      (m) => m.statusCode >= 400
    ).length;
    const errorRate = (errorRequests / totalRequests) * 100;
    const slowRequests = recentMetrics.filter(
      (m) => m.responseTime > 1000
    ).length;
    const requestsPerMinute = totalRequests / minutes;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      slowRequests,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
    };
  }

  static logSystemStats(): void {
    const systemMetrics = this.getSystemMetrics();
    const performanceStats = this.getPerformanceStats(5); // Last 5 minutes

    logger.info("System metrics", {
      memory: {
        used: `${Math.round(
          systemMetrics.memoryUsage.heapUsed / 1024 / 1024
        )}MB`,
        total: `${Math.round(
          systemMetrics.memoryUsage.heapTotal / 1024 / 1024
        )}MB`,
        external: `${Math.round(
          systemMetrics.memoryUsage.external / 1024 / 1024
        )}MB`,
      },
      uptime: `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor(
        (systemMetrics.uptime % 3600) / 60
      )}m`,
      performance: performanceStats,
    });
  }

  static startPeriodicLogging(intervalMinutes: number = 15): NodeJS.Timeout {
    const interval = setInterval(() => {
      this.logSystemStats();
    }, intervalMinutes * 60 * 1000);

    logger.info("Periodic system monitoring started", {
      intervalMinutes,
    });

    return interval;
  }

  static createHealthCheck() {
    return (req: Request, res: Response): void => {
      const systemMetrics = this.getSystemMetrics();
      const performanceStats = this.getPerformanceStats(1); // Last 1 minute

      const memoryUsagePercent =
        (systemMetrics.memoryUsage.heapUsed /
          systemMetrics.memoryUsage.heapTotal) *
        100;
      const isHealthy =
        memoryUsagePercent < 90 && performanceStats.errorRate < 50;

      const healthStatus = {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(systemMetrics.uptime),
        memory: {
          used: systemMetrics.memoryUsage.heapUsed,
          total: systemMetrics.memoryUsage.heapTotal,
          percentage: Math.round(memoryUsagePercent * 100) / 100,
        },
        performance: performanceStats,
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
  getRequestMetrics,
  getSystemMetrics,
  getPerformanceStats,
  logSystemStats,
  startPeriodicLogging,
  createHealthCheck,
} = MonitoringService;
