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
  SMS_QUOTA_EXCEEDED: 'SMS_QUOTA_EXCEEDED',
  STAFF_LIMIT_EXCEEDED: 'STAFF_LIMIT_EXCEEDED',
  SERVICE_LIMIT_EXCEEDED: 'SERVICE_LIMIT_EXCEEDED',
  CUSTOMER_LIMIT_EXCEEDED: 'CUSTOMER_LIMIT_EXCEEDED',

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
  /** Booking earlier than business/service minimum advance (hours) */
  APPOINTMENT_INSUFFICIENT_ADVANCE: 'APPOINTMENT_INSUFFICIENT_ADVANCE',
  /** Business reached max appointments for that calendar day */
  APPOINTMENT_DAILY_LIMIT_REACHED: 'APPOINTMENT_DAILY_LIMIT_REACHED',
  /** Cancellation / no-show policy blocks new booking (e.g. daily cancel cap) */
  APPOINTMENT_BOOKING_POLICY_VIOLATION: 'APPOINTMENT_BOOKING_POLICY_VIOLATION',
  APPOINTMENT_NOT_PENDING_APPROVAL: 'APPOINTMENT_NOT_PENDING_APPROVAL',

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
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  BATCH_SIZE_EXCEEDED: 'BATCH_SIZE_EXCEEDED',

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
  // DISCOUNT CODE ERRORS
  // =============================================================================
  DISCOUNT_CODE_NOT_FOUND: 'DISCOUNT_CODE_NOT_FOUND',

  // =============================================================================
  // PAYMENT ERRORS
  // =============================================================================
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_METHOD_NOT_FOUND: 'PAYMENT_METHOD_NOT_FOUND',

  // =============================================================================
  // PUSH NOTIFICATION ERRORS
  // =============================================================================
  PUSH_SUBSCRIPTION_NOT_FOUND: 'PUSH_SUBSCRIPTION_NOT_FOUND',

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

  // =============================================================================
  // RESOURCE ERRORS
  // =============================================================================
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

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
  [ERROR_CODES.SMS_QUOTA_EXCEEDED]: 'errors.business.smsQuotaExceeded',
  [ERROR_CODES.STAFF_LIMIT_EXCEEDED]: 'errors.business.staffLimitExceeded',
  [ERROR_CODES.SERVICE_LIMIT_EXCEEDED]: 'errors.business.serviceLimitExceeded',
  [ERROR_CODES.CUSTOMER_LIMIT_EXCEEDED]: 'errors.business.customerLimitExceeded',

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
  [ERROR_CODES.APPOINTMENT_INSUFFICIENT_ADVANCE]: 'errors.appointment.insufficientAdvance',
  [ERROR_CODES.APPOINTMENT_DAILY_LIMIT_REACHED]: 'errors.appointment.dailyLimitReached',
  [ERROR_CODES.APPOINTMENT_BOOKING_POLICY_VIOLATION]: 'errors.appointment.bookingPolicyViolation',
  [ERROR_CODES.APPOINTMENT_NOT_PENDING_APPROVAL]: 'errors.appointment.notPendingApproval',

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
  [ERROR_CODES.INVALID_ID_FORMAT]: 'errors.validation.invalidIdFormat',
  [ERROR_CODES.BATCH_SIZE_EXCEEDED]: 'errors.validation.batchSizeExceeded',

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

  // Discount Code
  [ERROR_CODES.DISCOUNT_CODE_NOT_FOUND]: 'errors.discountCode.notFound',

  // Payment
  [ERROR_CODES.PAYMENT_NOT_FOUND]: 'errors.payment.notFound',
  [ERROR_CODES.PAYMENT_METHOD_NOT_FOUND]: 'errors.payment.methodNotFound',

  // Push Notification
  [ERROR_CODES.PUSH_SUBSCRIPTION_NOT_FOUND]: 'errors.push.subscriptionNotFound',

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

  // Resource
  [ERROR_CODES.RESOURCE_CONFLICT]: 'errors.system.resourceConflict',

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
// ERROR CATALOG — single source of truth for code → status / i18n key / severity
// =============================================================================

