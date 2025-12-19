import swaggerJsdoc from 'swagger-jsdoc';

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
        url:
          process.env.NODE_ENV === 'production'
            ? 'https://api.randevubu.com'
            : 'http://localhost:3000',
        description:
          process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
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

        // Service Schemas
        Service: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clh7j2k3l0000qwerty123456',
            },
            name: {
              type: 'string',
              example: 'Haircut & Styling',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Professional haircut and styling service',
            },
            duration: {
              type: 'integer',
              example: 60,
              description: 'Duration in minutes',
            },
            price: {
              type: 'number',
              example: 45.0,
            },
            currency: {
              type: 'string',
              example: 'TRY',
            },
            bufferTime: {
              type: 'integer',
              nullable: true,
              example: 15,
              description: 'Buffer time in minutes',
            },
            maxAdvanceBooking: {
              type: 'integer',
              nullable: true,
              example: 30,
              description: 'Maximum advance booking in days',
            },
            minAdvanceBooking: {
              type: 'integer',
              nullable: true,
              example: 2,
              description: 'Minimum advance booking in hours',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            sortOrder: {
              type: 'integer',
              example: 1,
            },
            businessId: {
              type: 'string',
              example: 'clh7j2k3l0000qwerty123456',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },

        CreateServiceRequest: {
          type: 'object',
          required: ['name', 'duration', 'price'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Haircut & Styling',
              description: 'Service name (2-100 characters)',
            },
            description: {
              type: 'string',
              maxLength: 500,
              example: 'Professional haircut and styling service',
              description: 'Service description (optional, max 500 characters)',
            },
            duration: {
              type: 'integer',
              minimum: 15,
              maximum: 480,
              example: 60,
              description: 'Duration in minutes (15-480 minutes)',
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 10000,
              example: 45.0,
              description: 'Service price (0-10,000)',
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              example: 'TRY',
              description: 'Currency code (3 characters)',
            },
            bufferTime: {
              type: 'integer',
              minimum: 0,
              maximum: 120,
              example: 15,
              description: 'Buffer time in minutes (0-120 minutes)',
            },
            maxAdvanceBooking: {
              type: 'integer',
              minimum: 1,
              maximum: 365,
              example: 30,
              description: 'Maximum advance booking in days (1-365 days)',
            },
            minAdvanceBooking: {
              type: 'integer',
              minimum: 0,
              maximum: 72,
              example: 2,
              description: 'Minimum advance booking in hours (0-72 hours)',
            },
          },
        },

        CreateServiceResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  $ref: '#/components/schemas/Service',
                },
                message: {
                  type: 'string',
                  example: 'Service created successfully',
                },
              },
            },
          ],
        },

        // Business Schemas
        Business: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'biz_123456789abcdef',
              description: 'Unique business identifier',
            },
            ownerId: {
              type: 'string',
              example: 'user_987654321fedcba',
              description: 'ID of the business owner',
            },
            businessTypeId: {
              type: 'string',
              example: 'beauty_salon',
              description: 'ID of the business type category',
            },
            name: {
              type: 'string',
              example: 'Hair & Beauty Salon',
              description: 'Business name',
            },
            slug: {
              type: 'string',
              example: 'hair-beauty-salon',
              description: 'URL-friendly business identifier',
            },
            description: {
              type: 'string',
              nullable: true,
              example:
                'Professional hair and beauty services including haircuts, styling, coloring, and beauty treatments',
              description: 'Business description',
            },
            email: {
              type: 'string',
              nullable: true,
              example: 'info@hairbeautysalon.com',
              description: 'Business email address',
            },
            phone: {
              type: 'string',
              nullable: true,
              example: '+905551234567',
              description: 'Business phone number',
            },
            website: {
              type: 'string',
              nullable: true,
              example: 'https://hairbeautysalon.com',
              description: 'Business website URL',
            },
            address: {
              type: 'string',
              nullable: true,
              example: '123 Main Street, Kadıköy',
              description: 'Business address',
            },
            city: {
              type: 'string',
              nullable: true,
              example: 'Istanbul',
              description: 'City name',
            },
            state: {
              type: 'string',
              nullable: true,
              example: 'Istanbul',
              description: 'State/province name',
            },
            country: {
              type: 'string',
              nullable: true,
              example: 'Turkey',
              description: 'Country name',
            },
            postalCode: {
              type: 'string',
              nullable: true,
              example: '34710',
              description: 'Postal/ZIP code',
            },
            latitude: {
              type: 'number',
              nullable: true,
              description: 'Geographic latitude coordinate',
            },
            longitude: {
              type: 'number',
              nullable: true,
              description: 'Geographic longitude coordinate',
            },
            businessHours: {
              type: 'object',
              nullable: true,
              description: 'Business operating hours',
            },
            timezone: {
              type: 'string',
              example: 'Europe/Istanbul',
              description: 'Business timezone',
            },
            logoUrl: {
              type: 'string',
              nullable: true,
              description: 'Business logo image URL',
            },
            coverImageUrl: {
              type: 'string',
              nullable: true,
              description: 'Business cover image URL',
            },
            primaryColor: {
              type: 'string',
              nullable: true,
              example: '#FF6B6B',
              description: 'Primary brand color',
            },
            theme: {
              type: 'object',
              nullable: true,
              description: 'Business theme configuration',
            },
            settings: {
              type: 'object',
              nullable: true,
              description: 'Business settings configuration',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether the business is currently active',
            },
            isVerified: {
              type: 'boolean',
              example: false,
              description: 'Whether the business has been verified by administrators',
            },
            verifiedAt: {
              type: 'string',
              nullable: true,
              format: 'date-time',
              description: 'Date when the business was verified',
            },
            isClosed: {
              type: 'boolean',
              example: false,
              description: 'Whether the business is currently closed',
            },
            closedUntil: {
              type: 'string',
              nullable: true,
              format: 'date-time',
              description: 'Date until which the business is closed',
            },
            closureReason: {
              type: 'string',
              nullable: true,
              description: 'Reason for business closure',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['hair', 'beauty', 'salon', 'styling'],
              description: 'Business tags',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
              description: 'Date when the business was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
              description: 'Date when the business was last updated',
            },
            deletedAt: {
              type: 'string',
              nullable: true,
              format: 'date-time',
              description: 'Date when the business was deleted (if applicable)',
            },
          },
        },

        BusinessData: {
          $ref: '#/components/schemas/Business',
        },

        BusinessType: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'beauty_salon',
              description: 'Unique business type identifier',
            },
            name: {
              type: 'string',
              example: 'beauty_salon',
              description: 'Business type name',
            },
            displayName: {
              type: 'string',
              example: 'Beauty Salon',
              description: 'Human-readable business type name',
            },
            icon: {
              type: 'string',
              nullable: true,
              example: '💇‍♀️',
              description: 'Emoji or icon representing the business type',
            },
            category: {
              type: 'string',
              example: 'Beauty & Wellness',
              description: 'Category the business type belongs to',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Hair salons, beauty parlors, and wellness centers',
              description: 'Description of the business type',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether this business type is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Date when the business type was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Date when the business type was last updated',
            },
          },
        },

        CreateBusinessRequest: {
          type: 'object',
          required: ['name', 'businessTypeId'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Hair & Beauty Salon',
              description: 'Business name (2-100 characters)',
            },
            businessTypeId: {
              type: 'string',
              example: 'beauty_salon',
              description: 'ID of the business type category',
            },
            description: {
              type: 'string',
              maxLength: 1000,
              example:
                'Professional hair and beauty services including haircuts, styling, coloring, and beauty treatments',
              description: 'Business description (optional, max 1000 characters)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@hairbeautysalon.com',
              description: 'Business email address (optional)',
            },
            phone: {
              type: 'string',
              pattern: '^\\+?[1-9]\\d{1,14}$',
              example: '+905551234567',
              description: 'Business phone number in international format (optional)',
            },
            website: {
              type: 'string',
              format: 'uri',
              example: 'https://hairbeautysalon.com',
              description: 'Business website URL (optional)',
            },
            address: {
              type: 'string',
              maxLength: 200,
              example: '123 Main Street, Kadıköy',
              description: 'Business address (optional, max 200 characters)',
            },
            city: {
              type: 'string',
              maxLength: 50,
              example: 'Istanbul',
              description: 'City name (optional, max 50 characters)',
            },
            state: {
              type: 'string',
              maxLength: 50,
              example: 'Istanbul',
              description: 'State/province name (optional, max 50 characters)',
            },
            country: {
              type: 'string',
              maxLength: 50,
              example: 'Turkey',
              description: 'Country name (optional, max 50 characters)',
            },
            postalCode: {
              type: 'string',
              maxLength: 20,
              example: '34710',
              description: 'Postal/ZIP code (optional, max 20 characters)',
            },
            timezone: {
              type: 'string',
              maxLength: 50,
              example: 'Europe/Istanbul',
              description: 'Business timezone (optional, max 50 characters)',
            },
            primaryColor: {
              type: 'string',
              pattern: '^#[0-9A-F]{6}$',
              example: '#FF6B6B',
              description: 'Primary brand color in hex format (optional)',
            },
            tags: {
              type: 'array',
              maxItems: 10,
              items: {
                type: 'string',
                maxLength: 50,
              },
              example: ['hair', 'beauty', 'salon', 'styling'],
              description: 'Business tags for categorization (optional, max 10 tags)',
            },
          },
        },

        CreateBusinessResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  $ref: '#/components/schemas/Business',
                },
                message: {
                  type: 'string',
                  example: 'Business created successfully',
                },
              },
            },
          ],
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
          },
          description:
            'Backend automatically detects if this is a login or registration based on whether the user exists in the database.',
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
              pattern: "^[a-zA-Z\\s\\-']+$",
              example: 'John',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              pattern: "^[a-zA-Z\\s\\-']+$",
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
        name: 'Business Types',
        description: 'Business type and category management endpoints',
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
        name: 'Payment Methods',
        description: 'Subscription payment method management and payment history',
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
      {
        name: 'Customer Management',
        description:
          'Customer information, banning, flagging, and behavior management for business owners',
      },
    ],
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts', './src/index.ts'],
};

// Generate OpenAPI specification from JSDoc comments
export const openapiSpec = swaggerJsdoc(options);

// Export as swaggerSpec for backward compatibility (can be renamed gradually)
export const swaggerSpec = openapiSpec;
