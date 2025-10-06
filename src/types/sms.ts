// SMS Domain Types
export interface SMSSendOptions {
  phoneNumber: string;
  message: string;
  context?: any;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendVerificationOptions {
  phoneNumber: string;
  purpose: VerificationPurpose;
  userId?: string;
  businessId?: string;
  ipAddress?: string;
  userAgent?: string;
  customMessage?: string;
  expiryMinutes?: number;
  maxAttempts?: number;
}

export enum VerificationPurpose {
  LOGIN = 'LOGIN',
  REGISTRATION = 'REGISTRATION',
  PHONE_CHANGE = 'PHONE_CHANGE',
  STAFF_INVITATION = 'STAFF_INVITATION',
  APPOINTMENT_CONFIRMATION = 'APPOINTMENT_CONFIRMATION',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

// Re-export ErrorContext from errors for convenience
export type { ErrorContext } from './errors';


