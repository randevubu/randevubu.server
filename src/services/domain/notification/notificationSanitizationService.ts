// Notification Sanitization Service - Domain-Specific
import { CoreSanitizationService, SanitizationConfig, SanitizedData } from '../../core/sanitizationService';
import { NOTIFICATION_VALIDATION_CONFIG, SANITIZATION_CONFIG, MALICIOUS_PATTERNS } from '../../../constants/notificationValidation';
import { SanitizedNotificationData } from '../../../types/notificationValidation';

export class NotificationSanitizationService {
  private coreSanitization: CoreSanitizationService;

  constructor() {
    this.coreSanitization = new CoreSanitizationService();
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
    return {
      title: this.sanitizeTitle(data.title),
      body: this.sanitizeBody(data.body),
      data: data.data ? this.sanitizeNotificationDataObject(data.data) : undefined
    };
  }

  /**
   * Sanitize notification title
   * Industry Standard: Title sanitization
   */
  private sanitizeTitle(title: string): string {
    return this.coreSanitization.sanitizeHTML(title, {
      allowedTags: SANITIZATION_CONFIG.allowedTags,
      allowedAttributes: SANITIZATION_CONFIG.allowedAttributes
    });
  }

  /**
   * Sanitize notification body
   * Industry Standard: Body sanitization
   */
  private sanitizeBody(body: string): string {
    return this.coreSanitization.sanitizeHTML(body, {
      allowedTags: SANITIZATION_CONFIG.allowedBodyTags,
      allowedAttributes: SANITIZATION_CONFIG.allowedBodyAttributes
    });
  }

  /**
   * Sanitize notification data object
   * Industry Standard: Data object sanitization
   */
  private sanitizeNotificationDataObject(data: Record<string, unknown>): Record<string, unknown> {
    return this.coreSanitization.sanitizeDataObject(data, {
      keyValidationRegex: /^[a-zA-Z0-9_-]+$/,
      allowedTags: SANITIZATION_CONFIG.allowedTags,
      allowedAttributes: SANITIZATION_CONFIG.allowedAttributes
    }) as Record<string, unknown>;
  }

  /**
   * Check if content contains malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string): boolean {
    return this.coreSanitization.containsMaliciousContent(content, [...MALICIOUS_PATTERNS]);
  }

  /**
   * Sanitize HTML content with custom configuration
   * Industry Standard: HTML sanitization
   */
  sanitizeHTML(html: string, allowedTags: string[] = [], allowedAttributes: string[] = []): string {
    return this.coreSanitization.sanitizeHTML(html, {
      allowedTags,
      allowedAttributes
    });
  }

  /**
   * Sanitize user input for display
   * Industry Standard: Input sanitization
   */
  sanitizeUserInput(input: string): string {
    return this.coreSanitization.sanitizeUserInput(input);
  }

  /**
   * Sanitize rich text content
   * Industry Standard: Rich text sanitization
   */
  sanitizeRichText(content: string): string {
    return this.coreSanitization.sanitizeRichText(content);
  }

  /**
   * Sanitize file name for safe storage
   * Industry Standard: File name sanitization
   */
  sanitizeFileName(fileName: string): string {
    return this.coreSanitization.sanitizeFileName(fileName);
  }

  /**
   * Sanitize URL for safe usage
   * Industry Standard: URL sanitization
   */
  sanitizeURL(url: string): string {
    return this.coreSanitization.sanitizeURL(url);
  }
}
