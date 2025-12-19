/**
 * Common/Shared OpenAPI Schemas
 * These schemas are used across multiple domains
 */

export const commonSchemas = {
  // Success/Error Response Schemas
  SuccessResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      message: {
        type: 'string',
        example: 'Operation successful',
      },
      data: {
        type: 'object',
      },
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      message: {
        type: 'string',
        example: 'An error occurred',
      },
      error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
          },
          code: {
            type: 'string',
          },
          details: {
            type: 'object',
          },
          requestId: {
            type: 'string',
          },
        },
      },
    },
  },

  ValidationError: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      message: {
        type: 'string',
        example: 'Validation failed',
      },
      error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Body validation failed: Invalid phone number format',
          },
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          field: {
            type: 'string',
            example: 'phoneNumber',
          },
          requestId: {
            type: 'string',
          },
        },
      },
    },
  },

  RateLimitError: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Too many requests',
          },
          retryAfter: {
            type: 'integer',
            example: 60,
            description: 'Seconds to wait before retrying',
          },
        },
      },
    },
  },

  HealthCheckResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['healthy', 'unhealthy'],
        example: 'healthy',
      },
      uptime: {
        type: 'integer',
        example: 3600,
        description: 'Server uptime in seconds',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
      },
      version: {
        type: 'string',
        example: 'v1',
      },
      environment: {
        type: 'string',
        example: 'development',
      },
      checks: {
        type: 'object',
        properties: {
          database: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['healthy', 'unhealthy'],
              },
            },
          },
          redis: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['healthy', 'unhealthy'],
              },
            },
          },
        },
      },
    },
  },
};
