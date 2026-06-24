import { Request, Response } from 'express';
import { DiscountCodeService } from '../services/domain/discount';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class DiscountCodeController {
  constructor(
    private discountCodeService: DiscountCodeService,
    private responseHelper: ResponseHelper
  ) {}

  private requireId(params: Record<string, string>, name: string): string {
    const id = params[name];
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', {
        message: `${name} is required`,
        params: { field: name },
      });
    }
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', {
        message: `Invalid ${name} format`,
        params: { field: name },
      });
    }
    return id;
  }

  private validateDiscountFields(discountType: string | undefined, discountValue: number | undefined, required: boolean): void {
    if (required && (!discountType || !discountValue)) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Discount type and value are required', params: { field: 'discountType,discountValue' } });
    }
    if (discountType && !['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT' });
    }
    if (discountValue !== undefined && (typeof discountValue !== 'number' || discountValue <= 0)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Discount value must be a positive number' });
    }
    if (discountType === 'PERCENTAGE' && discountValue !== undefined && discountValue > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'Percentage discount cannot exceed 100%' });
    }
  }

  private validatePagination(page: string | undefined, limit: string | undefined): { pageNum: number; limitNum: number } {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError('VALIDATION_ERROR', { message: 'Page must be a positive integer' });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'Limit must be between 1 and 100' });
    }
    return { pageNum, limitNum };
  }

  async createDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { discountType, discountValue } = req.body;

    this.validateDiscountFields(discountType, discountValue, true);

    const discountCode = await this.discountCodeService.createDiscountCode(userId, req.body);

    await this.responseHelper.success(res, 'success.discountCode.created', discountCode, 201, req);
  }

  async getAllDiscountCodes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { page, limit, isActive } = req.query;
    const { pageNum, limitNum } = this.validatePagination(page as string, limit as string);

    const result = await this.discountCodeService.getAllDiscountCodes(userId, {
      page: pageNum, limit: limitNum, isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });

    await this.responseHelper.success(res, 'success.discountCode.retrievedList', result, 200, req);
  }

  async getDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const id = this.requireId(req.params, 'id');

    const discountCode = await this.discountCodeService.getDiscountCode(userId, id);

    await this.responseHelper.success(res, 'success.discountCode.retrieved', discountCode, 200, req);
  }

  async updateDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const id = this.requireId(req.params, 'id');
    const { discountType, discountValue } = req.body;

    this.validateDiscountFields(discountType, discountValue, false);

    const discountCode = await this.discountCodeService.updateDiscountCode(userId, id, req.body);

    await this.responseHelper.success(res, 'success.discountCode.updated', discountCode, 200, req);
  }

  async deactivateDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const id = this.requireId(req.params, 'id');

    const success = await this.discountCodeService.deactivateDiscountCode(userId, id);

    if (!success) {
      throw new AppError('DISCOUNT_CODE_NOT_FOUND', { message: 'Discount code not found' });
    }

    await this.responseHelper.success(res, 'success.discountCode.deactivated', undefined, 200, req);
  }

  async deleteDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const id = this.requireId(req.params, 'id');

    const success = await this.discountCodeService.deleteDiscountCode(userId, id);

    if (!success) {
      throw new AppError('DISCOUNT_CODE_NOT_FOUND', { message: 'Discount code not found' });
    }

    await this.responseHelper.success(res, 'success.discountCode.deleted', undefined, 200, req);
  }

  async validateDiscountCode(req: Request, res: Response): Promise<void> {
    const { code, planId, amount } = req.body;
    const userId = (req as GuaranteedAuthRequest).user?.id;

    if (!code || !planId || !amount) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Code, planId, and amount are required', params: { field: 'code,planId,amount' } });
    }
    if (typeof code !== 'string' || code.trim().length < 3 || code.trim().length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: 'Code must be between 3 and 50 characters' });
    }
    if (typeof planId !== 'string' || planId.trim().length < 1 || planId.trim().length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: 'Plan ID must be between 1 and 50 characters' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'Amount must be a positive number' });
    }

    const validation = await this.discountCodeService.validateDiscountCode(
      code.trim().toUpperCase(), planId.trim(), amount, userId
    );

    await this.responseHelper.success(res, 'success.discountCode.validated', {
      isValid: validation.isValid,
      discountAmount: validation.calculatedDiscount?.discountAmount,
      originalAmount: validation.calculatedDiscount?.originalAmount,
      finalAmount: validation.calculatedDiscount?.finalAmount,
      errorMessage: validation.errorMessage,
    }, 200, req);
  }

  async getDiscountCodeUsageHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const id = this.requireId(req.params, 'id');
    const { page, limit } = req.query;
    const { pageNum, limitNum } = this.validatePagination(page as string, limit as string);

    const result = await this.discountCodeService.getDiscountCodeUsageHistory(userId, id, { page: pageNum, limit: limitNum });

    await this.responseHelper.success(res, 'success.discountCode.usageRetrieved', result, 200, req);
  }

  async getDiscountCodeStatistics(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;

    const statistics = await this.discountCodeService.getDiscountCodeStatistics(userId);

    await this.responseHelper.success(res, 'success.discountCode.statsRetrieved', statistics, 200, req);
  }

  async generateBulkDiscountCodes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;
    const { count, discountType, discountValue } = req.body;

    if (!count || typeof count !== 'number' || count < 1 || count > 1000) {
      throw new AppError('VALIDATION_ERROR', { message: 'Count must be between 1 and 1000' });
    }

    this.validateDiscountFields(discountType, discountValue, true);

    const codes = await this.discountCodeService.generateBulkDiscountCodes(userId, req.body);

    await this.responseHelper.success(res, 'success.discountCode.generated', { codes, count: codes.length }, 201, req, { count: codes.length });
  }
}
