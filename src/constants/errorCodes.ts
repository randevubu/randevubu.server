/**
 * Centralized Error Codes Registry
 * 
 * ALL ERROR MESSAGES IN ONE PLACE!
 * 
 * This file contains every error code used in the application.
 * Frontend will use these codes to show Turkish translations.
 * 
 * Usage:
 * - Server returns error code (e.g., "BUSINESS_ACCESS_DENIED")
 * - Frontend translates using error.key (e.g., "errors.business.accessDenied")
 * - Turkish: "İş yerine erişim reddedildi"
 * - English: "Business access denied"
 */

// =============================================================================
// ERROR CODES - Every possible error in the application
// =============================================================================

export const ERROR_CODES = {
  // =============================================================================
  // AUTHENTICATION & AUTHORIZATION ERRORS
  // =============================================================================
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  INVALID_VERIFICATION_CODE: 'INVALID_VERIFICATION_CODE',
  VERIFICATION_CODE_EXPIRED: 'VERIFICATION_CODE_EXPIRED',
  PHONE_ALREADY_REGISTERED: 'PHONE_ALREADY_REGISTERED',
  PHONE_NOT_REGISTERED: 'PHONE_NOT_REGISTERED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  TOO_MANY_LOGIN_ATTEMPTS: 'TOO_MANY_LOGIN_ATTEMPTS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // =============================================================================
  // BUSINESS ERRORS
  // =============================================================================
  BUSINESS_ACCESS_DENIED: 'BUSINESS_ACCESS_DENIED',
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE: 'BUSINESS_INACTIVE',
  BUSINESS_CLOSED: 'BUSINESS_CLOSED',
  BUSINESS_NOT_VERIFIED: 'BUSINESS_NOT_VERIFIED',
  BUSINESS_SLUG_TAKEN: 'BUSINESS_SLUG_TAKEN',
  BUSINESS_OWNER_REQUIRED: 'BUSINESS_OWNER_REQUIRED',
  BUSINESS_STAFF_REQUIRED: 'BUSINESS_STAFF_REQUIRED',
  NO_BUSINESS_ACCESS: 'NO_BUSINESS_ACCESS',
  BUSINESS_SUBSCRIPTION_REQUIRED: 'BUSINESS_SUBSCRIPTION_REQUIRED',
  BUSINESS_LIMIT_REACHED: 'BUSINESS_LIMIT_REACHED',
  BUSINESS_DELETION_NOT_ALLOWED: 'BUSINESS_DELETION_NOT_ALLOWED',

  // =============================================================================
  // APPOINTMENT ERRORS
  // =============================================================================
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_ACCESS_DENIED: 'APPOINTMENT_ACCESS_DENIED',
  APPOINTMENT_TIME_CONFLICT: 'APPOINTMENT_TIME_CONFLICT',
  APPOINTMENT_PAST_DATE: 'APPOINTMENT_PAST_DATE',
  APPOINTMENT_TOO_FAR_FUTURE: 'APPOINTMENT_TOO_FAR_FUTURE',
  APPOINTMENT_OUTSIDE_HOURS: 'APPOINTMENT_OUTSIDE_HOURS',
  APPOINTMENT_ALREADY_CONFIRMED: 'APPOINTMENT_ALREADY_CONFIRMED',
  APPOINTMENT_ALREADY_COMPLETED: 'APPOINTMENT_ALREADY_COMPLETED',
  APPOINTMENT_ALREADY_CANCELLED: 'APPOINTMENT_ALREADY_CANCELLED',
  APPOINTMENT_CANNOT_CANCEL: 'APPOINTMENT_CANNOT_CANCEL',
  APPOINTMENT_NO_SHOW_NOT_ALLOWED: 'APPOINTMENT_NO_SHOW_NOT_ALLOWED',
  APPOINTMENT_STAFF_NOT_AVAILABLE: 'APPOINTMENT_STAFF_NOT_AVAILABLE',
  APPOINTMENT_SERVICE_UNAVAILABLE: 'APPOINTMENT_SERVICE_UNAVAILABLE',

  // =============================================================================
  // SERVICE ERRORS
  // =============================================================================
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  SERVICE_INACTIVE: 'SERVICE_INACTIVE',
  SERVICE_ACCESS_DENIED: 'SERVICE_ACCESS_DENIED',
  SERVICE_NAME_REQUIRED: 'SERVICE_NAME_REQUIRED',
  SERVICE_PRICE_INVALID: 'SERVICE_PRICE_INVALID',
  SERVICE_DURATION_INVALID: 'SERVICE_DURATION_INVALID',
  SERVICE_HAS_APPOINTMENTS: 'SERVICE_HAS_APPOINTMENTS',

  // =============================================================================
  // CUSTOMER ERRORS
  // =============================================================================
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_ACCESS_DENIED: 'CUSTOMER_ACCESS_DENIED',
  CUSTOMER_ALREADY_EXISTS: 'CUSTOMER_ALREADY_EXISTS',
  NO_CUSTOMERS_FOUND: 'NO_CUSTOMERS_FOUND',

  // =============================================================================
  // STAFF ERRORS
  // =============================================================================
  STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
  STAFF_ACCESS_DENIED: 'STAFF_ACCESS_DENIED',
  STAFF_ALREADY_EXISTS: 'STAFF_ALREADY_EXISTS',
  STAFF_NOT_AVAILABLE: 'STAFF_NOT_AVAILABLE',
  STAFF_CANNOT_DELETE_SELF: 'STAFF_CANNOT_DELETE_SELF',

  // =============================================================================
  // ROLE & PERMISSION ERRORS
  // =============================================================================
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  ROLE_ALREADY_EXISTS: 'ROLE_ALREADY_EXISTS',
  ROLE_ASSIGNMENT_FAILED: 'ROLE_ASSIGNMENT_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_NOT_FOUND: 'PERMISSION_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ADMIN_ROLE_REQUIRED: 'ADMIN_ROLE_REQUIRED',

  // =============================================================================
  // VALIDATION ERRORS
  // =============================================================================
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_FORMAT: 'INVALID_PHONE_FORMAT',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_TIME_FORMAT: 'INVALID_TIME_FORMAT',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_URL_FORMAT: 'INVALID_URL_FORMAT',

  // =============================================================================
  // SYSTEM ERRORS
  // =============================================================================
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PAYMENT_PROCESSING_ERROR: 'PAYMENT_PROCESSING_ERROR',

  // =============================================================================
  // SUBSCRIPTION ERRORS
  // =============================================================================
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',

  // =============================================================================
  // NOTIFICATION ERRORS
  // =============================================================================
  SMS_DELIVERY_FAILED: 'SMS_DELIVERY_FAILED',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  NOTIFICATION_DISABLED: 'NOTIFICATION_DISABLED',

  // Notification Messages
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  BUSINESS_CLOSURE_NOTICE: 'BUSINESS_CLOSURE_NOTICE',
  AVAILABILITY_ALERT: 'AVAILABILITY_ALERT',
  RESCHEDULE_NOTIFICATION: 'RESCHEDULE_NOTIFICATION',
  SUBSCRIPTION_RENEWAL_CONFIRMATION: 'SUBSCRIPTION_RENEWAL_CONFIRMATION',
  SUBSCRIPTION_RENEWAL_REMINDER: 'SUBSCRIPTION_RENEWAL_REMINDER',
  PAYMENT_FAILURE_NOTIFICATION: 'PAYMENT_FAILURE_NOTIFICATION',

} as const;

