import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import os from 'os';
import { getContext } from '../asyncContext';
import { config } from '../../config/environment';

const errorLogDir = config.ERROR_LOG_DIR;
const allLogDir = config.ALL_LOG_DIR;

const ensureDirectory = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectory(errorLogDir);
ensureDirectory(allLogDir);

const isDev = config.NODE_ENV === 'development';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'green',
};

winston.addColors(colors);

const level = () => {
  if (config.LOG_LEVEL) return config.LOG_LEVEL;
  return isDev ? 'debug' : 'info';
};

// Production: compact JSON (tek satır, araçlarla parse edilir)
// Development: pretty JSON (okunabilir)
const jsonFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  const context = getContext();
  const logEntry: Record<string, unknown> = {
    level,
    time: timestamp,
    application: 'randevubu-server',
    environment: config.NODE_ENV || 'production',
    containerId: os.hostname() || uuidv4(),
    msg: message,
    requestId: context?.requestId,
    userId: context?.userId,
    businessId: context?.businessId,
    ...metadata,
  };

  // Undefined alanları temizle
  for (const key of Object.keys(logEntry)) {
    if (logEntry[key] === undefined) delete logEntry[key];
  }

  return isDev
    ? JSON.stringify(logEntry, null, 2)
    : JSON.stringify(logEntry);
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.splat(),
  jsonFormat,
);

const transports: winston.transport[] = [];

// Console — her ortamda aynı format (compact JSON)
// Production'da container log collector parse eder, dev'de de aynı detayı görürsün
transports.push(
  new winston.transports.Console()
);

// Error logs — günlük rotasyonlu, silinmez, max 50MB/dosya
transports.push(
  new DailyRotateFile({
    dirname: errorLogDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '50m',
    zippedArchive: true,
  })
);

// All logs — günlük rotasyonlu, silinmez, max 100MB/dosya
transports.push(
  new DailyRotateFile({
    dirname: allLogDir,
    filename: 'all-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxSize: '100m',
    zippedArchive: true,
  })
);

// OpenTelemetry log bridge — Winston loglarını SigNoz'a gönderir
if (process.env.OTEL_ENABLED === 'true') {
  try {
    const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
    const otelLogger = logs.getLoggerProvider().getLogger('winston-bridge');

    const winstonToSeverity: Record<string, number> = {
      error: SeverityNumber.ERROR,
      warn: SeverityNumber.WARN,
      info: SeverityNumber.INFO,
      http: SeverityNumber.DEBUG,
      debug: SeverityNumber.DEBUG,
    };

    const OtelTransport = class extends winston.transports.Stream {
      constructor() {
        super({ stream: process.stdout, silent: true });
      }
      log(info: any, callback: () => void) {
        const { level: lvl, message, timestamp, ...meta } = info;
        const context = getContext();
        otelLogger.emit({
          severityNumber: winstonToSeverity[lvl] || SeverityNumber.INFO,
          severityText: lvl?.toUpperCase(),
          body: message,
          attributes: {
            'service.name': 'randevubu-server',
            'log.level': lvl,
            ...(context?.requestId && { 'request.id': context.requestId }),
            ...(context?.userId && { 'user.id': context.userId }),
            ...(context?.businessId && { 'business.id': context.businessId }),
            ...(meta.code && { 'error.code': meta.code }),
            ...(meta.statusCode && { 'http.status_code': meta.statusCode }),
            ...(meta.url && { 'http.url': meta.url }),
            ...(meta.method && { 'http.method': meta.method }),
          },
        });
        callback();
      }
    };

    transports.push(new OtelTransport());
  } catch {
    // OpenTelemetry not available — file + console logging continues
  }
}

const Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: errorLogDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      zippedArchive: true,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: errorLogDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      zippedArchive: true,
    }),
  ],
  exitOnError: false,
});

export default Logger;
