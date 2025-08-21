import { Router } from 'express';
import { ServiceController } from '../../controllers/serviceController';
import { authenticateToken, requirePermission, requireAny } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';

export function createServiceRoutes(serviceController: ServiceController): Router {
  const router = Router();

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
  router.get('/business/:businessId/public', serviceController.getPublicBusinessServices.bind(serviceController));
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
  router.get('/:id/availability', serviceController.checkServiceAvailability.bind(serviceController));

  // Protected routes
  router.use(authenticateToken);

  // Service CRUD operations
  /**
   * @swagger
   * /api/v1/services/business/{businessId}:
   *   post:
   *     tags: [Services]
   *     summary: Create a service for a business
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
   *         description: Service created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId',
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.createService.bind(serviceController)
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
    requireAny([PermissionName.VIEW_ALL_SERVICES, PermissionName.VIEW_OWN_SERVICES]),
    serviceController.getServiceById.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   put:
   *     tags: [Services]
   *     summary: Update a service
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
   *         description: Service updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.put(
    '/:id',
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.updateService.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   delete:
   *     tags: [Services]
   *     summary: Delete a service
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
   *         description: Service deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.delete(
    '/:id',
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
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.reorderServices.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/business/{businessId}/category/{category}:
   *   get:
   *     tags: [Services]
   *     summary: Get services by category for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: category
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
    '/business/:businessId/category/:category',
    requireAny([PermissionName.VIEW_ALL_SERVICES, PermissionName.VIEW_OWN_SERVICES]),
    serviceController.getServicesByCategory.bind(serviceController)
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
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.batchDeleteServices.bind(serviceController)
  );

  /**
   * @swagger
   * /api/v1/services/business/{businessId}/batch-update-category:
   *   post:
   *     tags: [Services]
   *     summary: Batch update service categories
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
   *         description: Categories updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/batch-update-category',
    requireAny([PermissionName.MANAGE_ALL_SERVICES, PermissionName.MANAGE_OWN_SERVICES]),
    serviceController.batchUpdateCategory.bind(serviceController)
  );

  return router;
}