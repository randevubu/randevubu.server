import { Request, Response } from 'express';
import { BusinessTypeService } from '../services/domain/offering';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';

export class BusinessTypeController {
  constructor(
    private businessTypeService: BusinessTypeService,
    private responseHelper: ResponseHelper
  ) {}

  async getAllActiveBusinessTypes(req: Request, res: Response): Promise<void> {
    const businessTypes = await this.businessTypeService.getAllActiveBusinessTypes();
    await this.responseHelper.success(res, 'success.businessType.retrieved', businessTypes, 200, req);
  }

  async getAllBusinessTypes(req: Request, res: Response): Promise<void> {
    const businessTypes = await this.businessTypeService.getAllBusinessTypes();
    await this.responseHelper.success(res, 'success.businessType.allRetrieved', businessTypes, 200, req);
  }

  async getBusinessTypesByCategory(req: Request, res: Response): Promise<void> {
    const { category } = req.params;

    if (!category || typeof category !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Category parameter is required', params: { field: 'category' } });
    }

    const sanitizedCategory = category.trim().toLowerCase();
    if (sanitizedCategory.length < 2 || sanitizedCategory.length > 50) {
      throw new AppError('VALIDATION_ERROR', { message: 'Category must be between 2 and 50 characters' });
    }

    const businessTypes = await this.businessTypeService.getBusinessTypesByCategory(sanitizedCategory);

    if (businessTypes.length === 0) {
      throw new AppError('BUSINESS_TYPE_NOT_FOUND', { message: `No business types found for category: ${sanitizedCategory}` });
    }

    await this.responseHelper.success(res, 'success.businessType.byCategoryRetrieved', businessTypes, 200, req, { category: sanitizedCategory });
  }

  async getBusinessTypeById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business type ID is required', params: { field: 'id' } });
    }

    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business type ID format', params: { field: 'id' } });
    }

    const businessType = await this.businessTypeService.getBusinessTypeById(id);

    if (!businessType) {
      throw new AppError('BUSINESS_TYPE_NOT_FOUND', { message: 'Business type not found' });
    }

    await this.responseHelper.success(res, 'success.businessType.retrievedSingle', businessType, 200, req);
  }

  async getBusinessTypesWithCount(req: Request, res: Response): Promise<void> {
    const businessTypes = await this.businessTypeService.getBusinessTypesWithCount();
    await this.responseHelper.success(res, 'success.businessType.withCountRetrieved', businessTypes, 200, req);
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = await this.businessTypeService.getCategories();
    await this.responseHelper.success(res, 'success.businessType.categoriesRetrieved', categories, 200, req);
  }

  async getBusinessTypesGroupedByCategory(req: Request, res: Response): Promise<void> {
    const groupedBusinessTypes = await this.businessTypeService.getBusinessTypesGroupedByCategory();
    await this.responseHelper.success(res, 'success.businessType.groupedRetrieved', groupedBusinessTypes, 200, req);
  }
}
