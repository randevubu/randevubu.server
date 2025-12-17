import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

interface Config {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  CORS_ORIGINS: string[];
  DATABASE_URL?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET_NAME?: string;
  PUBLIC_ASSET_BASE_URL?: string;
  AWS_SES_FROM_EMAIL?: string;
  AWS_SES_REPLY_EMAIL?: string;
}

const getConfig = (): Config => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3001', 10);
  const apiVersion = process.env.API_VERSION || 'v1';

  let corsOrigins: string[];
  if (nodeEnv === 'production') {
    corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0)
      : [];

    // In production, CORS_ORIGINS must be explicitly set
    if (corsOrigins.length === 0) {
      throw new Error('CORS_ORIGINS must be set in production environment. Please set it in your environment variables.');
    }
  } else {
    corsOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    API_VERSION: apiVersion,
    CORS_ORIGINS: corsOrigins,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST || 'redis',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    PUBLIC_ASSET_BASE_URL: process.env.PUBLIC_ASSET_BASE_URL,
    AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL,
    AWS_SES_REPLY_EMAIL: process.env.AWS_SES_REPLY_EMAIL,
  };
};

export const config = getConfig();

export const validateConfig = (): void => {
  const requiredVars = ['DATABASE_URL'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  if (config.NODE_ENV === 'production') {
    const productionVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'AWS_REGION', 'AWS_S3_BUCKET_NAME', 'CORS_ORIGINS'];
    const missingVars = productionVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables for production: ${missingVars.join(', ')}`);
    }

    // Validate DATABASE_URL format
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql://');
    }

    // Validate CORS_ORIGINS is set (already checked in getConfig, but double-check)
    if (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS.trim().length === 0) {
      throw new Error('CORS_ORIGINS must be set in production environment');
    }
  }
};