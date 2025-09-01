// Load environment variables first
import { config } from './config/environment';

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

const app: Express = express();
const PORT = config.PORT;

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
app.use('/api', createRoutes(controllers));

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
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
});

process.on('SIGTERM', () => gracefulShutdown(server));
process.on('SIGINT', () => gracefulShutdown(server));

export default app;
