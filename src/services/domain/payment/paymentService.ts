import Iyzipay from 'iyzipay';
import { PaymentStatus, SubscriptionStatus, TrialConversionData } from '../../../types/business';
import { RepositoryContainer } from '../../../repositories';
import logger from '../../../utils/Logger/logger';
import { JsonValue } from '@prisma/client/runtime/library';

export interface PaymentCardData {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

export interface PaymentBuyerData {
  id: string;
  name: string;
  surname: string;
  gsmNumber?: string;
  email: string;
  identityNumber: string;
  lastLoginDate?: string;
  registrationDate: string;
  registrationAddress: string;
  ip: string;
  city: string;
  country: string;
  zipCode?: string;
}

export interface PaymentBasketItem {
  id: string;
  name: string;
  category1: string;
  category2?: string;
  itemType: string; // 'PHYSICAL' | 'VIRTUAL'
  price: string;
}

export interface CreatePaymentRequest {
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: string;
  installment: string;
  basketId: string;
  paymentChannel: string;
  paymentGroup: string;
  card: PaymentCardData;
  buyer: PaymentBuyerData;
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
  basketItems: PaymentBasketItem[];
}

export interface SubscriptionMetadata {
  pendingDiscount?: {
    discountType: string;
    discountValue: number;
    code: string;
    isRecurring: boolean;
    remainingUses?: number;
    appliedToPayments?: string[];
  };
}

interface IyzipayPaymentCreateRequest {
  locale: string;
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: string;
  installment: string;
  basketId: string;
  paymentChannel: string;
  paymentGroup: string;
  paymentCard: {
    cardHolderName: string;
    cardNumber: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    registerCard: string;
  };
  buyer: PaymentBuyerData;
  shippingAddress: CreatePaymentRequest['shippingAddress'];
  billingAddress: CreatePaymentRequest['billingAddress'];
  basketItems: PaymentBasketItem[];
}

interface IyzipayError {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
}

interface IyzipaySuccessResponse {
  status: string;
  paymentId?: string;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  lastFourDigits?: string;
  binNumber?: string;
  [key: string]: unknown;
}

type IyzicoPaymentResult = IyzipaySuccessResponse | IyzipayError;

export interface PaymentResponse {
  status: string;
  locale: string;
  systemTime: number;
  conversationId: string;
  price: string;
  paidPrice: string;
  installment: number;
  paymentId: string;
  fraudStatus: number;
  merchantCommissionRate: string;
  merchantCommissionRateAmount: string;
  iyziCommissionRateAmount: string;
  iyziCommissionFee: string;
  cardType: string;
  cardAssociation: string;
  cardFamily: string;
  binNumber: string;
  lastFourDigits: string;
  basketId: string;
  currency: string;
  itemTransactions: Array<{
    itemId: string;
    paymentTransactionId: string;
    transactionStatus: number;
    price: string;
    paidPrice: string;
    merchantCommissionRate: string;
    merchantCommissionRateAmount: string;
    iyziCommissionRateAmount: string;
    iyziCommissionFee: string;
    blockageRate: string;
    blockageRateAmountMerchant: string;
    blockageRateAmountSubMerchant: string;
    blockageResolvedDate: string;
    subMerchantKey: string;
    subMerchantPrice: string;
    subMerchantPayoutRate: string;
    subMerchantPayoutAmount: string;
    merchantPayoutAmount: string;
  }>;
  connectorName: string;
  phase: string;
  hostReference: string;
  token: string;
}

export class PaymentService {
  private iyzipay: Iyzipay;
  
  // Narrow contract for discount code operations to avoid any
  private discountCodeService?: {
    validateDiscountCode: (
      code: string,
      planId: string,
      amount: number,
      userId: string
    ) => Promise<{
      isValid: boolean;
      calculatedDiscount?: {
        originalAmount: number;
        discountAmount: number;
        finalAmount: number;
      };
      errorMessage?: string;
    }>;
    applyDiscountCode: (
      code: string,
      userId: string,
      planId: string,
      originalAmount: number,
      subscriptionId: string,
      paymentId?: string
    ) => Promise<void>;
    applyPendingDiscount: (
      subscriptionId: string,
      paymentId: string,
      actualAmount: number
    ) => Promise<{
      success: boolean;
      discountApplied?: {
        code: string;
        discountAmount: number;
        originalAmount: number;
        finalAmount: number;
      };
      error?: string;
    }>;
    canApplyToPayment: (
      subscriptionId: string,
      paymentType: 'INITIAL' | 'TRIAL_CONVERSION' | 'RENEWAL'
    ) => Promise<boolean>;
  };
  
