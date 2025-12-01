// Base Error Types
export enum ErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // User Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_LOCKED = 'USER_LOCKED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_NOT_VERIFIED = 'USER_NOT_VERIFIED',
  
  // Phone Verification Errors
  PHONE_INVALID = 'PHONE_INVALID',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  VERIFICATION_CODE_INVALID = 'VERIFICATION_CODE_INVALID',
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED',
  VERIFICATION_CODE_NOT_FOUND = 'VERIFICATION_CODE_NOT_FOUND',
  VERIFICATION_MAX_ATTEMPTS = 'VERIFICATION_MAX_ATTEMPTS',
  
  // Rate Limiting Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',

  // Business Logic Errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
}

// ErrorContext contains sensitive information and should ONLY be used for server-side logging
// NEVER expose ErrorContext data to client responses
export interface ErrorContext {
  userId?: string;
  phoneNumber?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  timestamp?: Date;
  endpoint?: string;
  method?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorDetails {
  field?: string;
  value?: any; // WARNING: may contain sensitive data - filter out in client responses
  constraint?: string;
  attemptCount?: number;
  maxAttempts?: number;
  retryAfter?: number;
  cooldownSeconds?: number;
  suggestions?: string[];
  additionalData?: Record<string, unknown>; // WARNING: may contain sensitive data - filter out in client responses
}

// Base Application Error
export abstract class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;
  public readonly details?: ErrorDetails;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    isOperational: boolean = true,
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.context = context;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.constructor.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      // Note: context and stack removed for security - these should only be logged server-side
    };
  }
}

// Authentication Errors
export class AuthenticationError extends BaseError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 401, code, true, context, details);
  }
}

export class UnauthorizedError extends AuthenticationError {
  constructor(message: string = 'Unauthorized access', context?: ErrorContext) {
    super(message, ErrorCode.UNAUTHORIZED, context);
  }
}

export class ForbiddenError extends BaseError {
  constructor(
    message: string = 'Forbidden access',
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 403, ErrorCode.FORBIDDEN, true, context, details);
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(message: string = 'Token has expired', context?: ErrorContext) {
    super(message, ErrorCode.TOKEN_EXPIRED, context);
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(message: string = 'Invalid token', context?: ErrorContext) {
    super(message, ErrorCode.TOKEN_INVALID, context);
  }
}

// User Errors
export class UserNotFoundError extends BaseError {
  constructor(
    message: string = 'User not found',
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 404, ErrorCode.USER_NOT_FOUND, true, context, details);
  }
}

export class UserAlreadyExistsError extends BaseError {
  constructor(
    message: string = 'User already exists',
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 409, ErrorCode.USER_ALREADY_EXISTS, true, context, details);
  }
}

export class UserLockedError extends BaseError {
  constructor(
    message: string = 'User account is locked',
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 423, ErrorCode.USER_LOCKED, true, context, details);
  }
}

export class UserDeactivatedError extends BaseError {
  constructor(
    message: string = 'User account is deactivated',
    context?: ErrorContext
  ) {
    super(message, 403, ErrorCode.USER_DEACTIVATED, true, context);
  }
}

export class UserNotVerifiedError extends ForbiddenError {
  constructor(
    message: string = 'Phone number verification required',
    context?: ErrorContext
  ) {
    super(message, context, { suggestions: ['Please verify your phone number'] });
  }
}

// Phone Verification Errors
export class PhoneVerificationError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 400,
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, statusCode, code, true, context, details);
  }
}

export class InvalidPhoneNumberError extends PhoneVerificationError {
  constructor(phoneNumber: string, context?: ErrorContext) {
    super(
      'Invalid phone number format',
      ErrorCode.PHONE_INVALID,
      400,
      context,
      {
        field: 'phoneNumber',
        value: phoneNumber,
        suggestions: ['Please provide a valid phone number with country code'],
      }
    );
  }
}

export class PhoneAlreadyExistsError extends PhoneVerificationError {
  constructor(context?: ErrorContext) {
    super(
      'Phone number is already registered',
      ErrorCode.PHONE_ALREADY_EXISTS,
      409,
      context
    );
  }
}

