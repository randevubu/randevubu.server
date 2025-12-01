import { Server } from "http";

import { SHUTDOWN_CONFIG } from "../config/shutdown";
import logger from "./Logger/logger";
// Production-ready service interfaces
interface ShutdownableService {
  stop(): void | Promise<void>;
}

interface DatabaseService {
  $disconnect(): Promise<void>;
}

interface ShutdownServices {
  subscriptionSchedulerService?: ShutdownableService;
  appointmentSchedulerService?: ShutdownableService;
  appointmentReminderService?: ShutdownableService;
  prisma?: DatabaseService;
  [key: string]: any;
}

let services: ShutdownServices | null = null;
let isShuttingDown = false;

export const setServicesForShutdown = (serviceContainer: ShutdownServices) => {
  services = serviceContainer;
};

// Use configuration from shutdown config
const { SHUTDOWN_TIMEOUT, CONNECTION_DRAIN_TIMEOUT, ENABLE_CONNECTION_DRAINING, ENABLE_DATABASE_CLEANUP } = SHUTDOWN_CONFIG;

export const gracefulShutdown = async (server: Server): Promise<void> => {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, ignoring duplicate signal");
    return;
  }

  isShuttingDown = true;
  logger.info("🔄 Received shutdown signal, shutting down gracefully...");

  const shutdownStartTime = Date.now();
  let hasErrors = false;

  try {
    // Step 1: Stop accepting new connections
    logger.info("🚫 Stopping acceptance of new connections...");
    server.close();

    // Step 2: Stop background services
    await stopBackgroundServices();

    // Step 3: Close database connections
    if (ENABLE_DATABASE_CLEANUP) {
      await closeDatabaseConnections();
    }

    // Step 4: Wait for active connections to drain
    if (ENABLE_CONNECTION_DRAINING) {
      await drainActiveConnections(server);
    }

    const shutdownDuration = Date.now() - shutdownStartTime;
    logger.info(`✅ Graceful shutdown completed in ${shutdownDuration}ms`);
    process.exit(0);

  } catch (error) {
    hasErrors = true;
    logger.error("❌ Error during graceful shutdown:", error);
  }

  // Forceful shutdown if timeout exceeded
  setTimeout(() => {
    const shutdownDuration = Date.now() - shutdownStartTime;
    logger.error(
      `⏰ Shutdown timeout exceeded (${shutdownDuration}ms), forcefully shutting down`
    );
    process.exit(hasErrors ? 1 : 0);
  }, SHUTDOWN_TIMEOUT);
};

const stopBackgroundServices = async (): Promise<void> => {
  if (!services) return;

  const serviceNames = [
    'subscriptionSchedulerService',
    'appointmentSchedulerService', 
    'appointmentReminderService'
  ];

  for (const serviceName of serviceNames) {
    const service = services[serviceName];
    if (service && typeof service.stop === 'function') {
      try {
        logger.info(`🔄 Stopping ${serviceName}...`);
        await service.stop();
        logger.info(`✅ ${serviceName} stopped successfully`);
      } catch (error) {
        logger.error(`❌ Error stopping ${serviceName}:`, error);
      }
    }
  }
};

const closeDatabaseConnections = async (): Promise<void> => {
  if (!services?.prisma) return;

  try {
    logger.info("🔄 Closing database connections...");
    await services.prisma.$disconnect();
    logger.info("✅ Database connections closed successfully");
  } catch (error) {
    logger.error("❌ Error closing database connections:", error);
    throw error;
  }
};

const drainActiveConnections = async (server: Server): Promise<void> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkConnections = () => {
      const serverConnections = (server as any)._connections || 0;
      const elapsed = Date.now() - startTime;
      
      if (serverConnections === 0) {
        logger.info("✅ All active connections drained");
        resolve();
        return;
      }
      
      if (elapsed >= CONNECTION_DRAIN_TIMEOUT) {
        logger.warn(`⚠️ Connection drain timeout reached, proceeding with ${serverConnections} active connections`);
        resolve();
        return;
      }
      
      logger.info(`🔄 Draining connections... (${serverConnections} active, ${elapsed}ms elapsed)`);
      setTimeout(checkConnections, 1000);
    };
    
    // Start checking after a brief delay to allow current requests to complete
    setTimeout(checkConnections, 1000);
  });
};

// Health check for readiness
export const isReadyForShutdown = (): boolean => {
  return !isShuttingDown;
};
