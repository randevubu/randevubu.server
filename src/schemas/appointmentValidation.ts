// Appointment Validation Schemas - Enterprise Architecture
import Joi from 'joi';
import { AppointmentStatus } from '../types/business';
import { APPOINTMENT_VALIDATION_CONFIG, APPOINTMENT_ERROR_MESSAGES } from '../constants/appointmentValidation';

// Base validation options
export const appointmentValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true,
  convert: true
};

// Date validation schema
export const appointmentDateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .required()
  .messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_DATE_FORMAT,
    'any.required': APPOINTMENT_ERROR_MESSAGES.MISSING_REQUIRED
  });

// Time validation schema
export const appointmentTimeSchema = Joi.string()
  .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  .required()
  .messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_TIME_FORMAT,
    'any.required': APPOINTMENT_ERROR_MESSAGES.MISSING_REQUIRED
  });

// UUID validation schema
export const appointmentUuidSchema = Joi.string()
  .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .required()
  .messages({
    'string.pattern.base': 'Invalid UUID format',
    'any.required': APPOINTMENT_ERROR_MESSAGES.MISSING_REQUIRED
  });

// Optional UUID validation schema
export const optionalAppointmentUuidSchema = Joi.string()
  .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .optional()
  .messages({
    'string.pattern.base': 'Invalid UUID format'
  });

// Notes validation schema
export const appointmentNotesSchema = Joi.string()
  .max(APPOINTMENT_VALIDATION_CONFIG.maxNotesLength)
  .optional()
  .messages({
    'string.max': APPOINTMENT_ERROR_MESSAGES.NOTES_TOO_LONG
  });

// Internal notes validation schema
export const appointmentInternalNotesSchema = Joi.string()
  .max(APPOINTMENT_VALIDATION_CONFIG.maxInternalNotesLength)
  .optional()
  .messages({
    'string.max': 'Internal notes must be less than 500 characters'
  });

// Cancel reason validation schema
export const appointmentCancelReasonSchema = Joi.string()
  .max(APPOINTMENT_VALIDATION_CONFIG.maxCancelReasonLength)
  .optional()
  .messages({
    'string.max': 'Cancel reason must be less than 200 characters'
  });

// Create appointment validation schema
export const createAppointmentSchema = Joi.object({
  businessId: appointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_BUSINESS_ID
  }),
  
  serviceId: appointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_SERVICE_ID
  }),
  
  staffId: appointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_STAFF_ID
  }),
  
  customerId: optionalAppointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_CUSTOMER_ID
  }),
  
  date: appointmentDateSchema,
  startTime: appointmentTimeSchema,
  customerNotes: appointmentNotesSchema
});

// Update appointment validation schema
export const updateAppointmentSchema = Joi.object({
  date: appointmentDateSchema.optional(),
  startTime: appointmentTimeSchema.optional(),
  
  status: Joi.string()
    .valid(...Object.values(AppointmentStatus))
    .optional()
    .messages({
      'any.only': APPOINTMENT_ERROR_MESSAGES.INVALID_STATUS
    }),
  
  customerNotes: appointmentNotesSchema,
  internalNotes: appointmentInternalNotesSchema,
  cancelReason: appointmentCancelReasonSchema
});

// Appointment search validation schema
export const appointmentSearchSchema = Joi.object({
  businessId: optionalAppointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_BUSINESS_ID
  }),
  
  staffId: optionalAppointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_STAFF_ID
  }),
  
  customerId: optionalAppointmentUuidSchema.messages({
    'string.pattern.base': APPOINTMENT_ERROR_MESSAGES.INVALID_CUSTOMER_ID
  }),
  
  status: Joi.string()
    .valid(...Object.values(AppointmentStatus))
    .optional()
    .messages({
      'any.only': APPOINTMENT_ERROR_MESSAGES.INVALID_STATUS
    }),
  
  date: appointmentDateSchema.optional(),
  startDate: appointmentDateSchema.optional(),
  endDate: appointmentDateSchema.optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must be at most 50'
    })
});

// Business settings validation schema
export const businessSettingsSchema = Joi.object({
  priceVisibility: Joi.object({
    hideAllServicePrices: Joi.boolean().optional()
  }).optional(),
  
  staffPrivacy: Joi.object({
    hideStaffNames: Joi.boolean().optional(),
    staffDisplayMode: Joi.string()
      .valid('ROLES', 'GENERIC', 'FULL')
      .optional(),
    customStaffLabels: Joi.object().pattern(
      Joi.string(),
      Joi.string()
    ).optional()
  }).optional()
});

// Time validation schema
export const timeValidationSchema = Joi.object({
  date: appointmentDateSchema,
  startTime: appointmentTimeSchema,
  endTime: appointmentTimeSchema.optional(),
  timezone: Joi.string().optional()
});

// Staff validation schema
export const staffValidationSchema = Joi.object({
  staffId: appointmentUuidSchema,
  businessId: appointmentUuidSchema,
  isActive: Joi.boolean().required(),
  role: Joi.string().required()
});

// Service validation schema
export const serviceValidationSchema = Joi.object({
  serviceId: appointmentUuidSchema,
  businessId: appointmentUuidSchema,
  isActive: Joi.boolean().required(),
  duration: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).required(),
  currency: Joi.string().length(3).required(),
  showPrice: Joi.boolean().required()
});

// Customer validation schema
export const customerValidationSchema = Joi.object({
  customerId: appointmentUuidSchema,
  businessId: optionalAppointmentUuidSchema,
  isActive: Joi.boolean().required()
});

// Appointment data object validation schema
export const appointmentDataObjectSchema = Joi.object().pattern(
  Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object(),
    Joi.array(),
    Joi.valid(null)
  )
);

// Export validation options
export { appointmentValidationOptions as validationOptions };