export class VerificationCodeInvalidError extends PhoneVerificationError {
  constructor(attemptsRemaining?: number, context?: ErrorContext) {
    super(
      'Invalid verification code',
      ErrorCode.VERIFICATION_CODE_INVALID,
      400,
      context,
      {
        attemptCount: attemptsRemaining !== undefined ? (3 - attemptsRemaining) : undefined,
        maxAttempts: 3,
        suggestions: attemptsRemaining === 0 
          ? ['Request a new verification code'] 
          : ['Please check the code and try again'],
      }
    );
  }
}

export class VerificationCodeExpiredError extends PhoneVerificationError {
  constructor(context?: ErrorContext) {
    super(
      'Verification code has expired',
      ErrorCode.VERIFICATION_CODE_EXPIRED,
      400,
      context,
      {
        suggestions: ['Request a new verification code'],
      }
    );
  }
}

export class VerificationMaxAttemptsError extends PhoneVerificationError {
  constructor(retryAfter?: number, context?: ErrorContext) {
    super(
      'Maximum verification attempts exceeded',
      ErrorCode.VERIFICATION_MAX_ATTEMPTS,
      429,
      context,
      {
        retryAfter,
        suggestions: ['Request a new verification code'],
      }
    );
  }
}

// Rate Limiting Errors
export class RateLimitError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    retryAfter?: number,
    context?: ErrorContext
  ) {
    super(
      message,
      429,
      code,
      true,
      context,
      {
        retryAfter,
        suggestions: [`Please wait ${retryAfter} seconds before trying again`],
      }
    );
  }
}

export class TooManyRequestsError extends RateLimitError {
  constructor(retryAfter?: number, context?: ErrorContext) {
    super(
      'Too many requests',
      ErrorCode.TOO_MANY_REQUESTS,
      retryAfter,
      context
    );
  }
}

export class CooldownActiveError extends RateLimitError {
  constructor(cooldownSeconds: number, context?: ErrorContext) {
    super(
      'Please wait before requesting again',
      ErrorCode.COOLDOWN_ACTIVE,
      cooldownSeconds,
      context
    );
  }
}

export class DailyLimitExceededError extends RateLimitError {
  constructor(context?: ErrorContext) {
    super(
      'Daily request limit exceeded',
      ErrorCode.DAILY_LIMIT_EXCEEDED,
      undefined,
      context
    );
  }
}

// Validation Errors
export class ValidationError extends BaseError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: ErrorContext
  ) {
    super(
      message,
      400,
      ErrorCode.VALIDATION_ERROR,
      true,
      context,
      {
        field,
        value,
        suggestions: ['Please check your input and try again'],
      }
    );
  }
}

export class InvalidInputError extends ValidationError {
  constructor(field: string, value: any, constraint: string, context?: ErrorContext) {
    super(
      `Invalid ${field}: ${constraint}`,
      field,
      value,
      context
    );
  }
}

export class MissingRequiredFieldError extends ValidationError {
  constructor(field: string, context?: ErrorContext) {
    super(
      `Missing required field: ${field}`,
      field,
      undefined,
      context
    );
  }
}

// System Errors
export class InternalServerError extends BaseError {
  constructor(
    message: string = 'Internal server error',
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, false, context, {
      additionalData: originalError ? { originalError: originalError.message } : undefined,
    });
  }
}

export class DatabaseError extends BaseError {
  constructor(
    message: string = 'Database operation failed',
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(message, 500, ErrorCode.DATABASE_ERROR, false, context, {
      additionalData: originalError ? { originalError: originalError.message } : undefined,
    });
  }
}

export class ExternalServiceError extends BaseError {
  constructor(
    serviceName: string,
    message: string = 'External service error',
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(`${serviceName}: ${message}`, 503, ErrorCode.EXTERNAL_SERVICE_ERROR, true, context, {
      additionalData: { serviceName, originalError: originalError?.message },
    });
  }
}

export class ConfigurationError extends BaseError {
  constructor(
    configKey: string,
    message: string = 'Configuration error',
    context?: ErrorContext
  ) {
    super(
      `Configuration error: ${configKey} - ${message}`,
      500,
      ErrorCode.CONFIGURATION_ERROR,
      false,
      context,
      {
        additionalData: { configKey },
      }
    );
  }
}

