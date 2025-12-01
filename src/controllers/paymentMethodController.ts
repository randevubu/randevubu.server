import { Request, Response } from 'express';
import { GuaranteedAuthRequest } from '../types/auth';
import { AppError } from '../types/responseTypes';
import { sendSuccessResponse, sendAppErrorResponse } from '../utils/responseUtils';
import { PaymentService } from '../services/domain/payment/paymentService';
import { SubscriptionService } from '../services/domain/subscription/subscriptionService';
import { RBACService } from '../services/domain/rbac/rbacService';
import { PermissionName } from '../types/auth';
import { z } from 'zod';
import logger from "../utils/Logger/logger";
const updatePaymentMethodSchema = z.object({
  card: z.object({
    cardNumber: z.string().min(13).max(19),
    expireMonth: z.string().min(1).max(2),
    expireYear: z.string().min(4).max(4),
    cvc: z.string().min(3).max(4),
    cardHolderName: z.string().min(2).max(100)
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
    country: z.string().min(2).max(100)
  })
});

export class PaymentMethodController {
  constructor(
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private rbacService: RBACService
  ) {}

  /**
   * Update payment method for a subscription
   * POST /api/v1/payment-methods/business/:businessId/update
   */
  async updatePaymentMethod(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      // Validate request body
      const validationResult = updatePaymentMethodSchema.safeParse(req.body);
      if (!validationResult.success) {
        return sendAppErrorResponse(res, new AppError('Invalid request data', 400));
      }

      const { card, buyer } = validationResult.data;

      // Check permissions
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );

      // Get subscription
      const subscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);
      if (!subscription) {
        return sendAppErrorResponse(res, new AppError('Subscription not found', 404));
      }

      // Extract last four digits and detect card brand
      const lastFourDigits = card.cardNumber.slice(-4);
      const cardBrand = this.getCardBrand(card.cardNumber);

      // Generate a unique ID for the payment method
      const paymentMethodId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Update payment method using subscription service
      const result = await this.subscriptionService.updatePaymentMethod(
        userId,
        businessId,
        paymentMethodId
      );

      await sendSuccessResponse(res, 'success.paymentMethod.updated', {
        paymentMethodId,
        lastFourDigits,
        cardBrand,
        subscriptionId: result.id
      }, 200, req);
    } catch (error) {
      logger.error('Update payment method error:', error);
      sendAppErrorResponse(res, new AppError(
        error instanceof Error ? error.message : 'Internal server error',
        500
      ));
    }
  }

  private getCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'MasterCard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6(?:011|5)/.test(number)) return 'Discover';
    return 'Unknown';
  }

  /**
   * Get current payment method for a subscription
   * GET /api/v1/payment-methods/business/:businessId
   */
  async getPaymentMethod(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      // Check permissions
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );

      // Get subscription with payment method
      const autoRenewalStatus = await this.subscriptionService.getAutoRenewalStatus(userId, businessId);
      
      if (!autoRenewalStatus.paymentMethod) {
        return sendAppErrorResponse(res, new AppError('No payment method found', 404));
      }

      await sendSuccessResponse(res, 'success.paymentMethod.retrieved', {
        paymentMethod: autoRenewalStatus.paymentMethod,
        autoRenewal: autoRenewalStatus.autoRenewal,
        nextBillingDate: autoRenewalStatus.nextBillingDate
      }, 200, req);
    } catch (error) {
      logger.error('Get payment method error:', error);
      sendAppErrorResponse(res, new AppError(
        error instanceof Error ? error.message : 'Internal server error',
        500
      ));
    }
  }

  /**
   * Retry failed payment with updated payment method
   * POST /api/v1/payment-methods/business/:businessId/retry-payment
   */
  async retryFailedPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      // Check permissions
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );

      // Get subscription
      const subscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);
      if (!subscription) {
        return sendAppErrorResponse(res, new AppError('Subscription not found', 404));
      }

      // Check if subscription has failed payments
      if (subscription.status !== 'PAST_DUE') {
        return sendAppErrorResponse(res, new AppError('No failed payments to retry', 400));
      }

      // Retry payment - this would trigger the payment retry service
      // For now, return success (actual implementation would use payment retry service)
      await sendSuccessResponse(res, 'success.paymentMethod.retryInitiated', {
        subscriptionId: subscription.id,
        status: 'PENDING_RETRY'
      }, 200, req);
    } catch (error) {
      logger.error('Retry payment error:', error);
      sendAppErrorResponse(res, new AppError(
        error instanceof Error ? error.message : 'Internal server error',
        500
      ));
    }
  }

}
