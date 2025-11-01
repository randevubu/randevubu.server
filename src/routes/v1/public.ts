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

  /**
   * @swagger
   * /api/v1/public/businesses/{businessId}/available-slots:
   *   get:
   *     tags: [Public, Appointments]
   *     summary: Get available time slots for booking
   *     description: Get available time slots for a specific service and date - no authentication required. Used by customers to book appointments.
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: query
   *         name: date
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Date in YYYY-MM-DD format
   *         example: "2025-10-31"
   *       - in: query
   *         name: serviceId
   *         required: true
   *         schema:
   *           type: string
   *         description: Service ID
   *       - in: query
   *         name: staffId
   *         required: false
   *         schema:
   *           type: string
   *         description: Optional staff member ID to filter slots
   *     responses:
   *       200:
   *         description: Available slots retrieved successfully
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
   *                   example: "Available time slots retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     date:
   *                       type: string
   *                       example: "2025-10-31"
   *                     businessId:
   *                       type: string
   *                     serviceId:
   *                       type: string
   *                     staffId:
   *                       type: string
   *                       nullable: true
   *                     slots:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           startTime:
   *                             type: string
   *                             format: date-time
   *                             example: "2025-10-31T09:00:00.000Z"
   *                           endTime:
   *                             type: string
   *                             format: date-time
   *                             example: "2025-10-31T09:30:00.000Z"
   *                           available:
   *                             type: boolean
   *                             example: true
   *                           staffId:
   *                             type: string
   *                             nullable: true
   *                           staffName:
   *                             type: string
   *                             nullable: true
   *                     businessHours:
   *                       type: object
   *                       properties:
   *                         isOpen:
   *                           type: boolean
   *                           example: true
   *                         openTime:
   *                           type: string
   *                           example: "09:00"
   *                         closeTime:
   *                           type: string
   *                           example: "18:00"
   *                     closures:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           reason:
   *                             type: string
   *                           type:
   *                             type: string
   *       400:
   *         description: Invalid parameters
   *       404:
   *         description: Business or service not found
   */
  router.get('/businesses/:businessId/available-slots',
    semiDynamicCache,
    validateParams(businessIdParamSchema),
    controllers.appointmentController.getPublicAvailableSlots.bind(controllers.appointmentController)
  );

  return router;
}

export default createPublicRoutes; 