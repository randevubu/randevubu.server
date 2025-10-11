import redis, { cacheManager } from '../lib/redis/redis';
import { CacheStampedeProtection } from '../lib/cache/cacheStampede';
import logger from '../utils/Logger/logger';

/**
 * Production-Ready Cache Service (Netflix/Airbnb/Twitter Pattern)
 *
 * Features:
 * - Versioned cache keys (schema changes don't break cache)
 * - Stampede protection (no thundering herd)
 * - Shared cache keys (high hit rate)
 * - Proper TTL values based on data volatility
 * - Cache metrics and monitoring
 */

// Cache version - increment when schema changes
const CACHE_VERSION = 'v2';

// TTL Constants (Netflix-style, based on data volatility)
export const CacheTTL = {
  // Static data (changes rarely)
  STATIC: 24 * 60 * 60,           // 24 hours - business types, categories

  // Semi-static data (changes occasionally)
  SEMI_STATIC: 60 * 60,           // 1 hour - services, business info

  // Dynamic data (changes frequently)
  DYNAMIC: 5 * 60,                // 5 minutes - appointments (READ operations)
  DYNAMIC_SHORT: 60,              // 1 minute - appointments (after WRITE)

  // Real-time data (changes constantly)
  REALTIME: 30,                   // 30 seconds - monitor displays
  REALTIME_SHORT: 10,             // 10 seconds - live queues

  // User session data
  SESSION: 15 * 60,               // 15 minutes

  // Search results
  SEARCH: 10 * 60,                // 10 minutes

  // Analytics/Stats
  STATS: 30 * 60,                 // 30 minutes
} as const;

// Cache key prefixes
export const CachePrefix = {
  BUSINESS: 'business',
  SERVICE: 'service',
  APPOINTMENT: 'appointment',
  USER: 'user',
  BUSINESS_TYPE: 'business_type',
  STATS: 'stats',
  SEARCH: 'search',
  MONITOR: 'monitor',
} as const;

export interface CacheOptions {
  ttl?: number;
  stampedeProtection?: boolean;
  staleWhileRevalidate?: boolean;
  shared?: boolean;  // If true, don't include userId in key
}

export class CacheService {
  /**
   * Generate versioned cache key
   * Format: v{version}:{prefix}:{scope}:{identifier}:{queryHash}
   */
  generateKey(
    prefix: string,
    identifier: string,
    options: {
      userId?: string;
      businessId?: string;
      queryHash?: string;
      shared?: boolean;
    } = {}
  ): string {
    const parts = [CACHE_VERSION, prefix];

    // Shared cache: don't include userId (higher hit rate)
    if (!options.shared && options.userId) {
      parts.push(`user:${options.userId}`);
    }

    if (options.businessId) {
      parts.push(`biz:${options.businessId}`);
    }

    parts.push(identifier);

    if (options.queryHash) {
      parts.push(options.queryHash);
    }

    return parts.join(':');
  }

  /**
   * Get from cache with stampede protection
   */
  async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const {
      ttl = CacheTTL.DYNAMIC,
      stampedeProtection = true,
      staleWhileRevalidate = false,
    } = options;

    if (stampedeProtection) {
      return await CacheStampedeProtection.get(
        key,
        fetchFunction,
        ttl,
        { staleWhileRevalidate }
      );
    }

    // Simple cache without stampede protection
    const cached = await cacheManager.get<T>(key);
    if (cached) {
      return cached;
    }

