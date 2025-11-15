import { Request, Response } from "express";
import { BusinessTypeService } from "../services/domain/offering";
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from "../utils/responseUtils";
import { AppError } from "../types/responseTypes";
import { ERROR_CODES } from "../constants/errorCodes";

export class BusinessTypeController {
  constructor(private businessTypeService: BusinessTypeService) {}


  /**
   * Get all active business types
   * GET /api/v1/business-types
   */
  async getAllActiveBusinessTypes(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes =
        await this.businessTypeService.getAllActiveBusinessTypes();
      await sendSuccessResponse(
        res,
        "success.businessType.retrieved",
        businessTypes,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all business types (including inactive)
   * GET /api/v1/business-types/all
   */
  async getAllBusinessTypes(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes =
        await this.businessTypeService.getAllBusinessTypes();
      await sendSuccessResponse(
        res,
        "success.businessType.allRetrieved",
        businessTypes,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business types by category
   * GET /api/v1/business-types/category/:category
   */
  async getBusinessTypesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;

      // Validate category parameter
      if (!category || typeof category !== 'string') {
        const error = new AppError(
          'Category parameter is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Sanitize category parameter
      const sanitizedCategory = category.trim().toLowerCase();
      if (sanitizedCategory.length < 2 || sanitizedCategory.length > 50) {
        const error = new AppError(
          'Category must be between 2 and 50 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const businessTypes =
        await this.businessTypeService.getBusinessTypesByCategory(sanitizedCategory);

      if (businessTypes.length === 0) {
        const error = new AppError(
          `No business types found for category: ${sanitizedCategory}`,
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await sendSuccessResponse(
        res,
        'success.businessType.byCategoryRetrieved',
        businessTypes,
        200,
        req,
        { category: sanitizedCategory }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business type by ID
   * GET /api/v1/business-types/:id
   */
  async getBusinessTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Business type ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID format (UUID or numeric)
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid business type ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const businessType = await this.businessTypeService.getBusinessTypeById(
        id
      );

      if (!businessType) {
        const error = new AppError(
          "Business type not found",
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await sendSuccessResponse(
        res,
        "success.businessType.retrievedSingle",
        businessType,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business types with business count
   * GET /api/v1/business-types/with-count
   */
  async getBusinessTypesWithCount(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes =
        await this.businessTypeService.getBusinessTypesWithCount();

      await sendSuccessResponse(
        res,
        "success.businessType.withCountRetrieved",
        businessTypes,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all categories
   * GET /api/v1/business-types/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.businessTypeService.getCategories();

      await sendSuccessResponse(
        res,
        "success.businessType.categoriesRetrieved",
        categories,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business types grouped by category
   * GET /api/v1/business-types/grouped
   */
  async getBusinessTypesGroupedByCategory(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const groupedBusinessTypes =
        await this.businessTypeService.getBusinessTypesGroupedByCategory();

      await sendSuccessResponse(
        res,
        "success.businessType.groupedRetrieved",
        groupedBusinessTypes,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
