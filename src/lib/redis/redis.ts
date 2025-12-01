import Redis from 'ioredis';
import { config } from '../../config/environment';
import logger from "../../utils/Logger/logger";
// Redis connection configuration optimized for production (Netflix/Airbnb-style)
const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,

  // Connection settings
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: false,              // Connect immediately (safer than lazy)
  family: 4,                       // IPv4

  // Keep-alive and timeouts
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,

  // Reconnection strategy (exponential backoff)
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },

  // Connection pool settings (for multiple app instances)
  enableOfflineQueue: true,
  enableReadyCheck: true,          // Ensure Redis is ready before commands

  // Auto-pipelining for better performance (Netflix-style)
  enableAutoPipelining: true,
  autoPipeliningIgnoredCommands: ['ping', 'info'],
};

// Create Redis instance with connection pooling
const redis = new Redis(redisConfig);

// Redis event handlers with detailed logging
redis.on('connect', () => {
  logger.info('🔗 Redis connecting...', {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  });
});

redis.on('ready', () => {
  logger.info('✅ Redis connected and ready', {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    status: 'ready'
  });
});

redis.on('error', (error) => {
  logger.error('❌ Redis connection error:', {
    error: error.message,
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  });
});

redis.on('close', () => {
  logger.warn('🔌 Redis connection closed');
});

redis.on('reconnecting', (time: number) => {
  logger.info(`🔄 Redis reconnecting in ${time}ms`);
});

redis.on('end', () => {
  logger.warn('🛑 Redis connection ended');
});

