import { Request, Response } from 'express';
import { PaymentController } from '../../../src/controllers/paymentController';
import { PaymentService } from '../../../src/services/paymentService';
import { TestHelpers } from '../../utils/testHelpers';
import { GuaranteedAuthRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/paymentService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('PaymentController', () => {
  let paymentController: PaymentController;
  let mockPaymentService: any;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockGuaranteedAuthRequest: GuaranteedAuthRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock PaymentService
    mockPaymentService = {
      createSubscriptionPayment: jest.fn(),
      refundPayment: jest.fn(),
      cancelPayment: jest.fn(),
      getPayment: jest.fn(),
      getPaymentHistory: jest.fn(),
      getTestCards: jest.fn(),
      getSubscriptionPlans: jest.fn(),
      webhookHandler: jest.fn()
    };

    // Create PaymentController instance
    paymentController = new PaymentController(mockPaymentService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();

    mockGuaranteedAuthRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockGuaranteedAuthRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };
  });

  describe('constructor', () => {
    it('should create PaymentController instance', () => {
      expect(paymentController).toBeInstanceOf(PaymentController);
    });
  });

  describe('createSubscriptionPayment', () => {
    it('should create subscription payment successfully', async () => {
      // Arrange
      const paymentData = {
        businessId: 'business-123',
        planId: 'plan-pro',
        paymentMethodId: 'pm_123',
        amount: 59.99
      };

      mockGuaranteedAuthRequest.body = paymentData;

      const mockPayment = {
        id: 'payment-123',
        businessId: 'business-123',
        planId: 'plan-pro',
        amount: 59.99,
        status: 'succeeded'
      };

      mockPaymentService.createSubscriptionPayment.mockResolvedValue(mockPayment);

      // Act
      await paymentController.createSubscriptionPayment(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockPaymentService.createSubscriptionPayment).toHaveBeenCalledWith('user-123', paymentData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });
  });

  describe('refundPayment', () => {
    it('should refund payment successfully', async () => {
      // Arrange
      const refundData = {
        paymentId: 'payment-123',
        amount: 29.99,
        reason: 'Customer requested refund'
      };

      mockGuaranteedAuthRequest.body = refundData;

      const mockRefund = {
        id: 'refund-123',
        paymentId: 'payment-123',
        amount: 29.99,
        status: 'succeeded'
      };

      mockPaymentService.refundPayment.mockResolvedValue(mockRefund);

      // Act
      await paymentController.refundPayment(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith('user-123', refundData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRefund
      });
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      // Arrange
      const paymentId = 'payment-123';
      mockGuaranteedAuthRequest.params = { id: paymentId };

      const mockCancelledPayment = {
        id: paymentId,
        status: 'canceled'
      };

      mockPaymentService.cancelPayment.mockResolvedValue(mockCancelledPayment);

      // Act
      await paymentController.cancelPayment(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockPaymentService.cancelPayment).toHaveBeenCalledWith('user-123', paymentId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledPayment
      });
    });
  });

  describe('getPayment', () => {
    it('should get payment successfully', async () => {
      // Arrange
      const paymentId = 'payment-123';
      mockGuaranteedAuthRequest.params = { id: paymentId };

      const mockPayment = {
        id: paymentId,
        businessId: 'business-123',
        planId: 'plan-pro',
        amount: 59.99,
        status: 'succeeded',
        createdAt: '2024-01-15T00:00:00Z'
      };

      mockPaymentService.getPayment.mockResolvedValue(mockPayment);

      // Act
      await paymentController.getPayment(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockPaymentService.getPayment).toHaveBeenCalledWith('user-123', paymentId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const page = 1;
      const limit = 10;

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.query = { page: page.toString(), limit: limit.toString() };

      const mockPaymentHistory = {
        payments: [
          { id: 'payment-1', amount: 59.99, status: 'succeeded' },
          { id: 'payment-2', amount: 29.99, status: 'succeeded' }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockPaymentService.getPaymentHistory.mockResolvedValue(mockPaymentHistory);

      // Act
      await paymentController.getPaymentHistory(mockGuaranteedAuthRequest, mockResponse);

      // Assert
      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalledWith('user-123', businessId, page, limit);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPaymentHistory
      });
    });
  });

  describe('getTestCards', () => {
    it('should get test cards successfully', async () => {
      // Arrange
      const mockTestCards = [
        { id: 'card-1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
        { id: 'card-2', brand: 'mastercard', last4: '5555', expMonth: 10, expYear: 2026 }
      ];

      mockPaymentService.getTestCards.mockResolvedValue(mockTestCards);

      // Act
      await paymentController.getTestCards(mockRequest, mockResponse);

      // Assert
      expect(mockPaymentService.getTestCards).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTestCards
      });
    });
  });

  describe('getSubscriptionPlans', () => {
    it('should get subscription plans successfully', async () => {
      // Arrange
      const mockPlans = [
        { id: 'plan-basic', name: 'Basic', price: 29.99, features: ['unlimited_appointments'] },
        { id: 'plan-pro', name: 'Pro', price: 59.99, features: ['unlimited_appointments', 'sms_notifications'] }
      ];

      mockPaymentService.getSubscriptionPlans.mockResolvedValue(mockPlans);

      // Act
      await paymentController.getSubscriptionPlans(mockRequest, mockResponse);

      // Assert
      expect(mockPaymentService.getSubscriptionPlans).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans
      });
    });
  });

  describe('webhookHandler', () => {
    it('should handle webhook successfully', async () => {
      // Arrange
      const webhookData = {
        type: 'payment.succeeded',
        data: {
          object: {
            id: 'payment-123',
            amount: 59.99,
            status: 'succeeded'
          }
        }
      };

      mockRequest.body = webhookData;

      const mockResult = {
        success: true,
        message: 'Webhook processed successfully'
      };

      mockPaymentService.webhookHandler.mockResolvedValue(mockResult);

      // Act
      await paymentController.webhookHandler(mockRequest, mockResponse);

      // Assert
      expect(mockPaymentService.webhookHandler).toHaveBeenCalledWith(webhookData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });
});
