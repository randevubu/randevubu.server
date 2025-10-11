import { Request, Response } from 'express';
import { DiscountCodeService } from '../services/domain/discount';
import { DiscountType } from '@prisma/client';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';

export class DiscountCodeController {
  constructor(private discountCodeService: DiscountCodeService) {}

  /**
   * @swagger
   * components:
   *   schemas:
   *     DiscountCode:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *         code:
   *           type: string
   *         name:
   *           type: string
   *         description:
   *           type: string
   *         discountType:
   *           type: string
   *           enum: [PERCENTAGE, FIXED_AMOUNT]
   *         discountValue:
   *           type: number
   *         maxUsages:
   *           type: integer
   *         currentUsages:
   *           type: integer
   *         isActive:
   *           type: boolean
   *         validFrom:
   *           type: string
   *           format: date-time
   *         validUntil:
   *           type: string
   *           format: date-time
   *         minPurchaseAmount:
   *           type: number
   *         applicablePlans:
   *           type: array
   *           items:
   *             type: string
   *         createdAt:
   *           type: string
   *           format: date-time
   *     CreateDiscountCodeRequest:
   *       type: object
   *       required:
   *         - discountType
   *         - discountValue
   *       properties:
   *         code:
   *           type: string
   *           description: Custom code (auto-generated if not provided)
   *         name:
   *           type: string
   *         description:
   *           type: string
   *         discountType:
   *           type: string
   *           enum: [PERCENTAGE, FIXED_AMOUNT]
   *         discountValue:
   *           type: number
   *         maxUsages:
   *           type: integer
   *           default: 1
   *         validFrom:
   *           type: string
   *           format: date-time
   *         validUntil:
   *           type: string
   *           format: date-time
   *         minPurchaseAmount:
   *           type: number
   *         applicablePlans:
   *           type: array
   *           items:
   *             type: string
   */

