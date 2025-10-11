import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { CacheResponse } from '../types/request';
import logger from '../utils/Logger/logger';

/**
 * Cache monitoring middleware
 * Tracks cache performance metrics and provides real-time monitoring
 */
export class CacheMonitoring {
  private static metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheErrors: 0,
    averageResponseTime: 0,
    startTime: Date.now()
  };

  // Auto-reset metrics every hour to prevent memory leaks
  private static resetInterval: NodeJS.Timeout | null = null;

  static {
    // Auto-reset metrics every hour
    this.resetInterval = setInterval(() => {
      this.resetMetrics();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Cleanup method to clear interval
   */
  static cleanup(): void {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }
  }

  /**
   * Middleware to track cache performance
   */
  static trackCachePerformance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Track request
      this.metrics.totalRequests++;
      
      // Override res.json to track cache status
      const originalJson = res.json.bind(res);
      res.json = (body: CacheResponse) => {
        const responseTime = Date.now() - startTime;
        
        // Update average response time (non-blocking)
        setImmediate(() => {
          this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;
        });
        
        // Track cache status
        const cacheStatus = res.get('X-Cache-Status');
        if (cacheStatus === 'HIT') {
          this.metrics.cacheHits++;
        } else if (cacheStatus === 'MISS') {
          this.metrics.cacheMisses++;
        } else if (cacheStatus === 'ERROR') {
          this.metrics.cacheErrors++;
        }
        
        // Log cache performance
        logger.info('Cache performance', {
          endpoint: req.path,
          method: req.method,
          cacheStatus,
          responseTime,
          hitRate: this.getHitRate(),
          totalRequests: this.metrics.totalRequests
        });
        
        return originalJson(body);
      };
      
      next();
    };
  }

  /**
   * Get current cache metrics
   */
  static getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      uptime: Date.now() - this.metrics.startTime,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get cache hit rate percentage
   */
  static getHitRate(): number {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheRequests === 0) return 0;
    return (this.metrics.cacheHits / totalCacheRequests) * 100;
  }

  /**
   * Reset metrics
   */
  static resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheErrors: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    };
  }

  /**
   * Get cache health status
   */
  static async getHealthStatus() {
    try {
      const isHealthy = await cacheService.healthCheck();
      const stats = await cacheService.getStats();
      
      return {
        healthy: isHealthy,
        metrics: this.getMetrics(),
        redis: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get cache performance report
   */
  static getPerformanceReport() {
    const metrics = this.getMetrics();
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      summary: {
        totalRequests: metrics.totalRequests,
        hitRate: `${metrics.hitRate.toFixed(2)}%`,
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
        uptime: `${Math.floor(uptime / 1000)}s`,
        errorRate: `${((metrics.cacheErrors / metrics.totalRequests) * 100).toFixed(2)}%`
      },
      details: metrics,
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get performance recommendations
   */
  private static getRecommendations(): string[] {
    const recommendations: string[] = [];
    const hitRate = this.getHitRate();
    
    if (hitRate < 50) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data');
    }
    
    if (hitRate > 90) {
      recommendations.push('Cache is performing well - consider adding more cacheable endpoints');
    }
    
    if (this.metrics.cacheErrors > this.metrics.totalRequests * 0.1) {
      recommendations.push('High cache error rate - check Redis connection and configuration');
    }
    
    if (this.metrics.averageResponseTime > 1000) {
      recommendations.push('High average response time - consider optimizing cache keys and TTL');
    }
    
    return recommendations;
  }
}

/**
 * Middleware to track cache performance
 */
export const trackCachePerformance = CacheMonitoring.trackCachePerformance();

/**
 * Get cache metrics endpoint
 */
export const getCacheMetrics = CacheMonitoring.getMetrics.bind(CacheMonitoring);

/**
 * Get cache health status
 */
export const getCacheHealth = CacheMonitoring.getHealthStatus.bind(CacheMonitoring);

/**
 * Get cache performance report
 */
export const getCachePerformanceReport = CacheMonitoring.getPerformanceReport.bind(CacheMonitoring);

/**
 * Reset cache metrics
 */
export const resetCacheMetrics = CacheMonitoring.resetMetrics.bind(CacheMonitoring);
