// Business Validation Service - Domain-Specific
import { CoreValidationService, ValidationResult } from '../../core/validationService';
import { BusinessStaffRole } from '@prisma/client';
import { BUSINESS_VALIDATION_CONFIG, BUSINESS_ERROR_MESSAGES } from '../../../constants/businessValidation';
import { BusinessSanitizationService } from './businessSanitizationService';
import { isValidString, isValidArray, isValidUUID, isValidObject } from '../../../utils/typeGuards';

export class BusinessValidationService {
  private coreValidation: CoreValidationService;
  private sanitizationService: BusinessSanitizationService;

  constructor() {
    this.coreValidation = new CoreValidationService();
    this.sanitizationService = new BusinessSanitizationService();
  }

  /**
   * Validate business creation request
   * Industry Standard: Comprehensive business validation
   */
  validateBusinessRequest(request: unknown): ValidationResult<{
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    currency?: string;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { name, description, phone, email, address, timezone, currency } = request as any;
      const errors: string[] = [];

      // Validate required fields
      const nameResult = this.validateBusinessName(name);
      if (!nameResult.isValid) {
        errors.push(...(nameResult.errors || []));
      }

      // Validate optional fields
      if (description !== undefined) {
        const descriptionResult = this.validateBusinessDescription(description);
        if (!descriptionResult.isValid) {
          errors.push(...(descriptionResult.errors || []));
        }
      }

      if (phone !== undefined) {
        const phoneResult = this.validateBusinessPhone(phone);
        if (!phoneResult.isValid) {
          errors.push(...(phoneResult.errors || []));
        }
      }

      if (email !== undefined) {
        const emailResult = this.validateBusinessEmail(email);
        if (!emailResult.isValid) {
          errors.push(...(emailResult.errors || []));
        }
      }

      if (address !== undefined) {
        const addressResult = this.validateBusinessAddress(address);
        if (!addressResult.isValid) {
          errors.push(...(addressResult.errors || []));
        }
      }

      if (timezone !== undefined) {
        const timezoneResult = this.validateBusinessTimezone(timezone);
        if (!timezoneResult.isValid) {
          errors.push(...(timezoneResult.errors || []));
        }
      }

      if (currency !== undefined) {
        const currencyResult = this.validateBusinessCurrency(currency);
        if (!currencyResult.isValid) {
          errors.push(...(currencyResult.errors || []));
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
          name,
          description,
          phone,
          email,
          address,
          timezone,
          currency
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
   * Validate service creation request
   * Industry Standard: Comprehensive service validation
   */
  validateServiceRequest(request: unknown): ValidationResult<{
    name: string;
    description?: string;
    duration: number;
    price: number;
    currency?: string;
    showPrice?: boolean;
    bufferTime?: number;
    maxAdvanceBooking?: number;
    minAdvanceBooking?: number;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { name, description, duration, price, currency, showPrice, bufferTime, maxAdvanceBooking, minAdvanceBooking } = request as any;
      const errors: string[] = [];

      // Validate required fields
      const nameResult = this.validateServiceName(name);
      if (!nameResult.isValid) {
        errors.push(...(nameResult.errors || []));
      }

      const durationResult = this.validateServiceDuration(duration);
      if (!durationResult.isValid) {
        errors.push(...(durationResult.errors || []));
      }

      const priceResult = this.validateServicePrice(price);
      if (!priceResult.isValid) {
        errors.push(...(priceResult.errors || []));
      }

      // Validate optional fields
      if (description !== undefined) {
        const descriptionResult = this.validateServiceDescription(description);
        if (!descriptionResult.isValid) {
          errors.push(...(descriptionResult.errors || []));
        }
      }

      if (currency !== undefined) {
        const currencyResult = this.validateServiceCurrency(currency);
        if (!currencyResult.isValid) {
          errors.push(...(currencyResult.errors || []));
        }
      }

      if (bufferTime !== undefined) {
        const bufferTimeResult = this.validateServiceBufferTime(bufferTime);
        if (!bufferTimeResult.isValid) {
          errors.push(...(bufferTimeResult.errors || []));
        }
      }

      if (maxAdvanceBooking !== undefined) {
        const maxAdvanceBookingResult = this.validateServiceMaxAdvanceBooking(maxAdvanceBooking);
        if (!maxAdvanceBookingResult.isValid) {
          errors.push(...(maxAdvanceBookingResult.errors || []));
        }
      }

      if (minAdvanceBooking !== undefined) {
        const minAdvanceBookingResult = this.validateServiceMinAdvanceBooking(minAdvanceBooking);
        if (!minAdvanceBookingResult.isValid) {
          errors.push(...(minAdvanceBookingResult.errors || []));
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
          name,
          description,
          duration,
          price,
          currency,
          showPrice,
          bufferTime,
          maxAdvanceBooking,
          minAdvanceBooking
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
   * Validate staff request
   * Industry Standard: Comprehensive staff validation
   */
  validateStaffRequest(request: unknown): ValidationResult<{
    userId: string;
    role: BusinessStaffRole;
    permissions?: Record<string, unknown>;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { userId, role, permissions } = request as any;
      const errors: string[] = [];

      // Validate required fields
      const userIdResult = this.validateStaffUserId(userId);
      if (!userIdResult.isValid) {
        errors.push(...(userIdResult.errors || []));
      }

      const roleResult = this.validateStaffRole(role);
      if (!roleResult.isValid) {
        errors.push(...(roleResult.errors || []));
      }

      // Validate optional fields
      if (permissions !== undefined) {
        const permissionsResult = this.validateStaffPermissions(permissions);
        if (!permissionsResult.isValid) {
          errors.push(...(permissionsResult.errors || []));
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
          userId,
          role,
          permissions
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
   * Validate business name
   * Industry Standard: Business name validation
   */
  validateBusinessName(name: unknown): ValidationResult<string> {
    if (typeof name !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.INVALID_BUSINESS_NAME]
      };
    }

    return this.coreValidation.validateString(name, {
      minLength: BUSINESS_VALIDATION_CONFIG.business.name.minLength,
      maxLength: BUSINESS_VALIDATION_CONFIG.business.name.maxLength,
      pattern: BUSINESS_VALIDATION_CONFIG.business.name.pattern,
      required: true
    });
  }

  /**
   * Validate business description
   * Industry Standard: Business description validation
   */
  validateBusinessDescription(description: unknown): ValidationResult<string> {
    if (typeof description !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG]
      };
    }

    return this.coreValidation.validateString(description, {
      maxLength: BUSINESS_VALIDATION_CONFIG.business.description.maxLength,
      pattern: BUSINESS_VALIDATION_CONFIG.business.description.pattern,
      required: false
    });
  }

  /**
   * Validate business phone
   * Industry Standard: Phone validation
   */
  validateBusinessPhone(phone: unknown): ValidationResult<string> {
    if (typeof phone !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.PHONE_INVALID_FORMAT]
      };
    }

    return this.coreValidation.validateString(phone, {
      pattern: BUSINESS_VALIDATION_CONFIG.business.phone.pattern,
      required: false
    });
  }

  /**
   * Validate business email
   * Industry Standard: Email validation
   */
  validateBusinessEmail(email: unknown): ValidationResult<string> {
    if (typeof email !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.EMAIL_INVALID_FORMAT]
      };
    }

    return this.coreValidation.validateString(email, {
      pattern: BUSINESS_VALIDATION_CONFIG.business.email.pattern,
      required: false
    });
  }

  /**
   * Validate business address
   * Industry Standard: Address validation
   */
  validateBusinessAddress(address: unknown): ValidationResult<string> {
    if (typeof address !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.INVALID_ADDRESS]
      };
    }

