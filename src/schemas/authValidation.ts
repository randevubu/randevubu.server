// Auth Validation Schemas - Enterprise Architecture
import Joi from 'joi';
import { VerificationPurpose } from '@prisma/client';
import { AUTH_VALIDATION_CONFIG, AUTH_ERROR_MESSAGES } from '../constants/authValidation';

export const authValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true
};

// Phone number validation schema
export const phoneNumberSchema = Joi.string()
  .min(AUTH_VALIDATION_CONFIG.phoneNumber.minLength)
  .max(AUTH_VALIDATION_CONFIG.phoneNumber.maxLength)
  .pattern(AUTH_VALIDATION_CONFIG.phoneNumber.pattern)
  .required()
  .messages({
    'string.empty': AUTH_ERROR_MESSAGES.PHONE_NUMBER_REQUIRED,
    'string.min': AUTH_ERROR_MESSAGES.PHONE_NUMBER_REQUIRED,
    'string.max': AUTH_ERROR_MESSAGES.PHONE_NUMBER_TOO_LONG,
    'string.pattern.base': AUTH_ERROR_MESSAGES.INVALID_PHONE_NUMBER
  });

// Verification code validation schema
export const verificationCodeSchema = Joi.string()
  .length(AUTH_VALIDATION_CONFIG.verificationCode.length)
  .pattern(AUTH_VALIDATION_CONFIG.verificationCode.pattern)
  .required()
  .messages({
    'string.empty': AUTH_ERROR_MESSAGES.VERIFICATION_CODE_REQUIRED,
    'string.length': AUTH_ERROR_MESSAGES.VERIFICATION_CODE_INVALID_FORMAT,
    'string.pattern.base': AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE
  });

// Verification purpose validation schema
export const verificationPurposeSchema = Joi.string()
  .valid(...Object.values(VerificationPurpose))
  .required()
  .messages({
    'string.empty': AUTH_ERROR_MESSAGES.PURPOSE_REQUIRED,
    'any.only': AUTH_ERROR_MESSAGES.INVALID_PURPOSE
  });

// Device info validation schema
export const deviceInfoSchema = Joi.object({
  deviceId: Joi.string()
    .max(AUTH_VALIDATION_CONFIG.deviceInfo.deviceId.maxLength)
    .pattern(AUTH_VALIDATION_CONFIG.deviceInfo.deviceId.pattern)
    .optional()
    .messages({
      'string.max': AUTH_ERROR_MESSAGES.DEVICE_ID_TOO_LONG,
      'string.pattern.base': AUTH_ERROR_MESSAGES.DEVICE_ID_TOO_LONG
    }),
  userAgent: Joi.string()
    .max(AUTH_VALIDATION_CONFIG.deviceInfo.userAgent.maxLength)
    .optional()
    .messages({
      'string.max': AUTH_ERROR_MESSAGES.USER_AGENT_TOO_LONG
    }),
  ipAddress: Joi.string()
    .pattern(AUTH_VALIDATION_CONFIG.deviceInfo.ipAddress.pattern)
    .optional()
    .messages({
      'string.pattern.base': AUTH_ERROR_MESSAGES.INVALID_IP_ADDRESS
    })
}).optional();

// Profile update validation schema
export const profileUpdateSchema = Joi.object({
  firstName: Joi.string()
    .min(AUTH_VALIDATION_CONFIG.profile.firstName.minLength)
    .max(AUTH_VALIDATION_CONFIG.profile.firstName.maxLength)
    .pattern(AUTH_VALIDATION_CONFIG.profile.firstName.pattern)
    .optional()
    .messages({
      'string.min': AUTH_ERROR_MESSAGES.FIRST_NAME_INVALID,
      'string.max': AUTH_ERROR_MESSAGES.FIRST_NAME_INVALID,
      'string.pattern.base': AUTH_ERROR_MESSAGES.FIRST_NAME_INVALID
    }),
  lastName: Joi.string()
    .min(AUTH_VALIDATION_CONFIG.profile.lastName.minLength)
    .max(AUTH_VALIDATION_CONFIG.profile.lastName.maxLength)
    .pattern(AUTH_VALIDATION_CONFIG.profile.lastName.pattern)
    .optional()
    .messages({
      'string.min': AUTH_ERROR_MESSAGES.LAST_NAME_INVALID,
      'string.max': AUTH_ERROR_MESSAGES.LAST_NAME_INVALID,
      'string.pattern.base': AUTH_ERROR_MESSAGES.LAST_NAME_INVALID
    }),
  avatar: Joi.string()
    .max(AUTH_VALIDATION_CONFIG.profile.avatar.maxLength)
    .pattern(AUTH_VALIDATION_CONFIG.profile.avatar.pattern)
    .optional()
    .messages({
      'string.max': AUTH_ERROR_MESSAGES.AVATAR_URL_INVALID,
      'string.pattern.base': AUTH_ERROR_MESSAGES.AVATAR_URL_INVALID
    }),
  timezone: Joi.string()
    .max(AUTH_VALIDATION_CONFIG.profile.timezone.maxLength)
    .pattern(AUTH_VALIDATION_CONFIG.profile.timezone.pattern)
    .optional()
    .messages({
      'string.max': AUTH_ERROR_MESSAGES.TIMEZONE_INVALID,
      'string.pattern.base': AUTH_ERROR_MESSAGES.TIMEZONE_INVALID
    }),
  language: Joi.string()
    .length(AUTH_VALIDATION_CONFIG.profile.language.length)
    .pattern(AUTH_VALIDATION_CONFIG.profile.language.pattern)
    .optional()
    .messages({
      'string.length': AUTH_ERROR_MESSAGES.LANGUAGE_INVALID,
      'string.pattern.base': AUTH_ERROR_MESSAGES.LANGUAGE_INVALID
    })
}).strict();

// Token validation schema
export const tokenSchema = Joi.string()
  .pattern(AUTH_VALIDATION_CONFIG.tokens.accessToken.pattern)
  .optional()
  .messages({
    'string.pattern.base': AUTH_ERROR_MESSAGES.TOKEN_FORMAT_INVALID
  });

// Request schemas
export const sendVerificationSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
  purpose: verificationPurposeSchema
}).strict();

export const verifyLoginSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
  verificationCode: verificationCodeSchema
}).strict();

export const refreshTokenSchema = Joi.object({
  refreshToken: tokenSchema
}).strict();

export const logoutSchema = Joi.object({
  refreshToken: tokenSchema
}).strict();

export const updateProfileSchema = profileUpdateSchema;

export const changePhoneSchema = Joi.object({
  newPhoneNumber: phoneNumberSchema,
  verificationCode: verificationCodeSchema
}).strict();

// Auth data object validation schema
export const authDataObjectSchema = Joi.object().pattern(
  Joi.string().pattern(/^[a-zA-Z0-9_-]+$/),
  Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object().unknown(),
    Joi.array().items(Joi.object().unknown())
  )
).max(10).messages({
  'object.max': 'Auth data object is too large'
});

export { authValidationOptions as validationOptions };
