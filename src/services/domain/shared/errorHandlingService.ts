import { 
  NotFoundError, 
  ValidationError, 
  ForbiddenError,
  BusinessError,
  ErrorContext 
} from '../../../types/errors';
import logger from '../../../utils/Logger/logger';

/**
 * ErrorHandlingService
 * 
 * Enterprise Pattern: Centralized error handling and creation
 * Following Google/Microsoft patterns for consistent error management
 * 
 * Responsibilities:
 * - Standardized error creation
 * - Error context management
 * - Security-conscious error messages
 * - Audit logging for errors
 */
export class ErrorHandlingService {
  
  /**
   * Create a standardized "not found" error
   * Industry Standard: Consistent resource not found handling
   */
  throwNotFound(
    resource: string,
    id: string,
    context?: ErrorContext
  ): never {
    const message = `${resource} not found`;

    this.logErrorEvent('RESOURCE_NOT_FOUND', {
      resource,
      id,
      ...(context && { context })
    });

    throw new NotFoundError(message, context, { additionalData: { resource, id } });
  }

  /**
   * Create a standardized validation error
   * Industry Standard: Input validation error handling
   */
  throwValidationError(
    message: string,
    field?: string,
    context?: ErrorContext
  ): never {
    const fullMessage = field ? `${field}: ${message}` : message;

    this.logErrorEvent('VALIDATION_ERROR', {
      message: fullMessage,
      field,
      ...(context && { context })
    });

    throw new ValidationError(fullMessage, field, undefined, context);
  }

  /**
   * Create a standardized forbidden error
   * Industry Standard: Authorization error handling
   */
  throwForbiddenError(
    message: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('FORBIDDEN_ERROR', {
      message,
      ...(context && { context })
    });

    throw new ForbiddenError(message, context);
  }

  /**
   * Create a business-specific error
   * Industry Standard: Business logic error handling
   */
  throwBusinessError(
    message: string,
    businessId: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('BUSINESS_ERROR', {
      message,
      businessId,
      ...(context && { context })
    });

    throw new BusinessError(message, context, { additionalData: { businessId } });
  }

  /**
   * Create a user-specific error
   * Industry Standard: User-related error handling
   */
  throwUserError(
    message: string,
    userId: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('USER_ERROR', {
      message,
      userId,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create a service-specific error
   * Industry Standard: Service operation error handling
   */
  throwServiceError(
    service: string,
    operation: string,
    message: string,
    context?: ErrorContext
  ): never {
    const fullMessage = `${service} ${operation} failed: ${message}`;

    this.logErrorEvent('SERVICE_ERROR', {
      service,
      operation,
      message: fullMessage,
      ...(context && { context })
    });

    throw new ValidationError(fullMessage, undefined, undefined, context);
  }

  /**
   * Create a permission-related error
   * Industry Standard: Permission error handling
   */
  throwPermissionError(
    permission: string,
    resource?: string,
    context?: ErrorContext
  ): never {
    const message = resource
      ? `Permission denied: ${permission} on ${resource}`
      : `Permission denied: ${permission}`;

    this.logErrorEvent('PERMISSION_ERROR', {
      permission,
      resource,
      ...(context && { context })
    });

    throw new ForbiddenError(message, context);
  }

  /**
   * Create a business ownership error
   * Industry Standard: Business ownership validation
   */
  throwBusinessOwnershipError(
    businessId: string,
    userId: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('BUSINESS_OWNERSHIP_ERROR', {
      businessId,
      userId,
      ...(context && { context })
    });

    throw new ForbiddenError(
      'You can only perform this action on your own business',
      context
    );
  }

  /**
   * Create a staff access error
   * Industry Standard: Staff permission validation
   */
  throwStaffAccessError(
    businessId: string,
    userId: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('STAFF_ACCESS_ERROR', {
      businessId,
      userId,
      ...(context && { context })
    });

    throw new ForbiddenError(
      'You do not have staff access to this business',
      context
    );
  }

  /**
   * Create a customer access error
   * Industry Standard: Customer permission validation
   */
  throwCustomerAccessError(
    customerId: string,
    userId: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('CUSTOMER_ACCESS_ERROR', {
      customerId,
      userId,
      ...(context && { context })
    });

    throw new ForbiddenError(
      'You do not have access to this customer data',
      context
    );
  }

  /**
   * Create a subscription-related error
   * Industry Standard: Subscription validation
   */
  throwSubscriptionError(
    message: string,
    businessId?: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('SUBSCRIPTION_ERROR', {
      message,
      businessId,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create a payment-related error
   * Industry Standard: Payment validation
   */
  throwPaymentError(
    message: string,
    paymentId?: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('PAYMENT_ERROR', {
      message,
      paymentId,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create an appointment-related error
   * Industry Standard: Appointment validation
   */
  throwAppointmentError(
    message: string,
    appointmentId?: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('APPOINTMENT_ERROR', {
      message,
      appointmentId,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create a notification-related error
   * Industry Standard: Notification validation
   */
  throwNotificationError(
    message: string,
    businessId?: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('NOTIFICATION_ERROR', {
      message,
      businessId,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create a rate limit error
   * Industry Standard: Rate limiting
   */
  throwRateLimitError(
    service: string,
    limit: number,
    context?: ErrorContext
  ): never {
    const message = `Rate limit exceeded for ${service}. Limit: ${limit}`;

    this.logErrorEvent('RATE_LIMIT_ERROR', {
      service,
      limit,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create a quota exceeded error
   * Industry Standard: Usage quota validation
   */
  throwQuotaExceededError(
    resource: string,
    limit: number,
    context?: ErrorContext
  ): never {
    const message = `${resource} quota exceeded. Limit: ${limit}`;

    this.logErrorEvent('QUOTA_EXCEEDED_ERROR', {
      resource,
      limit,
      ...(context && { context })
    });

    throw new ValidationError(message, undefined, undefined, context);
  }

  /**
   * Create a configuration error
   * Industry Standard: Configuration validation
   */
  throwConfigurationError(
    setting: string,
    message: string,
    context?: ErrorContext
  ): never {
    const fullMessage = `Configuration error for ${setting}: ${message}`;

    this.logErrorEvent('CONFIGURATION_ERROR', {
      setting,
      message: fullMessage,
      ...(context && { context })
    });

    throw new ValidationError(fullMessage, undefined, undefined, context);
  }

  /**
   * Create a security-related error
   * Industry Standard: Security validation
   */
  throwSecurityError(
    message: string,
    context?: ErrorContext
  ): never {
    this.logErrorEvent('SECURITY_ERROR', {
      message,
      ...(context && { context })
    });

    throw new ForbiddenError(message, context);
  }

  /**
   * Log error events for audit purposes
   * Industry Standard: Comprehensive error logging
   */
  private logErrorEvent(
    eventType: string, 
    data: Record<string, any>
  ): void {
    try {
      logger.error('Error handling service event', {
        eventType,
        timestamp: new Date().toISOString(),
        ...data
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.error('Failed to log error event:', error);
    }
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();
