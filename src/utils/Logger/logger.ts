import * as winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getContext } from '../asyncContext';

const resolveLogDir = (envVar: string | undefined, fallback: string) =>
  envVar && envVar.trim().length > 0 ? envVar.trim() : fallback;

const baseLogDir =
  process.env.LOG_BASE_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/app/logs'
    : path.join(process.cwd(), 'logs'));

const errorLogDir = resolveLogDir(
  process.env.ERROR_LOG_DIR,
  path.join(baseLogDir, 'errors')
);
const allLogDir = resolveLogDir(
  process.env.ALL_LOG_DIR,
  path.join(baseLogDir, 'all')
);

const ensureDirectory = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectory(errorLogDir);
ensureDirectory(allLogDir);

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

const level = () => {
  return process.env.NODE_ENV === 'development' ? 'debug' : 'warn';
};

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.splat(),
    winston.format.json({ space: 2 }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        const context = getContext();
        const logEntry: Record<string, unknown> = {
            level,
            time: timestamp,
            application: 'randevubu-server',
            containerId: os.hostname() || uuidv4(),  // Use HOSTNAME env or generate UUID
            environment: process.env.NODE_ENV || 'production',
            nodeVersion: process.version || 'unknown',
            platform: os.platform() || 'unknown',
            // These upper four for detecting which container the log came from
            msg: message,
            requestId: context?.requestId,
            userId: context?.userId,
            businessId: context?.businessId,
            ...metadata
        };
        return JSON.stringify(logEntry, null, 2);
    }),
);

winston.addColors(colors);

const transports = [
    new winston.transports.Console(),
    new winston.transports.File({
        filename: `${errorLogDir}/error.log`,
        level: 'error',
    }),
    new winston.transports.File({
        filename: `${allLogDir}/all.log`,
        level: 'info'
    }),
];

const Logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
});

export default Logger;