/**
 * Graceful shutdown configuration
 * 
 * Environment Variables:
 * - SHUTDOWN_TIMEOUT: Maximum time to wait for graceful shutdown (default: 30000ms)
 * - CONNECTION_DRAIN_TIMEOUT: Time to wait for active connections to drain (default: 10000ms)
 */

export const SHUTDOWN_CONFIG = {
  // Maximum time to wait for graceful shutdown (30 seconds)
  SHUTDOWN_TIMEOUT: parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10),
  
  // Time to wait for active connections to drain (10 seconds)
  CONNECTION_DRAIN_TIMEOUT: parseInt(process.env.CONNECTION_DRAIN_TIMEOUT || '10000', 10),
  
  // Whether to enable connection draining
  ENABLE_CONNECTION_DRAINING: process.env.ENABLE_CONNECTION_DRAINING !== 'false',
  
  // Whether to enable database cleanup
  ENABLE_DATABASE_CLEANUP: process.env.ENABLE_DATABASE_CLEANUP !== 'false',
} as const;

export default SHUTDOWN_CONFIG;



































