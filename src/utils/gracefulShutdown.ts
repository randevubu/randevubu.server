import { Server } from 'http';
import { logger } from './logger';

let services: any = null;

export const setServicesForShutdown = (serviceContainer: any) => {
  services = serviceContainer;
};

export const gracefulShutdown = (server: Server): void => {
  logger.info('Received shutdown signal, shutting down gracefully...');
  
  // Stop subscription scheduler if running
  if (services?.subscriptionSchedulerService) {
    services.subscriptionSchedulerService.stop();
    logger.info('📅 Subscription scheduler stopped');
  }
  
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