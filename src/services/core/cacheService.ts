import type { CacheManager } from '../../lib/redis/redis';
import type { ILogger } from '../../utils/Logger/types';
import client from 'prom-client';
import { register } from '../../utils/metrics';
/**
 * Production-Ready Cache Service (Netflix/Airbnb/Twitter Pattern)
 *
 * Features:
 * - Versioned cache keys (schema changes don't break cache)
 * - Stampede protection (no thundering herd)
 * - Shared cache keys (high hit rate)
 * - Proper TTL values based on data volatility
 * - Cache metrics and monitoring
 * - Dependency injection for testability
 * - Prometheus metrics integration
 */

// ============================================================================
// Prometheus Metrics
// ============================================================================

const cacheHitCounter = new client.Counter({
  name: 'randevubu_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['prefix'],
  registers: [register],
});

const cacheMissCounter = new client.Counter({
  name: 'randevubu_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['prefix'],
  registers: [register],
});

const cacheErrorCounter = new client.Counter({
  name: 'randevubu_cache_errors_total',
  help: 'Total number of cache errors',
  labelNames: ['operation', 'prefix'],
  registers: [register],
});

const cacheOperationDuration = new client.Histogram({
  name: 'randevubu_cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['operation', 'prefix'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const cacheInvalidationCounter = new client.Counter({
  name: 'randevubu_cache_invalidations_total',
  help: 'Total number of cache invalidations',
  labelNames: ['type'],
  registers: [register],
});

// Cache version - increment when schema changes
const CACHE_VERSION = 'v2';

// TTL Constants (Netflix-style, based on data volatility)
export const CacheTTL = {
  // Static data (changes rarely)
  STATIC: 24 * 60 * 60, // 24 hours - business types, categories

  // Semi-static data (changes occasionally)
  SEMI_STATIC: 60 * 60, // 1 hour - services, business info

  // Dynamic data (changes frequently)
  DYNAMIC: 5 * 60, // 5 minutes - appointments (READ operations)
  DYNAMIC_SHORT: 60, // 1 minute - appointments (after WRITE)

  // Real-time data (changes constantly)
  REALTIME: 30, // 30 seconds - monitor displays
  REALTIME_SHORT: 10, // 10 seconds - live queues

  // User session data
  SESSION: 15 * 60, // 15 minutes

  // Search results
  SEARCH: 10 * 60, // 10 minutes

  // Analytics/Stats
  STATS: 30 * 60, // 30 minutes
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
  shared?: boolean; // If true, don't include userId in key
}

export class CacheService {
  constructor(
    private readonly cacheManager: CacheManager,
    private readonly logger: ILogger,
    private readonly stampedeProtection: typeof import('../../lib/cache/cacheStampede').CacheStampedeProtection
  ) {}

  /**
   * Add jitter to TTL to prevent thundering herd
   * (Google/Facebook pattern)
   */
  private addJitter(ttl: number, jitterPercent: number = 10): number {
    const jitter = ttl * (jitterPercent / 100);
    return Math.floor(ttl + Math.random() * jitter - jitter / 2);
  }

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

