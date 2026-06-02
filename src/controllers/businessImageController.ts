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
import { UsageRepository } from '../repositories/usageRepository';
import prisma from '../lib/prisma';

const STORAGE_LIMIT_BYTES_FALLBACK = 100 * 1024 * 1024; // 100 MB

async function checkStorageLimit(businessId: string, incomingBytes: number): Promise<AppError | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { subscription: { include: { plan: true } } }
  });

  if (!business?.subscription?.plan) return null;

  const features = business.subscription.plan.features as Record<string, unknown>;
  const storageGB = Number(features?.storageGB) || 0.1;
  const limitBytes = Math.round(storageGB * 1024 * 1024 * 1024);

  const current = await prisma.businessImage.aggregate({
    where: { businessId },
    _sum: { fileSizeBytes: true }
  });

  const usedBytes = current._sum.fileSizeBytes || 0;
  const effectiveLimit = limitBytes || STORAGE_LIMIT_BYTES_FALLBACK;

  if (usedBytes + incomingBytes > effectiveLimit) {
    const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
    const limitMB = (effectiveLimit / (1024 * 1024)).toFixed(0);
    const fileMB = (incomingBytes / (1024 * 1024)).toFixed(1);
    return new AppError(
      `Depolama limitini aştınız. Kullanılan: ${usedMB} MB / ${limitMB} MB. Yüklenecek dosya: ${fileMB} MB.`,
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  return null;
}

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
      const fileSizeBytes = file.buffer.length;

      // Only check storage limit for gallery images (logo/cover/profile replace existing)
      if (imageType === 'gallery') {
        const limitError = await checkStorageLimit(businessId, fileSizeBytes);
        if (limitError) { sendAppErrorResponse(res, limitError); return; }
      }

      const result = await this.businessService.uploadBusinessImage(
        userId,
        businessId,
        imageType,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Track file size in BusinessImage table and update storage counter
      const usageRepo = new UsageRepository(prisma);
      const existingByUrl = await prisma.businessImage.findFirst({ where: { url: result.imageUrl, businessId } });
      if (!existingByUrl) {
        await usageRepo.createBusinessImage(businessId, result.imageUrl, imageType, fileSizeBytes);
      }
      await usageRepo.updateStorageUsage(businessId);

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

      // Remove BusinessImage record and update storage
      const usageRepo = new UsageRepository(prisma);
      const imgRecord = await prisma.businessImage.findFirst({ where: { url: imageUrl, businessId } });
      if (imgRecord) {
        await prisma.businessImage.delete({ where: { id: imgRecord.id } });
      }
      await usageRepo.updateStorageUsage(businessId);

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

  // ── Photo gallery with storage tracking ──

  async getPhotos(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const usageRepo = new UsageRepository(prisma);
      const photos = await usageRepo.getBusinessImages(businessId);
      await this.responseHelper.success(res, 'success.business.photosRetrieved', { photos }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async uploadPhoto(req: AuthenticatedRequestWithFile, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      if (!req.file) {
        sendAppErrorResponse(res, new AppError('No image file provided', 400, ERROR_CODES.VALIDATION_ERROR));
        return;
      }

      const file = req.file;
      const fileSizeBytes = file.buffer.length;

      const limitError = await checkStorageLimit(businessId, fileSizeBytes);
      if (limitError) { sendAppErrorResponse(res, limitError); return; }

      const { getImageStorageService } = await import('../services/domain/storage/imageStorageService');
      const imageStorageService = getImageStorageService();

      const uploadResult = await imageStorageService.uploadBusinessImage(
        businessId, 'gallery', file.buffer, file.originalname, file.mimetype,
        { generatePresignedUrl: false }
      );

      const usageRepo = new UsageRepository(prisma);
      const photo = await usageRepo.createBusinessImage(businessId, uploadResult.publicUrl, 'gallery', fileSizeBytes);
      await usageRepo.updateStorageUsage(businessId);

      await this.responseHelper.success(res, 'success.business.photoUploaded', { photo }, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async deletePhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, imageId } = req.params;

      const usageRepo = new UsageRepository(prisma);
      const deleted = await usageRepo.deleteBusinessImageById(imageId, businessId);

      if (!deleted) {
        sendAppErrorResponse(res, new AppError('Photo not found', 404, ERROR_CODES.ROLE_NOT_FOUND));
        return;
      }

      const { getImageStorageService } = await import('../services/domain/storage/imageStorageService');
      const imageStorageService = getImageStorageService();
      await imageStorageService.deleteBusinessImageByUrl(deleted.url).catch(() => {});

      await usageRepo.updateStorageUsage(businessId);

      await this.responseHelper.success(res, 'success.business.photoDeleted', {}, 200, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
