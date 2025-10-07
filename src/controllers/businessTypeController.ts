import { Request, Response } from "express";
import { BusinessTypeService } from "../services/domain/offering";
import {
  getErrorMessage,
  sendSimpleErrorResponse,
  sendStandardSuccessResponse,
} from "../utils/responseUtils";

export class BusinessTypeController {
  constructor(private businessTypeService: BusinessTypeService) {}

  private handleError(
    res: Response,
    error: unknown,
    fallbackMessage: string
  ): void {
    const message = getErrorMessage(error) || fallbackMessage;
    sendSimpleErrorResponse(res, message, 500);
  }

  /**
   * Get all active business types
   * GET /api/v1/business-types
   */
  async getAllActiveBusinessTypes(req: Request, res: Response): Promise<void> {
    try {
      const businessTypes =
        await this.businessTypeService.getAllActiveBusinessTypes();
      sendStandardSuccessResponse(
        res,
        "Business types retrieved successfully",
        businessTypes
      );
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve business types");
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
      sendStandardSuccessResponse(
        res,
        "All business types retrieved successfully",
        businessTypes
      );
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve business types");
    }
  }

  /**
   * Get business types by category
   * GET /api/v1/business-types/category/:category
   */
  async getBusinessTypesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const businessTypes =
        await this.businessTypeService.getBusinessTypesByCategory(category);

      if (businessTypes.length === 0) {
        sendSimpleErrorResponse(
          res,
          `No business types found for category: ${category}`,
          404
        );
        return;
      }

      sendStandardSuccessResponse(
        res,
        `Business types for category '${category}' retrieved successfully`,
        businessTypes
      );
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve business types by category"
      );
    }
  }

  /**
   * Get business type by ID
   * GET /api/v1/business-types/:id
   */
  async getBusinessTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const businessType = await this.businessTypeService.getBusinessTypeById(
        id
      );

      if (!businessType) {
        sendSimpleErrorResponse(res, "Business type not found", 404);
        return;
      }

      sendStandardSuccessResponse(
        res,
        "Business type retrieved successfully",
        businessType
      );
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve business type");
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

      sendStandardSuccessResponse(
        res,
        "Business types with count retrieved successfully",
        businessTypes
      );
    } catch (error) {
      this.handleError(
        res,
        error,
        "Failed to retrieve business types with count"
      );
    }
  }

  /**
   * Get all categories
   * GET /api/v1/business-types/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.businessTypeService.getCategories();

      sendStandardSuccessResponse(
        res,
        "Categories retrieved successfully",
        categories
      );
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve categories");
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

      sendStandardSuccessResponse(
        res,
        "Business types grouped by category retrieved successfully",
        groupedBusinessTypes
      );
    } catch (error) {
      this.handleError(res, error, "Failed to retrieve grouped business types");
    }
  }
}
