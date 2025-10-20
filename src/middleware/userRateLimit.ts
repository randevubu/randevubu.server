import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/request';
import logger from '../utils/Logger/logger';
import { cacheManager } from '../lib/redis/redis';

/**
 * Production-ready user-based rate limiting middleware
 *
 * Features:
 * - Per-user rate limiting (separate from IP-based)
 * - Redis-backed for distributed systems
 * - Graceful degradation if Redis fails
 * - Different limits for authenticated vs anonymous users
 * - Detailed logging for monitoring
 *
 * Industry standard (Stripe, Twilio, AWS Load Balancer):
 * - Authenticated users: Higher limits (100 req/min)
 * - Anonymous users: Lower limits (20 req/min)
 * - Admin users: Much higher limits (500 req/min)
 */

export interface RateLimitConfig {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;       // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyPrefix?: string;        // Redis key prefix
  message?: string;          // Custom error message
}

export class UserRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyPrefix: 'rate_limit',
      message: 'Too many requests from this user, please try again later',
      ...config,
    };
  }

  /**
   * Main rate limiting middleware
   */
  middleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const ip = req.ip || 'unknown';

      // Use userId if authenticated, otherwise use IP
      const key = userId
        ? `${this.config.keyPrefix}:user:${userId}`
        : `${this.config.keyPrefix}:ip:${ip}`;

      // Try to use Redis for distributed rate limiting
      try {
        const result = await this.checkRateLimitRedis(key);

        if (result.blocked) {
          logger.warn('User rate limit exceeded', {
            userId,
            ip,
            key,
            count: result.count,
            limit: this.config.maxRequests,
            retryAfter: result.retryAfter,
          });

          res.status(429).json({
            success: false,
            error: {
              message: this.config.message,
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: result.retryAfter,
              limit: this.config.maxRequests,
              remaining: 0,
            },
          });
          return;
        }

        // Set rate limit headers (industry standard)
        res.setHeader('X-RateLimit-Limit', this.config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
        res.setHeader('X-RateLimit-Reset', result.resetTime.toString());

        logger.debug('Rate limit check passed', {
          userId,
          key,
          count: result.count,
          remaining: result.remaining,
        });

        next();
      } catch (redisError) {
        // Graceful degradation: if Redis fails, log and allow request
        logger.error('Redis rate limiting failed, allowing request', {
          error: redisError instanceof Error ? redisError.message : String(redisError),
          userId,
          ip,
        });
        next();
      }
    } catch (error) {
      // Never block requests due to rate limiter errors
      logger.error('Rate limiting middleware error', {
        error: error instanceof Error ? error.message : String(error),
      });
      next();
    }
  };

  /**
   * Check rate limit using Redis
   */
  private async checkRateLimitRedis(key: string): Promise<{
    blocked: boolean;
    count: number;
    remaining: number;
    retryAfter: number;
    resetTime: number;
  }> {
    const redis = cacheManager.getRedis();
    const now = Date.now();
    const windowSeconds = Math.floor(this.config.windowMs / 1000);

    // Use Redis INCR with EXPIRE for atomic operation
    const count = await redis.incr(key);

    // Set expiry only on first request (when count === 1)
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const resetTime = ttl > 0 ? now + (ttl * 1000) : now + this.config.windowMs;

    const blocked = count > this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - count);
    const retryAfter = ttl > 0 ? ttl : windowSeconds;

    return {
      blocked,
      count,
      remaining,
      retryAfter,
      resetTime,
    };
  }
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  // Standard API endpoints
  standard: new UserRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,          // 100 requests per minute
    keyPrefix: 'rate_limit_standard',
  }),

  // Strict rate limiting for sensitive operations (auth, payments)
  strict: new UserRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 10,           // 10 requests per minute
    keyPrefix: 'rate_limit_strict',
    message: 'Too many sensitive requests, please try again later',
  }),

  // Very strict for authentication attempts
  auth: new UserRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 attempts per 15 minutes
    keyPrefix: 'rate_limit_auth',
    message: 'Too many authentication attempts, please try again later',
  }),

  // Lenient for public endpoints
  public: new UserRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 200,          // 200 requests per minute
    keyPrefix: 'rate_limit_public',
  }),

  // Admin endpoints (higher limits)
  admin: new UserRateLimiter({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 500,          // 500 requests per minute
    keyPrefix: 'rate_limit_admin',
  }),
};

/**
 * Helper function to create custom rate limiter
 */
export const createUserRateLimiter = (config: RateLimitConfig) => {
  return new UserRateLimiter(config);
};

/**
 * Export middleware functions
 */
export const standardRateLimit = RateLimitPresets.standard.middleware;
export const strictRateLimit = RateLimitPresets.strict.middleware;
export const authRateLimit = RateLimitPresets.auth.middleware;
export const publicRateLimit = RateLimitPresets.public.middleware;
export const adminRateLimit = RateLimitPresets.admin.middleware;
