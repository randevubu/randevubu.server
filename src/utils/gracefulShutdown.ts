import { Server } from 'http';
import { logger } from './logger';

export const gracefulShutdown = (server: Server): void => {
  logger.info('Received shutdown signal, shutting down gracefully...');
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully. Goodbye!');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};