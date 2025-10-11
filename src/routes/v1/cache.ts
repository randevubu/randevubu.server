import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import { cacheService } from '../../services/cacheService';
import { getCacheMetrics, getCacheHealth, getCachePerformanceReport, resetCacheMetrics } from '../../middleware/cacheMonitoring';
import logger from '../../utils/Logger/logger';

export function createCacheRoutes(): Router {
  const router = Router();

  // All cache management routes require authentication
  router.use(requireAuth);

  /**
   * @swagger
   * /api/v1/cache/stats:
   *   get:
   *     tags: [Cache Management]
   *     summary: Get cache statistics
   *     description: Returns comprehensive cache statistics including memory usage, hit rates, and performance metrics
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     connected:
   *                       type: boolean
   *                       example: true
   *                     memory:
   *                       type: string
   *                       example: "2.5MB"
   *                     keyspace:
   *                       type: integer
   *                       example: 1250
   *                     uptime:
   *                       type: string
   *                       example: "2 hours"
   *                     hitRate:
   *                       type: number
   *                       example: 0.85
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get('/stats', async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await cacheService.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cache statistics'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/cache/health:
   *   get:
   *     tags: [Cache Management]
   *     summary: Check cache health
   *     description: Performs a health check on the cache system
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache health status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     healthy:
   *                       type: boolean
   *                       example: true
   *                     responseTime:
   *                       type: number
   *                       example: 5
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *       500:
   *         description: Cache health check failed
   */
  router.get('/health', async (req: Request, res: Response): Promise<void> => {
    try {
      const isHealthy = await cacheService.healthCheck();

      if (isHealthy) {
        res.json({
          success: true,
          data: {
            healthy: true,
            responseTime: 0,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          data: {
            healthy: false,
            responseTime: -1,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Cache health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Cache health check failed'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/cache/invalidate:
   *   post:
   *     tags: [Cache Management]
   *     summary: Invalidate cache
   *     description: Invalidate cache by pattern, tags, or clear all cache
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [pattern, tags, business, service, appointment, user, all]
   *                 example: "business"
   *               pattern:
   *                 type: string
   *                 example: "business:*:123:*"
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["business", "service"]
   *               businessId:
   *                 type: string
   *                 example: "biz_123456789"
   *               serviceId:
   *                 type: string
   *                 example: "srv_123456789"
   *               appointmentId:
   *                 type: string
   *                 example: "apt_123456789"
   *               userId:
   *                 type: string
   *                 example: "user_123456789"
   *     responses:
   *       200:
   *         description: Cache invalidated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     deleted:
   *                       type: integer
   *                       example: 15
   *                     type:
   *                       type: string
   *                       example: "business"
   *       400:
   *         description: Invalid request
   *       500:
   *         description: Internal server error
   */
  router.post('/invalidate', 
    requirePermission(PermissionName.MANAGE_ROLES),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { type, pattern, tags, businessId, serviceId, appointmentId, userId } = req.body;
        let deleted = 0;

        switch (type) {
          case 'pattern':
            if (!pattern) {
              res.status(400).json({
                success: false,
                error: 'Pattern is required for pattern invalidation'
              });
              return;
            }
            deleted = await cacheService.deletePattern(pattern);
            break;

          case 'tags':
            if (!tags || !Array.isArray(tags)) {
              res.status(400).json({
                success: false,
                error: 'Tags array is required for tag invalidation'
              });
              return;
            }
            // For now, just clear all cache when tags are specified
            deleted = await cacheService.clearAll();
            break;

          case 'business':
            deleted = await cacheService.invalidateBusiness(businessId, userId);
            break;

          case 'service':
            deleted = await cacheService.invalidateService(serviceId, businessId, userId);
            break;

          case 'appointment':
            deleted = await cacheService.invalidateAppointment(appointmentId, businessId, userId);
            break;

          case 'user':
            if (!userId) {
              res.status(400).json({
                success: false,
                error: 'UserId is required for user invalidation'
              });
              return;
            }
            deleted = await cacheService.invalidateUser(userId);
            break;

          case 'all':
            deleted = await cacheService.clearAll();
            break;

          default:
            res.status(400).json({
              success: false,
              error: 'Invalid invalidation type'
            });
            return;
        }

        logger.info('Cache invalidated via API', {
          type,
          pattern,
          tags,
          businessId,
          serviceId,
          appointmentId,
          userId,
          deleted,
          requestedBy: (req as any).user?.id
        });

        res.json({
          success: true,
          data: {
            deleted,
            type
          }
        });
      } catch (error) {
        logger.error('Failed to invalidate cache:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to invalidate cache'
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/cache/keys:
   *   get:
   *     tags: [Cache Management]
   *     summary: List cache keys
   *     description: List cache keys matching a pattern (admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: pattern
   *         schema:
   *           type: string
   *           default: "*"
   *         description: Pattern to match cache keys
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *           maximum: 1000
   *         description: Maximum number of keys to return
   *     responses:
   *       200:
   *         description: Cache keys retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     keys:
   *                       type: array
   *                       items:
   *                         type: string
   *                     count:
   *                       type: integer
   *                       example: 25
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Forbidden - admin access required
   *       500:
   *         description: Internal server error
   */
  router.get('/keys',
    requirePermission(PermissionName.MANAGE_ROLES),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pattern = req.query.pattern as string || '*';
        const limit = Math.min(parseInt(req.query.limit as string || '100'), 1000);

        // For now, return empty keys list - this is an advanced feature
        const keys: string[] = [];
        const limitedKeys = keys.slice(0, limit);

        res.json({
          success: true,
          data: {
            keys: limitedKeys,
            count: limitedKeys.length,
            total: keys.length
          }
        });
      } catch (error) {
        logger.error('Failed to list cache keys:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to list cache keys'
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/cache/clear:
   *   post:
   *     tags: [Cache Management]
   *     summary: Clear all cache
   *     description: Clear all cache entries (admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache cleared successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     deleted:
   *                       type: integer
   *                       example: 1250
   *       403:
   *         description: Forbidden - admin access required
   *       500:
   *         description: Internal server error
   */
  router.post('/clear',
    requirePermission(PermissionName.MANAGE_ROLES),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const deleted = await cacheService.clearAll();

        logger.warn('All cache cleared via API', {
          deleted,
          requestedBy: (req as any).user?.id
        });

        res.json({
          success: true,
          data: {
            deleted
          }
        });
      } catch (error) {
        logger.error('Failed to clear cache:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to clear cache'
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/cache/metrics:
   *   get:
   *     tags: [Cache Management]
   *     summary: Get cache performance metrics
   *     description: Get real-time cache performance metrics and statistics
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cache metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalRequests:
   *                       type: number
   *                       example: 1500
   *                     cacheHits:
   *                       type: number
   *                       example: 1200
   *                     cacheMisses:
   *                       type: number
   *                       example: 300
   *                     hitRate:
   *                       type: number
   *                       example: 80.0
   *                     averageResponseTime:
   *                       type: number
   *                       example: 45.5
   *                     uptime:
   *                       type: number
   *                       example: 3600000
   */
  router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = getCacheMetrics();
      const redisMetrics = await cacheService.getMetrics();

      res.json({
        success: true,
        data: {
          ...metrics,
          redis: redisMetrics.redis,
          locks: redisMetrics.locks
        }
      });
    } catch (error) {
      logger.error('Failed to get cache metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache metrics'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/cache/performance:
   *   get:
   *     tags: [Cache Management]
   *     summary: Get cache performance report
   *     description: Get detailed cache performance report with recommendations
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Performance report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalRequests:
   *                           type: number
   *                           example: 1500
   *                         hitRate:
   *                           type: string
   *                           example: "80.00%"
   *                         averageResponseTime:
   *                           type: string
   *                           example: "45.50ms"
   *                         uptime:
   *                           type: string
   *                           example: "3600s"
   *                         errorRate:
   *                           type: string
   *                           example: "0.50%"
   *                     recommendations:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["Consider increasing cache TTL for frequently accessed data"]
   */
  router.get('/performance', async (req: Request, res: Response): Promise<void> => {
    try {
      const report = getCachePerformanceReport();
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to get cache performance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache performance report'
      });
    }
  });

  /**
   * @swagger
   * /api/v1/cache/metrics/reset:
   *   post:
   *     tags: [Cache Management]
   *     summary: Reset cache metrics
   *     description: Reset all cache performance metrics to zero
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Metrics reset successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Cache metrics reset successfully"
   */
  router.post('/metrics/reset', async (req: Request, res: Response): Promise<void> => {
    try {
      resetCacheMetrics();
      
      res.json({
        success: true,
        message: 'Cache metrics reset successfully'
      });
    } catch (error) {
      logger.error('Failed to reset cache metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset cache metrics'
      });
    }
  });

  return router;
}
