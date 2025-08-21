import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerUiOptions } from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RandevuBu API',
      version: '1.0.0',
      description: 'Enterprise-grade appointment booking API with phone-based authentication',
      contact: {
        name: 'RandevuBu Team',
        email: 'support@randevubu.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.randevubu.com'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
        refreshToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Refresh-Token',
          description: 'Refresh token for token renewal',
        },
      },
      schemas: {
        // Error Schemas
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

        // Auth Schemas
        PhoneNumber: {
          type: 'string',
          pattern: '^\\+[1-9]\\d{1,14}$',
          example: '+1234567890',
          description: 'Phone number in E.164 format',
        },
        VerificationCode: {
          type: 'string',
          pattern: '^\\d{6}$',
          example: '123456',
          description: '6-digit verification code',
        },
        VerificationPurpose: {
          type: 'string',
          enum: ['REGISTRATION', 'LOGIN', 'PHONE_CHANGE', 'ACCOUNT_RECOVERY'],
          example: 'LOGIN',
        },
        
        // User Schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clh7j2k3l0000qwerty123456',
            },
            phoneNumber: {
              $ref: '#/components/schemas/PhoneNumber',
            },
            firstName: {
              type: 'string',
              nullable: true,
              example: 'John',
            },
            lastName: {
              type: 'string',
              nullable: true,
              example: 'Doe',
            },
            avatar: {
              type: 'string',
              nullable: true,
              format: 'uri',
              example: 'https://example.com/avatar.jpg',
            },
            timezone: {
              type: 'string',
              example: 'UTC',
            },
            language: {
              type: 'string',
              example: 'en',
            },
            isVerified: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-01T12:00:00.000Z',
            },
          },
        },
        
        // Token Schemas
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            expiresIn: {
              type: 'integer',
              example: 900,
              description: 'Access token expiry in seconds',
            },
            refreshExpiresIn: {
              type: 'integer',
              example: 2592000,
              description: 'Refresh token expiry in seconds',
            },
          },
        },

        // Request Schemas
        SendVerificationRequest: {
          type: 'object',
          required: ['phoneNumber'],
          properties: {
            phoneNumber: {
              $ref: '#/components/schemas/PhoneNumber',
            },
            purpose: {
              $ref: '#/components/schemas/VerificationPurpose',
              default: 'REGISTRATION',
            },
          },
        },
        VerifyLoginRequest: {
          type: 'object',
          required: ['phoneNumber', 'verificationCode'],
          properties: {
            phoneNumber: {
              $ref: '#/components/schemas/PhoneNumber',
            },
            verificationCode: {
              $ref: '#/components/schemas/VerificationCode',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        LogoutRequest: {
          type: 'object',
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'Optional: Specific refresh token to revoke',
            },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              pattern: '^[a-zA-Z\\s\\-\']+$',
              example: 'John',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              pattern: '^[a-zA-Z\\s\\-\']+$',
              example: 'Doe',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              maxLength: 500,
              example: 'https://example.com/avatar.jpg',
            },
            timezone: {
              type: 'string',
              maxLength: 50,
              pattern: '^[A-Za-z_\\/]+$',
              example: 'America/New_York',
            },
            language: {
              type: 'string',
              pattern: '^[a-z]{2}$',
              example: 'en',
            },
          },
        },
        ChangePhoneRequest: {
          type: 'object',
          required: ['newPhoneNumber', 'verificationCode'],
          properties: {
            newPhoneNumber: {
              $ref: '#/components/schemas/PhoneNumber',
            },
            verificationCode: {
              $ref: '#/components/schemas/VerificationCode',
            },
          },
        },

        // Response Schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)',
            },
          },
        },
        SendVerificationResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    phoneNumber: {
                      type: 'string',
                      example: '+123****7890',
                      description: 'Masked phone number',
                    },
                    expiresIn: {
                      type: 'integer',
                      example: 600,
                      description: 'Code expiry in seconds',
                    },
                    purpose: {
                      $ref: '#/components/schemas/VerificationPurpose',
                    },
                  },
                },
              },
            },
          ],
        },
        LoginResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    user: {
                      $ref: '#/components/schemas/User',
                    },
                    tokens: {
                      $ref: '#/components/schemas/TokenPair',
                    },
                    isNewUser: {
                      type: 'boolean',
                      example: false,
                    },
                  },
                },
              },
            },
          ],
        },
        ProfileResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    user: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          ],
        },
        TokenRefreshResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    tokens: {
                      $ref: '#/components/schemas/TokenPair',
                    },
                  },
                },
              },
            },
          ],
        },

        // System Schemas
        HealthCheckResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T12:00:00.000Z',
            },
            uptime: {
              type: 'integer',
              example: 3600,
              description: 'Server uptime in seconds',
            },
            memory: {
              type: 'object',
              properties: {
                used: {
                  type: 'integer',
                  example: 50331648,
                },
                total: {
                  type: 'integer',
                  example: 134217728,
                },
                percentage: {
                  type: 'number',
                  example: 37.5,
                },
              },
            },
            performance: {
              type: 'object',
              properties: {
                totalRequests: {
                  type: 'integer',
                  example: 150,
                },
                averageResponseTime: {
                  type: 'number',
                  example: 45.67,
                },
                errorRate: {
                  type: 'number',
                  example: 2.5,
                },
                requestsPerMinute: {
                  type: 'number',
                  example: 25.5,
                },
              },
            },
            version: {
              type: 'string',
              example: 'v18.17.0',
            },
            environment: {
              type: 'string',
              example: 'development',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Phone-based authentication endpoints',
      },
      {
        name: 'User Management',
        description: 'User profile and account management',
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints',
      },
      {
        name: 'Businesses',
        description: 'Business discovery and management endpoints',
      },
      {
        name: 'Services',
        description: 'Service catalog and management for businesses',
      },
      {
        name: 'Appointments',
        description: 'Appointment scheduling and lifecycle management',
      },
      {
        name: 'User Behavior',
        description: 'User reliability, strikes, and behavior analytics',
      },
      {
        name: 'Business Closures',
        description: 'Holiday, emergency, and maintenance closures for businesses',
      },
      {
        name: 'Subscriptions',
        description: 'Subscription plans and business subscription management',
      },
      {
        name: 'Role Management',
        description: 'RBAC role creation, updates, and statistics',
      },
      {
        name: 'Permission Management',
        description: 'RBAC permissions CRUD and assignment',
      },
      {
        name: 'User Role Management',
        description: 'Assign/revoke roles and query user permissions',
      },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/index.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions: SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
  `,
  customSiteTitle: 'RandevuBu API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};