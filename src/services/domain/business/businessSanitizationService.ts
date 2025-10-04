// Business Sanitization Service - Domain-Specific
import { CoreSanitizationService, SanitizationConfig, SanitizedData } from '../../core/sanitizationService';
import { BUSINESS_VALIDATION_CONFIG, BUSINESS_SANITIZATION_CONFIG, BUSINESS_MALICIOUS_PATTERNS } from '../../../constants/businessValidation';
import { 
  SanitizedBusinessData, 
  SanitizedServiceData, 
  SanitizedStaffData, 
  SanitizedBusinessHoursData, 
  SanitizedBusinessSettingsData,
  SanitizedBusinessDataObject 
} from '../../../types/businessValidation';
import { BusinessStaffRole } from '@prisma/client';

export class BusinessSanitizationService {
  private coreSanitization: CoreSanitizationService;

  constructor() {
    this.coreSanitization = new CoreSanitizationService();
  }

  /**
   * Sanitize business data
   * Industry Standard: Business data sanitization
   */
  sanitizeBusinessData(data: {
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    currency?: string;
  }): SanitizedBusinessData {
    return {
      name: this.sanitizeBusinessName(data.name),
      description: data.description ? this.sanitizeBusinessDescription(data.description) : undefined,
      phone: data.phone ? this.sanitizeBusinessPhone(data.phone) : undefined,
      email: data.email ? this.sanitizeBusinessEmail(data.email) : undefined,
      address: data.address ? this.sanitizeBusinessAddress(data.address) : undefined,
      timezone: data.timezone ? this.sanitizeBusinessTimezone(data.timezone) : undefined,
      currency: data.currency ? this.sanitizeBusinessCurrency(data.currency) : undefined
    };
  }

  /**
   * Sanitize service data
   * Industry Standard: Service data sanitization
   */
  sanitizeServiceData(data: {
    name: string;
    description?: string;
    duration: number;
    price: number;
    currency?: string;
    showPrice?: boolean;
    bufferTime?: number;
    maxAdvanceBooking?: number;
    minAdvanceBooking?: number;
  }): SanitizedServiceData {
    return {
      name: this.sanitizeServiceName(data.name),
      description: data.description ? this.sanitizeServiceDescription(data.description) : undefined,
      duration: this.sanitizeServiceDuration(data.duration),
      price: this.sanitizeServicePrice(data.price),
      currency: data.currency ? this.sanitizeServiceCurrency(data.currency) : undefined,
      showPrice: data.showPrice,
      bufferTime: data.bufferTime ? this.sanitizeServiceBufferTime(data.bufferTime) : undefined,
      maxAdvanceBooking: data.maxAdvanceBooking ? this.sanitizeServiceMaxAdvanceBooking(data.maxAdvanceBooking) : undefined,
      minAdvanceBooking: data.minAdvanceBooking ? this.sanitizeServiceMinAdvanceBooking(data.minAdvanceBooking) : undefined
    };
  }

  /**
   * Sanitize staff data
   * Industry Standard: Staff data sanitization
   */
  sanitizeStaffData(data: {
    userId: string;
    role: BusinessStaffRole;
    permissions?: Record<string, unknown>;
  }): SanitizedStaffData {
    return {
      userId: this.sanitizeStaffUserId(data.userId),
      role: data.role,
      permissions: data.permissions ? this.sanitizeStaffPermissions(data.permissions) : undefined
    };
  }

  /**
   * Sanitize business hours data
   * Industry Standard: Business hours sanitization
   */
  sanitizeBusinessHoursData(data: {
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breakStartTime?: string;
    breakEndTime?: string;
  }): SanitizedBusinessHoursData {
    return {
      dayOfWeek: this.sanitizeBusinessHoursDayOfWeek(data.dayOfWeek),
      isOpen: data.isOpen,
      openTime: data.openTime ? this.sanitizeBusinessHoursTime(data.openTime) : undefined,
      closeTime: data.closeTime ? this.sanitizeBusinessHoursTime(data.closeTime) : undefined,
      breakStartTime: data.breakStartTime ? this.sanitizeBusinessHoursTime(data.breakStartTime) : undefined,
      breakEndTime: data.breakEndTime ? this.sanitizeBusinessHoursTime(data.breakEndTime) : undefined
    };
  }

