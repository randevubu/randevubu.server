import { Response, NextFunction } from 'express';
import type { CacheService } from '../services/core/cacheService';
import { CacheRequest, CacheResponse } from '../types/request';
import { CacheUtils } from '../utils/cacheUtils';
import logger from '../utils/Logger/logger';

/**
 * Cache invalidation middleware factory for mutations
 * This follows industry best practices by handling invalidation at the route level
 *
 * @param cacheService - Injected CacheService instance
 * @returns Middleware factory function
 */
export const createInvalidateCacheOnSuccess =
  (cacheService: CacheService) =>
  (invalidationStrategy: {
    business?: boolean;
    service?: boolean;
    appointment?: boolean;
    user?: boolean;
  }) => {
    return (req: CacheRequest, res: Response, next: NextFunction) => {
      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to handle cache invalidation after successful mutations
      res.json = (body: CacheResponse) => {
        // Only invalidate cache for successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Invalidate cache asynchronously without blocking the response
          setImmediate(async () => {
            try {
              const userId = CacheUtils.getUserId(req);
              const businessId = CacheUtils.getBusinessId(req);

              // Invalidate based on strategy
              if (invalidationStrategy.business && businessId) {
                await cacheService.invalidateBusiness(businessId, userId);
                logger.info(`Cache invalidated for business ${businessId}`, { userId, businessId });
              }

              if (invalidationStrategy.service) {
                const serviceId = CacheUtils.getServiceId(req, body);
                if (serviceId) {
                  await cacheService.invalidateService(serviceId, businessId, userId);
                  logger.info(`Cache invalidated for service ${serviceId}`, { userId, businessId });
                }
              }

              if (invalidationStrategy.appointment) {
                const appointmentId = CacheUtils.getAppointmentId(req, body);
                if (appointmentId) {
                  await cacheService.invalidateAppointment(appointmentId, businessId, userId);
                  logger.info(`Cache invalidated for appointment ${appointmentId}`, {
                    userId,
                    businessId,
                  });
                }
              }

              if (invalidationStrategy.user && userId) {
                await cacheService.invalidateUser(userId);
                logger.info(`Cache invalidated for user ${userId}`, { userId });
              }
            } catch (error) {
              // Log error but don't fail the request
              logger.error('Cache invalidation failed:', error);
            }
          });
        }

        return originalJson(body);
      };

      next();
    };
  };

/**
 * Initialize pre-configured invalidation strategies with injected cacheService
 * This should be called once during app initialization
 */
export const initializeCacheInvalidationMiddleware = (cacheService: CacheService) => {
  const invalidateCacheOnSuccess = createInvalidateCacheOnSuccess(cacheService);

  return {
    invalidateBusinessCache: invalidateCacheOnSuccess({ business: true }),
    invalidateServiceCache: invalidateCacheOnSuccess({ service: true, business: true }),
    invalidateAppointmentCache: invalidateCacheOnSuccess({ appointment: true, business: true }),
    invalidateUserCache: invalidateCacheOnSuccess({ user: true }),
    invalidateAllCache: invalidateCacheOnSuccess({
      business: true,
      service: true,
      appointment: true,
      user: true,
    }),
  };
};
