import { PaymentService } from '../../../src/services/domain/payment/paymentService';
import { RepositoryContainer } from '../../../src/repositories';
import { PaymentStatus, SubscriptionStatus } from '../../../src/types/business';
import { MockFactories } from '../../utils/mockFactories';
import {
  TEST_BUSINESS_IDS,
  TEST_USER_IDS,
  TEST_PLAN_IDS,
  TEST_PRICES,
  TEST_CARD_DATA,
  TEST_BUYER_DATA,
  TEST_IYZICO_RESPONSES,
  TEST_ERROR_MESSAGES
} from '../../utils/testData';

// Mock Iyzipay
jest.mock('iyzipay', () => {
  return jest.fn().mockImplementation(() => ({
    payment: {
      create: jest.fn(),
      retrieve: jest.fn()
    },
    refund: {
      create: jest.fn()
    },
    cancel: {
      create: jest.fn()
    }
  }));
});

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockRepositories: any;
  let mockIyzipay: any;

  beforeEach(() => {
    // Create mock repositories
    mockRepositories = {
      payment: {
        create: jest.fn(),
        findById: jest.fn(),
        findBySubscription: jest.fn(),
        update: jest.fn()
      },
      paymentMethod: {
        create: jest.fn(),
        findById: jest.fn(),
        findByBusiness: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      businessSubscription: {
        findById: jest.fn(),
        update: jest.fn()
      },
      subscriptionPlan: {
        findById: jest.fn()
      },
      discountCode: {
        findByCode: jest.fn()
      },
      discountCodeUsage: {
        create: jest.fn()
      }
    };

    // Create mock Iyzipay instance
    mockIyzipay = {
      payment: {
        create: jest.fn(),
        retrieve: jest.fn()
      },
      refund: {
        create: jest.fn()
      },
      cancel: {
        create: jest.fn()
      }
    };

    paymentService = new PaymentService(mockRepositories as any);
    (paymentService as any).iyzipay = mockIyzipay;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscriptionForBusiness', () => {
    it('should create payment for trial subscription with discount', async () => {
      const businessId = TEST_BUSINESS_IDS.TRIAL;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;
      const paymentData = {
        card: TEST_CARD_DATA.VALID_MASTERCARD,
        buyer: TEST_BUYER_DATA.VALID,
        installment: '1',
        discountCode: 'WELCOME20'
      };

      const mockPlan = MockFactories.subscriptionPlan({
        id: planId,
        price: TEST_PRICES.BASIC_TIER1
      });

      const mockDiscount = MockFactories.discountCode({
        code: 'WELCOME20',
        discountValue: 20
      });

      const mockSubscription = MockFactories.trialSubscription({
        businessId,
        planId
      });

      const mockPaymentMethod = MockFactories.paymentMethod({
        businessId
      });

      const mockPayment = MockFactories.paymentWithDiscount('WELCOME20', {
        businessId,
        subscriptionId: mockSubscription.id,
        amount: TEST_PRICES.BASIC_TIER1 * 0.8 // 20% off
      });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockPlan);
      mockRepositories.discountCode.findByCode.mockResolvedValue(mockDiscount);
      mockRepositories.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockRepositories.businessSubscription.findById.mockResolvedValue(null);
      mockRepositories.businessSubscription.update.mockResolvedValue(mockSubscription);
      mockRepositories.payment.create.mockResolvedValue(mockPayment);

      mockIyzipay.payment.create.mockImplementation((request, callback) => {
        callback(null, TEST_IYZICO_RESPONSES.PAYMENT_SUCCESS);
      });

      const result = await paymentService.createSubscriptionForBusiness(
        businessId,
        planId,
        paymentData
      );

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe(mockSubscription.id);
      expect(result.paymentId).toBeDefined();
      expect(result.discountApplied).toBe(true);
      expect(mockRepositories.payment.create).toHaveBeenCalled();
      expect(mockRepositories.discountCodeUsage.create).toHaveBeenCalled();
    });

    it('should create immediate payment for premium plan (no trial)', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.PREMIUM_TIER1;
      const paymentData = {
        card: TEST_CARD_DATA.VALID_VISA,
        buyer: TEST_BUYER_DATA.VALID,
        installment: '1'
      };

      const mockPlan = MockFactories.premiumPlan({
        id: planId,
        price: TEST_PRICES.PREMIUM_TIER1,
        features: { trialDays: 0 }
      });

      const mockSubscription = MockFactories.businessSubscription({
        businessId,
        planId,
        status: SubscriptionStatus.ACTIVE
      });

      const mockPaymentMethod = MockFactories.paymentMethod({ businessId });
      const mockPayment = MockFactories.payment({
        businessId,
        subscriptionId: mockSubscription.id,
        amount: TEST_PRICES.PREMIUM_TIER1,
        status: PaymentStatus.SUCCEEDED
      });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockPlan);
      mockRepositories.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockRepositories.businessSubscription.findById.mockResolvedValue(null);
      mockRepositories.businessSubscription.update.mockResolvedValue(mockSubscription);
      mockRepositories.payment.create.mockResolvedValue(mockPayment);

      mockIyzipay.payment.create.mockImplementation((request, callback) => {
        callback(null, {
          ...TEST_IYZICO_RESPONSES.PAYMENT_SUCCESS,
          paidPrice: String(TEST_PRICES.PREMIUM_TIER1)
        });
      });

      const result = await paymentService.createSubscriptionForBusiness(
        businessId,
        planId,
        paymentData
      );

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe(mockSubscription.id);
      expect(result.discountApplied).toBe(false);
      expect(mockIyzipay.payment.create).toHaveBeenCalled();
    });

    it('should handle payment failure', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;
      const paymentData = {
        card: TEST_CARD_DATA.INSUFFICIENT_FUNDS,
        buyer: TEST_BUYER_DATA.VALID,
        installment: '1'
      };

      const mockPlan = MockFactories.subscriptionPlan({
        id: planId,
        price: TEST_PRICES.BASIC_TIER1
      });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockPlan);

      mockIyzipay.payment.create.mockImplementation((request, callback) => {
        callback(null, TEST_IYZICO_RESPONSES.PAYMENT_FAILURE);
      });

      await expect(
        paymentService.createSubscriptionForBusiness(businessId, planId, paymentData)
      ).rejects.toThrow();
    });

    it('should throw error if plan not found', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = 'non-existent';
      const paymentData = {
        card: TEST_CARD_DATA.VALID_VISA,
        buyer: TEST_BUYER_DATA.VALID,
        installment: '1'
      };

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(null);

      await expect(
        paymentService.createSubscriptionForBusiness(businessId, planId, paymentData)
      ).rejects.toThrow('Subscription plan not found');
    });

    it('should validate card information before processing', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const planId = TEST_PLAN_IDS.BASIC_TIER1;
      const paymentData = {
        card: {
          ...TEST_CARD_DATA.VALID_VISA,
          cardNumber: 'invalid'
        },
        buyer: TEST_BUYER_DATA.VALID,
        installment: '1'
      };

      const mockPlan = MockFactories.subscriptionPlan({ id: planId });

      mockRepositories.subscriptionPlan.findById.mockResolvedValue(mockPlan);

      await expect(
        paymentService.createSubscriptionForBusiness(businessId, planId, paymentData)
      ).rejects.toThrow();
    });
  });

  describe('refundPayment', () => {
    it('should process full refund successfully', async () => {
      const paymentId = 'pay-123';
      const amount = TEST_PRICES.BASIC_TIER1;
      const reason = 'Customer requested refund';

      const mockPayment = MockFactories.payment({
        id: paymentId,
        amount,
        status: PaymentStatus.SUCCEEDED,
        paymentGatewayId: 'iyzico-pay-123'
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        refundedAmount: amount,
        status: PaymentStatus.REFUNDED
      });

      mockIyzipay.refund.create.mockImplementation((request, callback) => {
        callback(null, TEST_IYZICO_RESPONSES.REFUND_SUCCESS);
      });

      const result = await paymentService.refundPayment(paymentId, amount, reason);

      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
      expect(mockIyzipay.refund.create).toHaveBeenCalled();
      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({
          refundedAmount: amount,
          status: PaymentStatus.REFUNDED
        })
      );
    });

    it('should process partial refund successfully', async () => {
      const paymentId = 'pay-123';
      const originalAmount = TEST_PRICES.BASIC_TIER1;
      const refundAmount = originalAmount / 2;
      const reason = 'Partial refund requested';

      const mockPayment = MockFactories.payment({
        id: paymentId,
        amount: originalAmount,
        status: PaymentStatus.SUCCEEDED
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        refundedAmount: refundAmount,
        status: PaymentStatus.PARTIALLY_REFUNDED
      });

      mockIyzipay.refund.create.mockImplementation((request, callback) => {
        callback(null, {
          ...TEST_IYZICO_RESPONSES.REFUND_SUCCESS,
          price: String(refundAmount)
        });
      });

      const result = await paymentService.refundPayment(paymentId, refundAmount, reason);

      expect(result.success).toBe(true);
      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({
          refundedAmount: refundAmount,
          status: PaymentStatus.PARTIALLY_REFUNDED
        })
      );
    });

    it('should throw error if payment not found', async () => {
      const paymentId = 'non-existent';

      mockRepositories.payment.findById.mockResolvedValue(null);

      await expect(
        paymentService.refundPayment(paymentId, 100, 'Test')
      ).rejects.toThrow('Payment not found');
    });

    it('should throw error if payment already refunded', async () => {
      const paymentId = 'pay-123';

      const mockPayment = MockFactories.payment({
        id: paymentId,
        status: PaymentStatus.REFUNDED,
        refundedAmount: TEST_PRICES.BASIC_TIER1
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);

      await expect(
        paymentService.refundPayment(paymentId, 100, 'Test')
      ).rejects.toThrow('Payment already refunded');
    });

    it('should throw error if refund amount exceeds payment amount', async () => {
      const paymentId = 'pay-123';
      const paymentAmount = TEST_PRICES.BASIC_TIER1;
      const refundAmount = paymentAmount * 2; // More than paid

      const mockPayment = MockFactories.payment({
        id: paymentId,
        amount: paymentAmount,
        status: PaymentStatus.SUCCEEDED
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);

      await expect(
        paymentService.refundPayment(paymentId, refundAmount, 'Test')
      ).rejects.toThrow('Refund amount exceeds payment amount');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel pending payment successfully', async () => {
      const paymentId = 'pay-123';
      const reason = 'Customer canceled order';

      const mockPayment = MockFactories.payment({
        id: paymentId,
        status: PaymentStatus.PENDING,
        paymentGatewayId: 'iyzico-pay-123'
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.CANCELED,
        failureReason: reason
      });

      mockIyzipay.cancel.create.mockImplementation((request, callback) => {
        callback(null, { status: 'success' });
      });

      const result = await paymentService.cancelPayment(paymentId, reason);

      expect(result.success).toBe(true);
      expect(mockIyzipay.cancel.create).toHaveBeenCalled();
      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({
          status: PaymentStatus.CANCELED
        })
      );
    });

    it('should throw error if payment not found', async () => {
      const paymentId = 'non-existent';

      mockRepositories.payment.findById.mockResolvedValue(null);

      await expect(
        paymentService.cancelPayment(paymentId, 'Test')
      ).rejects.toThrow('Payment not found');
    });

    it('should throw error if payment already completed', async () => {
      const paymentId = 'pay-123';

      const mockPayment = MockFactories.payment({
        id: paymentId,
        status: PaymentStatus.SUCCEEDED
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);

      await expect(
        paymentService.cancelPayment(paymentId, 'Test')
      ).rejects.toThrow('Cannot cancel completed payment');
    });
  });

  describe('retrievePayment', () => {
    it('should retrieve payment by ID', async () => {
      const paymentId = 'pay-123';

      const mockPayment = MockFactories.payment({
        id: paymentId,
        status: PaymentStatus.SUCCEEDED
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);

      const result = await paymentService.retrievePayment(paymentId);

      expect(result.success).toBe(true);
      expect(result.payment).toEqual(mockPayment);
      expect(mockRepositories.payment.findById).toHaveBeenCalledWith(paymentId);
    });

    it('should throw error if payment not found', async () => {
      const paymentId = 'non-existent';

      mockRepositories.payment.findById.mockResolvedValue(null);

      await expect(
        paymentService.retrievePayment(paymentId)
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getSubscriptionWithPayments', () => {
    it('should return subscription with payment history', async () => {
      const businessId = TEST_BUSINESS_IDS.ACTIVE;
      const subscriptionId = 'sub-123';

      const mockSubscription = MockFactories.businessSubscription({
        id: subscriptionId,
        businessId,
        status: SubscriptionStatus.ACTIVE
      });

      const mockPayments = [
        MockFactories.payment({
          subscriptionId,
          businessId,
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date('2024-01-01')
        }),
        MockFactories.payment({
          subscriptionId,
          businessId,
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date('2024-02-01')
        })
      ];

      mockRepositories.businessSubscription.findById.mockResolvedValue(mockSubscription);
      mockRepositories.payment.findBySubscription.mockResolvedValue(mockPayments);

      const result = await paymentService.getSubscriptionWithPayments(businessId);

      expect(result.success).toBe(true);
      expect(result.subscription).toEqual(mockSubscription);
      expect(result.subscription.payments).toEqual(mockPayments);
      expect(mockPayments).toHaveLength(2);
    });

    it('should return subscription with empty payments array if no payments', async () => {
      const businessId = TEST_BUSINESS_IDS.TRIAL;

      const mockSubscription = MockFactories.trialSubscription({
        businessId,
        status: SubscriptionStatus.TRIAL
      });

      mockRepositories.businessSubscription.findById.mockResolvedValue(mockSubscription);
      mockRepositories.payment.findBySubscription.mockResolvedValue([]);

      const result = await paymentService.getSubscriptionWithPayments(businessId);

      expect(result.success).toBe(true);
      expect(result.subscription.payments).toEqual([]);
    });

    it('should throw error if subscription not found', async () => {
      const businessId = 'non-existent';

      mockRepositories.businessSubscription.findById.mockResolvedValue(null);

      await expect(
        paymentService.getSubscriptionWithPayments(businessId)
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('processPaymentRetry', () => {
    it('should retry failed payment successfully', async () => {
      const paymentId = 'pay-123';

      const mockPayment = MockFactories.failedPayment({
        id: paymentId,
        businessId: TEST_BUSINESS_IDS.ACTIVE,
        status: PaymentStatus.FAILED,
        metadata: {
          retryCount: 0,
          maxRetries: 3
        }
      });

      const mockPaymentMethod = MockFactories.paymentMethod({
        businessId: mockPayment.businessId
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.paymentMethod.findById.mockResolvedValue(mockPaymentMethod);

      mockIyzipay.payment.create.mockImplementation((request, callback) => {
        callback(null, TEST_IYZICO_RESPONSES.PAYMENT_SUCCESS);
      });

      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED
      });

      const result = await paymentService.processPaymentRetry(paymentId);

      expect(result.success).toBe(true);
      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({
          status: PaymentStatus.SUCCEEDED
        })
      );
    });

    it('should fail after max retries reached', async () => {
      const paymentId = 'pay-123';

      const mockPayment = MockFactories.failedPayment({
        id: paymentId,
        businessId: TEST_BUSINESS_IDS.ACTIVE,
        status: PaymentStatus.FAILED,
        metadata: {
          retryCount: 3,
          maxRetries: 3
        }
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);

      await expect(
        paymentService.processPaymentRetry(paymentId)
      ).rejects.toThrow('Maximum retry attempts reached');
    });

    it('should increment retry count on failure', async () => {
      const paymentId = 'pay-123';

      const mockPayment = MockFactories.failedPayment({
        id: paymentId,
        businessId: TEST_BUSINESS_IDS.ACTIVE,
        status: PaymentStatus.FAILED,
        metadata: {
          retryCount: 1,
          maxRetries: 3
        }
      });

      const mockPaymentMethod = MockFactories.paymentMethod({
        businessId: mockPayment.businessId
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.paymentMethod.findById.mockResolvedValue(mockPaymentMethod);

      mockIyzipay.payment.create.mockImplementation((request, callback) => {
        callback(null, TEST_IYZICO_RESPONSES.PAYMENT_FAILURE);
      });

      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        metadata: {
          ...mockPayment.metadata,
          retryCount: 2
        }
      });

      await expect(
        paymentService.processPaymentRetry(paymentId)
      ).rejects.toThrow();

      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({
          metadata: expect.objectContaining({
            retryCount: 2
          })
        })
      );
    });
  });

  describe('getTestCards', () => {
    it('should return list of test cards', () => {
      const result = paymentService.getTestCards();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('cardNumber');
      expect(result[0]).toHaveProperty('brand');
      expect(result[0]).toHaveProperty('type');
    });

    it('should include success and failure test cards', () => {
      const result = paymentService.getTestCards();

      const successCards = result.filter(card => card.type === 'success');
      const failureCards = result.filter(card => card.type === 'failure');

      expect(successCards.length).toBeGreaterThan(0);
      expect(failureCards.length).toBeGreaterThan(0);
    });
  });

  describe('validateCardData', () => {
    it('should validate correct card data', () => {
      const cardData = TEST_CARD_DATA.VALID_VISA;

      const result = (paymentService as any).validateCardData(cardData);

      expect(result).toBe(true);
    });

    it('should reject invalid card number', () => {
      const cardData = {
        ...TEST_CARD_DATA.VALID_VISA,
        cardNumber: '1234'
      };

      const result = (paymentService as any).validateCardData(cardData);

      expect(result).toBe(false);
    });

    it('should reject expired card', () => {
      const cardData = TEST_CARD_DATA.EXPIRED_CARD;

      const result = (paymentService as any).validateCardData(cardData);

      expect(result).toBe(false);
    });

    it('should reject invalid CVV', () => {
      const cardData = {
        ...TEST_CARD_DATA.VALID_VISA,
        cvc: '12' // Too short
      };

      const result = (paymentService as any).validateCardData(cardData);

      expect(result).toBe(false);
    });
  });

  describe('webhookHandler', () => {
    it('should handle successful payment webhook', async () => {
      const webhookData = {
        status: 'success',
        paymentId: 'pay-123',
        conversationId: 'conv-123'
      };

      const mockPayment = MockFactories.payment({
        id: 'pay-123',
        status: PaymentStatus.PENDING
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED
      });

      const result = await paymentService.webhookHandler(webhookData);

      expect(result.success).toBe(true);
      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        'pay-123',
        expect.objectContaining({
          status: PaymentStatus.SUCCEEDED
        })
      );
    });

    it('should handle failed payment webhook', async () => {
      const webhookData = {
        status: 'failure',
        paymentId: 'pay-123',
        conversationId: 'conv-123',
        errorMessage: 'Insufficient funds'
      };

      const mockPayment = MockFactories.payment({
        id: 'pay-123',
        status: PaymentStatus.PENDING
      });

      mockRepositories.payment.findById.mockResolvedValue(mockPayment);
      mockRepositories.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
        failureReason: 'Insufficient funds'
      });

      const result = await paymentService.webhookHandler(webhookData);

      expect(result.success).toBe(false);
      expect(mockRepositories.payment.update).toHaveBeenCalledWith(
        'pay-123',
        expect.objectContaining({
          status: PaymentStatus.FAILED,
          failureReason: 'Insufficient funds'
        })
      );
    });

    it('should verify webhook signature', async () => {
      const webhookData = {
        status: 'success',
        paymentId: 'pay-123',
        conversationId: 'conv-123',
        signature: 'invalid-signature'
      };

      await expect(
        paymentService.webhookHandler(webhookData)
      ).rejects.toThrow('Invalid webhook signature');
    });
  });
});