  /**
   * Sanitize business settings data
   * Industry Standard: Business settings sanitization
   */
  sanitizeBusinessSettingsData(data: {
    notificationSettings?: Record<string, unknown>;
    privacySettings?: Record<string, unknown>;
    priceSettings?: Record<string, unknown>;
    staffPrivacySettings?: Record<string, unknown>;
  }): SanitizedBusinessSettingsData {
    return {
      notificationSettings: data.notificationSettings ? this.sanitizeBusinessSettings(data.notificationSettings) : undefined,
      privacySettings: data.privacySettings ? this.sanitizeBusinessSettings(data.privacySettings) : undefined,
      priceSettings: data.priceSettings ? this.sanitizeBusinessSettings(data.priceSettings) : undefined,
      staffPrivacySettings: data.staffPrivacySettings ? this.sanitizeBusinessSettings(data.staffPrivacySettings) : undefined
    };
  }

  /**
   * Sanitize business name
   * Industry Standard: Business name sanitization
   */
  sanitizeBusinessName(name: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(name);
    
    // Truncate if too long
    if (sanitized.length > BUSINESS_SANITIZATION_CONFIG.business.name.maxLength) {
      return sanitized.substring(0, BUSINESS_SANITIZATION_CONFIG.business.name.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize business description
   * Industry Standard: Business description sanitization
   */
  sanitizeBusinessDescription(description: string): string {
    const sanitized = this.coreSanitization.sanitizeRichText(description);
    
    // Truncate if too long
    if (sanitized.length > BUSINESS_SANITIZATION_CONFIG.business.description.maxLength) {
      return sanitized.substring(0, BUSINESS_SANITIZATION_CONFIG.business.description.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize business phone
   * Industry Standard: Phone sanitization
   */
  sanitizeBusinessPhone(phone: string): string {
    // Remove all non-digit characters except +
    let sanitized = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + if it doesn't already
    if (!sanitized.startsWith('+')) {
      sanitized = '+' + sanitized;
    }
    
    return this.coreSanitization.sanitizeUserInput(sanitized);
  }

  /**
   * Sanitize business email
   * Industry Standard: Email sanitization
   */
  sanitizeBusinessEmail(email: string): string {
    return this.coreSanitization.sanitizeUserInput(email.toLowerCase());
  }

  /**
   * Sanitize business address
   * Industry Standard: Address sanitization
   */
  sanitizeBusinessAddress(address: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(address);
    
    // Truncate if too long
    if (sanitized.length > BUSINESS_SANITIZATION_CONFIG.business.address.maxLength) {
      return sanitized.substring(0, BUSINESS_SANITIZATION_CONFIG.business.address.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize business timezone
   * Industry Standard: Timezone sanitization
   */
  sanitizeBusinessTimezone(timezone: string): string {
    return this.coreSanitization.sanitizeUserInput(timezone);
  }

  /**
   * Sanitize business currency
   * Industry Standard: Currency sanitization
   */
  sanitizeBusinessCurrency(currency: string): string {
    return this.coreSanitization.sanitizeUserInput(currency.toUpperCase());
  }

  /**
   * Sanitize service name
   * Industry Standard: Service name sanitization
   */
  sanitizeServiceName(name: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(name);
    
    // Truncate if too long
    if (sanitized.length > BUSINESS_SANITIZATION_CONFIG.service.name.maxLength) {
      return sanitized.substring(0, BUSINESS_SANITIZATION_CONFIG.service.name.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize service description
   * Industry Standard: Service description sanitization
   */
  sanitizeServiceDescription(description: string): string {
    const sanitized = this.coreSanitization.sanitizeRichText(description);
    
    // Truncate if too long
    if (sanitized.length > BUSINESS_SANITIZATION_CONFIG.service.description.maxLength) {
      return sanitized.substring(0, BUSINESS_SANITIZATION_CONFIG.service.description.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize service duration
   * Industry Standard: Duration sanitization
   */
  sanitizeServiceDuration(duration: number): number {
    return Math.max(
      BUSINESS_SANITIZATION_CONFIG.service.duration.min,
      Math.min(BUSINESS_SANITIZATION_CONFIG.service.duration.max, Math.round(duration))
    );
  }

  /**
   * Sanitize service price
   * Industry Standard: Price sanitization
   */
  sanitizeServicePrice(price: number): number {
    return Math.max(
      BUSINESS_SANITIZATION_CONFIG.service.price.min,
      Math.min(BUSINESS_SANITIZATION_CONFIG.service.price.max, Math.round(price * 100) / 100)
    );
  }

  /**
   * Sanitize service currency
   * Industry Standard: Currency sanitization
   */
  sanitizeServiceCurrency(currency: string): string {
    return this.coreSanitization.sanitizeUserInput(currency.toUpperCase());
  }

  /**
   * Sanitize service buffer time
   * Industry Standard: Buffer time sanitization
   */
  sanitizeServiceBufferTime(bufferTime: number): number {
    return Math.max(
      BUSINESS_SANITIZATION_CONFIG.service.bufferTime.min,
      Math.min(BUSINESS_SANITIZATION_CONFIG.service.bufferTime.max, Math.round(bufferTime))
    );
  }

  /**
   * Sanitize service max advance booking
   * Industry Standard: Max advance booking sanitization
   */
  sanitizeServiceMaxAdvanceBooking(maxAdvanceBooking: number): number {
    return Math.max(
      BUSINESS_SANITIZATION_CONFIG.service.maxAdvanceBooking.min,
      Math.min(BUSINESS_SANITIZATION_CONFIG.service.maxAdvanceBooking.max, Math.round(maxAdvanceBooking))
    );
  }

  /**
   * Sanitize service min advance booking
   * Industry Standard: Min advance booking sanitization
   */
  sanitizeServiceMinAdvanceBooking(minAdvanceBooking: number): number {
    return Math.max(
      BUSINESS_SANITIZATION_CONFIG.service.minAdvanceBooking.min,
      Math.min(BUSINESS_SANITIZATION_CONFIG.service.minAdvanceBooking.max, Math.round(minAdvanceBooking))
    );
  }

  /**
   * Sanitize staff user ID
   * Industry Standard: User ID sanitization
   */
  sanitizeStaffUserId(userId: string): string {
    return this.coreSanitization.sanitizeUserInput(userId);
  }

  /**
   * Sanitize staff permissions
   * Industry Standard: Permissions sanitization
   */
  sanitizeStaffPermissions(permissions: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(permissions)) {
      // Validate key name
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        continue; // Skip invalid keys
      }
      
      if (typeof value === 'string') {
        sanitized[key] = this.coreSanitization.sanitizeUserInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBusinessDataObject(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Skip other types for security
    }
    
    return sanitized;
  }

  /**
   * Sanitize business hours day of week
   * Industry Standard: Day of week sanitization
   */
  sanitizeBusinessHoursDayOfWeek(dayOfWeek: number): number {
    return Math.max(
      BUSINESS_SANITIZATION_CONFIG.businessHours.dayOfWeek.min,
      Math.min(BUSINESS_SANITIZATION_CONFIG.businessHours.dayOfWeek.max, Math.round(dayOfWeek))
    );
  }

  /**
   * Sanitize business hours time
   * Industry Standard: Time sanitization
   */
  sanitizeBusinessHoursTime(time: string): string {
    return this.coreSanitization.sanitizeUserInput(time);
  }

  /**
   * Sanitize business settings
   * Industry Standard: Settings sanitization
   */
  sanitizeBusinessSettings(settings: Record<string, unknown>): Record<string, unknown> {
    return this.sanitizeBusinessDataObject(settings);
  }

  /**
   * Sanitize business data object
   * Industry Standard: Data object sanitization
   */
  sanitizeBusinessDataObject(data: unknown): SanitizedBusinessDataObject {
    return this.coreSanitization.sanitizeDataObject(data, {
      keyValidationRegex: /^[a-zA-Z0-9_-]+$/
    }) as SanitizedBusinessDataObject;
  }

  /**
   * Check if content contains malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string): boolean {
    return this.coreSanitization.containsMaliciousContent(content, [...BUSINESS_MALICIOUS_PATTERNS]);
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
