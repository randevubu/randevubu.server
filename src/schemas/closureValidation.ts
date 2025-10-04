// Closure Validation Schemas - Enterprise Architecture
import Joi from 'joi';
import { ClosureType } from '@prisma/client';
import { CLOSURE_VALIDATION_CONFIG, CLOSURE_ERROR_MESSAGES } from '../constants/closureValidation';

export const closureValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true
};

// Closure validation schemas
export const closureStartDateSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.closure.startDate.pattern)
  .required()
  .messages({
    'string.empty': CLOSURE_ERROR_MESSAGES.START_DATE_REQUIRED,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_START_DATE
  });

export const closureEndDateSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.closure.endDate.pattern)
  .optional()
  .messages({
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_END_DATE
  });

export const closureReasonSchema = Joi.string()
  .min(CLOSURE_VALIDATION_CONFIG.closure.reason.minLength)
  .max(CLOSURE_VALIDATION_CONFIG.closure.reason.maxLength)
  .pattern(CLOSURE_VALIDATION_CONFIG.closure.reason.pattern)
  .required()
  .messages({
    'string.empty': CLOSURE_ERROR_MESSAGES.REASON_REQUIRED,
    'string.min': CLOSURE_ERROR_MESSAGES.REASON_TOO_SHORT,
    'string.max': CLOSURE_ERROR_MESSAGES.REASON_TOO_LONG,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_REASON
  });

export const closureTypeSchema = Joi.string()
  .valid(...Object.values(ClosureType))
  .required()
  .messages({
    'string.empty': CLOSURE_ERROR_MESSAGES.TYPE_REQUIRED,
    'any.only': CLOSURE_ERROR_MESSAGES.INVALID_TYPE
  });

export const affectedServicesSchema = Joi.array()
  .items(Joi.string().pattern(CLOSURE_VALIDATION_CONFIG.closure.affectedServices.itemPattern))
  .max(CLOSURE_VALIDATION_CONFIG.closure.affectedServices.maxLength)
  .optional()
  .messages({
    'array.max': CLOSURE_ERROR_MESSAGES.INVALID_AFFECTED_SERVICES,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_SERVICE_ID
  });

export const recurringPatternSchema = Joi.object().pattern(
  Joi.string().pattern(CLOSURE_VALIDATION_CONFIG.closure.recurringPattern.allowedKeys),
  Joi.any()
).max(CLOSURE_VALIDATION_CONFIG.closure.recurringPattern.maxKeys)
.optional()
.messages({
  'object.max': CLOSURE_ERROR_MESSAGES.INVALID_RECURRING_PATTERN_FORMAT,
  'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_RECURRING_PATTERN_FORMAT
});

export const notificationMessageSchema = Joi.string()
  .max(CLOSURE_VALIDATION_CONFIG.closure.notificationMessage.maxLength)
  .pattern(CLOSURE_VALIDATION_CONFIG.closure.notificationMessage.pattern)
  .optional()
  .messages({
    'string.max': CLOSURE_ERROR_MESSAGES.NOTIFICATION_MESSAGE_TOO_LONG,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_MESSAGE
  });

export const notificationChannelsSchema = Joi.array()
  .items(Joi.string().valid(...CLOSURE_VALIDATION_CONFIG.closure.notificationChannels.allowedValues))
  .max(CLOSURE_VALIDATION_CONFIG.closure.notificationChannels.maxLength)
  .optional()
  .messages({
    'array.max': CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_CHANNELS,
    'any.only': CLOSURE_ERROR_MESSAGES.INVALID_NOTIFICATION_CHANNEL
  });

// Analytics validation schemas
export const analyticsBusinessIdSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.analytics.businessId.pattern)
  .required()
  .messages({
    'string.empty': CLOSURE_ERROR_MESSAGES.BUSINESS_ID_REQUIRED,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_BUSINESS_ID
  });

export const analyticsStartDateSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.analytics.startDate.pattern)
  .optional()
  .messages({
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_DATE_FORMAT
  });

export const analyticsEndDateSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.analytics.endDate.pattern)
  .optional()
  .messages({
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_DATE_FORMAT
  });

export const analyticsTypeSchema = Joi.string()
  .valid(...Object.values(ClosureType))
  .optional()
  .messages({
    'any.only': CLOSURE_ERROR_MESSAGES.INVALID_TYPE
  });

