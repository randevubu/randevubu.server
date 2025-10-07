import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { getS3Client, UploadOptions } from '../../../lib/aws/s3';
import Logger from '../../../utils/Logger/logger';

export type ImageType = 'logo' | 'cover' | 'profile' | 'gallery';

export interface ImageUploadResult {
  key: string;
  publicUrl: string;
  presignedUrl?: string;
}

export interface ImageValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export class ImageStorageService {
  private s3Client = getS3Client();
  private defaultMaxSizeMB = 5;
  private defaultAllowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];

  generateImageKey(businessId: string, imageType: ImageType, originalName?: string): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const extension = originalName ? path.extname(originalName) : '.jpg';
    
    return `businesses/${businessId}/${imageType}/${timestamp}-${uniqueId}${extension}`;
  }

  validateImageType(mimetype: string, allowedTypes?: string[]): boolean {
    const types = allowedTypes || this.defaultAllowedTypes;
    return types.includes(mimetype);
  }

  validateImageSize(size: number, maxSizeMB?: number): boolean {
    const maxSize = maxSizeMB || this.defaultMaxSizeMB;
    const maxSizeBytes = maxSize * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  async uploadBusinessImage(
    businessId: string,
    imageType: ImageType,
    buffer: Buffer,
    originalName: string,
    contentType: string,
    options?: {
      validation?: ImageValidationOptions;
      upload?: UploadOptions;
      generatePresignedUrl?: boolean;
    }
  ): Promise<ImageUploadResult> {
    // Validate image type
    if (!this.validateImageType(contentType, options?.validation?.allowedTypes)) {
      throw new Error('Invalid image type. Only JPEG, PNG, WebP and GIF are allowed.');
    }

    // Validate image size
    if (!this.validateImageSize(buffer.length, options?.validation?.maxSizeMB)) {
      const maxSize = options?.validation?.maxSizeMB || this.defaultMaxSizeMB;
      throw new Error(`Image size too large. Maximum allowed size is ${maxSize}MB.`);
    }

    // Generate key
    const key = this.generateImageKey(businessId, imageType, originalName);

    // Prepare metadata
    const metadata = {
      businessId,
      imageType,
      originalName: originalName || 'unknown',
      uploadedAt: new Date().toISOString(),
      ...options?.upload?.metadata,
    };

    // Upload options
    const uploadOptions: UploadOptions = {
      metadata,
      cacheControl: 'public, max-age=31536000, immutable',
      ...options?.upload,
    };

    try {
      // Upload to S3
      const uploadedKey = await this.s3Client.uploadObject(
        key,
        buffer,
        contentType,
        uploadOptions
      );

      // Build public URL
      const publicUrl = this.s3Client.buildPublicUrl(uploadedKey);

      // Generate presigned URL if requested
      let presignedUrl: string | undefined;
      if (options?.generatePresignedUrl) {
        presignedUrl = await this.s3Client.generatePresignedUrl(uploadedKey);
      }

      Logger.info('Image uploaded successfully', {
        businessId,
        imageType,
        key: uploadedKey,
        size: buffer.length,
      });

      return {
        key: uploadedKey,
        publicUrl,
        presignedUrl,
      };
    } catch (error) {
      Logger.error('Failed to upload business image', {
        error,
        businessId,
        imageType,
        originalName,
      });
      throw error;
    }
  }

  async deleteBusinessImage(key: string): Promise<void> {
    try {
      await this.s3Client.deleteObject(key);
      
      Logger.info('Image deleted successfully', { key });
    } catch (error) {
      Logger.error('Failed to delete business image', { error, key });
      throw error;
    }
  }

  async deleteBusinessImageByUrl(imageUrl: string): Promise<void> {
    try {
      await this.s3Client.deleteObjectByUrl(imageUrl);
      
      Logger.info('Image deleted by URL successfully', { imageUrl });
    } catch (error) {
      Logger.error('Failed to delete business image by URL', { error, imageUrl });
      throw error;
    }
  }

  async generateImagePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.s3Client.generatePresignedUrl(key, expiresIn);
    } catch (error) {
      Logger.error('Failed to generate presigned URL for image', { error, key });
      throw error;
    }
  }

  buildImagePublicUrl(key: string): string {
    return this.s3Client.buildPublicUrl(key);
  }

  extractKeyFromImageUrl(imageUrl: string): string | null {
    return this.s3Client.extractKeyFromUrl(imageUrl);
  }
}

// Singleton instance
let imageStorageServiceInstance: ImageStorageService | null = null;

export const getImageStorageService = (): ImageStorageService => {
  if (!imageStorageServiceInstance) {
    imageStorageServiceInstance = new ImageStorageService();
  }
  return imageStorageServiceInstance;
};
