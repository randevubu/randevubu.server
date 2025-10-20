import * as winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import os from 'os';


// Ensure the log directories exist  (will be change, don't forget)
// Use Docker-friendly paths instead of os.homedir()
const errorLogDir = '/app/logs/errors'; // Logs directory inside the container
const allLogDir = '/app/logs/all';      // Logs directory inside the container


if (!fs.existsSync(errorLogDir)) {
    fs.mkdirSync(errorLogDir, { recursive: true });
}

if (!fs.existsSync(allLogDir)) {
    fs.mkdirSync(allLogDir, { recursive: true });
}

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
        const logEntry = {
            level,
            time: timestamp,
            application: 'randevubu-server',
            containerId: os.hostname() || uuidv4(),  // Use HOSTNAME env or generate UUID
            environment: process.env.NODE_ENV || 'production',
            nodeVersion: process.version || 'unknown',
            platform: os.platform() || 'unknown',
            // These upper four for detecting which container the log came from
            msg: message,
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