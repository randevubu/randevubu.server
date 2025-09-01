import { Router } from 'express';
import { BusinessTypeController } from '../../controllers/businessTypeController';

export function createBusinessTypeRoutes(businessTypeController: BusinessTypeController): Router {
  const router = Router();

  /**
   * @swagger
   * /api/v1/business-types:
   *   get:
   *     tags: [Business Types]
   *     summary: Get all active business types
   *     description: Retrieve all active business types organized by category. This endpoint is public and doesn't require authentication.
   *     parameters:
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Include inactive business types (admin only)
   *     responses:
   *       200:
   *         description: Business types retrieved successfully
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
   *                     $ref: '#/components/schemas/BusinessType'
   *                 message:
   *                   type: string
   *                   example: "Business types retrieved successfully"
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
   *                   example: "Failed to retrieve business types"
   */
  router.get('/', businessTypeController.getAllActiveBusinessTypes.bind(businessTypeController));

  /**
   * @swagger
   * /api/v1/business-types/all:
   *   get:
   *     tags: [Business Types]
   *     summary: Get all business types (including inactive)
   *     description: Retrieve all business types including inactive ones. This endpoint is typically used by administrators.
   *     responses:
   *       200:
   *         description: All business types retrieved successfully
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
   *                     $ref: '#/components/schemas/BusinessType'
   *                 message:
   *                   type: string
   *                   example: "All business types retrieved successfully"
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
   *                   example: "Failed to retrieve business types"
   */
  router.get('/all', businessTypeController.getAllBusinessTypes.bind(businessTypeController));

  /**
   * @swagger
   * /api/v1/business-types/categories:
   *   get:
   *     tags: [Business Types]
   *     summary: Get all business categories
   *     description: Retrieve all available business categories with the count of business types in each category.
   *     responses:
   *       200:
   *         description: Categories retrieved successfully
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
   *                       category:
   *                         type: string
   *                         example: "beauty"
   *                         description: Category name
   *                       count:
   *                         type: integer
   *                         example: 5
   *                         description: Number of business types in this category
   *                 message:
   *                   type: string
   *                   example: "Categories retrieved successfully"
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
   *                   example: "Failed to retrieve categories"
   */
  router.get('/categories', businessTypeController.getCategories.bind(businessTypeController));

  /**
   * @swagger
   * /api/v1/business-types/grouped:
   *   get:
   *     tags: [Business Types]
   *     summary: Get business types grouped by category
   *     description: Retrieve business types organized by category for easier frontend rendering and filtering.
   *     responses:
   *       200:
   *         description: Grouped business types retrieved successfully
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
   *                     type: array
   *                     items:
   *                       $ref: '#/components/schemas/BusinessType'
   *                   example:
   *                     beauty:
   *                       - id: "btype_1234567890"
   *                         name: "hair_salon"
   *                         displayName: "Kuaför"
   *                         description: "Profesyonel saç kesim, şekillendirme ve boyama hizmetleri"
   *                         icon: "scissors"
   *                         category: "beauty"
   *                         isActive: true
   *                         createdAt: "2024-01-01T00:00:00.000Z"
   *                         updatedAt: "2024-01-01T00:00:00.000Z"
   *                       - id: "btype_1234567891"
   *                         name: "beauty_salon"
   *                         displayName: "Güzellik Salonu"
   *                         description: "Kapsamlı güzellik tedavileri ve spa hizmetleri"
   *                         icon: "makeup"
   *                         category: "beauty"
   *                         isActive: true
   *                         createdAt: "2024-01-01T00:00:00.000Z"
   *                         updatedAt: "2024-01-01T00:00:00.000Z"
   *                     healthcare:
   *                       - id: "btype_1234567892"
   *                         name: "dental_clinic"
   *                         displayName: "Dental Clinic"
   *                         description: "Dental care and oral health services"
   *                         icon: "tooth"
   *                         category: "healthcare"
   *                         isActive: true
   *                         createdAt: "2024-01-01T00:00:00.000Z"
   *                         updatedAt: "2024-01-01T00:00:00.000Z"
   *                 message:
   *                   type: string
   *                   example: "Business types grouped by category retrieved successfully"
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
   *                   example: "Failed to retrieve grouped business types"
   */
  router.get('/grouped', businessTypeController.getBusinessTypesGroupedByCategory.bind(businessTypeController));

  /**
   * @swagger
   * /api/v1/business-types/with-count:
   *   get:
   *     tags: [Business Types]
   *     summary: Get business types with business count
   *     description: Retrieve business types along with the count of businesses using each type. Useful for analytics and business insights.
   *     responses:
   *       200:
   *         description: Business types with count retrieved successfully
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
   *                     allOf:
   *                       - $ref: '#/components/schemas/BusinessType'
   *                       - type: object
   *                         properties:
   *                           businessCount:
   *                             type: integer
   *                             example: 25
   *                             description: Number of businesses using this business type
   *                 message:
   *                   type: string
   *                   example: "Business types with count retrieved successfully"
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
   *                   example: "Failed to retrieve business types with count"
   */
  router.get('/with-count', businessTypeController.getBusinessTypesWithCount.bind(businessTypeController));

  /**
   * @swagger
   * /api/v1/business-types/category/{category}:
   *   get:
   *     tags: [Business Types]
   *     summary: Get business types by category
   *     description: Retrieve all business types within a specific category.
   *     parameters:
   *       - in: path
   *         name: category
   *         required: true
   *         schema:
   *           type: string
   *         description: Category name to filter business types
   *         example: "beauty"
   *     responses:
   *       200:
   *         description: Business types for category retrieved successfully
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
   *                     $ref: '#/components/schemas/BusinessType'
   *                 message:
   *                   type: string
   *                   example: "Business types for category 'beauty' retrieved successfully"
   *       404:
   *         description: No business types found for the specified category
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
   *                   example: "No business types found for category: invalid_category"
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
   *                   example: "Failed to retrieve business types by category"
   */
  router.get('/category/:category', businessTypeController.getBusinessTypesByCategory.bind(businessTypeController));

  /**
   * @swagger
   * /api/v1/business-types/{id}:
   *   get:
   *     tags: [Business Types]
   *     summary: Get business type by ID
   *     description: Retrieve a specific business type by its unique identifier.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Business type ID
   *         example: "btype_1234567890"
   *     responses:
   *       200:
   *         description: Business type retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/BusinessType'
   *                 message:
   *                   type: string
   *                   example: "Business type retrieved successfully"
   *       404:
   *         description: Business type not found
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
   *                   example: "Business type not found"
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
   *                   example: "Failed to retrieve business type"
   */
  router.get('/:id', businessTypeController.getBusinessTypeById.bind(businessTypeController));

  return router;
}

