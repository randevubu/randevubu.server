import crypto from 'crypto';
import { ParsedQs } from 'qs';

// Type for serializable values
type SerializableValue = string | number | boolean | null | SerializableValue[] | { [key: string]: SerializableValue };

/**
 * Secure cache key generation utility
 * Prevents prototype pollution and optimizes performance
 */
export class CacheKeyGenerator {
  /**
   * Safely serialize query parameters without prototype pollution
   */
  private static safeStringify(obj: Record<string, SerializableValue>): string {
    if (!obj || typeof obj !== 'object') return '';

    try {
      // Create a safe object without prototype
      const safeObj: Record<string, SerializableValue> = Object.create(null);

      // Only include enumerable properties, skip prototype
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          // Skip functions and undefined values
          if (typeof value !== 'function' && value !== undefined) {
            safeObj[key] = value;
          }
        }
      }

      return JSON.stringify(safeObj);
    } catch (error) {
      // Fallback to empty string if serialization fails
      return '';
    }
  }

  /**
   * Generate secure hash for query parameters
   */
  static generateQueryHash(query: ParsedQs | Record<string, SerializableValue>): string {
    if (!query || Object.keys(query).length === 0) return '';

    const queryString = this.safeStringify(query as Record<string, SerializableValue>);
    if (!queryString) return '';

    return crypto.createHash('md5').update(queryString).digest('hex');
  }

  /**
   * Generate complete cache key with security
   */
  static generateCacheKey(
    prefix: string,
    userId: string,
    businessId: string,
    path: string,
    query?: ParsedQs | Record<string, SerializableValue>
  ): string {
    const cleanPath = path.replace(/\/$/, '');
    const queryHash = query ? this.generateQueryHash(query) : '';
    
    return `${prefix}:${userId}:${businessId}:${cleanPath}${queryHash ? `:${queryHash}` : ''}`;
  }

  /**
   * Validate cache key for security
   */
  static validateCacheKey(key: string): boolean {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /__proto__/i,
      /constructor/i,
      /prototype/i,
      /<script/i,
      /javascript:/i
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(key));
  }
}



