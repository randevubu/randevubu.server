/**
 * Production Translation Service
 * 
 * Centralized translation management for all application content.
 * Supports multiple languages, caching, and fallback strategies.
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

export interface TranslationParams {
  [key: string]: string | number | boolean | Date;
}

export interface TranslationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  cacheEnabled: boolean;
  cacheTTL: number; // in seconds
  fallbackStrategy: 'key' | 'default' | 'error';
}

export class TranslationService {
  private redis: Redis;
  private config: TranslationConfig;
  private translations: Map<string, Map<string, string>> = new Map();

  constructor(
    private prisma: PrismaClient,
    config?: Partial<TranslationConfig>
  ) {
    this.config = {
      defaultLanguage: 'tr',
      supportedLanguages: ['tr', 'en'],
      cacheEnabled: true,
      cacheTTL: 3600, // 1 hour
      fallbackStrategy: 'default',
      ...config
    };

    // Initialize Redis for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * Translate a message with parameters
   */
  async translate(
    key: string,
    params: TranslationParams = {},
    language?: string
  ): Promise<string> {
    const targetLanguage = language || this.config.defaultLanguage;
    
    try {
      // Try to get from cache first
      if (this.config.cacheEnabled) {
        const cached = await this.getFromCache(key, targetLanguage);
        if (cached) {
          return this.interpolateParams(cached, params);
        }
      }

      // Get from database
      const translation = await this.getFromDatabase(key, targetLanguage);
      
      if (translation) {
        // Cache the result
        if (this.config.cacheEnabled) {
          await this.setCache(key, targetLanguage, translation);
        }
        
        return this.interpolateParams(translation, params);
      }

      // Fallback strategy
      return await this.handleFallback(key, params, targetLanguage);

    } catch (error) {
      console.error(`Translation error for key ${key}:`, error);
      return await this.handleFallback(key, params, targetLanguage);
    }
  }

  /**
   * Get translation from database
   * Note: Database integration disabled until migration is applied
   */
  private async getFromDatabase(key: string, language: string): Promise<string | null> {
    // TODO: Enable when database migration is applied
    console.log(`Database translation lookup disabled for key: ${key}, language: ${language}`);
    return null;
  }

  /**
   * Get translation from cache
   */
  private async getFromCache(key: string, language: string): Promise<string | null> {
    try {
      const cacheKey = `translation:${language}:${key}`;
      return await this.redis.get(cacheKey);
    } catch (error) {
      console.error('Cache lookup failed:', error);
      return null;
    }
  }

  /**
   * Set translation in cache
   */
  private async setCache(key: string, language: string, value: string): Promise<void> {
    try {
      const cacheKey = `translation:${language}:${key}`;
      await this.redis.setex(cacheKey, this.config.cacheTTL, value);
    } catch (error) {
      console.error('Cache set failed:', error);
    }
  }

  /**
   * Interpolate parameters into translation string
   */
  private interpolateParams(template: string, params: TranslationParams): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = params[key];
      
      if (value === undefined || value === null) {
        console.warn(`Missing parameter ${key} for translation template`);
        return match;
      }

      // Handle different data types
      if (value instanceof Date) {
        return this.formatDate(value);
      }
      
      return String(value);
    });
  }

  /**
   * Handle fallback when translation is not found
   */
  private async handleFallback(key: string, params: TranslationParams, language: string): Promise<string> {
    switch (this.config.fallbackStrategy) {
      case 'default':
        // Try default language
        if (language !== this.config.defaultLanguage) {
          return await this.translate(key, params, this.config.defaultLanguage);
        }
        // Fall through to key strategy
        return key;
      
      case 'key':
        return key;
      
      case 'error':
        throw new Error(`Translation not found for key: ${key}, language: ${language}`);
      
      default:
        return key;
    }
  }

  /**
   * Format date for current locale
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Bulk translate multiple keys
   */
  async translateBulk(
    keys: string[],
    params: TranslationParams = {},
    language?: string
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    // Process in parallel for better performance
    const promises = keys.map(async (key) => {
      const translation = await this.translate(key, params, language);
      return { key, translation };
    });

    const translations = await Promise.all(promises);
    
    translations.forEach(({ key, translation }) => {
      results[key] = translation;
    });

    return results;
  }

  /**
   * Clear translation cache
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern || 'translation:*';
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear failed:', error);
    }
  }

  /**
   * Preload translations for better performance
   */
  async preloadTranslations(keys: string[], languages?: string[]): Promise<void> {
    const targetLanguages = languages || this.config.supportedLanguages;
    
    for (const language of targetLanguages) {
      for (const key of keys) {
        await this.translate(key, {}, language);
      }
    }
  }

  /**
   * Validate all translations exist for all languages
   * Note: Database validation disabled until migration is applied
   */
  async validateTranslations(): Promise<{
    missing: Array<{ key: string; language: string }>;
    invalid: Array<{ key: string; language: string; error: string }>;
  }> {
    console.log('Translation validation disabled - database migration not applied');
    return { missing: [], invalid: [] };
  }

  /**
   * Validate template syntax
   */
  private validateTemplate(template: string): boolean {
    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;
      
      return openBraces === closeBraces;
    } catch {
      return false;
    }
  }
}
