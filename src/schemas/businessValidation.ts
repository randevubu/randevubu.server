// Business Validation Schemas - Enterprise Architecture
import Joi from 'joi';
import { BusinessStaffRole } from '@prisma/client';
import { BUSINESS_VALIDATION_CONFIG, BUSINESS_ERROR_MESSAGES } from '../constants/businessValidation';

export const businessValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true
};

// Business validation schemas
export const businessNameSchema = Joi.string()
  .min(BUSINESS_VALIDATION_CONFIG.business.name.minLength)
  .max(BUSINESS_VALIDATION_CONFIG.business.name.maxLength)
  .pattern(BUSINESS_VALIDATION_CONFIG.business.name.pattern)
  .required()
  .messages({
    'string.empty': BUSINESS_ERROR_MESSAGES.BUSINESS_NAME_REQUIRED,
    'string.min': BUSINESS_ERROR_MESSAGES.BUSINESS_NAME_REQUIRED,
    'string.max': BUSINESS_ERROR_MESSAGES.BUSINESS_NAME_TOO_LONG,
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.INVALID_BUSINESS_NAME
  });

export const businessDescriptionSchema = Joi.string()
  .max(BUSINESS_VALIDATION_CONFIG.business.description.maxLength)
  .pattern(BUSINESS_VALIDATION_CONFIG.business.description.pattern)
  .optional()
  .messages({
    'string.max': BUSINESS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG,
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG
  });

export const businessPhoneSchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.business.phone.pattern)
  .optional()
  .messages({
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.PHONE_INVALID_FORMAT
  });

export const businessEmailSchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.business.email.pattern)
  .optional()
  .messages({
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.EMAIL_INVALID_FORMAT
  });

export const businessAddressSchema = Joi.string()
  .max(BUSINESS_VALIDATION_CONFIG.business.address.maxLength)
  .pattern(BUSINESS_VALIDATION_CONFIG.business.address.pattern)
  .optional()
  .messages({
    'string.max': BUSINESS_ERROR_MESSAGES.ADDRESS_TOO_LONG,
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.INVALID_ADDRESS
  });

export const businessTimezoneSchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.business.timezone.pattern)
  .optional()
  .messages({
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.TIMEZONE_INVALID
  });

export const businessCurrencySchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.business.currency.pattern)
  .optional()
  .messages({
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.CURRENCY_INVALID
  });

// Service validation schemas
export const serviceNameSchema = Joi.string()
  .min(BUSINESS_VALIDATION_CONFIG.service.name.minLength)
  .max(BUSINESS_VALIDATION_CONFIG.service.name.maxLength)
  .pattern(BUSINESS_VALIDATION_CONFIG.service.name.pattern)
  .required()
  .messages({
    'string.empty': BUSINESS_ERROR_MESSAGES.SERVICE_NAME_REQUIRED,
    'string.min': BUSINESS_ERROR_MESSAGES.SERVICE_NAME_REQUIRED,
    'string.max': BUSINESS_ERROR_MESSAGES.SERVICE_NAME_TOO_LONG,
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.INVALID_SERVICE_NAME
  });

export const serviceDescriptionSchema = Joi.string()
  .max(BUSINESS_VALIDATION_CONFIG.service.description.maxLength)
  .pattern(BUSINESS_VALIDATION_CONFIG.service.description.pattern)
  .optional()
  .messages({
    'string.max': BUSINESS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG,
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.DESCRIPTION_TOO_LONG
  });

export const serviceDurationSchema = Joi.number()
  .integer()
  .min(BUSINESS_VALIDATION_CONFIG.service.duration.min)
  .max(BUSINESS_VALIDATION_CONFIG.service.duration.max)
  .required()
  .messages({
    'number.base': BUSINESS_ERROR_MESSAGES.DURATION_REQUIRED,
    'number.integer': BUSINESS_ERROR_MESSAGES.INVALID_DURATION,
    'number.min': BUSINESS_ERROR_MESSAGES.DURATION_TOO_SHORT,
    'number.max': BUSINESS_ERROR_MESSAGES.DURATION_TOO_LONG
  });

export const servicePriceSchema = Joi.number()
  .min(BUSINESS_VALIDATION_CONFIG.service.price.min)
  .max(BUSINESS_VALIDATION_CONFIG.service.price.max)
  .required()
  .messages({
    'number.base': BUSINESS_ERROR_MESSAGES.PRICE_REQUIRED,
    'number.min': BUSINESS_ERROR_MESSAGES.PRICE_NEGATIVE,
    'number.max': BUSINESS_ERROR_MESSAGES.PRICE_TOO_HIGH
  });

export const serviceCurrencySchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.service.currency.pattern)
  .optional()
  .messages({
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.CURRENCY_INVALID
  });

export const serviceBufferTimeSchema = Joi.number()
  .integer()
  .min(BUSINESS_VALIDATION_CONFIG.service.bufferTime.min)
  .max(BUSINESS_VALIDATION_CONFIG.service.bufferTime.max)
  .optional()
  .messages({
    'number.integer': BUSINESS_ERROR_MESSAGES.BUFFER_TIME_INVALID,
    'number.min': BUSINESS_ERROR_MESSAGES.BUFFER_TIME_INVALID,
    'number.max': BUSINESS_ERROR_MESSAGES.BUFFER_TIME_INVALID
  });

