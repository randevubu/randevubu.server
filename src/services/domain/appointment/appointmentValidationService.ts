// Appointment Validation Service - Domain-Specific
import { CoreValidationService, ValidationResult } from '../../core/validationService';
import { AppointmentStatus } from '../../../types/business';
import { APPOINTMENT_VALIDATION_CONFIG, APPOINTMENT_ERROR_MESSAGES, APPOINTMENT_STATUS_TRANSITIONS } from '../../../constants/appointmentValidation';
import { AppointmentSanitizationService } from './appointmentSanitizationService';
import { isValidString, isValidArray, isValidUUID, isValidObject } from '../../../utils/typeGuards';

export class AppointmentValidationService {
  private coreValidation: CoreValidationService;
  private sanitizationService: AppointmentSanitizationService;

  constructor() {
    this.coreValidation = new CoreValidationService();
    this.sanitizationService = new AppointmentSanitizationService();
  }

  /**
   * Validate appointment creation request
   * Industry Standard: Comprehensive appointment validation
   */
  validateAppointmentRequest(request: unknown): ValidationResult<{
    businessId: string;
    serviceId: string;
    staffId: string;
    customerId?: string;
    date: string;
    startTime: string;
    customerNotes?: string;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: [APPOINTMENT_ERROR_MESSAGES.MISSING_REQUIRED]
        };
      }

      const data = request as Record<string, unknown>;
      const errors: string[] = [];

      // Validate required fields
      const businessId = this.validateBusinessId(data.businessId);
      if (!businessId.isValid) {
        errors.push(...(businessId.errors || []));
      }

      const serviceId = this.validateServiceId(data.serviceId);
      if (!serviceId.isValid) {
        errors.push(...(serviceId.errors || []));
      }

      const staffId = this.validateStaffId(data.staffId);
      if (!staffId.isValid) {
        errors.push(...(staffId.errors || []));
      }

      const date = this.validateDate(data.date);
      if (!date.isValid) {
        errors.push(...(date.errors || []));
      }

      const startTime = this.validateTime(data.startTime);
      if (!startTime.isValid) {
        errors.push(...(startTime.errors || []));
      }

      // Validate optional fields
      let customerId: ValidationResult<string> | undefined;
      if (data.customerId) {
        customerId = this.validateCustomerId(data.customerId);
        if (!customerId.isValid) {
          errors.push(...(customerId.errors || []));
        }
      }

      const customerNotes = this.validateNotes(data.customerNotes);
      if (!customerNotes.isValid) {
        errors.push(...(customerNotes.errors || []));
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
          businessId: businessId.data!,
          serviceId: serviceId.data!,
          staffId: staffId.data!,
          customerId: customerId?.data,
          date: date.data!,
          startTime: startTime.data!,
          customerNotes: customerNotes.data
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.VALIDATION_FAILED + ': ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Validate appointment update request
   * Industry Standard: Appointment update validation
   */
  validateAppointmentUpdateRequest(request: unknown): ValidationResult<{
    date?: string;
    startTime?: string;
    status?: AppointmentStatus;
    customerNotes?: string;
    internalNotes?: string;
    cancelReason?: string;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: [APPOINTMENT_ERROR_MESSAGES.MISSING_REQUIRED]
        };
      }

      const data = request as Record<string, unknown>;
      const errors: string[] = [];
      const result: Record<string, unknown> = {};

      // Validate optional fields
      if (data.date) {
        const date = this.validateDate(data.date);
        if (!date.isValid) {
          errors.push(...(date.errors || []));
        } else {
          result.date = date.data;
        }
      }

      if (data.startTime) {
        const startTime = this.validateTime(data.startTime);
        if (!startTime.isValid) {
          errors.push(...(startTime.errors || []));
        } else {
          result.startTime = startTime.data;
        }
      }

      if (data.status) {
        const status = this.validateStatus(data.status);
        if (!status.isValid) {
          errors.push(...(status.errors || []));
        } else {
          result.status = status.data;
        }
      }

      if (data.customerNotes) {
        const customerNotes = this.validateNotes(data.customerNotes);
        if (!customerNotes.isValid) {
          errors.push(...(customerNotes.errors || []));
        } else {
          result.customerNotes = customerNotes.data;
        }
      }

      if (data.internalNotes) {
        const internalNotes = this.validateInternalNotes(data.internalNotes);
        if (!internalNotes.isValid) {
          errors.push(...(internalNotes.errors || []));
        } else {
          result.internalNotes = internalNotes.data;
        }
      }

      if (data.cancelReason) {
        const cancelReason = this.validateCancelReason(data.cancelReason);
        if (!cancelReason.isValid) {
          errors.push(...(cancelReason.errors || []));
        } else {
          result.cancelReason = cancelReason.data;
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
        data: result
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.VALIDATION_FAILED + ': ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Validate appointment search request
   * Industry Standard: Search validation
   */
  validateAppointmentSearchRequest(request: unknown): ValidationResult<{
    businessId?: string;
    staffId?: string;
    customerId?: string;
    status?: AppointmentStatus;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }> {
    try {
      if (!isValidObject(request)) {
        return {
          isValid: false,
          errors: [APPOINTMENT_ERROR_MESSAGES.MISSING_REQUIRED]
        };
      }

      const data = request as Record<string, unknown>;
      const errors: string[] = [];
      const result: Record<string, unknown> = {};

      // Validate optional fields
      if (data.businessId) {
        const businessId = this.validateBusinessId(data.businessId);
        if (!businessId.isValid) {
          errors.push(...(businessId.errors || []));
        } else {
          result.businessId = businessId.data;
        }
      }

      if (data.staffId) {
        const staffId = this.validateStaffId(data.staffId);
        if (!staffId.isValid) {
          errors.push(...(staffId.errors || []));
        } else {
          result.staffId = staffId.data;
        }
      }

      if (data.customerId) {
        const customerId = this.validateCustomerId(data.customerId);
        if (!customerId.isValid) {
          errors.push(...(customerId.errors || []));
        } else {
          result.customerId = customerId.data;
        }
      }

      if (data.status) {
        const status = this.validateStatus(data.status);
        if (!status.isValid) {
          errors.push(...(status.errors || []));
        } else {
          result.status = status.data;
        }
      }

      if (data.date) {
        const date = this.validateDate(data.date);
        if (!date.isValid) {
          errors.push(...(date.errors || []));
        } else {
          result.date = date.data;
        }
      }

      if (data.startDate) {
        const startDate = this.validateDate(data.startDate);
        if (!startDate.isValid) {
          errors.push(...(startDate.errors || []));
        } else {
          result.startDate = startDate.data;
        }
      }

      if (data.endDate) {
        const endDate = this.validateDate(data.endDate);
        if (!endDate.isValid) {
          errors.push(...(endDate.errors || []));
        } else {
          result.endDate = endDate.data;
        }
      }

      if (data.page) {
        const page = this.validatePageNumber(data.page);
        if (!page.isValid) {
          errors.push(...(page.errors || []));
        } else {
          result.page = page.data;
        }
      }

      if (data.limit) {
        const limit = this.validateLimit(data.limit);
        if (!limit.isValid) {
          errors.push(...(limit.errors || []));
        } else {
          result.limit = limit.data;
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
        data: result
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.VALIDATION_FAILED + ': ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  /**
   * Validate business ID
   * Industry Standard: ID validation
   */
  validateBusinessId(businessId: unknown): ValidationResult<string> {
    if (typeof businessId !== 'string') {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_BUSINESS_ID]
      };
    }
    return this.coreValidation.validateUUID(businessId);
  }

  /**
   * Validate service ID
   * Industry Standard: ID validation
   */
  validateServiceId(serviceId: unknown): ValidationResult<string> {
    if (typeof serviceId !== 'string') {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_SERVICE_ID]
      };
    }
    return this.coreValidation.validateUUID(serviceId);
  }

  /**
   * Validate staff ID
   * Industry Standard: ID validation
   */
  validateStaffId(staffId: unknown): ValidationResult<string> {
    if (typeof staffId !== 'string') {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_STAFF_ID]
      };
    }
    return this.coreValidation.validateUUID(staffId);
  }

  /**
   * Validate customer ID
   * Industry Standard: ID validation
   */
  validateCustomerId(customerId: unknown): ValidationResult<string> {
    if (typeof customerId !== 'string') {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_CUSTOMER_ID]
      };
    }
    return this.coreValidation.validateUUID(customerId);
  }

  /**
   * Validate appointment date
   * Industry Standard: Date validation
   */
  validateDate(date: unknown): ValidationResult<string> {
    const stringResult = this.coreValidation.validateString(date, {
      pattern: /^\d{4}-\d{2}-\d{2}$/
    });

    if (!stringResult.isValid) {
      return stringResult;
    }

    // Additional date validation
    const dateObj = new Date(stringResult.data!);
    if (isNaN(dateObj.getTime())) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_DATE_FORMAT]
      };
    }

    return {
      isValid: true,
      data: stringResult.data!
    };
  }

  /**
   * Validate appointment time
   * Industry Standard: Time validation
   */
  validateTime(time: unknown): ValidationResult<string> {
    return this.coreValidation.validateString(time, {
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    });
  }

  /**
   * Validate appointment status
   * Industry Standard: Status validation
   */
  validateStatus(status: unknown): ValidationResult<AppointmentStatus> {
    const stringResult = this.coreValidation.validateString(status);

    if (!stringResult.isValid) {
      return stringResult as ValidationResult<AppointmentStatus>;
    }

    const validStatuses = Object.values(AppointmentStatus);
    if (!validStatuses.includes(stringResult.data! as AppointmentStatus)) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_STATUS]
      };
    }

    return {
      isValid: true,
      data: stringResult.data! as AppointmentStatus
    };
  }

  /**
   * Validate appointment notes
   * Industry Standard: Notes validation
   */
  validateNotes(notes: unknown): ValidationResult<string | undefined> {
    if (!notes) {
      return { isValid: true, data: undefined };
    }

    return this.coreValidation.validateString(notes, {
      maxLength: APPOINTMENT_VALIDATION_CONFIG.maxNotesLength
    });
  }

  /**
   * Validate internal notes
   * Industry Standard: Internal notes validation
   */
  validateInternalNotes(notes: unknown): ValidationResult<string | undefined> {
    if (!notes) {
      return { isValid: true, data: undefined };
    }

    return this.coreValidation.validateString(notes, {
      maxLength: APPOINTMENT_VALIDATION_CONFIG.maxInternalNotesLength
    });
  }

  /**
   * Validate cancel reason
   * Industry Standard: Cancel reason validation
   */
  validateCancelReason(reason: unknown): ValidationResult<string | undefined> {
    if (!reason) {
      return { isValid: true, data: undefined };
    }

    return this.coreValidation.validateString(reason, {
      maxLength: APPOINTMENT_VALIDATION_CONFIG.maxCancelReasonLength
    });
  }

  /**
   * Validate page number
   * Industry Standard: Pagination validation
   */
  validatePageNumber(page: unknown): ValidationResult<number> {
    return this.coreValidation.validateNumber(page, {
      min: 1
    });
  }

  /**
   * Validate limit
   * Industry Standard: Limit validation
   */
  validateLimit(limit: unknown): ValidationResult<number> {
    return this.coreValidation.validateNumber(limit, {
      min: 1,
      max: 50
    });
  }

  /**
   * Validate status transition
   * Industry Standard: Status transition validation
   */
  validateStatusTransition(currentStatus: AppointmentStatus, newStatus: AppointmentStatus): ValidationResult<boolean> {
    const allowedTransitions = APPOINTMENT_STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.STATUS_TRANSITION_NOT_ALLOWED]
      };
    }

    return {
      isValid: true,
      data: true
    };
  }

  /**
   * Validate appointment data object
   * Industry Standard: Data object validation
   */
  validateAppointmentDataObject(data: unknown): ValidationResult<Record<string, unknown>> {
    if (!isValidObject(data)) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.INVALID_FORMAT]
      };
    }

    return {
      isValid: true,
      data: data as Record<string, unknown>
    };
  }

  /**
   * Check for malicious content patterns
   * Industry Standard: Security validation
   */
  checkForMaliciousContent(content: string): ValidationResult<boolean> {
    const isMalicious = this.sanitizationService.containsMaliciousContent(content);
    
    if (isMalicious) {
      return {
        isValid: false,
        errors: [APPOINTMENT_ERROR_MESSAGES.MALICIOUS_CONTENT]
      };
    }

    return {
      isValid: true,
      data: false
    };
  }

  /**
   * Sanitize appointment data
   * Industry Standard: Data sanitization
   */
  sanitizeAppointmentData(data: {
    businessId: string;
    serviceId: string;
    staffId: string;
    customerId?: string;
    date: string;
    startTime: string;
    customerNotes?: string;
  }): {
    businessId: string;
    serviceId: string;
    staffId: string;
    customerId?: string;
    date: string;
    startTime: string;
    customerNotes?: string;
  } {
    return this.sanitizationService.sanitizeAppointmentData(data);
  }

  /**
   * Sanitize appointment update data
   * Industry Standard: Update data sanitization
   */
  sanitizeAppointmentUpdateData(data: {
    date?: string;
    startTime?: string;
    status?: string;
    customerNotes?: string;
    internalNotes?: string;
    cancelReason?: string;
  }): Partial<{
    date: string;
    startTime: string;
    customerNotes?: string;
    internalNotes?: string;
    cancelReason?: string;
  }> {
    return this.sanitizationService.sanitizeAppointmentUpdateData(data);
  }

  /**
   * Sanitize appointment search data
   * Industry Standard: Search data sanitization
   */
  sanitizeAppointmentSearchData(data: {
    businessId?: string;
    staffId?: string;
    customerId?: string;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): {
    businessId?: string;
    staffId?: string;
    customerId?: string;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } {
    return this.sanitizationService.sanitizeAppointmentSearchData(data);
  }
}
