/**
 * XSS Sanitization Middleware
 *
 * Sanitizes user input to prevent Cross-Site Scripting (XSS) attacks.
 * Uses DOMPurify with JSDOM to clean HTML content from request bodies.
 */

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { NextFunction, Request, Response } from 'express';
import logger from '../utils/Logger/logger';

// Type for the JSDOM window that satisfies DOMPurify requirements
type DOMWindow = Window & typeof globalThis;

// Create DOMPurify instance with JSDOM window
const jsdomWindow = new JSDOM('').window;
const purify = DOMPurify(jsdomWindow as unknown as DOMWindow);

// Configuration for different sanitization levels
const SANITIZATION_CONFIG = {
  // Strict: Remove all HTML tags
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // Moderate: Allow safe formatting tags
  moderate: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // Permissive: Allow most formatting but strip scripts
  permissive: {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: true,
  },
};

type SanitizationLevel = keyof typeof SANITIZATION_CONFIG;

// Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type-safe sanitization result types
 */
type SanitizedValue<T> = T extends string
  ? string
  : T extends (infer U)[]
  ? SanitizedValue<U>[]
  : T extends Record<string, unknown>
  ? { [K in keyof T]: SanitizedValue<T[K]> }
  : T;

/**
 * Recursively sanitize an object, array, or primitive value
 */
function sanitizeValue<T>(value: T, level: SanitizationLevel = 'strict'): SanitizedValue<T> {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value as SanitizedValue<T>;
  }

  // Handle arrays
  if (isArray(value)) {
    return value.map(item => sanitizeValue(item, level)) as SanitizedValue<T>;
  }

  // Handle objects
  if (isObject(value)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize the key to prevent property injection
      const safeKey = sanitizeString(key, 'strict');
      sanitized[safeKey] = sanitizeValue(val, level);
    }
    return sanitized as SanitizedValue<T>;
  }

  // Handle strings
  if (isString(value)) {
    return sanitizeString(value, level) as SanitizedValue<T>;
  }

  // Return primitives as-is (numbers, booleans)
  return value as SanitizedValue<T>;
}

/**
 * Sanitize a string value
 */
function sanitizeString(value: string, level: SanitizationLevel = 'strict'): string {
  // Remove null bytes
  let cleaned = value.replace(/\0/g, '');

  // Use DOMPurify to clean potential HTML/XSS
  const config = SANITIZATION_CONFIG[level];
  cleaned = purify.sanitize(cleaned, config);

  return cleaned;
}

/**
 * Fields that should not be sanitized (e.g., passwords, tokens)
 * These should be validated but not modified
 */
const SKIP_FIELDS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'hash',
]);

/**
 * Check if a field should be skipped from sanitization
 */
function shouldSkipField(fieldPath: string): boolean {
  const fieldName = fieldPath.split('.').pop() || '';
  return SKIP_FIELDS.has(fieldName);
}

/**
 * Type for nested object navigation
 */
interface NavigationResult {
  parent: Record<string, unknown> | null;
  lastKey: string;
  found: boolean;
}

/**
 * Navigate to a nested field in an object
 */
function navigateToField(obj: Record<string, unknown>, path: string): NavigationResult {
  const keys = path.split('.');
  let current: unknown = obj;
  let parent: Record<string, unknown> | null = null;
  let lastKey = '';

  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      lastKey = keys[i];
      if (isObject(current)) {
        parent = current;
      }
      break;
    }

    if (!isObject(current) || current[keys[i]] === undefined) {
      return { parent: null, lastKey: '', found: false };
    }

    parent = current;
    current = current[keys[i]];
  }

  return {
    parent,
    lastKey,
    found: parent !== null && lastKey !== '' && parent[lastKey] !== undefined,
  };
}

/**
 * Middleware factory to sanitize request body
 *
 * @param level - Sanitization level: 'strict', 'moderate', or 'permissive'
 * @param paths - Specific paths to sanitize (if not specified, sanitizes entire body)
 *
 * @example
 * // Strict sanitization for all fields
 * app.post('/api/users', sanitizeBody(), handler);
 *
 * @example
 * // Moderate sanitization for specific fields
 * app.post('/api/posts', sanitizeBody('moderate', ['title', 'content']), handler);
 */
export function sanitizeBody(
  level: SanitizationLevel = 'strict',
  paths?: string[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.body || !isObject(req.body)) {
        return next();
      }

      // If specific paths are provided, only sanitize those
      if (paths && paths.length > 0) {
        for (const path of paths) {
          if (shouldSkipField(path)) {
            continue;
          }

          const { parent, lastKey, found } = navigateToField(req.body, path);

          // Sanitize the field if found
          if (found && parent && lastKey) {
            parent[lastKey] = sanitizeValue(parent[lastKey], level);
          }
        }
      } else {
        // Sanitize entire body
        req.body = sanitizeValue(req.body, level);
      }

      logger.debug('Request body sanitized', {
        endpoint: req.path,
        method: req.method,
        level,
        specificPaths: paths,
      });

      next();
    } catch (error) {
      logger.error('Error sanitizing request body', {
        endpoint: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });

      // Continue even if sanitization fails (fail open)
      // But log the error for investigation
      next();
    }
  };
}

/**
 * Middleware to sanitize query parameters
 */
export function sanitizeQuery(level: SanitizationLevel = 'strict') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.query || !isObject(req.query)) {
        return next();
      }

      // Express query is ParsedQs type, but we can safely sanitize it
      const sanitized = sanitizeValue(req.query as Record<string, unknown>, level);
      req.query = sanitized as typeof req.query;

      logger.debug('Query parameters sanitized', {
        endpoint: req.path,
        method: req.method,
        level,
      });

      next();
    } catch (error) {
      logger.error('Error sanitizing query parameters', {
        endpoint: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });

      next();
    }
  };
}

/**
 * Middleware to sanitize URL parameters
 */
export function sanitizeParams(level: SanitizationLevel = 'strict') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.params || !isObject(req.params)) {
        return next();
      }

      req.params = sanitizeValue(req.params, level);

      logger.debug('URL parameters sanitized', {
        endpoint: req.path,
        method: req.method,
        level,
      });

      next();
    } catch (error) {
      logger.error('Error sanitizing URL parameters', {
        endpoint: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });

      next();
    }
  };
}

/**
 * Combined middleware to sanitize all request inputs
 */
export function sanitizeAll(level: SanitizationLevel = 'strict') {
  return [
    sanitizeParams(level),
    sanitizeQuery(level),
    sanitizeBody(level),
  ];
}

// Export utility functions for manual sanitization
export { sanitizeValue, sanitizeString, SANITIZATION_CONFIG };
export type { SanitizationLevel };
