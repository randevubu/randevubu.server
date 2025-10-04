// Auth Validation Service - Domain-Specific
import { CoreValidationService, ValidationResult } from '../../core/validationService';
import { VerificationPurpose } from '@prisma/client';
import { AUTH_VALIDATION_CONFIG, AUTH_ERROR_MESSAGES } from '../../../constants/authValidation';
import { AuthSanitizationService } from './authSanitizationService';
import { isValidString, isValidArray, isValidUUID, isValidObject } from '../../../utils/typeGuards';

export class AuthValidationService {
  private coreValidation: CoreValidationService;
  private sanitizationService: AuthSanitizationService;

  constructor() {
    this.coreValidation = new CoreValidationService();
    this.sanitizationService = new AuthSanitizationService();
  }

  /**
   * Validate phone validation request
   * Industry Standard: Comprehensive phone validation
   */
  validatePhoneValidationRequest(request: unknown): ValidationResult<{
    phoneNumber: string;
    purpose: VerificationPurpose;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { phoneNumber, purpose } = request as any;

      // Validate phone number
      const phoneResult = this.validatePhoneNumber(phoneNumber);
      if (!phoneResult.isValid) {
        return {
          isValid: false,
          errors: phoneResult.errors || ['Invalid phone number']
        };
      }

      // Validate purpose
      const purposeResult = this.validatePurpose(purpose);
      if (!purposeResult.isValid) {
        return {
          isValid: false,
          errors: purposeResult.errors || ['Invalid purpose']
        };
      }

      return {
        isValid: true,
        data: {
          phoneNumber: phoneResult.data!,
          purpose: purposeResult.data!
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
   * Validate login request
   * Industry Standard: Comprehensive login validation
   */
  validateLoginRequest(request: unknown): ValidationResult<{
    phoneNumber: string;
    verificationCode: string;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { phoneNumber, verificationCode } = request as any;

      // Validate phone number
      const phoneResult = this.validatePhoneNumber(phoneNumber);
      if (!phoneResult.isValid) {
        return {
          isValid: false,
          errors: phoneResult.errors || ['Invalid phone number']
        };
      }

      // Validate verification code
      const codeResult = this.validateVerificationCode(verificationCode);
      if (!codeResult.isValid) {
        return {
          isValid: false,
          errors: codeResult.errors || ['Invalid verification code']
        };
      }

      return {
        isValid: true,
        data: {
          phoneNumber: phoneResult.data!,
          verificationCode: codeResult.data!
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
   * Validate profile update request
   * Industry Standard: Comprehensive profile validation
   */
  validateProfileUpdateRequest(request: unknown): ValidationResult<{
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { firstName, lastName, avatar, timezone, language } = request as any;
      const errors: string[] = [];

      // Validate optional fields
      if (firstName !== undefined) {
        const firstNameResult = this.validateFirstName(firstName);
        if (!firstNameResult.isValid) {
          errors.push(...(firstNameResult.errors || []));
        }
      }

      if (lastName !== undefined) {
        const lastNameResult = this.validateLastName(lastName);
        if (!lastNameResult.isValid) {
          errors.push(...(lastNameResult.errors || []));
        }
      }

      if (avatar !== undefined) {
        const avatarResult = this.validateAvatar(avatar);
        if (!avatarResult.isValid) {
          errors.push(...(avatarResult.errors || []));
        }
      }

      if (timezone !== undefined) {
        const timezoneResult = this.validateTimezone(timezone);
        if (!timezoneResult.isValid) {
          errors.push(...(timezoneResult.errors || []));
        }
      }

      if (language !== undefined) {
        const languageResult = this.validateLanguage(language);
        if (!languageResult.isValid) {
          errors.push(...(languageResult.errors || []));
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
        data: {
          firstName,
          lastName,
          avatar,
          timezone,
          language
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
   * Validate phone number
   * Industry Standard: Phone number validation
   */
  validatePhoneNumber(phoneNumber: unknown): ValidationResult<string> {
    if (typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER]
      };
    }

    return this.coreValidation.validateString(phoneNumber, {
      minLength: AUTH_VALIDATION_CONFIG.phoneNumber.minLength,
      maxLength: AUTH_VALIDATION_CONFIG.phoneNumber.maxLength,
      pattern: AUTH_VALIDATION_CONFIG.phoneNumber.pattern,
      required: true
    });
  }

  /**
   * Validate verification code
   * Industry Standard: Verification code validation
   */
  validateVerificationCode(code: unknown): ValidationResult<string> {
    if (typeof code !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE]
      };
    }

    return this.coreValidation.validateString(code, {
      minLength: AUTH_VALIDATION_CONFIG.verificationCode.length,
      maxLength: AUTH_VALIDATION_CONFIG.verificationCode.length,
      pattern: AUTH_VALIDATION_CONFIG.verificationCode.pattern,
      required: true
    });
  }

  /**
   * Validate verification purpose
   * Industry Standard: Purpose validation
   */
  validatePurpose(purpose: unknown): ValidationResult<VerificationPurpose> {
    if (typeof purpose !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.INVALID_PURPOSE]
      };
    }

    const validPurposes = Object.values(VerificationPurpose);
    if (!validPurposes.includes(purpose as VerificationPurpose)) {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.INVALID_PURPOSE]
      };
    }

    return {
      isValid: true,
      data: purpose as VerificationPurpose
    };
  }

  /**
   * Validate first name
   * Industry Standard: Name validation
   */
  validateFirstName(firstName: unknown): ValidationResult<string> {
    if (typeof firstName !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.FIRST_NAME_INVALID]
      };
    }

    return this.coreValidation.validateString(firstName, {
      minLength: AUTH_VALIDATION_CONFIG.profile.firstName.minLength,
      maxLength: AUTH_VALIDATION_CONFIG.profile.firstName.maxLength,
      pattern: AUTH_VALIDATION_CONFIG.profile.firstName.pattern,
      required: false
    });
  }

