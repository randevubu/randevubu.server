import { Response } from 'express';
import { ERROR_CODES } from '../constants/errorCodes';
import {
  imageUploadSchema,
  deleteImageSchema,
  deleteGalleryImageSchema,
} from '../schemas/business.schemas';
import { BusinessService } from '../services/domain/business';
import { AuthenticatedRequest, AuthenticatedRequestWithFile } from '../types/request';
import { AppError } from '../types/responseTypes';
import { handleRouteError, sendAppErrorResponse } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';

/**
 * Controller for managing business images
 * Handles logo, cover, profile, and gallery images
 */
export class BusinessImageController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Upload business image (logo, cover, profile, gallery)
   * POST /api/v1/businesses/{businessId}/images/upload
   */
  async uploadImage(req: AuthenticatedRequestWithFile, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      // Validate request body
      const validatedData = imageUploadSchema.parse(req.body);

      // Check if file was uploaded
      if (!req.file) {
        const error = new AppError('No image file provided', 400, ERROR_CODES.VALIDATION_ERROR);
        sendAppErrorResponse(res, error);
        return;
      }

      const { imageType } = validatedData;
      const file = req.file;

      const result = await this.businessService.uploadBusinessImage(
        userId,
        businessId,
        imageType,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      await this.responseHelper.success(
        res,
        'success.business.imageUploaded',
        {
          imageUrl: result.imageUrl,
          business: result.business,
        },
        200,
        req,
        { imageType }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete business image (logo, cover, profile)
   * DELETE /api/v1/businesses/{businessId}/images/{imageType}
   */
  async deleteImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      // Validate image type
      const validatedData = deleteImageSchema.parse(req.params);
      const { imageType } = validatedData;

      const business = await this.businessService.deleteBusinessImage(
        userId,
        businessId,
        imageType
      );

      await this.responseHelper.success(
        res,
        'success.business.imageDeleted',
        { business },
        200,
        req,
        { imageType }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete gallery image
   * DELETE /api/v1/businesses/{businessId}/images/gallery
   */
  async deleteGalleryImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      // Validate request body
      const validatedData = deleteGalleryImageSchema.parse(req.body);
      const { imageUrl } = validatedData;

      const business = await this.businessService.deleteGalleryImage(userId, businessId, imageUrl);

      await this.responseHelper.success(
        res,
        'success.business.galleryImageDeleted',
        { business },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get business images
   * GET /api/v1/businesses/{businessId}/images
   */
  async getBusinessImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      const images = await this.businessService.getBusinessImages(userId, businessId);

      await this.responseHelper.success(
        res,
        'success.business.imagesRetrieved',
        { images },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update gallery images order
   * PUT /api/v1/businesses/{businessId}/images/gallery
   */
  async updateGalleryImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const { imageUrls } = req.body;

      if (!Array.isArray(imageUrls)) {
        const error = new AppError('imageUrls must be an array', 400, ERROR_CODES.VALIDATION_ERROR);
        sendAppErrorResponse(res, error);
        return;
      }

      const business = await this.businessService.updateGalleryImages(
        userId,
        businessId,
        imageUrls
      );

      await this.responseHelper.success(
        res,
        'success.business.galleryUpdated',
        { business },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
