import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { DiscountCodeController } from '../../controllers/discountCodeController';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { validateBody } from '../../middleware/validation';
import { createDiscountCodeSchema, validateDiscountCodeSchema, bulkDiscountCodeSchema } from '../../schemas/discountCode.schemas';
import { AuthorizationMiddleware } from '../../middleware/authorization';
import { RBACService } from '../../services/domain/rbac/rbacService';
import { staticCache, dynamicCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';

export function createDiscountCodeRoutes(discountCodeController: DiscountCodeController, rbacService: RBACService): Router {
  const router = Router();
  const authMiddleware = new AuthorizationMiddleware(rbacService);

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  // Apply authentication to all routes
  router.use(requireAuth);

  // Authenticated validation endpoint (no admin required)
  router.post(
    '/validate',
    validateBody(validateDiscountCodeSchema),
    asyncHandler(withAuth(discountCodeController.validateDiscountCode.bind(discountCodeController)))
  );
  
  // Apply admin authorization to all management routes
  router.use(authMiddleware.requireAdmin());

  // Admin routes for managing discount codes
  router.post(
    '/',
    validateBody(createDiscountCodeSchema),
    asyncHandler(withAuth(discountCodeController.createDiscountCode.bind(discountCodeController)))
  );

  router.get(
    '/',
    staticCache,
    asyncHandler(withAuth(discountCodeController.getAllDiscountCodes.bind(discountCodeController)))
  );

  router.get(
    '/statistics',
    dynamicCache,
    asyncHandler(withAuth(discountCodeController.getDiscountCodeStatistics.bind(discountCodeController)))
  );

  router.post(
    '/bulk',
    validateBody(bulkDiscountCodeSchema),
    asyncHandler(withAuth(discountCodeController.generateBulkDiscountCodes.bind(discountCodeController)))
  );

  router.get(
    '/:id',
    staticCache,
    asyncHandler(withAuth(discountCodeController.getDiscountCode.bind(discountCodeController)))
  );

  router.put(
    '/:id',
    validateBody(createDiscountCodeSchema),
    asyncHandler(withAuth(discountCodeController.updateDiscountCode.bind(discountCodeController)))
  );

  router.patch(
    '/:id/deactivate',
    asyncHandler(withAuth(discountCodeController.deactivateDiscountCode.bind(discountCodeController)))
  );

  router.delete(
    '/:id',
    asyncHandler(withAuth(discountCodeController.deleteDiscountCode.bind(discountCodeController)))
  );

  router.get(
    '/:id/usage',
    dynamicCache,
    asyncHandler(withAuth(discountCodeController.getDiscountCodeUsageHistory.bind(discountCodeController)))
  );

  return router;
}