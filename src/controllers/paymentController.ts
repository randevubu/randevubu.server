import { Request, Response } from 'express';
import { PaymentService, CreatePaymentRequest } from '../services/paymentService';
import { GuaranteedAuthRequest } from '../types/auth';
import { z } from 'zod';

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
    private paymentService: PaymentService
  ) {}

  async createSubscriptionPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const validatedData = createSubscriptionPaymentSchema.parse(req.body);
      const userId = req.user.id;

      console.log(`🔍 Payment request received:`, {
        businessId,
        planId: validatedData.planId,
        discountCode: validatedData.discountCode,
        hasCard: !!validatedData.card
      });

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

      console.log(`🔍 Payment service result:`, result);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            subscriptionId: result.subscriptionId,
            paymentId: result.paymentId,
            message: result.message,
            discountApplied: result.discountApplied
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      } else {
        console.error('Create subscription payment error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  }

  async refundPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const validatedData = refundPaymentSchema.parse(req.body);
      const userId = req.user.id;

      const result = await this.paymentService.refundPayment(
        paymentId,
        validatedData.amount,
        validatedData.reason
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            refundId: result.refundId,
            message: result.message
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      } else {
        console.error('Refund payment error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  }

  async cancelPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const result = await this.paymentService.cancelPayment(paymentId, reason);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Cancel payment error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getPayment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      const result = await this.paymentService.retrievePayment(paymentId);

      if (result.success) {
        res.json({
          success: true,
          data: result.payment
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getPaymentHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      const result = await this.paymentService.getSubscriptionWithPayments(businessId);

      if (result.success) {
        res.json({
          success: true,
          data: result.subscription
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getTestCards(req: Request, res: Response): Promise<void> {
    try {
      const testCards = this.paymentService.getTestCards();

      res.json({
        success: true,
        data: testCards,
        message: 'Test cards for Iyzico sandbox environment',
        usage: {
          success: 'Use success card for successful test payments',
          failure: 'Use failure card to test payment failures',
          threeDsSuccess: 'Use for 3DS authentication test'
        }
      });
    } catch (error) {
      console.error('Get test cards error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await this.paymentService['prisma'].subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
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
          maxAppointmentsPerDay: true,
          features: true,
          isPopular: true,
          sortOrder: true
        }
      });

      res.json({
        success: true,
        data: plans,
        message: 'Subscription plans retrieved successfully'
      });
    } catch (error) {
      console.error('Get subscription plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async webhookHandler(req: Request, res: Response): Promise<void> {
    try {
      const iyzicoData = req.body;
      
      console.log('Iyzico webhook received:', iyzicoData);

      if (iyzicoData.status === 'success') {
        const paymentId = iyzicoData.paymentId;
        
        const payment = await this.paymentService.retrievePayment(paymentId);
        
        if (payment.success) {
          console.log('Webhook processed successfully for payment:', paymentId);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed'
      });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(400).json({
        status: 'error',
        message: 'Webhook processing failed'
      });
    }
  }
}