import { PaymentService, PaymentCardData, PaymentBuyerData, CreatePaymentRequest, PaymentResponse } from '../../../src/services/paymentService';
import { PrismaClient, PaymentStatus, SubscriptionStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('iyzipay');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockPrisma: any;
  let mockIyzico: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      business: {
        findUnique: jest.fn()
      },
      subscriptionPlan: {
        findUnique: jest.fn()
      },
      businessSubscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn()
      },
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
      },
      storedPaymentMethod: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      }
    };

    // Create mock Iyzico
    mockIyzico = {
      payment: {
        create: jest.fn(),
        retrieve: jest.fn()
      },
      refund: {
        create: jest.fn()
      },
      LOCALE: { TR: 'tr' },
      CURRENCY: { TRY: 'TRY', USD: 'USD' }
    };

    // Mock Iyzico constructor
    const Iyzipay = require('iyzipay');
    Iyzipay.mockImplementation(() => mockIyzico);

    // Create PaymentService instance
    paymentService = new PaymentService(mockPrisma as PrismaClient);
  });

  describe('createSubscriptionForBusiness', () => {
    it('should create subscription successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const planId = 'plan-123';
      const paymentData = {
        card: {
          cardHolderName: 'John Doe',
          cardNumber: '5528790000000008',
          expireMonth: '12',
          expireYear: '2030',
          cvc: '123'
        } as PaymentCardData,
        buyer: {
          name: 'John',
          surname: 'Doe',
          email: 'john@example.com'
        } as Partial<PaymentBuyerData>
      };

      const mockBusiness = {
        id: businessId,
        ownerId: 'owner-123',
        email: 'business@example.com',
        phone: '+905551234567',
        address: 'Test Address',
        city: 'Istanbul',
        country: 'Turkey',
        postalCode: '34000',
        owner: {
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+905551234567'
        }
      };

      const mockPlan = {
        id: planId,
        displayName: 'Basic Plan',
        price: '100.00',
        currency: 'TRY',
        billingInterval: 'monthly'
      };

      const mockSubscription = {
        id: 'sub-123',
        businessId,
        planId,
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date()
      };

      const mockPayment = {
        id: 'pay-123',
        businessSubscriptionId: 'sub-123',
        amount: 100,
        currency: 'TRY',
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: 'card',
        paymentProvider: 'iyzico',
        providerPaymentId: 'iyzico-pay-123',
        paidAt: new Date()
      };

      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.businessSubscription.findUnique.mockResolvedValue(null);
      mockPrisma.businessSubscription.upsert.mockResolvedValue(mockSubscription);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.businessSubscription.update.mockResolvedValue({});

      // Mock Iyzico payment creation
      mockIyzico.payment.create.mockImplementation((request, callback) => {
        callback(null, {
          status: 'success',
          paymentId: 'iyzico-pay-123',
          cardType: 'CREDIT_CARD',
          cardAssociation: 'MASTERCARD',
          cardFamily: 'Bonus',
          lastFourDigits: '0008',
          binNumber: '552879'
        });
      });

      // Act
      const result = await paymentService.createSubscriptionForBusiness(businessId, planId, paymentData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.paymentId).toBe('pay-123');
      expect(mockPrisma.businessSubscription.upsert).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalled();
    });

    it('should return error if business not found', async () => {
      // Arrange
      const businessId = 'non-existent';
      const planId = 'plan-123';
      const paymentData = {
        card: {} as PaymentCardData,
        buyer: {} as Partial<PaymentBuyerData>
      };

      mockPrisma.business.findUnique.mockResolvedValue(null);

      // Act
      const result = await paymentService.createSubscriptionForBusiness(businessId, planId, paymentData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Business not found');
    });

    it('should return error if plan not found', async () => {
      // Arrange
      const businessId = 'business-123';
      const planId = 'non-existent';
      const paymentData = {
        card: {} as PaymentCardData,
        buyer: {} as Partial<PaymentBuyerData>
      };

      const mockBusiness = {
        id: businessId,
        ownerId: 'owner-123',
        owner: { firstName: 'John', lastName: 'Doe' }
      };

      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      // Act
      const result = await paymentService.createSubscriptionForBusiness(businessId, planId, paymentData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription plan not found');
    });

    it('should return error if business already has active subscription', async () => {
      // Arrange
      const businessId = 'business-123';
      const planId = 'plan-123';
      const paymentData = {
        card: {} as PaymentCardData,
        buyer: {} as Partial<PaymentBuyerData>
      };

      const mockBusiness = {
        id: businessId,
        ownerId: 'owner-123',
        owner: { firstName: 'John', lastName: 'Doe' }
      };

      const mockPlan = {
        id: planId,
        displayName: 'Basic Plan',
        price: '100.00',
        currency: 'TRY',
        billingInterval: 'monthly'
      };

      const mockExistingSubscription = {
        id: 'sub-123',
        businessId,
        status: 'ACTIVE'
      };

      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.businessSubscription.findUnique.mockResolvedValue(mockExistingSubscription);

      // Act
      const result = await paymentService.createSubscriptionForBusiness(businessId, planId, paymentData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Business already has an active subscription');
    });
  });

  describe('getSubscriptionWithPayments', () => {
    it('should return subscription with payments', async () => {
      // Arrange
      const businessId = 'business-123';
      const mockSubscription = {
        id: 'sub-123',
        businessId,
        planId: 'plan-123',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        plan: {
          id: 'plan-123',
          displayName: 'Basic Plan',
          price: '100.00'
        },
        payments: [
          {
            id: 'pay-123',
            amount: 100,
            status: PaymentStatus.SUCCEEDED,
            createdAt: new Date()
          }
        ],
        business: {
          name: 'Test Business',
          owner: {
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+905551234567'
          }
        }
      };

      mockPrisma.businessSubscription.findUnique.mockResolvedValue(mockSubscription);

      // Act
      const result = await paymentService.getSubscriptionWithPayments(businessId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.subscription).toEqual({
        ...mockSubscription,
        isTrialActive: false,
        daysUntilExpiry: expect.any(Number)
      });
    });

    it('should return error if subscription not found', async () => {
      // Arrange
      const businessId = 'non-existent';
      mockPrisma.businessSubscription.findUnique.mockResolvedValue(null);

      // Act
      const result = await paymentService.getSubscriptionWithPayments(businessId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription not found');
    });
  });

  describe('createSubscriptionPayment', () => {
    it('should create subscription payment successfully', async () => {
      // Arrange
      const businessSubscriptionId = 'sub-123';
      const paymentData: CreatePaymentRequest = {
        conversationId: 'conv-123',
        price: '100.00',
        paidPrice: '100.00',
        currency: 'TRY',
        installment: '1',
        basketId: 'basket-123',
        paymentChannel: 'WEB',
        paymentGroup: 'SUBSCRIPTION',
        card: {
          cardHolderName: 'John Doe',
          cardNumber: '5528790000000008',
          expireMonth: '12',
          expireYear: '2030',
          cvc: '123'
        },
        buyer: {
          id: 'BY123',
          name: 'John',
          surname: 'Doe',
          email: 'john@example.com',
          identityNumber: '11111111111',
          registrationDate: '2024-01-01 12:00:00',
          registrationAddress: 'Test Address',
          ip: '127.0.0.1',
          city: 'Istanbul',
          country: 'Turkey'
        },
        shippingAddress: {
          contactName: 'John Doe',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address'
        },
        billingAddress: {
          contactName: 'John Doe',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address'
        },
        basketItems: [
          {
            id: 'plan-123',
            name: 'Basic Plan Subscription',
            category1: 'Subscription',
            itemType: 'VIRTUAL',
            price: '100.00'
          }
        ]
      };

      const mockPayment = {
        id: 'pay-123',
        businessSubscriptionId,
        amount: 100,
        currency: 'TRY',
        status: PaymentStatus.SUCCEEDED
      };

      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.businessSubscription.update.mockResolvedValue({});

      // Mock Iyzico payment creation
      mockIyzico.payment.create.mockImplementation((request, callback) => {
        callback(null, {
          status: 'success',
          paymentId: 'iyzico-pay-123',
          cardType: 'CREDIT_CARD',
          cardAssociation: 'MASTERCARD'
        });
      });

      // Act
      const result = await paymentService.createSubscriptionPayment(businessSubscriptionId, paymentData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('pay-123');
      expect(result.iyzicoPaymentId).toBe('iyzico-pay-123');
      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { id: businessSubscriptionId },
        data: { status: SubscriptionStatus.ACTIVE }
      });
    });

    it('should handle payment failure', async () => {
      // Arrange
      const businessSubscriptionId = 'sub-123';
      const paymentData: CreatePaymentRequest = {
        conversationId: 'conv-123',
        price: '100.00',
        paidPrice: '100.00',
        currency: 'TRY',
        installment: '1',
        basketId: 'basket-123',
        paymentChannel: 'WEB',
        paymentGroup: 'SUBSCRIPTION',
        card: {
          cardHolderName: 'John Doe',
          cardNumber: '5406670000000009',
          expireMonth: '12',
          expireYear: '2030',
          cvc: '123'
        },
        buyer: {
          id: 'BY123',
          name: 'John',
          surname: 'Doe',
          email: 'john@example.com',
          identityNumber: '11111111111',
          registrationDate: '2024-01-01 12:00:00',
          registrationAddress: 'Test Address',
          ip: '127.0.0.1',
          city: 'Istanbul',
          country: 'Turkey'
        },
        shippingAddress: {
          contactName: 'John Doe',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address'
        },
        billingAddress: {
          contactName: 'John Doe',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address'
        },
        basketItems: [
          {
            id: 'plan-123',
            name: 'Basic Plan Subscription',
            category1: 'Subscription',
            itemType: 'VIRTUAL',
            price: '100.00'
          }
        ]
      };

      mockPrisma.payment.create.mockResolvedValue({});

      // Mock Iyzico payment failure
      mockIyzico.payment.create.mockImplementation((request, callback) => {
        callback(null, {
          status: 'failure',
          errorMessage: 'Payment failed'
        });
      });

      // Act
      const result = await paymentService.createSubscriptionPayment(businessSubscriptionId, paymentData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: PaymentStatus.FAILED
        })
      });
    });
  });

  describe('refundPayment', () => {
    it('should refund payment successfully', async () => {
      // Arrange
      const paymentId = 'pay-123';
      const mockPayment = {
        id: paymentId,
        amount: 100,
        currency: 'TRY',
        status: PaymentStatus.SUCCEEDED,
        providerPaymentId: 'iyzico-pay-123'
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({});

      // Mock Iyzico refund
      mockIyzico.refund.create.mockImplementation((request, callback) => {
        callback(null, {
          status: 'success',
          paymentId: 'iyzico-refund-123'
        });
      });

      // Act
      const result = await paymentService.refundPayment(paymentId, 100, 'Customer request');

      // Assert
      expect(result.success).toBe(true);
      expect(result.refundId).toBe('iyzico-refund-123');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: expect.any(Date),
          metadata: expect.objectContaining({
            refund: expect.objectContaining({
              refundId: 'iyzico-refund-123',
              refundAmount: 100,
              refundReason: 'Customer request'
            })
          })
        }
      });
    });

    it('should return error if payment not found', async () => {
      // Arrange
      const paymentId = 'non-existent';
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      // Act
      const result = await paymentService.refundPayment(paymentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment not found');
    });

    it('should return error if payment not successful', async () => {
      // Arrange
      const paymentId = 'pay-123';
      const mockPayment = {
        id: paymentId,
        amount: 100,
        currency: 'TRY',
        status: PaymentStatus.FAILED,
        providerPaymentId: 'iyzico-pay-123'
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await paymentService.refundPayment(paymentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot refund non-successful payment');
    });
  });

  describe('retrievePayment', () => {
    it('should retrieve payment successfully', async () => {
      // Arrange
      const paymentId = 'pay-123';
      const mockPayment = {
        id: paymentId,
        providerPaymentId: 'iyzico-pay-123'
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Mock Iyzico payment retrieve
      mockIyzico.payment.retrieve.mockImplementation((request, callback) => {
        callback(null, {
          status: 'success',
          paymentId: 'iyzico-pay-123',
          amount: '100.00'
        });
      });

      // Act
      const result = await paymentService.retrievePayment(paymentId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.payment).toEqual({
        status: 'success',
        paymentId: 'iyzico-pay-123',
        amount: '100.00'
      });
    });

    it('should return error if payment not found', async () => {
      // Arrange
      const paymentId = 'non-existent';
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      // Act
      const result = await paymentService.retrievePayment(paymentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment not found');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      // Arrange
      const paymentId = 'pay-123';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.PENDING,
        businessSubscriptionId: 'sub-123',
        businessSubscription: {
          id: 'sub-123'
        }
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({});
      mockPrisma.businessSubscription.update.mockResolvedValue({});

      // Act
      const result = await paymentService.cancelPayment(paymentId, 'Customer request');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment canceled successfully');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELED,
          metadata: expect.objectContaining({
            cancellation: expect.objectContaining({
              canceledAt: expect.any(String),
              reason: 'Customer request'
            })
          })
        }
      });
    });

    it('should return error if payment not found', async () => {
      // Arrange
      const paymentId = 'non-existent';
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      // Act
      const result = await paymentService.cancelPayment(paymentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment not found');
    });

    it('should return error if payment already canceled', async () => {
      // Arrange
      const paymentId = 'pay-123';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.CANCELED,
        businessSubscriptionId: 'sub-123'
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await paymentService.cancelPayment(paymentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment already canceled');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history', async () => {
      // Arrange
      const businessSubscriptionId = 'sub-123';
      const mockPayments = [
        {
          id: 'pay-1',
          amount: 100,
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date()
        },
        {
          id: 'pay-2',
          amount: 100,
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date()
        }
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      // Act
      const result = await paymentService.getPaymentHistory(businessSubscriptionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.payments).toEqual(mockPayments);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { businessSubscriptionId },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('storePaymentMethod', () => {
    it('should store payment method successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const cardData: PaymentCardData = {
        cardHolderName: 'John Doe',
        cardNumber: '5528790000000008',
        expireMonth: '12',
        expireYear: '2030',
        cvc: '123'
      };

      const mockStoredPaymentMethod = {
        id: 'pm-123',
        businessId,
        cardHolderName: 'John Doe',
        lastFourDigits: '0008',
        cardBrand: 'MASTERCARD',
        expiryMonth: '12',
        expiryYear: '2030',
        isDefault: true,
        isActive: true
      };

      mockPrisma.storedPaymentMethod.updateMany.mockResolvedValue({});
      mockPrisma.storedPaymentMethod.create.mockResolvedValue(mockStoredPaymentMethod);

      // Act
      const result = await paymentService.storePaymentMethod(businessId, cardData, true);

      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentMethodId).toBe('pm-123');
      expect(mockPrisma.storedPaymentMethod.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId,
          cardHolderName: 'John Doe',
          lastFourDigits: '0008',
          cardBrand: 'MASTERCARD',
          isDefault: true,
          isActive: true
        })
      });
    });
  });

  describe('getStoredPaymentMethods', () => {
    it('should return stored payment methods', async () => {
      // Arrange
      const businessId = 'business-123';
      const mockPaymentMethods = [
        {
          id: 'pm-1',
          cardHolderName: 'John Doe',
          lastFourDigits: '0008',
          cardBrand: 'MASTERCARD',
          expiryMonth: '12',
          expiryYear: '2030',
          isDefault: true,
          createdAt: new Date()
        },
        {
          id: 'pm-2',
          cardHolderName: 'Jane Doe',
          lastFourDigits: '1234',
          cardBrand: 'VISA',
          expiryMonth: '06',
          expiryYear: '2025',
          isDefault: false,
          createdAt: new Date()
        }
      ];

      mockPrisma.storedPaymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

      // Act
      const result = await paymentService.getStoredPaymentMethods(businessId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentMethods).toHaveLength(2);
      expect(result.paymentMethods[0]).toEqual({
        id: 'pm-1',
        cardHolderName: 'John Doe',
        lastFourDigits: '0008',
        cardBrand: 'MASTERCARD',
        expiryMonth: '12',
        expiryYear: '2030',
        isDefault: true,
        createdAt: mockPaymentMethods[0].createdAt
      });
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const paymentMethodId = 'pm-123';
      const mockPaymentMethod = {
        id: paymentMethodId,
        businessId,
        isActive: true
      };

      mockPrisma.storedPaymentMethod.findFirst.mockResolvedValue(mockPaymentMethod);
      mockPrisma.storedPaymentMethod.update.mockResolvedValue({});

      // Act
      const result = await paymentService.deletePaymentMethod(businessId, paymentMethodId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.storedPaymentMethod.update).toHaveBeenCalledWith({
        where: { id: paymentMethodId },
        data: {
          isActive: false,
          deletedAt: expect.any(Date)
        }
      });
    });

    it('should return error if payment method not found', async () => {
      // Arrange
      const businessId = 'business-123';
      const paymentMethodId = 'non-existent';
      mockPrisma.storedPaymentMethod.findFirst.mockResolvedValue(null);

      // Act
      const result = await paymentService.deletePaymentMethod(businessId, paymentMethodId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment method not found');
    });
  });

  describe('utility methods', () => {
    it('should generate conversation id', () => {
      // Act
      const result = paymentService.generateConversationId();

      // Assert
      expect(result).toMatch(/^conv_\d+_[a-z0-9]+$/);
    });

    it('should generate basket id', () => {
      // Act
      const result = paymentService.generateBasketId();

      // Assert
      expect(result).toMatch(/^basket_\d+_[a-z0-9]+$/);
    });

    it('should create test buyer', () => {
      // Arrange
      const userInfo = {
        name: 'John',
        surname: 'Doe',
        email: 'john@example.com',
        phone: '+905551234567'
      };

      // Act
      const result = paymentService.createTestBuyer(userInfo);

      // Assert
      expect(result).toEqual({
        id: expect.stringMatching(/^BY\d+$/),
        name: 'John',
        surname: 'Doe',
        gsmNumber: '+905551234567',
        email: 'john@example.com',
        identityNumber: '11111111111',
        lastLoginDate: expect.any(String),
        registrationDate: expect.any(String),
        registrationAddress: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
        ip: '127.0.0.1',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34732'
      });
    });

    it('should create subscription basket item', () => {
      // Arrange
      const plan = {
        id: 'plan-123',
        name: 'Basic Plan',
        price: '100.00'
      };

      // Act
      const result = paymentService.createSubscriptionBasketItem(plan);

      // Assert
      expect(result).toEqual({
        id: 'plan-123',
        name: 'Basic Plan Subscription',
        category1: 'Subscription',
        category2: 'Digital Services',
        itemType: 'VIRTUAL',
        price: '100.00'
      });
    });

    it('should return test cards', () => {
      // Act
      const result = paymentService.getTestCards();

      // Assert
      expect(result).toEqual({
        success: {
          cardHolderName: 'John Doe',
          cardNumber: '5528790000000008',
          expireMonth: '12',
          expireYear: '2030',
          cvc: '123'
        },
        failure: {
          cardHolderName: 'John Doe',
          cardNumber: '5406670000000009',
          expireMonth: '12',
          expireYear: '2030',
          cvc: '123'
        },
        threeDsSuccess: {
          cardHolderName: 'John Doe',
          cardNumber: '5528790000000008',
          expireMonth: '12',
          expireYear: '2030',
          cvc: '123'
        }
      });
    });
  });
});

