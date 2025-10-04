// Auth Validation Types - Enterprise Architecture
import { ValidationResult, ValidationError, ValidationErrorType } from './notificationValidation'; // Reusing core validation types
import { VerificationPurpose } from '@prisma/client';

// Re-export validation options from core validation service
export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
}

export interface ArrayValidationOptions {
  minLength?: number;
  maxLength?: number;
  itemValidator?: (item: unknown) => ValidationResult<unknown>;
  required?: boolean;
}

export interface NumberValidationOptions {
  min?: number;
  max?: number;
  required?: boolean;
}

// Auth validation request interfaces
export interface AuthValidationRequest {
  phoneNumber: string;
  verificationCode?: string;
  purpose?: VerificationPurpose;
  deviceInfo?: DeviceInfo;
}

export interface PhoneValidationRequest {
  phoneNumber: string;
  purpose: VerificationPurpose;
}

export interface LoginValidationRequest {
  phoneNumber: string;
  verificationCode: string;
}

export interface ProfileUpdateValidationRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface PhoneChangeValidationRequest {
  newPhoneNumber: string;
  verificationCode: string;
}

export interface TokenValidationRequest {
  accessToken?: string;
  refreshToken?: string;
}

// Device info validation
export interface DeviceInfo {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Auth validation error types
export enum AuthValidationErrorType {
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  INVALID_PURPOSE = 'INVALID_PURPOSE',
  INVALID_DEVICE_INFO = 'INVALID_DEVICE_INFO',
  INVALID_PROFILE_DATA = 'INVALID_PROFILE_DATA',
  INVALID_TOKEN = 'INVALID_TOKEN',
  PHONE_NUMBER_REQUIRED = 'PHONE_NUMBER_REQUIRED',
  VERIFICATION_CODE_REQUIRED = 'VERIFICATION_CODE_REQUIRED',
  PURPOSE_REQUIRED = 'PURPOSE_REQUIRED',
  DEVICE_INFO_INVALID = 'DEVICE_INFO_INVALID',
  PROFILE_DATA_INVALID = 'PROFILE_DATA_INVALID',
  TOKEN_REQUIRED = 'TOKEN_REQUIRED',
  PHONE_NUMBER_TOO_LONG = 'PHONE_NUMBER_TOO_LONG',
  VERIFICATION_CODE_INVALID_FORMAT = 'VERIFICATION_CODE_INVALID_FORMAT',
  DEVICE_ID_TOO_LONG = 'DEVICE_ID_TOO_LONG',
  USER_AGENT_TOO_LONG = 'USER_AGENT_TOO_LONG',
  INVALID_IP_ADDRESS = 'INVALID_IP_ADDRESS',
  FIRST_NAME_INVALID = 'FIRST_NAME_INVALID',
  LAST_NAME_INVALID = 'LAST_NAME_INVALID',
  AVATAR_URL_INVALID = 'AVATAR_URL_INVALID',
  TIMEZONE_INVALID = 'TIMEZONE_INVALID',
  LANGUAGE_INVALID = 'LANGUAGE_INVALID',
  TOKEN_FORMAT_INVALID = 'TOKEN_FORMAT_INVALID'
}

export interface AuthValidationError {
  type: AuthValidationErrorType;
  message: string;
  field?: string;
  code?: string;
}

// Auth validation options
export interface AuthValidationOptions {
  phoneNumber?: StringValidationOptions;
  verificationCode?: StringValidationOptions;
  deviceInfo?: {
    deviceId?: StringValidationOptions;
    userAgent?: StringValidationOptions;
    ipAddress?: StringValidationOptions;
  };
  profile?: {
    firstName?: StringValidationOptions;
    lastName?: StringValidationOptions;
    avatar?: StringValidationOptions;
    timezone?: StringValidationOptions;
    language?: StringValidationOptions;
  };
  tokens?: {
    accessToken?: StringValidationOptions;
    refreshToken?: StringValidationOptions;
  };
}

// Auth validation configuration
export interface AuthValidationConfig {
  phoneNumber: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
    required: boolean;
  };
  verificationCode: {
    length: number;
    pattern: RegExp;
    required: boolean;
  };
  deviceInfo: {
    deviceId: {
      maxLength: number;
      pattern: RegExp;
    };
    userAgent: {
      maxLength: number;
    };
    ipAddress: {
      pattern: RegExp;
    };
  };
  profile: {
    firstName: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
    };
    lastName: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
    };
    avatar: {
      maxLength: number;
      pattern: RegExp;
    };
    timezone: {
      maxLength: number;
      pattern: RegExp;
    };
    language: {
      length: number;
      pattern: RegExp;
    };
  };
  tokens: {
    accessToken: {
      pattern: RegExp;
    };
    refreshToken: {
      pattern: RegExp;
    };
  };
}

// Auth sanitization configuration
export interface AuthSanitizationConfig {
  phoneNumber: {
    allowedCharacters: RegExp;
    maxLength: number;
  };
  verificationCode: {
    allowedCharacters: RegExp;
    length: number;
  };
  deviceInfo: {
    deviceId: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    userAgent: {
      maxLength: number;
      allowedTags: string[];
      allowedAttributes: string[];
    };
    ipAddress: {
      pattern: RegExp;
    };
  };
  profile: {
    firstName: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    lastName: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    avatar: {
      maxLength: number;
      allowedProtocols: string[];
    };
    timezone: {
      allowedCharacters: RegExp;
      maxLength: number;
    };
    language: {
      allowedCharacters: RegExp;
      length: number;
    };
  };
  tokens: {
    accessToken: {
      allowedCharacters: RegExp;
    };
    refreshToken: {
      allowedCharacters: RegExp;
    };
  };
}

// Auth data object for sanitization
export interface AuthDataObject {
  [key: string]: string | number | boolean | AuthDataObject | AuthDataObject[] | null | undefined;
}

// Sanitized auth data object
export interface SanitizedAuthDataObject {
  [key: string]: string | number | boolean | SanitizedAuthDataObject | SanitizedAuthDataObject[] | null | undefined;
}

// Sanitized auth data interfaces
export interface SanitizedPhoneValidationData {
  phoneNumber: string;
  purpose: VerificationPurpose;
}

export interface SanitizedLoginData {
  phoneNumber: string;
  verificationCode: string;
}

export interface SanitizedProfileUpdateData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface SanitizedPhoneChangeData {
  newPhoneNumber: string;
  verificationCode: string;
}

export interface SanitizedDeviceInfo {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SanitizedTokenData {
  accessToken?: string;
  refreshToken?: string;
}
