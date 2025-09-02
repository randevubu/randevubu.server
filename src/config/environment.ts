import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

interface Config {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  CORS_ORIGINS: string[];
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  REDIS_URL?: string;
}

const getConfig = (): Config => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3001', 10);
  const apiVersion = process.env.API_VERSION || 'v1';
  
  let corsOrigins: string[];
  if (nodeEnv === 'production') {
    corsOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['https://yourdomain.com'];
  } else {
    corsOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    API_VERSION: apiVersion,
    CORS_ORIGINS: corsOrigins,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    REDIS_URL: process.env.REDIS_URL,
  };
};

export const config = getConfig();

export const validateConfig = (): void => {
  const requiredVars = ['NODE_ENV', 'PORT'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName] && varName !== 'PORT') {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  if (config.NODE_ENV === 'production') {
    const productionVars = ['JWT_SECRET', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
    for (const varName of productionVars) {
      if (!process.env[varName]) {
        console.warn(`Warning: Missing recommended environment variable for production: ${varName}`);
      }
    }
  }
};