// =============================================================================
// TRANSLATION KEY MAPPINGS
// Frontend will use these keys to get Turkish translations
// =============================================================================

export const ERROR_TRANSLATION_KEYS = {
  // Authentication & Authorization
  [ERROR_CODES.UNAUTHORIZED]: 'errors.auth.unauthorized',
  [ERROR_CODES.INVALID_TOKEN]: 'errors.auth.invalidToken',
  [ERROR_CODES.TOKEN_EXPIRED]: 'errors.auth.tokenExpired',
  [ERROR_CODES.ACCESS_DENIED]: 'errors.auth.accessDenied',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'errors.auth.invalidCredentials',
  [ERROR_CODES.INVALID_PHONE_NUMBER]: 'errors.auth.invalidPhoneNumber',
  [ERROR_CODES.INVALID_VERIFICATION_CODE]: 'errors.auth.invalidVerificationCode',
  [ERROR_CODES.VERIFICATION_CODE_EXPIRED]: 'errors.auth.verificationCodeExpired',
  [ERROR_CODES.PHONE_ALREADY_REGISTERED]: 'errors.auth.phoneAlreadyRegistered',
  [ERROR_CODES.PHONE_NOT_REGISTERED]: 'errors.auth.phoneNotRegistered',
  [ERROR_CODES.ACCOUNT_DISABLED]: 'errors.auth.accountDisabled',
  [ERROR_CODES.ACCOUNT_NOT_VERIFIED]: 'errors.auth.accountNotVerified',
  [ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS]: 'errors.auth.tooManyLoginAttempts',
  [ERROR_CODES.SESSION_EXPIRED]: 'errors.auth.sessionExpired',

  // Business
  [ERROR_CODES.BUSINESS_ACCESS_DENIED]: 'errors.business.accessDenied',
  [ERROR_CODES.BUSINESS_NOT_FOUND]: 'errors.business.notFound',
  [ERROR_CODES.BUSINESS_INACTIVE]: 'errors.business.inactive',
  [ERROR_CODES.BUSINESS_CLOSED]: 'errors.business.closed',
  [ERROR_CODES.BUSINESS_NOT_VERIFIED]: 'errors.business.notVerified',
  [ERROR_CODES.BUSINESS_SLUG_TAKEN]: 'errors.business.slugTaken',
  [ERROR_CODES.BUSINESS_OWNER_REQUIRED]: 'errors.business.ownerRequired',
  [ERROR_CODES.BUSINESS_STAFF_REQUIRED]: 'errors.business.staffRequired',
  [ERROR_CODES.NO_BUSINESS_ACCESS]: 'errors.business.noAccess',
  [ERROR_CODES.BUSINESS_SUBSCRIPTION_REQUIRED]: 'errors.business.subscriptionRequired',
  [ERROR_CODES.BUSINESS_LIMIT_REACHED]: 'errors.business.limitReached',
  [ERROR_CODES.BUSINESS_DELETION_NOT_ALLOWED]: 'errors.business.deletionNotAllowed',

  // Appointments
  [ERROR_CODES.APPOINTMENT_NOT_FOUND]: 'errors.appointment.notFound',
  [ERROR_CODES.APPOINTMENT_ACCESS_DENIED]: 'errors.appointment.accessDenied',
  [ERROR_CODES.APPOINTMENT_TIME_CONFLICT]: 'errors.appointment.timeConflict',
  [ERROR_CODES.APPOINTMENT_PAST_DATE]: 'errors.appointment.pastDate',
  [ERROR_CODES.APPOINTMENT_TOO_FAR_FUTURE]: 'errors.appointment.tooFarFuture',
  [ERROR_CODES.APPOINTMENT_OUTSIDE_HOURS]: 'errors.appointment.outsideHours',
  [ERROR_CODES.APPOINTMENT_ALREADY_CONFIRMED]: 'errors.appointment.alreadyConfirmed',
  [ERROR_CODES.APPOINTMENT_ALREADY_COMPLETED]: 'errors.appointment.alreadyCompleted',
  [ERROR_CODES.APPOINTMENT_ALREADY_CANCELLED]: 'errors.appointment.alreadyCancelled',
  [ERROR_CODES.APPOINTMENT_CANNOT_CANCEL]: 'errors.appointment.cannotCancel',
  [ERROR_CODES.APPOINTMENT_NO_SHOW_NOT_ALLOWED]: 'errors.appointment.noShowNotAllowed',
  [ERROR_CODES.APPOINTMENT_STAFF_NOT_AVAILABLE]: 'errors.appointment.staffNotAvailable',
  [ERROR_CODES.APPOINTMENT_SERVICE_UNAVAILABLE]: 'errors.appointment.serviceUnavailable',

  // Services
  [ERROR_CODES.SERVICE_NOT_FOUND]: 'errors.service.notFound',
  [ERROR_CODES.SERVICE_INACTIVE]: 'errors.service.inactive',
  [ERROR_CODES.SERVICE_ACCESS_DENIED]: 'errors.service.accessDenied',
  [ERROR_CODES.SERVICE_NAME_REQUIRED]: 'errors.service.nameRequired',
  [ERROR_CODES.SERVICE_PRICE_INVALID]: 'errors.service.priceInvalid',
  [ERROR_CODES.SERVICE_DURATION_INVALID]: 'errors.service.durationInvalid',
  [ERROR_CODES.SERVICE_HAS_APPOINTMENTS]: 'errors.service.hasAppointments',

  // Customers
  [ERROR_CODES.CUSTOMER_NOT_FOUND]: 'errors.customer.notFound',
  [ERROR_CODES.CUSTOMER_ACCESS_DENIED]: 'errors.customer.accessDenied',
  [ERROR_CODES.CUSTOMER_ALREADY_EXISTS]: 'errors.customer.alreadyExists',
  [ERROR_CODES.NO_CUSTOMERS_FOUND]: 'errors.customer.noCustomersFound',

  // Staff
  [ERROR_CODES.STAFF_NOT_FOUND]: 'errors.staff.notFound',
  [ERROR_CODES.STAFF_ACCESS_DENIED]: 'errors.staff.accessDenied',
  [ERROR_CODES.STAFF_ALREADY_EXISTS]: 'errors.staff.alreadyExists',
  [ERROR_CODES.STAFF_NOT_AVAILABLE]: 'errors.staff.notAvailable',
  [ERROR_CODES.STAFF_CANNOT_DELETE_SELF]: 'errors.staff.cannotDeleteSelf',

  // Roles & Permissions
  [ERROR_CODES.ROLE_NOT_FOUND]: 'errors.role.notFound',
  [ERROR_CODES.ROLE_ALREADY_EXISTS]: 'errors.role.alreadyExists',
  [ERROR_CODES.ROLE_ASSIGNMENT_FAILED]: 'errors.role.assignmentFailed',
  [ERROR_CODES.PERMISSION_DENIED]: 'errors.permission.denied',
  [ERROR_CODES.PERMISSION_NOT_FOUND]: 'errors.permission.notFound',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'errors.permission.insufficient',
  [ERROR_CODES.ADMIN_ROLE_REQUIRED]: 'errors.permission.adminRequired',

  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 'errors.validation.general',
  [ERROR_CODES.REQUIRED_FIELD_MISSING]: 'errors.validation.requiredField',
  [ERROR_CODES.INVALID_EMAIL_FORMAT]: 'errors.validation.invalidEmail',
  [ERROR_CODES.INVALID_PHONE_FORMAT]: 'errors.validation.invalidPhone',
  [ERROR_CODES.INVALID_DATE_FORMAT]: 'errors.validation.invalidDate',
  [ERROR_CODES.INVALID_TIME_FORMAT]: 'errors.validation.invalidTime',
  [ERROR_CODES.PASSWORD_TOO_WEAK]: 'errors.validation.passwordTooWeak',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'errors.validation.invalidFileType',
  [ERROR_CODES.FILE_TOO_LARGE]: 'errors.validation.fileTooLarge',
  [ERROR_CODES.INVALID_URL_FORMAT]: 'errors.validation.invalidUrl',

  // System
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'errors.system.internalError',
  [ERROR_CODES.DATABASE_ERROR]: 'errors.system.databaseError',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'errors.system.externalServiceError',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'errors.system.rateLimitExceeded',
  [ERROR_CODES.MAINTENANCE_MODE]: 'errors.system.maintenanceMode',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'errors.system.serviceUnavailable',
  [ERROR_CODES.PAYMENT_PROCESSING_ERROR]: 'errors.system.paymentProcessingError',

  // Subscription
  [ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: 'errors.subscription.notFound',
  [ERROR_CODES.SUBSCRIPTION_EXPIRED]: 'errors.subscription.expired',
  [ERROR_CODES.SUBSCRIPTION_CANCELLED]: 'errors.subscription.cancelled',
  [ERROR_CODES.SUBSCRIPTION_REQUIRED]: 'errors.subscription.required',
  [ERROR_CODES.PLAN_LIMIT_REACHED]: 'errors.subscription.planLimitReached',

  // Notifications
  [ERROR_CODES.SMS_DELIVERY_FAILED]: 'errors.notification.smsDeliveryFailed',
  [ERROR_CODES.EMAIL_DELIVERY_FAILED]: 'errors.notification.emailDeliveryFailed',
  [ERROR_CODES.NOTIFICATION_DISABLED]: 'errors.notification.disabled',

  // Notification Messages
  [ERROR_CODES.APPOINTMENT_REMINDER]: 'notifications.appointmentReminder',
  [ERROR_CODES.BUSINESS_CLOSURE_NOTICE]: 'notifications.businessClosureNotice',
  [ERROR_CODES.AVAILABILITY_ALERT]: 'notifications.availabilityAlert',
  [ERROR_CODES.RESCHEDULE_NOTIFICATION]: 'notifications.rescheduleNotification',
  [ERROR_CODES.SUBSCRIPTION_RENEWAL_CONFIRMATION]: 'notifications.subscriptionRenewalConfirmation',
  [ERROR_CODES.SUBSCRIPTION_RENEWAL_REMINDER]: 'notifications.subscriptionRenewalReminder',
  [ERROR_CODES.PAYMENT_FAILURE_NOTIFICATION]: 'notifications.paymentFailureNotification',

} as const;

// =============================================================================
// ERROR CATEGORIES - Helps organize errors in the frontend
// =============================================================================

export const ERROR_CATEGORIES = {
  AUTH: 'auth',
  BUSINESS: 'business', 
  APPOINTMENT: 'appointment',
  SERVICE: 'service',
  CUSTOMER: 'customer',
  STAFF: 'staff',
  ROLE: 'role',
  VALIDATION: 'validation',
  SYSTEM: 'system',
  SUBSCRIPTION: 'subscription',
  NOTIFICATION: 'notification'
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ErrorCode = keyof typeof ERROR_CODES;
export type ErrorTranslationKey = typeof ERROR_TRANSLATION_KEYS[ErrorCode];
export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get translation key for an error code
 */
export function getTranslationKey(code: ErrorCode): ErrorTranslationKey {
  return ERROR_TRANSLATION_KEYS[code];
}

/**
 * Check if an error code exists
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return Object.values(ERROR_CODES).includes(code as ErrorCode);
}

/**
 * Get all error codes for a category
 */
export function getErrorCodesByCategory(category: ErrorCategory): ErrorCode[] {
  const prefix = category.toUpperCase();
  return Object.values(ERROR_CODES).filter(code => 
    code.startsWith(prefix)
  ) as ErrorCode[];
}