  /**
   * @swagger
   * /api/v1/discount-codes:
   *   post:
   *     tags: [Admin - Discount Codes]
   *     summary: Create a new discount code
   *     description: Create a discount code for subscription purchases (Admin only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDiscountCodeRequest'
   *     responses:
   *       201:
   *         description: Discount code created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DiscountCode'
   *       400:
   *         description: Invalid input data
   *       403:
   *         description: Insufficient permissions
   */
  async createDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      
      // Validate required fields
      const { discountType, discountValue } = req.body;
      if (!discountType || !discountValue) {
        const error = new AppError(
          'Discount type and value are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate discount type
      if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
        const error = new AppError(
          'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate discount value
      if (typeof discountValue !== 'number' || discountValue <= 0) {
        const error = new AppError(
          'Discount value must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate percentage discount
      if (discountType === 'PERCENTAGE' && discountValue > 100) {
        const error = new AppError(
          'Percentage discount cannot exceed 100%',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const discountCode = await this.discountCodeService.createDiscountCode(userId, req.body);
      
      sendSuccessResponse(
        res,
        'Discount code created successfully',
        discountCode,
        201
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes:
   *   get:
   *     tags: [Admin - Discount Codes]
   *     summary: Get all discount codes
   *     description: Retrieve all discount codes with pagination (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Discount codes retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     discountCodes:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/DiscountCode'
   *                     total:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   */
  async getAllDiscountCodes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { page, limit, isActive } = req.query;
      
      // Validate and sanitize query parameters
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 20;
      const isActiveFilter = isActive !== undefined ? isActive === 'true' : undefined;

      // Validate pagination parameters
      if (isNaN(pageNum) || pageNum < 1) {
        const error = new AppError(
          'Page must be a positive integer',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        const error = new AppError(
          'Limit must be between 1 and 100',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const params = {
        page: pageNum,
        limit: limitNum,
        isActive: isActiveFilter
      };

      const result = await this.discountCodeService.getAllDiscountCodes(userId, params);
      
      sendSuccessResponse(
        res,
        'Discount codes retrieved successfully',
        result
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/{id}:
   *   get:
   *     tags: [Admin - Discount Codes]
   *     summary: Get discount code by ID
   *     description: Retrieve a specific discount code by its ID (Admin only)
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
   *         description: Discount code retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DiscountCode'
   *       404:
   *         description: Discount code not found
   */
  async getDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Discount code ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid discount code ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      
      const discountCode = await this.discountCodeService.getDiscountCode(userId, id);
      
      sendSuccessResponse(
        res,
        'Discount code retrieved successfully',
        discountCode
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/{id}:
   *   put:
   *     tags: [Admin - Discount Codes]
   *     summary: Update discount code
   *     description: Update an existing discount code (Admin only)
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
   *             $ref: '#/components/schemas/CreateDiscountCodeRequest'
   *     responses:
   *       200:
   *         description: Discount code updated successfully
   *       404:
   *         description: Discount code not found
   */
  async updateDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Discount code ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid discount code ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate request body if provided
      const { discountType, discountValue } = req.body;
      if (discountType && !['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
        const error = new AppError(
          'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (discountValue !== undefined && (typeof discountValue !== 'number' || discountValue <= 0)) {
        const error = new AppError(
          'Discount value must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (discountType === 'PERCENTAGE' && discountValue > 100) {
        const error = new AppError(
          'Percentage discount cannot exceed 100%',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      
      const discountCode = await this.discountCodeService.updateDiscountCode(userId, id, req.body);
      
      sendSuccessResponse(
        res,
        'Discount code updated successfully',
        discountCode
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/{id}/deactivate:
   *   patch:
   *     tags: [Admin - Discount Codes]
   *     summary: Deactivate discount code
   *     description: Deactivate a discount code (Admin only)
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
   *         description: Discount code deactivated successfully
   *       404:
   *         description: Discount code not found
   */
  async deactivateDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Discount code ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid discount code ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      
      const success = await this.discountCodeService.deactivateDiscountCode(userId, id);
      
      if (!success) {
        const error = new AppError(
          'Discount code not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }
      
      sendSuccessResponse(
        res,
        'Discount code deactivated successfully'
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/{id}:
   *   delete:
   *     tags: [Admin - Discount Codes]
   *     summary: Delete discount code
   *     description: Delete a discount code (only if unused) (Admin only)
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
   *         description: Discount code deleted successfully
   *       400:
   *         description: Cannot delete used discount code
   *       404:
   *         description: Discount code not found
   */
  async deleteDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Discount code ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid discount code ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      
      const success = await this.discountCodeService.deleteDiscountCode(userId, id);
      
      if (!success) {
        const error = new AppError(
          'Discount code not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }
      
      sendSuccessResponse(
        res,
        'Discount code deleted successfully'
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/validate:
   *   post:
   *     tags: [Discount Codes]
   *     summary: Validate discount code
   *     description: Validate a discount code for a specific plan and amount
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *               - planId
   *               - amount
   *             properties:
   *               code:
   *                 type: string
   *               planId:
   *                 type: string
   *               amount:
   *                 type: number
   *     responses:
   *       200:
   *         description: Discount code validation result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     isValid:
   *                       type: boolean
   *                     discountAmount:
   *                       type: number
   *                     originalAmount:
   *                       type: number
   *                     finalAmount:
   *                       type: number
   *                     errorMessage:
   *                       type: string
   */
  async validateDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const { code, planId, amount } = req.body;
      const userId = (req as GuaranteedAuthRequest).user?.id; // Optional for validation
      
      // Validate required fields
      if (!code || !planId || !amount) {
        const error = new AppError(
          'Code, planId, and amount are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate code format
      if (typeof code !== 'string' || code.trim().length < 3 || code.trim().length > 50) {
        const error = new AppError(
          'Code must be between 3 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate planId format
      if (typeof planId !== 'string' || planId.trim().length < 1 || planId.trim().length > 50) {
        const error = new AppError(
          'Plan ID must be between 1 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        const error = new AppError(
          'Amount must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Sanitize inputs
      const sanitizedCode = code.trim().toUpperCase();
      const sanitizedPlanId = planId.trim();
      
      const validation = await this.discountCodeService.validateDiscountCode(sanitizedCode, sanitizedPlanId, amount, userId);
      
      sendSuccessResponse(
        res,
        'Discount code validation completed',
        {
          isValid: validation.isValid,
          discountAmount: validation.calculatedDiscount?.discountAmount,
          originalAmount: validation.calculatedDiscount?.originalAmount,
          finalAmount: validation.calculatedDiscount?.finalAmount,
          errorMessage: validation.errorMessage
        }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/{id}/usage:
   *   get:
   *     tags: [Admin - Discount Codes]
   *     summary: Get discount code usage history
   *     description: Get usage history for a specific discount code (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Usage history retrieved successfully
   */
  async getDiscountCodeUsageHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const { id } = req.params;
      const { page, limit } = req.query;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Discount code ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid discount code ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate pagination parameters
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      if (isNaN(pageNum) || pageNum < 1) {
        const error = new AppError(
          'Page must be a positive integer',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        const error = new AppError(
          'Limit must be between 1 and 100',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
      
      const params = {
        page: pageNum,
        limit: limitNum
      };
      
      const result = await this.discountCodeService.getDiscountCodeUsageHistory(userId, id, params);
      
      sendSuccessResponse(
        res,
        'Usage history retrieved successfully',
        result
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/statistics:
   *   get:
   *     tags: [Admin - Discount Codes]
   *     summary: Get discount code statistics
   *     description: Get overall statistics for discount codes (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalCodes:
   *                       type: integer
   *                     activeCodes:
   *                       type: integer
   *                     expiredCodes:
   *                       type: integer
   *                     totalUsages:
   *                       type: integer
   *                     totalDiscountAmount:
   *                       type: number
   */
  async getDiscountCodeStatistics(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      const statistics = await this.discountCodeService.getDiscountCodeStatistics(userId);
      
      sendSuccessResponse(
        res,
        'Statistics retrieved successfully',
        statistics
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * @swagger
   * /api/v1/discount-codes/bulk:
   *   post:
   *     tags: [Admin - Discount Codes]
   *     summary: Generate bulk discount codes
   *     description: Generate multiple discount codes at once (Admin only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - count
   *               - discountType
   *               - discountValue
   *             properties:
   *               prefix:
   *                 type: string
   *                 default: BULK
   *               count:
   *                 type: integer
   *                 maximum: 1000
   *               discountType:
   *                 type: string
   *                 enum: [PERCENTAGE, FIXED_AMOUNT]
   *               discountValue:
   *                 type: number
   *               maxUsages:
   *                 type: integer
   *                 default: 1
   *               validUntil:
   *                 type: string
   *                 format: date-time
   *               minPurchaseAmount:
   *                 type: number
   *               applicablePlans:
   *                 type: array
   *                 items:
   *                   type: string
   *               description:
   *                 type: string
   *     responses:
   *       201:
   *         description: Bulk discount codes created successfully
   */
  async generateBulkDiscountCodes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = requireAuthenticatedUser(req).id;
      
      // Validate required fields
      const { count, discountType, discountValue } = req.body;
      if (!count || !discountType || !discountValue) {
        const error = new AppError(
          'Count, discount type, and discount value are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate count
      if (typeof count !== 'number' || count < 1 || count > 1000) {
        const error = new AppError(
          'Count must be between 1 and 1000',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate discount type
      if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
        const error = new AppError(
          'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate discount value
      if (typeof discountValue !== 'number' || discountValue <= 0) {
        const error = new AppError(
          'Discount value must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate percentage discount
      if (discountType === 'PERCENTAGE' && discountValue > 100) {
        const error = new AppError(
          'Percentage discount cannot exceed 100%',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const codes = await this.discountCodeService.generateBulkDiscountCodes(userId, req.body);
      
      sendSuccessResponse(
        res,
        `Successfully generated ${codes.length} discount codes`,
        {
          codes,
          count: codes.length
        },
        201
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}