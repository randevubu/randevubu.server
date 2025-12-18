import { Router } from 'express';
import { ServiceController } from '../../controllers/serviceController';
import { requireAuth, requirePermission, requireAny, withAuth } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import {
  attachBusinessContext,
  requireSpecificBusinessAccess,
} from '../../middleware/attachBusinessContext';
import { semiDynamicCache, dynamicCache, serviceCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import { initializeCacheInvalidationMiddleware } from '../../middleware/cacheInvalidation';
import prisma from '../../lib/prisma';
import { RepositoryContainer } from '../../repositories';

// Initialize business context middleware
const repositories = new RepositoryContainer(prisma);
import { initializeBusinessContextMiddleware } from '../../middleware/attachBusinessContext';
initializeBusinessContextMiddleware(repositories);

export function createServiceRoutes(serviceController: any, cacheInvalidation?: any): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  // Public routes
  /**
   * @swagger
   * /api/v1/services/business/{businessId}/public:
   *   get:
   *     tags: [Services]
   *     summary: Get public services of a business
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of public services
   */
  router.get(
    '/business/:businessId/public',
    semiDynamicCache,
    serviceController.getPublicBusinessServices.bind(serviceController)
  );
  /**
   * @swagger
   * /api/v1/services/{id}/availability:
   *   get:
   *     tags: [Services]
   *     summary: Check service availability
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Availability information
   */
  router.get(
    '/:id/availability',
    dynamicCache,
    serviceController.checkServiceAvailability.bind(serviceController)
  );

  // Protected routes
  router.use(requireAuth);

  // Service CRUD operations
  /**
   * @swagger
   * /api/v1/services/business/{businessId}:
   *   post:
   *     tags: [Services]
   *     summary: Create a service for a business
   *     description: Create a new service for a specific business. Requires MANAGE_ALL_SERVICES or MANAGE_OWN_SERVICES permission.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *           description: The ID of the business to create the service for
   *           example: 'clh7j2k3l0000qwerty123456'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateServiceRequest'
   *           examples:
   *             basic_service:
   *               summary: Basic Service
   *               value:
   *                 name: 'Saç Kesim ve Şekillendirme'
   *                 description: 'Profesyonel saç kesim ve şekillendirme hizmeti'
   *                 duration: 60
   *                 price: 150.00
   *                 currency: 'TRY'
   *             detailed_service:
   *               summary: Detailed Service with All Fields
   *               value:
   *                 name: 'Tam Vücut Masajı'
   *                 description: 'Rahatlatıcı tam vücut masaj terapisi'
   *                 duration: 90
   *                 price: 350.00
   *                 currency: 'TRY'
   *                 bufferTime: 15
   *                 maxAdvanceBooking: 30
   *                 minAdvanceBooking: 2
   *     responses:
   *       201:
   *         description: Service created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateServiceResponse'
   *       400:
   *         description: Bad request - validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Business not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post(
    '/business/:businessId',
    cacheInvalidation.invalidateServiceCache,
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    withAuth(serviceController.createService.bind(serviceController))
  );

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   get:
   *     tags: [Services]
   *     summary: Get service by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Service details
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.get(
    '/:id',
    serviceCache,
    requireAny([PermissionName.VIEW_ALL_SERVICES, PermissionName.VIEW_OWN_SERVICES]),
    serviceController.getServiceById.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   put:
   *     tags: [Services]
   *     summary: Update a service
   *     description: Update an existing service. Requires MANAGE_ALL_SERVICES or MANAGE_OWN_SERVICES permission. Only business owners or staff can update services for their business.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           description: The unique identifier of the service to update
   *           example: 'svc_1703251200000_abc123'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *                 description: Service name (2-100 characters)
   *                 example: 'Saç Kesim ve Şekillendirme'
   *               description:
   *                 type: string
   *                 maxLength: 500
   *                 description: Service description (optional, max 500 characters)
   *                 example: 'Profesyonel saç kesim ve şekillendirme hizmeti'
   *               duration:
   *                 type: integer
   *                 minimum: 15
   *                 maximum: 480
   *                 description: Service duration in minutes (15-480 minutes)
   *                 example: 60
   *               price:
   *                 type: number
   *                 format: float
   *                 minimum: 0
   *                 maximum: 10000
   *                 description: Service price (0-10,000)
   *                 example: 150.00
   *               currency:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 3
   *                 description: Currency code (3 characters)
   *                 example: 'TRY'
   *               isActive:
   *                 type: boolean
   *                 description: Whether the service is active/available
   *                 example: true
   *               sortOrder:
   *                 type: integer
   *                 minimum: 0
   *                 description: Display order for sorting services
   *                 example: 1
   *               bufferTime:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 120
   *                 description: Buffer time in minutes after service (0-120 minutes)
   *                 example: 15
   *               maxAdvanceBooking:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 365
   *                 description: Maximum days in advance for booking (0-365 days)
   *                 example: 30
   *               minAdvanceBooking:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 30
   *                 description: Minimum days in advance required for booking (0-30 days)
   *                 example: 0
   *           examples:
   *             update_basic:
   *               summary: Update Basic Service Info
   *               value:
   *                 name: 'Kadın Saç Kesimi'
   *                 description: 'Güncellenmiş profesyonel kadın saç kesimi'
   *                 price: 175.00
   *             update_comprehensive:
   *               summary: Update All Service Details
   *               value:
   *                 name: 'Premium Saç Kesimi'
   *                 description: 'Premium saç kesim ve şekillendirme paketi'
   *                 duration: 75
   *                 price: 200.00
   *                 currency: 'TRY'
   *                 isActive: true
   *                 sortOrder: 1
   *                 bufferTime: 20
   *                 maxAdvanceBooking: 45
   *                 minAdvanceBooking: 1
   *     responses:
   *       200:
   *         description: Service updated successfully
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
   *                   example: 'Service updated successfully'
   *                 data:
   *                   $ref: '#/components/schemas/ServiceData'
   *       400:
   *         description: Bad request - validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: 'Validation failed: name is required'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions or not your business
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: 'Access denied'
   *                     code:
   *                       type: string
   *                       example: 'FORBIDDEN'
   *       404:
   *         description: Service not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: 'Service not found'
   */
  router.put(
    '/:id',
    cacheInvalidation.invalidateServiceCache,
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.updateService.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   delete:
   *     tags: [Services]
   *     summary: Delete a service
   *     description: |
   *       Delete a service from your business. This performs a soft delete by setting isActive to false.
   *       Requires MANAGE_ALL_SERVICES or MANAGE_OWN_SERVICES permission. Only business owners or staff can delete services for their business.
   *
   *       **Important Notes:**
   *       - This is a soft delete - the service becomes inactive but data is preserved
   *       - Existing appointments with this service are not affected
   *       - Service can be reactivated later if needed
   *       - Cannot delete services with future appointments (implement business logic check)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           description: The unique identifier of the service to delete
   *           example: 'svc_1703251200000_abc123'
   *     responses:
   *       200:
   *         description: Service deleted successfully
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
   *                   example: 'Service deleted successfully'
   *             examples:
   *               success:
   *                 summary: Successful deletion
   *                 value:
   *                   success: true
   *                   message: 'Service deleted successfully'
   *       400:
   *         description: Bad request - cannot delete service
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   examples:
   *                     - 'Cannot delete service with future appointments'
   *                     - 'Service is required by active business operations'
   *             examples:
   *               has_appointments:
   *                 summary: Service has future appointments
   *                 value:
   *                   success: false
   *                   error: 'Cannot delete service with 3 future appointments. Please reschedule or cancel them first.'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions or not your business
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: 'Access denied'
   *                     code:
   *                       type: string
   *                       example: 'FORBIDDEN'
   *                     requestId:
   *                       type: string
   *                       example: 'req_abc123'
   *             examples:
   *               not_owner:
   *                 summary: User doesn't own this business
   *                 value:
   *                   success: false
   *                   error:
   *                     message: 'Access denied. You can only manage services for your own business.'
   *                     code: 'FORBIDDEN'
   *                     requestId: 'req_xyz789'
   *               no_permission:
   *                 summary: User lacks required permissions
   *                 value:
   *                   success: false
   *                   error:
   *                     message: 'Access denied'
   *                     code: 'FORBIDDEN'
   *                     requestId: 'req_def456'
   *       404:
   *         description: Service not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: 'Service not found'
   *             examples:
   *               not_found:
   *                 summary: Service doesn't exist
   *                 value:
   *                   success: false
   *                   error: 'Service not found or has been deleted'
   */
  router.delete(
    '/:id',
    cacheInvalidation.invalidateServiceCache,
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.deleteService.bind(serviceController)
  );

  // Business services management
  /**
   * @swagger
   * /api/v1/services/business/{businessId}:
   *   get:
   *     tags: [Services]
   *     summary: Get business services
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of services
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId',
    serviceCache,
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.VIEW_ALL_SERVICES, PermissionName.VIEW_OWN_SERVICES]),
    serviceController.getBusinessServices.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/business/{businessId}/reorder:
   *   post:
   *     tags: [Services]
   *     summary: Reorder business services
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Reordered successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/reorder',
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.reorderServices.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/business/{businessId}/popular:
   *   get:
   *     tags: [Services]
   *     summary: Get popular services for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Popular services
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/popular',
    serviceCache,
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    serviceController.getPopularServices.bind(serviceController)
  );

  // Service management
  /**
   * @swagger
   * /api/v1/services/{id}/stats:
   *   get:
   *     tags: [Services]
   *     summary: Get service statistics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Statistics
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:id/stats',
    serviceCache,
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    serviceController.getServiceStats.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/{id}/toggle-status:
   *   post:
   *     tags: [Services]
   *     summary: Toggle service active status
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Status toggled
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:id/toggle-status',
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.toggleServiceStatus.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/{id}/duplicate:
   *   post:
   *     tags: [Services]
   *     summary: Duplicate a service
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Service duplicated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:id/duplicate',
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.duplicateService.bind(serviceController)
  );

  // Bulk operations
  /**
   * @swagger
   * /api/v1/services/business/{businessId}/bulk-update-prices:
   *   post:
   *     tags: [Services]
   *     summary: Bulk update service prices
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Prices updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/bulk-update-prices',
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.bulkUpdatePrices.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/business/{businessId}/batch-toggle:
   *   post:
   *     tags: [Services]
   *     summary: Batch toggle services
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Services toggled
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/batch-toggle',
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.batchToggleServices.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/business/{businessId}/batch-delete:
   *   post:
   *     tags: [Services]
   *     summary: Batch delete services
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Services deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/batch-delete',
    attachBusinessContext,
    requireSpecificBusinessAccess('businessId'),
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.batchDeleteServices.bind(serviceController)
  );

  return router;
}
