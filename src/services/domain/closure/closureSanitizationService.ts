// Closure Sanitization Service - Domain-Specific
import { CoreSanitizationService, SanitizationConfig, SanitizedData } from '../../core/sanitizationService';
import { CLOSURE_VALIDATION_CONFIG, CLOSURE_SANITIZATION_CONFIG, CLOSURE_MALICIOUS_PATTERNS } from '../../../constants/closureValidation';
import { 
  SanitizedClosureData, 
  SanitizedClosureUpdateData, 
  SanitizedClosureAnalyticsData, 
  SanitizedRescheduleData,
  SanitizedClosureDataObject 
} from '../../../types/closureValidation';
import { ClosureType } from '@prisma/client';

export class ClosureSanitizationService {
  private coreSanitization: CoreSanitizationService;

  constructor() {
    this.coreSanitization = new CoreSanitizationService();
  }

  /**
   * Sanitize closure data
   * Industry Standard: Closure data sanitization
   */
  sanitizeClosureData(data: {
    startDate: string;
    endDate?: string;
    reason: string;
    type: ClosureType;
    affectedServices?: string[];
    isRecurring?: boolean;
    recurringPattern?: Record<string, unknown>;
    notifyCustomers?: boolean;
    notificationMessage?: string;
    notificationChannels?: string[];
  }): SanitizedClosureData {
    return {
      startDate: this.sanitizeStartDate(data.startDate),
      endDate: data.endDate ? this.sanitizeEndDate(data.endDate) : undefined,
      reason: this.sanitizeReason(data.reason),
      type: data.type,
      affectedServices: data.affectedServices ? this.sanitizeAffectedServices(data.affectedServices) : undefined,
      isRecurring: data.isRecurring,
      recurringPattern: data.recurringPattern ? this.sanitizeRecurringPattern(data.recurringPattern) : undefined,
      notifyCustomers: data.notifyCustomers,
      notificationMessage: data.notificationMessage ? this.sanitizeNotificationMessage(data.notificationMessage) : undefined,
      notificationChannels: data.notificationChannels ? this.sanitizeNotificationChannels(data.notificationChannels) : undefined
    };
  }

  /**
   * Sanitize closure update data
   * Industry Standard: Closure update data sanitization
   */
  sanitizeClosureUpdateData(data: {
    startDate?: string;
    endDate?: string;
    reason?: string;
    type?: ClosureType;
    affectedServices?: string[];
    isRecurring?: boolean;
    recurringPattern?: Record<string, unknown>;
    notifyCustomers?: boolean;
    notificationMessage?: string;
    notificationChannels?: string[];
  }): SanitizedClosureUpdateData {
    return {
      startDate: data.startDate ? this.sanitizeStartDate(data.startDate) : undefined,
      endDate: data.endDate ? this.sanitizeEndDate(data.endDate) : undefined,
      reason: data.reason ? this.sanitizeReason(data.reason) : undefined,
      type: data.type,
      affectedServices: data.affectedServices ? this.sanitizeAffectedServices(data.affectedServices) : undefined,
      isRecurring: data.isRecurring,
      recurringPattern: data.recurringPattern ? this.sanitizeRecurringPattern(data.recurringPattern) : undefined,
      notifyCustomers: data.notifyCustomers,
      notificationMessage: data.notificationMessage ? this.sanitizeNotificationMessage(data.notificationMessage) : undefined,
      notificationChannels: data.notificationChannels ? this.sanitizeNotificationChannels(data.notificationChannels) : undefined
    };
  }

  /**
   * Sanitize closure analytics data
   * Industry Standard: Closure analytics data sanitization
   */
  sanitizeClosureAnalyticsData(data: {
    businessId: string;
    startDate?: string;
    endDate?: string;
    type?: ClosureType;
    includeRecurring?: boolean;
  }): SanitizedClosureAnalyticsData {
    return {
      businessId: this.sanitizeBusinessId(data.businessId),
      startDate: data.startDate ? this.sanitizeStartDate(data.startDate) : undefined,
      endDate: data.endDate ? this.sanitizeEndDate(data.endDate) : undefined,
      type: data.type,
      includeRecurring: data.includeRecurring
    };
  }

  /**
   * Sanitize reschedule data
   * Industry Standard: Reschedule data sanitization
   */
  sanitizeRescheduleData(data: {
    closureId: string;
    businessId: string;
    autoReschedule?: boolean;
    maxRescheduleDays?: number;
    preferredTimeSlots?: string;
    notifyCustomers?: boolean;
    allowWeekends?: boolean;
  }): SanitizedRescheduleData {
    return {
      closureId: this.sanitizeClosureId(data.closureId),
      businessId: this.sanitizeBusinessId(data.businessId),
      autoReschedule: data.autoReschedule,
      maxRescheduleDays: data.maxRescheduleDays ? this.sanitizeMaxRescheduleDays(data.maxRescheduleDays) : undefined,
      preferredTimeSlots: data.preferredTimeSlots ? this.sanitizePreferredTimeSlots(data.preferredTimeSlots) : undefined,
      notifyCustomers: data.notifyCustomers,
      allowWeekends: data.allowWeekends
    };
  }

  /**
   * Sanitize start date
   * Industry Standard: Date sanitization
   */
  sanitizeStartDate(startDate: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(startDate);
    
    // Ensure it matches the expected pattern
    if (!CLOSURE_SANITIZATION_CONFIG.closure.startDate.allowedCharacters.test(sanitized)) {
      return new Date().toISOString();
    }
    
    return sanitized;
  }

