import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { cacheManager } from '../lib/redis/redis';
import { CachedRequest, CacheConfig, CacheResponse } from '../types/cache';
import { CacheKeyGenerator } from '../utils/cacheKeyGenerator';
import { CacheUtils } from '../utils/cacheUtils';
import logger from '../utils/Logger/logger';

// Cache categories with different TTLs
export const CACHE_CATEGORIES = {
  STATIC: { ttl: 3600, keyPrefix: 'static' },      // 1 hour
  SEMI_DYNAMIC: { ttl: 300, keyPrefix: 'semi' },   // 5 minutes  
  DYNAMIC: { ttl: 60, keyPrefix: 'dynamic' },      // 1 minute
  REAL_TIME: { ttl: 0, keyPrefix: 'realtime' }     // No cache
} as const;

/**
 * Generate cache key with user context - SECURE & OPTIMIZED
 */
function generateCacheKey(req: CachedRequest, config: CacheConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(req);
  }

  const prefix = config.keyPrefix || 'api';
  const userId = CacheUtils.getUserId(req);
  const businessId = CacheUtils.getBusinessId(req);
  
  // Use secure key generation
  const cacheKey = CacheKeyGenerator.generateCacheKey(
    prefix,
    userId,
    businessId,
    req.path,
    req.query
  );
  
  // Validate key for security
  if (!CacheKeyGenerator.validateCacheKey(cacheKey)) {
    logger.warn('Invalid cache key generated, using fallback', { 
      path: req.path, 
      userId, 
      businessId 
    });
    return `${prefix}:${userId}:${businessId}:${req.path.replace(/\/$/, '')}`;
  }
  
  return cacheKey;
}

/**
 * Main caching middleware
 */
export const cache = (config: CacheConfig = {}) => {
  return async (req: CachedRequest, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if cache should be skipped
    if (config.skipCache && config.skipCache(req)) {
      logger.debug(`Cache skipped for ${req.path}`);
      return next();
    }

    // Skip if TTL is 0 (real-time data)
    if (config.ttl === 0) {
      logger.debug(`Cache skipped for ${req.path} - real-time data`);
      return next();
    }

    try {
      const cacheKey = generateCacheKey(req, config);
      
      // Try to get from cache with circuit breaker
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for ${req.path}`, { cacheKey, ttl: config.ttl });
        
        // Add cache headers
        res.set('X-Cache-Status', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', config.ttl?.toString() || '0');
        // Prevent browser caching - only use server-side cache
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        
        return res.json({
          ...cached,
          _cache: {
            hit: true,
            key: cacheKey,
            ttl: config.ttl
          }
        });
      }

      logger.debug(`Cache miss for ${req.path}`, { cacheKey, ttl: config.ttl });

      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response with error handling
      res.json = (body: CacheResponse) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache asynchronously without blocking the response
          setImmediate(() => {
            // Use Promise.resolve to avoid blocking
            Promise.resolve().then(async () => {
              try {
                await cacheService.set(cacheKey, body, config.ttl || 300);
              } catch (cacheError) {
                // Log cache error but don't fail the request
                logger.error(`Failed to cache response for ${req.path}:`, cacheError);
              }
            }).catch(() => {
              // Silently handle any promise rejection
            });
          });
        }
        
        // Add cache headers
        res.set('X-Cache-Status', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', config.ttl?.toString() || '0');
        // Prevent browser caching - only use server-side cache
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        
        return originalJson(body);
      };

      next();
    } catch (error) {
      // Circuit breaker: Continue without caching if Redis fails
      logger.error(`Cache middleware error for ${req.path}:`, error);
      
      // Add error headers to indicate cache is unavailable
      res.set('X-Cache-Status', 'ERROR');
      res.set('X-Cache-Error', 'Cache unavailable');
      
      next(); // Continue without caching
    }
  };
};

/**
 * Pre-configured cache middlewares
 */
export const staticCache = cache({
  ...CACHE_CATEGORIES.STATIC,
  skipCache: (req) => req.query.refresh === 'true'
});

export const semiDynamicCache = cache({
  ...CACHE_CATEGORIES.SEMI_DYNAMIC,
  skipCache: (req) => req.query.realtime === 'true'
});

export const dynamicCache = cache({
  ...CACHE_CATEGORIES.DYNAMIC,
  skipCache: (req) => req.query.live === 'true' || req.query.realtime === 'true'
});

export const realTimeCache = cache({
  ...CACHE_CATEGORIES.REAL_TIME
});

/**
 * Specific cache configurations for API endpoints
 */
export const businessCache = cache({
  ttl: 600, // 10 minutes
  keyPrefix: 'business',
  keyGenerator: (req: CachedRequest) => {
    const userId = CacheUtils.getUserId(req);
    const businessId = req.params.id || 'list';
    return CacheKeyGenerator.generateCacheKey('business', userId, businessId, req.path, req.query);
  },
  skipCache: (req: CachedRequest) => req.query.refresh === 'true'
});

export const serviceCache = cache({
  ttl: 300, // 5 minutes
  keyPrefix: 'service',
  keyGenerator: (req: CachedRequest) => {
    const userId = CacheUtils.getUserId(req);
    const businessId = req.params.businessId || CacheUtils.getBusinessId(req);
    return CacheKeyGenerator.generateCacheKey('service', userId, businessId, req.path, req.query);
  },
  skipCache: (req: CachedRequest) => req.query.refresh === 'true'
});

export const appointmentCache = cache({
  ttl: 60, // 1 minute
  keyPrefix: 'appointment',
  keyGenerator: (req: CachedRequest) => {
    const userId = CacheUtils.getUserId(req);
    const businessId = req.params.businessId || CacheUtils.getBusinessId(req);
    return CacheKeyGenerator.generateCacheKey('appointment', userId, businessId, req.path, req.query);
  },
  skipCache: (req: CachedRequest) => req.query.live === 'true' || req.query.realtime === 'true'
});

export const userCache = cache({
  ttl: 300, // 5 minutes
  keyPrefix: 'user',
  keyGenerator: (req: CachedRequest) => {
    const userId = CacheUtils.getUserId(req);
    return CacheKeyGenerator.generateCacheKey('user', userId, 'global', req.path, req.query);
  },
  skipCache: (req: CachedRequest) => req.query.refresh === 'true'
});

export const reportsCache = cache({
  ttl: 300, // 5 minutes
  keyPrefix: 'reports',
  keyGenerator: (req: CachedRequest) => {
    const userId = CacheUtils.getUserId(req);
    const businessId = CacheUtils.getBusinessId(req);
    return CacheKeyGenerator.generateCacheKey('reports', userId, businessId, req.path, req.query);
  },
  skipCache: (req: CachedRequest) => req.query.refresh === 'true'
});

/**
 * Cache invalidation helpers
 */
export const invalidateCache = {
  business: (businessId?: string, userId?: string) => 
    cacheService.invalidateBusiness(businessId, userId),

  service: (serviceId?: string, businessId?: string, userId?: string) => 
    cacheService.invalidateService(serviceId, businessId, userId),

  appointment: (appointmentId?: string, businessId?: string, userId?: string) => 
    cacheService.invalidateAppointment(appointmentId, businessId, userId),

  user: (userId: string) => cacheService.invalidateUser(userId),

  all: () => cacheService.clearAll()
};

// Note: cacheMetrics has been replaced by trackCachePerformance in cacheMonitoring.ts
// This provides better performance tracking and eliminates redundancy

// Export the cache service for direct use in controllers
export { cacheService };