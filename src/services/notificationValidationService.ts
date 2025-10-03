import Joi from 'joi';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { SecureNotificationRequest, BroadcastNotificationRequest } from './secureNotificationService';
import { NotificationChannel } from '../types/business';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export interface SanitizedNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationValidationService {
  private dom = new JSDOM('');
  private purify = DOMPurify(this.dom.window);

  // Validation schemas
  private readonly secureNotificationSchema = Joi.object({
    businessId: Joi.string().uuid().required().messages({
      'string.guid': 'Business ID must be a valid UUID',
      'any.required': 'Business ID is required'
    }),
    recipientIds: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(10000)
      .required()
      .messages({
        'array.min': 'At least one recipient is required',
        'array.max': 'Maximum 10,000 recipients allowed',
        'any.required': 'Recipients are required'
      }),
    title: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Title cannot be empty',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    body: Joi.string()
      .min(1)
      .max(500)
      .required()
      .messages({
        'string.min': 'Body cannot be empty',
        'string.max': 'Body cannot exceed 500 characters',
        'any.required': 'Body is required'
      }),
    notificationType: Joi.string()
      .valid('CLOSURE', 'HOLIDAY', 'PROMOTION', 'REMINDER', 'BROADCAST')
      .required()
      .messages({
        'any.only': 'Invalid notification type',
        'any.required': 'Notification type is required'
      }),
    channels: Joi.array()
      .items(Joi.string().valid('PUSH', 'SMS', 'EMAIL'))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one channel is required',
        'any.required': 'Channels are required'
      }),
    data: Joi.object()
      .max(10)
      .unknown(false)
      .optional()
      .messages({
        'object.max': 'Data object cannot have more than 10 properties'
      }),
    metadata: Joi.object({
      ipAddress: Joi.string().ip().optional(),
      userAgent: Joi.string().max(500).optional()
    }).optional()
  });

  private readonly broadcastNotificationSchema = Joi.object({
    businessId: Joi.string().uuid().required(),
    title: Joi.string().min(1).max(100).required(),
    body: Joi.string().min(1).max(500).required(),
    notificationType: Joi.string()
      .valid('HOLIDAY', 'PROMOTION', 'BROADCAST')
      .required(),
    channels: Joi.array()
      .items(Joi.string().valid('PUSH', 'SMS', 'EMAIL'))
      .min(1)
      .required(),
    data: Joi.object().max(10).unknown(false).optional(),
    filters: Joi.object({
      relationshipType: Joi.string()
        .valid('ACTIVE_CUSTOMER', 'PAST_CUSTOMER', 'ALL')
        .optional(),
      minAppointments: Joi.number().integer().min(0).max(1000).optional(),
      lastAppointmentAfter: Joi.date().iso().optional()
    }).optional(),
    metadata: Joi.object({
      ipAddress: Joi.string().ip().optional(),
      userAgent: Joi.string().max(500).optional()
    }).optional()
  });

  /**
   * Validate secure notification request
   * Industry Standard: Comprehensive input validation
   */
  validateSecureNotificationRequest(
    request: any
  ): ValidationResult<SecureNotificationRequest> {
    try {
      // Validate against schema
      const { error, value } = this.secureNotificationSchema.validate(request, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        return {
          isValid: false,
          errors: error.details.map(detail => detail.message)
        };
      }

      // Sanitize content
      const sanitizedData = this.sanitizeNotificationData({
        title: value.title,
        body: value.body,
        data: value.data
      });

      return {
        isValid: true,
        data: {
          ...value,
          ...sanitizedData
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Validate broadcast notification request
   * Industry Standard: Comprehensive input validation
   */
  validateBroadcastNotificationRequest(
    request: any
  ): ValidationResult<BroadcastNotificationRequest> {
    try {
      // Validate against schema
      const { error, value } = this.broadcastNotificationSchema.validate(request, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        return {
          isValid: false,
          errors: error.details.map(detail => detail.message)
        };
      }

      // Sanitize content
      const sanitizedData = this.sanitizeNotificationData({
        title: value.title,
        body: value.body,
        data: value.data
      });

      return {
        isValid: true,
        data: {
          ...value,
          ...sanitizedData
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Sanitize notification data to prevent XSS and injection attacks
   * Industry Standard: Content sanitization
   */
  private sanitizeNotificationData(data: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }): SanitizedNotificationData {
    return {
      title: this.purify.sanitize(data.title, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      }),
      body: this.purify.sanitize(data.body, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'br'],
        ALLOWED_ATTR: []
      }),
      data: data.data ? this.sanitizeDataObject(data.data) : undefined
    };
  }

  /**
   * Recursively sanitize data object
   * Industry Standard: Deep sanitization
   */
  private sanitizeDataObject(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDataObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Validate key name
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
        continue; // Skip invalid keys
      }

      if (typeof value === 'string') {
        sanitized[key] = this.purify.sanitize(value, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDataObject(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Skip other types for security
    }

    return sanitized;
  }

  /**
   * Validate notification channels
   * Industry Standard: Channel validation
   */
  validateChannels(channels: any[]): ValidationResult<NotificationChannel[]> {
    if (!Array.isArray(channels)) {
      return {
        isValid: false,
        errors: ['Channels must be an array']
      };
    }

    if (channels.length === 0) {
      return {
        isValid: false,
        errors: ['At least one channel is required']
      };
    }

    const validChannels: NotificationChannel[] = [];
    const errors: string[] = [];

    for (const channel of channels) {
      if (typeof channel !== 'string') {
        errors.push('Channel must be a string');
        continue;
      }

      if (!['PUSH', 'SMS', 'EMAIL'].includes(channel)) {
        errors.push(`Invalid channel: ${channel}`);
        continue;
      }

      validChannels.push(channel as NotificationChannel);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    return {
      isValid: true,
      data: validChannels
    };
  }

  /**
   * Validate business ID format
   * Industry Standard: ID validation
   */
  validateBusinessId(businessId: any): ValidationResult<string> {
    if (typeof businessId !== 'string') {
      return {
        isValid: false,
        errors: ['Business ID must be a string']
      };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      return {
        isValid: false,
        errors: ['Business ID must be a valid UUID']
      };
    }

    return {
      isValid: true,
      data: businessId
    };
  }

  /**
   * Validate recipient IDs
   * Industry Standard: Recipient validation
   */
  validateRecipientIds(recipientIds: any): ValidationResult<string[]> {
    if (!Array.isArray(recipientIds)) {
      return {
        isValid: false,
        errors: ['Recipients must be an array']
      };
    }

    if (recipientIds.length === 0) {
      return {
        isValid: false,
        errors: ['At least one recipient is required']
      };
    }

    if (recipientIds.length > 10000) {
      return {
        isValid: false,
        errors: ['Maximum 10,000 recipients allowed']
      };
    }

    const validIds: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < recipientIds.length; i++) {
      const id = recipientIds[i];
      
      if (typeof id !== 'string') {
        errors.push(`Recipient ${i + 1} must be a string`);
        continue;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        errors.push(`Recipient ${i + 1} must be a valid UUID`);
        continue;
      }

      validIds.push(id);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    return {
      isValid: true,
      data: validIds
    };
  }

  /**
   * Validate notification content length
   * Industry Standard: Content validation
   */
  validateContentLength(title: string, body: string): ValidationResult<boolean> {
    const errors: string[] = [];

    if (title.length === 0) {
      errors.push('Title cannot be empty');
    } else if (title.length > 100) {
      errors.push('Title cannot exceed 100 characters');
    }

    if (body.length === 0) {
      errors.push('Body cannot be empty');
    } else if (body.length > 500) {
      errors.push('Body cannot exceed 500 characters');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    return {
      isValid: true,
      data: true
    };
  }

  /**
   * Check for malicious content patterns
   * Industry Standard: Security validation
   */
  checkForMaliciousContent(content: string): ValidationResult<boolean> {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /expression\s*\(/i,
      /url\s*\(/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        return {
          isValid: false,
          errors: ['Content contains potentially malicious code']
        };
      }
    }

    return {
      isValid: true,
      data: true
    };
  }

  /**
   * Validate notification data object size
   * Industry Standard: Resource validation
   */
  validateDataObjectSize(data: any): ValidationResult<boolean> {
    if (!data) {
      return { isValid: true, data: true };
    }

    try {
      const jsonString = JSON.stringify(data);
      const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
      const maxSizeInBytes = 1024; // 1KB limit

      if (sizeInBytes > maxSizeInBytes) {
        return {
          isValid: false,
          errors: [`Data object size (${sizeInBytes} bytes) exceeds limit (${maxSizeInBytes} bytes)`]
        };
      }

      return { isValid: true, data: true };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Data object cannot be serialized']
      };
    }
  }
}

