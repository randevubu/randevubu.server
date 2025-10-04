// Auth Sanitization Service - Domain-Specific
import { CoreSanitizationService, SanitizationConfig, SanitizedData } from '../../core/sanitizationService';
import { AUTH_VALIDATION_CONFIG, AUTH_SANITIZATION_CONFIG, AUTH_MALICIOUS_PATTERNS } from '../../../constants/authValidation';
import { 
  SanitizedPhoneValidationData, 
  SanitizedLoginData, 
  SanitizedProfileUpdateData, 
  SanitizedPhoneChangeData, 
  SanitizedDeviceInfo, 
  SanitizedTokenData,
  SanitizedAuthDataObject 
} from '../../../types/authValidation';
import { VerificationPurpose } from '@prisma/client';

export class AuthSanitizationService {
  private coreSanitization: CoreSanitizationService;

  constructor() {
    this.coreSanitization = new CoreSanitizationService();
  }

  /**
   * Sanitize phone validation data
   * Industry Standard: Phone number sanitization with E.164 format
   */
  sanitizePhoneValidationData(data: {
    phoneNumber: string;
    purpose: VerificationPurpose;
  }): SanitizedPhoneValidationData {
    return {
      phoneNumber: this.sanitizePhoneNumber(data.phoneNumber),
      purpose: data.purpose
    };
  }

  /**
   * Sanitize login data
   * Industry Standard: Login data sanitization
   */
  sanitizeLoginData(data: {
    phoneNumber: string;
    verificationCode: string;
  }): SanitizedLoginData {
    return {
      phoneNumber: this.sanitizePhoneNumber(data.phoneNumber),
      verificationCode: this.sanitizeVerificationCode(data.verificationCode)
    };
  }

