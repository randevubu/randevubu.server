// Notification Validation Schemas - Enterprise Validation
import Joi from 'joi';
import { NOTIFICATION_VALIDATION_CONFIG } from '../constants/notificationValidation';

// Secure notification request schema
export const secureNotificationSchema = Joi.object({
  businessId: Joi.string().uuid().required().messages({
    'string.guid': 'Business ID must be a valid UUID',
    'any.required': 'Business ID is required'
  }),
  recipientIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxRecipients)
    .required()
    .messages({
      'array.min': 'At least one recipient is required',
      'array.max': `Maximum ${NOTIFICATION_VALIDATION_CONFIG.maxRecipients} recipients allowed`,
      'any.required': 'Recipients are required'
    }),
  title: Joi.string()
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxTitleLength)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': `Title cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxTitleLength} characters`,
      'any.required': 'Title is required'
    }),
  body: Joi.string()
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxBodyLength)
    .required()
    .messages({
      'string.min': 'Body cannot be empty',
      'string.max': `Body cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxBodyLength} characters`,
      'any.required': 'Body is required'
    }),
  notificationType: Joi.string()
    .valid(...NOTIFICATION_VALIDATION_CONFIG.validNotificationTypes)
    .required()
    .messages({
      'any.only': 'Invalid notification type',
      'any.required': 'Notification type is required'
    }),
  channels: Joi.array()
    .items(Joi.string().valid(...NOTIFICATION_VALIDATION_CONFIG.validChannels))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one channel is required',
      'any.required': 'Channels are required'
    }),
  data: Joi.object()
    .max(NOTIFICATION_VALIDATION_CONFIG.maxDataProperties)
    .unknown(false)
    .optional()
    .messages({
      'object.max': `Data object cannot have more than ${NOTIFICATION_VALIDATION_CONFIG.maxDataProperties} properties`
    }),
  metadata: Joi.object({
    ipAddress: Joi.string().ip().optional(),
    userAgent: Joi.string().max(500).optional()
  }).optional()
});

// Broadcast notification request schema
export const broadcastNotificationSchema = Joi.object({
  businessId: Joi.string().uuid().required().messages({
    'string.guid': 'Business ID must be a valid UUID',
    'any.required': 'Business ID is required'
  }),
  title: Joi.string()
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxTitleLength)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': `Title cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxTitleLength} characters`,
      'any.required': 'Title is required'
    }),
  body: Joi.string()
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxBodyLength)
    .required()
    .messages({
      'string.min': 'Body cannot be empty',
      'string.max': `Body cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxBodyLength} characters`,
      'any.required': 'Body is required'
    }),
  notificationType: Joi.string()
    .valid(...NOTIFICATION_VALIDATION_CONFIG.validBroadcastTypes)
    .required()
    .messages({
      'any.only': 'Invalid notification type',
      'any.required': 'Notification type is required'
    }),
  channels: Joi.array()
    .items(Joi.string().valid(...NOTIFICATION_VALIDATION_CONFIG.validChannels))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one channel is required',
      'any.required': 'Channels are required'
    }),
  data: Joi.object()
    .max(NOTIFICATION_VALIDATION_CONFIG.maxDataProperties)
    .unknown(false)
    .optional()
    .messages({
      'object.max': `Data object cannot have more than ${NOTIFICATION_VALIDATION_CONFIG.maxDataProperties} properties`
    }),
  filters: Joi.object({
    relationshipType: Joi.string()
      .valid('ACTIVE_CUSTOMER', 'PAST_CUSTOMER', 'ALL')
      .optional(),
    minAppointments: Joi.number().integer().min(0).max(1000).optional(),
    lastAppointmentAfter: Joi.date().iso().optional()
  }).optional(),
  metadata: Joi.object({
    ipAddress: Joi.string().ip().optional(),
    userAgent: Joi.string().max(500).optional()
  }).optional()
});

// Business ID validation schema
export const businessIdSchema = Joi.string().uuid().required().messages({
  'string.guid': 'Business ID must be a valid UUID',
  'any.required': 'Business ID is required'
});

// Recipient IDs validation schema
export const recipientIdsSchema = Joi.array()
  .items(Joi.string().uuid())
  .min(1)
  .max(NOTIFICATION_VALIDATION_CONFIG.maxRecipients)
  .required()
  .messages({
    'array.min': 'At least one recipient is required',
    'array.max': `Maximum ${NOTIFICATION_VALIDATION_CONFIG.maxRecipients} recipients allowed`,
    'any.required': 'Recipients are required'
  });

// Channels validation schema
export const channelsSchema = Joi.array()
  .items(Joi.string().valid(...NOTIFICATION_VALIDATION_CONFIG.validChannels))
  .min(1)
  .required()
  .messages({
    'array.min': 'At least one channel is required',
    'any.required': 'Channels are required'
  });

// Content validation schema
export const contentSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxTitleLength)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': `Title cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxTitleLength} characters`,
      'any.required': 'Title is required'
    }),
  body: Joi.string()
    .min(1)
    .max(NOTIFICATION_VALIDATION_CONFIG.maxBodyLength)
    .required()
    .messages({
      'string.min': 'Body cannot be empty',
      'string.max': `Body cannot exceed ${NOTIFICATION_VALIDATION_CONFIG.maxBodyLength} characters`,
      'any.required': 'Body is required'
    })
});

// Data object validation schema
export const dataObjectSchema = Joi.object()
  .max(NOTIFICATION_VALIDATION_CONFIG.maxDataProperties)
  .unknown(false)
  .optional()
  .messages({
    'object.max': `Data object cannot have more than ${NOTIFICATION_VALIDATION_CONFIG.maxDataProperties} properties`
  });

// Metadata validation schema
export const metadataSchema = Joi.object({
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().max(500).optional()
}).optional();

// Validation options
export const validationOptions = {
  abortEarly: false,
  stripUnknown: true,
  allowUnknown: false
} as const;