// Reschedule validation schemas
export const rescheduleClosureIdSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.reschedule.closureId.pattern)
  .required()
  .messages({
    'string.empty': CLOSURE_ERROR_MESSAGES.CLOSURE_ID_REQUIRED,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_CLOSURE_ID
  });

export const rescheduleBusinessIdSchema = Joi.string()
  .pattern(CLOSURE_VALIDATION_CONFIG.reschedule.businessId.pattern)
  .required()
  .messages({
    'string.empty': CLOSURE_ERROR_MESSAGES.BUSINESS_ID_REQUIRED,
    'string.pattern.base': CLOSURE_ERROR_MESSAGES.INVALID_BUSINESS_ID
  });

export const maxRescheduleDaysSchema = Joi.number()
  .integer()
  .min(CLOSURE_VALIDATION_CONFIG.reschedule.maxRescheduleDays.min)
  .max(CLOSURE_VALIDATION_CONFIG.reschedule.maxRescheduleDays.max)
  .optional()
  .messages({
    'number.integer': 'Max reschedule days must be an integer',
    'number.min': 'Max reschedule days must be at least 1',
    'number.max': 'Max reschedule days cannot exceed 30'
  });

export const preferredTimeSlotsSchema = Joi.string()
  .valid(...CLOSURE_VALIDATION_CONFIG.reschedule.preferredTimeSlots.allowedValues)
  .optional()
  .messages({
    'any.only': 'Preferred time slots must be one of: MORNING, AFTERNOON, EVENING, ANY'
  });

// Request schemas
export const createClosureSchema = Joi.object({
  startDate: closureStartDateSchema,
  endDate: closureEndDateSchema,
  reason: closureReasonSchema,
  type: closureTypeSchema,
  affectedServices: affectedServicesSchema,
  isRecurring: Joi.boolean().optional().default(false),
  recurringPattern: recurringPatternSchema,
  notifyCustomers: Joi.boolean().optional().default(false),
  notificationMessage: notificationMessageSchema,
  notificationChannels: notificationChannelsSchema
}).custom((data: any, helpers) => {
  if (data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return helpers.error('endDate.beforeStart');
    }
  }
  return data;
}).messages({
  'endDate.beforeStart': CLOSURE_ERROR_MESSAGES.END_DATE_BEFORE_START
}).strict();

export const updateClosureSchema = Joi.object({
  startDate: closureStartDateSchema.optional(),
  endDate: closureEndDateSchema,
  reason: closureReasonSchema.optional(),
  type: closureTypeSchema.optional(),
  affectedServices: affectedServicesSchema,
  isRecurring: Joi.boolean().optional(),
  recurringPattern: recurringPatternSchema,
  notifyCustomers: Joi.boolean().optional(),
  notificationMessage: notificationMessageSchema,
  notificationChannels: notificationChannelsSchema
}).custom((data: any, helpers) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return helpers.error('endDate.beforeStart');
    }
  }
  return data;
}).messages({
  'endDate.beforeStart': CLOSURE_ERROR_MESSAGES.END_DATE_BEFORE_START
}).strict();

export const closureAnalyticsSchema = Joi.object({
  businessId: analyticsBusinessIdSchema,
  startDate: analyticsStartDateSchema,
  endDate: analyticsEndDateSchema,
  type: analyticsTypeSchema,
  includeRecurring: Joi.boolean().optional().default(false)
}).strict();

export const rescheduleClosureSchema = Joi.object({
  closureId: rescheduleClosureIdSchema,
  businessId: rescheduleBusinessIdSchema,
  autoReschedule: Joi.boolean().optional().default(false),
  maxRescheduleDays: maxRescheduleDaysSchema,
  preferredTimeSlots: preferredTimeSlotsSchema,
  notifyCustomers: Joi.boolean().optional().default(true),
  allowWeekends: Joi.boolean().optional().default(false)
}).strict();

// Closure data object validation schema
export const closureDataObjectSchema = Joi.object().pattern(
  Joi.string().pattern(/^[a-zA-Z0-9_-]+$/),
  Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object().unknown(),
    Joi.array().items(Joi.object().unknown())
  )
).max(10).messages({
  'object.max': 'Closure data object is too large'
});

export { closureValidationOptions as validationOptions };
