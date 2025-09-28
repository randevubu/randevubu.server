import { Router } from 'express';
import { AppointmentController } from '../../controllers/appointmentController';
import prisma from '../../lib/prisma';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import { AuthMiddleware } from '../../middleware/auth';
import { AuthorizationMiddleware } from '../../middleware/authorization';
import { PermissionName } from '../../types/auth';
import { attachBusinessContext, requireBusinessAccess } from '../../middleware/attachBusinessContext';

// Initialize middleware dependencies (aligns with v1 routes pattern)
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);
const authorizationMiddleware = new AuthorizationMiddleware(services.rbacService);

export function createAppointmentRoutes(appointmentController: AppointmentController): Router {
  const router = Router();

  // All appointment routes require authentication
  router.use(authMiddleware.authenticate);
  router.use(attachBusinessContext);

  // User's appointments access
  /**
   * @swagger
   * /api/v1/appointments/my-appointments:
   *   get:
   *     tags: [Appointments]
   *     summary: Get user's appointments from their businesses
   *     description: Returns appointments from businesses the user owns or works at. Only OWNER and STAFF roles can access this endpoint.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [CONFIRMED, COMPLETED, CANCELLED, NO_SHOW]
   *         description: Filter by appointment status
   *       - in: query
   *         name: date
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter by specific date (YYYY-MM-DD)
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Filter by specific business
   *       - in: query
   *         name: staffId
   *         schema:
   *           type: string
   *         description: Filter by specific staff member (owners/managers only)
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Number of appointments per page
   *     responses:
   *       200:
   *         description: Appointments retrieved successfully
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
   *                   example: "Appointments retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     appointments:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/AppointmentWithDetails'
   *                     total:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *       403:
   *         description: Access denied - business role required
   */
  router.get('/my-appointments', requireBusinessAccess, appointmentController.getMyAppointments.bind(appointmentController));

  // Appointment CRUD operations
 /**
   * @swagger
   * /api/v1/appointments:
   *   post:
   *     tags: [Appointments]
   *     summary: Create an appointment
   *     description: Create an appointment for yourself or on behalf of a customer (requires appropriate permissions)
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
   *               - serviceId
   *               - staffId
   *               - date
   *               - startTime
   *             properties:
   *               businessId:
   *                 type: string
   *                 description: ID of the business
   *                 example: "biz_123456"
   *               serviceId:
   *                 type: string
   *                 description: ID of the service
   *                 example: "svc_789"
   *               staffId:
   *                 type: string
   *                 description: ID of the staff member
   *                 example: "staff_456"
   *               customerId:
   *                 type: string
   *                 description: ID of the customer (optional - if not provided, appointment is created for the authenticated user)
   *                 example: "user_321"
   *               date:
   *                 type: string
   *                 format: date
   *                 description: Appointment date in YYYY-MM-DD format
   *                 example: "2024-01-15"
   *               startTime:
   *                 type: string
   *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
   *                 description: Start time in HH:MM format (24-hour)
   *                 example: "14:30"
   *               customerNotes:
   *                 type: string
   *                 maxLength: 500
   *                 description: Optional notes from the customer
   *                 example: "Please call when you arrive"
   *     responses:
   *       201:
   *         description: Appointment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/AppointmentData'
   *                 message:
   *                   type: string
   *                   example: "Appointment created successfully"
   *       400:
   *         description: Validation error or business logic error
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
   *                     - "You do not have permission to create appointments for other customers"
   *                     - "Customer not found"
   *                     - "Staff member is not available at the selected time"
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions to create appointments for others
   */
  router.post(
    '/',
    appointmentController.createAppointment.bind(appointmentController)
  );

  // Customer appointments - MUST be before /:id route to avoid route conflicts
  /**
   * @swagger
   * /api/v1/appointments/customer:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments for current user as customer
   *     description: Returns all appointments where the current logged-in user is the customer
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of appointments per page (max 100)
   *         example: 10
   *     responses:
   *       200:
   *         description: User's appointments retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "apt_123456"
   *                       businessId:
   *                         type: string
   *                         example: "biz_789"
   *                       serviceId:
   *                         type: string
   *                         example: "svc_456"
   *                       date:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T00:00:00.000Z"
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T10:00:00.000Z"
   *                       endTime:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T10:30:00.000Z"
   *                       duration:
   *                         type: integer
   *                         example: 30
   *                       status:
   *                         type: string
   *                         enum: [CONFIRMED, COMPLETED, CANCELLED, NO_SHOW]
   *                         example: "CONFIRMED"
   *                       price:
   *                         type: number
   *                         example: 50.00
   *                       currency:
   *                         type: string
   *                         example: "TRY"
   *                       customerNotes:
   *                         type: string
   *                         nullable: true
   *                         example: "Please call when you arrive"
   *                       bookedAt:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-10T14:30:00.000Z"
   *                       business:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "biz_789"
   *                           name:
   *                             type: string
   *                             example: "Downtown Hair Salon"
   *                           address:
   *                             type: string
   *                             example: "123 Main St, City"
   *                           phoneNumber:
   *                             type: string
   *                             example: "+90 555 123 4567"
   *                           timezone:
   *                             type: string
   *                             example: "Europe/Istanbul"
   *                       service:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "svc_456"
   *                           name:
   *                             type: string
   *                             example: "Haircut & Style"
   *                           duration:
   *                             type: integer
   *                             example: 30
   *                           price:
   *                             type: number
   *                             example: 50.00
   *                       staff:
   *                         type: object
   *                         nullable: true
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "staff_123"
   *                           user:
   *                             type: object
   *                             properties:
   *                               firstName:
   *                                 type: string
   *                                 example: "Sarah"
   *                               lastName:
   *                                 type: string
   *                                 example: "Johnson"
   *                 meta:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                       example: 25
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     totalPages:
   *                       type: integer
   *                       example: 3
   *                     limit:
   *                       type: integer
   *                       example: 10
   *       401:
   *         description: Unauthorized - Invalid or missing token
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
   *                   example: "Unauthorized"
   *       403:
   *         description: Access denied
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
   *                   example: "Access denied"
   * /api/v1/appointments/customer/{customerId}:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments for a specific customer (admin/staff only)
   *     description: Returns appointments for a specific customer. Requires appropriate permissions.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the customer
   *         example: "user_789"
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of appointments per page (max 100)
   *         example: 10
   *     responses:
   *       200:
   *         description: Customer appointments retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AppointmentWithDetails'
   *                 meta:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                       example: 15
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     totalPages:
   *                       type: integer
   *                       example: 2
   *                     limit:
   *                       type: integer
   *                       example: 10
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       403:
   *         description: Access denied - Insufficient permissions
   *       404:
   *         description: Customer not found
   */
  router.get(
    '/customer/:customerId?',
    appointmentController.getCustomerAppointments.bind(appointmentController)
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

  /**
   * @swagger
   * /api/v1/appointments/{id}/status:
   *   put:
   *     tags: [Appointments]
   *     summary: Update appointment status only
   *     description: Updates only the status of an appointment. Available to business staff and appointment owners.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The appointment ID
   *         example: "apt_123456"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [CONFIRMED, COMPLETED, CANCELED, NO_SHOW]
   *                 description: The new status for the appointment
   *                 example: "COMPLETED"
   *           examples:
   *             complete:
   *               summary: Mark as completed
   *               value:
   *                 status: "COMPLETED"
   *             cancel:
   *               summary: Cancel appointment
   *               value:
   *                 status: "CANCELED"
   *             no_show:
   *               summary: Mark as no-show
   *               value:
   *                 status: "NO_SHOW"
   *     responses:
   *       200:
   *         description: Appointment status updated successfully
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
   *                   example: "Appointment status updated to COMPLETED"
   *                 data:
   *                   $ref: '#/components/schemas/AppointmentData'
   *       400:
   *         description: Invalid status or validation error
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
   *                   example: "Invalid status. Must be one of: CONFIRMED, COMPLETED, CANCELED, NO_SHOW"
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied
   *       404:
   *         description: Appointment not found
   */
  router.put(
    '/:id/status',
    appointmentController.updateAppointmentStatus.bind(appointmentController)
  );

  // Appointment status management
  /**
   * @swagger
   * /api/v1/appointments/{id}/cancel:
   *   post:
   *     tags: [Appointments]
   *     summary: Cancel an appointment
   *     description: |
   *       Cancel an appointment. Users can cancel appointments in these cases:
   *       - Customers can cancel their own appointments
   *       - Business staff can cancel appointments in their business (with proper permissions)
   *       - Global admins can cancel any appointment
   *       
   *       Cannot cancel appointments that are already completed or cancelled.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The appointment ID to cancel
   *         example: "apt_123456"
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Optional reason for cancellation
   *                 example: "Personal emergency"
   *                 maxLength: 500
   *           examples:
   *             with_reason:
   *               summary: Cancel with reason
   *               value:
   *                 reason: "Personal emergency"
   *             without_reason:
   *               summary: Cancel without reason
   *               value: {}
   *     responses:
   *       200:
   *         description: Appointment cancelled successfully
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
   *                   example: "Appointment cancelled successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "apt_123456"
   *                     status:
   *                       type: string
   *                       enum: [CANCELED]
   *                       example: "CANCELED"
   *                     cancelledAt:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-15T10:30:00.000Z"
   *                     cancelReason:
   *                       type: string
   *                       nullable: true
   *                       example: "Personal emergency"
   *                     customerId:
   *                       type: string
   *                       example: "user_789"
   *                     businessId:
   *                       type: string
   *                       example: "biz_123"
   *                     serviceId:
   *                       type: string
   *                       example: "svc_456"
   *                     date:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-20T00:00:00.000Z"
   *                     startTime:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-20T14:00:00.000Z"
   *                     endTime:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-20T15:00:00.000Z"
   *       400:
   *         description: Bad request - Cannot cancel appointment
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
   *                     - "Cannot cancel completed appointments"
   *                     - "Appointment is already cancelled"
   *                     - "Failed to cancel appointment"
   *       401:
   *         description: Unauthorized - Invalid or missing token
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
   *                   example: "Unauthorized"
   *       403:
   *         description: Access denied - Cannot cancel this appointment
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
   *                   example: "Access denied: You do not have permission to cancel this appointment"
   *       404:
   *         description: Appointment not found
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
   *                   example: "Appointment not found"
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

  // Context-based today's appointments for user's businesses
  /**
   * @swagger
   * /api/v1/appointments/my/today:
   *   get:
   *     tags: [Appointments]
   *     summary: Get today's appointments for all my businesses
   *     description: Get today's appointments from all businesses the user owns or works at
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Today's appointments
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "apt_123"
   *                       date:
   *                         type: string
   *                         format: date
   *                         example: "2024-01-15"
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T10:00:00Z"
   *                       endTime:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T10:30:00Z"
   *                       status:
   *                         type: string
   *                         example: "CONFIRMED"
   *                       service:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "svc_456"
   *                           name:
   *                             type: string
   *                             example: "Haircut"
   *                           duration:
   *                             type: integer
   *                             example: 30
   *                       customer:
   *                         type: object
   *                         properties:
   *                           firstName:
   *                             type: string
   *                             example: "John"
   *                           lastName:
   *                             type: string
   *                             example: "Doe"
   *                 meta:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                       example: 5
   *                     businessId:
   *                       type: string
   *                       example: "all"
   *                     accessibleBusinesses:
   *                       type: integer
   *                       example: 2
   *                     date:
   *                       type: string
   *                       format: date
   *                       example: "2024-01-15"
   *       403:
   *         description: Access denied - business role required
   */
  router.get(
    '/my/today',
    requireBusinessAccess,
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

  // Context-based stats for user's businesses
  /**
   * @swagger
   * /api/v1/appointments/my/stats:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointment statistics for all my businesses
   *     description: Get appointment statistics from all businesses the user owns or works at
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for statistics (YYYY-MM-DD)
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for statistics (YYYY-MM-DD)  
   *         example: "2024-01-31"
   *     responses:
   *       200:
   *         description: Appointment statistics
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
   *                   additionalProperties:
   *                     type: object
   *                     properties:
   *                       total:
   *                         type: integer
   *                         example: 125
   *                       byStatus:
   *                         type: object
   *                         additionalProperties:
   *                           type: integer
   *                         example:
   *                           COMPLETED: 85
   *                           CONFIRMED: 25
   *                           CANCELLED: 5
   *                       totalRevenue:
   *                         type: number
   *                         example: 4250.00
   *                       averageValue:
   *                         type: number
   *                         example: 50.00
   *                 meta:
   *                   type: object
   *                   properties:
   *                     businessId:
   *                       type: string
   *                       example: "all"
   *                     accessibleBusinesses:
   *                       type: integer
   *                       example: 2
   *                     startDate:
   *                       type: string
   *                       format: date
   *                       example: "2024-01-01"
   *                     endDate:
   *                       type: string
   *                       format: date
   *                       example: "2024-01-31"
   *       403:
   *         description: Access denied - business role required
   */
  router.get(
    '/my/stats',
    requireBusinessAccess,
    appointmentController.getAppointmentStats.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/business/{businessId}/date-range:
   *   get:
   *     tags: [Appointments]
   *     summary: Get appointments by date range for business
   *     description: Public endpoint for customers to check availability. Returns basic appointment info without sensitive data.
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
   */
  router.get(
    '/business/:businessId/date-range',
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
    appointmentController.getStaffAppointments.bind(appointmentController)
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

  /**
   * @swagger
   * /api/v1/appointments/nearest-current-hour:
   *   get:
   *     tags: [Appointments]
   *     summary: Get nearest appointment in current hour
   *     description: Get the nearest appointment for the authenticated user within the current hour
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Nearest appointment retrieved successfully or null if none found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   oneOf:
   *                     - type: "null"
   *                     - type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         businessId:
   *                           type: string
   *                         startTime:
   *                           type: string
   *                           format: date-time
   *                         endTime:
   *                           type: string
   *                           format: date-time
   *                         status:
   *                           type: string
   *                         service:
   *                           type: object
   *                           properties:
   *                             name:
   *                               type: string
   *                             duration:
   *                               type: number
   *                         business:
   *                           type: object
   *                           properties:
   *                             name:
   *                               type: string
   *                             timezone:
   *                               type: string
   *                         timeUntilAppointment:
   *                           type: number
   *                           description: Milliseconds until appointment
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/nearest-current-hour',
    appointmentController.getNearestCurrentHour.bind(appointmentController)
  );

  /**
   * @swagger
   * /api/v1/appointments/current-hour:
   *   get:
   *     tags: [Appointments]
   *     summary: Get all appointments in current hour
   *     description: Get all appointments for the authenticated user within the current hour
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Appointments retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       businessId:
   *                         type: string
   *                       startTime:
   *                         type: string
   *                         format: date-time
   *                       endTime:
   *                         type: string
   *                         format: date-time
   *                       status:
   *                         type: string
   *                       service:
   *                         type: object
   *                       business:
   *                         type: object
   *                       timeUntilAppointment:
   *                         type: number
   *                 meta:
   *                   type: object
   *                   properties:
   *                     count:
   *                       type: number
   *                     currentHour:
   *                       type: number
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/current-hour',
    appointmentController.getCurrentHourAppointments.bind(appointmentController)
  );

  return router;
}