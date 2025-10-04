// Load environment variables first
import { config } from "./config/environment";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec, swaggerUiOptions } from "./config/swagger";
import { ControllerContainer } from "./controllers";
import prisma from "./lib/prisma";
import { initializeBusinessContextMiddleware } from "./middleware/attachBusinessContext";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { requestIdMiddleware } from "./middleware/requestId";
import { RepositoryContainer } from "./repositories";
import { createRoutes } from "./routes";
import { ServiceContainer } from "./services";
import logger from "./utils/Logger/logger";
import {
  gracefulShutdown,
  setServicesForShutdown,
} from "./utils/gracefulShutdown";
// import { getMetrics, metricsMiddleware } from "./utils/metrics";

const app: Express = express();
const PORT = config.PORT;

// Trust proxy headers when running behind reverse proxy (e.g., Render, Heroku, etc.)
app.set("trust proxy", 1);

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
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
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

// Metrics collection middleware (before route handlers)
// app.use(metricsMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
});

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
  const responseTime = Date.now() - (req as any).startTime;
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
  const checks: any = {};

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

    // Memory and system metrics
    const memUsage = process.memoryUsage();
    checks.memory = {
      status:
        memUsage.heapUsed / memUsage.heapTotal < 0.9 ? "healthy" : "warning",
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    };

    // CPU load (basic check)
    const cpuUsage = process.cpuUsage();
    checks.cpu = {
      status: "healthy",
      user: cpuUsage.user,
      system: cpuUsage.system,
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

    const healthData = {
      status,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: config.API_VERSION,
      environment: config.NODE_ENV,
      responseTime: Date.now() - startTime + "ms",
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
// app.get("/metrics", getMetrics);

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

// Initialize business context middleware
initializeBusinessContextMiddleware(repositories);

// Set services for graceful shutdown
setServicesForShutdown(services);

// Mount API routes
app.use("/api", createRoutes(controllers, services));

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  // Use structured logging for startup
  logger.info(`System startup on port ${PORT}`);

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

process.on("SIGTERM", () => gracefulShutdown(server));
process.on("SIGINT", () => gracefulShutdown(server));

export default app;
