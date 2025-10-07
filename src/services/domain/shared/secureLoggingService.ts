import logger from '../../../utils/Logger/logger';

/**
 * SecureLoggingService
 * 
 * Enterprise Pattern: Secure logging with data sanitization
 * Following Google/Microsoft patterns for production logging
 * 
 * Responsibilities:
 * - Secure service operation logging
 * - Data sanitization and masking
 * - Development vs production logging
 * - Audit trail management
 */
export class SecureLoggingService {
  
  /**
   * Log service method calls with sanitized data
   * Industry Standard: Service operation logging
   */
  logServiceCall(
    service: string, 
    method: string, 
    data?: any,
    context?: any
  ): void {
    if (process.env.NODE_ENV === 'development') {
      logger.info('Service method call', {
        service,
        method,
        data: this.sanitizeData(data),
        context,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log security events with sensitive data masking
   * Industry Standard: Security event logging
   */
  logSecurityEvent(
    event: string, 
    context: any
  ): void {
    logger.info('Security event', {
      event,
      context: this.sanitizeSecurityData(context),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log business operations with business context
   * Industry Standard: Business operation logging
   */
  logBusinessOperation(
    operation: string, 
    businessId: string, 
    userId: string,
    data?: any
  ): void {
    logger.info('Business operation', {
      operation,
      businessId,
      userId,
      data: this.sanitizeBusinessData(data),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log user operations with user context
   * Industry Standard: User operation logging
   */
  logUserOperation(
    operation: string, 
    userId: string,
    data?: any
  ): void {
    logger.info('User operation', {
      operation,
      userId,
      data: this.sanitizeUserData(data),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log payment operations with payment data masking
   * Industry Standard: Payment logging
   */
  logPaymentOperation(
    operation: string, 
    paymentId: string,
    amount?: number,
    currency?: string,
    data?: any
  ): void {
    logger.info('Payment operation', {
      operation,
      paymentId,
      amount,
      currency,
      data: this.sanitizePaymentData(data),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log appointment operations
   * Industry Standard: Appointment logging
   */
  logAppointmentOperation(
    operation: string, 
    appointmentId: string,
    businessId: string,
    customerId: string,
    data?: any
  ): void {
    logger.info('Appointment operation', {
      operation,
      appointmentId,
      businessId,
      customerId,
      data: this.sanitizeAppointmentData(data),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log notification operations
   * Industry Standard: Notification logging
   */
  logNotificationOperation(
    operation: string, 
    businessId: string,
    recipientCount: number,
    data?: any
  ): void {
    logger.info('Notification operation', {
      operation,
      businessId,
      recipientCount,
      data: this.sanitizeNotificationData(data),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log authentication events
   * Industry Standard: Authentication logging
   */
  logAuthenticationEvent(
    event: string, 
    userId: string,
    success: boolean,
    context?: any
  ): void {
    logger.info('Authentication event', {
      event,
      userId,
      success,
      context: this.sanitizeAuthData(context),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log permission events
   * Industry Standard: Permission logging
   */
  logPermissionEvent(
    event: string, 
    userId: string,
    permission: string,
    resource?: string,
    context?: any
  ): void {
    logger.info('Permission event', {
      event,
      userId,
      permission,
      resource,
      context: this.sanitizePermissionData(context),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log error events with sanitized error data
   * Industry Standard: Error logging
   */
  logErrorEvent(
    event: string, 
    error: Error,
    context?: any
  ): void {
    logger.error('Error event', {
      event,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      context: this.sanitizeErrorData(context),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance metrics
   * Industry Standard: Performance logging
   */
  logPerformanceMetrics(
    operation: string,
    duration: number,
    context?: any
  ): void {
    logger.info('Performance metrics', {
      operation,
      duration,
      context: this.sanitizePerformanceData(context),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Sanitize general data for logging
   * Industry Standard: Data sanitization
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      // Remove sensitive fields
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      delete sanitized.apiKey;
      delete sanitized.privateKey;
      
      // Mask phone numbers
      if (sanitized.phoneNumber) {
        sanitized.phoneNumber = this.maskPhoneNumber(sanitized.phoneNumber);
      }
      
      // Mask emails (keep domain)
      if (sanitized.email) {
        sanitized.email = this.maskEmail(sanitized.email);
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * Sanitize security-related data
   * Industry Standard: Security data sanitization
   */
  private sanitizeSecurityData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove all sensitive security data
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.password;
    delete sanitized.privateKey;
    delete sanitized.apiKey;
    
    // Mask IP addresses (keep first 3 octets)
    if (sanitized.ipAddress) {
      sanitized.ipAddress = this.maskIPAddress(sanitized.ipAddress);
    }
    
    return sanitized;
  }

  /**
   * Sanitize business data
   * Industry Standard: Business data sanitization
   */
  private sanitizeBusinessData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive business data
    delete sanitized.apiKey;
    delete sanitized.secret;
    delete sanitized.privateKey;
    
    return sanitized;
  }

  /**
   * Sanitize user data
   * Industry Standard: User data sanitization
   */
  private sanitizeUserData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive user data
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    
    // Mask phone numbers
    if (sanitized.phoneNumber) {
      sanitized.phoneNumber = this.maskPhoneNumber(sanitized.phoneNumber);
    }
    
    // Mask emails
    if (sanitized.email) {
      sanitized.email = this.maskEmail(sanitized.email);
    }
    
    return sanitized;
  }

  /**
   * Sanitize payment data
   * Industry Standard: Payment data sanitization
   */
  private sanitizePaymentData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove all payment-sensitive data
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.expiryDate;
    delete sanitized.cardHolderName;
    delete sanitized.privateKey;
    delete sanitized.secret;
    
    // Mask payment IDs (keep first 4 and last 4 characters)
    if (sanitized.paymentId) {
      sanitized.paymentId = this.maskPaymentId(sanitized.paymentId);
    }
    
    return sanitized;
  }

  /**
   * Sanitize appointment data
   * Industry Standard: Appointment data sanitization
   */
  private sanitizeAppointmentData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive appointment data
    delete sanitized.notes;
    delete sanitized.internalNotes;
    
    return sanitized;
  }

  /**
   * Sanitize notification data
   * Industry Standard: Notification data sanitization
   */
  private sanitizeNotificationData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive notification data
    delete sanitized.message;
    delete sanitized.content;
    delete sanitized.body;
    
    return sanitized;
  }

  /**
   * Sanitize authentication data
   * Industry Standard: Auth data sanitization
   */
  private sanitizeAuthData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove all auth-sensitive data
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.privateKey;
    
    // Mask phone numbers
    if (sanitized.phoneNumber) {
      sanitized.phoneNumber = this.maskPhoneNumber(sanitized.phoneNumber);
    }
    
    return sanitized;
  }

  /**
   * Sanitize permission data
   * Industry Standard: Permission data sanitization
   */
  private sanitizePermissionData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive permission data
    delete sanitized.token;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Sanitize error data
   * Industry Standard: Error data sanitization
   */
  private sanitizeErrorData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive error data
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.privateKey;
    delete sanitized.apiKey;
    
    return sanitized;
  }

  /**
   * Sanitize performance data
   * Industry Standard: Performance data sanitization
   */
  private sanitizePerformanceData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive performance data
    delete sanitized.query;
    delete sanitized.sql;
    delete sanitized.request;
    delete sanitized.response;
    
    return sanitized;
  }

  /**
   * Mask phone number for logging
   * Industry Standard: Phone number masking
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) return '***';
    return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-3)}`;
  }

  /**
   * Mask email for logging
   * Industry Standard: Email masking
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  /**
   * Mask IP address for logging
   * Industry Standard: IP address masking
   */
  private maskIPAddress(ipAddress: string): string {
    if (!ipAddress) return '***';
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    return '***';
  }

  /**
   * Mask payment ID for logging
   * Industry Standard: Payment ID masking
   */
  private maskPaymentId(paymentId: string): string {
    if (!paymentId || paymentId.length < 8) return '***';
    return `${paymentId.slice(0, 4)}***${paymentId.slice(-4)}`;
  }
}

// Export singleton instance
export const secureLoggingService = new SecureLoggingService();
