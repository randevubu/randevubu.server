/* // Test data fixtures for consistent testing

export const testUsers = {
  validUser: {
    phoneNumber: '+905551234567',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isVerified: true
  },
  invalidUser: {
    phoneNumber: 'invalid-phone',
    firstName: '',
    lastName: ''
  },
  unverifiedUser: {
    phoneNumber: '+905559876543',
    firstName: 'Unverified',
    lastName: 'User',
    isActive: true,
    isVerified: false
  },
  inactiveUser: {
    phoneNumber: '+905555555555',
    firstName: 'Inactive',
    lastName: 'User',
    isActive: false,
    isVerified: true
  }
};

export const testBusinesses = {
  validBusiness: {
    name: 'Test Business',
    description: 'Test business description',
    email: 'test@example.com',
    phone: '+905551234567',
    address: 'Test Address 123',
    city: 'Istanbul',
    state: 'Istanbul',
    country: 'Turkey',
    postalCode: '34000'
  },
  invalidBusiness: {
    name: '',
    email: 'invalid-email',
    phone: 'invalid-phone'
  },
  businessWithSpecialChars: {
    name: 'Test Business & Co. (Ltd.)',
    description: 'Business with special characters: @#$%^&*()',
    email: 'test+special@example.com',
    phone: '+905551234567'
  }
};

export const testServices = {
  validService: {
    name: 'Test Service',
    description: 'Test service description',
    duration: 60,
    price: 100.00,
    currency: 'TRY',
    isActive: true,
    showPrice: true
  },
  invalidService: {
    name: '',
    duration: -10,
    price: -50.00
  },
  longDurationService: {
    name: 'Long Service',
    description: 'Service with long duration',
    duration: 480, // 8 hours
    price: 500.00,
    currency: 'TRY'
  }
};

export const testAppointments = {
  validAppointment: {
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    customerNotes: 'Test appointment notes'
  },
  pastAppointment: {
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    customerNotes: 'Past appointment'
  },
  appointmentWithSpecialNotes: {
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    customerNotes: 'Special characters: @#$%^&*() and emojis: 😊🎉'
  }
};

export const testPhoneNumbers = {
  valid: [
    '+905551234567',
    '+905559876543',
    '+905555555555',
    '+905551111111'
  ],
  invalid: [
    'invalid-phone',
    '123456789',
    '+90',
    '905551234567',
    '+90555123456789'
  ],
  international: [
    '+1234567890',
    '+44123456789',
    '+33123456789'
  ]
};

export const mockJWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJidXNpbmVzc0lkIjoidGVzdC1idXNpbmVzcy1pZCIsImlhdCI6MTYzNDU2Nzg5MCwiZXhwIjoxNjM0NTY4NzkwfQ.test-signature';

export const testJWTData = {
  validPayload: {
    userId: 'test-user-id',
    businessId: 'test-business-id',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60)
  },
  expiredPayload: {
    userId: 'test-user-id',
    businessId: 'test-business-id',
    iat: Math.floor(Date.now() / 1000) - 3600,
    exp: Math.floor(Date.now() / 1000) - 1800 // Expired 30 minutes ago
  },
  invalidPayload: {
    userId: '',
    businessId: null,
    iat: 'invalid',
    exp: 'invalid'
  }
};

export const testErrorMessages = {
  validation: {
    required: 'This field is required',
    invalidFormat: 'Invalid format',
    tooShort: 'Too short',
    tooLong: 'Too long',
    invalidEmail: 'Invalid email format',
    invalidPhone: 'Invalid phone number format'
  },
  authentication: {
    unauthorized: 'Unauthorized',
    tokenExpired: 'Token expired',
    invalidToken: 'Invalid token',
    userNotFound: 'User not found',
    accountLocked: 'Account is locked'
  },
  authorization: {
    forbidden: 'Forbidden',
    insufficientPermissions: 'Insufficient permissions',
    resourceNotFound: 'Resource not found',
    accessDenied: 'Access denied'
  },
  business: {
    businessNotFound: 'Business not found',
    businessInactive: 'Business is inactive',
    businessClosed: 'Business is closed',
    serviceNotFound: 'Service not found',
    appointmentNotFound: 'Appointment not found'
  }
};

export const testDatabaseData = {
  roles: [
    {
      id: 'role-admin',
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'System administrator',
      level: 100,
      isSystem: true,
      isActive: true
    },
    {
      id: 'role-owner',
      name: 'OWNER',
      displayName: 'Business Owner',
      description: 'Business owner',
      level: 50,
      isSystem: true,
      isActive: true
    },
    {
      id: 'role-staff',
      name: 'STAFF',
      displayName: 'Staff Member',
      description: 'Staff member',
      level: 10,
      isSystem: true,
      isActive: true
    }
  ],
  permissions: [
    {
      id: 'perm-user-create',
      name: 'USER_CREATE',
      displayName: 'Create User',
      description: 'Create new users',
      resource: 'USER',
      action: 'CREATE',
      isSystem: true
    },
    {
      id: 'perm-user-read',
      name: 'USER_READ',
      displayName: 'Read User',
      description: 'Read user information',
      resource: 'USER',
      action: 'READ',
      isSystem: true
    },
    {
      id: 'perm-business-manage',
      name: 'BUSINESS_MANAGE',
      displayName: 'Manage Business',
      description: 'Manage business operations',
      resource: 'BUSINESS',
      action: 'MANAGE',
      isSystem: true
    }
  ],
  businessTypes: [
    {
      id: 'type-hair-salon',
      name: 'hair-salon',
      displayName: 'Hair Salon',
      description: 'Hair salon and beauty services',
      category: 'beauty',
      icon: 'scissors',
      isActive: true
    },
    {
      id: 'type-restaurant',
      name: 'restaurant',
      displayName: 'Restaurant',
      description: 'Restaurant and food services',
      category: 'food',
      icon: 'utensils',
    isActive: true
  },
    {
      id: 'type-clinic',
      name: 'clinic',
      displayName: 'Medical Clinic',
      description: 'Medical and health services',
      category: 'health',
      icon: 'stethoscope',
      isActive: true
    }
  ]
};

export const testSubscriptionPlans = {
  basic: {
    id: 'plan-basic',
    name: 'basic',
    displayName: 'Basic Plan',
    description: 'Basic subscription plan',
    price: 99.99,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: 1,
    maxStaffPerBusiness: 3,
    maxAppointmentsPerDay: 20,
    features: {
      smsNotifications: true,
      emailNotifications: false,
      advancedReporting: false,
      customBranding: false
    },
    isActive: true,
    isPopular: false
  },
  professional: {
    id: 'plan-professional',
    name: 'professional',
    displayName: 'Professional Plan',
    description: 'Professional subscription plan',
    price: 199.99,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: 3,
    maxStaffPerBusiness: 10,
    maxAppointmentsPerDay: 100,
    features: {
      smsNotifications: true,
      emailNotifications: true,
      advancedReporting: true,
      customBranding: false
    },
    isActive: true,
    isPopular: true
  },
  enterprise: {
    id: 'plan-enterprise',
    name: 'enterprise',
    displayName: 'Enterprise Plan',
    description: 'Enterprise subscription plan',
    price: 399.99,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: -1, // Unlimited
    maxStaffPerBusiness: -1, // Unlimited
    maxAppointmentsPerDay: -1, // Unlimited
    features: {
      smsNotifications: true,
      emailNotifications: true,
      advancedReporting: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true
    },
    isActive: true,
    isPopular: false
  }
};

export const testPaymentData = {
  validPayment: {
    amount: 199.99,
    currency: 'TRY',
    paymentMethod: 'card',
    paymentProvider: 'iyzico',
    providerPaymentId: 'test-payment-id-123',
    status: 'SUCCEEDED'
  },
  failedPayment: {
    amount: 199.99,
    currency: 'TRY',
    paymentMethod: 'card',
    paymentProvider: 'iyzico',
    providerPaymentId: 'test-payment-id-failed',
    status: 'FAILED'
  }
};

export const testNotificationData = {
  appointmentReminder: {
    title: 'Appointment Reminder',
    body: 'Your appointment is scheduled for tomorrow at 10:00 AM',
    type: 'appointment_reminder',
    data: {
      appointmentId: 'test-appointment-id',
      businessId: 'test-business-id',
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  },
  businessClosure: {
    title: 'Business Closure Notice',
    body: 'We will be closed on December 25th for the holiday',
    type: 'business_closure',
    data: {
      businessId: 'test-business-id',
      closureDate: '2024-12-25',
      reason: 'Holiday'
    }
  }
};

export const testSecurityData = {
  sqlInjectionAttempts: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "' UNION SELECT * FROM users --"
  ],
  xssAttempts: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>"
  ],
  maliciousInputs: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><foo>&xxe;</foo>",
    "{{7*7}}",
    "${7*7}"
  ]
}; */