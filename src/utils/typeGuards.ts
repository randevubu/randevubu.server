// Type Guards Utility - Enterprise Type Safety
import { UUID_REGEX } from '../constants/notificationValidation';

/**
 * Type guard to check if value is a valid object
 * Industry Standard: Runtime type checking
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if value is a string
 * Industry Standard: Runtime type checking
 */
export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard to check if value is a valid UUID
 * Industry Standard: UUID validation
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Type guard to check if value is a valid array
 * Industry Standard: Runtime type checking
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if value is a number
 * Industry Standard: Runtime type checking
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if value is a boolean
 * Industry Standard: Runtime type checking
 */
export function isValidBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if value is null or undefined
 * Industry Standard: Nullish checking
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if value is a non-empty string
 * Industry Standard: String validation
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if value is a valid email
 * Industry Standard: Email validation
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard to check if value is a valid IP address
 * Industry Standard: IP validation
 */
export function isValidIP(value: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(value) || ipv6Regex.test(value);
}

/**
 * Type guard to check if value is a valid date string
 * Industry Standard: Date validation
 */
export function isValidDateString(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Type guard to check if value is a valid JSON string
 * Industry Standard: JSON validation
 */
export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if value is a valid URL
 * Industry Standard: URL validation
 */
export function isValidURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if value is a valid positive integer
 * Industry Standard: Integer validation
 */
export function isValidPositiveInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value) && value > 0;
}

/**
 * Type guard to check if value is a valid non-negative integer
 * Industry Standard: Integer validation
 */
export function isValidNonNegativeInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value) && value >= 0;
}