export interface CatalogEntry {
  status: number;
  key: string;
  severity: 'warn' | 'error';
}

export const ERROR_CATALOG: Record<string, CatalogEntry> = {
  // ── Authentication & Authorization ──────────────────────────────────────
  UNAUTHORIZED:                { status: 401, key: 'errors.auth.unauthorized',            severity: 'warn'  },
  INVALID_TOKEN:               { status: 401, key: 'errors.auth.invalidToken',             severity: 'warn'  },
  TOKEN_EXPIRED:               { status: 401, key: 'errors.auth.tokenExpired',             severity: 'warn'  },
  ACCESS_DENIED:               { status: 403, key: 'errors.auth.accessDenied',             severity: 'warn'  },
  INVALID_CREDENTIALS:         { status: 401, key: 'errors.auth.invalidCredentials',       severity: 'warn'  },
  INVALID_PHONE_NUMBER:        { status: 422, key: 'errors.auth.invalidPhoneNumber',       severity: 'warn'  },
  INVALID_VERIFICATION_CODE:   { status: 422, key: 'errors.auth.invalidVerificationCode',  severity: 'warn'  },
  VERIFICATION_CODE_EXPIRED:   { status: 422, key: 'errors.auth.verificationCodeExpired',  severity: 'warn'  },
  PHONE_ALREADY_REGISTERED:    { status: 409, key: 'errors.auth.phoneAlreadyRegistered',   severity: 'warn'  },
  PHONE_NOT_REGISTERED:        { status: 404, key: 'errors.auth.phoneNotRegistered',       severity: 'warn'  },
  ACCOUNT_DISABLED:            { status: 403, key: 'errors.auth.accountDisabled',           severity: 'warn'  },
  ACCOUNT_NOT_VERIFIED:        { status: 403, key: 'errors.auth.accountNotVerified',        severity: 'warn'  },
  TOO_MANY_LOGIN_ATTEMPTS:     { status: 429, key: 'errors.auth.tooManyLoginAttempts',      severity: 'warn'  },
  SESSION_EXPIRED:             { status: 401, key: 'errors.auth.sessionExpired',            severity: 'warn'  },

  // Legacy BaseError enum aliases (same semantics, different code strings)
  TOKEN_INVALID:               { status: 401, key: 'errors.auth.invalidToken',             severity: 'warn'  },
  REFRESH_TOKEN_INVALID:       { status: 401, key: 'errors.auth.refreshTokenInvalid',      severity: 'warn'  },
  FORBIDDEN:                   { status: 403, key: 'errors.auth.accessDenied',             severity: 'warn'  },

  // ── User ────────────────────────────────────────────────────────────────
  USER_NOT_FOUND:              { status: 404, key: 'errors.user.notFound',                  severity: 'warn'  },
  USER_ALREADY_EXISTS:         { status: 409, key: 'errors.user.alreadyExists',             severity: 'warn'  },
  USER_LOCKED:                 { status: 423, key: 'errors.user.locked',                    severity: 'warn'  },
  USER_DEACTIVATED:            { status: 403, key: 'errors.user.deactivated',               severity: 'warn'  },
  USER_NOT_VERIFIED:           { status: 403, key: 'errors.user.notVerified',               severity: 'warn'  },

  // ── Phone Verification (BaseError enum aliases) ─────────────────────────
  PHONE_INVALID:               { status: 422, key: 'errors.auth.invalidPhoneNumber',       severity: 'warn'  },
  PHONE_ALREADY_EXISTS:        { status: 409, key: 'errors.auth.phoneAlreadyRegistered',   severity: 'warn'  },
  VERIFICATION_CODE_INVALID:   { status: 422, key: 'errors.auth.invalidVerificationCode',  severity: 'warn'  },
  VERIFICATION_CODE_NOT_FOUND: { status: 404, key: 'errors.auth.verificationCodeNotFound', severity: 'warn'  },
  VERIFICATION_MAX_ATTEMPTS:   { status: 429, key: 'errors.auth.verificationMaxAttempts',  severity: 'warn'  },

  // ── Rate Limiting (BaseError enum aliases) ──────────────────────────────
  TOO_MANY_REQUESTS:           { status: 429, key: 'errors.system.rateLimitExceeded',      severity: 'warn'  },
  COOLDOWN_ACTIVE:             { status: 429, key: 'errors.system.cooldownActive',          severity: 'warn'  },
  DAILY_LIMIT_EXCEEDED:        { status: 429, key: 'errors.system.dailyLimitExceeded',      severity: 'warn'  },

  // ── Business ────────────────────────────────────────────────────────────
  BUSINESS_ACCESS_DENIED:      { status: 403, key: 'errors.business.accessDenied',         severity: 'warn'  },
  BUSINESS_NOT_FOUND:          { status: 404, key: 'errors.business.notFound',              severity: 'warn'  },
  BUSINESS_TYPE_NOT_FOUND:     { status: 404, key: 'errors.businessType.notFound',          severity: 'warn'  },
  BUSINESS_INACTIVE:           { status: 422, key: 'errors.business.inactive',              severity: 'warn'  },
  BUSINESS_CLOSED:             { status: 422, key: 'errors.business.closed',                severity: 'warn'  },
  BUSINESS_NOT_VERIFIED:       { status: 403, key: 'errors.business.notVerified',           severity: 'warn'  },
  BUSINESS_SLUG_TAKEN:         { status: 409, key: 'errors.business.slugTaken',             severity: 'warn'  },
  BUSINESS_OWNER_REQUIRED:     { status: 403, key: 'errors.business.ownerRequired',         severity: 'warn'  },
  BUSINESS_STAFF_REQUIRED:     { status: 403, key: 'errors.business.staffRequired',          severity: 'warn'  },
  NO_BUSINESS_ACCESS:          { status: 403, key: 'errors.business.noAccess',               severity: 'warn'  },
  BUSINESS_SUBSCRIPTION_REQUIRED: { status: 403, key: 'errors.business.subscriptionRequired', severity: 'warn' },
  BUSINESS_LIMIT_REACHED:      { status: 403, key: 'errors.business.limitReached',           severity: 'warn'  },
  BUSINESS_DELETION_NOT_ALLOWED: { status: 422, key: 'errors.business.deletionNotAllowed',   severity: 'warn'  },
  SMS_QUOTA_EXCEEDED:          { status: 403, key: 'errors.business.smsQuotaExceeded',       severity: 'warn'  },
  STAFF_LIMIT_EXCEEDED:        { status: 403, key: 'errors.business.staffLimitExceeded',     severity: 'warn'  },
  SERVICE_LIMIT_EXCEEDED:      { status: 403, key: 'errors.business.serviceLimitExceeded',   severity: 'warn'  },
  CUSTOMER_LIMIT_EXCEEDED:     { status: 403, key: 'errors.business.customerLimitExceeded',  severity: 'warn'  },
  STORAGE_LIMIT_EXCEEDED:      { status: 403, key: 'errors.business.storageLimitExceeded',  severity: 'warn'  },
  PHOTO_NOT_FOUND:             { status: 404, key: 'errors.business.photoNotFound',         severity: 'warn'  },
  BUSINESS_RULE_VIOLATION:     { status: 422, key: 'errors.business.ruleViolation',           severity: 'warn'  },
  CLOSURE_START_IN_PAST:       { status: 422, key: 'errors.business.closureStartInPast',     severity: 'warn'  },
  CLOSURE_END_BEFORE_START:    { status: 422, key: 'errors.business.closureEndBeforeStart',  severity: 'warn'  },
  CLOSURE_CONFLICT:            { status: 409, key: 'errors.business.closureConflict',        severity: 'warn'  },
  CLOSURE_NOT_FOUND:           { status: 404, key: 'errors.business.closureNotFound',       severity: 'warn'  },

  // ── Appointment ─────────────────────────────────────────────────────────
  APPOINTMENT_NOT_FOUND:       { status: 404, key: 'errors.appointment.notFound',           severity: 'warn'  },
  APPOINTMENT_ACCESS_DENIED:   { status: 403, key: 'errors.appointment.accessDenied',       severity: 'warn'  },
  APPOINTMENT_TIME_CONFLICT:   { status: 409, key: 'errors.appointment.timeConflict',       severity: 'warn'  },
  APPOINTMENT_PAST_DATE:       { status: 422, key: 'errors.appointment.pastDate',            severity: 'warn'  },
  APPOINTMENT_TOO_FAR_FUTURE:  { status: 422, key: 'errors.appointment.tooFarFuture',       severity: 'warn'  },
  APPOINTMENT_OUTSIDE_HOURS:   { status: 422, key: 'errors.appointment.outsideHours',        severity: 'warn'  },
  APPOINTMENT_ALREADY_CONFIRMED: { status: 409, key: 'errors.appointment.alreadyConfirmed', severity: 'warn'  },
  APPOINTMENT_ALREADY_COMPLETED: { status: 409, key: 'errors.appointment.alreadyCompleted', severity: 'warn'  },
  APPOINTMENT_ALREADY_CANCELLED: { status: 409, key: 'errors.appointment.alreadyCancelled', severity: 'warn'  },
  APPOINTMENT_CANNOT_CANCEL:   { status: 422, key: 'errors.appointment.cannotCancel',        severity: 'warn'  },
  APPOINTMENT_NO_SHOW_NOT_ALLOWED: { status: 422, key: 'errors.appointment.noShowNotAllowed', severity: 'warn' },
  APPOINTMENT_STAFF_NOT_AVAILABLE: { status: 422, key: 'errors.appointment.staffNotAvailable', severity: 'warn' },
  APPOINTMENT_SERVICE_UNAVAILABLE: { status: 422, key: 'errors.appointment.serviceUnavailable', severity: 'warn' },
  APPOINTMENT_INSUFFICIENT_ADVANCE: { status: 422, key: 'errors.appointment.insufficientAdvance', severity: 'warn' },
  APPOINTMENT_DAILY_LIMIT_REACHED: { status: 422, key: 'errors.appointment.dailyLimitReached', severity: 'warn' },
  APPOINTMENT_BOOKING_POLICY_VIOLATION: { status: 422, key: 'errors.appointment.bookingPolicyViolation', severity: 'warn' },
  APPOINTMENT_NOT_PENDING_APPROVAL: { status: 422, key: 'errors.appointment.notPendingApproval', severity: 'warn' },

  // ── Service ─────────────────────────────────────────────────────────────
  SERVICE_NOT_FOUND:           { status: 404, key: 'errors.service.notFound',               severity: 'warn'  },
  SERVICE_INACTIVE:            { status: 422, key: 'errors.service.inactive',                severity: 'warn'  },
  SERVICE_ACCESS_DENIED:       { status: 403, key: 'errors.service.accessDenied',            severity: 'warn'  },
  SERVICE_NAME_REQUIRED:       { status: 422, key: 'errors.service.nameRequired',            severity: 'warn'  },
  SERVICE_PRICE_INVALID:       { status: 422, key: 'errors.service.priceInvalid',            severity: 'warn'  },
  SERVICE_DURATION_INVALID:    { status: 422, key: 'errors.service.durationInvalid',         severity: 'warn'  },
  SERVICE_HAS_APPOINTMENTS:    { status: 422, key: 'errors.service.hasAppointments',         severity: 'warn'  },

  // ── Customer ────────────────────────────────────────────────────────────
  CUSTOMER_NOT_FOUND:          { status: 404, key: 'errors.customer.notFound',               severity: 'warn'  },
  CUSTOMER_ACCESS_DENIED:      { status: 403, key: 'errors.customer.accessDenied',           severity: 'warn'  },
  CUSTOMER_ALREADY_EXISTS:     { status: 409, key: 'errors.customer.alreadyExists',          severity: 'warn'  },
  NO_CUSTOMERS_FOUND:          { status: 404, key: 'errors.customer.noCustomersFound',       severity: 'warn'  },
  CUSTOMER_PROFILE_INCOMPLETE: { status: 422, key: 'errors.customer.profileIncomplete',     severity: 'warn'  },

  // ── Staff ───────────────────────────────────────────────────────────────
  STAFF_NOT_FOUND:             { status: 404, key: 'errors.staff.notFound',                  severity: 'warn'  },
  STAFF_ACCESS_DENIED:         { status: 403, key: 'errors.staff.accessDenied',              severity: 'warn'  },
  STAFF_ALREADY_EXISTS:        { status: 409, key: 'errors.staff.alreadyExists',             severity: 'warn'  },
  STAFF_NOT_AVAILABLE:         { status: 422, key: 'errors.staff.notAvailable',              severity: 'warn'  },
  STAFF_CANNOT_DELETE_SELF:    { status: 422, key: 'errors.staff.cannotDeleteSelf',          severity: 'warn'  },

  // ── Roles & Permissions ─────────────────────────────────────────────────
  ROLE_NOT_FOUND:              { status: 404, key: 'errors.role.notFound',                   severity: 'warn'  },
  ROLE_ALREADY_EXISTS:         { status: 409, key: 'errors.role.alreadyExists',              severity: 'warn'  },
  ROLE_ASSIGNMENT_FAILED:      { status: 422, key: 'errors.role.assignmentFailed',           severity: 'warn'  },
  PERMISSION_DENIED:           { status: 403, key: 'errors.permission.denied',               severity: 'warn'  },
  PERMISSION_NOT_FOUND:        { status: 404, key: 'errors.permission.notFound',             severity: 'warn'  },
  INSUFFICIENT_PERMISSIONS:    { status: 403, key: 'errors.permission.insufficient',         severity: 'warn'  },
  ADMIN_ROLE_REQUIRED:         { status: 403, key: 'errors.permission.adminRequired',        severity: 'warn'  },

  // ── Validation ──────────────────────────────────────────────────────────
  VALIDATION_ERROR:            { status: 422, key: 'errors.validation.general',              severity: 'warn'  },
  REQUIRED_FIELD_MISSING:      { status: 422, key: 'errors.validation.requiredField',        severity: 'warn'  },
  INVALID_EMAIL_FORMAT:        { status: 422, key: 'errors.validation.invalidEmail',         severity: 'warn'  },
  INVALID_PHONE_FORMAT:        { status: 422, key: 'errors.validation.invalidPhone',         severity: 'warn'  },
  INVALID_DATE_FORMAT:         { status: 422, key: 'errors.validation.invalidDate',          severity: 'warn'  },
  INVALID_TIME_FORMAT:         { status: 422, key: 'errors.validation.invalidTime',          severity: 'warn'  },
  PASSWORD_TOO_WEAK:           { status: 422, key: 'errors.validation.passwordTooWeak',      severity: 'warn'  },
  INVALID_FILE_TYPE:           { status: 422, key: 'errors.validation.invalidFileType',      severity: 'warn'  },
  FILE_TOO_LARGE:              { status: 422, key: 'errors.validation.fileTooLarge',         severity: 'warn'  },
  INVALID_URL_FORMAT:          { status: 422, key: 'errors.validation.invalidUrl',           severity: 'warn'  },
  INVALID_INPUT:               { status: 422, key: 'errors.validation.invalidInput',         severity: 'warn'  },
  MISSING_REQUIRED_FIELD:      { status: 422, key: 'errors.validation.requiredField',        severity: 'warn'  },
  INVALID_FORMAT:              { status: 422, key: 'errors.validation.invalidFormat',        severity: 'warn'  },
  INVALID_ID_FORMAT:           { status: 400, key: 'errors.validation.invalidIdFormat',     severity: 'warn'  },
  BATCH_SIZE_EXCEEDED:         { status: 400, key: 'errors.validation.batchSizeExceeded',   severity: 'warn'  },

  // ── System ──────────────────────────────────────────────────────────────
  INTERNAL_SERVER_ERROR:       { status: 500, key: 'errors.system.internalError',            severity: 'error' },
  DATABASE_ERROR:              { status: 500, key: 'errors.system.databaseError',            severity: 'error' },
  EXTERNAL_SERVICE_ERROR:      { status: 503, key: 'errors.system.externalServiceError',     severity: 'error' },
  RATE_LIMIT_EXCEEDED:         { status: 429, key: 'errors.system.rateLimitExceeded',        severity: 'warn'  },
  MAINTENANCE_MODE:            { status: 503, key: 'errors.system.maintenanceMode',          severity: 'warn'  },
  SERVICE_UNAVAILABLE:         { status: 503, key: 'errors.system.serviceUnavailable',       severity: 'warn'  },
  PAYMENT_PROCESSING_ERROR:    { status: 402, key: 'errors.system.paymentProcessingError',   severity: 'error' },
  CONFIGURATION_ERROR:         { status: 500, key: 'errors.system.configurationError',       severity: 'error' },
  ROUTE_NOT_FOUND:             { status: 404, key: 'errors.system.routeNotFound',            severity: 'warn'  },
  RESOURCE_CONFLICT:           { status: 409, key: 'errors.system.resourceConflict',         severity: 'warn'  },
  OPERATION_NOT_ALLOWED:       { status: 403, key: 'errors.system.operationNotAllowed',      severity: 'warn'  },

  // ── Subscription ────────────────────────────────────────────────────────
  SUBSCRIPTION_NOT_FOUND:      { status: 404, key: 'errors.subscription.notFound',           severity: 'warn'  },
  SUBSCRIPTION_EXPIRED:        { status: 403, key: 'errors.subscription.expired',            severity: 'warn'  },
  SUBSCRIPTION_CANCELLED:      { status: 403, key: 'errors.subscription.cancelled',          severity: 'warn'  },
  SUBSCRIPTION_REQUIRED:       { status: 403, key: 'errors.subscription.required',           severity: 'warn'  },
  PLAN_LIMIT_REACHED:          { status: 403, key: 'errors.subscription.planLimitReached',   severity: 'warn'  },

  // ── Discount Code ───────────────────────────────────────────────────────
  DISCOUNT_CODE_NOT_FOUND:     { status: 404, key: 'errors.discountCode.notFound',          severity: 'warn'  },

  // ── Payment ─────────────────────────────────────────────────────────────
  PAYMENT_NOT_FOUND:           { status: 404, key: 'errors.payment.notFound',              severity: 'warn'  },
  PAYMENT_METHOD_NOT_FOUND:    { status: 404, key: 'errors.payment.methodNotFound',        severity: 'warn'  },

  // ── Push Notification ───────────────────────────────────────────────────
  PUSH_SUBSCRIPTION_NOT_FOUND: { status: 404, key: 'errors.push.subscriptionNotFound',     severity: 'warn'  },

  // ── Notification (errors) ───────────────────────────────────────────────
  SMS_DELIVERY_FAILED:         { status: 500, key: 'errors.notification.smsDeliveryFailed',  severity: 'error' },
  EMAIL_DELIVERY_FAILED:       { status: 500, key: 'errors.notification.emailDeliveryFailed', severity: 'error' },
  NOTIFICATION_DISABLED:       { status: 422, key: 'errors.notification.disabled',            severity: 'warn'  },

  // ── Notification Messages (not errors — kept for backward compat) ──────
  APPOINTMENT_REMINDER:                 { status: 200, key: 'notifications.appointmentReminder',               severity: 'warn' },
  BUSINESS_CLOSURE_NOTICE:              { status: 200, key: 'notifications.businessClosureNotice',             severity: 'warn' },
  AVAILABILITY_ALERT:                   { status: 200, key: 'notifications.availabilityAlert',                 severity: 'warn' },
  RESCHEDULE_NOTIFICATION:              { status: 200, key: 'notifications.rescheduleNotification',            severity: 'warn' },
  SUBSCRIPTION_RENEWAL_CONFIRMATION:    { status: 200, key: 'notifications.subscriptionRenewalConfirmation',   severity: 'warn' },
  SUBSCRIPTION_RENEWAL_REMINDER:        { status: 200, key: 'notifications.subscriptionRenewalReminder',       severity: 'warn' },
  PAYMENT_FAILURE_NOTIFICATION:         { status: 200, key: 'notifications.paymentFailureNotification',        severity: 'warn' },
} as const;

export type CatalogCode = keyof typeof ERROR_CATALOG;

export function getCatalogEntry(code: string): CatalogEntry | undefined {
  return ERROR_CATALOG[code];
}

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