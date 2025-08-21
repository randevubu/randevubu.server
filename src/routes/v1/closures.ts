import { Router } from 'express';
import { BusinessClosureController } from '../../controllers/businessClosureController';
import { authenticateToken, requirePermission, requireAny } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';

export function createBusinessClosureRoutes(businessClosureController: BusinessClosureController): Router {
  const router = Router();

  // Public route for checking if business is closed
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/check:
   *   get:
   *     tags: [Business Closures]
   *     summary: Check if a business is currently closed
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Closure status
   */
  router.get('/business/:businessId/check', businessClosureController.isBusinessClosed.bind(businessClosureController));

  // Protected routes
  router.use(authenticateToken);

  // Closure CRUD operations
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create a closure for a business
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
   *         description: Closure created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{id}:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closure by ID
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
   *         description: Closure details
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.get(
    '/:id',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getClosureById.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{id}:
   *   put:
   *     tags: [Business Closures]
   *     summary: Update a closure
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
   *         description: Closure updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.put(
    '/:id',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.updateClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{id}:
   *   delete:
   *     tags: [Business Closures]
   *     summary: Delete a closure
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
   *         description: Closure deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.delete(
    '/:id',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.deleteClosure.bind(businessClosureController)
  );

  // Business closure management
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closures for a business
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
   *         description: List of closures
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getBusinessClosures.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/stats:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closure statistics for a business
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
   *         description: Stats
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/stats',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessClosureController.getClosureStats.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/calendar:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closures calendar for a business
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
   *         description: Calendar data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/calendar',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getClosuresCalendar.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/date-range:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closures by date range
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
   *         description: List of closures
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/date-range',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getClosuresByDateRange.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/type/{type}:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closures by type
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of closures
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/type/:type',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getClosuresByType.bind(businessClosureController)
  );

  // Closure actions
  /**
   * @swagger
   * /api/v1/closures/{id}/extend:
   *   post:
   *     tags: [Business Closures]
   *     summary: Extend a closure
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
   *         description: Closure extended
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.post(
    '/:id/extend',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.extendClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{id}/end-early:
   *   post:
   *     tags: [Business Closures]
   *     summary: End a closure early
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
   *         description: Closure ended early
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.post(
    '/:id/end-early',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.endClosureEarly.bind(businessClosureController)
  );

  // Holiday management
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/holidays:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create a recurring holiday
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
   *         description: Holiday created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/holidays',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createRecurringHoliday.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/holidays:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get recurring holidays for a business
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
   *         description: List of holidays
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/holidays',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getRecurringHolidays.bind(businessClosureController)
  );

  // Emergency and maintenance closures
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/emergency:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create an emergency closure
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
   *         description: Emergency closure created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/emergency',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createEmergencyClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/maintenance:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create a maintenance closure
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
   *         description: Maintenance closure created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/business/:businessId/maintenance',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createMaintenanceClosure.bind(businessClosureController)
  );

  // Impact assessment
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/affected-appointments:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get appointments affected by closures
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
   *         description: List of affected appointments
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/affected-appointments',
    requireAny([PermissionName.VIEW_ALL_APPOINTMENTS, PermissionName.VIEW_OWN_APPOINTMENTS]),
    businessClosureController.getAffectedAppointments.bind(businessClosureController)
  );

  // System maintenance
  /**
   * @swagger
   * /api/v1/closures/admin/auto-expire:
   *   post:
   *     tags: [Business Closures]
   *     summary: Auto-expire closures (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Process completed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/auto-expire',
    requirePermission(PermissionName.MANAGE_ALL_CLOSURES),
    businessClosureController.autoExpireClosures.bind(businessClosureController)
  );

  return router;
}