  /**
   * Validate last name
   * Industry Standard: Name validation
   */
  validateLastName(lastName: unknown): ValidationResult<string> {
    if (typeof lastName !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.LAST_NAME_INVALID]
      };
    }

    return this.coreValidation.validateString(lastName, {
      minLength: AUTH_VALIDATION_CONFIG.profile.lastName.minLength,
      maxLength: AUTH_VALIDATION_CONFIG.profile.lastName.maxLength,
      pattern: AUTH_VALIDATION_CONFIG.profile.lastName.pattern,
      required: false
    });
  }

  /**
   * Validate avatar URL
   * Industry Standard: URL validation
   */
  validateAvatar(avatar: unknown): ValidationResult<string> {
    if (typeof avatar !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.AVATAR_URL_INVALID]
      };
    }

    return this.coreValidation.validateString(avatar, {
      maxLength: AUTH_VALIDATION_CONFIG.profile.avatar.maxLength,
      pattern: AUTH_VALIDATION_CONFIG.profile.avatar.pattern,
      required: false
    });
  }

  /**
   * Validate timezone
   * Industry Standard: Timezone validation
   */
  validateTimezone(timezone: unknown): ValidationResult<string> {
    if (typeof timezone !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.TIMEZONE_INVALID]
      };
    }

    return this.coreValidation.validateString(timezone, {
      maxLength: AUTH_VALIDATION_CONFIG.profile.timezone.maxLength,
      pattern: AUTH_VALIDATION_CONFIG.profile.timezone.pattern,
      required: false
    });
  }

  /**
   * Validate language code
   * Industry Standard: Language validation
   */
  validateLanguage(language: unknown): ValidationResult<string> {
    if (typeof language !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.LANGUAGE_INVALID]
      };
    }

    return this.coreValidation.validateString(language, {
      minLength: AUTH_VALIDATION_CONFIG.profile.language.length,
      maxLength: AUTH_VALIDATION_CONFIG.profile.language.length,
      pattern: AUTH_VALIDATION_CONFIG.profile.language.pattern,
      required: false
    });
  }

  /**
   * Validate device info
   * Industry Standard: Device info validation
   */
  validateDeviceInfo(deviceInfo: unknown): ValidationResult<{
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }> {
    if (!isValidObject(deviceInfo)) {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.DEVICE_INFO_INVALID]
      };
    }

    const { deviceId, userAgent, ipAddress } = deviceInfo as any;
    const errors: string[] = [];

    if (deviceId !== undefined) {
      const deviceIdResult = this.validateDeviceId(deviceId);
      if (!deviceIdResult.isValid) {
        errors.push(...(deviceIdResult.errors || []));
      }
    }

    if (userAgent !== undefined) {
      const userAgentResult = this.validateUserAgent(userAgent);
      if (!userAgentResult.isValid) {
        errors.push(...(userAgentResult.errors || []));
      }
    }

    if (ipAddress !== undefined) {
      const ipResult = this.validateIPAddress(ipAddress);
      if (!ipResult.isValid) {
        errors.push(...(ipResult.errors || []));
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
      data: {
        deviceId,
        userAgent,
        ipAddress
      }
    };
  }

  /**
   * Validate device ID
   * Industry Standard: Device ID validation
   */
  validateDeviceId(deviceId: unknown): ValidationResult<string> {
    if (typeof deviceId !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.DEVICE_ID_TOO_LONG]
      };
    }

    return this.coreValidation.validateString(deviceId, {
      maxLength: AUTH_VALIDATION_CONFIG.deviceInfo.deviceId.maxLength,
      pattern: AUTH_VALIDATION_CONFIG.deviceInfo.deviceId.pattern,
      required: false
    });
  }

  /**
   * Validate user agent
   * Industry Standard: User agent validation
   */
  validateUserAgent(userAgent: unknown): ValidationResult<string> {
    if (typeof userAgent !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.USER_AGENT_TOO_LONG]
      };
    }

    return this.coreValidation.validateString(userAgent, {
      maxLength: AUTH_VALIDATION_CONFIG.deviceInfo.userAgent.maxLength,
      required: false
    });
  }

  /**
   * Validate IP address
   * Industry Standard: IP address validation
   */
  validateIPAddress(ipAddress: unknown): ValidationResult<string> {
    if (typeof ipAddress !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.INVALID_IP_ADDRESS]
      };
    }

    return this.coreValidation.validateString(ipAddress, {
      pattern: AUTH_VALIDATION_CONFIG.deviceInfo.ipAddress.pattern,
      required: false
    });
  }

  /**
   * Validate token
   * Industry Standard: Token validation
   */
  validateToken(token: unknown): ValidationResult<string> {
    if (typeof token !== 'string') {
      return {
        isValid: false,
        errors: [AUTH_ERROR_MESSAGES.TOKEN_FORMAT_INVALID]
      };
    }

    return this.coreValidation.validateString(token, {
      pattern: AUTH_VALIDATION_CONFIG.tokens.accessToken.pattern,
      required: false
    });
  }

  /**
   * Validate auth data object
   * Industry Standard: Data object validation
   */
  validateAuthDataObject(data: unknown): ValidationResult<boolean> {
    if (!isValidObject(data)) {
      return {
        isValid: false,
        errors: ['Data must be a valid object']
      };
    }

    const dataObject = data as Record<string, unknown>;
    const keys = Object.keys(dataObject);

    if (keys.length > 10) {
      return {
        isValid: false,
        errors: ['Data object is too large']
      };
    }

    // Validate each key
    for (const key of keys) {
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
        return {
          isValid: false,
          errors: ['Invalid key format in data object']
        };
      }
    }

    return {
      isValid: true,
      data: true
    };
  }

  // Delegate sanitization methods
  sanitizePhoneValidationData(data: {
    phoneNumber: string;
    purpose: VerificationPurpose;
  }) {
    return this.sanitizationService.sanitizePhoneValidationData(data);
  }

  sanitizeLoginData(data: {
    phoneNumber: string;
    verificationCode: string;
  }) {
    return this.sanitizationService.sanitizeLoginData(data);
  }

  sanitizeProfileUpdateData(data: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  }) {
    return this.sanitizationService.sanitizeProfileUpdateData(data);
  }

  sanitizePhoneChangeData(data: {
    newPhoneNumber: string;
    verificationCode: string;
  }) {
    return this.sanitizationService.sanitizePhoneChangeData(data);
  }

  sanitizeDeviceInfo(data: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.sanitizationService.sanitizeDeviceInfo(data);
  }

  sanitizeTokenData(data: {
    accessToken?: string;
    refreshToken?: string;
  }) {
    return this.sanitizationService.sanitizeTokenData(data);
  }

  sanitizeAuthDataObject(data: unknown) {
    return this.sanitizationService.sanitizeAuthDataObject(data);
  }

  containsMaliciousContent(content: string): boolean {
    return this.sanitizationService.containsMaliciousContent(content);
  }
}
