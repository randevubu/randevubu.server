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
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import { uploadSingleImage, handleMulterError } from '../../middleware/multer';
import {
  inviteStaffSchema,
  verifyStaffInvitationSchema,
  getBusinessStaffQuerySchema
} from '../../schemas/staff.schemas';
import { updateBusinessPriceSettingsSchema } from '../../schemas/business.schemas';

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

  /**
   * @swagger
   * /api/v1/businesses/my-business:
   *   put:
   *     tags: [Businesses]
   *     summary: Update current user's business
   *     description: Update the business owned by the current user. If the user owns multiple businesses, updates the primary business.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateBusinessRequest'
   *     responses:
   *       200:
   *         description: Business updated successfully
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
   *                   example: "Business updated successfully"
   *                 data:
   *                   $ref: '#/components/schemas/BusinessData'
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied - business role required
   *       404:
   *         description: Business not found
   */
  router.put('/my-business', requireBusinessAccess, businessController.updateMyBusiness.bind(businessController));

  /**
   * @swagger
   * /api/v1/businesses/my-business:
   *   patch:
   *     tags: [Businesses]
   *     summary: Partially update current user's business
   *     description: Partially update the business owned by the current user. If the user owns multiple businesses, updates the primary business.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateBusinessRequest'
   *     responses:
   *       200:
   *         description: Business updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied - business role required
   *       404:
   *         description: Business not found
   */
  router.patch('/my-business', requireBusinessAccess, businessController.updateMyBusiness.bind(businessController));

  /**
   * @swagger
   * /api/v1/businesses/my-business/price-settings:
   *   put:
   *     tags: [Businesses]
   *     summary: Update business price visibility settings
   *     description: Configure price display settings for your business services
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               hideAllServicePrices:
   *                 type: boolean
   *                 description: Hide prices for all services business-wide
   *               showPriceOnBooking:
   *                 type: boolean
   *                 description: Show prices during booking even if hidden on service list
   *               priceDisplayMessage:
   *                 type: string
   *                 maxLength: 100
   *                 description: Custom message when prices are hidden
   *     responses:
   *       200:
   *         description: Price settings updated successfully
   *       403:
   *         description: Access denied - business role required
   *       500:
   *         description: Internal server error
   */
  router.get('/my-business/price-settings',
    requireBusinessAccess,
    businessController.getPriceSettings.bind(businessController)
  );
  
  router.put('/my-business/price-settings', 
    requireBusinessAccess,
    validateBody(updateBusinessPriceSettingsSchema),
    businessController.updatePriceSettings.bind(businessController)
  );

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

  // Test endpoint to create business and immediately fetch it
  router.post(
    '/test-create-and-fetch',
    allowEmptyBusinessContext,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        console.log('🧪 TEST: Creating business and fetching it immediately');
        
        // Step 1: Create business
        const testData = {
          name: 'Test Business for Fetch',
          businessTypeId: 'beauty_salon',
          description: 'Test business for immediate fetch test'
        };
        
        console.log('🧪 TEST: Creating business...');
        const business = await businessController['businessService'].createBusiness(userId, testData);
        console.log('🧪 TEST: Business created:', business.id);
        
        // Step 2: Clear RBAC cache
        console.log('🧪 TEST: Clearing RBAC cache...');
        businessController['rbacService']?.clearUserCache(userId);
        
        // Step 3: Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Step 4: Try to fetch the business
        console.log('🧪 TEST: Fetching businesses...');
        const businesses = await businessController['businessService'].getMyBusinesses(userId);
        console.log('🧪 TEST: Fetched businesses:', businesses.length);
        
        // Step 5: Test business context middleware
        console.log('🧪 TEST: Testing business context...');
        const freshUserRoles = await businessController['businessService']['prisma'].userRole.findMany({
          where: {
            userId: userId,
            isActive: true,
            role: {
              isActive: true
            }
          },
          include: {
            role: true
          }
        });
        
        const userRoles = freshUserRoles.map(ur => ur.role);
        const isOwner = userRoles.some(role => role.name === 'OWNER');
        
        console.log('🧪 TEST: User roles after business creation:', userRoles.map(r => r.name));
        console.log('🧪 TEST: Is owner:', isOwner);
        
        res.json({
          success: true,
          message: 'Test completed',
          data: {
            createdBusiness: {
              id: business.id,
              name: business.name
            },
            fetchedBusinesses: businesses.map(b => ({ id: b.id, name: b.name })),
            userRoles: userRoles.map(r => r.name),
            isOwner,
            businessCount: businesses.length
          }
        });
      } catch (error) {
        console.error('🧪 TEST ERROR:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Test failed'
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
   * /api/v1/businesses/{id}:
   *   put:
   *     tags: [Businesses]
   *     summary: Update a business by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateBusinessRequest'
   *     responses:
   *       200:
   *         description: Business updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Business not found
   */
  router.put(
    '/:id',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    requireSpecificBusinessAccess(),
    businessController.updateBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/id/{id}:
   *   put:
   *     tags: [Businesses]
   *     summary: Update a business (alternative route)
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
   * /api/v1/businesses/{id}:
   *   patch:
   *     tags: [Businesses]
   *     summary: Partially update a business by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateBusinessRequest'
   *     responses:
   *       200:
   *         description: Business updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Business not found
   */
  router.patch(
    '/:id',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    requireSpecificBusinessAccess(),
    businessController.updateBusiness.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/id/{id}:
   *   patch:
   *     tags: [Businesses]
   *     summary: Partially update a business (alternative route)
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
  router.patch(
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

  // Enhanced Business Hours Management Routes

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/hours:
   *   get:
   *     tags: [Businesses, Business Hours]
   *     summary: Get business hours for a specific business
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
   *         description: Business hours retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Business not found
   */
  router.get(
    '/:businessId/hours',
    requireAny([PermissionName.VIEW_ALL_BUSINESSES, PermissionName.VIEW_OWN_BUSINESS]),
    requireSpecificBusinessAccess('businessId'),
    businessController.getBusinessHours.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/hours/status:
   *   get:
   *     tags: [Businesses, Business Hours]
   *     summary: Get business hours status for a specific date
   *     description: Public endpoint to check if business is open on a specific date
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: date
   *         schema:
   *           type: string
   *           format: date
   *         description: Date to check (YYYY-MM-DD format, defaults to today)
   *       - in: query
   *         name: timezone
   *         schema:
   *           type: string
   *         description: Timezone override (defaults to business timezone)
   *     responses:
   *       200:
   *         description: Business hours status retrieved successfully
   *       404:
   *         description: Business not found
   */
  router.get(
    '/:businessId/hours/status',
    businessController.getBusinessHoursStatus.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/hours/overrides:
   *   post:
   *     tags: [Businesses, Business Hours]
   *     summary: Create business hours override for a specific date
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
   *               - date
   *               - isOpen
   *             properties:
   *               date:
   *                 type: string
   *                 format: date
   *                 description: Date for the override (YYYY-MM-DD)
   *               isOpen:
   *                 type: boolean
   *                 description: Whether the business is open on this date
   *               openTime:
   *                 type: string
   *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *                 description: Opening time (HH:MM format, required if isOpen is true)
   *               closeTime:
   *                 type: string
   *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *                 description: Closing time (HH:MM format, required if isOpen is true)
   *               breaks:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     startTime:
   *                       type: string
   *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *                     endTime:
   *                       type: string
   *                       pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *                     description:
   *                       type: string
   *                 description: Break periods during business hours
   *               reason:
   *                 type: string
   *                 description: Reason for the override
   *               isRecurring:
   *                 type: boolean
   *                 description: Whether this override should recur
   *               recurringPattern:
   *                 type: object
   *                 properties:
   *                   frequency:
   *                     type: string
   *                     enum: [YEARLY, MONTHLY, WEEKLY]
   *                   interval:
   *                     type: integer
   *                     minimum: 1
   *                     maximum: 10
   *                   endDate:
   *                     type: string
   *                     format: date
   *     responses:
   *       201:
   *         description: Business hours override created successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    '/:businessId/hours/overrides',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    requireSpecificBusinessAccess('businessId'),
    businessController.createBusinessHoursOverride.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/hours/overrides/{date}:
   *   put:
   *     tags: [Businesses, Business Hours]
   *     summary: Update business hours override for a specific date
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: date
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               isOpen:
   *                 type: boolean
   *               openTime:
   *                 type: string
   *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *               closeTime:
   *                 type: string
   *                 pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
   *               breaks:
   *                 type: array
   *                 items:
   *                   type: object
   *               reason:
   *                 type: string
   *               isRecurring:
   *                 type: boolean
   *               recurringPattern:
   *                 type: object
   *     responses:
   *       200:
   *         description: Business hours override updated successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Override not found
   */
  router.put(
    '/:businessId/hours/overrides/:date',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    requireSpecificBusinessAccess('businessId'),
    businessController.updateBusinessHoursOverride.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/hours/overrides/{date}:
   *   delete:
   *     tags: [Businesses, Business Hours]
   *     summary: Delete business hours override for a specific date
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: date
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Business hours override deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Override not found
   */
  router.delete(
    '/:businessId/hours/overrides/:date',
    requireAny([PermissionName.EDIT_ALL_BUSINESSES, PermissionName.EDIT_OWN_BUSINESS]),
    requireSpecificBusinessAccess('businessId'),
    businessController.deleteBusinessHoursOverride.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/hours/overrides:
   *   get:
   *     tags: [Businesses, Business Hours]
   *     summary: Get business hours overrides for a date range
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
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for the range (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for the range (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: Business hours overrides retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get(
    '/:businessId/hours/overrides',
    requireAny([PermissionName.VIEW_ALL_BUSINESSES, PermissionName.VIEW_OWN_BUSINESS]),
    requireSpecificBusinessAccess('businessId'),
    businessController.getBusinessHoursOverrides.bind(businessController)
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

  // Staff Management Routes
  /**
   * @swagger
   * /api/v1/businesses/{businessId}/staff:
   *   get:
   *     tags: [Businesses, Staff Management]
   *     summary: Get all staff for a business
   *     description: Retrieve staff members of a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *         description: Include inactive staff members
   *     responses:
   *       200:
   *         description: Staff list retrieved successfully
   *       404:
   *         description: Business not found
   */
  router.get(
    '/:businessId/staff',
    requireAuth,
    attachBusinessContext,
    validateQuery(getBusinessStaffQuerySchema),
    businessController.getBusinessStaff.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/staff/invite:
   *   post:
   *     tags: [Businesses, Staff Management]
   *     summary: Invite staff member to business
   *     description: Send SMS verification code to potential staff member's phone
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
   *               - phoneNumber
   *               - role
   *             properties:
   *               phoneNumber:
   *                 type: string
   *                 description: Staff member's phone number (E.164 format)
   *                 example: "+905551234567"
   *               role:
   *                 type: string
   *                 enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *                 description: Staff role
   *               permissions:
   *                 type: object
   *                 description: Additional permissions (optional)
   *               firstName:
   *                 type: string
   *                 description: Staff member's first name (optional)
   *               lastName:
   *                 type: string
   *                 description: Staff member's last name (optional)
   *     responses:
   *       200:
   *         description: Invitation sent successfully
   *       400:
   *         description: Invalid input or staff limit exceeded
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    '/:businessId/staff/invite',
    requireAuth,
    validateBody(inviteStaffSchema),
    businessController.inviteStaff.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/staff/verify-invitation:
   *   post:
   *     tags: [Businesses, Staff Management]
   *     summary: Complete staff invitation with SMS verification
   *     description: Verify SMS code and add staff member to business
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
   *               - phoneNumber
   *               - verificationCode
   *               - role
   *             properties:
   *               phoneNumber:
   *                 type: string
   *                 description: Staff member's phone number
   *               verificationCode:
   *                 type: string
   *                 description: 6-digit SMS verification code
   *               role:
   *                 type: string
   *                 enum: [OWNER, MANAGER, STAFF, RECEPTIONIST]
   *               permissions:
   *                 type: object
   *                 description: Additional permissions (optional)
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *     responses:
   *       201:
   *         description: Staff member added successfully
   *       400:
   *         description: Invalid verification code or input
   */
  router.post(
    '/:businessId/staff/verify-invitation',
    requireAuth,
    validateBody(verifyStaffInvitationSchema),
    businessController.verifyStaffInvitation.bind(businessController)
  );

  // Image Management Routes
  
  /**
   * @swagger
   * /api/v1/businesses/{businessId}/images/upload:
   *   post:
   *     tags: [Businesses, Images]
   *     summary: Upload business image
   *     description: Upload image for business (logo, cover, profile, or gallery)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - image
   *               - imageType
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *                 description: Image file (JPEG, PNG, WebP, GIF, max 5MB)
   *               imageType:
   *                 type: string
   *                 enum: [logo, cover, profile, gallery]
   *                 description: Type of image being uploaded
   *     responses:
   *       200:
   *         description: Image uploaded successfully
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
   *                   example: "logo image uploaded successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     imageUrl:
   *                       type: string
   *                       example: "https://bucket.s3.amazonaws.com/businesses/biz_123/logo/image.jpg"
   *                     business:
   *                       type: object
   *                       description: Updated business object
   *       400:
   *         description: Invalid file or missing parameters
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post(
    '/:businessId/images/upload',
    requireAuth,
    uploadSingleImage,
    handleMulterError,
    businessController.uploadImage.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/images/{imageType}:
   *   delete:
   *     tags: [Businesses, Images]
   *     summary: Delete business image
   *     description: Delete business image (logo, cover, or profile)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *       - in: path
   *         name: imageType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [logo, cover, profile]
   *         description: Type of image to delete
   *     responses:
   *       200:
   *         description: Image deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Business or image not found
   */
  router.delete(
    '/:businessId/images/:imageType',
    requireAuth,
    businessController.deleteImage.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/images/gallery:
   *   delete:
   *     tags: [Businesses, Images]
   *     summary: Delete gallery image
   *     description: Delete specific image from business gallery
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - imageUrl
   *             properties:
   *               imageUrl:
   *                 type: string
   *                 format: url
   *                 description: URL of the gallery image to delete
   *     responses:
   *       200:
   *         description: Gallery image deleted successfully
   *       400:
   *         description: Invalid image URL
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.delete(
    '/:businessId/images/gallery',
    requireAuth,
    businessController.deleteGalleryImage.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/images:
   *   get:
   *     tags: [Businesses, Images]
   *     summary: Get business images
   *     description: Get all images for a business
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     responses:
   *       200:
   *         description: Business images retrieved successfully
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
   *                     images:
   *                       type: object
   *                       properties:
   *                         logoUrl:
   *                           type: string
   *                           nullable: true
   *                           example: "https://bucket.s3.amazonaws.com/businesses/biz_123/logo/image.jpg"
   *                         coverImageUrl:
   *                           type: string
   *                           nullable: true
   *                           example: "https://bucket.s3.amazonaws.com/businesses/biz_123/cover/image.jpg"
   *                         profileImageUrl:
   *                           type: string
   *                           nullable: true
   *                           example: "https://bucket.s3.amazonaws.com/businesses/biz_123/profile/image.jpg"
   *                         galleryImages:
   *                           type: array
   *                           items:
   *                             type: string
   *                           example: ["https://bucket.s3.amazonaws.com/businesses/biz_123/gallery/image1.jpg"]
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    '/:businessId/images',
    requireAuth,
    businessController.getBusinessImages.bind(businessController)
  );

  /**
   * @swagger
   * /api/v1/businesses/{businessId}/images/gallery:
   *   put:
   *     tags: [Businesses, Images]
   *     summary: Update gallery images order
   *     description: Update the order of gallery images
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: businessId
   *         required: true
   *         schema:
   *           type: string
   *         description: Business ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - imageUrls
   *             properties:
   *               imageUrls:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: url
   *                 maxItems: 10
   *                 description: Array of image URLs in desired order
   *     responses:
   *       200:
   *         description: Gallery images updated successfully
   *       400:
   *         description: Invalid input (non-array or too many images)
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.put(
    '/:businessId/images/gallery',
    requireAuth,
    businessController.updateGalleryImages.bind(businessController)
  );

  return router;
}