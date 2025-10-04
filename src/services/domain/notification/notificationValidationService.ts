// Notification Validation Service - Domain-Specific
import { CoreValidationService, ValidationResult } from '../../core/validationService';
import { NotificationChannel } from '../../../types/business';
import { NOTIFICATION_VALIDATION_CONFIG, MALICIOUS_PATTERNS } from '../../../constants/notificationValidation';
import { NotificationSanitizationService } from './notificationSanitizationService';

export class NotificationValidationService {
  private coreValidation: CoreValidationService;
  private sanitizationService: NotificationSanitizationService;

  constructor() {
    this.coreValidation = new CoreValidationService();
    this.sanitizationService = new NotificationSanitizationService();
  }

  /**
   * Validate notification channels
   * Industry Standard: Channel validation with strict typing
   */
  validateChannels(channels: unknown): ValidationResult<NotificationChannel[]> {
    const arrayResult = this.coreValidation.validateArray(channels, {
      minLength: 1,
      maxLength: NOTIFICATION_VALIDATION_CONFIG.maxRecipients,
      required: true
    });

    if (!arrayResult.isValid) {
      return arrayResult as ValidationResult<NotificationChannel[]>;
    }

    const validChannels: NotificationChannel[] = [];
    const errors: string[] = [];

    for (const channel of channels as unknown[]) {
      const enumResult = this.coreValidation.validateEnum(
        channel,
        NOTIFICATION_VALIDATION_CONFIG.validChannels
      );

      if (enumResult.isValid && enumResult.data) {
        validChannels.push(enumResult.data as NotificationChannel);
      } else {
        errors.push(`Invalid channel: ${channel}`);
      }
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
   * Industry Standard: ID validation with strict typing
   */
  validateBusinessId(businessId: unknown): ValidationResult<string> {
    if (typeof businessId !== 'string') {
      return {
        isValid: false,
        errors: ['Business ID must be a string']
      };
    }

    return this.coreValidation.validateUUID(businessId);
  }

  /**
   * Validate recipient IDs
   * Industry Standard: Recipient validation with strict typing
   */
  validateRecipientIds(recipientIds: unknown): ValidationResult<string[]> {
    const arrayResult = this.coreValidation.validateArray(recipientIds, {
      minLength: 1,
      maxLength: NOTIFICATION_VALIDATION_CONFIG.maxRecipients,
      required: true,
      itemValidator: (item: unknown) => this.coreValidation.validateUUID(item as string)
    });

    return arrayResult as ValidationResult<string[]>;
  }

  /**
   * Validate notification content length
   * Industry Standard: Content validation
   */
  validateContentLength(title: string, body: string): ValidationResult<boolean> {
    const titleResult = this.coreValidation.validateString(title, {
      minLength: 1,
      maxLength: NOTIFICATION_VALIDATION_CONFIG.maxTitleLength,
      required: true
    });

    const bodyResult = this.coreValidation.validateString(body, {
      minLength: 1,
      maxLength: NOTIFICATION_VALIDATION_CONFIG.maxBodyLength,
      required: true
    });

    const errors: string[] = [];
    if (!titleResult.isValid) {
      errors.push(...(titleResult.errors || []));
    }
    if (!bodyResult.isValid) {
      errors.push(...(bodyResult.errors || []));
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
   * Industry Standard: Security validation with enhanced pattern detection
   */
  checkForMaliciousContent(content: string): ValidationResult<boolean> {
    const containsMalicious = this.sanitizationService.containsMaliciousContent(content);

    if (containsMalicious) {
      return {
        isValid: false,
        errors: ['Content contains potentially malicious code'],
        data: false
      };
    }

    return {
      isValid: true,
      data: true
    };
  }

  /**
   * Validate notification data object size
   * Industry Standard: Resource validation with strict typing
   */
  validateDataObjectSize(data: unknown): ValidationResult<boolean> {
    return this.coreValidation.validateDataSize(data, NOTIFICATION_VALIDATION_CONFIG.maxDataSizeBytes);
  }

  /**
   * Validate notification type
   * Industry Standard: Enum validation
   */
  validateNotificationType(type: unknown): ValidationResult<string> {
    return this.coreValidation.validateEnum(type, NOTIFICATION_VALIDATION_CONFIG.validNotificationTypes);
  }

  /**
   * Validate broadcast notification type
   * Industry Standard: Enum validation
   */
  validateBroadcastType(type: unknown): ValidationResult<string> {
    return this.coreValidation.validateEnum(type, NOTIFICATION_VALIDATION_CONFIG.validBroadcastTypes);
  }

  /**
   * Validate email format
   * Industry Standard: Email validation
   */
  validateEmail(email: string): ValidationResult<string> {
    return this.coreValidation.validateEmail(email);
  }

  /**
   * Validate IP address format
   * Industry Standard: IP validation
   */
  validateIPAddress(ip: string): ValidationResult<string> {
    return this.coreValidation.validateIPAddress(ip);
  }

  /**
   * Validate date string format
   * Industry Standard: Date validation
   */
  validateDateString(dateString: string): ValidationResult<string> {
    return this.coreValidation.validateDateString(dateString);
  }

  /**
   * Sanitize notification data
   * Industry Standard: Content sanitization
   */
  sanitizeNotificationData(data: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return this.sanitizationService.sanitizeNotificationData(data);
  }

  /**
   * Sanitize HTML content
   * Industry Standard: HTML sanitization
   */
  sanitizeHTML(html: string, allowedTags: string[] = [], allowedAttributes: string[] = []): string {
    return this.sanitizationService.sanitizeHTML(html, allowedTags, allowedAttributes);
  }

  /**
   * Sanitize user input
   * Industry Standard: Input sanitization
   */
  sanitizeUserInput(input: string): string {
    return this.sanitizationService.sanitizeUserInput(input);
  }

  /**
   * Sanitize rich text content
   * Industry Standard: Rich text sanitization
   */
  sanitizeRichText(content: string): string {
    return this.sanitizationService.sanitizeRichText(content);
  }

  /**
   * Sanitize file name
   * Industry Standard: File name sanitization
   */
  sanitizeFileName(fileName: string): string {
    return this.sanitizationService.sanitizeFileName(fileName);
  }

  /**
   * Sanitize URL
   * Industry Standard: URL sanitization
   */
  sanitizeURL(url: string): string {
    return this.sanitizationService.sanitizeURL(url);
  }
}