// Graceful shutdown for Docker (proper cleanup)
const shutdownRedis = async () => {
  logger.info('Closing Redis connection (graceful shutdown)...');
  try {
    await redis.quit();
    logger.info('✅ Redis connection closed successfully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdownRedis);
process.on('SIGINT', shutdownRedis);

export default redis;

/**
 * Circuit Breaker States
 */
enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit Breaker Configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;      // Open circuit after N failures
  successThreshold: number;      // Close circuit after N successes (half-open state)
  timeout: number;               // Time in ms before trying half-open state
  resetTimeout: number;          // Time in ms before resetting failure count
}

/**
 * Circuit Breaker for Redis operations
 * Prevents cascading failures when Redis is down
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 5,        // Open after 5 failures
      successThreshold: 2,        // Close after 2 successes in half-open
      timeout: 30000,            // 30 seconds before trying half-open
      resetTimeout: 60000,       // Reset failure count after 60 seconds
      ...config
    };
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    const now = Date.now();

    // Reset failure count if enough time has passed
    if (this.state === CircuitState.CLOSED && 
        this.failureCount > 0 && 
        now - this.lastFailureTime > this.config.resetTimeout) {
      this.failureCount = 0;
      logger.debug('Circuit breaker: Reset failure count');
    }

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Try half-open state after timeout
        if (now - this.lastFailureTime > this.config.timeout) {
          this.state = CircuitState.HALF_OPEN;
          this.successCount = 0;
          logger.info('Circuit breaker: Transitioning to HALF_OPEN state');
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info('Circuit breaker: Redis recovered, circuit CLOSED');
      }
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open, go back to open
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker: Redis still failing, circuit OPEN');
    } else if (this.state === CircuitState.CLOSED && 
               this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitState.OPEN;
      logger.error(`Circuit breaker: Too many failures (${this.failureCount}), circuit OPEN`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit breaker (for testing/admin)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker: Manually reset');
  }
}

// Cache utility class with production-ready patterns
export class CacheManager {
  private redis: Redis;
  private circuitBreaker: CircuitBreaker;

  constructor(redisInstance: Redis) {
    this.redis = redisInstance;
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Get data from cache with circuit breaker protection
   */
  async get<T>(key: string): Promise<T | null> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache get for key ${key}`);
      return null; // Fail fast when circuit is open
    }

    try {
      const cached = await this.redis.get(key);
      this.circuitBreaker.recordSuccess();
      
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        try {
          return JSON.parse(cached);
        } catch (parseError) {
          logger.error(`Cache parse error for key ${key} - corrupted data:`, parseError);
          // Delete corrupted cache entry to prevent repeated errors
          try {
            await this.redis.del(key);
          } catch (delError) {
            logger.error(`Failed to delete corrupted cache key ${key}:`, delError);
          }
          return null;
        }
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL and circuit breaker protection
   */
  async set<T = unknown>(key: string, data: T, ttl: number = 300): Promise<boolean> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache set for key ${key}`);
      return false; // Fail fast when circuit is open
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
      this.circuitBreaker.recordSuccess();
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache key with circuit breaker protection
   */
  async del(key: string): Promise<boolean> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache delete for key ${key}`);
      return false;
    }

    try {
      const result = await this.redis.del(key);
      this.circuitBreaker.recordSuccess();
      logger.debug(`Cache delete for key: ${key}, result: ${result}`);
      return result > 0;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * CRITICAL FIX: Use SCAN instead of KEYS for production
   * This prevents blocking Redis under load
   */
  async delPattern(pattern: string): Promise<number> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache deletePattern for ${pattern}`);
      return 0;
    }

    try {
      let cursor = '0';
      let totalDeleted = 0;
      const keysToDelete: string[] = [];

      // Use SCAN instead of KEYS (Netflix/Twitter best practice)
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH', pattern,
          'COUNT', 100  // Process 100 keys at a time
        );

        cursor = nextCursor;
        keysToDelete.push(...keys);

        // Delete in batches to avoid blocking
        if (keysToDelete.length >= 100) {
          const batch = keysToDelete.splice(0, 100);
          if (batch.length > 0) {
            const deleted = await this.redis.del(...batch);
            totalDeleted += deleted;
          }
        }
      } while (cursor !== '0');

      // Delete remaining keys
      if (keysToDelete.length > 0) {
        const deleted = await this.redis.del(...keysToDelete);
        totalDeleted += deleted;
      }

      this.circuitBreaker.recordSuccess();
      logger.debug(`Cache delete pattern: ${pattern}, deleted ${totalDeleted} keys`);
      return totalDeleted;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists with circuit breaker protection
   */
  async exists(key: string): Promise<boolean> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache exists check for key ${key}`);
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      this.circuitBreaker.recordSuccess();
      return result === 1;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment counter (for metrics/rate limiting)
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      if (ttl && result === 1) {
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once (pipeline for performance)
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache mget for ${keys.length} keys`);
      return keys.map(() => null);
    }

    try {
      const values = await this.redis.mget(...keys);
      const result = values.map((val, index) => {
        if (!val) return null;
        try {
          return JSON.parse(val);
        } catch (parseError) {
          logger.error(`Cache parse error for key ${keys[index]} - corrupted data:`, parseError);
          // Delete corrupted cache entry
          if (keys[index]) {
            this.redis.del(keys[index]).catch((delError) => {
              logger.error(`Failed to delete corrupted cache key ${keys[index]}:`, delError);
            });
          }
          return null;
        }
      });
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once (pipeline for performance)
   */
  async mset(entries: Array<{ key: string; value: unknown; ttl: number }>): Promise<boolean> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.debug(`Circuit breaker OPEN: Skipping cache mset for ${entries.length} keys`);
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const { key, value, ttl } of entries) {
        pipeline.setex(key, ttl, JSON.stringify(value));
      }

      await pipeline.exec();
      this.circuitBreaker.recordSuccess();
      logger.debug(`Cache mset for ${entries.length} keys`);
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics (includes circuit breaker metrics)
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: number;
    uptime: string;
    hits: number;
    misses: number;
    evictions: number;
    circuitBreaker?: {
      state: string;
      failureCount: number;
      successCount: number;
    };
  }> {
    // Always try to get stats, even if circuit is open (for monitoring)
    try {
      const info = await this.redis.info();

      const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';
      const keyspace = info.match(/db0:keys=(\d+)/)?.[1] || '0';
      const uptime = info.match(/uptime_in_seconds:(\d+)/)?.[1] || '0';

      // Cache hit/miss statistics
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const evictions = parseInt(info.match(/evicted_keys:(\d+)/)?.[1] || '0');

      const cbMetrics = this.circuitBreaker.getMetrics();
      return {
        connected: this.redis.status === 'ready' && this.circuitBreaker.getState() !== CircuitState.OPEN,
        memory,
        keyspace: parseInt(keyspace),
        uptime: `${Math.floor(parseInt(uptime) / 60)} minutes`,
        hits,
        misses,
        evictions,
        circuitBreaker: {
          state: cbMetrics.state,
          failureCount: cbMetrics.failureCount,
          successCount: cbMetrics.successCount,
        },
      };
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error('Cache stats error:', error);
      const cbMetrics = this.circuitBreaker.getMetrics();
      return {
        connected: false,
        memory: 'unknown',
        keyspace: 0,
        uptime: 'unknown',
        hits: 0,
        misses: 0,
        evictions: 0,
        circuitBreaker: {
          state: cbMetrics.state,
          failureCount: cbMetrics.failureCount,
          successCount: cbMetrics.successCount,
        },
      };
    }
  }

  /**
   * Health check for Docker/Kubernetes
   * Includes circuit breaker status
   */
  async healthCheck(): Promise<boolean> {
    // If circuit is open, we consider Redis unhealthy
    if (this.circuitBreaker.getState() === CircuitState.OPEN) {
      return false;
    }

    try {
      const result = await this.redis.ping();
      if (result === 'PONG') {
        this.circuitBreaker.recordSuccess();
        return true;
      }
      this.circuitBreaker.recordFailure();
      return false;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get circuit breaker metrics
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Manually reset circuit breaker (admin/testing)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get Redis instance for advanced operations
   */
  getRedis(): Redis {
    return this.redis;
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushall();
      logger.warn('⚠️ Cache flushed - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }
}

// Export cache manager instance
export const cacheManager = new CacheManager(redis);
