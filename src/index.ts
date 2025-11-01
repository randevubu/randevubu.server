// Load environment variables first
import { config, validateConfig } from "./config/environment";
// Initialize telemetry early (no-op unless OTEL_ENABLED=true)
import "./telemetry/opentelemetry";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { getMetrics, metricsMiddleware } from "./utils/metrics";
import { swaggerSpec, swaggerUiOptions } from "./config/swagger";
import { ControllerContainer } from "./controllers";
import prisma from "./lib/prisma";
import { initializeBusinessContextMiddleware } from "./middleware/attachBusinessContext";
import { AuthMiddleware } from "./middleware/auth";
import { AuthorizationMiddleware } from "./middleware/authorization";
import { initializeAuthMiddleware } from "./middleware/authUtils";
import { csrfMiddleware } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { requestIdMiddleware } from "./middleware/requestId";
import { sanitizeBody, sanitizeQuery } from "./middleware/sanitization";
import { RepositoryContainer } from "./repositories";
import { createRoutes } from "./routes";
import { ServiceContainer } from "./services";
import logger from "./utils/Logger/logger";
import {
  gracefulShutdown,
  setServicesForShutdown,
  isReadyForShutdown,
} from "./utils/gracefulShutdown";
import {
  requestLogger,
  performanceMonitor,
  securityMonitor,
  errorMonitor,
  createHealthCheck,
} from "./utils/monitoring";
import { cacheManager } from "./lib/redis/redis";
import { CacheMonitoring } from "./middleware/cacheMonitoring";
import { cacheService } from "./services/cacheService";

// Validate configuration on startup
try {
  validateConfig();
  logger.info('✅ Configuration validated successfully');
} catch (error) {
  logger.error('❌ Configuration validation failed:', error);
  if (config.NODE_ENV === 'production') {
    process.exit(1); // Exit on production config errors
  } else {
    logger.warn('⚠️ Continuing with invalid configuration in non-production environment');
  }
}

const app: Express = express();
const PORT = config.PORT;

// Trust proxy headers when running behind reverse proxy (e.g., Render, Heroku, etc.)
app.set("trust proxy", 1);

// HTTPS enforcement in production
if (config.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Check if request is already HTTPS
    const protocol = req.header("x-forwarded-proto") || req.protocol;

    if (protocol !== "https") {
      // Redirect to HTTPS
      logger.warn("HTTP request redirected to HTTPS", {
        ip: req.ip,
        path: req.path,
        userAgent: req.get("user-agent"),
      });
      return res.redirect(301, `https://${req.header("host")}${req.url}`);
    }
    next();
  });
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NODE_ENV === "development" ? 1000 : 100, // Much higher limit in dev
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    xContentTypeOptions: false,
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  })
);

app.use(
  cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-role-update",
    ],
  })
);

