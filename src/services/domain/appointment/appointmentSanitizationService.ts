// Appointment Sanitization Service - Domain-Specific
import { CoreSanitizationService, SanitizationConfig, SanitizedData } from '../../core/sanitizationService';
import { APPOINTMENT_VALIDATION_CONFIG, APPOINTMENT_SANITIZATION_CONFIG, APPOINTMENT_MALICIOUS_PATTERNS } from '../../../constants/appointmentValidation';
import { SanitizedAppointmentData, SanitizedAppointmentSearchData } from '../../../types/appointmentValidation';

export class AppointmentSanitizationService {
  private coreSanitization: CoreSanitizationService;

  constructor() {
    this.coreSanitization = new CoreSanitizationService();
  }

  /**
   * Sanitize appointment creation data
   * Industry Standard: Comprehensive appointment data sanitization
   */
  sanitizeAppointmentData(data: {
    businessId: string;
    serviceId: string;
    staffId: string;
    customerId?: string;
    date: string;
    startTime: string;
    customerNotes?: string;
  }): SanitizedAppointmentData {
    return {
      businessId: this.sanitizeId(data.businessId),
      serviceId: this.sanitizeId(data.serviceId),
      staffId: this.sanitizeId(data.staffId),
      customerId: data.customerId ? this.sanitizeId(data.customerId) : undefined,
      date: this.sanitizeDate(data.date),
      startTime: this.sanitizeTime(data.startTime),
      customerNotes: data.customerNotes ? this.sanitizeNotes(data.customerNotes) : undefined
    };
  }

  /**
   * Sanitize appointment update data
   * Industry Standard: Appointment update data sanitization
   */
  sanitizeAppointmentUpdateData(data: {
    date?: string;
    startTime?: string;
    status?: string;
    customerNotes?: string;
    internalNotes?: string;
    cancelReason?: string;
  }): Partial<SanitizedAppointmentData> {
    const sanitized: Partial<SanitizedAppointmentData> = {};

    if (data.date) {
      sanitized.date = this.sanitizeDate(data.date);
    }
    if (data.startTime) {
      sanitized.startTime = this.sanitizeTime(data.startTime);
    }
    if (data.customerNotes) {
      sanitized.customerNotes = this.sanitizeNotes(data.customerNotes);
    }
    if (data.internalNotes) {
      sanitized.internalNotes = this.sanitizeNotes(data.internalNotes);
    }
    if (data.cancelReason) {
      sanitized.cancelReason = this.sanitizeCancelReason(data.cancelReason);
    }

    return sanitized;
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
  }): SanitizedAppointmentSearchData {
    const sanitized: SanitizedAppointmentSearchData = {};

    if (data.businessId) {
      sanitized.businessId = this.sanitizeId(data.businessId);
    }
    if (data.staffId) {
      sanitized.staffId = this.sanitizeId(data.staffId);
    }
    if (data.customerId) {
      sanitized.customerId = this.sanitizeId(data.customerId);
    }
    if (data.status) {
      sanitized.status = this.sanitizeStatus(data.status);
    }
    if (data.date) {
      sanitized.date = this.sanitizeDate(data.date);
    }
    if (data.startDate) {
      sanitized.startDate = this.sanitizeDate(data.startDate);
    }
    if (data.endDate) {
      sanitized.endDate = this.sanitizeDate(data.endDate);
    }
    if (data.page) {
      sanitized.page = this.sanitizePageNumber(data.page);
    }
    if (data.limit) {
      sanitized.limit = this.sanitizeLimit(data.limit);
    }

    return sanitized;
  }

  /**
   * Sanitize appointment ID
   * Industry Standard: ID sanitization
   */
  sanitizeId(id: string): string {
    return this.coreSanitization.sanitizeUserInput(id.trim());
  }

  /**
   * Sanitize appointment date
   * Industry Standard: Date sanitization
   */
  sanitizeDate(date: string): string {
    return this.coreSanitization.sanitizeUserInput(date.trim());
  }

  /**
   * Sanitize appointment time
   * Industry Standard: Time sanitization
   */
  sanitizeTime(time: string): string {
    return this.coreSanitization.sanitizeUserInput(time.trim());
  }

  /**
   * Sanitize appointment notes
   * Industry Standard: Notes sanitization with length limits
   */
  sanitizeNotes(notes: string): string {
    const sanitized = this.coreSanitization.sanitizeRichText(notes);
    return sanitized.length > APPOINTMENT_VALIDATION_CONFIG.maxNotesLength
      ? sanitized.substring(0, APPOINTMENT_VALIDATION_CONFIG.maxNotesLength)
      : sanitized;
  }

  /**
   * Sanitize cancel reason
   * Industry Standard: Cancel reason sanitization
   */
  sanitizeCancelReason(reason: string): string {
    const sanitized = this.coreSanitization.sanitizeRichText(reason);
    return sanitized.length > APPOINTMENT_VALIDATION_CONFIG.maxCancelReasonLength
      ? sanitized.substring(0, APPOINTMENT_VALIDATION_CONFIG.maxCancelReasonLength)
      : sanitized;
  }

  /**
   * Sanitize appointment status
   * Industry Standard: Status sanitization
   */
  sanitizeStatus(status: string): string {
    return this.coreSanitization.sanitizeUserInput(status.trim().toUpperCase());
  }

  /**
   * Sanitize page number
   * Industry Standard: Pagination sanitization
   */
  sanitizePageNumber(page: number): number {
    return Math.max(1, Math.floor(Math.abs(page)));
  }

  /**
   * Sanitize limit
   * Industry Standard: Limit sanitization
   */
  sanitizeLimit(limit: number): number {
    return Math.max(1, Math.min(50, Math.floor(Math.abs(limit))));
  }

  /**
   * Sanitize appointment data object
   * Industry Standard: Data object sanitization
   */
  sanitizeAppointmentDataObject(data: Record<string, unknown>): SanitizedData {
    return this.coreSanitization.sanitizeDataObject(data, {
      keyValidationRegex: /^[a-zA-Z][a-zA-Z0-9_]*$/
    });
  }

  /**
   * Check if content contains malicious patterns
   * Industry Standard: Security validation
   */
  containsMaliciousContent(content: string): boolean {
    return this.coreSanitization.containsMaliciousContent(content, [...APPOINTMENT_MALICIOUS_PATTERNS]);
  }

  /**
   * Sanitize HTML content with custom configuration
   * Industry Standard: HTML sanitization
   */
  sanitizeHTML(html: string, allowedTags: string[] = [], allowedAttributes: string[] = []): string {
    return this.coreSanitization.sanitizeHTML(html, {
      allowedTags: allowedTags.length > 0 ? allowedTags : APPOINTMENT_SANITIZATION_CONFIG.allowedTags,
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
