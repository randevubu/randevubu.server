import { Router } from 'express';
import { RepositoryContainer } from '../../repositories';
import { ServiceContainer } from '../../services';
import { AuthController } from '../../controllers/authController';
import { UserBehaviorController } from '../../controllers/userBehaviorController';
import { dynamicCache, semiDynamicCache } from '../../middleware/cacheMiddleware';
import { trackCachePerformance } from '../../middleware/cacheMonitoring';
import { invalidateUserCache } from '../../middleware/cacheInvalidation';
import { AuthMiddleware, rateLimitByUser } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validation';
import { requirePermission, requireAny, withAuth } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';
import { 
  updateProfileSchema,
  changePhoneSchema
} from '../../schemas/auth.schemas';
import {
  customerSearchSchema,
  banCustomerSchema,
  unbanCustomerSchema,
  flagCustomerSchema,
  addStrikeSchema,
  batchCustomerActionSchema,
  updateCustomerProfileSchema,
  customerDetailQuerySchema
} from '../../schemas/customer.schemas';
import prisma from '../../lib/prisma';

// Initialize dependencies
const repositories = new RepositoryContainer(prisma);
const services = new ServiceContainer(repositories, prisma);
const authController = new AuthController(
  services.authService,
  services.phoneVerificationService,
  services.tokenService,
  services.rbacService
);
const userBehaviorController = new UserBehaviorController(
  services.userBehaviorService
);
const authMiddleware = new AuthMiddleware(repositories, services.tokenService, services.rbacService);