    const data = await fetchFunction();
    await cacheManager.set(key, data, ttl);
    return data;
  }

  /**
   * Set cache value
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = CacheTTL.DYNAMIC
  ): Promise<boolean> {
    try {
      return await cacheManager.set(key, value, ttl);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      return await cacheManager.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern (uses SCAN - non-blocking)
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      return await cacheManager.delPattern(pattern);
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate business cache (all related data)
   */
  async invalidateBusiness(businessId?: string, userId?: string): Promise<number> {
    if (!businessId) {
      logger.warn('invalidateBusiness called without businessId');
      return 0;
    }

    logger.info(`Invalidating cache for business: ${businessId}`);

    try {
      // Delete all business-related cache
      const totalDeleted = await Promise.all([
        this.deletePattern(`${CACHE_VERSION}:${CachePrefix.BUSINESS}:*biz:${businessId}*`),
        this.deletePattern(`${CACHE_VERSION}:${CachePrefix.SERVICE}:*biz:${businessId}*`),
        this.deletePattern(`${CACHE_VERSION}:${CachePrefix.APPOINTMENT}:*biz:${businessId}*`),
        this.deletePattern(`${CACHE_VERSION}:${CachePrefix.STATS}:*biz:${businessId}*`),
        this.deletePattern(`${CACHE_VERSION}:${CachePrefix.MONITOR}:*${businessId}*`),
      ]);

      const total = totalDeleted.reduce((sum, count) => sum + count, 0);
      logger.info(`Invalidated ${total} business cache entries`, { businessId, userId });
      return total;
    } catch (error) {
      logger.error('Failed to invalidate business cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate service cache
   */
  async invalidateService(serviceId?: string, businessId?: string, userId?: string): Promise<number> {
    logger.info(`Invalidating cache for service: ${serviceId}`, { businessId });

    try {
      let totalDeleted = 0;

      if (serviceId) {
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.SERVICE}:*${serviceId}*`);
      }

      // Also invalidate business services cache
      if (businessId) {
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.SERVICE}:*biz:${businessId}*`);
      }

      logger.info(`Invalidated ${totalDeleted} service cache entries`, { serviceId, businessId, userId });
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to invalidate service cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate appointment cache
   */
  async invalidateAppointment(appointmentId?: string, businessId?: string, userId?: string): Promise<number> {
    logger.info(`Invalidating cache for appointment: ${appointmentId}`, { businessId });

    try {
      let totalDeleted = 0;

      if (appointmentId) {
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.APPOINTMENT}:*${appointmentId}*`);
      }

      // Invalidate business appointments cache
      if (businessId) {
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.APPOINTMENT}:*biz:${businessId}*`);
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.MONITOR}:*${businessId}*`);
      }

      logger.info(`Invalidated ${totalDeleted} appointment cache entries`, { appointmentId, businessId, userId });
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to invalidate appointment cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<number> {
    logger.info(`Invalidating cache for user: ${userId}`);

    try {
      const totalDeleted = await this.deletePattern(`${CACHE_VERSION}:*user:${userId}*`);
      logger.info(`Invalidated ${totalDeleted} user cache entries`, { userId });
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to invalidate user cache:', error);
      return 0;
    }
  }

  /**
   * Clear all cache (DANGEROUS!)
   */
  async clearAll(): Promise<number> {
    logger.warn('⚠️ Clearing ALL cache - this is destructive!');

    try {
      const deleted = await this.deletePattern(`${CACHE_VERSION}:*`);
      logger.warn(`Cleared ${deleted} cache entries`);
      return deleted;
    } catch (error) {
      logger.error('Failed to clear all cache:', error);
      return 0;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   * (Netflix/Airbnb pattern)
   */
  async warmCache(data: {
    businessTypes?: unknown[];
    popularServices?: unknown[];
    featuredBusinesses?: unknown[];
  }): Promise<void> {
    logger.info('Warming cache with frequently accessed data');

    const promises: Promise<boolean>[] = [];

    if (data.businessTypes) {
      const key = this.generateKey(CachePrefix.BUSINESS_TYPE, 'all', { shared: true });
      promises.push(this.set(key, data.businessTypes, CacheTTL.STATIC));
    }

    if (data.popularServices) {
      const key = this.generateKey(CachePrefix.SERVICE, 'popular', { shared: true });
      promises.push(this.set(key, data.popularServices, CacheTTL.SEMI_STATIC));
    }

    if (data.featuredBusinesses) {
      const key = this.generateKey(CachePrefix.BUSINESS, 'featured', { shared: true });
      promises.push(this.set(key, data.featuredBusinesses, CacheTTL.SEMI_STATIC));
    }

    await Promise.all(promises);
    logger.info('Cache warming completed');
  }

  /**
   * Get cache metrics (for monitoring)
   */
  async getMetrics(): Promise<{
    redis: {
      connected: boolean;
      memory: string;
      keyspace: number;
      hits: number;
      misses: number;
      evictions: number;
      hitRate: number;
    };
    locks: {
      active: number;
      keys: string[];
    };
  }> {
    const redisStats = await cacheManager.getStats();
    const lockStats = await CacheStampedeProtection.getLockStats();

    const hitRate = redisStats.hits + redisStats.misses > 0
      ? (redisStats.hits / (redisStats.hits + redisStats.misses)) * 100
      : 0;

    return {
      redis: {
        ...redisStats,
        hitRate: Math.round(hitRate * 100) / 100,
      },
      locks: {
        active: lockStats.activeLocks,
        keys: lockStats.lockKeys,
      },
    };
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      return await cacheManager.getStats();
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
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
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await cacheManager.healthCheck();
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for monitoring dashboard
   */
  async getStatistics(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
    lockedKeys: number;
  }> {
    const metrics = await this.getMetrics();

    return {
      totalKeys: metrics.redis.keyspace,
      memoryUsage: metrics.redis.memory,
      hitRate: metrics.redis.hitRate,
      lockedKeys: metrics.locks.active,
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();