  /**
   * Sanitize end date
   * Industry Standard: Date sanitization
   */
  sanitizeEndDate(endDate: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(endDate);
    
    // Ensure it matches the expected pattern
    if (!CLOSURE_SANITIZATION_CONFIG.closure.endDate.allowedCharacters.test(sanitized)) {
      return new Date().toISOString();
    }
    
    return sanitized;
  }

  /**
   * Sanitize reason
   * Industry Standard: Text sanitization
   */
  sanitizeReason(reason: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(reason);
    
    // Truncate if too long
    if (sanitized.length > CLOSURE_SANITIZATION_CONFIG.closure.reason.maxLength) {
      return sanitized.substring(0, CLOSURE_SANITIZATION_CONFIG.closure.reason.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize affected services
   * Industry Standard: Array sanitization
   */
  sanitizeAffectedServices(services: string[]): string[] {
    const sanitized: string[] = [];
    
    for (const service of services) {
      const sanitizedService = this.coreSanitization.sanitizeUserInput(service);
      
      // Validate service ID format
      if (CLOSURE_SANITIZATION_CONFIG.closure.affectedServices.allowedCharacters.test(sanitizedService)) {
        sanitized.push(sanitizedService);
      }
      
      // Limit number of services
      if (sanitized.length >= CLOSURE_SANITIZATION_CONFIG.closure.affectedServices.maxLength) {
        break;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize recurring pattern
   * Industry Standard: Object sanitization
   */
  sanitizeRecurringPattern(pattern: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    let keyCount = 0;
    
    for (const [key, value] of Object.entries(pattern)) {
      // Validate key format
      if (!CLOSURE_SANITIZATION_CONFIG.closure.recurringPattern.allowedKeys.test(key)) {
        continue;
      }
      
      // Limit number of keys
      if (keyCount >= CLOSURE_SANITIZATION_CONFIG.closure.recurringPattern.maxKeys) {
        break;
      }
      
      if (typeof value === 'string') {
        sanitized[key] = this.coreSanitization.sanitizeUserInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeClosureDataObject(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Skip other types for security
      
      keyCount++;
    }
    
    return sanitized;
  }

  /**
   * Sanitize notification message
   * Industry Standard: Rich text sanitization
   */
  sanitizeNotificationMessage(message: string): string {
    const sanitized = this.coreSanitization.sanitizeRichText(message);
    
    // Truncate if too long
    if (sanitized.length > CLOSURE_SANITIZATION_CONFIG.closure.notificationMessage.maxLength) {
      return sanitized.substring(0, CLOSURE_SANITIZATION_CONFIG.closure.notificationMessage.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize notification channels
   * Industry Standard: Array sanitization
   */
  sanitizeNotificationChannels(channels: string[]): string[] {
    const sanitized: string[] = [];
    
    for (const channel of channels) {
      const sanitizedChannel = this.coreSanitization.sanitizeUserInput(channel).toUpperCase();
      
      // Validate channel value
      if (CLOSURE_SANITIZATION_CONFIG.closure.notificationChannels.allowedValues.includes(sanitizedChannel)) {
        sanitized.push(sanitizedChannel);
      }
      
      // Limit number of channels
      if (sanitized.length >= CLOSURE_SANITIZATION_CONFIG.closure.notificationChannels.maxLength) {
        break;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize business ID
   * Industry Standard: ID sanitization
   */
  sanitizeBusinessId(businessId: string): string {
    return this.coreSanitization.sanitizeUserInput(businessId);
  }

  /**
   * Sanitize closure ID
   * Industry Standard: ID sanitization
   */
  sanitizeClosureId(closureId: string): string {
    return this.coreSanitization.sanitizeUserInput(closureId);
  }

  /**
   * Sanitize max reschedule days
   * Industry Standard: Number sanitization
   */
  sanitizeMaxRescheduleDays(days: number): number {
    return Math.max(
      CLOSURE_SANITIZATION_CONFIG.reschedule.maxRescheduleDays.min,
      Math.min(CLOSURE_SANITIZATION_CONFIG.reschedule.maxRescheduleDays.max, Math.round(days))
    );
  }

  /**
   * Sanitize preferred time slots
   * Industry Standard: Enum sanitization
   */
  sanitizePreferredTimeSlots(slots: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(slots).toUpperCase();
    
    // Validate slot value
    if (CLOSURE_SANITIZATION_CONFIG.reschedule.preferredTimeSlots.allowedValues.includes(sanitized)) {
      return sanitized;
    }
    
    return 'ANY'; // Default value
  }

  /**
   * Sanitize closure data object
   * Industry Standard: Data object sanitization
   */
  sanitizeClosureDataObject(data: unknown): SanitizedClosureDataObject {
    return this.coreSanitization.sanitizeDataObject(data, {
      keyValidationRegex: /^[a-zA-Z0-9_-]+$/
    }) as SanitizedClosureDataObject;
  }

  /**
   * Check if content contains malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string): boolean {
    return this.coreSanitization.containsMaliciousContent(content, [...CLOSURE_MALICIOUS_PATTERNS]);
  }

  // Delegate methods to core sanitization service
  sanitizeHTML(html: string, allowedTags: string[] = [], allowedAttributes: string[] = []): string {
    return this.coreSanitization.sanitizeHTML(html, { allowedTags, allowedAttributes });
  }

  sanitizeUserInput(input: string): string {
    return this.coreSanitization.sanitizeUserInput(input);
  }

  sanitizeRichText(content: string): string {
    return this.coreSanitization.sanitizeRichText(content);
  }

  sanitizeFileName(fileName: string): string {
    return this.coreSanitization.sanitizeFileName(fileName);
  }

  sanitizeURL(url: string): string {
    return this.coreSanitization.sanitizeURL(url);
  }
}
