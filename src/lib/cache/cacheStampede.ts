import redis from '../redis/redis';
import logger from '../../utils/Logger/logger';

/**
 * Cache Stampede Protection (Netflix/Twitter Pattern)
 *
 * Prevents thundering herd problem where many requests simultaneously
 * try to regenerate the same cache entry.
 *
 * How it works:
 * 1. First request gets a lock and regenerates cache
 * 2. Subsequent requests wait and retry reading from cache
 * 3. Lock expires after timeout to prevent deadlocks
 */

export interface CacheStampedeOptions {
  lockTimeout?: number;      // Lock expiration in seconds (default: 10s)
  maxRetries?: number;        // Max retries for waiting requests (default: 5)
  retryDelay?: number;        // Delay between retries in ms (default: 100ms)
  staleWhileRevalidate?: boolean;  // Return stale data while regenerating
}

export class CacheStampedeProtection {
  /**
   * Get value from cache with stampede protection
   *
   * @param key - Cache key
   * @param fetchFunction - Function to fetch data if cache miss
   * @param ttl - Time to live in seconds
   * @param options - Stampede protection options
   */
  static async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number,
    options: CacheStampedeOptions = {}
  ): Promise<T | null> {
    const {
      lockTimeout = 10,
      maxRetries = 5,
      retryDelay = 100,
      staleWhileRevalidate = false
    } = options;

    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        logger.error(`Cache parse error for key ${key}:`, error);
        // Continue to fetch fresh data
      }
    }

    // If stale-while-revalidate, check for stale data
    if (staleWhileRevalidate && cached) {
      // Return stale data immediately
      // Regenerate in background (fire and forget)
      setImmediate(async () => {
        try {
          await this.regenerateCache(key, fetchFunction, ttl, lockTimeout);
        } catch (error) {
          logger.error(`Background cache regeneration failed for ${key}:`, error);
        }
      });

      try {
        return JSON.parse(cached);
      } catch {
        // Fall through to normal fetch
      }
    }

    // Try to acquire lock
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}`;

    const gotLock = await redis.set(lockKey, lockValue, 'EX', lockTimeout, 'NX');

    if (gotLock === 'OK') {
      // We got the lock - fetch and cache the data
      try {
        const data = await fetchFunction();

        // Cache the result
        await redis.setex(key, ttl, JSON.stringify(data));

        logger.debug(`Cache regenerated for key: ${key}`);

        return data;
      } catch (error) {
        logger.error(`Error fetching data for cache key ${key}:`, error);
        throw error;
      } finally {
        // Release lock (only if we still own it)
        const currentLock = await redis.get(lockKey);
        if (currentLock === lockValue) {
          await redis.del(lockKey);
        }
      }
    } else {
      // Another request is already fetching - wait and retry
      logger.debug(`Waiting for cache regeneration: ${key}`);

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Wait before retry
        await this.sleep(retryDelay * (attempt + 1)); // Exponential backoff

        // Try to get from cache again
        const retryCache = await redis.get(key);
        if (retryCache) {
          try {
            logger.debug(`Cache hit after waiting: ${key} (attempt ${attempt + 1})`);
            return JSON.parse(retryCache);
          } catch (error) {
            logger.error(`Cache parse error on retry for key ${key}:`, error);
          }
        }

        // Check if lock is still held
        const lockExists = await redis.exists(lockKey);
        if (!lockExists) {
          // Lock released but no cache - try to acquire lock ourselves
          const retryLock = await redis.set(lockKey, `${Date.now()}`, 'EX', lockTimeout, 'NX');
          if (retryLock === 'OK') {
            try {
              const data = await fetchFunction();
              await redis.setex(key, ttl, JSON.stringify(data));
              await redis.del(lockKey);
              logger.debug(`Cache regenerated after retry: ${key}`);
              return data;
            } catch (error) {
              await redis.del(lockKey);
              throw error;
            }
          }
        }
      }

      // Max retries exceeded - fetch without caching
      logger.warn(`Max retries exceeded for cache key: ${key}, fetching without cache`);
      return await fetchFunction();
    }
  }

  /**
   * Regenerate cache with lock (background operation)
   */
  private static async regenerateCache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number,
    lockTimeout: number
  ): Promise<void> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}`;

    const gotLock = await redis.set(lockKey, lockValue, 'EX', lockTimeout, 'NX');

    if (gotLock === 'OK') {
      try {
        const data = await fetchFunction();
        await redis.setex(key, ttl, JSON.stringify(data));
      } finally {
        const currentLock = await redis.get(lockKey);
        if (currentLock === lockValue) {
          await redis.del(lockKey);
        }
      }
    }
  }

  /**
   * Sleep helper
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch get with stampede protection
   * Optimized for fetching multiple keys at once
   */
  static async mget<T>(
    keys: string[],
    fetchFunction: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttl: number,
    options: CacheStampedeOptions = {}
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missingKeys: string[] = [];

    // Try to get all keys from cache
    const cached = await redis.mget(...keys);

    keys.forEach((key, index) => {
      if (cached[index]) {
        try {
          result.set(key, JSON.parse(cached[index]!));
        } catch (error) {
          logger.error(`Cache parse error for key ${key}:`, error);
          missingKeys.push(key);
        }
      } else {
        missingKeys.push(key);
      }
    });

    // If all keys found, return
    if (missingKeys.length === 0) {
      return result;
    }

    // Fetch missing keys with stampede protection
    const lockKey = `lock:batch:${missingKeys.join(':')}`;
    const lockValue = `${Date.now()}`;

    const gotLock = await redis.set(lockKey, lockValue, 'EX', options.lockTimeout || 10, 'NX');

    if (gotLock === 'OK') {
      try {
        // Fetch missing data
        const freshData = await fetchFunction(missingKeys);

        // Cache each result
        const pipeline = redis.pipeline();
        freshData.forEach((value, key) => {
          pipeline.setex(key, ttl, JSON.stringify(value));
          result.set(key, value);
        });
        await pipeline.exec();

        logger.debug(`Batch cache regenerated for ${missingKeys.length} keys`);
      } finally {
        const currentLock = await redis.get(lockKey);
        if (currentLock === lockValue) {
          await redis.del(lockKey);
        }
      }
    } else {
      // Wait and retry
      await this.sleep(options.retryDelay || 100);

      const retryCache = await redis.mget(...missingKeys);
      missingKeys.forEach((key, index) => {
        if (retryCache[index]) {
          try {
            result.set(key, JSON.parse(retryCache[index]!));
          } catch (error) {
            logger.error(`Cache parse error on retry for key ${key}:`, error);
          }
        }
      });
    }

    return result;
  }

  /**
   * Check if a key is being regenerated (locked)
   */
  static async isLocked(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    return await redis.exists(lockKey) === 1;
  }

  /**
   * Manually release a lock (emergency use only)
   */
  static async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await redis.del(lockKey);
    logger.warn(`Manually released lock for key: ${key}`);
  }

  /**
   * Get lock statistics (for monitoring)
   */
  static async getLockStats(): Promise<{
    activeLocks: number;
    lockKeys: string[];
  }> {
    const keys = await redis.keys('lock:*');
    return {
      activeLocks: keys.length,
      lockKeys: keys
    };
  }
}

// Export for easy use
export const cacheWithStampedeProtection = CacheStampedeProtection.get.bind(CacheStampedeProtection);
