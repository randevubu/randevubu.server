import { Request, Response } from "express";
import { PaymentController } from "../../../src/controllers/paymentController";
import { GuaranteedAuthRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/paymentService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

// Import the mocked modules
import {
  sendSimpleErrorResponse,
  sendStandardSuccessResponse,
} from "../../../src/utils/errorResponse";

describe("PaymentController", () => {
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
      createSubscriptionForBusiness: jest.fn(),
      refundPayment: jest.fn(),
      cancelPayment: jest.fn(),
      retrievePayment: jest.fn(),
      getSubscriptionWithPayments: jest.fn(),
      getTestCards: jest.fn(),
      prisma: {
        subscriptionPlan: {
          findMany: jest.fn(),
        },
      },
    };

    // Mock the error response utilities
    (sendStandardSuccessResponse as jest.Mock).mockImplementation(
      (res, data, message) => {
        res.json({ success: true, data, message });
      }
    );

    (sendSimpleErrorResponse as jest.Mock).mockImplementation(
      (res, statusCode, message) => {
        res.status(statusCode).json({ success: false, message });
      }
    );

    // Create PaymentController instance
    paymentController = new PaymentController(mockPaymentService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();

    mockGuaranteedAuthRequest =
      TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockGuaranteedAuthRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [{ id: "user-role", name: "USER", level: 1 }],
      effectiveLevel: 1,
    };
    mockGuaranteedAuthRequest.token = {
      userId: "user-123",
      phoneNumber: "+905551234567",
      type: "access",
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };
  });

  describe("constructor", () => {
    it("should create PaymentController instance", () => {
      expect(paymentController).toBeInstanceOf(PaymentController);
    });
  });

  describe("createSubscriptionPayment", () => {
    it("should create subscription payment successfully", async () => {
      // Arrange
      const businessId = "business-123";
      const paymentData = {
        planId: "plan-pro",
        card: {
          cardHolderName: "John Doe",
          cardNumber: "5528790000000008",
          expireMonth: "12",
          expireYear: "2025",
          cvc: "123",
        },
        buyer: {
          name: "John",
          surname: "Doe",
          email: "john@example.com",
          address: "123 Main St",
          city: "Istanbul",
          country: "Turkey",
        },
        installment: "1",
        discountCode: "SAVE20",
      };

      mockGuaranteedAuthRequest.params = { businessId };
      mockGuaranteedAuthRequest.body = paymentData;

      const mockResult = {
        success: true,
        subscriptionId: "sub-123",
        paymentId: "payment-123",
        message: "Payment successful",
        discountApplied: true,
      };

      mockPaymentService.createSubscriptionForBusiness.mockResolvedValue(
        mockResult
      );

      // Act
      await paymentController.createSubscriptionPayment(
        mockGuaranteedAuthRequest,
        mockResponse
      );

      // Assert
      expect(
        mockPaymentService.createSubscriptionForBusiness
      ).toHaveBeenCalledWith(
        businessId,
        paymentData.planId,
        expect.objectContaining({
          card: paymentData.card,
          buyer: paymentData.buyer,
          installment: paymentData.installment,
          discountCode: paymentData.discountCode,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          subscriptionId: mockResult.subscriptionId,
          paymentId: mockResult.paymentId,
          message: mockResult.message,
          discountApplied: mockResult.discountApplied,
        },
      });
    });
  });

  describe("refundPayment", () => {
    it("should refund payment successfully", async () => {
      // Arrange
      const paymentId = "payment-123";
      const refundData = {
        amount: 29.99,
        reason: "Customer requested refund",
      };

      mockGuaranteedAuthRequest.params = { paymentId };
      mockGuaranteedAuthRequest.body = refundData;

      const mockResult = {
        success: true,
        refundId: "refund-123",
        message: "Refund successful",
      };

      mockPaymentService.refundPayment.mockResolvedValue(mockResult);

      // Act
      await paymentController.refundPayment(
        mockGuaranteedAuthRequest,
        mockResponse
      );

      // Assert
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith(
        paymentId,
        refundData.amount,
        refundData.reason
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          refundId: mockResult.refundId,
          message: mockResult.message,
        },
      });
    });
  });

  describe("cancelPayment", () => {
    it("should cancel payment successfully", async () => {
      // Arrange
      const paymentId = "payment-123";
      const reason = "Customer requested cancellation";

      mockGuaranteedAuthRequest.params = { paymentId };
      mockGuaranteedAuthRequest.body = { reason };

      const mockResult = {
        success: true,
        message: "Payment cancelled successfully",
      };

      mockPaymentService.cancelPayment.mockResolvedValue(mockResult);

      // Act
      await paymentController.cancelPayment(
        mockGuaranteedAuthRequest,
        mockResponse
      );

      // Assert
      expect(mockPaymentService.cancelPayment).toHaveBeenCalledWith(
        paymentId,
        reason
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });
  });

  describe("getPayment", () => {
    it("should get payment successfully", async () => {
      // Arrange
      const paymentId = "payment-123";
      mockGuaranteedAuthRequest.params = { paymentId };

      const mockResult = {
        success: true,
        payment: {
          id: paymentId,
          businessId: "business-123",
          planId: "plan-pro",
          amount: 59.99,
          status: "succeeded",
          createdAt: "2024-01-15T00:00:00Z",
        },
      };

      mockPaymentService.retrievePayment.mockResolvedValue(mockResult);

      // Act
      await paymentController.getPayment(
        mockGuaranteedAuthRequest,
        mockResponse
      );

      // Assert
      expect(mockPaymentService.retrievePayment).toHaveBeenCalledWith(
        paymentId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.payment,
      });
    });
  });

  describe("getPaymentHistory", () => {
    it("should get payment history successfully", async () => {
      // Arrange
      const businessId = "business-123";

      mockGuaranteedAuthRequest.params = { businessId };

      const mockResult = {
        success: true,
        subscription: {
          id: "sub-123",
          businessId: businessId,
          planId: "plan-pro",
          status: "active",
          payments: [
            { id: "payment-1", amount: 59.99, status: "succeeded" },
            { id: "payment-2", amount: 29.99, status: "succeeded" },
          ],
        },
      };

      mockPaymentService.getSubscriptionWithPayments.mockResolvedValue(
        mockResult
      );

      // Act
      await paymentController.getPaymentHistory(
        mockGuaranteedAuthRequest,
        mockResponse
      );

      // Assert
      expect(
        mockPaymentService.getSubscriptionWithPayments
      ).toHaveBeenCalledWith(businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.subscription,
      });
    });
  });

  describe("getTestCards", () => {
    it("should get test cards successfully", async () => {
      // Arrange
      const mockTestCards = [
        {
          id: "card-1",
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2025,
        },
        {
          id: "card-2",
          brand: "mastercard",
          last4: "5555",
          expMonth: 10,
          expYear: 2026,
        },
      ];

      mockPaymentService.getTestCards.mockReturnValue(mockTestCards);

      // Act
      await paymentController.getTestCards(mockRequest, mockResponse);

      // Assert
      expect(mockPaymentService.getTestCards).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTestCards,
        message: "Test cards for Iyzico sandbox environment",
        usage: {
          success: "Use success card for successful test payments",
          failure: "Use failure card to test payment failures",
          threeDsSuccess: "Use for 3DS authentication test",
        },
      });
    });
  });

  describe("getSubscriptionPlans", () => {
    it("should get subscription plans successfully", async () => {
      // Arrange
      const mockPlans = [
        {
          id: "plan-basic",
          name: "Basic",
          displayName: "Basic Plan",
          description: "Basic subscription plan",
          price: 29.99,
          currency: "TRY",
          billingInterval: "MONTHLY",
          maxBusinesses: 1,
          maxStaffPerBusiness: 5,
          features: ["unlimited_appointments"],
          isPopular: false,
          sortOrder: 1,
        },
        {
          id: "plan-pro",
          name: "Pro",
          displayName: "Pro Plan",
          description: "Professional subscription plan",
          price: 59.99,
          currency: "TRY",
          billingInterval: "MONTHLY",
          maxBusinesses: 3,
          maxStaffPerBusiness: 20,
          features: ["unlimited_appointments", "sms_notifications"],
          isPopular: true,
          sortOrder: 2,
        },
      ];

      mockPaymentService.prisma.subscriptionPlan.findMany.mockResolvedValue(
        mockPlans
      );

      // Act
      await paymentController.getSubscriptionPlans(mockRequest, mockResponse);

      // Assert
      expect(
        mockPaymentService.prisma.subscriptionPlan.findMany
      ).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          price: true,
          currency: true,
          billingInterval: true,
          maxBusinesses: true,
          maxStaffPerBusiness: true,
          features: true,
          isPopular: true,
          sortOrder: true,
        },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans,
        message: "Subscription plans retrieved successfully",
      });
    });
  });

  describe("webhookHandler", () => {
    it("should handle webhook successfully", async () => {
      // Arrange
      const webhookData = {
        status: "success",
        paymentId: "payment-123",
        amount: 59.99,
      };

      mockRequest.body = webhookData;

      // Mock the retrievePayment method to return a successful result
      mockPaymentService.retrievePayment.mockResolvedValue({
        success: true,
        payment: { id: "payment-123", status: "succeeded" },
      });

      // Act
      await paymentController.webhookHandler(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        message: "Webhook processed",
      });
    });
  });
});
