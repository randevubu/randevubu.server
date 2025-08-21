import { Router } from 'express';
import { AppointmentController } from '../../controllers/appointmentController';
import prisma from '../../lib/prisma';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import { AuthMiddleware } from '../../middleware/auth';
import { AuthorizationMiddleware } from '../../middleware/authorization';
import { PermissionName } from '../../types/auth';

// Initialize middleware dependencies (aligns with v1 routes pattern)
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);
const authorizationMiddleware = new AuthorizationMiddleware(services.rbacService);

export function createAppointmentRoutes(appointmentController: AppointmentController): Router {
  const router = Router();

  // All appointment routes require authentication
  router.use(authMiddleware.authenticate);

  // Appointment CRUD operations
 /**
   * @swagger
   * /api/v1/appointments:
   *   post:
   *     tags: [Appointments]
   *     summary: Create an appointment
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Appointment created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/',
    appointmentController.createAppointment.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/{id}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointment by ID
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
   *         description: Appointment details
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Appointment not found
   */
  router.get(
    '/:id',
    appointmentController.getAppointmentById.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/{id}:
   *   put:
   *     tags: [Appointments]
   *     summary: Update an appointment
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
   *         description: Appointment updated
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Appointment not found
   */
  router.put(
    '/:id',
    appointmentController.updateAppointment.bind(appointmentController)
  );

  // Appointment status management
  /**
   * @swagger
   * /api/v1/appointments/{id}/cancel:
   *   post:
   *     tags: [Appointments]
   *     summary: Cancel an appointment
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
   *         description: Appointment cancelled
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Appointment not found
   */
  router.post(
    '/:id/cancel',
    appointmentController.cancelAppointment.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/{id}/confirm:
   *   post:
   *     tags: [Appointments]
   *     summary: Confirm an appointment
   *     description: Requires appropriate permission.
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
   *         description: Appointment confirmed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Appointment not found
   */
  router.post(
    '/:id/confirm',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'confirm' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'edit_all' })
    ),
    appointmentController.confirmAppointment.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/{id}/complete:
   *   post:
   *     tags: [Appointments]
   *     summary: Mark an appointment as complete
   *     description: Requires appropriate permission.
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
   *         description: Appointment completed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Appointment not found
   */
  router.post(
    '/:id/complete',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'complete' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'edit_all' })
    ),
    appointmentController.completeAppointment.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/{id}/no-show:
   *   post:
   *     tags: [Appointments]
   *     summary: Mark an appointment as no-show
   *     description: Requires appropriate permission.
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
   *         description: Appointment marked as no-show
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Appointment not found
   */
  router.post(
    '/:id/no-show',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'mark_no_show' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'edit_all' })
    ),
    appointmentController.markNoShow.bind(appointmentController)
  );

  // Customer appointments
  /**
   * @swagger
   * /api/v1/appointments/customer:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments for current or specific customer
   *     description: If no customerId is provided, returns appointments for the current user.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   */
  /**
   * @swagger
   * /api/v1/appointments/customer/{customerId}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments for a specific customer
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/customer/:customerId?',
    appointmentController.getCustomerAppointments.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/my/upcoming:
   *   get:
   *     tags: [Appointments]
   *     summary: Get my upcoming appointments
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Upcoming appointments
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/my/upcoming',
    appointmentController.getUpcomingAppointments.bind(appointmentController)
  );

  // Business appointments
  /**
   * @swagger
   * /api/v1/appointments/business/{businessId}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get business appointments
   *     description: Requires appropriate permission.
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
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_own' })
    ),
    appointmentController.getBusinessAppointments.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/business/{businessId}/today:
   *   get:
   *     tags: [Appointments]
   *     summary: Get today's business appointments
   *     description: Requires appropriate permission.
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
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/today',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_own' })
    ),
    appointmentController.getTodaysAppointments.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/business/{businessId}/stats:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointment statistics for business
   *     description: Requires analytics permission.
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
   *         description: Statistics
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/stats',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'analytics', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'analytics', action: 'view_own' })
    ),
    appointmentController.getAppointmentStats.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/business/{businessId}/date-range:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments by date range for business
   *     description: Requires appropriate permission.
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
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/date-range',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_own' })
    ),
    appointmentController.getAppointmentsByDateRange.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/business/{businessId}/status/{status}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments by status for business
   *     description: Requires appropriate permission.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: status
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/business/:businessId/status/:status',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_own' })
    ),
    appointmentController.getAppointmentsByStatus.bind(appointmentController)
  );

  // Service and staff appointments
  /**
   * @swagger
   * /api/v1/appointments/service/{serviceId}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments for a service
   *     description: Requires appropriate permission.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: serviceId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/service/:serviceId',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_own' })
    ),
    appointmentController.getAppointmentsByService.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/staff/{staffId}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments for a staff member
   *     description: Requires appropriate permission.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/staff/:staffId',
    authorizationMiddleware.requireAny(
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
      authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_own' })
    ),
    appointmentController.getAppointmentsByStaff.bind(appointmentController)
  );

  // Search appointments
  /**
   * @swagger
   * /api/v1/appointments/search:
   *   get:
   *     tags: [Appointments]
   *     summary: Search appointments
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Search results
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/search',
    appointmentController.searchAppointments.bind(appointmentController)
  );

  // Admin routes
  /**
   * @swagger
   * /api/v1/appointments/admin/all:
   *   get:
   *     tags: [Appointments]
   *     summary: Get all appointments (admin)
   *     description: Requires admin permission.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Appointments list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/all',
    authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'view_all' }),
    appointmentController.getAllAppointments.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/admin/batch-update-status:
   *   post:
   *     tags: [Appointments]
   *     summary: Batch update appointment statuses (admin)
   *     description: Requires admin permission.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statuses updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/batch-update-status',
    authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'edit_all' }),
    appointmentController.batchUpdateAppointmentStatus.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/admin/batch-cancel:
   *   post:
   *     tags: [Appointments]
   *     summary: Batch cancel appointments (admin)
   *     description: Requires admin permission.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Appointments cancelled
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/batch-cancel',
    authorizationMiddleware.requirePermission({ resource: 'appointment', action: 'cancel_all' }),
    appointmentController.batchCancelAppointments.bind(appointmentController)
  );

  return router;
}