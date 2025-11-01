/**
 * Centralized Test Data
 * Contains predefined test data for consistent testing
 */

export const TEST_USER_IDS = {
  ADMIN: 'admin-test-123',
  REGULAR_USER: 'user-test-123',
  BUSINESS_OWNER: 'owner-test-123',
  SUSPENDED_USER: 'suspended-test-123'
};

export const TEST_BUSINESS_IDS = {
  ACTIVE: 'biz-active-123',
  TRIAL: 'biz-trial-123',
  EXPIRED: 'biz-expired-123',
  CANCELED: 'biz-canceled-123'
};

export const TEST_PLAN_IDS = {
  BASIC_TIER1: 'plan-basic-tier1',
  BASIC_TIER2: 'plan-basic-tier2',
  BASIC_TIER3: 'plan-basic-tier3',
  PREMIUM_TIER1: 'plan-premium-tier1',
  PREMIUM_TIER2: 'plan-premium-tier2',
  PREMIUM_TIER3: 'plan-premium-tier3'
};

export const TEST_DISCOUNT_CODES = {
  VALID_ONE_TIME: {
    code: 'WELCOME20',
    type: 'PERCENTAGE',
    value: 20,
    recurring: false,
    uses: 1
  },
  VALID_RECURRING: {
    code: 'LOYAL35',
    type: 'PERCENTAGE',
    value: 35,
    recurring: true,
    uses: 3
  },
  VALID_FIXED: {
    code: 'SAVE100',
    type: 'FIXED_AMOUNT',
    value: 100,
    recurring: false,
    uses: 1
  },
  EXPIRED: {
    code: 'EXPIRED10',
    type: 'PERCENTAGE',
    value: 10,
    recurring: false,
    uses: 1
  },
  EXHAUSTED: {
    code: 'LIMITED5',
    type: 'PERCENTAGE',
    value: 15,
    recurring: false,
    uses: 0
  },
  INACTIVE: {
    code: 'INACTIVE25',
    type: 'PERCENTAGE',
    value: 25,
    recurring: false,
    uses: 1
  },
  MIN_AMOUNT: {
    code: 'BIG500',
    type: 'PERCENTAGE',
    value: 30,
    recurring: false,
    uses: 1,
    minAmount: 1500.00
  }
};

export const TEST_PRICES = {
  BASIC_TIER1: 949.00,
  BASIC_TIER2: 1299.00,
  BASIC_TIER3: 1649.00,
  PREMIUM_TIER1: 1899.00,
  PREMIUM_TIER2: 2499.00,
  PREMIUM_TIER3: 2999.00
};

export const TEST_CARD_DATA = {
  VALID_VISA: {
    cardHolderName: 'John Doe',
    cardNumber: '4766620000000001',
    expireMonth: '12',
    expireYear: '2030',
    cvc: '123'
  },
  VALID_MASTERCARD: {
    cardHolderName: 'Jane Smith',
    cardNumber: '5528790000000008',
    expireMonth: '12',
    expireYear: '2030',
    cvc: '123'
  },
  INSUFFICIENT_FUNDS: {
    cardHolderName: 'Poor Person',
    cardNumber: '5406670000000009',
    expireMonth: '12',
    expireYear: '2030',
    cvc: '123'
  },
  INVALID_CARD: {
    cardHolderName: 'Invalid User',
    cardNumber: '4111111111111129',
    expireMonth: '12',
    expireYear: '2030',
    cvc: '123'
  },
  EXPIRED_CARD: {
    cardHolderName: 'Expired User',
    cardNumber: '5528790000000008',
    expireMonth: '01',
    expireYear: '2020',
    cvc: '123'
  }
};

export const TEST_BUYER_DATA = {
  VALID: {
    name: 'John',
    surname: 'Doe',
    gsmNumber: '+905551234567',
    email: 'john.doe@example.com',
    identityNumber: '12345678901',
    address: 'Test Address, Besiktas, Istanbul',
    city: 'Istanbul',
    country: 'Turkey',
    zipCode: '34000'
  },
  ANKARA: {
    name: 'Ali',
    surname: 'Yilmaz',
    gsmNumber: '+905551234568',
    email: 'ali.yilmaz@example.com',
    identityNumber: '12345678902',
    address: 'Test Address, Cankaya, Ankara',
    city: 'Ankara',
    country: 'Turkey',
    zipCode: '06000'
  },
  IZMIR: {
    name: 'Ayse',
    surname: 'Kara',
    gsmNumber: '+905551234569',
    email: 'ayse.kara@example.com',
    identityNumber: '12345678903',
    address: 'Test Address, Konak, Izmir',
    city: 'Izmir',
    country: 'Turkey',
    zipCode: '35000'
  }
};

export const TEST_TRIAL_PERIODS = {
  BASIC: 7, // 7 days
  PREMIUM: 0, // No trial
  EXTENDED: 14 // For special promotions
};

export const TEST_PAYMENT_RETRY = {
  MAX_ATTEMPTS: 3,
  RETRY_INTERVALS: [1, 2, 3], // Days between retries
  RETRY_WINDOW: 3 // Total days for retry window
};

