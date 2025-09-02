import Iyzipay from 'iyzipay';
import { PrismaClient } from '@prisma/client';
import { PaymentStatus, SubscriptionStatus } from '../types/business';

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
  
  constructor(
    private prisma: PrismaClient,
    private discountCodeService?: any // Will be injected later to avoid circular dependency
  ) {
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
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        include: { owner: true }
      });

      if (!business) {
        return { success: false, error: 'Business not found' };
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        return { success: false, error: 'Subscription plan not found' };
      }

      const existingSubscription = await this.prisma.businessSubscription.findUnique({
        where: { businessId }
      });

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
        const discountResult = await this.discountCodeService.validateDiscountCode(
          paymentData.discountCode,
          planId,
          Number(plan.price),
          business.ownerId
        );

        if (discountResult.isValid && discountResult.calculatedDiscount) {
          finalPrice = discountResult.calculatedDiscount.finalAmount;
          discountApplied = {
            code: paymentData.discountCode,
            discountAmount: discountResult.calculatedDiscount.discountAmount,
            originalAmount: discountResult.calculatedDiscount.originalAmount,
            finalAmount: discountResult.calculatedDiscount.finalAmount
          };
        } else {
          // Don't fail the payment for invalid discount codes, just ignore them
          console.warn(`Invalid discount code: ${discountResult.errorMessage}`);
        }
      }

      const currentDate = new Date();
      const nextPeriod = new Date();
      if (plan.billingInterval.toLowerCase() === 'monthly') {
        nextPeriod.setMonth(currentDate.getMonth() + 1);
      } else if (plan.billingInterval.toLowerCase() === 'yearly') {
        nextPeriod.setFullYear(currentDate.getFullYear() + 1);
      }

      const subscription = await this.prisma.businessSubscription.upsert({
        where: { businessId },
        create: {
          id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          businessId,
          planId,
          status: 'UNPAID',
          currentPeriodStart: currentDate,
          currentPeriodEnd: nextPeriod,
          metadata: {
            createdAt: currentDate.toISOString(),
            source: 'payment_flow'
          }
        },
        update: {
          planId,
          status: 'UNPAID',
          currentPeriodStart: currentDate,
          currentPeriodEnd: nextPeriod,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: new Date()
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
            console.error('Failed to record discount code usage:', error);
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
        await this.prisma.businessSubscription.update({
          where: { id: subscription.id },
          data: { status: 'UNPAID' }
        });

        return {
          success: false,
          error: paymentResult.error || 'Payment failed'
        };
      }
    } catch (error) {
      console.error('Create subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      };
    }
  }

  async getSubscriptionWithPayments(businessId: string) {
    try {
      const subscription = await this.prisma.businessSubscription.findUnique({
        where: { businessId },
        include: {
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          business: {
            select: {
              name: true,
              owner: {
                select: {
                  firstName: true,
                  lastName: true,
                  phoneNumber: true
                }
              }
            }
          }
        }
      });

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
      const request: any = {
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

      const result = await new Promise<any>((resolve, reject) => {
        this.iyzipay.payment.create(request, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (result.status === 'success') {
        const paymentRecord = await this.prisma.payment.create({
          data: {
            id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            businessSubscriptionId,
            amount: parseFloat(paymentData.paidPrice),
            currency: paymentData.currency,
            status: PaymentStatus.SUCCEEDED,
            paymentMethod: 'card',
            paymentProvider: 'iyzico',
            providerPaymentId: result.paymentId,
            paidAt: new Date(),
            metadata: {
              iyzicoResponse: result,
              conversationId: paymentData.conversationId,
              basketId: paymentData.basketId,
              installment: paymentData.installment,
              cardInfo: {
                cardType: result.cardType,
                cardAssociation: result.cardAssociation,
                cardFamily: result.cardFamily,
                lastFourDigits: result.lastFourDigits,
                binNumber: result.binNumber
              },
              ...(discountApplied && {
                discount: {
                  code: discountApplied.code,
                  originalAmount: discountApplied.originalAmount,
                  discountAmount: discountApplied.discountAmount,
                  finalAmount: discountApplied.finalAmount
                }
              })
            }
          }
        });

        await this.prisma.businessSubscription.update({
          where: { id: businessSubscriptionId },
          data: {
            status: SubscriptionStatus.ACTIVE
          }
        });

        return {
          success: true,
          paymentId: paymentRecord.id,
          iyzicoPaymentId: result.paymentId,
          message: 'Payment successful'
        };
      } else {
        await this.prisma.payment.create({
          data: {
            id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            businessSubscriptionId,
            amount: parseFloat(paymentData.paidPrice),
            currency: paymentData.currency,
            status: PaymentStatus.FAILED,
            paymentMethod: 'card',
            paymentProvider: 'iyzico',
            failedAt: new Date(),
            metadata: {
              iyzicoResponse: result,
              conversationId: paymentData.conversationId,
              error: result.errorMessage || 'Payment failed'
            }
          }
        });

        return {
          success: false,
          error: result.errorMessage || 'Payment failed'
        };
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      await this.prisma.payment.create({
        data: {
          id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          businessSubscriptionId,
          amount: parseFloat(paymentData.paidPrice),
          currency: paymentData.currency,
          status: PaymentStatus.FAILED,
          paymentMethod: 'card',
          paymentProvider: 'iyzico',
          failedAt: new Date(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            conversationId: paymentData.conversationId
          }
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
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId }
      });

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

      const result = await new Promise<any>((resolve, reject) => {
        this.iyzipay.refund.create(request, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (result.status === 'success') {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
            metadata: {
              ...payment.metadata as object,
              refund: {
                refundId: result.paymentId,
                refundAmount,
                refundReason: reason,
                refundDate: new Date().toISOString(),
                iyzicoRefundResponse: result
              }
            }
          }
        });

        return {
          success: true,
          refundId: result.paymentId,
          message: 'Refund successful'
        };
      } else {
        return {
          success: false,
          error: result.errorMessage || 'Refund failed'
        };
      }
    } catch (error) {
      console.error('Refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  async retrievePayment(paymentId: string): Promise<{
    success: boolean;
    payment?: any;
    error?: string;
  }> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment || !payment.providerPaymentId) {
        return { success: false, error: 'Payment not found' };
      }

      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: `retrieve_${Date.now()}`,
        paymentId: payment.providerPaymentId
      };

      const result = await new Promise<any>((resolve, reject) => {
        this.iyzipay.payment.retrieve(request, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      return {
        success: result.status === 'success',
        payment: result,
        error: result.status !== 'success' ? result.errorMessage : undefined
      };
    } catch (error) {
      console.error('Retrieve payment error:', error);
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
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { businessSubscription: true }
      });

      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      if (payment.status === PaymentStatus.CANCELED) {
        return { success: false, error: 'Payment already canceled' };
      }

      if (payment.status === PaymentStatus.SUCCEEDED) {
        return await this.refundPayment(paymentId, undefined, reason);
      }

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELED,
          metadata: {
            ...payment.metadata as object,
            cancellation: {
              canceledAt: new Date().toISOString(),
              reason: reason || 'Manual cancellation'
            }
          }
        }
      });

      if (payment.businessSubscription) {
        await this.prisma.businessSubscription.update({
          where: { id: payment.businessSubscriptionId! },
          data: {
            status: SubscriptionStatus.CANCELED
          }
        });
      }

      return {
        success: true,
        message: 'Payment canceled successfully'
      };
    } catch (error) {
      console.error('Cancel payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel payment'
      };
    }
  }

  async getPaymentHistory(businessSubscriptionId: string): Promise<{
    success: boolean;
    payments?: any[];
    error?: string;
  }> {
    try {
      const payments = await this.prisma.payment.findMany({
        where: { businessSubscriptionId },
        orderBy: { createdAt: 'desc' }
      });

      return {
        success: true,
        payments
      };
    } catch (error) {
      console.error('Get payment history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment history'
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

  async createRenewalPayment(
    subscriptionId: string,
    plan: any,
    storedPaymentMethod: any,
    business: any
  ): Promise<{
    success: boolean;
    paymentId?: string;
    iyzicoPaymentId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const paymentData: CreatePaymentRequest = {
        conversationId: this.generateConversationId(),
        price: plan.price.toString(),
        paidPrice: plan.price.toString(),
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
          price: plan.price.toString()
        })]
      };

      return await this.createSubscriptionPayment(subscriptionId, paymentData);
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
        await this.prisma.storedPaymentMethod.updateMany({
          where: { businessId, isActive: true },
          data: { isDefault: false }
        });
      }

      const storedPaymentMethod = await this.prisma.storedPaymentMethod.create({
        data: {
          id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          businessId,
          cardHolderName: cardData.cardHolderName,
          lastFourDigits: cardData.cardNumber.slice(-4),
          cardBrand: this.detectCardBrand(cardData.cardNumber),
          expiryMonth: cardData.expireMonth,
          expiryYear: cardData.expireYear,
          isDefault: makeDefault,
          isActive: true,
          // In production, store tokenized version from payment provider
          providerToken: `token_${Date.now()}`,
          metadata: {
            createdAt: new Date().toISOString(),
            source: 'subscription_flow'
          }
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
      const paymentMethods = await this.prisma.storedPaymentMethod.findMany({
        where: { businessId, isActive: true },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

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
      console.error('Get payment methods error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment methods'
      };
    }
  }

  async deletePaymentMethod(businessId: string, paymentMethodId: string) {
    try {
      const paymentMethod = await this.prisma.storedPaymentMethod.findFirst({
        where: { id: paymentMethodId, businessId }
      });

      if (!paymentMethod) {
        return { success: false, error: 'Payment method not found' };
      }

      // Soft delete
      await this.prisma.storedPaymentMethod.update({
        where: { id: paymentMethodId },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Delete payment method error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment method'
      };
    }
  }

  private reconstructCardNumber(storedPaymentMethod: any): string {
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

  private createBuyerFromBusiness(business: any): PaymentBuyerData {
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

  private createAddressFromBusiness(business: any) {
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