    return !suspiciousPatterns.some((pattern) => pattern.test(value));
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
      this.logger.warn('Invalid prefix provided to generateKey, using fallback');
      prefix = 'unknown';
    }
    prefix = this.sanitizeKeyComponent(prefix, 50);
    if (!this.validateKeyComponent(prefix)) {
      this.logger.warn('Suspicious prefix detected in generateKey, using fallback');
      prefix = 'unknown';
    }

    // Validate and sanitize identifier
    if (!identifier || typeof identifier !== 'string') {
      this.logger.warn('Invalid identifier provided to generateKey');
      identifier = 'unknown';
    }
    identifier = this.sanitizeKeyComponent(identifier, 255);
    if (!this.validateKeyComponent(identifier)) {
      this.logger.warn('Suspicious identifier detected in generateKey');
      identifier = 'unknown';
    }

    const parts = [CACHE_VERSION, prefix];

    // Shared cache: don't include userId (higher hit rate)
    if (!options.shared && options.userId) {
      const sanitizedUserId = this.sanitizeKeyComponent(options.userId, 100);
      if (sanitizedUserId && this.validateKeyComponent(sanitizedUserId)) {
        parts.push(`user:${sanitizedUserId}`);
      } else {
        this.logger.warn('Invalid or suspicious userId in generateKey, skipping user scope');
      }
    }

    if (options.businessId) {
      const sanitizedBusinessId = this.sanitizeKeyComponent(options.businessId, 100);
      if (sanitizedBusinessId && this.validateKeyComponent(sanitizedBusinessId)) {
        parts.push(`biz:${sanitizedBusinessId}`);
      } else {
        this.logger.warn(
          'Invalid or suspicious businessId in generateKey, skipping business scope'
        );
      }
    }

    parts.push(identifier);

    if (options.queryHash) {
      // Query hash should already be a hash (hex string), but validate it
      const sanitizedHash = this.sanitizeKeyComponent(options.queryHash, 64);
      if (sanitizedHash && /^[a-f0-9]+$/i.test(sanitizedHash)) {
        parts.push(sanitizedHash);
      } else {
        this.logger.warn('Invalid queryHash format in generateKey, skipping');
      }
    }

    return parts.join(':');
  }

  /**
   * Get from cache with stampede protection and metrics
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

    // Extract prefix from key for metrics
    const prefix = key.split(':')[1] || 'unknown';
    const end = cacheOperationDuration.startTimer({ operation: 'get', prefix });

    try {
      if (stampedeProtection) {
        const result = await this.stampedeProtection.get(key, fetchFunction, ttl, {
          staleWhileRevalidate,
        });

        if (result !== null) {
          cacheHitCounter.inc({ prefix });
        } else {
          cacheMissCounter.inc({ prefix });
        }

        end();
        return result;
      }

      // Simple cache without stampede protection
      const cached = await this.cacheManager.get<T>(key);
      if (cached) {
        cacheHitCounter.inc({ prefix });
        end();
        return cached;
      }

      cacheMissCounter.inc({ prefix });
      const data = await fetchFunction();
      await this.set(key, data, ttl, prefix);
      end();
      return data;
    } catch (error) {
      cacheErrorCounter.inc({ operation: 'get', prefix });
      this.logger.error(`Cache get error for key ${key}:`, error);
      end();
      throw error;
    }
  }

  /**
   * Set cache value with TTL jitter
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = CacheTTL.DYNAMIC,
    prefix: string = 'unknown'
  ): Promise<boolean> {
    const end = cacheOperationDuration.startTimer({ operation: 'set', prefix });
    try {
      const ttlWithJitter = this.addJitter(ttl);
      const result = await this.cacheManager.set(key, value, ttlWithJitter);
      end();
      return result;
    } catch (error) {
      cacheErrorCounter.inc({ operation: 'set', prefix });
      this.logger.error(`Cache set error for key ${key}:`, error);
      end();
      return false;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      return await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern (uses SCAN - non-blocking)
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      return await this.cacheManager.delPattern(pattern);
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate business cache (all related data)
   * @param businessId - Required business ID
   * @param userId - Optional user ID for logging context
   */
  async invalidateBusiness(businessId: string, userId?: string): Promise<number> {
    this.logger.info(`Invalidating cache for business: ${businessId}`);
    cacheInvalidationCounter.inc({ type: 'business' });

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
      this.logger.info(`Invalidated ${total} business cache entries`, { businessId, userId });
      return total;
    } catch (error) {
      this.logger.error('Failed to invalidate business cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate service cache
   * @param serviceId - Required service ID
   * @param businessId - Optional business ID for broader invalidation
   * @param userId - Optional user ID for logging context
   */
  async invalidateService(
    serviceId: string,
    businessId?: string,
    userId?: string
  ): Promise<number> {
    this.logger.info(`Invalidating cache for service: ${serviceId}`, { businessId });
    cacheInvalidationCounter.inc({ type: 'service' });

    try {
      let totalDeleted = 0;

      totalDeleted += await this.deletePattern(
        `${CACHE_VERSION}:${CachePrefix.SERVICE}:*${serviceId}*`
      );

      // Also invalidate business services cache
      if (businessId) {
        totalDeleted += await this.deletePattern(
          `${CACHE_VERSION}:${CachePrefix.SERVICE}:*biz:${businessId}*`
        );
      }

      this.logger.info(`Invalidated ${totalDeleted} service cache entries`, {
        serviceId,
        businessId,
        userId,
      });
      return totalDeleted;
    } catch (error) {
      this.logger.error('Failed to invalidate service cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate appointment cache
   * @param appointmentId - Required appointment ID
   * @param businessId - Optional business ID for broader invalidation
   * @param userId - Optional user ID for logging context
   */
  async invalidateAppointment(
    appointmentId: string,
    businessId?: string,
    userId?: string
  ): Promise<number> {
    this.logger.info(`Invalidating cache for appointment: ${appointmentId}`, { businessId });
    cacheInvalidationCounter.inc({ type: 'appointment' });

    try {
      let totalDeleted = 0;

      totalDeleted += await this.deletePattern(
        `${CACHE_VERSION}:${CachePrefix.APPOINTMENT}:*${appointmentId}*`
      );

      // Invalidate business appointments cache
      if (businessId) {
        totalDeleted += await this.deletePattern(
          `${CACHE_VERSION}:${CachePrefix.APPOINTMENT}:*biz:${businessId}*`
        );
        totalDeleted += await this.deletePattern(
          `${CACHE_VERSION}:${CachePrefix.MONITOR}:*${businessId}*`
        );
      }

      this.logger.info(`Invalidated ${totalDeleted} appointment cache entries`, {
        appointmentId,
        businessId,
        userId,
      });
      return totalDeleted;
    } catch (error) {
      this.logger.error('Failed to invalidate appointment cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<number> {
    this.logger.info(`Invalidating cache for user: ${userId}`);
    cacheInvalidationCounter.inc({ type: 'user' });

    try {
      const totalDeleted = await this.deletePattern(`${CACHE_VERSION}:*user:${userId}*`);
      this.logger.info(`Invalidated ${totalDeleted} user cache entries`, { userId });
      return totalDeleted;
    } catch (error) {
      this.logger.error('Failed to invalidate user cache:', error);
      return 0;
    }
  }

  /**
   * Clear all cache (DANGEROUS!)
   */
  async clearAll(): Promise<number> {
    this.logger.warn('⚠️ Clearing ALL cache - this is destructive!');

    try {
      const deleted = await this.deletePattern(`${CACHE_VERSION}:*`);
      this.logger.warn(`Cleared ${deleted} cache entries`);
      return deleted;
    } catch (error) {
      this.logger.error('Failed to clear all cache:', error);
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
    this.logger.info('Warming cache with frequently accessed data');

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
    this.logger.info('Cache warming completed');
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
    const redisStats = await this.cacheManager.getStats();
    const lockStats = await this.stampedeProtection.getLockStats();

    const hitRate =
      redisStats.hits + redisStats.misses > 0
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
      return await this.cacheManager.getStats();
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
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
      return await this.cacheManager.healthCheck();
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
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

// No singleton export - use ServiceContainer for instantiation
