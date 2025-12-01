/**
 * Translation Service Types
 * 
 * Shared types for translation functionality across the application.
 */

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

export interface TranslationValidationResult {
  missing: Array<{ key: string; language: string }>;
  invalid: Array<{ key: string; language: string; error: string }>;
}

