import { Router } from 'express';
import { DiscountCodeController } from '../../controllers/discountCodeController';
import { requireAuth, withAuth } from '../../middleware/authUtils';
import { validateBody } from '../../middleware/validation';
import { createDiscountCodeSchema, validateDiscountCodeSchema, bulkDiscountCodeSchema } from '../../schemas/discountCode.schemas';

export function createDiscountCodeRoutes(discountCodeController: DiscountCodeController): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(requireAuth);

  // Admin routes for managing discount codes
  router.post(
    '/',
    validateBody(createDiscountCodeSchema),
    withAuth(discountCodeController.createDiscountCode.bind(discountCodeController))
  );

  router.get(
    '/',
    withAuth(discountCodeController.getAllDiscountCodes.bind(discountCodeController))
  );

  router.get(
    '/statistics',
    withAuth(discountCodeController.getDiscountCodeStatistics.bind(discountCodeController))
  );

  router.post(
    '/bulk',
    validateBody(bulkDiscountCodeSchema),
    withAuth(discountCodeController.generateBulkDiscountCodes.bind(discountCodeController))
  );

  router.get(
    '/:id',
    withAuth(discountCodeController.getDiscountCode.bind(discountCodeController))
  );

  router.put(
    '/:id',
    validateBody(createDiscountCodeSchema),
    withAuth(discountCodeController.updateDiscountCode.bind(discountCodeController))
  );

  router.patch(
    '/:id/deactivate',
    withAuth(discountCodeController.deactivateDiscountCode.bind(discountCodeController))
  );

  router.delete(
    '/:id',
    withAuth(discountCodeController.deleteDiscountCode.bind(discountCodeController))
  );

  router.get(
    '/:id/usage',
    withAuth(discountCodeController.getDiscountCodeUsageHistory.bind(discountCodeController))
  );

  // Public validation endpoint (no admin required)
  router.post(
    '/validate',
    validateBody(validateDiscountCodeSchema),
    withAuth(discountCodeController.validateDiscountCode.bind(discountCodeController))
  );

  return router;
}