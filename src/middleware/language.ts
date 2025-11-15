/**
 * Language Detection Middleware
 *
 * Detects the user's preferred language from:
 * 1. Accept-Language header (standard HTTP, supports quality scores)
 * 2. Default language ('tr')
 *
 * Note: User language preference is automatically checked and applied
 * after authentication middleware runs (see auth.ts and authUtils.ts).
 *
 * Industry-standard approach following HTTP Accept-Language specification.
 */

import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../types/request";

// Extend the Request interface to include language
declare global {
  namespace Express {
    interface Request {
      language?: string;
    }
  }
}

const SUPPORTED_LANGUAGES = ["tr", "en"] as const;
const DEFAULT_LANGUAGE = "tr";

/**
 * Parse Accept-Language header and return the best matching language
 * Example: "en-US,en;q=0.9,tr;q=0.8" -> "en" (first supported)
 */
function parseAcceptLanguage(
  header: string,
  supportedLanguages: readonly string[]
): string | null {
  if (!header || typeof header !== "string") {
    return null;
  }

  // Split by comma and parse each language
  const languages = header
    .split(",")
    .map((lang) => {
      const parts = lang.trim().split(";");
      const code = parts[0].toLowerCase().split("-")[0]; // Extract 'en' from 'en-US'
      const quality = parts[1]
        ? parseFloat(parts[1].split("=")[1] || "1.0")
        : 1.0;
      return { code, quality };
    })
    .sort((a, b) => b.quality - a.quality); // Sort by quality (highest first)

  // Find first supported language
  for (const { code } of languages) {
    if (supportedLanguages.includes(code)) {
      return code;
    }
  }

  return null;
}

/**
 * Validate if language code is supported
 */
function isValidLanguage(
  lang: string | null | undefined,
  supportedLanguages: readonly string[]
): boolean {
  if (!lang || typeof lang !== "string") {
    return false;
  }
  return supportedLanguages.includes(lang.toLowerCase());
}

/**
 * Language detection middleware
 * Detects language from Accept-Language header, falls back to default
 * User preference is automatically applied later by auth middleware
 */
export const languageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    let detectedLanguage: string | null = null;

    // Priority 1: Accept-Language header (standard HTTP)
    const acceptLanguage = req.headers["accept-language"] as string;
    if (acceptLanguage) {
      const parsed = parseAcceptLanguage(acceptLanguage, SUPPORTED_LANGUAGES);
      if (parsed) {
        detectedLanguage = parsed;
      }
    }

    // Priority 2: Default language (fallback)
    if (!detectedLanguage) {
      detectedLanguage = DEFAULT_LANGUAGE;
    }

    // Attach language to request object
    // Note: This may be overridden later by user preference after auth middleware runs
    req.language = detectedLanguage;

    // Set language in response header for debugging (optional)
    res.setHeader("X-Detected-Language", detectedLanguage);

    next();
  } catch (error) {
    // If detection fails, use default and continue (non-blocking)
    req.language = DEFAULT_LANGUAGE;
    res.setHeader("X-Detected-Language", DEFAULT_LANGUAGE);
    next();
  }
};

/**
 * Update language from authenticated user preference (utility function)
 * Called automatically by auth middleware after user is authenticated
 */
export function updateLanguageFromUser(req: Request): void {
  const user = (req as AuthenticatedRequest).user;
  if (user?.language && isValidLanguage(user.language, SUPPORTED_LANGUAGES)) {
    const userLang = user.language.toLowerCase();
    req.language = userLang;
    if (req.res && !req.res.headersSent) {
      req.res.setHeader("X-Detected-Language", userLang);
    }
  }
}

/**
 * Get language from request (utility function)
 */
export function getLanguageFromRequest(req: Request): string {
  return req.language || DEFAULT_LANGUAGE;
}

