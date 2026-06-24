import { Response } from 'express';
import {
  imageUploadSchema,
  deleteImageSchema,
  deleteGalleryImageSchema,
} from '../schemas/business.schemas';
import { BusinessService } from '../services/domain/business';
import { AuthenticatedRequest, AuthenticatedRequestWithFile } from '../types/request';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';
import { UsageRepository } from '../repositories/usageRepository';
import prisma from '../lib/prisma';

const STORAGE_LIMIT_BYTES_FALLBACK = 100 * 1024 * 1024; // 100 MB

async function checkStorageLimit(businessId: string, incomingBytes: number): Promise<void> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { subscription: { include: { plan: true } } }
  });

  if (!business?.subscription?.plan) return;

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
    throw new AppError('STORAGE_LIMIT_EXCEEDED', {
      message: `Storage limit exceeded: ${usedBytes}/${effectiveLimit} bytes, incoming ${incomingBytes}`,
    });
  }
}

export class BusinessImageController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  async uploadImage(req: AuthenticatedRequestWithFile, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;
    const validatedData = imageUploadSchema.parse(req.body);

    if (!req.file) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'No image file provided', params: { field: 'file' } });
    }

    const { imageType } = validatedData;
    const file = req.file;
    const fileSizeBytes = file.buffer.length;

    if (imageType === 'gallery') {
      await checkStorageLimit(businessId, fileSizeBytes);
    }

    const result = await this.businessService.uploadBusinessImage(
      userId, businessId, imageType, file.buffer, file.originalname, file.mimetype
    );

    const usageRepo = new UsageRepository(prisma);
    const existingByUrl = await prisma.businessImage.findFirst({ where: { url: result.imageUrl, businessId } });
    if (!existingByUrl) {
      await usageRepo.createBusinessImage(businessId, result.imageUrl, imageType, fileSizeBytes);
    }
    await usageRepo.updateStorageUsage(businessId);

    await this.responseHelper.success(
      res, 'success.business.imageUploaded',
      { imageUrl: result.imageUrl, business: result.business },
      200, req, { imageType }
    );
  }

  async deleteImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;
    const validatedData = deleteImageSchema.parse(req.params);
    const { imageType } = validatedData;

    const business = await this.businessService.deleteBusinessImage(userId, businessId, imageType);

    await this.responseHelper.success(res, 'success.business.imageDeleted', { business }, 200, req, { imageType });
  }

  async deleteGalleryImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;
    const validatedData = deleteGalleryImageSchema.parse(req.body);
    const { imageUrl } = validatedData;

    const business = await this.businessService.deleteGalleryImage(userId, businessId, imageUrl);

    const usageRepo = new UsageRepository(prisma);
    const imgRecord = await prisma.businessImage.findFirst({ where: { url: imageUrl, businessId } });
    if (imgRecord) {
      await prisma.businessImage.delete({ where: { id: imgRecord.id } });
    }
    await usageRepo.updateStorageUsage(businessId);

    await this.responseHelper.success(res, 'success.business.galleryImageDeleted', { business }, 200, req);
  }

  async getBusinessImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;

    const images = await this.businessService.getBusinessImages(userId, businessId);

    await this.responseHelper.success(res, 'success.business.imagesRetrieved', { images }, 200, req);
  }

  async updateGalleryImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;
    const { imageUrls } = req.body;

    if (!Array.isArray(imageUrls)) {
      throw new AppError('VALIDATION_ERROR', { message: 'imageUrls must be an array' });
    }

    const business = await this.businessService.updateGalleryImages(userId, businessId, imageUrls);

    await this.responseHelper.success(res, 'success.business.galleryUpdated', { business }, 200, req);
  }

  async getPhotos(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const usageRepo = new UsageRepository(prisma);
    const photos = await usageRepo.getBusinessImages(businessId);
    await this.responseHelper.success(res, 'success.business.photosRetrieved', { photos }, 200, req);
  }

  async uploadPhoto(req: AuthenticatedRequestWithFile, res: Response): Promise<void> {
    const { businessId } = req.params;

    if (!req.file) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'No image file provided', params: { field: 'file' } });
    }

    const file = req.file;
    const fileSizeBytes = file.buffer.length;

    await checkStorageLimit(businessId, fileSizeBytes);

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
  }

  async deletePhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId, imageId } = req.params;

    const usageRepo = new UsageRepository(prisma);
    const deleted = await usageRepo.deleteBusinessImageById(imageId, businessId);

    if (!deleted) {
      throw new AppError('PHOTO_NOT_FOUND', { message: `Photo ${imageId} not found` });
    }

    const { getImageStorageService } = await import('../services/domain/storage/imageStorageService');
    const imageStorageService = getImageStorageService();
    await imageStorageService.deleteBusinessImageByUrl(deleted.url).catch(() => {});

    await usageRepo.updateStorageUsage(businessId);

    await this.responseHelper.success(res, 'success.business.photoDeleted', {}, 200, req);
  }
}
