// Notification Validation Service - Legacy Wrapper for Controllers
import { SecureNotificationRequest, BroadcastNotificationRequest } from './secureNotificationService';
import { NotificationChannel } from '../types/business';
import { 
  ValidationResult, 
  SanitizedNotificationData,
  ValidationRequest 
} from '../types/notificationValidation';
import { 
  secureNotificationSchema, 
  broadcastNotificationSchema,
  validationOptions 
} from '../schemas/notificationValidation';
import { NotificationValidationService as DomainNotificationValidationService } from './domain/notification/notificationValidationService';
import { isValidObject } from '../utils/typeGuards';

export class NotificationValidationService {
  private domainValidationService: DomainNotificationValidationService;

  constructor() {
    this.domainValidationService = new DomainNotificationValidationService();
  }

  /**
   * Validate secure notification request
   * Industry Standard: Comprehensive input validation with strict typing
   */
  validateSecureNotificationRequest(
    request: unknown
  ): ValidationResult<SecureNotificationRequest> {
    try {
      // Type guard to ensure request is an object
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      // Validate against schema
      const { error, value } = secureNotificationSchema.validate(request, validationOptions);

      if (error) {
        return {
          isValid: false,
          errors: error.details.map(detail => detail.message)
        };
      }

      // Sanitize content
      const sanitizedData = this.domainValidationService.sanitizeNotificationData({
        title: value.title,
        body: value.body,
        data: value.data
      });

      return {
        isValid: true,
        data: {
          ...value,
          ...sanitizedData
        } as SecureNotificationRequest
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
   * Industry Standard: Comprehensive input validation with strict typing
   */
  validateBroadcastNotificationRequest(
    request: unknown
  ): ValidationResult<BroadcastNotificationRequest> {
    try {
      // Type guard to ensure request is an object
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      // Validate against schema
      const { error, value } = broadcastNotificationSchema.validate(request, validationOptions);

      if (error) {
        return {
          isValid: false,
          errors: error.details.map(detail => detail.message)
        };
      }

      // Sanitize content
      const sanitizedData = this.domainValidationService.sanitizeNotificationData({
        title: value.title,
        body: value.body,
        data: value.data
      });

      return {
        isValid: true,
        data: {
          ...value,
          ...sanitizedData
        } as BroadcastNotificationRequest
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Validate notification channels
   * Industry Standard: Channel validation with strict typing
   */
  validateChannels(channels: unknown): ValidationResult<NotificationChannel[]> {
    return this.domainValidationService.validateChannels(channels);
  }

  /**
   * Validate business ID format
   * Industry Standard: ID validation with strict typing
   */
  validateBusinessId(businessId: unknown): ValidationResult<string> {
    return this.domainValidationService.validateBusinessId(businessId);
  }

  /**
   * Validate recipient IDs
   * Industry Standard: Recipient validation with strict typing
   */
  validateRecipientIds(recipientIds: unknown): ValidationResult<string[]> {
    return this.domainValidationService.validateRecipientIds(recipientIds);
  }

  /**
   * Validate notification content length
   * Industry Standard: Content validation
   */
  validateContentLength(title: string, body: string): ValidationResult<boolean> {
    return this.domainValidationService.validateContentLength(title, body);
  }

  /**
   * Check for malicious content patterns
   * Industry Standard: Security validation with enhanced pattern detection
   */
  checkForMaliciousContent(content: string): ValidationResult<boolean> {
    return this.domainValidationService.checkForMaliciousContent(content);
  }

  /**
   * Validate notification data object size
   * Industry Standard: Resource validation with strict typing
   */
  validateDataObjectSize(data: unknown): ValidationResult<boolean> {
    return this.domainValidationService.validateDataObjectSize(data);
  }

  /**
   * Sanitize notification data to prevent XSS and injection attacks
   * Industry Standard: Content sanitization with strict typing
   */
  sanitizeNotificationData(data: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): SanitizedNotificationData {
    return this.domainValidationService.sanitizeNotificationData(data);
  }

  /**
   * Sanitize HTML content with custom configuration
   * Industry Standard: HTML sanitization
   */
  sanitizeHTML(html: string, allowedTags: string[] = [], allowedAttributes: string[] = []): string {
    return this.domainValidationService.sanitizeHTML(html, allowedTags, allowedAttributes);
  }

  /**
   * Sanitize user input for display
   * Industry Standard: Input sanitization
   */
  sanitizeUserInput(input: string): string {
    return this.domainValidationService.sanitizeUserInput(input);
  }

  /**
   * Sanitize rich text content
   * Industry Standard: Rich text sanitization
   */
  sanitizeRichText(content: string): string {
    return this.domainValidationService.sanitizeRichText(content);
  }

  /**
   * Check if content contains potentially malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string): boolean {
    return this.domainValidationService.checkForMaliciousContent(content).data || false;
  }

  /**
   * Sanitize file name for safe storage
   * Industry Standard: File name sanitization
   */
  sanitizeFileName(fileName: string): string {
    return this.domainValidationService.sanitizeFileName(fileName);
  }

  /**
   * Sanitize URL for safe usage
   * Industry Standard: URL sanitization
   */
  sanitizeURL(url: string): string {
    return this.domainValidationService.sanitizeURL(url);
  }
}
