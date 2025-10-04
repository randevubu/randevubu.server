// Notification Validation Constants - Enterprise Configuration
import { ValidationConfig, SanitizationConfig } from '../types/notificationValidation';

// Validation limits and constraints
export const NOTIFICATION_VALIDATION_CONFIG: ValidationConfig = {
  maxTitleLength: 100,
  maxBodyLength: 500,
  maxRecipients: 10000,
  maxDataSizeBytes: 1024,
  maxDataProperties: 10,
  validChannels: ['PUSH', 'SMS', 'EMAIL'] as const,
  validNotificationTypes: ['CLOSURE', 'HOLIDAY', 'PROMOTION', 'REMINDER', 'BROADCAST'] as const,
  validBroadcastTypes: ['HOLIDAY', 'PROMOTION', 'BROADCAST'] as const
};

// Sanitization configuration
export const SANITIZATION_CONFIG: SanitizationConfig = {
  allowedTags: [],
  allowedAttributes: [],
  allowedBodyTags: ['b', 'i', 'u', 'br'],
  allowedBodyAttributes: []
};

// Security patterns for malicious content detection
export const MALICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /eval\s*\(/i,
  /document\.write/i,
  /innerHTML/i,
  /outerHTML/i,
  /insertAdjacentHTML/i
] as const;

// UUID validation regex
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Key validation regex for data objects
export const VALID_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_OBJECT: 'Request must be a valid object',
  INVALID_STRING: 'Value must be a string',
  INVALID_ARRAY: 'Value must be an array',
  INVALID_UUID: 'Value must be a valid UUID',
  EMPTY_TITLE: 'Title cannot be empty',
  EMPTY_BODY: 'Body cannot be empty',
  TITLE_TOO_LONG: `Title cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxTitleLength} characters`,
  BODY_TOO_LONG: `Body cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxBodyLength} characters`,
  NO_RECIPIENTS: 'At least one recipient is required',
  TOO_MANY_RECIPIENTS: `Maximum ${NOTIFICATION_VALIDATION_CONFIG.maxRecipients} recipients allowed`,
  NO_CHANNELS: 'At least one channel is required',
  INVALID_CHANNEL: 'Invalid channel',
  MALICIOUS_CONTENT: 'Content contains potentially malicious code',
  DATA_TOO_LARGE: 'Data object size exceeds limit',
  DATA_SERIALIZATION_ERROR: 'Data object cannot be serialized',
  INVALID_KEY: 'Invalid key name in data object'
} as const;
