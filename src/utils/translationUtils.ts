/**
 * Translation Utilities
 *
 * Simple helper functions for translating messages throughout the application.
 * Wraps the TranslationService for convenience.
 */

import { Request } from "express";
import { TranslationService } from "../services/core/translationService";
import { TranslationParams } from "../services/core/translationService";
import { getLanguageFromRequest } from "../middleware/language";

// Singleton instance (lazy initialization)
let translationServiceInstance: TranslationService | null = null;

/**
 * Get or create translation service instance
 */
function getTranslationService(): TranslationService {
  if (!translationServiceInstance) {
    translationServiceInstance = new TranslationService();
  }
  return translationServiceInstance;
}

/**
 * Translate a message using the translation key
 * Automatically uses language from request if available
 *
 * @param key - Translation key (e.g., 'errors.auth.unauthorized')
 * @param params - Optional parameters for interpolation
 * @param language - Optional language override (defaults to request language or 'tr')
 * @param req - Optional request object to extract language from
 */
export async function translateMessage(
  key: string,
  params?: TranslationParams,
  language?: string,
  req?: Request
): Promise<string> {
  const translationService = getTranslationService();

  // Determine language: explicit > request > default
  let targetLanguage = language;
  if (!targetLanguage && req) {
    targetLanguage = getLanguageFromRequest(req);
  }
  if (!targetLanguage) {
    targetLanguage = "tr"; // Default fallback
  }

  return await translationService.translate(key, params || {}, targetLanguage);
}

/**
 * Get language from request (re-exported for convenience)
 */
export { getLanguageFromRequest } from "../middleware/language";

