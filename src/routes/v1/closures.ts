import { Router } from 'express';
import { BusinessClosureController } from '../../controllers/businessClosureController';
import { requireAuth, requirePermission, requireAny } from '../../middleware/authUtils';
import { attachBusinessContext, requireBusinessAccess } from '../../middleware/attachBusinessContext';
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
  router.use(requireAuth);

  // Context-aware routes (automatically use user's primary business)
  router.use('/my', attachBusinessContext, requireBusinessAccess);

  /**
   * @swagger
   * /api/v1/closures/my:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create a closure for your business
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - startDate
   *               - reason
   *               - type
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               reason:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [VACATION, MAINTENANCE, EMERGENCY, HOLIDAY, STAFF_SHORTAGE, OTHER]
   *     responses:
   *       201:
   *         description: Closure created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/my',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createMyBusinessClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/my:
   *   get:
   *     tags: [Business Closures]
   *     summary: Get closures for your business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: active
   *         schema:
   *           type: string
   *           enum: [true, false, upcoming]
   *     responses:
   *       200:
   *         description: List of closures
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/my',
    requireAny([PermissionName.VIEW_ALL_CLOSURES, PermissionName.VIEW_OWN_CLOSURES]),
    businessClosureController.getMyBusinessClosures.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/my/emergency:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create an emergency closure for your business
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *               endDate:
   *                 type: string
   *                 format: date
   *     responses:
   *       201:
   *         description: Emergency closure created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/my/emergency',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createMyEmergencyClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/my/maintenance:
   *   post:
   *     tags: [Business Closures]
   *     summary: Create a maintenance closure for your business
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - startDate
   *               - endDate
   *               - reason
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               reason:
   *                 type: string
   *     responses:
   *       201:
   *         description: Maintenance closure created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/my/maintenance',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createMyMaintenanceClosure.bind(businessClosureController)
  );

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
   * /api/v1/closures/impact-preview:
   *   post:
   *     tags: [Business Closures]
   *     summary: Preview impact of a closure before creating it
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - businessId
   *               - startDate
   *             properties:
   *               businessId:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               services:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Closure impact preview
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/impact-preview',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.getClosureImpactPreview.bind(businessClosureController)
  );

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

  // Enhanced Closure System Routes
  
  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/enhanced:
   *   post:
   *     tags: [Enhanced Business Closures]
   *     summary: Create an enhanced closure with notifications and analytics
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - startDate
   *               - reason
   *               - type
   *               - notifyCustomers
   *               - notificationChannels
   *               - isRecurring
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               reason:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [VACATION, MAINTENANCE, EMERGENCY, HOLIDAY, STAFF_SHORTAGE, OTHER]
   *               notifyCustomers:
   *                 type: boolean
   *               notificationMessage:
   *                 type: string
   *               notificationChannels:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [EMAIL, SMS, PUSH]
   *               affectedServices:
   *                 type: array
   *                 items:
   *                   type: string
   *               isRecurring:
   *                 type: boolean
   *               recurringPattern:
   *                 type: object
   *                 properties:
   *                   frequency:
   *                     type: string
   *                     enum: [WEEKLY, MONTHLY, YEARLY]
   *                   interval:
   *                     type: number
   *                   endDate:
   *                     type: string
   *                     format: date
   *     responses:
   *       201:
   *         description: Enhanced closure created successfully
   */
  router.post(
    '/business/:businessId/enhanced',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.createEnhancedClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/notifications:
   *   post:
   *     tags: [Enhanced Business Closures]
   *     summary: Send closure notifications to affected customers
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - channels
   *               - message
   *             properties:
   *               channels:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [EMAIL, SMS, PUSH]
   *               message:
   *                 type: string
   *               customTemplate:
   *                 type: string
   *     responses:
   *       200:
   *         description: Notifications sent successfully
   */
  router.post(
    '/:closureId/notifications',
    requireAny([PermissionName.MANAGE_ALL_CLOSURES, PermissionName.MANAGE_OWN_CLOSURES]),
    businessClosureController.sendClosureNotifications.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/affected-appointments:
   *   get:
   *     tags: [Enhanced Business Closures]
   *     summary: Get appointments affected by a specific closure
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of affected appointments
   */
  router.get(
    '/:closureId/affected-appointments',
    requireAny([PermissionName.VIEW_ALL_APPOINTMENTS, PermissionName.VIEW_OWN_APPOINTMENTS]),
    businessClosureController.getAffectedAppointmentsForClosure.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/reschedule-suggestions:
   *   post:
   *     tags: [Enhanced Business Closures]
   *     summary: Generate reschedule suggestions for affected appointments
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Reschedule suggestions generated
   */
  router.post(
    '/:closureId/reschedule-suggestions',
    requireAny([PermissionName.EDIT_ALL_APPOINTMENTS, PermissionName.EDIT_OWN_APPOINTMENTS]),
    businessClosureController.generateRescheduleSuggestions.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/auto-reschedule:
   *   post:
   *     tags: [Enhanced Business Closures]
   *     summary: Automatically reschedule appointments affected by closure
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - autoReschedule
   *               - maxRescheduleDays
   *               - preferredTimeSlots
   *               - notifyCustomers
   *               - allowWeekends
   *             properties:
   *               autoReschedule:
   *                 type: boolean
   *               maxRescheduleDays:
   *                 type: number
   *               preferredTimeSlots:
   *                 type: string
   *                 enum: [MORNING, AFTERNOON, EVENING, ANY]
   *               notifyCustomers:
   *                 type: boolean
   *               allowWeekends:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Auto-reschedule process completed
   */
  router.post(
    '/:closureId/auto-reschedule',
    requireAny([PermissionName.EDIT_ALL_APPOINTMENTS, PermissionName.EDIT_OWN_APPOINTMENTS]),
    businessClosureController.autoRescheduleAppointments.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/analytics:
   *   get:
   *     tags: [Enhanced Business Closures]
   *     summary: Get closure impact analytics for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Closure analytics data
   */
  router.get(
    '/business/:businessId/analytics',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessClosureController.getClosureAnalytics.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/customer-impact:
   *   get:
   *     tags: [Enhanced Business Closures]
   *     summary: Get customer impact report for a specific closure
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Customer impact report
   */
  router.get(
    '/:closureId/customer-impact',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessClosureController.getCustomerImpactReport.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/business/{businessId}/revenue-impact:
   *   get:
   *     tags: [Enhanced Business Closures]
   *     summary: Get revenue impact analysis for closures
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Revenue impact analysis
   */
  router.get(
    '/business/:businessId/revenue-impact',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessClosureController.getRevenueImpactAnalysis.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/availability-alerts:
   *   post:
   *     tags: [Enhanced Business Closures]
   *     summary: Create availability alert for when business reopens
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - customerId
   *               - businessId
   *               - preferredDates
   *               - notificationChannels
   *             properties:
   *               customerId:
   *                 type: string
   *               businessId:
   *                 type: string
   *               serviceId:
   *                 type: string
   *               preferredDates:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     startDate:
   *                       type: string
   *                       format: date
   *                     endDate:
   *                       type: string
   *                       format: date
   *               notificationChannels:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [EMAIL, SMS, PUSH]
   *     responses:
   *       201:
   *         description: Availability alert created
   */
  router.post(
    '/availability-alerts',
    businessClosureController.createAvailabilityAlert.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/availability-alerts/{alertId}:
   *   delete:
   *     tags: [Enhanced Business Closures]
   *     summary: Deactivate availability alert
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: alertId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Availability alert deactivated
   */
  router.delete(
    '/availability-alerts/:alertId',
    businessClosureController.deactivateAvailabilityAlert.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/notification-stats:
   *   get:
   *     tags: [Enhanced Business Closures]
   *     summary: Get notification delivery statistics for a closure
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Notification delivery statistics
   */
  router.get(
    '/:closureId/notification-stats',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessClosureController.getNotificationDeliveryStats.bind(businessClosureController)
  );

  /**
   * @swagger
   * /api/v1/closures/{closureId}/reschedule-stats:
   *   get:
   *     tags: [Enhanced Business Closures]
   *     summary: Get reschedule statistics for a closure
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: closureId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Reschedule statistics
   */
  router.get(
    '/:closureId/reschedule-stats',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessClosureController.getRescheduleStatistics.bind(businessClosureController)
  );

  return router;
}