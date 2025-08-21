import { Router } from 'express';
import { BusinessController } from '../../controllers/businessController';
import { authenticateToken, requirePermission, requireRole, requireAny } from '../../middleware/authUtils';
import { PermissionName } from '../../types/auth';

export function createBusinessRoutes(businessController: BusinessController): Router {
  const router = Router();

  // Public routes (no authentication required)
  /**
   * @swagger
   * /api/v1/businesses/search:
   *   get:
   *     tags: [Businesses]
   *     summary: Search businesses
   *     responses:
   *       200:
   *         description: Search results
   */
  router.get('/search', businessController.searchBusinesses.bind(businessController));
  /**
   * @swagger
   * /api/v1/businesses/nearby:
   *   get:
   *     tags: [Businesses]
   *     summary: Get nearby businesses
   *     responses:
   *       200:
   *         description: Nearby businesses
   */
  router.get('/nearby', businessController.getNearbyBusinesses.bind(businessController));
  /**
   * @swagger
   * /api/v1/businesses/slug/{slug}:
   *   get:
   *     tags: [Businesses]
   *     summary: Get business by slug
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Business details
   *       404:
   *         description: Not found
   */
  router.get('/slug/:slug', businessController.getBusinessBySlug.bind(businessController));
  /**
   * @swagger
   * /api/v1/businesses/types/{businessTypeId}:
   *   get:
   *     tags: [Businesses]
   *     summary: Get businesses by type
   *     parameters:
   *       - in: path
   *         name: businessTypeId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of businesses
   */
  router.get('/types/:businessTypeId', businessController.getBusinessesByType.bind(businessController));
  /**
   * @swagger
   * /api/v1/businesses/slug-availability/{slug}:
   *   get:
   *     tags: [Businesses]
   *     summary: Check slug availability
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Availability status
   */
  router.get('/slug-availability/:slug', businessController.checkSlugAvailability.bind(businessController));

  // Protected routes (authentication required)
  router.use(authenticateToken);

  // Business CRUD operations
  /**
   * @swagger
   * /api/v1/businesses:
   *   post:
   *     tags: [Businesses]
   *     summary: Create a business
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Business created
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/',
    requirePermission(PermissionName.CREATE_BUSINESS),
    businessController.createBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}:
   *   get:
   *     tags: [Businesses]
   *     summary: Get business by ID
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
   *         description: Business details
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.get(
    '/:id',
    requireAny([PermissionName.VIEW_ALL_BUSINESSES, PermissionName.VIEW_OWN_BUSINESS]),
    businessController.getBusinessById.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}:
   *   put:
   *     tags: [Businesses]
   *     summary: Update a business
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
   *         description: Business updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.put(
    '/:id',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    businessController.updateBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}:
   *   delete:
   *     tags: [Businesses]
   *     summary: Delete a business
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
   *         description: Business deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Not found
   */
  router.delete(
    '/:id',
    requireAny([PermissionName.DELETE_ALL_BUSINESSES, PermissionName.DELETE_OWN_BUSINESS]),
    businessController.deleteBusiness.bind(businessController)
  );

  // Business status management
  /**
   * @swagger
   * /api/v1/businesses/{id}/verify:
   *   post:
   *     tags: [Businesses]
   *     summary: Verify a business
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
   *         description: Business verified
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:id/verify',
    requirePermission(PermissionName.VERIFY_BUSINESS),
    businessController.verifyBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}/unverify:
   *   post:
   *     tags: [Businesses]
   *     summary: Unverify a business
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
   *         description: Business unverified
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:id/unverify',
    requirePermission(PermissionName.VERIFY_BUSINESS),
    businessController.unverifyBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}/close:
   *   post:
   *     tags: [Businesses]
   *     summary: Close a business
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
   *         description: Business closed
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:id/close',
    requireAny([PermissionName.CLOSE_ALL_BUSINESSES, PermissionName.CLOSE_OWN_BUSINESS]),
    businessController.closeBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}/reopen:
   *   post:
   *     tags: [Businesses]
   *     summary: Reopen a business
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
   *         description: Business reopened
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:id/reopen',
    requireAny([PermissionName.CLOSE_ALL_BUSINESSES, PermissionName.CLOSE_OWN_BUSINESS]),
    businessController.reopenBusiness.bind(businessController)
  );

  // Business management
  /**
   * @swagger
   * /api/v1/businesses/{id}/hours:
   *   put:
   *     tags: [Businesses]
   *     summary: Update business hours
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
   *         description: Hours updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.put(
    '/:id/hours',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    businessController.updateBusinessHours.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{id}/stats:
   *   get:
   *     tags: [Businesses]
   *     summary: Get business stats
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
   *         description: Stats data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:id/stats',
    requireAny([PermissionName.VIEW_ALL_ANALYTICS, PermissionName.VIEW_OWN_ANALYTICS]),
    businessController.getBusinessStats.bind(businessController)
  );

  // User's businesses
  /**
   * @swagger
   * /api/v1/businesses/owner:
   *   get:
   *     tags: [Businesses]
   *     summary: Get current user's businesses
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of businesses
   *       401:
   *         description: Unauthorized
   */
  /**
   * @swagger
   * /api/v1/businesses/owner/{ownerId}:
   *   get:
   *     tags: [Businesses]
   *     summary: Get user's businesses by ownerId
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of businesses
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/owner/:ownerId?',
    requireAny([PermissionName.VIEW_ALL_BUSINESSES, PermissionName.VIEW_OWN_BUSINESS]),
    businessController.getUserBusinesses.bind(businessController)
  );

  // Admin routes
  /**
   * @swagger
   * /api/v1/businesses/admin/all:
   *   get:
   *     tags: [Businesses]
   *     summary: Get all businesses (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of businesses
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/admin/all',
    requirePermission(PermissionName.VIEW_ALL_BUSINESSES),
    businessController.getAllBusinesses.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/admin/batch-verify:
   *   post:
   *     tags: [Businesses]
   *     summary: Batch verify businesses (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Batch verification complete
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/batch-verify',
    requirePermission(PermissionName.VERIFY_BUSINESS),
    businessController.batchVerifyBusinesses.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/admin/batch-close:
   *   post:
   *     tags: [Businesses]
   *     summary: Batch close businesses (admin)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Batch close complete
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/admin/batch-close',
    requirePermission(PermissionName.CLOSE_ALL_BUSINESSES),
    businessController.batchCloseBusinesses.bind(businessController)
  );

  return router;
}