  constructor(
    private repositories: RepositoryContainer,
    discountCodeService?: PaymentService['discountCodeService'] // avoid circular dep
  ) {
    this.discountCodeService = discountCodeService;
    this.iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY!,
      secretKey: process.env.IYZICO_SECRET_KEY!,
      uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
    });
  }

  async createSubscriptionForBusiness(
    businessId: string,
    planId: string,
    paymentData: {
      card: PaymentCardData;
      buyer: Partial<PaymentBuyerData>;
      installment?: string;
      discountCode?: string;
    }
  ): Promise<{
    success: boolean;
    subscriptionId?: string;
    paymentId?: string;
    message?: string;
    error?: string;
    discountApplied?: {
      code: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    };
  }> {
    try {
      const business = await this.repositories.businessRepository.findByIdWithOwner(businessId);

      if (!business) {
        return { success: false, error: 'Business not found' };
      }

      const plan = await this.repositories.subscriptionRepository.findPlanById(planId);

      if (!plan) {
        return { success: false, error: 'Subscription plan not found' };
      }

      const existingSubscription = await this.repositories.subscriptionRepository.findByBusinessId(businessId);

      if (existingSubscription && existingSubscription.status === 'ACTIVE') {
        return { success: false, error: 'Business already has an active subscription' };
      }

      // Handle discount code if provided
      let discountApplied: {
        code: string;
        discountAmount: number;
        originalAmount: number;
        finalAmount: number;
      } | undefined;
      
      let finalPrice = Number(plan.price);
      
      if (paymentData.discountCode && this.discountCodeService) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Processing discount code', { code: paymentData.discountCode, planId, amount: Number(plan.price) });
        }
        const discountResult = await this.discountCodeService.validateDiscountCode(
          paymentData.discountCode,
          planId,
          Number(plan.price),
          business.ownerId
        );

        if (process.env.NODE_ENV === 'development') {
          logger.debug('Discount validation result', { discountResult });
        }

        if (discountResult.isValid && discountResult.calculatedDiscount) {
          finalPrice = discountResult.calculatedDiscount.finalAmount;
          discountApplied = {
            code: paymentData.discountCode,
            discountAmount: discountResult.calculatedDiscount.discountAmount,
            originalAmount: discountResult.calculatedDiscount.originalAmount,
            finalAmount: discountResult.calculatedDiscount.finalAmount
          };
          if (process.env.NODE_ENV === 'development') {
            logger.info('Discount applied successfully', { discountApplied });
          }
        } else {
          // Don't fail the payment for invalid discount codes, just ignore them
          logger.warn('Invalid discount code', { error: discountResult.errorMessage, code: paymentData.discountCode });
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('No discount code provided or discount service not available', { code: paymentData.discountCode, serviceAvailable: !!this.discountCodeService });
        }
      }

      const currentDate = new Date();
      const nextPeriod = new Date();
      if (plan.billingInterval.toLowerCase() === 'monthly') {
        nextPeriod.setMonth(currentDate.getMonth() + 1);
      } else if (plan.billingInterval.toLowerCase() === 'yearly') {
        nextPeriod.setFullYear(currentDate.getFullYear() + 1);
      }

      const subscription = await this.repositories.subscriptionRepository.createOrUpdateSubscription({
        businessId,
        planId,
        status: SubscriptionStatus.UNPAID,
        currentPeriodStart: currentDate,
        currentPeriodEnd: nextPeriod,
        metadata: {
          createdAt: currentDate.toISOString(),
          source: 'payment_flow'
        }
      });

      const fullBuyer: PaymentBuyerData = {
        id: `BY${business.ownerId}`,
        name: paymentData.buyer.name || business.owner.firstName || 'Customer',
        surname: paymentData.buyer.surname || business.owner.lastName || 'User',
        email: paymentData.buyer.email || business.email || business.owner.phoneNumber + '@randevubu.com',
        gsmNumber: paymentData.buyer.gsmNumber || business.phone || business.owner.phoneNumber,
        identityNumber: '11111111111',
        lastLoginDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
        registrationDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
        registrationAddress: paymentData.buyer.registrationAddress || business.address || 'Test Address',
        ip: paymentData.buyer.ip || '127.0.0.1',
        city: paymentData.buyer.city || business.city || 'Istanbul',
        country: paymentData.buyer.country || business.country || 'Turkey',
        zipCode: paymentData.buyer.zipCode || business.postalCode || '34000'
      };

      const paymentRequest: CreatePaymentRequest = {
        conversationId: this.generateConversationId(),
        price: finalPrice.toString(),
        paidPrice: finalPrice.toString(),
        currency: plan.currency,
        installment: paymentData.installment || '1',
        basketId: this.generateBasketId(),
        paymentChannel: 'WEB',
        paymentGroup: 'SUBSCRIPTION',
        card: paymentData.card,
        buyer: fullBuyer,
        shippingAddress: {
          contactName: `${fullBuyer.name} ${fullBuyer.surname}`,
          city: fullBuyer.city,
          country: fullBuyer.country,
          address: fullBuyer.registrationAddress,
          zipCode: fullBuyer.zipCode
        },
        billingAddress: {
          contactName: `${fullBuyer.name} ${fullBuyer.surname}`,
          city: fullBuyer.city,
          country: fullBuyer.country,
          address: fullBuyer.registrationAddress,
          zipCode: fullBuyer.zipCode
        },
        basketItems: [this.createSubscriptionBasketItem({
          id: plan.id,
          name: plan.displayName,
          price: finalPrice.toString()
        })]
      };

      const paymentResult = await this.createSubscriptionPayment(subscription.id, paymentRequest, discountApplied);

      if (paymentResult.success) {
        // Record discount code usage if applicable
        if (discountApplied && paymentData.discountCode && this.discountCodeService) {
          try {
            await this.discountCodeService.applyDiscountCode(
              paymentData.discountCode,
              business.ownerId,
              planId,
              Number(plan.price),
              subscription.id,
              paymentResult.paymentId
            );
          } catch (error) {
            logger.error('Failed to record discount code usage', { error: error instanceof Error ? error.message : String(error) });
            // Don't fail the payment for this, just log it
          }
        }

        return {
          success: true,
          subscriptionId: subscription.id,
          paymentId: paymentResult.paymentId,
          message: `Successfully subscribed to ${plan.displayName}`,
          discountApplied
        };
      } else {
        await this.repositories.subscriptionRepository.updateSubscriptionStatus(subscription.id, SubscriptionStatus.UNPAID);

        return {
          success: false,
          error: paymentResult.error || 'Payment failed'
        };
      }
    } catch (error) {
      logger.error('Create subscription error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      };
    }
  }

  async getSubscriptionWithPayments(businessId: string) {
    try {
      const subscription = await this.repositories.subscriptionRepository.findByBusinessIdWithDetails(businessId);

      if (!subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      return {
        success: true,
        subscription: {
          ...subscription,
          isTrialActive: subscription.trialEnd && subscription.trialEnd > new Date(),
          daysUntilExpiry: Math.ceil(
            (subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        }
      };
    } catch (error) {
      console.error('Get subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve subscription'
      };
    }
  }

  async createSubscriptionPayment(
    businessSubscriptionId: string,
    paymentData: CreatePaymentRequest,
    discountApplied?: {
      code: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    }
  ): Promise<{
    success: boolean;
    paymentId?: string;
    iyzicoPaymentId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      type IyziPaymentCreateRequest = {
        locale: string;
        conversationId: string;
        price: string;
        paidPrice: string;
        currency: string;
        installment: string;
        basketId: string;
        paymentChannel: string;
        paymentGroup: string;
        paymentCard: {
          cardHolderName: string;
          cardNumber: string;
          expireMonth: string;
          expireYear: string;
          cvc: string;
          registerCard: string;
        };
        buyer: PaymentBuyerData;
        shippingAddress: CreatePaymentRequest['shippingAddress'];
        billingAddress: CreatePaymentRequest['billingAddress'];
        basketItems: PaymentBasketItem[];
      };

      const request: IyziPaymentCreateRequest = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: paymentData.conversationId,
        price: paymentData.price,
        paidPrice: paymentData.paidPrice,
        currency: paymentData.currency === 'TRY' ? Iyzipay.CURRENCY.TRY : Iyzipay.CURRENCY.USD,
        installment: paymentData.installment,
        basketId: paymentData.basketId,
        paymentChannel: paymentData.paymentChannel,
        paymentGroup: paymentData.paymentGroup,
        paymentCard: {
          cardHolderName: paymentData.card.cardHolderName,
          cardNumber: paymentData.card.cardNumber,
          expireMonth: paymentData.card.expireMonth,
          expireYear: paymentData.card.expireYear,
          cvc: paymentData.card.cvc,
          registerCard: '0'
        },
        buyer: paymentData.buyer,
        shippingAddress: paymentData.shippingAddress,
        billingAddress: paymentData.billingAddress,
        basketItems: paymentData.basketItems
      };

      const result: IyzicoPaymentResult = await new Promise((resolve, reject) => {
        this.iyzipay.payment.create(request as any, (err: unknown, result: unknown) => {
          if (err) reject(err);
          else resolve(result as IyzicoPaymentResult);
        });
      });

      if (result && result.status === 'success') {
        // Get subscription to extract salesman code
        const subscription = await this.repositories.subscriptionRepository.findSubscriptionById(businessSubscriptionId);
        const salesmanCode = subscription?.metadata && typeof subscription.metadata === 'object' && 'salesmanCode' in subscription.metadata
          ? (subscription.metadata as { salesmanCode?: string }).salesmanCode
          : undefined;

        const paymentRecord = await this.repositories.paymentRepository.create({
          businessSubscriptionId,
          amount: parseFloat(paymentData.paidPrice),
          currency: paymentData.currency,
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: 'card',
          paymentProvider: 'iyzico',
          providerPaymentId: (result as IyzipaySuccessResponse).paymentId || '',
          metadata: salesmanCode ? { salesmanCode } : undefined,
        });

        await this.repositories.subscriptionRepository.updateSubscriptionStatus(businessSubscriptionId, SubscriptionStatus.ACTIVE);

        return {
          success: true,
          paymentId: paymentRecord.id,
          iyzicoPaymentId: (result as IyzipaySuccessResponse).paymentId,
          message: 'Payment successful'
        };
      } else {
        await this.repositories.paymentRepository.create({
          businessSubscriptionId,
          amount: parseFloat(paymentData.paidPrice),
          currency: paymentData.currency,
          status: PaymentStatus.FAILED,
          paymentMethod: 'card',
          paymentProvider: 'iyzico',
          metadata: {
            iyzicoResponse: result as unknown as JsonValue,
            conversationId: paymentData.conversationId,
            error: (result as IyzipayError).errorMessage || 'Payment failed'
          }
        });

        return {
          success: false,
          error: (result as IyzipayError).errorMessage || 'Payment failed'
        };
      }
    } catch (error) {
      logger.error('Payment error', { error: error instanceof Error ? error.message : String(error) });
      
      await this.repositories.paymentRepository.create({
        businessSubscriptionId,
        amount: parseFloat(paymentData.paidPrice),
        currency: paymentData.currency,
        status: PaymentStatus.FAILED,
        paymentMethod: 'card',
        paymentProvider: 'iyzico',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          conversationId: paymentData.conversationId
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<{
    success: boolean;
    refundId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const payment = await this.repositories.paymentRepository.findById(paymentId);

      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      if (payment.status !== PaymentStatus.SUCCEEDED) {
        return { success: false, error: 'Cannot refund non-successful payment' };
      }

      const refundAmount = amount || payment.amount;

      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: `refund_${Date.now()}`,
        paymentTransactionId: payment.providerPaymentId!,
        price: refundAmount.toString(),
        currency: payment.currency === 'TRY' ? Iyzipay.CURRENCY.TRY : Iyzipay.CURRENCY.USD,
        ip: '127.0.0.1'
      };

      const result: IyzicoPaymentResult = await new Promise((resolve, reject) => {
        this.iyzipay.refund.create(request, (err: unknown, result: unknown) => {
          if (err) reject(err);
          else resolve(result as IyzicoPaymentResult);
        });
      });

      if (result && result.status === 'success') {
        await this.repositories.paymentRepository.update(paymentId, {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          metadata: ({
            ...payment.metadata as Record<string, unknown>,
            refund: {
              refundId: (result as IyzipaySuccessResponse).paymentId,
              refundAmount,
              refundReason: reason,
              refundDate: new Date().toISOString(),
              iyzicoRefundResponse: result as unknown as JsonValue
            }
          }) as JsonValue
        });

        return {
          success: true,
          refundId: (result as IyzipaySuccessResponse).paymentId,
          message: 'Refund successful'
        };
      } else {
        return {
          success: false,
          error: (result as IyzipayError).errorMessage || 'Refund failed'
        };
      }
    } catch (error) {
      logger.error('Refund error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  async retrievePayment(paymentId: string): Promise<{
    success: boolean;
    payment?: IyzicoPaymentResult;
    error?: string;
  }> {
    try {
      const payment = await this.repositories.paymentRepository.findById(paymentId);

      if (!payment || !payment.providerPaymentId) {
        return { success: false, error: 'Payment not found' };
      }

      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: `retrieve_${Date.now()}`,
        paymentId: payment.providerPaymentId
      };

      const result: IyzicoPaymentResult = await new Promise((resolve, reject) => {
        this.iyzipay.payment.retrieve(request, (err: unknown, result: unknown) => {
          if (err) reject(err);
          else resolve(result as IyzicoPaymentResult);
        });
      });

      return {
        success: result && result.status === 'success',
        payment: result,
        error: result && result.status !== 'success' ? (result as IyzipayError).errorMessage : undefined
      };
    } catch (error) {
      logger.error('Retrieve payment error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment'
      };
    }
  }

  async cancelPayment(paymentId: string, reason?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const payment = await this.repositories.paymentRepository.findByIdWithSubscription(paymentId);

      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      if (payment.status === PaymentStatus.CANCELED) {
        return { success: false, error: 'Payment already canceled' };
      }

      if (payment.status === PaymentStatus.SUCCEEDED) {
        return await this.refundPayment(paymentId, undefined, reason);
      }

      await this.repositories.paymentRepository.update(paymentId, {
        status: PaymentStatus.CANCELED,
        metadata: {
          ...payment.metadata as object,
          cancellation: {
            canceledAt: new Date().toISOString(),
            reason: reason || 'Manual cancellation'
          }
        }
      });

      if (payment.businessSubscription) {
        await this.repositories.subscriptionRepository.updateSubscriptionStatus(payment.businessSubscriptionId!, SubscriptionStatus.CANCELED);
      }

      return {
        success: true,
        message: 'Payment canceled successfully'
      };
    } catch (error) {
      logger.error('Cancel payment error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel payment'
      };
    }
  }


  generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  generateBasketId(): string {
    return `basket_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  createTestBuyer(userInfo: { name: string; surname: string; email: string; phone?: string }): PaymentBuyerData {
    return {
      id: `BY${Date.now()}`,
      name: userInfo.name,
      surname: userInfo.surname,
      gsmNumber: userInfo.phone || '+905350000000',
      email: userInfo.email,
      identityNumber: '11111111111',
      lastLoginDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
      registrationDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
      registrationAddress: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
      ip: '127.0.0.1',
      city: 'Istanbul',
      country: 'Turkey',
      zipCode: '34732'
    };
  }

  createSubscriptionBasketItem(plan: { id: string; name: string; price: string }): PaymentBasketItem {
    return {
      id: plan.id,
      name: `${plan.name} Subscription`,
      category1: 'Subscription',
      category2: 'Digital Services',
      itemType: 'VIRTUAL',
      price: plan.price
    };
  }

  async chargeTrialConversion(
    subscriptionId: string,
    plan: TrialConversionData['plan'],
    storedPaymentMethod: TrialConversionData['paymentMethod'],
    business: TrialConversionData['business']
  ): Promise<{
    success: boolean;
    paymentId?: string;
    iyzicoPaymentId?: string;
    message?: string;
    error?: string;
    discountApplied?: {
      code: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    };
  }> {
    try {
      // Validate required payment method
      if (!storedPaymentMethod) {
        return {
          success: false,
          error: "No payment method available for trial conversion"
        };
      }

      // Check for pending discount
      const subscription = await this.repositories.subscriptionRepository.findSubscriptionById(subscriptionId);
      let finalPrice = Number(plan.price);
      let discountApplied: {
        code: string;
        discountAmount: number;
        originalAmount: number;
        finalAmount: number;
      } | undefined = undefined;
      
      if (subscription?.metadata && typeof subscription.metadata === 'object' && subscription.metadata !== null && 'pendingDiscount' in subscription.metadata) {
        const metadata = subscription.metadata as SubscriptionMetadata;
        const pending = metadata.pendingDiscount;
        
        // Check if discount can be applied to trial conversion
        if (this.discountCodeService && pending) {
          const canApply = await this.discountCodeService.canApplyToPayment(
            subscriptionId,
            'TRIAL_CONVERSION'
          );
          
          if (canApply) {
            // Calculate discount
            if (pending.discountType === 'PERCENTAGE') {
              const discountAmount = finalPrice * (pending.discountValue / 100);
              finalPrice = finalPrice - discountAmount;
              discountApplied = {
                code: pending.code,
                discountAmount,
                originalAmount: Number(plan.price),
                finalAmount: finalPrice
              };
            } else {
              const discountAmount = pending.discountValue;
              finalPrice = Math.max(0, finalPrice - discountAmount);
              discountApplied = {
                code: pending.code,
                discountAmount,
                originalAmount: Number(plan.price),
                finalAmount: finalPrice
              };
            }
          }
        }
      }

      // Create payment request for trial conversion
      const paymentRequest: CreatePaymentRequest = {
        conversationId: this.generateConversationId(),
        price: finalPrice.toString(),
        paidPrice: finalPrice.toString(),
        currency: plan.currency,
        installment: '1',
        basketId: this.generateBasketId(),
        paymentChannel: 'WEB',
        paymentGroup: 'SUBSCRIPTION',
        card: {
          cardHolderName: storedPaymentMethod.cardHolderName,
          cardNumber: `****${storedPaymentMethod.lastFourDigits}`, // Use stored token in real implementation
          expireMonth: storedPaymentMethod.expiryMonth,
          expireYear: storedPaymentMethod.expiryYear,
          cvc: '***' // CVC not stored for security
        },
        buyer: {
          id: `BY${business.ownerId}`,
          name: business.owner.firstName || 'Customer',
          surname: business.owner.lastName || 'User',
          email: business.email || `${business.owner.phoneNumber}@randevubu.com`,
          gsmNumber: business.phone || business.owner.phoneNumber,
          identityNumber: '11111111111',
          lastLoginDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
          registrationDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
          registrationAddress: business.address || 'Test Address',
          ip: '127.0.0.1',
          city: business.city || 'Istanbul',
          country: business.country || 'Turkey',
          zipCode: business.postalCode || '34000'
        },
        shippingAddress: {
          contactName: `${business.owner.firstName || ''} ${business.owner.lastName || ''}`,
          city: business.city || 'Istanbul',
          country: business.country || 'Turkey',
          address: business.address || 'Test Address',
          zipCode: business.postalCode || '34000'
        },
        billingAddress: {
          contactName: `${business.owner.firstName || ''} ${business.owner.lastName || ''}`,
          city: business.city || 'Istanbul',
          country: business.country || 'Turkey',
          address: business.address || 'Test Address',
          zipCode: business.postalCode || '34000'
        },
        basketItems: [this.createSubscriptionBasketItem({
          id: plan.id,
          name: plan.displayName,
          price: finalPrice.toString()
        })]
      };

      // Use the centralized payment method
      const paymentResult = await this.createSubscriptionPayment(subscriptionId, paymentRequest, discountApplied);
      
      // Record discount usage if applied
      if (discountApplied && paymentResult.success && this.discountCodeService) {
        try {
          await this.discountCodeService.applyPendingDiscount(
            subscriptionId,
            paymentResult.paymentId || '',
            Number(plan.price)
          );
        } catch (error) {
          logger.error('Failed to record discount usage', { error: error instanceof Error ? error.message : String(error) });
          // Don't fail the payment for this, just log it
        }
      }

      return {
        ...paymentResult,
        discountApplied
      };
    } catch (error) {
      logger.error('Trial conversion payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process trial conversion payment'
      };
    }
  }

  async createRenewalPayment(
    subscriptionId: string,
    plan: TrialConversionData['plan'],
    storedPaymentMethod: TrialConversionData['paymentMethod'],
    business: TrialConversionData['business']
  ): Promise<{
    success: boolean;
    paymentId?: string;
    iyzicoPaymentId?: string;
    message?: string;
    error?: string;
    discountApplied?: {
      code: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    };
  }> {
    try {
      // Validate required payment method
      if (!storedPaymentMethod) {
        return {
          success: false,
          error: "No payment method available for renewal"
        };
      }

      // Check if subscription has recurring discount
      const subscription = await this.repositories.subscriptionRepository.findSubscriptionById(subscriptionId);
      let finalPrice = Number(plan.price);
      let discountApplied: {
        code: string;
        discountAmount: number;
        originalAmount: number;
        finalAmount: number;
      } | undefined = undefined;
      
      if (subscription?.metadata && typeof subscription.metadata === 'object' && subscription.metadata !== null && 'pendingDiscount' in subscription.metadata) {
        const metadata = subscription.metadata as SubscriptionMetadata;
        if (metadata.pendingDiscount?.isRecurring) {
          const pending = metadata.pendingDiscount;
        
        // Check if discount can be applied to renewal
        if (this.discountCodeService) {
          const canApply = await this.discountCodeService.canApplyToPayment(
            subscriptionId,
            'RENEWAL'
          );
          
          if (canApply && pending && pending.remainingUses && pending.remainingUses > 0) {
            // Apply recurring discount
            if (pending.discountType === 'PERCENTAGE') {
              const discountAmount = finalPrice * (pending.discountValue / 100);
              finalPrice = finalPrice - discountAmount;
              discountApplied = {
                code: pending.code,
                discountAmount,
                originalAmount: Number(plan.price),
                finalAmount: finalPrice
              };
            } else {
              const discountAmount = pending.discountValue;
              finalPrice = Math.max(0, finalPrice - discountAmount);
              discountApplied = {
                code: pending.code,
                discountAmount,
                originalAmount: Number(plan.price),
                finalAmount: finalPrice
              };
            }
            
            // Decrement remaining uses
            const updatedMetadata = subscription.metadata ? (subscription.metadata as SubscriptionMetadata) : {};
            await this.repositories.subscriptionRepository.updateSubscriptionStatus(subscriptionId, subscription.status, {
              ...updatedMetadata,
              pendingDiscount: {
                ...pending,
                remainingUses: pending.remainingUses - 1,
                appliedToPayments: [...(pending.appliedToPayments || []), 'renewal_' + Date.now()]
              }
            });
          }
        }
        }
      }

      const paymentData: CreatePaymentRequest = {
        conversationId: this.generateConversationId(),
        price: finalPrice.toString(),
        paidPrice: finalPrice.toString(),
        currency: plan.currency,
        installment: '1',
        basketId: this.generateBasketId(),
        paymentChannel: 'WEB',
        paymentGroup: 'SUBSCRIPTION_RENEWAL',
        card: {
          cardHolderName: storedPaymentMethod.cardHolderName,
          cardNumber: this.reconstructCardNumber(storedPaymentMethod),
          expireMonth: storedPaymentMethod.expiryMonth,
          expireYear: storedPaymentMethod.expiryYear,
          cvc: '000' // For stored cards, use masked CVC
        },
        buyer: this.createBuyerFromBusiness(business),
        shippingAddress: this.createAddressFromBusiness(business),
        billingAddress: this.createAddressFromBusiness(business),
        basketItems: [this.createRenewalBasketItem({
          id: plan.id,
          name: plan.displayName,
          price: finalPrice.toString()
        })]
      };

      const result = await this.createSubscriptionPayment(subscriptionId, paymentData, discountApplied);
      
      // Record discount usage if applied
      if (discountApplied && this.discountCodeService) {
        try {
          await this.discountCodeService.applyPendingDiscount(
            subscriptionId,
            result.paymentId || '',
            Number(plan.price)
          );
        } catch (error) {
          logger.error('Failed to record discount usage', { error: error instanceof Error ? error.message : String(error) });
          // Don't fail the payment for this, just log it
        }
      }

      return {
        ...result,
        discountApplied
      };
    } catch (error) {
      console.error('Renewal payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process renewal payment'
      };
    }
  }

  async storePaymentMethod(
    businessId: string,
    cardData: PaymentCardData,
    makeDefault: boolean = false
  ): Promise<{
    success: boolean;
    paymentMethodId?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, you would tokenize the card with Iyzico
      // For now, we'll store basic card info (never store full card numbers in production!)
      
      if (makeDefault) {
        // Set all existing payment methods to non-default
        await this.repositories.businessRepository.updateStoredPaymentMethodsDefault(businessId);
      }

      const storedPaymentMethod = await this.repositories.businessRepository.createStoredPaymentMethod({
        businessId,
        cardHolderName: cardData.cardHolderName,
        lastFourDigits: cardData.cardNumber.slice(-4),
        cardBrand: this.detectCardBrand(cardData.cardNumber),
        expiryMonth: cardData.expireMonth,
        expiryYear: cardData.expireYear,
        isDefault: makeDefault,
        providerToken: `token_${Date.now()}`,
        metadata: {
          createdAt: new Date().toISOString(),
          source: 'subscription_flow'
        }
      });

      return {
        success: true,
        paymentMethodId: storedPaymentMethod.id
      };
    } catch (error) {
      console.error('Store payment method error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store payment method'
      };
    }
  }

  async getStoredPaymentMethods(businessId: string) {
    try {
      const paymentMethods = await this.repositories.businessRepository.findStoredPaymentMethods(businessId);

      return {
        success: true,
        paymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          cardHolderName: pm.cardHolderName,
          lastFourDigits: pm.lastFourDigits,
          cardBrand: pm.cardBrand,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
          createdAt: pm.createdAt
        }))
      };
    } catch (error) {
      logger.error('Get payment methods error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment methods'
      };
    }
  }

  async deletePaymentMethod(businessId: string, paymentMethodId: string) {
    try {
      const paymentMethod = await this.repositories.businessRepository.findStoredPaymentMethodById(paymentMethodId, businessId);

      if (!paymentMethod) {
        return { success: false, error: 'Payment method not found' };
      }

      // Soft delete
      await this.repositories.businessRepository.updateStoredPaymentMethodStatus(paymentMethodId, false);

      return { success: true };
    } catch (error) {
      logger.error('Delete payment method error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment method'
      };
    }
  }

  private reconstructCardNumber(storedPaymentMethod: { cardHolderName: string; expiryMonth: string; expiryYear: string }): string {
    // In production, this would use the stored token to retrieve card info from provider
    // For demo purposes, return a test card number
    return '5528790000000008';
  }

  private detectCardBrand(cardNumber: string): string {
    const firstDigit = cardNumber.charAt(0);
    const firstTwoDigits = cardNumber.substring(0, 2);
    
    if (firstDigit === '4') return 'VISA';
    if (firstTwoDigits >= '51' && firstTwoDigits <= '55') return 'MASTERCARD';
    if (firstTwoDigits === '34' || firstTwoDigits === '37') return 'AMERICAN_EXPRESS';
    return 'UNKNOWN';
  }

  private createBuyerFromBusiness(business: { ownerId: string; owner: { firstName?: string | null; lastName?: string | null; phoneNumber: string }; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; country?: string | null; postalCode?: string | null; name?: string | null }): PaymentBuyerData {
    return {
      id: `BY${business.ownerId}`,
      name: business.owner.firstName || 'Business',
      surname: business.owner.lastName || 'Owner',
      email: business.email || business.owner.phoneNumber + '@randevubu.com',
      gsmNumber: business.phone || business.owner.phoneNumber,
      identityNumber: '11111111111',
      lastLoginDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
      registrationDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
      registrationAddress: business.address || 'Business Address',
      ip: '127.0.0.1',
      city: business.city || 'Istanbul',
      country: business.country || 'Turkey',
      zipCode: business.postalCode || '34000'
    };
  }

  private createAddressFromBusiness(business: { name?: string | null; city?: string | null; country?: string | null; address?: string | null; postalCode?: string | null }) {
    return {
      contactName: business.name || 'Business Owner',
      city: business.city || 'Istanbul',
      country: business.country || 'Turkey',
      address: business.address || 'Business Address',
      zipCode: business.postalCode || '34000'
    };
  }

  private createRenewalBasketItem(plan: { id: string; name: string; price: string }): PaymentBasketItem {
    return {
      id: plan.id,
      name: `${plan.name} Renewal`,
      category1: 'Subscription',
      category2: 'Renewal',
      itemType: 'VIRTUAL',
      price: plan.price
    };
  }

  getTestCards() {
    return {
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
    };
  }
}