    return this.coreValidation.validateString(address, {
      maxLength: BUSINESS_VALIDATION_CONFIG.business.address.maxLength,
      pattern: BUSINESS_VALIDATION_CONFIG.business.address.pattern,
      required: false
    });
  }

  /**
   * Validate business timezone
   * Industry Standard: Timezone validation
   */
  validateBusinessTimezone(timezone: unknown): ValidationResult<string> {
    if (typeof timezone !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.TIMEZONE_INVALID]
      };
    }

    return this.coreValidation.validateString(timezone, {
      pattern: BUSINESS_VALIDATION_CONFIG.business.timezone.pattern,
      required: false
    });
  }

  /**
   * Validate business currency
   * Industry Standard: Currency validation
   */
  validateBusinessCurrency(currency: unknown): ValidationResult<string> {
    if (typeof currency !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.CURRENCY_INVALID]
      };
    }

    return this.coreValidation.validateString(currency, {
      pattern: BUSINESS_VALIDATION_CONFIG.business.currency.pattern,
      required: false
    });
  }

  /**
   * Validate service name
   * Industry Standard: Service name validation
   */
  validateServiceName(name: unknown): ValidationResult<string> {
    if (typeof name !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.INVALID_SERVICE_NAME]
      };
    }

    return this.coreValidation.validateString(name, {
      minLength: BUSINESS_VALIDATION_CONFIG.service.name.minLength,
      maxLength: BUSINESS_VALIDATION_CONFIG.service.name.maxLength,
      pattern: BUSINESS_VALIDATION_CONFIG.service.name.pattern,
      required: true
    });
  }

  /**
   * Validate service description
   * Industry Standard: Service description validation
   */
  validateServiceDescription(description: unknown): ValidationResult<string> {
    if (typeof description !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG]
      };
    }

    return this.coreValidation.validateString(description, {
      maxLength: BUSINESS_VALIDATION_CONFIG.service.description.maxLength,
      pattern: BUSINESS_VALIDATION_CONFIG.service.description.pattern,
      required: false
    });
  }

  /**
   * Validate service duration
   * Industry Standard: Duration validation
   */
  validateServiceDuration(duration: unknown): ValidationResult<number> {
    if (typeof duration !== 'number') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.INVALID_DURATION]
      };
    }

    if (duration < BUSINESS_VALIDATION_CONFIG.service.duration.min) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.DURATION_TOO_SHORT]
      };
    }

    if (duration > BUSINESS_VALIDATION_CONFIG.service.duration.max) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.DURATION_TOO_LONG]
      };
    }

    return {
      isValid: true,
      data: duration
    };
  }

  /**
   * Validate service price
   * Industry Standard: Price validation
   */
  validateServicePrice(price: unknown): ValidationResult<number> {
    if (typeof price !== 'number') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.INVALID_PRICE]
      };
    }

    if (price < BUSINESS_VALIDATION_CONFIG.service.price.min) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.PRICE_NEGATIVE]
      };
    }

    if (price > BUSINESS_VALIDATION_CONFIG.service.price.max) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.PRICE_TOO_HIGH]
      };
    }

    return {
      isValid: true,
      data: price
    };
  }

  /**
   * Validate service currency
   * Industry Standard: Currency validation
   */
  validateServiceCurrency(currency: unknown): ValidationResult<string> {
    if (typeof currency !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.CURRENCY_INVALID]
      };
    }

    return this.coreValidation.validateString(currency, {
      pattern: BUSINESS_VALIDATION_CONFIG.service.currency.pattern,
      required: false
    });
  }

  /**
   * Validate service buffer time
   * Industry Standard: Buffer time validation
   */
  validateServiceBufferTime(bufferTime: unknown): ValidationResult<number> {
    if (typeof bufferTime !== 'number') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.BUFFER_TIME_INVALID]
      };
    }

    if (bufferTime < BUSINESS_VALIDATION_CONFIG.service.bufferTime.min) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.BUFFER_TIME_INVALID]
      };
    }

    if (bufferTime > BUSINESS_VALIDATION_CONFIG.service.bufferTime.max) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.BUFFER_TIME_INVALID]
      };
    }

    return {
      isValid: true,
      data: bufferTime
    };
  }

  /**
   * Validate service max advance booking
   * Industry Standard: Max advance booking validation
   */
  validateServiceMaxAdvanceBooking(maxAdvanceBooking: unknown): ValidationResult<number> {
    if (typeof maxAdvanceBooking !== 'number') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID]
      };
    }

    if (maxAdvanceBooking < BUSINESS_VALIDATION_CONFIG.service.maxAdvanceBooking.min) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID]
      };
    }

    if (maxAdvanceBooking > BUSINESS_VALIDATION_CONFIG.service.maxAdvanceBooking.max) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID]
      };
    }

    return {
      isValid: true,
      data: maxAdvanceBooking
    };
  }

  /**
   * Validate service min advance booking
   * Industry Standard: Min advance booking validation
   */
  validateServiceMinAdvanceBooking(minAdvanceBooking: unknown): ValidationResult<number> {
    if (typeof minAdvanceBooking !== 'number') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID]
      };
    }

    if (minAdvanceBooking < BUSINESS_VALIDATION_CONFIG.service.minAdvanceBooking.min) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID]
      };
    }

    if (minAdvanceBooking > BUSINESS_VALIDATION_CONFIG.service.minAdvanceBooking.max) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID]
      };
    }

    return {
      isValid: true,
      data: minAdvanceBooking
    };
  }

  /**
   * Validate staff user ID
   * Industry Standard: User ID validation
   */
  validateStaffUserId(userId: unknown): ValidationResult<string> {
    if (typeof userId !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.STAFF_ROLE_REQUIRED]
      };
    }

    return this.coreValidation.validateString(userId, {
      pattern: BUSINESS_VALIDATION_CONFIG.staff.userId.pattern,
      required: true
    });
  }

  /**
   * Validate staff role
   * Industry Standard: Role validation
   */
  validateStaffRole(role: unknown): ValidationResult<BusinessStaffRole> {
    if (typeof role !== 'string') {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.STAFF_ROLE_INVALID]
      };
    }

    const validRoles = Object.values(BusinessStaffRole);
    if (!validRoles.includes(role as BusinessStaffRole)) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.STAFF_ROLE_INVALID]
      };
    }

    return {
      isValid: true,
      data: role as BusinessStaffRole
    };
  }

  /**
   * Validate staff permissions
   * Industry Standard: Permissions validation
   */
  validateStaffPermissions(permissions: unknown): ValidationResult<Record<string, unknown>> {
    if (!isValidObject(permissions)) {
      return {
        isValid: false,
        errors: [BUSINESS_ERROR_MESSAGES.PERMISSIONS_INVALID]
      };
    }

    const permissionsObj = permissions as Record<string, unknown>;
    const keys = Object.keys(permissionsObj);

    if (keys.length > 20) {
      return {
        isValid: false,
        errors: ['Too many permissions']
      };
    }

    // Validate each key
    for (const key of keys) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        return {
          isValid: false,
          errors: ['Invalid permission key format']
        };
      }
    }

    return {
      isValid: true,
      data: permissionsObj
    };
  }

  /**
   * Validate business data object
   * Industry Standard: Data object validation
   */
  validateBusinessDataObject(data: unknown): ValidationResult<boolean> {
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
  sanitizeBusinessData(data: {
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
    currency?: string;
  }) {
    return this.sanitizationService.sanitizeBusinessData(data);
  }

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
  }) {
    return this.sanitizationService.sanitizeServiceData(data);
  }

  sanitizeStaffData(data: {
    userId: string;
    role: BusinessStaffRole;
    permissions?: Record<string, unknown>;
  }) {
    return this.sanitizationService.sanitizeStaffData(data);
  }

  sanitizeBusinessHoursData(data: {
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breakStartTime?: string;
    breakEndTime?: string;
  }) {
    return this.sanitizationService.sanitizeBusinessHoursData(data);
  }

  sanitizeBusinessSettingsData(data: {
    notificationSettings?: Record<string, unknown>;
    privacySettings?: Record<string, unknown>;
    priceSettings?: Record<string, unknown>;
    staffPrivacySettings?: Record<string, unknown>;
  }) {
    return this.sanitizationService.sanitizeBusinessSettingsData(data);
  }

  sanitizeBusinessDataObject(data: unknown) {
    return this.sanitizationService.sanitizeBusinessDataObject(data);
  }

  containsMaliciousContent(content: string): boolean {
    return this.sanitizationService.containsMaliciousContent(content);
  }
}