  /**
   * Sanitize profile update data
   * Industry Standard: Profile data sanitization
   */
  sanitizeProfileUpdateData(data: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  }): SanitizedProfileUpdateData {
    return {
      firstName: data.firstName ? this.sanitizeFirstName(data.firstName) : undefined,
      lastName: data.lastName ? this.sanitizeLastName(data.lastName) : undefined,
      avatar: data.avatar ? this.sanitizeAvatar(data.avatar) : undefined,
      timezone: data.timezone ? this.sanitizeTimezone(data.timezone) : undefined,
      language: data.language ? this.sanitizeLanguage(data.language) : undefined
    };
  }

  /**
   * Sanitize phone change data
   * Industry Standard: Phone change data sanitization
   */
  sanitizePhoneChangeData(data: {
    newPhoneNumber: string;
    verificationCode: string;
  }): SanitizedPhoneChangeData {
    return {
      newPhoneNumber: this.sanitizePhoneNumber(data.newPhoneNumber),
      verificationCode: this.sanitizeVerificationCode(data.verificationCode)
    };
  }

  /**
   * Sanitize device info
   * Industry Standard: Device info sanitization
   */
  sanitizeDeviceInfo(data: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): SanitizedDeviceInfo {
    return {
      deviceId: data.deviceId ? this.sanitizeDeviceId(data.deviceId) : undefined,
      userAgent: data.userAgent ? this.sanitizeUserAgent(data.userAgent) : undefined,
      ipAddress: data.ipAddress ? this.sanitizeIPAddress(data.ipAddress) : undefined
    };
  }

  /**
   * Sanitize token data
   * Industry Standard: Token data sanitization
   */
  sanitizeTokenData(data: {
    accessToken?: string;
    refreshToken?: string;
  }): SanitizedTokenData {
    return {
      accessToken: data.accessToken ? this.sanitizeAccessToken(data.accessToken) : undefined,
      refreshToken: data.refreshToken ? this.sanitizeRefreshToken(data.refreshToken) : undefined
    };
  }

  /**
   * Sanitize phone number
   * Industry Standard: Phone number sanitization
   */
  sanitizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let sanitized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + if it doesn't already
    if (!sanitized.startsWith('+')) {
      sanitized = '+' + sanitized;
    }
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.phoneNumber.maxLength) {
      sanitized = sanitized.substring(0, AUTH_SANITIZATION_CONFIG.phoneNumber.maxLength);
    }
    
    return this.coreSanitization.sanitizeUserInput(sanitized);
  }

  /**
   * Sanitize verification code
   * Industry Standard: Verification code sanitization
   */
  sanitizeVerificationCode(code: string): string {
    // Keep only digits
    const sanitized = code.replace(/\D/g, '');
    
    // Ensure exact length
    if (sanitized.length !== AUTH_SANITIZATION_CONFIG.verificationCode.length) {
      return sanitized.padStart(AUTH_SANITIZATION_CONFIG.verificationCode.length, '0');
    }
    
    return sanitized;
  }

  /**
   * Sanitize first name
   * Industry Standard: Name sanitization
   */
  sanitizeFirstName(firstName: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(firstName);
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.profile.firstName.maxLength) {
      return sanitized.substring(0, AUTH_SANITIZATION_CONFIG.profile.firstName.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize last name
   * Industry Standard: Name sanitization
   */
  sanitizeLastName(lastName: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(lastName);
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.profile.lastName.maxLength) {
      return sanitized.substring(0, AUTH_SANITIZATION_CONFIG.profile.lastName.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize avatar URL
   * Industry Standard: URL sanitization
   */
  sanitizeAvatar(avatar: string): string {
    const sanitized = this.coreSanitization.sanitizeURL(avatar);
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.profile.avatar.maxLength) {
      return sanitized.substring(0, AUTH_SANITIZATION_CONFIG.profile.avatar.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize timezone
   * Industry Standard: Timezone sanitization
   */
  sanitizeTimezone(timezone: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(timezone);
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.profile.timezone.maxLength) {
      return sanitized.substring(0, AUTH_SANITIZATION_CONFIG.profile.timezone.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize language code
   * Industry Standard: Language code sanitization
   */
  sanitizeLanguage(language: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(language).toLowerCase();
    
    // Ensure exact length
    if (sanitized.length !== AUTH_SANITIZATION_CONFIG.profile.language.length) {
      return sanitized.padEnd(AUTH_SANITIZATION_CONFIG.profile.language.length, 'a');
    }
    
    return sanitized;
  }

  /**
   * Sanitize device ID
   * Industry Standard: Device ID sanitization
   */
  sanitizeDeviceId(deviceId: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(deviceId);
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.deviceInfo.deviceId.maxLength) {
      return sanitized.substring(0, AUTH_SANITIZATION_CONFIG.deviceInfo.deviceId.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize user agent
   * Industry Standard: User agent sanitization
   */
  sanitizeUserAgent(userAgent: string): string {
    const sanitized = this.coreSanitization.sanitizeUserInput(userAgent);
    
    // Truncate if too long
    if (sanitized.length > AUTH_SANITIZATION_CONFIG.deviceInfo.userAgent.maxLength) {
      return sanitized.substring(0, AUTH_SANITIZATION_CONFIG.deviceInfo.userAgent.maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize IP address
   * Industry Standard: IP address sanitization
   */
  sanitizeIPAddress(ipAddress: string): string {
    return this.coreSanitization.sanitizeUserInput(ipAddress);
  }

  /**
   * Sanitize access token
   * Industry Standard: Token sanitization
   */
  sanitizeAccessToken(token: string): string {
    return this.coreSanitization.sanitizeUserInput(token);
  }

  /**
   * Sanitize refresh token
   * Industry Standard: Token sanitization
   */
  sanitizeRefreshToken(token: string): string {
    return this.coreSanitization.sanitizeUserInput(token);
  }

  /**
   * Sanitize auth data object
   * Industry Standard: Data object sanitization
   */
  sanitizeAuthDataObject(data: unknown): SanitizedAuthDataObject {
    return this.coreSanitization.sanitizeDataObject(data, {
      keyValidationRegex: /^[a-zA-Z0-9_-]+$/
    }) as SanitizedAuthDataObject;
  }

  /**
   * Check if content contains malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string): boolean {
    return this.coreSanitization.containsMaliciousContent(content, [...AUTH_MALICIOUS_PATTERNS]);
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
