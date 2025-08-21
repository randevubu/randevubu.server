import {
  SubscriptionPlanData,
  BusinessSubscriptionData,
  SubscriptionStatus,
  SubscribeBusinessRequest
} from '../types/business';
import { SubscriptionRepository } from '../repositories/subscriptionRepository';
import { RBACService } from './rbacService';
import { PermissionName } from '../types/auth';

export class SubscriptionService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private rbacService: RBACService
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
    data: SubscribeBusinessRequest
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
      maxAppointmentsPerDay: number;
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
}