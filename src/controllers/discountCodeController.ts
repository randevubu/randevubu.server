import { Request, Response } from 'express';
import { DiscountCodeService } from '../services/domain/discount';
import { DiscountType } from '@prisma/client';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';

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
      const discountCode = await this.discountCodeService.createDiscountCode(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: discountCode,
        message: 'Discount code created successfully'
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('permission') ? 403 : 400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create discount code'
      });
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
      
      const params = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      };

      const result = await this.discountCodeService.getAllDiscountCodes(userId, params);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('permission') ? 403 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve discount codes'
      });
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
      
      const discountCode = await this.discountCodeService.getDiscountCode(userId, id);
      
      res.json({
        success: true,
        data: discountCode
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                        error instanceof Error && error.message.includes('permission') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve discount code'
      });
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
      
      const discountCode = await this.discountCodeService.updateDiscountCode(userId, id, req.body);
      
      res.json({
        success: true,
        data: discountCode,
        message: 'Discount code updated successfully'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                        error instanceof Error && error.message.includes('permission') ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update discount code'
      });
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
      
      const success = await this.discountCodeService.deactivateDiscountCode(userId, id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Discount code not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Discount code deactivated successfully'
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('permission') ? 403 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate discount code'
      });
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
      
      const success = await this.discountCodeService.deleteDiscountCode(userId, id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Discount code not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Discount code deleted successfully'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('already used') ? 400 :
                        error instanceof Error && error.message.includes('permission') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete discount code'
      });
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
      
      if (!code || !planId || !amount) {
        res.status(400).json({
          success: false,
          error: 'Code, planId, and amount are required'
        });
        return;
      }
      
      const validation = await this.discountCodeService.validateDiscountCode(code, planId, amount, userId);
      
      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          discountAmount: validation.calculatedDiscount?.discountAmount,
          originalAmount: validation.calculatedDiscount?.originalAmount,
          finalAmount: validation.calculatedDiscount?.finalAmount,
          errorMessage: validation.errorMessage
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate discount code'
      });
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
      
      const params = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };
      
      const result = await this.discountCodeService.getDiscountCodeUsageHistory(userId, id, params);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                        error instanceof Error && error.message.includes('permission') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve usage history'
      });
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
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('permission') ? 403 : 500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve statistics'
      });
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
      const codes = await this.discountCodeService.generateBulkDiscountCodes(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: {
          codes,
          count: codes.length
        },
        message: `Successfully generated ${codes.length} discount codes`
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('permission') ? 403 : 400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate bulk discount codes'
      });
    }
  }
}