// Business Logic Errors
export class BusinessRuleViolationError extends BaseError {
  constructor(
    rule: string,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(
      message,
      422,
      ErrorCode.BUSINESS_RULE_VIOLATION,
      true,
      context,
      {
        ...details,
        additionalData: { rule },
      }
    );
  }
}

export class ResourceConflictError extends BaseError {
  constructor(
    resource: string,
    message: string,
    context?: ErrorContext
  ) {
    super(
      message,
      409,
      ErrorCode.RESOURCE_CONFLICT,
      true,
      context,
      {
        additionalData: { resource },
      }
    );
  }
}

export class OperationNotAllowedError extends BaseError {
  constructor(
    operation: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      `Operation '${operation}' not allowed: ${reason}`,
      403,
      ErrorCode.OPERATION_NOT_ALLOWED,
      true,
      context,
      {
        additionalData: { operation, reason },
      }
    );
  }
}

// Error Factory
export class ErrorFactory {
  static createAuthenticationError(
    type: 'invalid_credentials' | 'token_expired' | 'token_invalid' | 'unauthorized',
    context?: ErrorContext
  ): AuthenticationError {
    switch (type) {
      case 'invalid_credentials':
        return new AuthenticationError('Invalid credentials', ErrorCode.INVALID_CREDENTIALS, context);
      case 'token_expired':
        return new TokenExpiredError('Token has expired', context);
      case 'token_invalid':
        return new InvalidTokenError('Invalid token', context);
      case 'unauthorized':
        return new UnauthorizedError('Unauthorized access', context);
      default:
        return new AuthenticationError('Authentication failed', ErrorCode.UNAUTHORIZED, context);
    }
  }

  static createValidationError(
    field: string,
    value: any,
    constraint: string,
    context?: ErrorContext
  ): ValidationError {
    return new InvalidInputError(field, value, constraint, context);
  }

  static createRateLimitError(
    type: 'requests' | 'cooldown' | 'daily_limit',
    retryAfter?: number,
    context?: ErrorContext
  ): RateLimitError {
    switch (type) {
      case 'requests':
        return new TooManyRequestsError(retryAfter, context);
      case 'cooldown':
        return new CooldownActiveError(retryAfter || 0, context);
      case 'daily_limit':
        return new DailyLimitExceededError(context);
      default:
        return new TooManyRequestsError(retryAfter, context);
    }
  }
}

// Utility function to create secure error responses
export const createSecureErrorResponse = (error: BaseError) => {
  const safeDetails: any = {};
  
  if (error.details) {
    // Only include safe fields - explicitly exclude sensitive data
    if (error.details.field) safeDetails.field = error.details.field;
    if (error.details.suggestions) safeDetails.suggestions = error.details.suggestions;
    if (error.details.attemptCount !== undefined) safeDetails.attemptCount = error.details.attemptCount;
    if (error.details.maxAttempts !== undefined) safeDetails.maxAttempts = error.details.maxAttempts;
    if (error.details.retryAfter !== undefined) safeDetails.retryAfter = error.details.retryAfter;
    if (error.details.cooldownSeconds !== undefined) safeDetails.cooldownSeconds = error.details.cooldownSeconds;
    // NOTE: value and additionalData are intentionally excluded for security
  }

  return {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      requestId: error.context?.requestId,
      ...(Object.keys(safeDetails).length > 0 && { details: safeDetails }),
    },
  };
};

// Error Type Guards
export const isOperationalError = (error: any): error is BaseError => {
  return error instanceof BaseError && error.isOperational;
};

export const isAuthenticationError = (error: any): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isRateLimitError = (error: any): error is RateLimitError => {
  return error instanceof RateLimitError;
};

export const isSystemError = (error: any): error is InternalServerError | DatabaseError | ExternalServiceError => {
  return error instanceof InternalServerError ||
         error instanceof DatabaseError ||
         error instanceof ExternalServiceError;
};

// Generic NotFound Error
export class NotFoundError extends BaseError {
  constructor(
    message: string = 'Resource not found',
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 404, ErrorCode.BUSINESS_RULE_VIOLATION, true, context, details);
  }
}

// Business-specific Error
export class BusinessError extends BaseError {
  constructor(
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails
  ) {
    super(message, 400, ErrorCode.BUSINESS_RULE_VIOLATION, true, context, details);
  }
}