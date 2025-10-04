// Core Validation Service - Generic & Reusable
import { isValidString, isValidArray, isValidUUID, isValidEmail, isValidIP } from '../../utils/typeGuards';

// Generic validation result interface
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

// Validation error types
export enum ValidationErrorType {
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_LENGTH = 'INVALID_LENGTH',
  INVALID_VALUE = 'INVALID_VALUE',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED'
}

// Detailed validation error
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  field?: string;
  value?: unknown;
  expected?: string;
}

// String validation options
export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
}

// Array validation options
export interface ArrayValidationOptions {
  minLength?: number;
  maxLength?: number;
  itemValidator?: (item: unknown) => ValidationResult<unknown>;
  required?: boolean;
}

export class CoreValidationService {
  /**
   * Validate string with options
   * Industry Standard: String validation
   */
  validateString(value: unknown, options: StringValidationOptions = {}): ValidationResult<string> {
    const { minLength = 0, maxLength, pattern, required = true } = options;

    if (required && !value) {
      return {
        isValid: false,
        errors: ['Value is required']
      };
    }

    if (!required && !value) {
      return { isValid: true, data: '' };
    }

    if (!isValidString(value)) {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    if (value.length < minLength) {
      return {
        isValid: false,
        errors: [`String must be at least ${minLength} characters long`]
      };
    }

    if (maxLength && value.length > maxLength) {
      return {
        isValid: false,
        errors: [`String cannot exceed ${maxLength} characters`]
      };
    }

    if (pattern && !pattern.test(value)) {
      return {
        isValid: false,
        errors: ['String does not match required pattern']
      };
    }

    return { isValid: true, data: value };
  }

  /**
   * Validate array with options
   * Industry Standard: Array validation
   */
  validateArray<T = unknown>(value: unknown, options: ArrayValidationOptions = {}): ValidationResult<T[]> {
    const { minLength = 0, maxLength, itemValidator, required = true } = options;

    if (required && !value) {
      return {
        isValid: false,
        errors: ['Value is required']
      };
    }

    if (!required && !value) {
      return { isValid: true, data: [] };
    }

    if (!isValidArray(value)) {
      return {
        isValid: false,
        errors: ['Value must be an array']
      };
    }

    if (value.length < minLength) {
      return {
        isValid: false,
        errors: [`Array must have at least ${minLength} items`]
      };
    }

    if (maxLength && value.length > maxLength) {
      return {
        isValid: false,
        errors: [`Array cannot have more than ${maxLength} items`]
      };
    }

    if (itemValidator) {
      const errors: string[] = [];
      const validItems: T[] = [];

      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator(value[i]);
        if (itemResult.isValid && itemResult.data !== undefined) {
          validItems.push(itemResult.data as T);
        } else {
          errors.push(`Item ${i + 1}: ${itemResult.errors?.join(', ') || 'Invalid'}`);
        }
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors
        };
      }

      return { isValid: true, data: validItems };
    }

    return { isValid: true, data: value as T[] };
  }

  /**
   * Validate UUID format
   * Industry Standard: UUID validation
   */
  validateUUID(value: string): ValidationResult<string> {
    if (!isValidString(value)) {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    if (!isValidUUID(value)) {
      return {
        isValid: false,
        errors: ['Value must be a valid UUID']
      };
    }

    return { isValid: true, data: value };
  }

  /**
   * Validate email format
   * Industry Standard: Email validation
   */
  validateEmail(value: string): ValidationResult<string> {
    if (!isValidString(value)) {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    if (!isValidEmail(value)) {
      return {
        isValid: false,
        errors: ['Invalid email format']
      };
    }

    return { isValid: true, data: value };
  }

  /**
   * Validate IP address format
   * Industry Standard: IP validation
   */
  validateIPAddress(value: string): ValidationResult<string> {
    if (!isValidString(value)) {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    if (!isValidIP(value)) {
      return {
        isValid: false,
        errors: ['Invalid IP address format']
      };
    }

    return { isValid: true, data: value };
  }

  /**
   * Validate data object size
   * Industry Standard: Resource validation
   */
  validateDataSize(data: unknown, maxSizeBytes: number): ValidationResult<boolean> {
    if (!data) {
      return { isValid: true, data: true };
    }

    try {
      const jsonString = JSON.stringify(data);
      const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
      
      if (sizeInBytes > maxSizeBytes) {
        return {
          isValid: false,
          errors: [`Data size (${sizeInBytes} bytes) exceeds limit (${maxSizeBytes} bytes)`]
        };
      }

      return { isValid: true, data: true };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Data cannot be serialized']
      };
    }
  }

  /**
   * Validate against allowed values
   * Industry Standard: Enum validation
   */
  validateEnum<T extends string>(value: unknown, allowedValues: readonly T[]): ValidationResult<T> {
    if (!isValidString(value)) {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    if (!allowedValues.includes(value as T)) {
      return {
        isValid: false,
        errors: [`Value must be one of: ${allowedValues.join(', ')}`]
      };
    }

    return { isValid: true, data: value as T };
  }

  /**
   * Validate number with range
   * Industry Standard: Number validation
   */
  validateNumber(value: unknown, options: { min?: number; max?: number; integer?: boolean } = {}): ValidationResult<number> {
    const { min, max, integer = false } = options;

    if (typeof value !== 'number' || isNaN(value)) {
      return {
        isValid: false,
        errors: ['Value must be a valid number']
      };
    }

    if (integer && !Number.isInteger(value)) {
      return {
        isValid: false,
        errors: ['Value must be an integer']
      };
    }

    if (min !== undefined && value < min) {
      return {
        isValid: false,
        errors: [`Value must be at least ${min}`]
      };
    }

    if (max !== undefined && value > max) {
      return {
        isValid: false,
        errors: [`Value must be at most ${max}`]
      };
    }

    return { isValid: true, data: value };
  }

  /**
   * Validate date string
   * Industry Standard: Date validation
   */
  validateDateString(value: string): ValidationResult<string> {
    if (!isValidString(value)) {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        errors: ['Invalid date format']
      };
    }

    return { isValid: true, data: value };
  }

  /**
   * Create validation error
   * Industry Standard: Error creation
   */
  createValidationError(
    type: ValidationErrorType,
    message: string,
    field?: string,
    value?: unknown,
    expected?: string
  ): ValidationError {
    return {
      type,
      message,
      field,
      value,
      expected
    };
  }
}
