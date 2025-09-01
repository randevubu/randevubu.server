import { PrismaClient } from '@prisma/client';
import {
  SubscriptionPlanData,
  BusinessSubscriptionData,
  SubscriptionStatus,
  StoredPaymentMethodData
} from '../types/business';
import { convertBusinessData, convertBusinessDataArray } from '../utils/prismaTypeHelpers';

export class SubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  // Subscription Plans
  async findAllPlans(): Promise<SubscriptionPlanData[]> {
    const result = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    return convertBusinessDataArray<SubscriptionPlanData>(result as any);
  }

  async findPlanById(id: string): Promise<SubscriptionPlanData | null> {
    const result = await this.prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    return result ? convertBusinessData<SubscriptionPlanData>(result as any) : null;
  }

  async findPlanByName(name: string): Promise<SubscriptionPlanData | null> {
    const result = await this.prisma.subscriptionPlan.findUnique({
      where: { name }
    });
    return result ? convertBusinessData<SubscriptionPlanData>(result as any) : null;
  }

  async findPlansByBillingInterval(interval: string): Promise<SubscriptionPlanData[]> {
    const result = await this.prisma.subscriptionPlan.findMany({
      where: {
        billingInterval: interval,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    });
    return convertBusinessDataArray<SubscriptionPlanData>(result as any);
  }

  // Business Subscriptions
  async createSubscription(data: {
    businessId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialStart?: Date;
    trialEnd?: Date;
    autoRenewal?: boolean;
    paymentMethodId?: string;
    nextBillingDate?: Date;
    failedPaymentCount?: number;
    metadata?: any;
  }): Promise<BusinessSubscriptionData> {
    const result = await this.prisma.businessSubscription.create({
      data: {
        id: `bs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        ...data,
        autoRenewal: data.autoRenewal ?? true,
        failedPaymentCount: data.failedPaymentCount ?? 0,
        cancelAtPeriodEnd: false
      }
    });
    return this.mapToBusinessSubscriptionData(result as any);
  }

  async findSubscriptionById(id: string): Promise<BusinessSubscriptionData | null> {
    const result = await this.prisma.businessSubscription.findUnique({
      where: { id },
      include: {
        plan: true,
        business: true
      }
    });
    return result ? convertBusinessData<BusinessSubscriptionData>(result as any) : null;
  }

  async findSubscriptionByIdWithPlan(id: string): Promise<(BusinessSubscriptionData & { plan: SubscriptionPlanData }) | null> {
    const result = await this.prisma.businessSubscription.findUnique({
      where: { id },
      include: {
        plan: true
      }
    });
    
    if (!result) return null;
    
    return {
      ...this.mapToBusinessSubscriptionData(result),
      plan: this.mapToSubscriptionPlanData(result.plan)
    } as BusinessSubscriptionData & { plan: SubscriptionPlanData };
  }

  async findActiveSubscriptionByBusinessId(businessId: string): Promise<(BusinessSubscriptionData & { plan: SubscriptionPlanData }) | null> {
    const result = await this.prisma.businessSubscription.findFirst({
      where: {
        businessId,
        status: { in: ['ACTIVE', 'TRIAL'] }
      },
      include: {
        plan: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!result) return null;
    
    return {
      ...this.mapToBusinessSubscriptionData(result),
      plan: this.mapToSubscriptionPlanData(result.plan)
    } as BusinessSubscriptionData & { plan: SubscriptionPlanData };
  }

  async findSubscriptionsByBusinessId(businessId: string): Promise<BusinessSubscriptionData[]> {
    const result = await this.prisma.businessSubscription.findMany({
      where: { businessId },
      include: {
        plan: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return convertBusinessDataArray<BusinessSubscriptionData>(result as any);
  }

  async updateSubscriptionStatus(
    id: string, 
    status: SubscriptionStatus,
    metadata?: any
  ): Promise<BusinessSubscriptionData> {
    const updateData: any = { status };
    
    if (metadata) {
      updateData.metadata = metadata;
    }

    if (status === SubscriptionStatus.CANCELED) {
      updateData.canceledAt = new Date();
    }

    const result = await this.prisma.businessSubscription.update({
      where: { id },
      data: updateData
    });
    return convertBusinessData<BusinessSubscriptionData>(result as any);
  }

  async cancelSubscription(id: string, cancelAtPeriodEnd = true): Promise<BusinessSubscriptionData> {
    const updateData: any = {
      cancelAtPeriodEnd
    };

    if (!cancelAtPeriodEnd) {
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.canceledAt = new Date();
    }

    const result = await this.prisma.businessSubscription.update({
      where: { id },
      data: updateData
    });
    return convertBusinessData<BusinessSubscriptionData>(result as any);
  }

  async renewSubscription(
    id: string,
    newPeriodStart: Date,
    newPeriodEnd: Date
  ): Promise<BusinessSubscriptionData> {
    const result = await this.prisma.businessSubscription.update({
      where: { id },
      data: {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false
      }
    });
    return convertBusinessData<BusinessSubscriptionData>(result as any);
  }

  async upgradeSubscription(
    id: string,
    newPlanId: string,
    newPeriodEnd: Date
  ): Promise<BusinessSubscriptionData> {
    const result = await this.prisma.businessSubscription.update({
      where: { id },
      data: {
        planId: newPlanId,
        currentPeriodEnd: newPeriodEnd,
        status: SubscriptionStatus.ACTIVE
      }
    });
    return convertBusinessData<BusinessSubscriptionData>(result as any);
  }

  async startTrial(
    businessId: string,
    planId: string,
    trialDays = 14
  ): Promise<BusinessSubscriptionData> {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.businessSubscription.create({
      data: {
        id: `bs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId,
        planId,
        status: SubscriptionStatus.TRIAL,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd: trialEnd,
        cancelAtPeriodEnd: false
      }
    });
    return convertBusinessData<BusinessSubscriptionData>(result as any);
  }

  async convertTrialToActive(
    id: string,
    newPeriodEnd: Date
  ): Promise<BusinessSubscriptionData> {
    const result = await this.prisma.businessSubscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: newPeriodEnd
      }
    });
    return convertBusinessData<BusinessSubscriptionData>(result as any);
  }

  async findExpiredSubscriptions(): Promise<BusinessSubscriptionData[]> {
    const now = new Date();
    
    const result = await this.prisma.businessSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        currentPeriodEnd: { lte: now }
      },
      include: {
        plan: true,
        business: true
      }
    });
    return convertBusinessDataArray<BusinessSubscriptionData>(result as any);
  }

  async findTrialsEndingSoon(days = 3): Promise<BusinessSubscriptionData[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    const result = await this.prisma.businessSubscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: { lte: cutoffDate }
      },
      include: {
        plan: true,
        business: true
      }
    });
    return convertBusinessDataArray<BusinessSubscriptionData>(result as any);
  }

  async findSubscriptionsToCancel(): Promise<BusinessSubscriptionData[]> {
    const now = new Date();
    
    const result = await this.prisma.businessSubscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: { not: SubscriptionStatus.CANCELED }
      },
      include: {
        plan: true,
        business: true
      }
    });
    return convertBusinessDataArray<BusinessSubscriptionData>(result as any);
  }

  async getSubscriptionStats(): Promise<{
    total: number;
    byStatus: Record<SubscriptionStatus, number>;
    byPlan: Array<{ planName: string; count: number; revenue: number }>;
    monthlyRecurringRevenue: number;
    yearlyRecurringRevenue: number;
  }> {
    const subscriptions = await this.prisma.businessSubscription.findMany({
      include: {
        plan: true
      }
    });

    const total = subscriptions.length;
    
    const byStatus = subscriptions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {} as Record<SubscriptionStatus, number>);

    const planStats = new Map<string, { count: number; revenue: number }>();
    let monthlyRecurringRevenue = 0;
    let yearlyRecurringRevenue = 0;

    subscriptions.forEach(sub => {
      if (sub.status === SubscriptionStatus.ACTIVE) {
        const planKey = sub.plan.name;
        const existing = planStats.get(planKey) || { count: 0, revenue: 0 };
        
        existing.count++;
        existing.revenue += (sub.plan.price as any);
        planStats.set(planKey, existing);

        // Calculate recurring revenue
        if (sub.plan.billingInterval === 'monthly') {
          monthlyRecurringRevenue += (sub.plan.price as any);
          yearlyRecurringRevenue += (sub.plan.price as any) * 12;
        } else if (sub.plan.billingInterval === 'yearly') {
          yearlyRecurringRevenue += (sub.plan.price as any);
          monthlyRecurringRevenue += (sub.plan.price as any) / 12;
        }
      }
    });

    const byPlan = Array.from(planStats.entries()).map(([planName, stats]) => ({
      planName,
      count: stats.count,
      revenue: stats.revenue
    }));

    return {
      total,
      byStatus,
      byPlan,
      monthlyRecurringRevenue,
      yearlyRecurringRevenue
    };
  }

  async checkSubscriptionLimits(businessId: string): Promise<{
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
    const subscription = await this.findActiveSubscriptionByBusinessId(businessId);
    
    if (!subscription) {
      return {
        hasActiveSubscription: false,
        limits: {
          maxBusinesses: 0,
          maxStaffPerBusiness: 0,
          maxAppointmentsPerDay: 0
        },
        usage: {
          currentBusinesses: 0,
          currentStaff: 0,
          todaysAppointments: 0
        },
        canCreateBusiness: false,
        canAddStaff: false,
        canBookAppointment: false
      };
    }

    const plan = subscription.plan;
    const business = await this.prisma.business.findUnique({
      where: { id: businessId }
    });

    // Get current usage
    const [businessCount, staffCount, todaysAppointments] = await Promise.all([
      this.prisma.business.count({
        where: { ownerId: business?.ownerId }
      }),
      this.prisma.businessStaff.count({
        where: { businessId, isActive: true }
      }),
      this.prisma.appointment.count({
        where: {
          businessId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      })
    ]);

    const limits = {
      maxBusinesses: plan.maxBusinesses,
      maxStaffPerBusiness: plan.maxStaffPerBusiness,
      maxAppointmentsPerDay: plan.maxAppointmentsPerDay
    };

    const usage = {
      currentBusinesses: businessCount,
      currentStaff: staffCount,
      todaysAppointments
    };

    const canCreateBusiness = plan.maxBusinesses === -1 || businessCount < plan.maxBusinesses;
    const canAddStaff = plan.maxStaffPerBusiness === -1 || staffCount < plan.maxStaffPerBusiness;
    const canBookAppointment = plan.maxAppointmentsPerDay === -1 || todaysAppointments < plan.maxAppointmentsPerDay;

    return {
      hasActiveSubscription: true,
      currentPlan: plan,
      limits,
      usage,
      canCreateBusiness,
      canAddStaff,
      canBookAppointment
    };
  }

  async processExpiredSubscriptions(): Promise<number> {
    const expiredSubscriptions = await this.findExpiredSubscriptions();
    
    let processedCount = 0;
    
    for (const subscription of expiredSubscriptions) {
      if (subscription.cancelAtPeriodEnd) {
        await this.updateSubscriptionStatus(subscription.id, SubscriptionStatus.CANCELED);
      } else {
        await this.updateSubscriptionStatus(subscription.id, SubscriptionStatus.PAST_DUE);
      }
      processedCount++;
    }

    return processedCount;
  }

  // Auto-renewal methods
  async updateSubscriptionSettings(
    subscriptionId: string,
    settings: {
      autoRenewal?: boolean;
      paymentMethodId?: string;
      nextBillingDate?: Date;
      failedPaymentCount?: number;
      updatedAt?: Date;
    }
  ): Promise<BusinessSubscriptionData> {
    const subscription = await this.prisma.businessSubscription.update({
      where: { id: subscriptionId },
      data: settings
    });

    return this.mapToBusinessSubscriptionData(subscription);
  }



  async getPaymentMethod(paymentMethodId: string): Promise<StoredPaymentMethodData | null> {
    const paymentMethod = await this.prisma.storedPaymentMethod.findUnique({
      where: { id: paymentMethodId, isActive: true }
    });

    if (!paymentMethod) return null;

    return {
      id: paymentMethod.id,
      businessId: paymentMethod.businessId,
      cardHolderName: paymentMethod.cardHolderName,
      lastFourDigits: paymentMethod.lastFourDigits,
      cardBrand: paymentMethod.cardBrand || undefined,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      isDefault: paymentMethod.isDefault,
      isActive: paymentMethod.isActive,
      providerToken: paymentMethod.providerToken || undefined,
      providerCardId: paymentMethod.providerCardId || undefined,
      metadata: paymentMethod.metadata || undefined,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
      deletedAt: paymentMethod.deletedAt || undefined
    };
  }

  async findSubscriptionsForRenewal(beforeDate: Date): Promise<BusinessSubscriptionData[]> {
    const subscriptions = await this.prisma.businessSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenewal: true,
        currentPeriodEnd: {
          lte: beforeDate
        },
        cancelAtPeriodEnd: false
      },
      include: {
        plan: true,
        paymentMethod: true,
        business: {
          include: {
            owner: true
          }
        }
      }
    });

    return subscriptions.map(subscription => ({
      ...this.mapToBusinessSubscriptionData(subscription),
      plan: this.mapToSubscriptionPlanData(subscription.plan),
      paymentMethod: subscription.paymentMethod,
      business: subscription.business
    })) as BusinessSubscriptionData[];
  }

  private mapToBusinessSubscriptionData(subscription: any): BusinessSubscriptionData {
    return {
      id: subscription.id,
      businessId: subscription.businessId,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      autoRenewal: subscription.autoRenewal ?? true,
      paymentMethodId: subscription.paymentMethodId,
      nextBillingDate: subscription.nextBillingDate,
      failedPaymentCount: subscription.failedPaymentCount ?? 0,
      metadata: subscription.metadata,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt
    };
  }

  private mapToSubscriptionPlanData(plan: any): SubscriptionPlanData {
    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      maxBusinesses: plan.maxBusinesses,
      maxStaffPerBusiness: plan.maxStaffPerBusiness,
      maxAppointmentsPerDay: plan.maxAppointmentsPerDay,
      features: plan.features,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };
  }
}