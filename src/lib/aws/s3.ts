import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config as appConfig } from '../../config/environment';
import Logger from '../../utils/Logger/logger';

export interface S3Config {
  region: string;
  bucketName: string;
  publicBaseUrl?: string;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  allowedHosts?: string[];
}

export interface UploadOptions {
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
}

export class S3ClientWrapper {
  private s3Client: S3Client;
  private bucketName: string;
  private publicBaseUrl?: string;
  private requestTimeoutMs: number;
  private allowedHosts: string[];

  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      maxAttempts: config.maxAttempts ?? 3,
    });
    this.bucketName = config.bucketName;
    this.publicBaseUrl = config.publicBaseUrl;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 15000;
    this.allowedHosts = config.allowedHosts ?? [];
  }

  async uploadObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: options?.metadata,
        ServerSideEncryption: 'AES256',
        CacheControl: options?.cacheControl ?? 'public, max-age=31536000, immutable',
        ContentDisposition: options?.contentDisposition,
      });

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), this.requestTimeoutMs);
      
      await this.s3Client.send(command, { abortSignal: abortController.signal });
      clearTimeout(timeout);

      return key; // Return the key, not a URL
    } catch (error) {
      Logger.error('S3 upload error', { error, key });
      throw new Error('Failed to upload object to S3');
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), this.requestTimeoutMs);
      
      await this.s3Client.send(command, { abortSignal: abortController.signal });
      clearTimeout(timeout);
    } catch (error) {
      Logger.error('S3 delete error', { error, key });
      throw new Error('Failed to delete object from S3');
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
      Logger.error('Error generating presigned URL', { error, key });
      throw new Error('Failed to generate presigned URL');
    }
  }

  buildPublicUrl(key: string): string {
    const base = this.publicBaseUrl
      || `https://${this.bucketName}.s3.${(appConfig as any).AWS_REGION}.amazonaws.com`;
    const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
    return `${base}/${encodedKey}`;
  }

  extractKeyFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.host.toLowerCase();
      const pathName = parsedUrl.pathname;

      // Validate host against allowed hosts if configured
      const s3RegionHost = `s3.${(appConfig as any).AWS_REGION}.amazonaws.com`;
      const bucketHostA = `${this.bucketName}.s3.amazonaws.com`;
      const bucketHostB = `${this.bucketName}.${s3RegionHost}`;
      
      const isAllowed =
        this.allowedHosts.some(h => host === h.toLowerCase()) ||
        host === bucketHostA ||
        host === bucketHostB;
        
      if (!isAllowed && this.allowedHosts.length > 0) {
        throw new Error('Untrusted asset host');
      }

      return pathName.startsWith('/') 
        ? decodeURIComponent(pathName.substring(1)) 
        : decodeURIComponent(pathName);
    } catch (error) {
      Logger.warn('Invalid or untrusted URL', { url, error });
      return null;
    }
  }

  async deleteObjectByUrl(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);
    if (key) {
      await this.deleteObject(key);
    }
  }
}

// Singleton instance
let s3ClientInstance: S3ClientWrapper | null = null;

export const getS3Client = (): S3ClientWrapper => {
  if (!s3ClientInstance) {
    const region = (appConfig as any).AWS_REGION;
    const bucketName = (appConfig as any).AWS_S3_BUCKET_NAME;
    const publicBaseUrl = (appConfig as any).PUBLIC_ASSET_BASE_URL;
    const maxAttempts = parseInt(process.env.AWS_MAX_ATTEMPTS || '3', 10);
    const requestTimeoutMs = parseInt(process.env.AWS_REQUEST_TIMEOUT_MS || '15000', 10);
    const allowedHosts = (process.env.ASSET_ALLOWED_HOSTS || '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    if (!region || !bucketName) {
      throw new Error('Missing required AWS S3 configuration. Please check your environment variables.');
    }

    s3ClientInstance = new S3ClientWrapper({
      region,
      bucketName,
      publicBaseUrl,
      maxAttempts,
      requestTimeoutMs,
      allowedHosts,
    });
  }

  return s3ClientInstance;
};
