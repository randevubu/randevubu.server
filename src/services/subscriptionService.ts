import {
  SubscriptionPlanData,
  BusinessSubscriptionData,
  SubscriptionStatus,
  SubscribeBusinessRequest
} from '../types/business';
import { SubscriptionRepository } from '../repositories/subscriptionRepository';
import { RBACService } from './rbacService';
import { PaymentService } from './paymentService';
import { PermissionName } from '../types/auth';

export class SubscriptionService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private rbacService: RBACService,
    private paymentService: PaymentService
  ) {}

  // Subscription Plans
  async getAllPlans(): Promise<SubscriptionPlanData[]> {
    // Public method - no authentication required
    return await this.subscriptionRepository.findAllPlans();
  }

  async getPlanById(planId: string): Promise<SubscriptionPlanData | null> {
    // Public method - no authentication required
    return await this.subscriptionRepository.findPlanById(planId);
  }

  async getPlansByBillingInterval(interval: string): Promise<SubscriptionPlanData[]> {
    // Public method - no authentication required
    return await this.subscriptionRepository.findPlansByBillingInterval(interval);
  }

  // Business Subscriptions
  async subscribeBusiness(
    userId: string,
    businessId: string,
    data: SubscribeBusinessRequest & { 
      paymentMethodId?: string;
      autoRenewal?: boolean;
    }
  ): Promise<BusinessSubscriptionData> {
    // Check if user owns the business or has global subscription management rights
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    // Check if business already has an active subscription
    const existingSubscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (existingSubscription) {
      throw new Error('Business already has an active subscription');
    }

    // Validate the plan exists
    const plan = await this.subscriptionRepository.findPlanById(data.planId);
    if (!plan || !plan.isActive) {
      throw new Error('Invalid or inactive subscription plan');
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (plan.billingInterval === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (plan.billingInterval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // For new subscriptions, start with trial if available
    const shouldStartTrial = plan.name.includes('professional') || plan.name.includes('business');
    
    if (shouldStartTrial) {
      return await this.subscriptionRepository.startTrial(businessId, data.planId, 14);
    }

    // Create active subscription
    return await this.subscriptionRepository.createSubscription({
      businessId,
      planId: data.planId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenewal: data.autoRenewal ?? true,
      paymentMethodId: data.paymentMethodId,
      nextBillingDate: periodEnd,
      metadata: {
        paymentMethodId: data.paymentMethodId,
        createdBy: userId
      }
    });
  }

  async getBusinessSubscription(
    userId: string,
    businessId: string
  ): Promise<BusinessSubscriptionData | null> {
    // Check permissions to view business subscription
    const [resource, action] = PermissionName.VIEW_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    return await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
  }

  async getSubscriptionHistory(
    userId: string,
    businessId: string
  ): Promise<BusinessSubscriptionData[]> {
    // Check permissions to view business subscription
    const [resource, action] = PermissionName.VIEW_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    return await this.subscriptionRepository.findSubscriptionsByBusinessId(businessId);
  }

  async upgradePlan(
    userId: string,
    businessId: string,
    newPlanId: string
  ): Promise<BusinessSubscriptionData> {
    // Check permissions to manage business subscription
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const currentSubscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.subscriptionRepository.findPlanById(newPlanId);
    if (!newPlan || !newPlan.isActive) {
      throw new Error('Invalid or inactive subscription plan');
    }

    // Validate upgrade (new plan should be more expensive or have more features)
    const currentPlan = await this.subscriptionRepository.findPlanById(currentSubscription.planId);
    if (currentPlan && newPlan.price <= currentPlan.price) {
      throw new Error('New plan must be an upgrade (higher price)');
    }

    // Calculate prorated end date
    const now = new Date();
    const newPeriodEnd = new Date(currentSubscription.currentPeriodEnd);
    
    if (newPlan.billingInterval !== currentPlan?.billingInterval) {
      // If switching billing intervals, adjust the period
      if (newPlan.billingInterval === 'yearly') {
        newPeriodEnd.setFullYear(now.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(now.getMonth() + 1);
      }
    }

    return await this.subscriptionRepository.upgradeSubscription(
      currentSubscription.id,
      newPlanId,
      newPeriodEnd
    );
  }

  async changePlan(
    userId: string,
    businessId: string,
    newPlanId: string,
    options: {
      effectiveDate?: 'immediate' | 'next_billing_cycle';
      prorationPreference?: 'prorate' | 'credit_forward';
      paymentMethodId?: string;
    } = {}
  ): Promise<BusinessSubscriptionData> {
    // Check permissions to manage business subscription
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);

    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const currentSubscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.subscriptionRepository.findPlanById(newPlanId);
    if (!newPlan || !newPlan.isActive) {
      throw new Error('Invalid or inactive subscription plan');
    }

    const currentPlan = await this.subscriptionRepository.findPlanById(currentSubscription.planId);
    if (!currentPlan) {
      throw new Error('Current subscription plan not found');
    }

    // Don't allow changing to the same plan
    if (currentSubscription.planId === newPlanId) {
      throw new Error('Cannot change to the same plan');
    }

    // Determine if this is an upgrade or downgrade
    const isUpgrade = newPlan.price > currentPlan.price;
    const isDowngrade = newPlan.price < currentPlan.price;

    // For downgrades, validate against current usage
    if (isDowngrade) {
      const limits = await this.subscriptionRepository.checkSubscriptionLimits(businessId);

      if (newPlan.maxBusinesses !== -1 && limits.usage.currentBusinesses > newPlan.maxBusinesses) {
        throw new Error(`Cannot downgrade: You have ${limits.usage.currentBusinesses} businesses but the new plan only allows ${newPlan.maxBusinesses}`);
      }

      if (newPlan.maxStaffPerBusiness !== -1 && limits.usage.currentStaff > newPlan.maxStaffPerBusiness) {
        throw new Error(`Cannot downgrade: You have ${limits.usage.currentStaff} staff members but the new plan only allows ${newPlan.maxStaffPerBusiness}`);
      }
    }

    // Calculate new period end based on effective date and billing cycle
    const now = new Date();
    let effectiveDate = now;
    let newPeriodEnd = new Date(currentSubscription.currentPeriodEnd);

    if (options.effectiveDate === 'next_billing_cycle') {
      // Change takes effect at the end of current billing period
      effectiveDate = new Date(currentSubscription.currentPeriodEnd);

      // Calculate new period end from the effective date
      if (newPlan.billingInterval === 'monthly') {
        newPeriodEnd = new Date(effectiveDate);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      } else if (newPlan.billingInterval === 'yearly') {
        newPeriodEnd = new Date(effectiveDate);
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      }
    } else {
      // Immediate change
      if (newPlan.billingInterval !== currentPlan.billingInterval) {
        // If switching billing intervals, reset the period
        if (newPlan.billingInterval === 'yearly') {
          newPeriodEnd.setFullYear(now.getFullYear() + 1);
        } else {
          newPeriodEnd.setMonth(now.getMonth() + 1);
        }
      }
    }

    // For immediate upgrades, apply proration and process payment
    let prorationAmount = 0;
    let paymentResult = null;

    if (options.effectiveDate !== 'next_billing_cycle' && isUpgrade) {
      const proration = await this.calculateUpgradeProration(
        currentSubscription.planId,
        newPlanId,
        currentSubscription.currentPeriodEnd
      );
      prorationAmount = proration.proratedAmount;

      // Process payment for the prorated amount if > 0
      if (prorationAmount > 0) {
        const paymentMethodId = options.paymentMethodId || currentSubscription.paymentMethodId;

        if (!paymentMethodId) {
          throw new Error('Payment method required for plan upgrade. Please add a payment method to continue.');
        }

        // Process payment using real Iyzico integration
        paymentResult = await this.paymentService.createProrationPayment(
          businessId,
          currentSubscription.id,
          prorationAmount,
          paymentMethodId,
          {
            previousPlanId: currentSubscription.planId,
            newPlanId,
            changeType: isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change'
          }
        );

        if (!paymentResult.success) {
          throw new Error(`Payment failed: ${paymentResult.error || 'Unable to process payment'}`);
        }
      }
    }

    // For downgrades, always apply at next billing cycle (customer-friendly)
    if (isDowngrade && options.effectiveDate === 'immediate') {
      options.effectiveDate = 'next_billing_cycle';
    }

    // Create subscription change record with proper metadata
    const metadata = {
      previousPlanId: currentSubscription.planId,
      changeType: isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'change',
      effectiveDate: options.effectiveDate || 'immediate',
      prorationPreference: options.prorationPreference || 'prorate',
      prorationAmount,
      paymentProcessed: paymentResult?.success || false,
      paymentId: paymentResult?.paymentId,
      iyzicoPaymentId: paymentResult?.iyzicoPaymentId,
      paymentAmount: prorationAmount,
      changedBy: userId,
      changedAt: now.toISOString()
    };

    // Update payment method if provided
    const updateData: any = {
      planId: newPlanId,
      currentPeriodEnd: newPeriodEnd,
      nextBillingDate: newPeriodEnd,
      metadata: { ...currentSubscription.metadata, ...metadata }
    };

    if (options.paymentMethodId) {
      updateData.paymentMethodId = options.paymentMethodId;
    }

    return await this.subscriptionRepository.updateSubscriptionSettings(
      currentSubscription.id,
      updateData
    );
  }

  async downgradePlan(
    userId: string,
    businessId: string,
    newPlanId: string
  ): Promise<BusinessSubscriptionData> {
    // Check permissions to manage business subscription
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const currentSubscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.subscriptionRepository.findPlanById(newPlanId);
    if (!newPlan || !newPlan.isActive) {
      throw new Error('Invalid or inactive subscription plan');
    }

    // Check if downgrade is valid (validate usage against new plan limits)
    const limits = await this.subscriptionRepository.checkSubscriptionLimits(businessId);
    
    if (newPlan.maxBusinesses !== -1 && limits.usage.currentBusinesses > newPlan.maxBusinesses) {
      throw new Error('Cannot downgrade: too many businesses for new plan');
    }

    if (newPlan.maxStaffPerBusiness !== -1 && limits.usage.currentStaff > newPlan.maxStaffPerBusiness) {
      throw new Error('Cannot downgrade: too many staff members for new plan');
    }

    // Downgrade takes effect at end of current period
    return await this.subscriptionRepository.upgradeSubscription(
      currentSubscription.id,
      newPlanId,
      currentSubscription.currentPeriodEnd
    );
  }

  async cancelSubscription(
    userId: string,
    businessId: string,
    cancelAtPeriodEnd = true
  ): Promise<BusinessSubscriptionData> {
    // Check permissions to manage business subscription
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const subscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    return await this.subscriptionRepository.cancelSubscription(subscription.id, cancelAtPeriodEnd);
  }

  async reactivateSubscription(
    userId: string,
    businessId: string
  ): Promise<BusinessSubscriptionData> {
    // Check permissions to manage business subscription
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const subscriptions = await this.subscriptionRepository.findSubscriptionsByBusinessId(businessId);
    const canceledSubscription = subscriptions.find(sub => 
      sub.status === SubscriptionStatus.CANCELED && sub.cancelAtPeriodEnd
    );

    if (!canceledSubscription) {
      throw new Error('No canceled subscription found to reactivate');
    }

    // Reactivate by removing the cancel flag
    return await this.subscriptionRepository.cancelSubscription(canceledSubscription.id, false);
  }

  async convertTrialToActive(
    userId: string,
    businessId: string,
    paymentMethodId?: string
  ): Promise<BusinessSubscriptionData> {
    // Check permissions to manage business subscription
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const subscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) {
      throw new Error('No active trial subscription found');
    }

    const plan = await this.subscriptionRepository.findPlanById(subscription.planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Calculate new period end based on plan billing interval
    const now = new Date();
    const newPeriodEnd = new Date(now);
    
    if (plan.billingInterval === 'monthly') {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    } else if (plan.billingInterval === 'yearly') {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    }

    const convertedSubscription = await this.subscriptionRepository.convertTrialToActive(
      subscription.id,
      newPeriodEnd
    );

    // Update metadata with payment method
    if (paymentMethodId) {
      await this.subscriptionRepository.updateSubscriptionStatus(
        subscription.id,
        SubscriptionStatus.ACTIVE,
        { ...subscription.metadata, paymentMethodId }
      );
    }

    return convertedSubscription;
  }

  async checkSubscriptionLimits(
    userId: string,
    businessId: string
  ): Promise<{
    hasActiveSubscription: boolean;
    currentPlan?: SubscriptionPlanData;
    limits: {
      maxBusinesses: number;
      maxStaffPerBusiness: number;
    };
    usage: {
      currentBusinesses: number;
      currentStaff: number;
      todaysAppointments: number;
    };
    canCreateBusiness: boolean;
    canAddStaff: boolean;
    canBookAppointment: boolean;
  }> {
    // Business owners can check their own limits, admins can check any
    const [resource, action] = PermissionName.VIEW_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    return await this.subscriptionRepository.checkSubscriptionLimits(businessId);
  }

  // Admin methods
  async getAllSubscriptions(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    subscriptions: BusinessSubscriptionData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SUBSCRIPTIONS);

    // This would need to be implemented in the repository
    throw new Error('getAllSubscriptions not implemented in repository');
  }

  async getSubscriptionStats(
    userId: string
  ): Promise<{
    total: number;
    byStatus: Record<SubscriptionStatus, number>;
    byPlan: Array<{ planName: string; count: number; revenue: number }>;
    monthlyRecurringRevenue: number;
    yearlyRecurringRevenue: number;
  }> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_ANALYTICS);

    return await this.subscriptionRepository.getSubscriptionStats();
  }

  async getTrialsEndingSoon(
    userId: string,
    days = 3
  ): Promise<BusinessSubscriptionData[]> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SUBSCRIPTIONS);

    return await this.subscriptionRepository.findTrialsEndingSoon(days);
  }

  async getExpiredSubscriptions(
    userId: string
  ): Promise<BusinessSubscriptionData[]> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.VIEW_ALL_SUBSCRIPTIONS);

    return await this.subscriptionRepository.findExpiredSubscriptions();
  }

  async forceUpdateSubscriptionStatus(
    userId: string,
    subscriptionId: string,
    status: SubscriptionStatus,
    reason?: string
  ): Promise<BusinessSubscriptionData> {
    // Admin only
    await this.rbacService.requirePermission(userId, PermissionName.MANAGE_ALL_SUBSCRIPTIONS);

    const metadata = reason ? { adminAction: reason, updatedBy: userId } : undefined;
    return await this.subscriptionRepository.updateSubscriptionStatus(subscriptionId, status, metadata);
  }

  // System methods
  async processExpiredSubscriptions(): Promise<{
    processed: number;
    canceled: number;
    pastDue: number;
  }> {
    // System method - no permission check needed
    const expiredSubscriptions = await this.subscriptionRepository.findExpiredSubscriptions();
    let processed = 0;
    let canceled = 0;
    let pastDue = 0;

    for (const subscription of expiredSubscriptions) {
      if (subscription.cancelAtPeriodEnd) {
        await this.subscriptionRepository.updateSubscriptionStatus(
          subscription.id,
          SubscriptionStatus.CANCELED
        );
        canceled++;
      } else {
        await this.subscriptionRepository.updateSubscriptionStatus(
          subscription.id,
          SubscriptionStatus.PAST_DUE
        );
        pastDue++;
      }
      processed++;
    }

    return { processed, canceled, pastDue };
  }

  async processSubscriptionRenewals(): Promise<{
    processed: number;
    renewed: number;
    failed: number;
  }> {
    // System method for handling subscription renewals
    // This would integrate with payment processing systems
    
    const subscriptionsToRenew = await this.subscriptionRepository.findExpiredSubscriptions();
    let processed = 0;
    let renewed = 0;
    let failed = 0;

    for (const subscription of subscriptionsToRenew) {
      try {
        // In a real implementation, this would process payment
        const plan = await this.subscriptionRepository.findPlanById(subscription.planId);
        if (!plan) continue;

        const now = new Date();
        const newPeriodEnd = new Date(now);
        
        if (plan.billingInterval === 'monthly') {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        } else if (plan.billingInterval === 'yearly') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        }

        await this.subscriptionRepository.renewSubscription(
          subscription.id,
          now,
          newPeriodEnd
        );

        renewed++;
      } catch (error) {
        console.error(`Failed to renew subscription ${subscription.id}:`, error);
        failed++;
      }
      processed++;
    }

    return { processed, renewed, failed };
  }

  async sendTrialEndingNotifications(): Promise<number> {
    // System method to send notifications for trials ending soon
    const trialsEndingSoon = await this.subscriptionRepository.findTrialsEndingSoon(3);
    
    // In a real implementation, this would send emails/notifications
    console.log(`Found ${trialsEndingSoon.length} trials ending soon`);
    
    return trialsEndingSoon.length;
  }

  // Utility methods
  async calculateUpgradeProration(
    currentPlanId: string,
    newPlanId: string,
    currentPeriodEnd: Date
  ): Promise<{
    proratedAmount: number;
    creditAmount: number;
    upgradeAmount: number;
  }> {
    const [currentPlan, newPlan] = await Promise.all([
      this.subscriptionRepository.findPlanById(currentPlanId),
      this.subscriptionRepository.findPlanById(newPlanId)
    ]);

    if (!currentPlan || !newPlan) {
      throw new Error('Plans not found');
    }

    const now = new Date();
    const remainingDays = Math.ceil(
      (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const totalDays = currentPlan.billingInterval === 'monthly' ? 30 : 365;
    const unusedRatio = remainingDays / totalDays;

    const creditAmount = currentPlan.price * unusedRatio;
    const upgradeAmount = newPlan.price - creditAmount;

    return {
      proratedAmount: Math.max(0, upgradeAmount),
      creditAmount,
      upgradeAmount: newPlan.price
    };
  }

  async validatePlanLimits(
    businessId: string,
    planId: string
  ): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const plan = await this.subscriptionRepository.findPlanById(planId);
    if (!plan) {
      return { isValid: false, violations: ['Plan not found'] };
    }

    const limits = await this.subscriptionRepository.checkSubscriptionLimits(businessId);
    const violations: string[] = [];

    if (plan.maxBusinesses !== -1 && limits.usage.currentBusinesses > plan.maxBusinesses) {
      violations.push(`Too many businesses (${limits.usage.currentBusinesses}/${plan.maxBusinesses})`);
    }

    if (plan.maxStaffPerBusiness !== -1 && limits.usage.currentStaff > plan.maxStaffPerBusiness) {
      violations.push(`Too many staff members (${limits.usage.currentStaff}/${plan.maxStaffPerBusiness})`);
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  // Auto-renewal management methods
  async updateAutoRenewal(
    userId: string,
    businessId: string,
    autoRenewal: boolean,
    paymentMethodId?: string
  ): Promise<BusinessSubscriptionData> {
    // Check permissions
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const subscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // If enabling auto-renewal, ensure a payment method is provided
    if (autoRenewal && !paymentMethodId && !subscription.paymentMethodId) {
      throw new Error('Payment method required for auto-renewal');
    }

    const updateData: any = {
      autoRenewal,
      updatedAt: new Date()
    };

    if (paymentMethodId) {
      updateData.paymentMethodId = paymentMethodId;
    }

    return await this.subscriptionRepository.updateSubscriptionSettings(
      subscription.id,
      updateData
    );
  }

  async updatePaymentMethod(
    userId: string,
    businessId: string,
    paymentMethodId: string
  ): Promise<BusinessSubscriptionData> {
    // Check permissions
    const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalSubscription) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.MANAGE_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const subscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    return await this.subscriptionRepository.updateSubscriptionSettings(
      subscription.id,
      {
        paymentMethodId,
        updatedAt: new Date()
      }
    );
  }

  async getAutoRenewalStatus(
    userId: string,
    businessId: string
  ): Promise<{
    autoRenewal: boolean;
    nextBillingDate?: Date;
    paymentMethodId?: string;
    paymentMethod?: {
      id: string;
      lastFourDigits: string;
      cardBrand: string;
      expiryMonth: string;
      expiryYear: string;
    };
  }> {
    // Check permissions
    const [resource, action] = PermissionName.VIEW_ALL_SUBSCRIPTIONS.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);
    
    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        userId,
        PermissionName.VIEW_OWN_SUBSCRIPTION,
        { businessId }
      );
    }

    const subscription = await this.subscriptionRepository.findActiveSubscriptionByBusinessId(businessId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const paymentMethod = subscription.paymentMethodId 
      ? await this.subscriptionRepository.getPaymentMethod(subscription.paymentMethodId)
      : null;

    return {
      autoRenewal: subscription.autoRenewal,
      nextBillingDate: subscription.nextBillingDate,
      paymentMethodId: subscription.paymentMethodId,
      paymentMethod: paymentMethod ? {
        id: paymentMethod.id,
        lastFourDigits: paymentMethod.lastFourDigits,
        cardBrand: paymentMethod.cardBrand || '',
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear
      } : undefined
    };
  }

  // Enhanced renewal methods for the scheduler
  async processAutomaticRenewal(subscriptionId: string): Promise<{
    success: boolean;
    paymentId?: string;
    error?: string;
  }> {
    try {
      // Get subscription with plan included
      const subscription = await this.subscriptionRepository.findSubscriptionByIdWithPlan(subscriptionId);
      
      if (!subscription || !subscription.autoRenewal) {
        return { success: false, error: 'Subscription not found or auto-renewal disabled' };
      }

      if (!subscription.paymentMethodId) {
        return { success: false, error: 'No payment method available' };
      }

      // Calculate new period
      const now = new Date();
      const newPeriodEnd = new Date(now);
      
      if (subscription.plan.billingInterval === 'monthly') {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      } else if (subscription.plan.billingInterval === 'yearly') {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      }

      // Process renewal
      await this.subscriptionRepository.renewSubscription(
        subscription.id,
        now,
        newPeriodEnd
      );

      return { success: true };
    } catch (error) {
      console.error('Automatic renewal failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Renewal failed' 
      };
    }
  }

  async getSubscriptionsForRenewal(): Promise<any[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.subscriptionRepository.findSubscriptionsForRenewal(tomorrow);
  }

  // Payment method management for plan changes
  async getStoredPaymentMethods(
    userId: string,
    businessId: string
  ): Promise<{
    success: boolean;
    paymentMethods?: any[];
    error?: string;
  }> {
    try {
      // Check permissions
      const [resource, action] = PermissionName.VIEW_ALL_SUBSCRIPTIONS.split(':');
      const hasGlobalView = await this.rbacService.hasPermission(userId, resource, action);

      if (!hasGlobalView) {
        await this.rbacService.requirePermission(
          userId,
          PermissionName.VIEW_OWN_SUBSCRIPTION,
          { businessId }
        );
      }

      // Get stored payment methods using the payment service
      return await this.paymentService.getStoredPaymentMethods(businessId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment methods'
      };
    }
  }

  async addPaymentMethodForPlanChange(
    userId: string,
    businessId: string,
    cardData: any,
    makeDefault: boolean = false
  ): Promise<{
    success: boolean;
    paymentMethodId?: string;
    error?: string;
  }> {
    try {
      // Check permissions to manage business subscription
      const [resource, action] = PermissionName.MANAGE_ALL_SUBSCRIPTIONS.split(':');
      const hasGlobalSubscription = await this.rbacService.hasPermission(userId, resource, action);

      if (!hasGlobalSubscription) {
        await this.rbacService.requirePermission(
          userId,
          PermissionName.MANAGE_OWN_SUBSCRIPTION,
          { businessId }
        );
      }

      // Store payment method using the payment service
      return await this.paymentService.storePaymentMethod(businessId, cardData, makeDefault);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add payment method'
      };
    }
  }
}