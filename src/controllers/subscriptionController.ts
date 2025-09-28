import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import { subscribeBusinessSchema, changePlanSchema } from '../schemas/business.schemas';
import { GuaranteedAuthRequest } from '../types/auth';
import { SubscriptionStatus } from '../types/business';

export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  // Public endpoints
  async getAllPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await this.subscriptionService.getAllPlans();

      res.json({
        success: true,
        data: plans,
        meta: {
          total: plans.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getPlanById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const plan = await this.subscriptionService.getPlanById(id);

      if (!plan) {
        res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
        return;
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getPlansByBillingInterval(req: Request, res: Response): Promise<void> {
    try {
      const { interval } = req.params;

      if (!['monthly', 'yearly'].includes(interval)) {
        res.status(400).json({
          success: false,
          error: 'Invalid billing interval. Must be monthly or yearly'
        });
        return;
      }

      const plans = await this.subscriptionService.getPlansByBillingInterval(interval);

      res.json({
        success: true,
        data: plans,
        meta: {
          total: plans.length,
          billingInterval: interval
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Business subscription management
  async subscribeBusiness(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const validatedData = subscribeBusinessSchema.parse(req.body);
      const userId = req.user.id;

      const subscription = await this.subscriptionService.subscribeBusiness(
        userId,
        businessId,
        validatedData
      );

      res.status(201).json({
        success: true,
        data: subscription,
        message: 'Business subscribed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      });
    }
  }

  async getBusinessSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      const subscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
        return;
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getSubscriptionHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      const subscriptions = await this.subscriptionService.getSubscriptionHistory(userId, businessId);

      res.json({
        success: true,
        data: subscriptions,
        meta: {
          total: subscriptions.length,
          businessId
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async upgradePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { newPlanId } = req.body;
      const userId = req.user.id;

      if (!newPlanId || typeof newPlanId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'newPlanId is required'
        });
        return;
      }

      const subscription = await this.subscriptionService.upgradePlan(
        userId,
        businessId,
        newPlanId
      );

      res.json({
        success: true,
        data: subscription,
        message: 'Plan upgraded successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upgrade plan'
      });
    }
  }

  async downgradePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { newPlanId } = req.body;
      const userId = req.user.id;

      if (!newPlanId || typeof newPlanId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'newPlanId is required'
        });
        return;
      }

      const subscription = await this.subscriptionService.downgradePlan(
        userId,
        businessId,
        newPlanId
      );

      res.json({
        success: true,
        data: subscription,
        message: 'Plan downgraded successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to downgrade plan'
      });
    }
  }

  async cancelSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { cancelAtPeriodEnd = true } = req.body;
      const userId = req.user.id;

      const subscription = await this.subscriptionService.cancelSubscription(
        userId,
        businessId,
        cancelAtPeriodEnd
      );

      const message = cancelAtPeriodEnd 
        ? 'Subscription will be cancelled at period end'
        : 'Subscription cancelled immediately';

      res.json({
        success: true,
        data: subscription,
        message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      });
    }
  }

  async reactivateSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      const subscription = await this.subscriptionService.reactivateSubscription(
        userId,
        businessId
      );

      res.json({
        success: true,
        data: subscription,
        message: 'Subscription reactivated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription'
      });
    }
  }

  async convertTrialToActive(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { paymentMethodId } = req.body;
      const userId = req.user.id;

      const subscription = await this.subscriptionService.convertTrialToActive(
        userId,
        businessId,
        paymentMethodId
      );

      res.json({
        success: true,
        data: subscription,
        message: 'Trial converted to active subscription'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert trial'
      });
    }
  }

  async calculatePlanChange(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, subscriptionId } = req.params;
      const { newPlanId, effectiveDate = 'immediate' } = req.body;
      const userId = req.user.id;

      // Get current subscription
      const currentSubscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);
      if (!currentSubscription) {
        res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
        return;
      }

      // Get plans
      const [currentPlan, newPlan] = await Promise.all([
        this.subscriptionService.getPlanById(currentSubscription.planId),
        this.subscriptionService.getPlanById(newPlanId)
      ]);

      if (!newPlan) {
        res.status(400).json({
          success: false,
          error: 'Invalid plan ID'
        });
        return;
      }

      // Determine change type
      const isUpgrade = newPlan.price > currentPlan!.price;
      const isDowngrade = newPlan.price < currentPlan!.price;
      const changeType = isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change';

      // Calculate proration if upgrade
      let prorationAmount = 0;
      if (isUpgrade && effectiveDate === 'immediate') {
        const proration = await this.subscriptionService.calculateUpgradeProration(
          currentSubscription.planId,
          newPlanId,
          currentSubscription.currentPeriodEnd
        );
        prorationAmount = proration.proratedAmount;
      }

      // Check for downgrade limitations
      const limitations = [];
      if (isDowngrade) {
        const validation = await this.subscriptionService.validatePlanLimits(businessId, newPlanId);
        if (!validation.isValid) {
          limitations.push(...validation.violations);
        }
      }

      // Determine if payment is required
      const requiresPayment = isUpgrade && prorationAmount > 0;

      // Determine actual effective date (downgrades always next cycle)
      const actualEffectiveDate = isDowngrade ? 'next_billing_cycle' : effectiveDate;

      // Get stored payment methods for upgrades
      let storedPaymentMethods = [];
      if (requiresPayment) {
        const paymentMethodsResult = await this.subscriptionService.getStoredPaymentMethods(userId, businessId);
        if (paymentMethodsResult.success) {
          storedPaymentMethods = paymentMethodsResult.paymentMethods || [];
        }
      }

      res.json({
        success: true,
        data: {
          changeType,
          currentPlan: {
            id: currentPlan!.id,
            name: currentPlan!.name,
            price: currentPlan!.price
          },
          newPlan: {
            id: newPlan.id,
            name: newPlan.name,
            price: newPlan.price
          },
          prorationAmount,
          effectiveDate: actualEffectiveDate,
          requiresPayment,
          limitations,
          hasPaymentMethod: !!currentSubscription.paymentMethodId,
          storedPaymentMethods,
          canProceed: limitations.length === 0 && (!requiresPayment || storedPaymentMethods.length > 0)
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate plan change'
      });
    }
  }

  async getPaymentMethods(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      const result = await this.subscriptionService.getStoredPaymentMethods(userId, businessId);

      if (result.success) {
        res.json({
          success: true,
          data: result.paymentMethods || []
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment methods'
      });
    }
  }

  async addPaymentMethod(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { cardHolderName, cardNumber, expireMonth, expireYear, cvc, makeDefault } = req.body;
      const userId = req.user.id;

      const cardData = {
        cardHolderName,
        cardNumber,
        expireMonth,
        expireYear,
        cvc
      };

      const result = await this.subscriptionService.addPaymentMethodForPlanChange(
        userId,
        businessId,
        cardData,
        makeDefault
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            paymentMethodId: result.paymentMethodId
          },
          message: 'Payment method added successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add payment method'
      });
    }
  }

  async changePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, subscriptionId } = req.params;
      const validatedData = changePlanSchema.parse(req.body);
      const userId = req.user.id;

      const subscription = await this.subscriptionService.changePlan(
        userId,
        businessId,
        validatedData.newPlanId,
        {
          effectiveDate: validatedData.effectiveDate,
          prorationPreference: validatedData.prorationPreference,
          paymentMethodId: validatedData.paymentMethodId
        }
      );

      const changeType = subscription.metadata?.changeType || 'change';
      const effectiveDate = validatedData.effectiveDate === 'next_billing_cycle'
        ? 'at the end of your current billing period'
        : 'immediately';

      let message = `Plan ${changeType} will take effect ${effectiveDate}`;

      // Add payment information to the message if payment was processed
      if (subscription.metadata?.paymentProcessed && subscription.metadata?.paymentAmount) {
        message += `. Payment of $${subscription.metadata.paymentAmount.toFixed(2)} has been processed successfully.`;
      }

      res.json({
        success: true,
        data: subscription,
        message,
        paymentInfo: subscription.metadata?.paymentProcessed ? {
          paymentId: subscription.metadata.paymentId,
          amount: subscription.metadata.paymentAmount,
          processed: true
        } : null
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change plan'
      });
    }
  }

  async checkSubscriptionLimits(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      const limits = await this.subscriptionService.checkSubscriptionLimits(userId, businessId);

      res.json({
        success: true,
        data: limits
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async calculateUpgradeProration(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { currentPlanId, newPlanId, currentPeriodEnd } = req.query;

      if (!currentPlanId || !newPlanId || !currentPeriodEnd) {
        res.status(400).json({
          success: false,
          error: 'currentPlanId, newPlanId, and currentPeriodEnd are required'
        });
        return;
      }

      const periodEnd = new Date(currentPeriodEnd as string);
      if (isNaN(periodEnd.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid currentPeriodEnd date format'
        });
        return;
      }

      const proration = await this.subscriptionService.calculateUpgradeProration(
        currentPlanId as string,
        newPlanId as string,
        periodEnd
      );

      res.json({
        success: true,
        data: proration
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate proration'
      });
    }
  }

  async validatePlanLimits(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, planId } = req.params;

      const validation = await this.subscriptionService.validatePlanLimits(businessId, planId);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate plan limits'
      });
    }
  }

  // Admin endpoints
  async getAllSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.subscriptionService.getAllSubscriptions(userId, page, limit);

      res.json({
        success: true,
        data: result.subscriptions,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getSubscriptionStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const stats = await this.subscriptionService.getSubscriptionStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getTrialsEndingSoon(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days as string) || 3;

      if (days < 1 || days > 30) {
        res.status(400).json({
          success: false,
          error: 'Days must be between 1 and 30'
        });
        return;
      }

      const trials = await this.subscriptionService.getTrialsEndingSoon(userId, days);

      res.json({
        success: true,
        data: trials,
        meta: {
          total: trials.length,
          days
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getExpiredSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const expired = await this.subscriptionService.getExpiredSubscriptions(userId);

      res.json({
        success: true,
        data: expired,
        meta: {
          total: expired.length
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async forceUpdateSubscriptionStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { status, reason } = req.body;
      const userId = req.user.id;

      if (!Object.values(SubscriptionStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscription status'
        });
        return;
      }

      const subscription = await this.subscriptionService.forceUpdateSubscriptionStatus(
        userId,
        subscriptionId,
        status,
        reason
      );

      res.json({
        success: true,
        data: subscription,
        message: `Subscription status updated to ${status}`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription status'
      });
    }
  }

  // System endpoints
  async processExpiredSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // This would typically be restricted to system calls
      const result = await this.subscriptionService.processExpiredSubscriptions();

      res.json({
        success: true,
        data: result,
        message: `Processed ${result.processed} expired subscriptions`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process expired subscriptions'
      });
    }
  }

  async processSubscriptionRenewals(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint for processing renewals
      const result = await this.subscriptionService.processSubscriptionRenewals();

      res.json({
        success: true,
        data: result,
        message: `Processed ${result.processed} renewals, ${result.renewed} successful, ${result.failed} failed`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process subscription renewals'
      });
    }
  }

  async sendTrialEndingNotifications(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.subscriptionService.sendTrialEndingNotifications();

      res.json({
        success: true,
        data: { notificationsSent: count },
        message: `Sent ${count} trial ending notifications`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send trial ending notifications'
      });
    }
  }

  // Utility endpoints
  async getSubscriptionsByStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const userId = req.user.id;
      
      if (!Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscription status'
        });
        return;
      }

      // This would need to be implemented in the service
      res.status(501).json({
        success: false,
        error: 'getSubscriptionsByStatus not implemented'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getSubscriptionsByPlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { planId } = req.params;
      const userId = req.user.id;

      // This would need to be implemented in the service
      res.status(501).json({
        success: false,
        error: 'getSubscriptionsByPlan not implemented'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getBusinessesWithoutSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // This would need to be implemented in the service
      res.status(501).json({
        success: false,
        error: 'getBusinessesWithoutSubscription not implemented'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getRevenueAnalytics(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      // This would need to be implemented in the service
      res.status(501).json({
        success: false,
        error: 'getRevenueAnalytics not implemented'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }
}