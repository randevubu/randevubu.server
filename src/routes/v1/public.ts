import { Router } from 'express';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import { ControllerContainer } from '../../controllers';
import { validateParams } from '../../middleware/validation';
import { businessIdParamSchema } from '../../schemas/staff.schemas';
import { staticCache, semiDynamicCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import prisma from '../../lib/prisma';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const controllers = new ControllerContainer(repositories, services);

export function createPublicRoutes(): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  /**
   * @swagger
   * /api/v1/public/businesses/{businessId}/staff:
   *   get:
   *     tags: [Public, Staff Management]
   *     summary: Get staff list for appointment booking (public)
   *     description: Get staff members for a business - no authentication required. Returns minimal data for appointment booking.
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     responses:
   *       200:
   *         description: Staff list retrieved successfully
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
   *                     staff:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           role:
   *                             type: string
   *                             enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *                           user:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                               firstName:
   *                                 type: string
   *                                 nullable: true
   *                               lastName:
   *                                 type: string
   *                                 nullable: true
   *                               avatar:
   *                                 type: string
   *                                 nullable: true
   *       404:
   *         description: Business not found
   */
  router.get('/businesses/:businessId/staff',
    semiDynamicCache,
    validateParams(businessIdParamSchema),
    controllers.staffController.getPublicBusinessStaff.bind(controllers.staffController)
  );

  return router;
}

export default createPublicRoutes; 