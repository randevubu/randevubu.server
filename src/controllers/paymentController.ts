import { Request, Response } from 'express';
import { PaymentService, CreatePaymentRequest } from '../services/domain/payment';
import { SubscriptionService } from '../services/domain/subscription/subscriptionService';
import { GuaranteedAuthRequest } from '../types/auth';
import { z } from 'zod';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';

const createSubscriptionPaymentSchema = z.object({
  planId: z.string(),
  card: z.object({
    cardHolderName: z.string().min(1),
    cardNumber: z.string().regex(/^\d{16}$/),
    expireMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
    expireYear: z.string().regex(/^\d{4}$/),
    cvc: z.string().regex(/^\d{3,4}$/)
  }),
  buyer: z.object({
    name: z.string().min(1),
    surname: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    zipCode: z.string().optional()
  }).optional(),
  installment: z.string().default('1'),
  discountCode: z.string().optional()
});

const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional()
});

export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService
  ) {}

  async createSubscriptionPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const validatedData = createSubscriptionPaymentSchema.parse(req.body);

      const result = await this.paymentService.createSubscriptionForBusiness(
        businessId,
        validatedData.planId,
        {
          card: validatedData.card,
          buyer: validatedData.buyer || {
            name: 'Customer',
            surname: 'User',
            email: `user_${userId}@randevubu.com`,
            gsmNumber: req.user.phoneNumber
          },
          installment: validatedData.installment,
          discountCode: validatedData.discountCode
        }
      );

      if (result.success) {
        await sendSuccessResponse(
          res,
          'success.payment.subscriptionCreated',
          {
            subscriptionId: result.subscriptionId,
            paymentId: result.paymentId,
            message: result.message,
            discountApplied: result.discountApplied
          },
          201,
          req
        );
      } else {
        const error = new AppError(
          result.error || 'Payment creation failed',
          400,
          ERROR_CODES.PAYMENT_PROCESSING_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const error = new AppError(
          'Invalid request data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      } else {
        handleRouteError(error, req, res);
      }
    }
  }

  async refundPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      // Validate paymentId parameter
      if (!paymentId || typeof paymentId !== 'string') {
        const error = new AppError(
          'Payment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate paymentId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(paymentId) || paymentId.length < 1 || paymentId.length > 50) {
        const error = new AppError(
          'Invalid payment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const validatedData = refundPaymentSchema.parse(req.body);

      const result = await this.paymentService.refundPayment(
        paymentId,
        validatedData.amount,
        validatedData.reason
      );

      if (result.success) {
        await sendSuccessResponse(
          res,
          'success.payment.refunded',
          {
            refundId: result.refundId,
            message: result.message
          },
          200,
          req
        );
      } else {
        const error = new AppError(
          result.error || 'Refund failed',
          400,
          ERROR_CODES.PAYMENT_PROCESSING_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const error = new AppError(
          'Invalid request data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      } else {
        handleRouteError(error, req, res);
      }
    }
  }

  async cancelPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      // Validate paymentId parameter
      if (!paymentId || typeof paymentId !== 'string') {
        const error = new AppError(
          'Payment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate paymentId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(paymentId) || paymentId.length < 1 || paymentId.length > 50) {
        const error = new AppError(
          'Invalid payment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason if provided
      if (reason && (typeof reason !== 'string' || reason.trim().length < 3)) {
        const error = new AppError(
          'Reason must be at least 3 characters long',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.paymentService.cancelPayment(paymentId, reason);

      if (result.success) {
        await sendSuccessResponse(
          res,
          'success.payment.cancelled',
          undefined,
          200,
          req
        );
      } else {
        const error = new AppError(
          result.error || 'Payment cancellation failed',
          400,
          ERROR_CODES.PAYMENT_PROCESSING_ERROR
        );
        return sendAppErrorResponse(res, error);
      }
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      // Validate paymentId parameter
      if (!paymentId || typeof paymentId !== 'string') {
        const error = new AppError(
          'Payment ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate paymentId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(paymentId) || paymentId.length < 1 || paymentId.length > 50) {
        const error = new AppError(
          'Invalid payment ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.paymentService.retrievePayment(paymentId);

      if (result.success) {
        await sendSuccessResponse(
          res,
          'success.payment.retrieved',
          result.payment,
          200,
          req
        );
      } else {
        const error = new AppError(
          result.error || 'Payment not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getPaymentHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.paymentService.getSubscriptionWithPayments(businessId);

      if (result.success) {
        await sendSuccessResponse(
          res,
          'success.payment.historyRetrieved',
          result.subscription
        );
      } else {
        const error = new AppError(
          result.error || 'Payment history not found',
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getTestCards(req: Request, res: Response): Promise<void> {
    try {
      const testCards = this.paymentService.getTestCards();

      await sendSuccessResponse(
        res,
        'success.payment.testCardsRetrieved',
        {
          testCards,
          usage: {
            success: 'Use success card for successful test payments',
            failure: 'Use failure card to test payment failures',
            threeDsSuccess: 'Use for 3DS authentication test'
          }
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await this.subscriptionService.getAllPlans();

      await sendSuccessResponse(
        res,
          'success.payment.subscriptionPlansRetrieved',
          plans,
          200,
          req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async webhookHandler(req: Request, res: Response): Promise<void> {
    try {
      const iyzicoData = req.body;

      // Validate webhook data
      if (!iyzicoData || typeof iyzicoData !== 'object') {
        const error = new AppError(
          'Invalid webhook data',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (iyzicoData.status === 'success') {
        const paymentId = iyzicoData.paymentId;
        
        if (!paymentId) {
          const error = new AppError(
            'Payment ID is required in webhook data',
            400,
            ERROR_CODES.REQUIRED_FIELD_MISSING
          );
          return sendAppErrorResponse(res, error);
        }
        
        const payment = await this.paymentService.retrievePayment(paymentId);
        
        if (payment.success) {
          // Process successful payment webhook
          // Add your webhook processing logic here
          console.log('Payment webhook processed successfully:', paymentId);
        } else {
          console.error('Failed to retrieve payment for webhook:', paymentId);
        }
      }

      await sendSuccessResponse(
        res,
          'success.payment.webhookProcessed',
          { status: 'success' },
          200,
          req
      );
    } catch (error) {
      console.error('Webhook processing error:', error);
      handleRouteError(error, req, res);
    }
  }
}