app.use(compression());
app.use(cookieParser()); // Parse cookies for authentication
app.use(limiter);
app.use(
  morgan("combined", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request ID middleware (should be early in the chain)
app.use(requestIdMiddleware);

// XSS Protection: Sanitize user input (after body parsing, before processing)
app.use(sanitizeQuery('strict'));
app.use(sanitizeBody('strict'));

// CSRF protection for state-changing operations
app.use(csrfMiddleware.generateTokenMiddleware);

// Monitoring middleware (after requestId, before routes)
app.use(requestLogger);
app.use(performanceMonitor(1000)); // 1 second threshold
app.use(securityMonitor);

/**
 * @swagger
 * /:
 *   get:
 *     tags: [System]
 *     summary: API root endpoint
 *     description: Returns basic API information and server status
 *     responses:
 *       200:
 *         description: Server information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Welcome to RandevuBu Server!"
 *                 status:
 *                   type: string
 *                   example: "running"
 *                 version:
 *                   type: string
 *                   example: "v1"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 responseTime:
 *                   type: string
 *                   example: "5ms"
 */
app.get("/", (req: Request, res: Response) => {
  // Calculate response time if startTime was set by monitoring middleware
  const startTime = (req as Request & { startTime?: number }).startTime;
  const responseTime = startTime ? Date.now() - startTime : 0;

  res.json({
    message: "Welcome to RandevuBu Server!",
    status: "running",
    version: config.API_VERSION,
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     description: Returns comprehensive server health status including database connectivity
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *       503:
 *         description: Server is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 */
app.get("/health", async (req: Request, res: Response) => {
  const startTime = Date.now();
  let status = "healthy";
  let httpStatus = 200;
  const checks: Record<string, unknown> = {};

  try {
    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "healthy",
        responseTime: Date.now() - startTime + "ms",
      };
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        error: "Database connection failed",
        responseTime: Date.now() - startTime + "ms",
      };
      status = "unhealthy";
      httpStatus = 503;
    }

    // Redis connectivity check
    try {
      const redisHealthy = await cacheManager.healthCheck();
      const redisStats = await cacheManager.getStats();
      checks.redis = {
        status: redisHealthy ? "healthy" : "unhealthy",
        connected: redisStats.connected,
        memory: redisStats.memory,
        keyspace: redisStats.keyspace,
        uptime: redisStats.uptime,
        responseTime: Date.now() - startTime + "ms",
      };
      if (!redisHealthy) {
        status = "unhealthy";
        httpStatus = 503;
      }
    } catch (error) {
      checks.redis = {
        status: "unhealthy",
        error: "Redis connection failed",
        responseTime: Date.now() - startTime + "ms",
      };
      status = "unhealthy";
      httpStatus = 503;
    }

    // Use monitoring health check for system metrics
    const monitoringHealth = createHealthCheck();
    const systemHealth = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      uptime: Math.floor(process.uptime()),
      version: process.version,
      environment: process.env.NODE_ENV || "development",
    };

    // Service availability checks
    checks.services = {
      subscriptionScheduler: services.subscriptionSchedulerService
        ? "available"
        : "unavailable",
      appointmentScheduler: services.appointmentSchedulerService
        ? "available"
        : "unavailable",
      appointmentReminder: services.appointmentReminderService
        ? "available"
        : "unavailable",
      notification: services.notificationService ? "available" : "unavailable",
      payment: services.paymentService ? "available" : "unavailable",
    };

    // Shutdown readiness check
    checks.shutdown = {
      status: isReadyForShutdown() ? "ready" : "shutting_down",
      ready: isReadyForShutdown(),
    };

    const healthData = {
      status,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: config.API_VERSION,
      environment: config.NODE_ENV,
      responseTime: Date.now() - startTime + "ms",
      system: systemHealth,
      checks,
    };

    res.status(httpStatus).json(healthData);
  } catch (error) {
    const healthData = {
      status: "unhealthy",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: config.API_VERSION,
      environment: config.NODE_ENV,
      responseTime: Date.now() - startTime + "ms",
      error: "Health check failed",
      checks,
    };

    res.status(503).json(healthData);
  }
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [System]
 *     summary: Prometheus metrics endpoint
 *     description: Returns application metrics in Prometheus format
 *     responses:
 *       200:
 *         description: Metrics data in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
app.use(metricsMiddleware);
app.get("/metrics", getMetrics);

// API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

// API JSON specification
app.get("/api-docs.json", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const controllers = new ControllerContainer(repositories, services);

// Cache services are handled by the middleware

// Initialize authentication middleware with dependency injection
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);
const authorizationMiddleware = new AuthorizationMiddleware(services.rbacService);
initializeAuthMiddleware(authMiddleware, authorizationMiddleware);

// Initialize business context middleware
initializeBusinessContextMiddleware(repositories);

// Set services for graceful shutdown
setServicesForShutdown(services);

// Mount API routes
app.use("/api", createRoutes(controllers, services));

app.use(notFoundHandler);
app.use(errorMonitor); // Add error monitoring before error handler
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  // Use structured logging for startup
  logger.info(`System startup on port ${PORT}`);

  // Initialize application startup procedures
  try {
    await services.startupService.initialize();
  } catch (error) {
    logger.error('Failed to initialize application startup:', error);
  }

  // Warm cache with frequently accessed data (Netflix/Airbnb pattern)
  try {
    // Fetch frequently accessed data to warm cache
    const businessTypes = await repositories.businessTypeRepository.findAllActive();

    await cacheService.warmCache({
      businessTypes: businessTypes || [],
    });
    logger.info('✅ Cache warmed with frequently accessed data');
  } catch (error) {
    logger.error('Failed to warm cache:', error);
    // Non-critical error, continue startup
  }

  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`📋 API Spec JSON: http://localhost:${PORT}/api-docs.json`);
  logger.info(`🌐 Environment: ${config.NODE_ENV}`);
  logger.info(`📊 API Version: ${config.API_VERSION}`);

  // Start subscription scheduler
  if (config.NODE_ENV === "production" || config.NODE_ENV === "staging") {
    services.subscriptionSchedulerService.start();
    logger.info(`📅 Subscription scheduler started in ${config.NODE_ENV} mode`);
  } else if (config.NODE_ENV === "development") {
    // Enable scheduler in development with accelerated testing schedules
    services.subscriptionSchedulerService.start();
    logger.info(
      `📅 Subscription scheduler started in DEVELOPMENT mode with accelerated schedules`
    );
  } else {
    logger.info(
      `📅 Subscription scheduler disabled in ${config.NODE_ENV} mode`
    );
  }

  // Start appointment scheduler
  if (config.NODE_ENV !== "test") {
    services.appointmentSchedulerService.start();
    logger.info(
      `📅 Appointment auto-completion scheduler started in ${config.NODE_ENV} mode`
    );
  }

  // Start appointment reminder service
  if (config.NODE_ENV !== "test") {
    services.appointmentReminderService.start();
    logger.info(
      `📅 Appointment reminder service started (checks every minute)`
    );
  } else {
    logger.info(`📅 Appointment reminder service disabled in test mode`);
  }
});

// Graceful shutdown handlers
const shutdownHandler = async () => {
  // Cleanup cache monitoring
  CacheMonitoring.cleanup();
  
  await gracefulShutdown(server);
};

process.on("SIGTERM", shutdownHandler);
process.on("SIGINT", shutdownHandler);

export default app;
