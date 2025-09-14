import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
  }

  generateImageKey(businessId: string, imageType: 'logo' | 'cover' | 'profile' | 'gallery', originalName?: string): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const extension = originalName ? path.extname(originalName) : '.jpg';
    
    return `businesses/${businessId}/${imageType}/${timestamp}-${uniqueId}${extension}`;
  }

  async uploadImage(
    buffer: Buffer,
    key: string,
    contentType: string = 'image/jpeg',
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload image to S3');
    }
  }

  async deleteImage(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error('Failed to delete image from S3');
    }
  }

  async deleteImageByUrl(imageUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(imageUrl);
      if (key) {
        await this.deleteImage(key);
      }
    } catch (error) {
      console.error('Error deleting image by URL:', error);
      throw error;
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  extractKeyFromUrl(imageUrl: string): string | null {
    try {
      const url = new URL(imageUrl);
      const pathName = url.pathname;
      return pathName.startsWith('/') ? pathName.substring(1) : pathName;
    } catch (error) {
      console.error('Invalid image URL:', imageUrl);
      return null;
    }
  }

  isValidImageType(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    return allowedTypes.includes(mimetype);
  }

  validateImageSize(size: number, maxSizeMB: number = 5): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  async uploadBusinessImage(
    businessId: string,
    imageType: 'logo' | 'cover' | 'profile' | 'gallery',
    buffer: Buffer,
    originalName: string,
    contentType: string
  ): Promise<string> {
    if (!this.isValidImageType(contentType)) {
      throw new Error('Invalid image type. Only JPEG, PNG, WebP and GIF are allowed.');
    }

    if (!this.validateImageSize(buffer.length)) {
      throw new Error('Image size too large. Maximum allowed size is 5MB.');
    }

    const key = this.generateImageKey(businessId, imageType, originalName);
    const metadata = {
      businessId,
      imageType,
      originalName: originalName || 'unknown',
      uploadedAt: new Date().toISOString(),
    };

    return await this.uploadImage(buffer, key, contentType, metadata);
  }
}

let s3ServiceInstance: S3Service | null = null;

export const getS3Service = (): S3Service => {
  if (!s3ServiceInstance) {
    const config = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION!,
      bucketName: process.env.AWS_S3_BUCKET_NAME!,
    };

    console.log('🔍 S3 Config:', {
      accessKeyId: config.accessKeyId ? `${config.accessKeyId.substring(0, 8)}...` : 'MISSING',
      secretAccessKey: config.secretAccessKey ? `${config.secretAccessKey.substring(0, 8)}...` : 'MISSING',
      region: config.region || 'MISSING',
      bucketName: config.bucketName || 'MISSING'
    });

    if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.bucketName) {
      throw new Error('Missing required AWS S3 configuration. Please check your environment variables.');
    }

    s3ServiceInstance = new S3Service(config);
  }

  return s3ServiceInstance;
};

export { S3Service };