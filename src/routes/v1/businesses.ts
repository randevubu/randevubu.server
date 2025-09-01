import { Router } from 'express';
import { BusinessController } from '../../controllers/businessController';
import { requireAuth, requirePermission, requireRole, requireAny, withAuth } from '../../middleware/authUtils';
import { PermissionName, AuthenticatedRequest } from '../../types/auth';
import { 
  attachBusinessContext, 
  requireBusinessAccess, 
  allowEmptyBusinessContext,
  requireSpecificBusinessAccess 
} from '../../middleware/attachBusinessContext';

export function createBusinessRoutes(businessController: BusinessController): Router {
  const router = Router();

  // Public routes (no authentication required)
  /**
   * @swagger
   * /api/v1/businesses:
   *   get:
   *     tags: [Businesses]
   *     summary: Get all businesses with minimal details
   *     description: Public endpoint that returns all active businesses with minimal public information (no authentication required)
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of businesses per page
   *     responses:
   *       200:
   *         description: List of businesses with minimal details
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
   *                         example: "biz_123456789"
   *                       name:
   *                         type: string
   *                         example: "Hair & Beauty Salon"
   *                       slug:
   *                         type: string
   *                         example: "hair-beauty-salon"
   *                       description:
   *                         type: string
   *                         nullable: true
   *                         example: "Professional hair and beauty services"
   *                       city:
   *                         type: string
   *                         nullable: true
   *                         example: "Istanbul"
   *                       state:
   *                         type: string
   *                         nullable: true
   *                         example: "Istanbul"
   *                       country:
   *                         type: string
   *                         nullable: true
   *                         example: "Turkey"
   *                       logoUrl:
   *                         type: string
   *                         nullable: true
   *                         example: "https://example.com/logo.png"
   *                       coverImageUrl:
   *                         type: string
   *                         nullable: true
   *                         example: "https://example.com/cover.jpg"
   *                       primaryColor:
   *                         type: string
   *                         nullable: true
   *                         example: "#FF6B6B"
   *                       isVerified:
   *                         type: boolean
   *                         example: true
   *                       isClosed:
   *                         type: boolean
   *                         example: false
   *                       tags:
   *                         type: array
   *                         items:
   *                           type: string
   *                         example: ["hair", "beauty", "salon"]
   *                       businessType:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "beauty_salon"
   *                           name:
   *                             type: string
   *                             example: "beauty_salon"
   *                           displayName:
   *                             type: string
   *                             example: "Beauty Salon"
   *                           icon:
   *                             type: string
   *                             nullable: true
   *                             example: "💇‍♀️"
   *                           category:
   *                             type: string
   *                             example: "Beauty & Wellness"
   *                 meta:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                       example: 150
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     totalPages:
   *                       type: integer
   *                       example: 8
   *                     limit:
   *                       type: integer
   *                       example: 20
   *       500:
   *         description: Internal server error
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
   *                   example: "Failed to retrieve businesses"
   */
  router.get('/', businessController.getAllBusinessesMinimalDetails.bind(businessController));
  
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

  // Protected routes (authentication required) - MUST come before catch-all route
  router.use(requireAuth);
  router.use(attachBusinessContext);

  // User's business access
  /**
   * @swagger
   * /api/v1/businesses/my-business:
   *   get:
   *     tags: [Businesses]
   *     summary: Get user's business(es) based on role
   *     description: Returns businesses the user owns or works at. Only OWNER and STAFF roles can access this endpoint.
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Business data retrieved successfully
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
   *                   example: "Business data retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     businesses:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/BusinessData'
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
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Access denied. Business role required."
   *                     code:
   *                       type: string
   *                       example: "BUSINESS_ACCESS_DENIED"
   */
  router.get('/my-business', requireBusinessAccess, businessController.getMyBusiness.bind(businessController));

  // User's services access
  /**
   * @swagger
   * /api/v1/businesses/my-services:
   *   get:
   *     tags: [Businesses]
   *     summary: Get user's services from their businesses
   *     description: Returns services from businesses the user owns or works at. Only OWNER and STAFF roles can access this endpoint.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: businessId
   *         schema:
   *           type: string
   *         description: Filter by specific business
   *       - in: query
   *         name: active
   *         schema:
   *           type: boolean
   *         description: Filter by service status
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
   *         description: Number of services per page
   *     responses:
   *       200:
   *         description: Services retrieved successfully
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
   *                   example: "Services retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     services:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ServiceData'
   *                     total:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
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
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Access denied. Business role required."
   *                     code:
   *                       type: string
   *                       example: "BUSINESS_ACCESS_DENIED"
   */
  router.get('/my-services', requireBusinessAccess, businessController.getMyServices.bind(businessController));

  // Business CRUD operations
  /**
   * @swagger
   * /api/v1/businesses:
   *   post:
   *     tags: [Businesses]
   *     summary: Create a new business
   *     description: Create a new business for the authenticated user. Both CUSTOMER and OWNER roles can create businesses. CUSTOMER role users will be automatically upgraded to OWNER role for their business.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateBusinessRequest'
   *     responses:
   *       201:
   *         description: Business created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateBusinessResponse'
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
   *                   example: "Business name must be at least 2 characters"
   *                   description: Validation error message
   *       401:
   *         description: Unauthorized - authentication required
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
   *                   example: "Authentication required"
   *       403:
   *         description: Forbidden - insufficient permissions
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
   *                   example: "Only customers and business owners can create businesses"
   *       429:
   *         description: Too many requests - rate limit exceeded
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
   *                       example: "Too many requests"
   *                     retryAfter:
   *                       type: integer
   *                       example: 60
   *                       description: Seconds to wait before retrying
   *       500:
   *         description: Internal server error
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
   *                   example: "Failed to create business"
   *                   description: Internal server error message
   */
  router.post(
    '/',
    // Allow both CUSTOMER and OWNER roles to create businesses
    // The service layer will handle role validation and upgrade
    allowEmptyBusinessContext,
    (req: AuthenticatedRequest, res, next) => {
      console.log('🔍 ROUTE DEBUG: POST /businesses endpoint hit');
      console.log('🔍 ROUTE DEBUG: Request method:', req.method);
      console.log('🔍 ROUTE DEBUG: Request path:', req.path);
      console.log('🔍 ROUTE DEBUG: User:', req.user?.id);
      console.log('🔍 ROUTE DEBUG: Business controller method:', typeof businessController.createBusiness);
      next();
    },
    businessController.createBusiness.bind(businessController)
  );

  // Debug endpoint to test business creation flow
  router.post(
    '/debug-create',
    allowEmptyBusinessContext,
    (req: AuthenticatedRequest, res, next) => {
      console.log('🔍 DEBUG ENDPOINT: POST /businesses/debug-create hit');
      console.log('🔍 DEBUG ENDPOINT: User:', req.user?.id);
      console.log('🔍 DEBUG ENDPOINT: User roles:', req.user?.roles?.map((r: any) => r.name));
      console.log('🔍 DEBUG ENDPOINT: Request body:', req.body);
      next();
    },
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        console.log('🔍 DEBUG: Testing business creation flow for user:', userId);
        
        // Test RBAC service
        console.log('🔍 DEBUG: Testing RBAC service...');
        const hasPermission = await businessController['rbacService']?.hasPermission(userId, 'business', 'create');
        console.log('🔍 DEBUG: Has business:create permission:', hasPermission);
        
        // Test business service
        console.log('🔍 DEBUG: Testing business service...');
        const testData = {
          name: 'Test Business',
          businessTypeId: 'beauty_salon',
          description: 'Test business for debugging'
        };
        
        const business = await businessController['businessService'].createBusiness(userId, testData);
        console.log('🔍 DEBUG: Business created successfully:', business.id);
        
        res.json({
          success: true,
          message: 'Debug test completed successfully',
          data: {
            businessId: business.id,
            hasPermission,
            userRoles: req.user?.roles?.map((r: any) => r.name)
          }
        });
      } catch (error) {
        console.error('🔍 DEBUG ERROR:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Debug test failed'
        });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/businesses/id/{id}:
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
    '/id/:id',
    requireAny([PermissionName.VIEW_ALL_BUSINESSES, PermissionName.VIEW_OWN_BUSINESS]),
    businessController.getBusinessById.bind(businessController)
  );


  /**
   * @swagger
   * /api/v1/businesses/id/{id}:
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
    '/id/:id',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    requireSpecificBusinessAccess(),
    businessController.updateBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/id/{id}:
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
    '/id/:id',
    requireAny([PermissionName.DELETE_ALL_BUSINESSES, PermissionName.DELETE_OWN_BUSINESS]),
    requireSpecificBusinessAccess(),
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
    requireSpecificBusinessAccess(),
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
    requireSpecificBusinessAccess(),
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
    requireSpecificBusinessAccess(),
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
    requireSpecificBusinessAccess(),
    businessController.getBusinessStats.bind(businessController)
  );

  // Context-based stats route for user's businesses
  /**
   * @swagger
   * /api/v1/businesses/my/stats:
   *   get:
   *     tags: [Businesses]
   *     summary: Get stats for all my businesses
   *     description: Get statistics for all businesses the user owns or works at
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Business statistics
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
   *                       totalAppointments:
   *                         type: integer
   *                         example: 125
   *                       activeServices:
   *                         type: integer
   *                         example: 8
   *                       totalStaff:
   *                         type: integer
   *                         example: 3
   *                       isSubscribed:
   *                         type: boolean
   *                         example: true
   *       403:
   *         description: Access denied - business role required
   */
  router.get(
    '/my/stats',
    requireBusinessAccess,
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

  // Add a catch-all route that tries slug first, then ID if slug doesn't work
  // MUST be last to avoid conflicting with specific routes
  router.get(
    '/:slugOrId',
    async (req, res, next) => {
      try {
        // First try as a slug (public access) - includes services
        const business = await businessController['businessService'].getBusinessBySlugWithServices(req.params.slugOrId);
        if (business) {
          return res.json({
            success: true,
            data: business
          });
        }
        
        // If slug doesn't work and user is authenticated, try as ID
        if ((req as any).user) {
          return withAuth((authReq, authRes) => businessController.getBusinessById(authReq, authRes))(req, res);
        }
        
        // Not found
        res.status(404).json({
          success: false,
          error: 'Business not found'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}