export const TEST_SUBSCRIPTION_LIMITS = {
  BASIC: {
    maxBusinesses: 1,
    maxStaff: 5,
    maxAppointments: 1000
  },
  PREMIUM: {
    maxBusinesses: 3,
    maxStaff: 20,
    maxAppointments: 5000
  }
};

export const TEST_ERROR_MESSAGES = {
  DISCOUNT: {
    INVALID_CODE: 'Invalid discount code',
    EXPIRED: 'Discount code has expired',
    USAGE_LIMIT: 'Discount code usage limit reached',
    USER_LIMIT: 'You have already used this discount code',
    MIN_AMOUNT: 'Minimum purchase amount not met',
    INACTIVE: 'Discount code is not active',
    NOT_APPLICABLE: 'Discount code not applicable to this plan'
  },
  SUBSCRIPTION: {
    ALREADY_EXISTS: 'Business already has an active subscription',
    PLAN_NOT_FOUND: 'Subscription plan not found',
    PAYMENT_METHOD_REQUIRED: 'Payment method is required for trial subscriptions',
    INVALID_STATUS: 'Invalid subscription status',
    CANNOT_UPGRADE: 'Cannot upgrade to a lower tier plan',
    CANNOT_DOWNGRADE: 'Cannot downgrade from this plan'
  },
  PAYMENT: {
    CARD_DECLINED: 'Card was declined',
    INSUFFICIENT_FUNDS: 'Insufficient funds',
    INVALID_CARD: 'Invalid card information',
    EXPIRED_CARD: 'Card has expired',
    PROCESSING_ERROR: 'Payment processing error',
    GATEWAY_ERROR: 'Payment gateway error'
  }
};

export const TEST_CITIES = {
  TIER_1: ['Istanbul', 'Ankara', 'Izmir'],
  TIER_2: ['Antalya', 'Bursa', 'Adana', 'Gaziantep', 'Konya'],
  TIER_3: ['Kayseri', 'Eskisehir', 'Diyarbakir', 'Mersin', 'Samsun']
};

export const TEST_FEATURES = {
  BASIC: [
    'Online appointment booking system',
    'Up to 5 staff members',
    'Unlimited customers',
    'Customer management',
    'SMS notifications',
    'Email notifications',
    'Basic reporting',
    'Mobile app access'
  ],
  PREMIUM: [
    'Everything in Basic',
    'Up to 20 staff members',
    'Advanced reporting',
    'Custom branding',
    'Priority support',
    'API access',
    'Multi-location support',
    'White-label solution'
  ]
};

export const TEST_METADATA_EXAMPLES = {
  SUBSCRIPTION_WITH_DISCOUNT: {
    trialDays: 7,
    requiresPaymentMethod: true,
    createdAt: new Date().toISOString(),
    pendingDiscount: {
      code: 'WELCOME20',
      validatedAt: new Date().toISOString(),
      appliedToPayments: [],
      isRecurring: false,
      remainingUses: 1,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      discountCodeId: 'dc-welcome-123'
    }
  },
  SUBSCRIPTION_WITH_RECURRING_DISCOUNT: {
    trialDays: 7,
    requiresPaymentMethod: true,
    createdAt: new Date().toISOString(),
    pendingDiscount: {
      code: 'LOYAL35',
      validatedAt: new Date().toISOString(),
      appliedToPayments: [],
      isRecurring: true,
      remainingUses: 3,
      discountType: 'PERCENTAGE',
      discountValue: 35,
      discountCodeId: 'dc-loyal-123'
    }
  },
  PAYMENT_WITH_DISCOUNT: {
    type: 'trial_conversion',
    plan: {
      id: 'plan-basic-tier1',
      name: 'Basic Plan - Tier 1',
      displayName: 'Basic Plan - Tier 1'
    },
    discount: {
      code: 'WELCOME20',
      originalAmount: 949.00,
      discountAmount: 189.80,
      finalAmount: 759.20
    }
  }
};

export const TEST_DATE_HELPERS = {
  NOW: new Date(),
  DAYS_AGO: (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  DAYS_AHEAD: (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  MONTHS_AHEAD: (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }
};

export const TEST_IYZICO_RESPONSES = {
  PAYMENT_SUCCESS: {
    status: 'success',
    locale: 'tr',
    systemTime: Date.now(),
    conversationId: 'conv-123',
    price: '949.00',
    paidPrice: '949.00',
    installment: 1,
    paymentId: 'pay-123',
    fraudStatus: 1,
    merchantCommissionRate: '0',
    merchantCommissionRateAmount: '0',
    iyziCommissionRateAmount: '28.47',
    iyziCommissionFee: '0.25',
    cardType: 'CREDIT_CARD',
    cardAssociation: 'MASTER_CARD',
    cardFamily: 'Bonus',
    binNumber: '552879',
    lastFourDigits: '0008',
    basketId: 'basket-123',
    currency: 'TRY'
  },
  PAYMENT_FAILURE: {
    status: 'failure',
    errorCode: '5001',
    errorMessage: 'Insufficient funds',
    errorGroup: 'CARD_ERROR',
    locale: 'tr',
    systemTime: Date.now(),
    conversationId: 'conv-123'
  },
  REFUND_SUCCESS: {
    status: 'success',
    locale: 'tr',
    systemTime: Date.now(),
    paymentId: 'pay-123',
    price: '949.00',
    currency: 'TRY'
  }
};
