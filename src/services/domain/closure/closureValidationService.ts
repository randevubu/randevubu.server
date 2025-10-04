// Closure Validation Service - Domain-Specific
import { CoreValidationService, ValidationResult } from '../../core/validationService';
import { ClosureType } from '@prisma/client';
import { CLOSURE_VALIDATION_CONFIG, CLOSURE_ERROR_MESSAGES } from '../../../constants/closureValidation';
import { ClosureSanitizationService } from './closureSanitizationService';
import { isValidString, isValidArray, isValidUUID, isValidObject } from '../../../utils/typeGuards';

export class ClosureValidationService {
  private coreValidation: CoreValidationService;
  private sanitizationService: ClosureSanitizationService;

  constructor() {
    this.coreValidation = new CoreValidationService();
    this.sanitizationService = new ClosureSanitizationService();
  }

  /**
   * Validate closure creation request
   * Industry Standard: Comprehensive closure validation
   */
  validateClosureRequest(request: unknown): ValidationResult<{
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
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { 
        startDate, 
        endDate, 
        reason, 
        type, 
        affectedServices, 
        isRecurring, 
        recurringPattern, 
        notifyCustomers, 
        notificationMessage, 
        notificationChannels 
      } = request as any;
      const errors: string[] = [];

      // Validate required fields
      const startDateResult = this.validateStartDate(startDate);
      if (!startDateResult.isValid) {
        errors.push(...(startDateResult.errors || []));
      }

      const reasonResult = this.validateReason(reason);
      if (!reasonResult.isValid) {
        errors.push(...(reasonResult.errors || []));
      }

      const typeResult = this.validateClosureType(type);
      if (!typeResult.isValid) {
        errors.push(...(typeResult.errors || []));
      }

      // Validate optional fields
      if (endDate !== undefined) {
        const endDateResult = this.validateEndDate(endDate);
        if (!endDateResult.isValid) {
          errors.push(...(endDateResult.errors || []));
        }
      }

      if (affectedServices !== undefined) {
        const affectedServicesResult = this.validateAffectedServices(affectedServices);
        if (!affectedServicesResult.isValid) {
          errors.push(...(affectedServicesResult.errors || []));
        }
      }

      if (recurringPattern !== undefined) {
        const recurringPatternResult = this.validateRecurringPattern(recurringPattern);
        if (!recurringPatternResult.isValid) {
          errors.push(...(recurringPatternResult.errors || []));
        }
      }

      if (notificationMessage !== undefined) {
        const notificationMessageResult = this.validateNotificationMessage(notificationMessage);
        if (!notificationMessageResult.isValid) {
          errors.push(...(notificationMessageResult.errors || []));
        }
      }

      if (notificationChannels !== undefined) {
        const notificationChannelsResult = this.validateNotificationChannels(notificationChannels);
        if (!notificationChannelsResult.isValid) {
          errors.push(...(notificationChannelsResult.errors || []));
        }
      }

      // Validate date logic
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          errors.push(CLOSURE_ERROR_MESSAGES.END_DATE_BEFORE_START);
        }
      }

      // Validate start date is not in the past
      if (startDate) {
        const start = new Date(startDate);
        const now = new Date();
        const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
        if (start < new Date(now.getTime() - bufferMs)) {
          errors.push(CLOSURE_ERROR_MESSAGES.START_DATE_PAST);
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
          startDate,
          endDate,
          reason,
          type,
          affectedServices,
          isRecurring,
          recurringPattern,
          notifyCustomers,
          notificationMessage,
          notificationChannels
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
   * Validate closure update request
   * Industry Standard: Comprehensive closure update validation
   */
  validateClosureUpdateRequest(request: unknown): ValidationResult<{
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
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { 
        startDate, 
        endDate, 
        reason, 
        type, 
        affectedServices, 
        isRecurring, 
        recurringPattern, 
        notifyCustomers, 
        notificationMessage, 
        notificationChannels 
      } = request as any;
      const errors: string[] = [];

      // Validate optional fields
      if (startDate !== undefined) {
        const startDateResult = this.validateStartDate(startDate);
        if (!startDateResult.isValid) {
          errors.push(...(startDateResult.errors || []));
        }
      }

      if (endDate !== undefined) {
        const endDateResult = this.validateEndDate(endDate);
        if (!endDateResult.isValid) {
          errors.push(...(endDateResult.errors || []));
        }
      }

      if (reason !== undefined) {
        const reasonResult = this.validateReason(reason);
        if (!reasonResult.isValid) {
          errors.push(...(reasonResult.errors || []));
        }
      }

      if (type !== undefined) {
        const typeResult = this.validateClosureType(type);
        if (!typeResult.isValid) {
          errors.push(...(typeResult.errors || []));
        }
      }

      if (affectedServices !== undefined) {
        const affectedServicesResult = this.validateAffectedServices(affectedServices);
        if (!affectedServicesResult.isValid) {
          errors.push(...(affectedServicesResult.errors || []));
        }
      }

      if (recurringPattern !== undefined) {
        const recurringPatternResult = this.validateRecurringPattern(recurringPattern);
        if (!recurringPatternResult.isValid) {
          errors.push(...(recurringPatternResult.errors || []));
        }
      }

      if (notificationMessage !== undefined) {
        const notificationMessageResult = this.validateNotificationMessage(notificationMessage);
        if (!notificationMessageResult.isValid) {
          errors.push(...(notificationMessageResult.errors || []));
        }
      }

      if (notificationChannels !== undefined) {
        const notificationChannelsResult = this.validateNotificationChannels(notificationChannels);
        if (!notificationChannelsResult.isValid) {
          errors.push(...(notificationChannelsResult.errors || []));
        }
      }

      // Validate date logic if both dates are provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          errors.push(CLOSURE_ERROR_MESSAGES.END_DATE_BEFORE_START);
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
          startDate,
          endDate,
          reason,
          type,
          affectedServices,
          isRecurring,
          recurringPattern,
          notifyCustomers,
          notificationMessage,
          notificationChannels
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
   * Validate closure analytics request
   * Industry Standard: Analytics validation
   */
  validateClosureAnalyticsRequest(request: unknown): ValidationResult<{
    businessId: string;
    startDate?: string;
    endDate?: string;
    type?: ClosureType;
    includeRecurring?: boolean;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { businessId, startDate, endDate, type, includeRecurring } = request as any;
      const errors: string[] = [];

      // Validate required fields
      const businessIdResult = this.validateBusinessId(businessId);
      if (!businessIdResult.isValid) {
        errors.push(...(businessIdResult.errors || []));
      }

      // Validate optional fields
      if (startDate !== undefined) {
        const startDateResult = this.validateStartDate(startDate);
        if (!startDateResult.isValid) {
          errors.push(...(startDateResult.errors || []));
        }
      }

      if (endDate !== undefined) {
        const endDateResult = this.validateEndDate(endDate);
        if (!endDateResult.isValid) {
          errors.push(...(endDateResult.errors || []));
        }
      }

      if (type !== undefined) {
        const typeResult = this.validateClosureType(type);
        if (!typeResult.isValid) {
          errors.push(...(typeResult.errors || []));
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
          businessId,
          startDate,
          endDate,
          type,
          includeRecurring
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
   * Validate reschedule request
   * Industry Standard: Reschedule validation
   */
  validateRescheduleRequest(request: unknown): ValidationResult<{
    closureId: string;
    businessId: string;
    autoReschedule?: boolean;
    maxRescheduleDays?: number;
    preferredTimeSlots?: string;
    notifyCustomers?: boolean;
    allowWeekends?: boolean;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: ['Request must be a valid object']
        };
      }

      const { closureId, businessId, autoReschedule, maxRescheduleDays, preferredTimeSlots, notifyCustomers, allowWeekends } = request as any;
      const errors: string[] = [];

      // Validate required fields
      const closureIdResult = this.validateClosureId(closureId);
      if (!closureIdResult.isValid) {
        errors.push(...(closureIdResult.errors || []));
      }

      const businessIdResult = this.validateBusinessId(businessId);
      if (!businessIdResult.isValid) {
        errors.push(...(businessIdResult.errors || []));
      }

      // Validate optional fields
      if (maxRescheduleDays !== undefined) {
        const maxRescheduleDaysResult = this.validateMaxRescheduleDays(maxRescheduleDays);
        if (!maxRescheduleDaysResult.isValid) {
          errors.push(...(maxRescheduleDaysResult.errors || []));
        }
      }

      if (preferredTimeSlots !== undefined) {
        const preferredTimeSlotsResult = this.validatePreferredTimeSlots(preferredTimeSlots);
        if (!preferredTimeSlotsResult.isValid) {
          errors.push(...(preferredTimeSlotsResult.errors || []));
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
          closureId,
          businessId,
          autoReschedule,
          maxRescheduleDays,
          preferredTimeSlots,
          notifyCustomers,
          allowWeekends
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
   * Validate start date
   * Industry Standard: Date validation
   */
  validateStartDate(startDate: unknown): ValidationResult<string> {
    if (typeof startDate !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_START_DATE]
      };
    }

    return this.coreValidation.validateString(startDate, {
      pattern: CLOSURE_VALIDATION_CONFIG.closure.startDate.pattern,
      required: true
    });
  }

  /**
   * Validate end date
   * Industry Standard: Date validation
   */
  validateEndDate(endDate: unknown): ValidationResult<string> {
    if (typeof endDate !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_END_DATE]
      };
    }

    return this.coreValidation.validateString(endDate, {
      pattern: CLOSURE_VALIDATION_CONFIG.closure.endDate.pattern,
      required: false
    });
  }

  /**
   * Validate reason
   * Industry Standard: Text validation
   */
  validateReason(reason: unknown): ValidationResult<string> {
    if (typeof reason !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_REASON]
      };
    }

    return this.coreValidation.validateString(reason, {
      minLength: CLOSURE_VALIDATION_CONFIG.closure.reason.minLength,
      maxLength: CLOSURE_VALIDATION_CONFIG.closure.reason.maxLength,
      pattern: CLOSURE_VALIDATION_CONFIG.closure.reason.pattern,
      required: true
    });
  }

  /**
   * Validate closure type
   * Industry Standard: Enum validation
   */
  validateClosureType(type: unknown): ValidationResult<ClosureType> {
    if (typeof type !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_TYPE]
      };
    }

    const validTypes = Object.values(ClosureType);
    if (!validTypes.includes(type as ClosureType)) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_TYPE]
      };
    }

    return {
      isValid: true,
      data: type as ClosureType
    };
  }

  /**
   * Validate affected services
   * Industry Standard: Array validation
   */
  validateAffectedServices(services: unknown): ValidationResult<string[]> {
    if (!isValidArray(services)) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_AFFECTED_SERVICES]
      };
    }

    const servicesArray = services as unknown[];
    if (servicesArray.length > CLOSURE_VALIDATION_CONFIG.closure.affectedServices.maxLength) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_AFFECTED_SERVICES]
      };
    }

    // Validate each service ID
    for (const service of servicesArray) {
      if (typeof service !== 'string') {
        return {
          isValid: false,
          errors: [CLOSURE_ERROR_MESSAGES.INVALID_SERVICE_ID]
        };
      }

      if (!CLOSURE_VALIDATION_CONFIG.closure.affectedServices.itemPattern.test(service)) {
        return {
          isValid: false,
          errors: [CLOSURE_ERROR_MESSAGES.INVALID_SERVICE_ID]
        };
      }
    }

    return {
      isValid: true,
      data: servicesArray as string[]
    };
  }

  /**
   * Validate recurring pattern
   * Industry Standard: Object validation
   */
  validateRecurringPattern(pattern: unknown): ValidationResult<Record<string, unknown>> {
    if (!isValidObject(pattern)) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_RECURRING_PATTERN]
      };
    }

    const patternObj = pattern as Record<string, unknown>;
    const keys = Object.keys(patternObj);

    if (keys.length > CLOSURE_VALIDATION_CONFIG.closure.recurringPattern.maxKeys) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_RECURRING_PATTERN_FORMAT]
      };
    }

    // Validate each key
    for (const key of keys) {
      if (!CLOSURE_VALIDATION_CONFIG.closure.recurringPattern.allowedKeys.test(key)) {
        return {
          isValid: false,
          errors: [CLOSURE_ERROR_MESSAGES.INVALID_RECURRING_PATTERN_FORMAT]
        };
      }
    }

    return {
      isValid: true,
      data: patternObj
    };
  }

  /**
   * Validate notification message
   * Industry Standard: Text validation
   */
  validateNotificationMessage(message: unknown): ValidationResult<string> {
    if (typeof message !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_MESSAGE]
      };
    }

    return this.coreValidation.validateString(message, {
      maxLength: CLOSURE_VALIDATION_CONFIG.closure.notificationMessage.maxLength,
      pattern: CLOSURE_VALIDATION_CONFIG.closure.notificationMessage.pattern,
      required: false
    });
  }

  /**
   * Validate notification channels
   * Industry Standard: Array validation
   */
  validateNotificationChannels(channels: unknown): ValidationResult<string[]> {
    if (!isValidArray(channels)) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_CHANNELS]
      };
    }

    const channelsArray = channels as unknown[];
    if (channelsArray.length > CLOSURE_VALIDATION_CONFIG.closure.notificationChannels.maxLength) {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_CHANNELS]
      };
    }

    // Validate each channel
    for (const channel of channelsArray) {
      if (typeof channel !== 'string') {
        return {
          isValid: false,
          errors: [CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_CHANNEL]
        };
      }

      if (!CLOSURE_VALIDATION_CONFIG.closure.notificationChannels.allowedValues.includes(channel.toUpperCase())) {
        return {
          isValid: false,
          errors: [CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_CHANNEL]
        };
      }
    }

    return {
      isValid: true,
      data: channelsArray as string[]
    };
  }

  /**
   * Validate business ID
   * Industry Standard: ID validation
   */
  validateBusinessId(businessId: unknown): ValidationResult<string> {
    if (typeof businessId !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_BUSINESS_ID]
      };
    }

    return this.coreValidation.validateString(businessId, {
      pattern: CLOSURE_VALIDATION_CONFIG.analytics.businessId.pattern,
      required: true
    });
  }

  /**
   * Validate closure ID
   * Industry Standard: ID validation
   */
  validateClosureId(closureId: unknown): ValidationResult<string> {
    if (typeof closureId !== 'string') {
      return {
        isValid: false,
        errors: [CLOSURE_ERROR_MESSAGES.INVALID_CLOSURE_ID]
      };
    }

    return this.coreValidation.validateString(closureId, {
      pattern: CLOSURE_VALIDATION_CONFIG.reschedule.closureId.pattern,
      required: true
    });
  }

  /**
   * Validate max reschedule days
   * Industry Standard: Number validation
   */
  validateMaxRescheduleDays(days: unknown): ValidationResult<number> {
    if (typeof days !== 'number') {
      return {
        isValid: false,
        errors: ['Max reschedule days must be a number']
      };
    }

    if (days < CLOSURE_VALIDATION_CONFIG.reschedule.maxRescheduleDays.min) {
      return {
        isValid: false,
        errors: ['Max reschedule days must be at least 1']
      };
    }

    if (days > CLOSURE_VALIDATION_CONFIG.reschedule.maxRescheduleDays.max) {
      return {
        isValid: false,
        errors: ['Max reschedule days cannot exceed 30']
      };
    }

    return {
      isValid: true,
      data: days
    };
  }

  /**
   * Validate preferred time slots
   * Industry Standard: Enum validation
   */
  validatePreferredTimeSlots(slots: unknown): ValidationResult<string> {
    if (typeof slots !== 'string') {
      return {
        isValid: false,
        errors: ['Preferred time slots must be a string']
      };
    }

    const upperSlots = slots.toUpperCase();
    if (!CLOSURE_VALIDATION_CONFIG.reschedule.preferredTimeSlots.allowedValues.includes(upperSlots)) {
      return {
        isValid: false,
        errors: ['Preferred time slots must be one of: MORNING, AFTERNOON, EVENING, ANY']
      };
    }

    return {
      isValid: true,
      data: upperSlots
    };
  }

  /**
   * Validate closure data object
   * Industry Standard: Data object validation
   */
  validateClosureDataObject(data: unknown): ValidationResult<boolean> {
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
  }) {
    return this.sanitizationService.sanitizeClosureData(data);
  }

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
  }) {
    return this.sanitizationService.sanitizeClosureUpdateData(data);
  }

  sanitizeClosureAnalyticsData(data: {
    businessId: string;
    startDate?: string;
    endDate?: string;
    type?: ClosureType;
    includeRecurring?: boolean;
  }) {
    return this.sanitizationService.sanitizeClosureAnalyticsData(data);
  }

  sanitizeRescheduleData(data: {
    closureId: string;
    businessId: string;
    autoReschedule?: boolean;
    maxRescheduleDays?: number;
    preferredTimeSlots?: string;
    notifyCustomers?: boolean;
    allowWeekends?: boolean;
  }) {
    return this.sanitizationService.sanitizeRescheduleData(data);
  }

  sanitizeClosureDataObject(data: unknown) {
    return this.sanitizationService.sanitizeClosureDataObject(data);
  }

  containsMaliciousContent(content: string): boolean {
    return this.sanitizationService.containsMaliciousContent(content);
  }
}
