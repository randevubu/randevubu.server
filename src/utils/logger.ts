import winston from 'winston';
import { config } from '../config/environment';
import { v4 as uuidv4 } from 'uuid';

// Production-ready structured JSON format
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format((info) => {
    // Add consistent fields for log aggregation
    info.service = 'randevubu-server';
    info.environment = config.NODE_ENV;
    info.version = config.API_VERSION;

    // Add trace ID if available (for distributed tracing)
    if (info.traceId) {
      info.trace_id = info.traceId;
      delete info.traceId;
    }

    // Ensure error objects are properly serialized
    if (info.error && typeof info.error === 'object') {
      const error = info.error as Error & { code?: string };
      info.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      };
    }

    return info;
  })()
);

// Development format with colors and better readability
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, traceId, ...meta }) => {
    const trace = traceId ? `[${String(traceId).substring(0, 8)}]` : '';
    const metaStr = Object.keys(meta).length ?
      `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${trace} [${level}]: ${message}${metaStr}`;
  })
);

// Configure transports based on environment
const transports: winston.transport[] = [];

if (config.NODE_ENV === 'production') {
  // Production file logging with rotation
  transports.push(
    new winston.transports.File({
      filename: '/var/log/randevubu/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({
      filename: '/var/log/randevubu/app.log',
      format: productionFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 5,
      tailable: true
    }),
    // Console output for Docker logs
    new winston.transports.Console({
      format: productionFormat,
      level: 'info'
    })
  );
} else {
  // Development console logging
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
      level: 'debug'
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: config.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'randevubu-server',
    environment: config.NODE_ENV,
    version: config.API_VERSION
  },
  transports,
  // Exit on uncaught exceptions and rejections in production
  exitOnError: config.NODE_ENV === 'production'
});

// Enhanced request logging middleware with trace IDs
export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  const traceId = uuidv4();

  // Attach trace ID to request for downstream use
  req.traceId = traceId;
  res.set('X-Trace-ID', traceId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      type: 'http_request',
      traceId,
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: {
          'user-agent': req.get('user-agent'),
          'content-type': req.get('content-type'),
          'content-length': req.get('content-length')
        },
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        businessId: req.businessContext?.businessId
      },
      response: {
        statusCode: res.statusCode,
        contentLength: res.get('content-length'),
        responseTime: duration
      }
    };

    // Log different levels based on status codes
    if (res.statusCode >= 500) {
      logger.error('HTTP Request - Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request - Client Error', logData);
    } else if (res.statusCode >= 300) {
      logger.info('HTTP Request - Redirect', logData);
    } else {
      logger.info('HTTP Request - Success', logData);
    }
  });

  next();
};

// Enhanced logging helpers with structured data
export const loggers = {
  // Authentication events
  auth: {
    loginAttempt: (userId: string, success: boolean, ip: string, traceId?: string) => {
      logger.info('Authentication Attempt', {
        type: 'auth_login',
        traceId,
        userId,
        success,
        ip,
        timestamp: new Date().toISOString()
      });
    },

    loginSuccess: (userId: string, ip: string, traceId?: string) => {
      logger.info('Login Success', {
        type: 'auth_login_success',
        traceId,
        userId,
        ip,
        timestamp: new Date().toISOString()
      });
    },

    loginFailure: (identifier: string, reason: string, ip: string, traceId?: string) => {
      logger.warn('Login Failure', {
        type: 'auth_login_failure',
        traceId,
        identifier: identifier.substring(0, 4) + '***', // Mask sensitive data
        reason,
        ip,
        timestamp: new Date().toISOString()
      });
    },

    logout: (userId: string, traceId?: string) => {
      logger.info('User Logout', {
        type: 'auth_logout',
        traceId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Business operation events
  business: {
    appointmentCreated: (appointmentId: string, businessId: string, userId: string, traceId?: string) => {
      logger.info('Appointment Created', {
        type: 'business_appointment_created',
        traceId,
        appointmentId,
        businessId,
        userId,
        timestamp: new Date().toISOString()
      });
    },

    paymentProcessed: (paymentId: string, amount: number, currency: string, status: string, traceId?: string) => {
      logger.info('Payment Processed', {
        type: 'business_payment',
        traceId,
        paymentId,
        amount,
        currency,
        status,
        timestamp: new Date().toISOString()
      });
    },

    subscriptionUpdated: (businessId: string, planType: string, action: string, traceId?: string) => {
      logger.info('Subscription Updated', {
        type: 'business_subscription',
        traceId,
        businessId,
        planType,
        action,
        timestamp: new Date().toISOString()
      });
    }
  },

  // System events
  system: {
    startup: (port: number) => {
      logger.info('Application Started', {
        type: 'system_startup',
        port,
        environment: config.NODE_ENV,
        version: config.API_VERSION,
        timestamp: new Date().toISOString()
      });
    },

    shutdown: (reason: string) => {
      logger.info('Application Shutdown', {
        type: 'system_shutdown',
        reason,
        timestamp: new Date().toISOString()
      });
    },

    databaseConnected: () => {
      logger.info('Database Connected', {
        type: 'system_database_connected',
        timestamp: new Date().toISOString()
      });
    },

    databaseError: (error: Error, traceId?: string) => {
      logger.error('Database Error', {
        type: 'system_database_error',
        traceId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Security events
  security: {
    suspiciousActivity: (type: string, details: any, ip: string, traceId?: string) => {
      logger.warn('Suspicious Activity Detected', {
        type: 'security_suspicious_activity',
        traceId,
        activityType: type,
        details,
        ip,
        timestamp: new Date().toISOString()
      });
    },

    rateLimitHit: (ip: string, endpoint: string, traceId?: string) => {
      logger.warn('Rate Limit Exceeded', {
        type: 'security_rate_limit',
        traceId,
        ip,
        endpoint,
        timestamp: new Date().toISOString()
      });
    },

    unauthorizedAccess: (resource: string, userId?: string, ip?: string, traceId?: string) => {
      logger.warn('Unauthorized Access Attempt', {
        type: 'security_unauthorized_access',
        traceId,
        resource,
        userId,
        ip,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Performance events
  performance: {
    slowQuery: (query: string, duration: number, traceId?: string) => {
      logger.warn('Slow Database Query', {
        type: 'performance_slow_query',
        traceId,
        query: query.substring(0, 100) + '...', // Truncate long queries
        duration,
        threshold: 1000, // ms
        timestamp: new Date().toISOString()
      });
    },

    slowRequest: (method: string, path: string, duration: number, traceId?: string) => {
      logger.warn('Slow HTTP Request', {
        type: 'performance_slow_request',
        traceId,
        method,
        path,
        duration,
        threshold: 5000, // ms
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Utility function to create child logger with trace ID
export const createTraceLogger = (traceId: string) => {
  return logger.child({ traceId });
};