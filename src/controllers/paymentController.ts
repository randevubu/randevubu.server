import { Request, Response } from 'express';
import { PaymentService } from '../services/domain/payment';
import { SubscriptionService } from '../services/domain/subscription/subscriptionService';
import { GuaranteedAuthRequest } from '../types/auth';
import { z } from 'zod';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';
import logger from '../utils/Logger/logger';

const createSubscriptionPaymentSchema = z.object({
  planId: z.string(),
  card: z.object({
    cardHolderName: z.string().min(1),
    cardNumber: z.string().regex(/^\d{16}$/),
    expireMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
    expireYear: z.string().regex(/^\d{4}$/),
    cvc: z.string().regex(/^\d{3,4}$/),
  }),
  buyer: z.object({
    name: z.string().min(1),
    surname: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    zipCode: z.string().optional(),
  }).optional(),
  installment: z.string().default('1'),
  discountCode: z.string().optional(),
});

const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private responseHelper: ResponseHelper
  ) {}

  private requireId(params: Record<string, string>, name: string): string {
    const id = params[name];
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: `${name} is required`, params: { field: name } });
    }
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: `Invalid ${name} format`, params: { field: name } });
    }
    return id;
  }

  async createSubscriptionPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const businessId = this.requireId(req.params, 'businessId');
    const userId = req.user.id;
    const validatedData = createSubscriptionPaymentSchema.parse(req.body);

    const result = await this.paymentService.createSubscriptionForBusiness(
      businessId, validatedData.planId, {
        card: validatedData.card,
        buyer: validatedData.buyer || {
          name: 'Customer', surname: 'User',
          email: `user_${userId}@randevubu.com`, gsmNumber: req.user.phoneNumber,
        },
        installment: validatedData.installment,
        discountCode: validatedData.discountCode,
      }
    );

    if (!result.success) {
      throw new AppError('PAYMENT_PROCESSING_ERROR', { message: result.error || 'Payment creation failed' });
    }

    await this.responseHelper.success(res, 'success.payment.subscriptionCreated', {
      subscriptionId: result.subscriptionId, paymentId: result.paymentId,
      message: result.message, discountApplied: result.discountApplied,
    }, 201, req);
  }

  async refundPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const paymentId = this.requireId(req.params, 'paymentId');
    const validatedData = refundPaymentSchema.parse(req.body);

    const result = await this.paymentService.refundPayment(paymentId, validatedData.amount, validatedData.reason);

    if (!result.success) {
      throw new AppError('PAYMENT_PROCESSING_ERROR', { message: result.error || 'Refund failed' });
    }

    await this.responseHelper.success(res, 'success.payment.refunded', {
      refundId: result.refundId, message: result.message,
    }, 200, req);
  }

  async cancelPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const paymentId = this.requireId(req.params, 'paymentId');
    const { reason } = req.body;

    if (reason && (typeof reason !== 'string' || reason.trim().length < 3)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 3 characters long' });
    }

    const result = await this.paymentService.cancelPayment(paymentId, reason);

    if (!result.success) {
      throw new AppError('PAYMENT_PROCESSING_ERROR', { message: result.error || 'Payment cancellation failed' });
    }

    await this.responseHelper.success(res, 'success.payment.cancelled', undefined, 200, req);
  }

  async getPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const paymentId = this.requireId(req.params, 'paymentId');

    const result = await this.paymentService.retrievePayment(paymentId);

    if (!result.success) {
      throw new AppError('PAYMENT_NOT_FOUND', { message: result.error || 'Payment not found' });
    }

    await this.responseHelper.success(res, 'success.payment.retrieved', result.payment, 200, req);
  }

  async getPaymentHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const businessId = this.requireId(req.params, 'businessId');

    const result = await this.paymentService.getSubscriptionWithPayments(businessId);

    if (!result.success) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: result.error || 'Subscription not found for payment history' });
    }

    await this.responseHelper.success(res, 'success.payment.historyRetrieved', result.subscription);
  }

  async getTestCards(_req: Request, res: Response): Promise<void> {
    const testCards = this.paymentService.getTestCards();

    await this.responseHelper.success(res, 'success.payment.testCardsRetrieved', {
      testCards,
      usage: {
        success: 'Use success card for successful test payments',
        failure: 'Use failure card to test payment failures',
        threeDsSuccess: 'Use for 3DS authentication test',
      },
    }, 200);
  }

  async getSubscriptionPlans(_req: Request, res: Response): Promise<void> {
    const plans = await this.subscriptionService.getAllPlans();

    await this.responseHelper.success(res, 'success.payment.subscriptionPlansRetrieved', plans, 200);
  }

  async webhookHandler(req: Request, res: Response): Promise<void> {
    const iyzicoData = req.body;

    if (!iyzicoData || typeof iyzicoData !== 'object') {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid webhook data' });
    }

    if (iyzicoData.status === 'success') {
      const paymentId = iyzicoData.paymentId;

      if (!paymentId) {
        throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Payment ID is required in webhook data', params: { field: 'paymentId' } });
      }

      const payment = await this.paymentService.retrievePayment(paymentId);

      if (payment.success) {
        logger.info('Payment webhook processed successfully:', paymentId);
      } else {
        logger.error('Failed to retrieve payment for webhook:', paymentId);
      }
    }

    await this.responseHelper.success(res, 'success.payment.webhookProcessed', { status: 'success' }, 200, req);
  }
}
