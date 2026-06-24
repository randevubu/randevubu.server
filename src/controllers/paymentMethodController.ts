import { Response } from 'express';
import { GuaranteedAuthRequest } from '../types/auth';
import { AppError } from '../types/responseTypes';
import { PaymentService } from '../services/domain/payment/paymentService';
import { SubscriptionService } from '../services/domain/subscription/subscriptionService';
import { RBACService } from '../services/domain/rbac/rbacService';
import { PermissionName } from '../types/auth';
import { z } from 'zod';
import { ResponseHelper } from '../utils/responseHelper';

const updatePaymentMethodSchema = z.object({
  card: z.object({
    cardNumber: z.string().min(13).max(19),
    expireMonth: z.string().min(1).max(2),
    expireYear: z.string().min(4).max(4),
    cvc: z.string().min(3).max(4),
    cardHolderName: z.string().min(2).max(100),
  }),
  buyer: z.object({
    id: z.string(),
    name: z.string().min(2).max(100),
    surname: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    identityNumber: z.string().min(11).max(11),
    address: z.string().min(10).max(500),
    city: z.string().min(2).max(100),
    country: z.string().min(2).max(100),
  }),
});

export class PaymentMethodController {
  constructor(
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private rbacService: RBACService,
    private responseHelper: ResponseHelper
  ) {}

  async updatePaymentMethod(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user.id;

    const validatedData = updatePaymentMethodSchema.parse(req.body);
    const { card, buyer } = validatedData;

    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_OWN_SUBSCRIPTION, { businessId });

    const subscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);
    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: 'Subscription not found for payment method update' });
    }

    const lastFourDigits = card.cardNumber.slice(-4);
    const cardBrand = this.getCardBrand(card.cardNumber);
    const paymentMethodId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await this.subscriptionService.updatePaymentMethod(userId, businessId, paymentMethodId);

    await this.responseHelper.success(
      res, 'success.paymentMethod.updated',
      { paymentMethodId, lastFourDigits, cardBrand, subscriptionId: result.id },
      200, req
    );
  }

  private getCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'MasterCard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6(?:011|5)/.test(number)) return 'Discover';
    return 'Unknown';
  }

  async getPaymentMethod(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user.id;

    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_OWN_SUBSCRIPTION, { businessId });

    const autoRenewalStatus = await this.subscriptionService.getAutoRenewalStatus(userId, businessId);

    if (!autoRenewalStatus.paymentMethod) {
      throw new AppError('PAYMENT_METHOD_NOT_FOUND', { message: 'No payment method found' });
    }

    await this.responseHelper.success(
      res, 'success.paymentMethod.retrieved',
      {
        paymentMethod: autoRenewalStatus.paymentMethod,
        autoRenewal: autoRenewalStatus.autoRenewal,
        nextBillingDate: autoRenewalStatus.nextBillingDate,
      },
      200, req
    );
  }

  async retryFailedPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user.id;

    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_OWN_SUBSCRIPTION, { businessId });

    const subscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);
    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: 'Subscription not found for payment retry' });
    }

    if (subscription.status !== 'PAST_DUE') {
      throw new AppError('OPERATION_NOT_ALLOWED', { message: 'No failed payments to retry' });
    }

    await this.responseHelper.success(
      res, 'success.paymentMethod.retryInitiated',
      { subscriptionId: subscription.id, status: 'PENDING_RETRY' },
      200, req
    );
  }
}