export const serviceMaxAdvanceBookingSchema = Joi.number()
  .integer()
  .min(BUSINESS_VALIDATION_CONFIG.service.maxAdvanceBooking.min)
  .max(BUSINESS_VALIDATION_CONFIG.service.maxAdvanceBooking.max)
  .optional()
  .messages({
    'number.integer': BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID,
    'number.min': BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID,
    'number.max': BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID
  });

export const serviceMinAdvanceBookingSchema = Joi.number()
  .integer()
  .min(BUSINESS_VALIDATION_CONFIG.service.minAdvanceBooking.min)
  .max(BUSINESS_VALIDATION_CONFIG.service.minAdvanceBooking.max)
  .optional()
  .messages({
    'number.integer': BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID,
    'number.min': BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID,
    'number.max': BUSINESS_ERROR_MESSAGES.ADVANCE_BOOKING_INVALID
  });

// Staff validation schemas
export const staffUserIdSchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.staff.userId.pattern)
  .required()
  .messages({
    'string.empty': BUSINESS_ERROR_MESSAGES.STAFF_ROLE_REQUIRED,
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.STAFF_ROLE_REQUIRED
  });

export const staffRoleSchema = Joi.string()
  .valid(...Object.values(BusinessStaffRole))
  .required()
  .messages({
    'string.empty': BUSINESS_ERROR_MESSAGES.STAFF_ROLE_REQUIRED,
    'any.only': BUSINESS_ERROR_MESSAGES.STAFF_ROLE_INVALID
  });

// Business hours validation schemas
export const businessHoursDayOfWeekSchema = Joi.number()
  .integer()
  .min(BUSINESS_VALIDATION_CONFIG.businessHours.dayOfWeek.min)
  .max(BUSINESS_VALIDATION_CONFIG.businessHours.dayOfWeek.max)
  .required()
  .messages({
    'number.base': BUSINESS_ERROR_MESSAGES.BUSINESS_HOURS_INVALID,
    'number.integer': BUSINESS_ERROR_MESSAGES.BUSINESS_HOURS_INVALID,
    'number.min': BUSINESS_ERROR_MESSAGES.BUSINESS_HOURS_INVALID,
    'number.max': BUSINESS_ERROR_MESSAGES.BUSINESS_HOURS_INVALID
  });

export const businessHoursTimeSchema = Joi.string()
  .pattern(BUSINESS_VALIDATION_CONFIG.businessHours.openTime.pattern)
  .optional()
  .messages({
    'string.pattern.base': BUSINESS_ERROR_MESSAGES.BUSINESS_HOURS_INVALID
  });

// Request schemas
export const createBusinessSchema = Joi.object({
  name: businessNameSchema,
  description: businessDescriptionSchema,
  phone: businessPhoneSchema,
  email: businessEmailSchema,
  address: businessAddressSchema,
  timezone: businessTimezoneSchema,
  currency: businessCurrencySchema
}).strict();

export const updateBusinessSchema = Joi.object({
  name: businessNameSchema.optional(),
  description: businessDescriptionSchema,
  phone: businessPhoneSchema,
  email: businessEmailSchema,
  address: businessAddressSchema,
  timezone: businessTimezoneSchema,
  currency: businessCurrencySchema
}).strict();

export const createServiceSchema = Joi.object({
  name: serviceNameSchema,
  description: serviceDescriptionSchema,
  duration: serviceDurationSchema,
  price: servicePriceSchema,
  currency: serviceCurrencySchema,
  showPrice: Joi.boolean().optional().default(true),
  bufferTime: serviceBufferTimeSchema,
  maxAdvanceBooking: serviceMaxAdvanceBookingSchema,
  minAdvanceBooking: serviceMinAdvanceBookingSchema
}).strict();

export const updateServiceSchema = Joi.object({
  name: serviceNameSchema.optional(),
  description: serviceDescriptionSchema,
  duration: serviceDurationSchema.optional(),
  price: servicePriceSchema.optional(),
  currency: serviceCurrencySchema,
  showPrice: Joi.boolean().optional(),
  bufferTime: serviceBufferTimeSchema,
  maxAdvanceBooking: serviceMaxAdvanceBookingSchema,
  minAdvanceBooking: serviceMinAdvanceBookingSchema
}).strict();

export const addStaffSchema = Joi.object({
  userId: staffUserIdSchema,
  role: staffRoleSchema,
  permissions: Joi.object().pattern(
    Joi.string().pattern(/^[a-zA-Z0-9_.-]+$/),
    Joi.any()
  ).optional()
}).strict();

export const updateStaffSchema = Joi.object({
  role: staffRoleSchema.optional(),
  permissions: Joi.object().pattern(
    Joi.string().pattern(/^[a-zA-Z0-9_.-]+$/),
    Joi.any()
  ).optional()
}).strict();

export const businessHoursSchema = Joi.object({
  dayOfWeek: businessHoursDayOfWeekSchema,
  isOpen: Joi.boolean().required(),
  openTime: businessHoursTimeSchema,
  closeTime: businessHoursTimeSchema,
  breakStartTime: businessHoursTimeSchema,
  breakEndTime: businessHoursTimeSchema
}).strict();

// Business data object validation schema
export const businessDataObjectSchema = Joi.object().pattern(
  Joi.string().pattern(/^[a-zA-Z0-9_-]+$/),
  Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object().unknown(),
    Joi.array().items(Joi.object().unknown())
  )
).max(10).messages({
  'object.max': 'Business data object is too large'
});

export { businessValidationOptions as validationOptions };
