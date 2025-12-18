/**
 * Translation Utilities
 *
 * Simple helper functions for translating messages throughout the application.
 * Uses dependency injection - TranslationService must be passed as parameter.
 */

import { Request } from 'express';
import { TranslationService, TranslationParams } from '../services/core/translationService';
import { getLanguageFromRequest } from '../middleware/language';

/**
 * Translate a message using the translation key
 * Automatically uses language from request if available
 *
 * @param translationService - TranslationService instance (injected)
 * @param key - Translation key (e.g., 'errors.auth.unauthorized')
 * @param params - Optional parameters for interpolation
 * @param language - Optional language override (defaults to request language or 'tr')
 * @param req - Optional request object to extract language from
 */
export async function translateMessage(
  translationService: TranslationService,
  key: string,
  params?: TranslationParams,
  language?: string,
  req?: Request
): Promise<string> {
  // Determine language: explicit > request > default
  let targetLanguage = language;
  if (!targetLanguage && req) {
    targetLanguage = getLanguageFromRequest(req);
  }
  if (!targetLanguage) {
    targetLanguage = 'tr'; // Default fallback
  }

  return await translationService.translate(key, params || {}, targetLanguage);
}

/**
 * Get language from request (re-exported for convenience)
 */
export { getLanguageFromRequest } from '../middleware/language';
