import Redis from 'ioredis';
import { config } from '../../config/environment';
import logger from '../../utils/Logger/logger';

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

// Cache utility class with production-ready patterns
export class CacheManager {
  private redis: Redis;

  constructor(redisInstance: Redis) {
    this.redis = redisInstance;
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached);
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  async set<T = unknown>(key: string, data: T, ttl: number = 300): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      logger.debug(`Cache delete for key: ${key}, result: ${result}`);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * CRITICAL FIX: Use SCAN instead of KEYS for production
   * This prevents blocking Redis under load
   */
  async delPattern(pattern: string): Promise<number> {
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

      logger.debug(`Cache delete pattern: ${pattern}, deleted ${totalDeleted} keys`);
      return totalDeleted;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
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
    try {
      const values = await this.redis.mget(...keys);
      return values.map(val => val ? JSON.parse(val) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once (pipeline for performance)
   */
  async mset(entries: Array<{ key: string; value: unknown; ttl: number }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();

      for (const { key, value, ttl } of entries) {
        pipeline.setex(key, ttl, JSON.stringify(value));
      }

      await pipeline.exec();
      logger.debug(`Cache mset for ${entries.length} keys`);
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: number;
    uptime: string;
    hits: number;
    misses: number;
    evictions: number;
  }> {
    try {
      const info = await this.redis.info();

      const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';
      const keyspace = info.match(/db0:keys=(\d+)/)?.[1] || '0';
      const uptime = info.match(/uptime_in_seconds:(\d+)/)?.[1] || '0';

      // Cache hit/miss statistics
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const evictions = parseInt(info.match(/evicted_keys:(\d+)/)?.[1] || '0');

      return {
        connected: this.redis.status === 'ready',
        memory,
        keyspace: parseInt(keyspace),
        uptime: `${Math.floor(parseInt(uptime) / 60)} minutes`,
        hits,
        misses,
        evictions,
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {
        connected: false,
        memory: 'unknown',
        keyspace: 0,
        uptime: 'unknown',
        hits: 0,
        misses: 0,
        evictions: 0,
      };
    }
  }

  /**
   * Health check for Docker/Kubernetes
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
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
