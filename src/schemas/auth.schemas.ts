import { z } from 'zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Phone number validation
const phoneNumberSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must not exceed 20 characters')
  .refine(
    (phone: string) => {
      try {
        return isValidPhoneNumber(phone);
      } catch {
        return false;
      }
    },
    { message: 'Invalid phone number format' }
  )
  .transform((phone: string) => {
    try {
      const parsed = parsePhoneNumber(phone);
      return parsed.format('E.164');
    } catch {
      return phone;
    }
  });

// Verification code validation
const verificationCodeSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'Verification code must be 4-8 digits')
  .length(6, 'Verification code must be exactly 6 digits');

// Verification purpose validation
const verificationPurposeSchema = z.enum([
  'REGISTRATION',
  'LOGIN', 
  'PHONE_CHANGE',
  'ACCOUNT_RECOVERY'
]);

// JWT token validation
const jwtTokenSchema = z
  .string()
  .min(1, 'Token is required')
  .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, 'Invalid token format');

// User profile validation
const userProfileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name cannot be empty')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-ZğĞüÜşŞıİöÖçÇ\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name cannot be empty')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-ZğĞüÜşŞıİöÖçÇ\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .max(500, 'Avatar URL must not exceed 500 characters')
    .optional(),
  timezone: z
    .string()
    .min(1, 'Timezone cannot be empty')
    .max(50, 'Timezone must not exceed 50 characters')
    .regex(/^[A-Za-z_\/]+$/, 'Invalid timezone format')
    .optional(),
  language: z
    .string()
    .length(2, 'Language code must be exactly 2 characters')
    .regex(/^[a-z]{2}$/, 'Language must be a valid 2-letter ISO code')
    .optional(),
}).strict();

// Device info validation
const deviceInfoSchema = z.object({
  deviceId: z
    .string()
    .max(100, 'Device ID must not exceed 100 characters')
    .optional(),
  userAgent: z
    .string()
    .max(500, 'User agent must not exceed 500 characters')
    .optional(),
  ipAddress: z
    .string()
    .ip('Invalid IP address format')
    .optional(),
});

// Request Schemas
export const sendVerificationSchema = z.object({
  phoneNumber: phoneNumberSchema,
  // Purpose is auto-detected by backend based on whether user exists
}).strict();

export const verifyLoginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  verificationCode: verificationCodeSchema,
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: jwtTokenSchema.optional(), // Optional for web apps using cookies
}).strict();

export const logoutSchema = z.object({
  refreshToken: jwtTokenSchema.optional(),
}).strict();

export const updateProfileSchema = userProfileUpdateSchema;

export const changePhoneSchema = z.object({
  newPhoneNumber: phoneNumberSchema,
  verificationCode: verificationCodeSchema,
}).strict();

// Query parameter schemas
export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform(Number)
    .refine((n: number) => n >= 1, 'Page must be greater than 0')
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform(Number)
    .refine((n: number) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .default('10'),
});

export const userStatsSchema = z.object({
  startDate: z
    .string()
    .datetime('Invalid start date format')
    .optional(),
  endDate: z
    .string()
    .datetime('Invalid end date format')
    .optional(),
}).strict();

// Header schemas
export const authHeaderSchema = z.object({
  authorization: z
    .string()
    .regex(/^Bearer .+/, 'Authorization header must start with "Bearer "')
    .transform((auth: string) => auth.slice(7)), // Remove "Bearer " prefix
});

export const deviceHeaderSchema = z.object({
  'x-device-id': z
    .string()
    .max(100, 'Device ID must not exceed 100 characters')
    .optional(),
  'user-agent': z
    .string()
    .max(500, 'User agent must not exceed 500 characters')
    .optional(),
  'x-forwarded-for': z
    .string()
    .optional(),
  'x-real-ip': z
    .string()
    .ip('Invalid IP address format')
    .optional(),
});

// Internal validation schemas
export const createUserSchema = z.object({
  phoneNumber: phoneNumberSchema,
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  timezone: z.string().max(50).default('Europe/Istanbul'),
  language: z.string().length(2).default('en'),
});

export const phoneVerificationSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().min(1),
  purpose: verificationPurposeSchema,
  userId: z.string().cuid().optional(),
  expiresAt: z.date(),
});

export const auditLogSchema = z.object({
  userId: z.string().cuid().optional(),
  action: z.enum([
    'USER_REGISTER',
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_UPDATE',
    'USER_DELETE',
    'USER_LOCK',
    'USER_UNLOCK',
    'PHONE_VERIFY',
    'TOKEN_REFRESH',
    'PASSWORD_RESET',
  ]),
  entity: z.string().max(50).optional(),
  entityId: z.string().cuid().optional(),
  details: z.any().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
});

// Response schemas for type safety
export const userResponseSchema = z.object({
  id: z.string().cuid(),
  phoneNumber: phoneNumberSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatar: z.string().url().nullable(),
  timezone: z.string(),
  language: z.string(),
  isVerified: z.boolean(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export const tokenResponseSchema = z.object({
  accessToken: jwtTokenSchema,
  refreshToken: jwtTokenSchema,
  expiresIn: z.number().positive(),
  refreshExpiresIn: z.number().positive(),
});

export const loginResponseSchema = z.object({
  user: userResponseSchema,
  tokens: tokenResponseSchema,
  isNewUser: z.boolean(),
});

// Configuration schemas
export const securityConfigSchema = z.object({
  maxFailedAttempts: z.number().min(1).max(10).default(5),
  lockDurationMinutes: z.number().min(1).max(1440).default(30), // Max 24 hours
  tokenExpiryMinutes: z.number().min(1).max(60).default(15),
  refreshTokenExpiryDays: z.number().min(1).max(365).default(30),
});

export const rateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).max(86400000), // 1 second to 24 hours
  maxRequests: z.number().min(1).max(1000),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
});

// Type exports for use in other files
export type SendVerificationRequest = z.infer<typeof sendVerificationSchema>;
export type VerifyLoginRequest = z.infer<typeof verifyLoginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type LogoutRequest = z.infer<typeof logoutSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type ChangePhoneRequest = z.infer<typeof changePhoneSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type UserStatsQuery = z.infer<typeof userStatsSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type PhoneVerificationData = z.infer<typeof phoneVerificationSchema>;
export type AuditLogData = z.infer<typeof auditLogSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;

// Schema validation utilities
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

export const validateSchemaAsync = async <T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): Promise<T> => {
  return await schema.parseAsync(data);
};

export const isValidSchema = <T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): data is T => {
  return schema.safeParse(data).success;
};