export function createUserRoutes(): Router {
  const router = Router();

  // Apply cache monitoring to all routes
  router.use(trackCachePerformance);

  /**
   * @swagger
   * /api/v1/users/profile:
   *   get:
   *     tags: [User Management]
   *     summary: Get user profile
   *     description: Retrieve the authenticated user's profile information
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProfileResponse'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get(
    '/profile',
    dynamicCache,
    authMiddleware.authenticate,
    withAuth(authController.getProfile)
  );

  /**
   * @swagger
   * /api/v1/users/profile:
   *   patch:
   *     tags: [User Management]
   *     summary: Update user profile
   *     description: Update the authenticated user's profile information
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProfileRequest'
   *           example:
   *             firstName: "John"
   *             lastName: "Doe"
   *             timezone: "America/New_York"
   *             language: "en"
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProfileResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.patch(
    '/profile',
    invalidateUserCache,
    authMiddleware.authenticate,
    rateLimitByUser(20, 15 * 60 * 1000),
    validateBody(updateProfileSchema),
    withAuth(authController.updateProfile)
  );

  /**
   * @swagger
   * /api/v1/users/change-phone:
   *   post:
   *     tags: [User Management]
   *     summary: Change user's phone number
   *     description: Change the authenticated user's phone number using a verification code
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChangePhoneRequest'
   *     responses:
   *       200:
   *         description: Phone changed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post(
    '/change-phone',
    invalidateUserCache,
    authMiddleware.authenticate,
    rateLimitByUser(5, 15 * 60 * 1000),
    validateBody(changePhoneSchema),
    withAuth(authController.changePhone)
  );

  /**
   * @swagger
   * /api/v1/users/account:
   *   delete:
   *     tags: [User Management]
   *     summary: Delete user account
   *     description: Permanently delete the authenticated user's account
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.delete(
    '/account',
    invalidateUserCache,
    authMiddleware.authenticate,
    rateLimitByUser(3, 15 * 60 * 1000),
    withAuth(authController.deleteAccount)
  );

  /**
   * @swagger
   * /api/v1/users/stats:
   *   get:
   *     tags: [User Management]
   *     summary: Get user stats
   *     description: Retrieve rate-limited stats for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Stats retrieved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get(
    '/stats',
    dynamicCache,
    authMiddleware.authenticate,
    rateLimitByUser(5, 60 * 1000),
    withAuth(authController.getStats)
  );

  /**
   * @swagger
   * /api/v1/users/my-customers:
   *   get:
   *     tags: [User Management]
   *     summary: Get customers from user's businesses
   *     description: Retrieve customers who have appointments at businesses the user owns or works at. Only OWNER and STAFF roles can access this endpoint.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search customers by name or phone number
   *         example: "john smith"
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
   *         description: Number of customers per page
   *     responses:
   *       200:
   *         description: Customers retrieved successfully
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
   *                   example: "Customers retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     customers:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "user_123"
   *                           firstName:
   *                             type: string
   *                             example: "John"
   *                           lastName:
   *                             type: string
   *                             example: "Doe"
   *                           phoneNumber:
   *                             type: string
   *                             example: "+1234567890"
   *                           email:
   *                             type: string
   *                             example: "john@example.com"
   *                           profilePicture:
   *                             type: string
   *                             nullable: true
   *                           isActive:
   *                             type: boolean
   *                             example: true
   *                     total:
   *                       type: integer
   *                       example: 25
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     totalPages:
   *                       type: integer
   *                       example: 1
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Access denied - business role required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Access denied. Business role required."
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Access denied. Business role required."
   *                     code:
   *                       type: string
   *                       example: "CUSTOMER_ACCESS_DENIED"
   *                     requestId:
   *                       type: string
   *                       example: "req_123456"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get(
    '/my-customers',
    dynamicCache,
    authMiddleware.authenticate,
    validateQuery(customerSearchSchema),
    rateLimitByUser(20, 60 * 1000),
    withAuth(authController.getMyCustomers)
  );

  // Customer Management Endpoints
  
  /**
   * @swagger
   * /api/v1/users/customers:
   *   get:
   *     tags: [Customer Management]
   *     summary: Search and list customers
   *     description: Search and filter customers with pagination. Requires business owner or staff permissions.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search customers by name or phone number
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Results per page (max 100)
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, banned, flagged, all]
   *           default: all
   *         description: Filter by customer status
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [firstName, lastName, phoneNumber, createdAt, lastLoginAt]
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Customers retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    '/customers',
    dynamicCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    validateQuery(customerSearchSchema),
    rateLimitByUser(30, 60 * 1000),
    withAuth(authController.getMyCustomers)
  );

  /**
   * @swagger
   * /api/v1/users/customers/{customerId}:
   *   get:
   *     tags: [Customer Management]
   *     summary: Get customer information and stats
   *     description: Get essential customer information with appointment statistics and reliability score
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: Customer ID
   *     responses:
   *       200:
   *         description: Customer details retrieved successfully
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
   *                   example: "Customer details retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "user_clh7j2k3l0000qwerty123456"
   *                     firstName:
   *                       type: string
   *                       nullable: true
   *                       example: "John"
   *                     lastName:
   *                       type: string
   *                       nullable: true
   *                       example: "Doe"
   *                     phoneNumber:
   *                       type: string
   *                       example: "+1234567890"
   *                     avatar:
   *                       type: string
   *                       nullable: true
   *                       example: "https://example.com/avatars/john-doe.jpg"
   *                     isActive:
   *                       type: boolean
   *                       example: true
   *                     isVerified:
   *                       type: boolean
   *                       example: true
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-15T10:30:00.000Z"
   *                     lastLoginAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                       example: "2024-03-15T09:15:30.000Z"
   *                     totalAppointments:
   *                       type: integer
   *                       example: 12
   *                       description: Total number of appointments
   *                     completedAppointments:
   *                       type: integer
   *                       example: 10
   *                       description: Number of completed appointments
   *                     cancelledAppointments:
   *                       type: integer
   *                       example: 1
   *                       description: Number of cancelled appointments
   *                     noShowCount:
   *                       type: integer
   *                       example: 1
   *                       description: Number of no-show appointments
   *                     reliabilityScore:
   *                       type: number
   *                       example: 85.5
   *                       description: Customer reliability score (0-100)
   *                     lastAppointmentDate:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                       example: "2024-02-15T15:30:00.000Z"
   *                       description: Date of last appointment
   *             example:
   *               success: true
   *               message: "Customer details retrieved successfully"
   *               data:
   *                 id: "user_clh7j2k3l0000qwerty123456"
   *                 firstName: "John"
   *                 lastName: "Doe"
   *                 phoneNumber: "+1234567890"
   *                 avatar: "https://example.com/avatars/john-doe.jpg"
   *                 isActive: true
   *                 isVerified: true
   *                 createdAt: "2024-01-15T10:30:00.000Z"
   *                 lastLoginAt: "2024-03-15T09:15:30.000Z"
   *                 totalAppointments: 12
   *                 completedAppointments: 10
   *                 cancelledAppointments: 1
   *                 noShowCount: 1
   *                 reliabilityScore: 85.5
   *                 lastAppointmentDate: "2024-02-15T15:30:00.000Z"
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Customer not accessible from your businesses
   *       404:
   *         description: Customer not found
   */
  router.get(
    '/customers/:customerId',
    dynamicCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_OWN_CUSTOMERS, PermissionName.VIEW_USER_BEHAVIOR]),
    rateLimitByUser(20, 60 * 1000),
    withAuth(authController.getCustomerDetails)
  );

  /**
   * @swagger
   * /api/v1/users/customers/{customerId}/ban:
   *   post:
   *     tags: [Customer Management]
   *     summary: Ban a customer
   *     description: Ban a customer from booking appointments. Requires BAN_USERS permission.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: Customer ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 500
   *                 example: "Repeated no-shows and disruptive behavior"
   *               duration:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 365
   *                 example: 30
   *                 description: Ban duration in days (optional for permanent ban)
   *               isTemporary:
   *                 type: boolean
   *                 default: true
   *               notifyCustomer:
   *                 type: boolean
   *                 default: true
   *               additionalNotes:
   *                 type: string
   *                 maxLength: 1000
   *     responses:
   *       200:
   *         description: Customer banned successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Customer not found
   */
  router.post(
    '/customers/:customerId/ban',
    invalidateUserCache,
    authMiddleware.authenticate,
    requirePermission(PermissionName.BAN_USERS),
    validateBody(banCustomerSchema),
    rateLimitByUser(10, 60 * 1000),
    withAuth(userBehaviorController.banUser.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/users/customers/{customerId}/unban:
   *   post:
   *     tags: [Customer Management]
   *     summary: Unban a customer
   *     description: Remove ban from a customer. Requires BAN_USERS permission.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: Customer ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 5
   *                 maxLength: 500
   *                 example: "Appeal approved - customer showed improvement"
   *               notifyCustomer:
   *                 type: boolean
   *                 default: true
   *               restoreAccess:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Customer unbanned successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Customer not found or not banned
   */
  router.post(
    '/customers/:customerId/unban',
    invalidateUserCache,
    authMiddleware.authenticate,
    requirePermission(PermissionName.BAN_USERS),
    validateBody(unbanCustomerSchema),
    rateLimitByUser(10, 60 * 1000),
    withAuth(userBehaviorController.unbanUser.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/users/customers/{customerId}/flag:
   *   post:
   *     tags: [Customer Management]
   *     summary: Flag a customer for review
   *     description: Flag a customer for administrative review
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: Customer ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 500
   *                 example: "Suspicious booking patterns requiring review"
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 default: medium
   *               category:
   *                 type: string
   *                 enum: [inappropriate_behavior, spam, fake_bookings, payment_issues, harassment, fraud_suspicion, other]
   *                 default: other
   *               additionalDetails:
   *                 type: string
   *                 maxLength: 1000
   *               requiresReview:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       200:
   *         description: Customer flagged successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    '/customers/:customerId/flag',
    invalidateUserCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.FLAG_USERS, PermissionName.MANAGE_USER_BEHAVIOR]),
    validateBody(flagCustomerSchema),
    rateLimitByUser(20, 60 * 1000),
    withAuth(userBehaviorController.flagUserForReview.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/users/customers/{customerId}/strike:
   *   post:
   *     tags: [Customer Management]
   *     summary: Add a strike to customer
   *     description: Add a behavioral strike to a customer's record
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: Customer ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 500
   *                 example: "No-show for scheduled appointment"
   *               severity:
   *                 type: string
   *                 enum: [minor, major, severe]
   *                 default: minor
   *               category:
   *                 type: string
   *                 enum: [no_show, late_cancellation, inappropriate_behavior, policy_violation, other]
   *                 default: other
   *               appointmentId:
   *                 type: string
   *                 description: Associated appointment ID if applicable
   *               additionalNotes:
   *                 type: string
   *                 maxLength: 1000
   *               autoExpire:
   *                 type: boolean
   *                 default: true
   *               expireAfterDays:
   *                 type: integer
   *                 minimum: 30
   *                 maximum: 365
   *                 default: 90
   *     responses:
   *       200:
   *         description: Strike added successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    '/customers/:customerId/strike',
    authMiddleware.authenticate,
    requireAny([PermissionName.MANAGE_STRIKES, PermissionName.MANAGE_USER_BEHAVIOR]),
    validateBody(addStrikeSchema),
    rateLimitByUser(15, 60 * 1000),
    withAuth(userBehaviorController.addStrike.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/users/customers/{customerId}/behavior:
   *   get:
   *     tags: [Customer Management]
   *     summary: Get customer behavior analytics
   *     description: Get comprehensive behavior analytics for a customer
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: string
   *         description: Customer ID
   *     responses:
   *       200:
   *         description: Behavior analytics retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Customer not found
   */
  router.get(
    '/customers/:customerId/behavior',
    dynamicCache,
    authMiddleware.authenticate,
    requireAny([PermissionName.VIEW_USER_BEHAVIOR, PermissionName.VIEW_OWN_CUSTOMERS]),
    rateLimitByUser(30, 60 * 1000),
    withAuth(userBehaviorController.getUserBehavior.bind(userBehaviorController))
  );

  /**
   * @swagger
   * /api/v1/users/customers/batch-action:
   *   post:
   *     tags: [Customer Management]
   *     summary: Perform batch actions on customers
   *     description: Perform actions like ban, unban, flag, or strike on multiple customers at once
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [customerIds, action, reason]
   *             properties:
   *               customerIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 minItems: 1
   *                 maxItems: 50
   *                 example: ["user1", "user2", "user3"]
   *               action:
   *                 type: string
   *                 enum: [ban, unban, flag, strike]
   *                 example: ban
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 500
   *                 example: "Bulk action: Repeated policy violations"
   *               duration:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 365
   *                 description: For ban action - duration in days
   *               severity:
   *                 type: string
   *                 enum: [minor, major, severe]
   *                 description: For strike action
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, critical]
   *                 description: For flag action
   *               category:
   *                 type: string
   *                 description: Action category
   *               notifyCustomers:
   *                 type: boolean
   *                 default: false
   *                 description: Whether to notify affected customers
   *     responses:
   *       200:
   *         description: Batch action completed successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    '/customers/batch-action',
    authMiddleware.authenticate,
    requireAny([
      PermissionName.BAN_USERS, 
      PermissionName.MANAGE_STRIKES, 
      PermissionName.FLAG_USERS,
      PermissionName.MANAGE_USER_BEHAVIOR
    ]),
    validateBody(batchCustomerActionSchema),
    rateLimitByUser(3, 60 * 1000), // Very limited for batch operations
    withAuth(userBehaviorController.batchBanUsers.bind(userBehaviorController))
  );

  return router;
}

export default createUserRoutes;