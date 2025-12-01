import { cacheManager } from '../../lib/redis/redis';
  import { CacheStampedeProtection } from '../../lib/cache/cacheStampede';
import Logger from '../../utils/Logger/logger';
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
  TRANSLATION: 'translation',
} as const;

export interface CacheOptions {
  ttl?: number;
  stampedeProtection?: boolean;
  staleWhileRevalidate?: boolean;
  shared?: boolean;  // If true, don't include userId in key
}

export class CacheService {
  /**
   * Sanitize cache key component to prevent injection attacks
   * Removes dangerous characters and limits length
   */
  private sanitizeKeyComponent(value: string, maxLength: number = 255): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Remove dangerous characters: colons (used as separators), newlines, control chars
    // Allow alphanumeric, hyphens, underscores, and dots
    const sanitized = value
      .replace(/[:\r\n\t\0]/g, '') // Remove colons and whitespace chars
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe chars
      .substring(0, maxLength); // Limit length

    return sanitized;
  }

  /**
   * Validate cache key component
   */
  private validateKeyComponent(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /__proto__/i,
      /constructor/i,
      /prototype/i,
      /<script/i,
      /javascript:/i,
      /\.\./, // Path traversal attempts
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Generate versioned cache key with input validation
   * Format: v{version}:{prefix}:{scope}:{identifier}:{queryHash}
   * 
   * All inputs are validated and sanitized to prevent cache key injection attacks
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
    // Validate and sanitize prefix
    if (!prefix || typeof prefix !== 'string') {
      Logger.warn('Invalid prefix provided to generateKey, using fallback');
      prefix = 'unknown';
    }
    prefix = this.sanitizeKeyComponent(prefix, 50);
    if (!this.validateKeyComponent(prefix)) {
      Logger.warn('Suspicious prefix detected in generateKey, using fallback');
      prefix = 'unknown';
    }

    // Validate and sanitize identifier
    if (!identifier || typeof identifier !== 'string') {
      Logger.warn('Invalid identifier provided to generateKey');
      identifier = 'unknown';
    }
    identifier = this.sanitizeKeyComponent(identifier, 255);
    if (!this.validateKeyComponent(identifier)) {
      Logger.warn('Suspicious identifier detected in generateKey');
      identifier = 'unknown';
    }

    const parts = [CACHE_VERSION, prefix];

    // Shared cache: don't include userId (higher hit rate)
    if (!options.shared && options.userId) {
      const sanitizedUserId = this.sanitizeKeyComponent(options.userId, 100);
      if (sanitizedUserId && this.validateKeyComponent(sanitizedUserId)) {
        parts.push(`user:${sanitizedUserId}`);
      } else {
        Logger.warn('Invalid or suspicious userId in generateKey, skipping user scope');
      }
    }

    if (options.businessId) {
      const sanitizedBusinessId = this.sanitizeKeyComponent(options.businessId, 100);
      if (sanitizedBusinessId && this.validateKeyComponent(sanitizedBusinessId)) {
        parts.push(`biz:${sanitizedBusinessId}`);
      } else {
        Logger.warn('Invalid or suspicious businessId in generateKey, skipping business scope');
      }
    }

    parts.push(identifier);

    if (options.queryHash) {
      // Query hash should already be a hash (hex string), but validate it
      const sanitizedHash = this.sanitizeKeyComponent(options.queryHash, 64);
      if (sanitizedHash && /^[a-f0-9]+$/i.test(sanitizedHash)) {
        parts.push(sanitizedHash);
      } else {
        Logger.warn('Invalid queryHash format in generateKey, skipping');
      }
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
      Logger.error(`Cache set error for key ${key}:`, error);
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
      Logger.error(`Cache delete error for key ${key}:`, error);
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
      Logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate business cache (all related data)
   */
  async invalidateBusiness(businessId?: string, userId?: string): Promise<number> {
    if (!businessId) {
      Logger.warn('invalidateBusiness called without businessId');
      return 0;
    }

    Logger.info(`Invalidating cache for business: ${businessId}`);

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
      Logger.info(`Invalidated ${total} business cache entries`, { businessId, userId });
      return total;
    } catch (error) {
      Logger.error('Failed to invalidate business cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate service cache
   */
  async invalidateService(serviceId?: string, businessId?: string, userId?: string): Promise<number> {
    Logger.info(`Invalidating cache for service: ${serviceId}`, { businessId });

    try {
      let totalDeleted = 0;

      if (serviceId) {
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.SERVICE}:*${serviceId}*`);
      }

      // Also invalidate business services cache
      if (businessId) {
        totalDeleted += await this.deletePattern(`${CACHE_VERSION}:${CachePrefix.SERVICE}:*biz:${businessId}*`);
      }

      Logger.info(`Invalidated ${totalDeleted} service cache entries`, { serviceId, businessId, userId });
      return totalDeleted;
    } catch (error) {
      Logger.error('Failed to invalidate service cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate appointment cache
   */
  async invalidateAppointment(appointmentId?: string, businessId?: string, userId?: string): Promise<number> {
    Logger.info(`Invalidating cache for appointment: ${appointmentId}`, { businessId });

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

      Logger.info(`Invalidated ${totalDeleted} appointment cache entries`, { appointmentId, businessId, userId });
      return totalDeleted;
    } catch (error) {
      Logger.error('Failed to invalidate appointment cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<number> {
    Logger.info(`Invalidating cache for user: ${userId}`);

    try {
      const totalDeleted = await this.deletePattern(`${CACHE_VERSION}:*user:${userId}*`);
      Logger.info(`Invalidated ${totalDeleted} user cache entries`, { userId });
      return totalDeleted;
    } catch (error) {
      Logger.error('Failed to invalidate user cache:', error);
      return 0;
    }
  }

  /**
   * Clear all cache (DANGEROUS!)
   */
  async clearAll(): Promise<number> {
    Logger.warn('⚠️ Clearing ALL cache - this is destructive!');

    try {
      const deleted = await this.deletePattern(`${CACHE_VERSION}:*`);
      Logger.warn(`Cleared ${deleted} cache entries`);
      return deleted;
    } catch (error) {
      Logger.error('Failed to clear all cache:', error);
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
    Logger.info('Warming cache with frequently accessed data');

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
    Logger.info('Cache warming completed');
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
      Logger.error('Failed to get cache stats:', error);
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
      Logger.error('Cache health check failed:', error);
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
