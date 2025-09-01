import { Request, Response } from 'express';
import { BusinessTypeService } from '../services/businessTypeService';
import { 
  sendStandardSuccessResponse, 
  sendSimpleErrorResponse, 
  getErrorMessage 
} from '../utils/errorResponse';

export class BusinessTypeController {
  constructor(private businessTypeService: BusinessTypeService) {}

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    const message = getErrorMessage(error, fallbackMessage);
    sendSimpleErrorResponse(res, 500, message);
  }

  /**
   * Get all active business types
   * GET /api/v1/business-types
   */
  async getAllActiveBusinessTypes(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes = await this.businessTypeService.getAllActiveBusinessTypes();
      sendStandardSuccessResponse(res, businessTypes, 'Business types retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve business types');
    }
  }

  /**
   * Get all business types (including inactive)
   * GET /api/v1/business-types/all
   */
  async getAllBusinessTypes(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes = await this.businessTypeService.getAllBusinessTypes();
      sendStandardSuccessResponse(res, businessTypes, 'All business types retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve business types');
    }
  }

  /**
   * Get business types by category
   * GET /api/v1/business-types/category/:category
   */
  async getBusinessTypesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const businessTypes = await this.businessTypeService.getBusinessTypesByCategory(category);

      if (businessTypes.length === 0) {
        sendSimpleErrorResponse(res, 404, `No business types found for category: ${category}`);
        return;
      }

      sendStandardSuccessResponse(res, businessTypes, `Business types for category '${category}' retrieved successfully`);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve business types by category');
    }
  }

  /**
   * Get business type by ID
   * GET /api/v1/business-types/:id
   */
  async getBusinessTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessType = await this.businessTypeService.getBusinessTypeById(id);

      if (!businessType) {
        sendSimpleErrorResponse(res, 404, 'Business type not found');
        return;
      }

      sendStandardSuccessResponse(res, businessType, 'Business type retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve business type');
    }
  }

  /**
   * Get business types with business count
   * GET /api/v1/business-types/with-count
   */
  async getBusinessTypesWithCount(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes = await this.businessTypeService.getBusinessTypesWithCount();

      sendStandardSuccessResponse(res, businessTypes, 'Business types with count retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve business types with count');
    }
  }

  /**
   * Get all categories
   * GET /api/v1/business-types/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.businessTypeService.getCategories();

      sendStandardSuccessResponse(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve categories');
    }
  }

  /**
   * Get business types grouped by category
   * GET /api/v1/business-types/grouped
   */
  async getBusinessTypesGroupedByCategory(req: Request, res: Response): Promise<void> {
    try {
      const groupedBusinessTypes = await this.businessTypeService.getBusinessTypesGroupedByCategory();

      sendStandardSuccessResponse(res, groupedBusinessTypes, 'Business types grouped by category retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve grouped business types');
    }
  }
}

