import winston from 'winston';
import { config } from '../config/environment';

// Safe JSON stringify that handles circular references and errors
const safeStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Handle Error objects
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    return value;
  }, 2);
};

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      message,
      ...meta,
    };
    try {
      return safeStringify(logObject);
    } catch (error) {
      // Fallback if stringify fails
      return JSON.stringify({
        timestamp,
        level,
        message: String(message),
        error: 'Failed to serialize log data',
      });
    }
  })
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? '\n' + safeStringify(meta)
      : '';
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

const transports: winston.transport[] = [];

if (config.NODE_ENV === 'production') {
  // In production, use console logging for cloud platforms
  transports.push(
    new winston.transports.Console({
      format: productionFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: config.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'randevubu-server' },
  transports,
});

export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      contentLength: res.get('content-length'),
      responseTime: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};