import { Request, Response } from 'express';
import { GuaranteedAuthRequest } from '../../src/types/auth';

export class TestHelpers {
  /**
   * Create a mock Express Request object
   */
  static createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      method: 'GET',
      url: '/',
      path: '/',
      get: jest.fn((header: string) => {
        return overrides.headers?.[header.toLowerCase()];
      }),
      ...overrides,
    } as unknown as Request;
  }

  /**
   * Create a mock Express Response object
   */
  static createMockResponse(): Response {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.sendStatus = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res as Response;
  }

  /**
   * Create a mock authenticated request
   */
  static createMockAuthRequest(userId: string = 'test-user-id', level: number = 1): GuaranteedAuthRequest {
    const req = this.createMockRequest() as GuaranteedAuthRequest;
    req.user = {
      id: userId,
      phoneNumber: '+905551234567',
      isVerified: true,
      isActive: true,
      roles: [
        {
          id: 'role-1',
          name: level >= 100 ? 'ADMIN' : 'USER',
          level: level
        }
      ],
      effectiveLevel: level
    };
    req.token = {
      userId: userId,
      phoneNumber: '+905551234567',
      type: 'access',
      iat: Date.now(),
      exp: Date.now() + 3600000
    };
    return req;
  }

  /**
   * Create mock subscription data
   */
  static createMockSubscription(overrides: any = {}) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
      id: 'sub-123',
      businessId: 'business-123',
      planId: 'plan-basic-tier1',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      autoRenewal: true,
      paymentMethodId: 'pm-123',
      nextBillingDate: periodEnd,
      failedPaymentCount: 0,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  /**
   * Create mock trial subscription data
   */
  static createMockTrialSubscription(overrides: any = {}) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.createMockSubscription({
      status: 'TRIAL',
      trialStart: now,
      trialEnd: trialEnd,
      currentPeriodEnd: trialEnd,
      metadata: {
        trialDays: 7,
        requiresPaymentMethod: true,
        createdAt: now.toISOString()
      },
      ...overrides
    });
  }

  /**
   * Create mock subscription plan data
   */
  static createMockPlan(overrides: any = {}) {
    return {
      id: 'plan-basic-tier1',
      name: 'basic_tier1',
      displayName: 'Basic Plan - Tier 1',
      description: 'Perfect for small businesses',
      price: 949.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      maxBusinesses: 1,
      maxStaffPerBusiness: 5,
      features: {
        trialDays: 7,
        pricingTier: 'TIER_1',
        description: [
          'Online appointment booking',
          'Up to 5 staff members',
          'Unlimited appointments'
        ]
      },
      isActive: true,
      isPopular: false,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock discount code data
   */
  static createMockDiscountCode(overrides: any = {}) {
    return {
      id: 'dc-123',
      code: 'WELCOME20',
      name: 'Welcome Discount',
      description: '20% off first payment',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minPurchaseAmount: null,
      maxUsages: 1000,
      currentUsages: 0,
      maxUsagesPerUser: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      applicablePlans: [],
      metadata: {
        isRecurring: false,
        maxRecurringUses: 1
      },
      createdById: 'admin-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock payment data
   */
  static createMockPayment(overrides: any = {}) {
    return {
      id: 'pay-123',
      businessId: 'business-123',
      subscriptionId: 'sub-123',
      amount: 949.00,
      currency: 'TRY',
      status: 'succeeded',
      paymentGateway: 'iyzico',
      paymentGatewayId: 'iyzico-123',
      paymentMethodId: 'pm-123',
      metadata: {
        type: 'subscription_payment',
        plan: {
          id: 'plan-basic-tier1',
          name: 'Basic Plan'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock card data for testing
   */
  static createMockCardData(overrides: any = {}) {
    return {
      cardHolderName: 'John Doe',
      cardNumber: '5528790000000008', // Iyzico test card
      expireMonth: '12',
      expireYear: '2030',
      cvc: '123',
      ...overrides
    };
  }

  /**
   * Create mock buyer data for testing
   */
  static createMockBuyerData(overrides: any = {}) {
    return {
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      gsmNumber: '+905551234567',
      address: 'Test Address, Istanbul',
      city: 'Istanbul',
      country: 'Turkey',
      zipCode: '34000',
      ...overrides
    };
  }

  /**
   * Create mock discount validation result
   */
  static createMockDiscountValidation(isValid: boolean = true, overrides: any = {}) {
    if (!isValid) {
      return {
        isValid: false,
        errorMessage: 'Invalid discount code',
        discountCode: null,
        calculatedDiscount: null,
        ...overrides
      };
    }

    return {
      isValid: true,
      errorMessage: null,
      discountCode: this.createMockDiscountCode(),
      calculatedDiscount: {
        originalAmount: 949.00,
        discountAmount: 189.80,
        finalAmount: 759.20
      },
      ...overrides
    };
  }

  /**
   * Wait for a specified time (useful for async tests)
   */
  static async wait(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a random ID
   */
  static generateId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a date in the future
   */
  static futureDate(days: number = 7): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Create a date in the past
   */
  static pastDate(days: number = 7): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Mock Prisma client
   */
  static createMockPrisma() {
    return {
      businessSubscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      subscriptionPlan: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      discountCode: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      discountCodeUsage: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      paymentMethod: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      $transaction: jest.fn((callback) => callback({
        businessSubscription: this.businessSubscription,
        subscriptionPlan: this.subscriptionPlan,
        discountCode: this.discountCode,
        discountCodeUsage: this.discountCodeUsage,
        payment: this.payment,
        paymentMethod: this.paymentMethod
      }))
    };
  }
}
