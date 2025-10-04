// Core Sanitization Service - Generic & Reusable
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Generic types for core sanitization
export interface SanitizationConfig {
  allowedTags: string[];
  allowedAttributes: string[];
}

export type SanitizedData = 
  | { [key: string]: string | number | boolean | SanitizedData | SanitizedData[] | null | undefined }
  | SanitizedData[]
  | null;

export interface CoreSanitizationOptions {
  keyValidationRegex?: RegExp;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

export class CoreSanitizationService {
  private dom = new JSDOM('');
  private purify = DOMPurify(this.dom.window);

  /**
   * Sanitize HTML content with custom configuration
   * Industry Standard: Generic HTML sanitization
   */
  sanitizeHTML(html: string, config: SanitizationConfig): string {
    return this.purify.sanitize(html, {
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: config.allowedAttributes
    });
  }

  /**
   * Sanitize user input for display (no HTML allowed)
   * Industry Standard: Input sanitization
   */
  sanitizeUserInput(input: string): string {
    return this.purify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  /**
   * Sanitize rich text content
   * Industry Standard: Rich text sanitization
   */
  sanitizeRichText(content: string, allowedTags: string[] = ['p', 'br', 'strong', 'em', 'u', 'b', 'i']): string {
    return this.purify.sanitize(content, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: []
    });
  }

  /**
   * Recursively sanitize data object
   * Industry Standard: Deep sanitization with strict typing
   */
  sanitizeDataObject(data: unknown, options: CoreSanitizationOptions = {}): SanitizedData {
    const {
      keyValidationRegex = /^[a-zA-Z0-9_-]+$/,
      allowedTags = [],
      allowedAttributes = []
    } = options;

    if (!data || typeof data !== 'object') {
      return data as SanitizedData;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDataObject(item, options)) as SanitizedData;
    }

    const sanitized: { [key: string]: any } = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Validate key name
      if (!keyValidationRegex.test(key)) {
        continue; // Skip invalid keys
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHTML(value, { allowedTags, allowedAttributes });
      } else if (typeof value === 'object' && value !== null) {
        const sanitizedValue = this.sanitizeDataObject(value, options);
        if (sanitizedValue !== null) {
          sanitized[key] = sanitizedValue as SanitizedData;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Skip other types for security
    }

    return sanitized as SanitizedData;
  }

  /**
   * Check if content contains potentially malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Sanitize file name for safe storage
   * Industry Standard: File name sanitization
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Sanitize URL for safe usage
   * Industry Standard: URL sanitization
   */
  sanitizeURL(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Only allow http and https protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      return parsedUrl.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize SQL input (basic protection)
   * Industry Standard: SQL injection prevention
   */
  sanitizeSQLInput(input: string): string {
    return input
      .replace(/['"\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * Sanitize JSON input
   * Industry Standard: JSON sanitization
   */
  sanitizeJSONInput(input: string): string {
    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      return '';
    }
  }
}
