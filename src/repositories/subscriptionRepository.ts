import { PrismaClient, BusinessSubscription, SubscriptionPlan, Prisma } from '@prisma/client';
import {
  SubscriptionPlanData,
  BusinessSubscriptionData,
  SubscriptionStatus,
  StoredPaymentMethodData
} from '../types/business';
// prismaTypeHelpers no longer needed due to global normalization middleware

export class SubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  // Subscription Plans
  async findAllPlans(): Promise<SubscriptionPlanData[]> {
    const result = await this.prisma.subscriptionPlan.findMany({
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
        features: true,
        maxAppointmentsPerDay: true,
        isActive: true,
        isPopular: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return result.map(plan => this.mapToSubscriptionPlanData(plan));
  }

  async findPlanById(id: string): Promise<SubscriptionPlanData | null> {
    const result = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
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
        features: true,
        maxAppointmentsPerDay: true,
        isActive: true,
        isPopular: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return result ? this.mapToSubscriptionPlanData(result) : null;
  }

  async findPlanByName(name: string): Promise<SubscriptionPlanData | null> {
    const result = await this.prisma.subscriptionPlan.findUnique({
      where: { name }
    });
    return result ? this.mapToSubscriptionPlanData(result) : null;
  }

  async findPlansByBillingInterval(interval: string): Promise<SubscriptionPlanData[]> {
    const result = await this.prisma.subscriptionPlan.findMany({
      where: {
        billingInterval: interval,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    });
    return result.map(plan => this.mapToSubscriptionPlanData(plan));
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
    metadata?: Record<string, unknown>;
  }): Promise<BusinessSubscriptionData> {
    const result = await this.prisma.businessSubscription.create({
      data: {
        id: `bs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        ...data,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        autoRenewal: data.autoRenewal ?? true,
        failedPaymentCount: data.failedPaymentCount ?? 0,
        cancelAtPeriodEnd: false
      }
    });
    return this.mapToBusinessSubscriptionData(result);
  }

  async findSubscriptionById(id: string): Promise<BusinessSubscriptionData | null> {
    const result = await this.prisma.businessSubscription.findUnique({
      where: { id },
      // no includes; mapped via helper
    });
    return result ? this.mapToBusinessSubscriptionData(result as BusinessSubscription) : null;
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
      orderBy: { createdAt: 'desc' }
    });
    return result.map(sub => this.mapToBusinessSubscriptionData(sub as BusinessSubscription));
  }

  async findActiveByOwnerId(ownerId: string): Promise<BusinessSubscriptionData[]> {
    const result = await this.prisma.businessSubscription.findMany({
      where: {
        business: {
          ownerId: ownerId,
          deletedAt: null,
        },
        status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
      },
      select: {
        id: true,
        businessId: true,
        planId: true,
        status: true,
        currentPeriodEnd: true,
        nextBillingDate: true,
        createdAt: true,
        updatedAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            billingInterval: true,
            features: true,
            isActive: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return result.map(sub => ({
      id: sub.id,
      businessId: sub.businessId,
      planId: sub.planId,
      status: sub.status as SubscriptionStatus,
      currentPeriodStart: sub.currentPeriodEnd, // minimal in this projection
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialStart: null,
      trialEnd: null,
      autoRenewal: true,
      paymentMethodId: null,
      nextBillingDate: sub.nextBillingDate ?? null,
      failedPaymentCount: 0,
      metadata: undefined,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    } as BusinessSubscriptionData));
  }


  async createOrUpdateSubscription(data: {
    businessId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    metadata?: Record<string, unknown>;
  }): Promise<BusinessSubscriptionData> {
    const subscription = await this.prisma.businessSubscription.upsert({
      where: { businessId: data.businessId },
      create: {
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        businessId: data.businessId,
        planId: data.planId,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        planId: data.planId,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: new Date()
      }
    });
    return this.mapToBusinessSubscriptionData(subscription);
  }

  async findByBusinessId(businessId: string): Promise<BusinessSubscriptionData | null> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId }
    });
    return subscription ? this.mapToBusinessSubscriptionData(subscription as BusinessSubscription) : null;
  }

  async findByBusinessIdWithDetails(businessId: string): Promise<(BusinessSubscriptionData & { plan?: SubscriptionPlanData }) | null> {
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
    return subscription
      ? {
          ...this.mapToBusinessSubscriptionData(subscription),
          plan: subscription.plan ? this.mapToSubscriptionPlanData(subscription.plan) : undefined
        }
      : null;
  }

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
    metadata?: Record<string, unknown>
  ): Promise<BusinessSubscriptionData> {
    const updateData: {
      status: SubscriptionStatus;
      metadata?: Prisma.InputJsonValue;
      canceledAt?: Date;
    } = {
      status
    };

    if (metadata) {
      updateData.metadata = metadata as Prisma.InputJsonValue;
    }

    if (status === SubscriptionStatus.CANCELED) {
      updateData.canceledAt = new Date();
    }

    const result = await this.prisma.businessSubscription.update({
      where: { id },
      data: updateData
    });
    return this.mapToBusinessSubscriptionData(result);
  }

  async cancelSubscription(id: string, cancelAtPeriodEnd = true): Promise<BusinessSubscriptionData> {
    const updateData: {
      cancelAtPeriodEnd: boolean;
      status?: SubscriptionStatus;
      canceledAt?: Date;
    } = {
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
    return this.mapToBusinessSubscriptionData(result);
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
    return result as BusinessSubscriptionData;
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
    return result as BusinessSubscriptionData;
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
    return result as BusinessSubscriptionData;
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
    return result as BusinessSubscriptionData;
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
    return result.map(sub => this.mapToBusinessSubscriptionData(sub));
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
    return result.map(sub => this.mapToBusinessSubscriptionData(sub));
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
    return result.map(sub => this.mapToBusinessSubscriptionData(sub));
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
        existing.revenue += Number(sub.plan.price);
        planStats.set(planKey, existing);

        // Calculate recurring revenue
        if (sub.plan.billingInterval === 'monthly') {
          monthlyRecurringRevenue += Number(sub.plan.price);
          yearlyRecurringRevenue += Number(sub.plan.price) * 12;
        } else if (sub.plan.billingInterval === 'yearly') {
          yearlyRecurringRevenue += Number(sub.plan.price);
          monthlyRecurringRevenue += Number(sub.plan.price) / 12;
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
          maxStaffPerBusiness: 0
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
      maxStaffPerBusiness: plan.maxStaffPerBusiness
    };

    const usage = {
      currentBusinesses: businessCount,
      currentStaff: staffCount,
      todaysAppointments
    };

    const canCreateBusiness = plan.maxBusinesses === -1 || businessCount < plan.maxBusinesses;
    const canAddStaff = plan.maxStaffPerBusiness === -1 || staffCount < plan.maxStaffPerBusiness;
    const canBookAppointment = true; // No appointment limits

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

  private mapToBusinessSubscriptionData(subscription: BusinessSubscription): BusinessSubscriptionData {
    return {
      id: subscription.id,
      businessId: subscription.businessId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt ?? null,
      trialStart: subscription.trialStart ?? null,
      trialEnd: subscription.trialEnd ?? null,
      autoRenewal: subscription.autoRenewal ?? true,
      paymentMethodId: subscription.paymentMethodId ?? null,
      nextBillingDate: subscription.nextBillingDate ?? null,
      failedPaymentCount: subscription.failedPaymentCount ?? 0,
      metadata: subscription.metadata ?? undefined,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt
    };
  }

  private mapToSubscriptionPlanData(plan: SubscriptionPlan): SubscriptionPlanData {
    // Check if this is the expensive plan (Pro Paket) that should show custom pricing
    const isExpensivePlan = plan.name === 'pro' || plan.sortOrder === 3;
    
    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description ?? undefined,
      price: Number(plan.price),
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      maxBusinesses: plan.maxBusinesses,
      maxStaffPerBusiness: plan.maxStaffPerBusiness,
      features: plan.features as string[],
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      // Add custom pricing fields for expensive plan
      isCustomPricing: isExpensivePlan,
      customPriceDisplay: isExpensivePlan ? 'CUSTOM' : undefined
    };
  }

  /**
   * Find business by ID
   */
  async findBusinessById(businessId: string): Promise<{ businessHours: any } | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { businessHours: true }
    });
    return business;
  }

  /**
   * Update business hours
   */
  async updateBusinessHours(businessId: string, businessHours: any): Promise<void> {
    await this.prisma.business.update({
      where: { id: businessId },
      data: { businessHours: businessHours as Prisma.InputJsonValue }
    });
  }
}