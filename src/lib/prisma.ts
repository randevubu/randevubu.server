import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Create a single Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production'
    ? [
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ]
    : [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Log errors
prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
  logger.error(`Target: ${e.target}`);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
