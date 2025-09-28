// Load environment variables first
import { config, validateConfig } from './config/environment';

// Validate configuration before starting the server
validateConfig();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { logger } from './utils/logger';
import { gracefulShutdown, setServicesForShutdown } from './utils/gracefulShutdown';
import { createRoutes } from './routes';
import { ControllerContainer } from './controllers';
import prisma from './lib/prisma';
import { RepositoryContainer } from './repositories';
import { ServiceContainer } from './services';
import { initializeBusinessContextMiddleware } from './middleware/attachBusinessContext';
import { ensureEssentialData } from './utils/ensureEssentialData';

const app: Express = express();
const PORT = config.PORT;

// Trust proxy for rate limiting when behind reverse proxy (like Render)
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NODE_ENV === 'development' ? 1000 : 100, // Much higher limit in dev
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-role-update']
}));

app.use(compression());
app.use(cookieParser()); // Parse cookies for authentication
app.use(limiter);
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.get('/', (req: Request, res: Response) => {
  const responseTime = Date.now() - (req as any).startTime;
  res.json({ 
    message: 'Welcome to RandevuBu Server!',
    status: 'running',
    version: config.API_VERSION,
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     description: Returns server health status and performance metrics
 *     responses:
 *       200:
 *         description: Server health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *       503:
 *         description: Server unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 */
app.get('/health', (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: config.API_VERSION,
    environment: config.NODE_ENV,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };

  res.json(healthData);
});

// Special endpoint to manually trigger database initialization (for debugging)
app.post('/init-db', async (req: Request, res: Response) => {
  try {
    logger.info('🔧 Manual database initialization triggered');
    await ensureEssentialData(prisma);
    res.json({ success: true, message: 'Database initialization completed - check logs for details' });
  } catch (error) {
    logger.error('❌ Manual initialization failed:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// API JSON specification
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
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
app.use('/api', createRoutes(controllers, services));

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server is running on port ${PORT}`);

  // Ensure essential database data exists (roles, starter plan)
  await ensureEssentialData(prisma);
  logger.info(`📱 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`📋 API Spec JSON: http://localhost:${PORT}/api-docs.json`);
  logger.info(`🌐 Environment: ${config.NODE_ENV}`);
  logger.info(`📊 API Version: ${config.API_VERSION}`);
  
  // Start subscription scheduler
  if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') {
    services.subscriptionSchedulerService.start();
    logger.info(`📅 Subscription scheduler started in ${config.NODE_ENV} mode`);
  } else if (config.NODE_ENV === 'development') {
    // Enable scheduler in development with accelerated testing schedules
    services.subscriptionSchedulerService.start();
    logger.info(`📅 Subscription scheduler started in DEVELOPMENT mode with accelerated schedules`);
  } else {
    logger.info(`📅 Subscription scheduler disabled in ${config.NODE_ENV} mode`);
  }

  // Start appointment scheduler
  if (config.NODE_ENV !== 'test') {
    services.appointmentSchedulerService.start();
    logger.info(`📅 Appointment auto-completion scheduler started in ${config.NODE_ENV} mode`);
  }

  // Start appointment reminder service
  if (config.NODE_ENV !== 'test') {
    services.appointmentReminderService.start();
    logger.info(`📅 Appointment reminder service started (checks every minute)`);
  } else {
    logger.info(`📅 Appointment reminder service disabled in test mode`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the process in production, but log the error
  if (config.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown(server);
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown(server));
process.on('SIGINT', () => gracefulShutdown(server));

export default app;
