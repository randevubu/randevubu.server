// Notification Validation Types - Enterprise Architecture
import { NotificationChannel } from './business';

// Core validation result interface
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

// Strict typing for notification data
export interface SanitizedNotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Proper typing for validation request parameters
export interface ValidationRequest {
  businessId: string;
  recipientIds: string[];
  title: string;
  body: string;
  notificationType: 'CLOSURE' | 'HOLIDAY' | 'PROMOTION' | 'REMINDER' | 'BROADCAST';
  channels: string[];
  data?: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

// Typed data object for sanitization
export interface DataObject {
  [key: string]: string | number | boolean | DataObject | DataObject[] | null | undefined;
}

// Union type for sanitized data
export type SanitizedData = DataObject | DataObject[] | null;

// Channel validation result
export interface ChannelValidationResult {
  validChannels: NotificationChannel[];
  invalidChannels: string[];
  errors: string[];
}

// Business ID validation result
export interface BusinessIdValidationResult {
  isValid: boolean;
  businessId?: string;
  errors?: string[];
}

// Recipient IDs validation result
export interface RecipientIdsValidationResult {
  isValid: boolean;
  validIds?: string[];
  invalidIds?: string[];
  errors?: string[];
}

// Content validation result
export interface ContentValidationResult {
  isValid: boolean;
  errors?: string[];
}

// Data object size validation result
export interface DataSizeValidationResult {
  isValid: boolean;
  sizeInBytes?: number;
  maxSizeInBytes?: number;
  errors?: string[];
}

// Malicious content check result
export interface MaliciousContentResult {
  isValid: boolean;
  detectedPatterns?: string[];
  errors?: string[];
}

// Validation configuration
export interface ValidationConfig {
  maxTitleLength: number;
  maxBodyLength: number;
  maxRecipients: number;
  maxDataSizeBytes: number;
  maxDataProperties: number;
  validChannels: readonly string[];
  validNotificationTypes: readonly string[];
  validBroadcastTypes: readonly string[];
}

// Sanitization configuration
export interface SanitizationConfig {
  allowedTags: string[];
  allowedAttributes: string[];
  allowedBodyTags: string[];
  allowedBodyAttributes: string[];
}

// Type guard function types
export type TypeGuard<T> = (value: unknown) => value is T;

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
