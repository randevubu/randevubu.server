import { PrismaClient } from '@prisma/client';

export interface UsageMetrics {
  businessId: string;
  month: number;
  year: number;
  smssSent: number;
  appointmentsCreated: number;
  staffMembersActive: number;
  customersAdded: number;
  servicesActive: number;
  storageUsedMB: number;
  apiCallsCount: number;
  lastUpdatedAt: Date;
}

export interface DailyUsageMetrics {
  businessId: string;
  date: Date;
  smsCount: number;
}

export interface UsageSummary {
  currentMonth: UsageMetrics | null;
  previousMonth: UsageMetrics | null;
  yearToDate: {
    smssSent: number;
    appointmentsCreated: number;
    customersAdded: number;
  };
  planLimits: {
    smsQuota: number;
    maxStaffPerBusiness: number;
    maxCustomers: number;
    maxServices: number;
    storageGB: number;
  };
  remainingQuotas: {
    smsRemaining: number;
    staffSlotsRemaining: number;
    customerSlotsRemaining: number;
    serviceSlotsRemaining: number;
    storageRemaining: number;
  };
}

export class UsageRepository {
  constructor(private prisma: PrismaClient) {}

  private extractPlanFeatureLimits(features: unknown): {
    smsQuota?: number;
    maxCustomers?: number;
    maxServices?: number;
    storageGB?: number;
  } {
    if (features && typeof features === 'object' && !Array.isArray(features)) {
      return features as {
        smsQuota?: number;
        maxCustomers?: number;
        maxServices?: number;
        storageGB?: number;
      };
    }
    return {};
  }

  async getOrCreateMonthlyUsage(businessId: string, month: number, year: number): Promise<UsageMetrics> {
    const existing = await this.prisma.businessUsage.findUnique({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      }
    });

    if (existing) {
      return {
        businessId: existing.businessId,
        month: existing.month,
        year: existing.year,
        smssSent: existing.smssSent,
        appointmentsCreated: existing.appointmentsCreated,
        staffMembersActive: existing.staffMembersActive,
        customersAdded: existing.customersAdded,
        servicesActive: existing.servicesActive,
        storageUsedMB: existing.storageUsedMB,
        apiCallsCount: existing.apiCallsCount,
        lastUpdatedAt: existing.lastUpdatedAt
      };
    }

    const created = await this.prisma.businessUsage.create({
      data: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        smssSent: 0,
        appointmentsCreated: 0,
        staffMembersActive: 0,
        customersAdded: 0,
        servicesActive: 0,
        storageUsedMB: 0,
        apiCallsCount: 0
      }
    });

    return {
      businessId: created.businessId,
      month: created.month,
      year: created.year,
      smssSent: created.smssSent,
      appointmentsCreated: created.appointmentsCreated,
      staffMembersActive: created.staffMembersActive,
      customersAdded: created.customersAdded,
      servicesActive: created.servicesActive,
      storageUsedMB: created.storageUsedMB,
      apiCallsCount: created.apiCallsCount,
      lastUpdatedAt: created.lastUpdatedAt
    };
  }

  async incrementSmsUsage(businessId: string, count: number = 1): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Update monthly usage
    await this.prisma.businessUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      },
      update: {
        smssSent: {
          increment: count
        }
      },
      create: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        smssSent: count
      }
    });

    // Update daily usage
    await this.prisma.dailySmsUsage.upsert({
      where: {
        businessId_date: {
          businessId,
          date: today
        }
      },
      update: {
        smsCount: {
          increment: count
        }
      },
      create: {
        id: `sms_${businessId}_${today.toISOString().split('T')[0].replace(/-/g, '')}`,
        businessId,
        date: today,
        smsCount: count
      }
    });
  }

  async incrementAppointmentUsage(businessId: string, count: number = 1): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await this.prisma.businessUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      },
      update: {
        appointmentsCreated: {
          increment: count
        }
      },
      create: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        appointmentsCreated: count
      }
    });
  }

  async updateActiveStaffCount(businessId: string): Promise<void> {
    const activeStaffCount = await this.prisma.businessStaff.count({
      where: {
        businessId,
        isActive: true
      }
    });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await this.prisma.businessUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      },
      update: {
        staffMembersActive: activeStaffCount
      },
      create: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        staffMembersActive: activeStaffCount
      }
    });
  }

  async getUsageSummary(businessId: string): Promise<UsageSummary | null> {
    // Get business subscription to determine plan limits
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!business || !business.subscription || !business.subscription.plan) {
      return null;
    }

    const planFeatures = this.extractPlanFeatureLimits(business.subscription.plan.features);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Get current month usage
    const currentMonthUsage = await this.prisma.businessUsage.findUnique({
      where: {
        businessId_month_year: {
          businessId,
          month: currentMonth,
          year: currentYear
        }
      }
    });

    // Get previous month usage
    const previousMonthUsage = await this.prisma.businessUsage.findUnique({
      where: {
        businessId_month_year: {
          businessId,
          month: previousMonth,
          year: previousYear
        }
      }
    });

    // Get year-to-date totals
    const yearToDateAgg = await this.prisma.businessUsage.aggregate({
      where: {
        businessId,
        year: currentYear
      },
      _sum: {
        smssSent: true,
        appointmentsCreated: true,
        customersAdded: true
      }
    });

    const planLimits = {
      smsQuota: Number(planFeatures.smsQuota) || 0,
      maxStaffPerBusiness: business.subscription.plan.maxStaffPerBusiness,
      maxCustomers: Number(planFeatures.maxCustomers) || 0,
      maxServices: Number(planFeatures.maxServices) || 0,
      storageGB: Number(planFeatures.storageGB) || 0
    };

    const currentUsage = currentMonthUsage ? {
      businessId: currentMonthUsage.businessId,
      month: currentMonthUsage.month,
      year: currentMonthUsage.year,
      smssSent: currentMonthUsage.smssSent,
      appointmentsCreated: currentMonthUsage.appointmentsCreated,
      staffMembersActive: currentMonthUsage.staffMembersActive,
      customersAdded: currentMonthUsage.customersAdded,
      servicesActive: currentMonthUsage.servicesActive,
      storageUsedMB: currentMonthUsage.storageUsedMB,
      apiCallsCount: currentMonthUsage.apiCallsCount,
      lastUpdatedAt: currentMonthUsage.lastUpdatedAt
    } : null;

    const previousUsage = previousMonthUsage ? {
      businessId: previousMonthUsage.businessId,
      month: previousMonthUsage.month,
      year: previousMonthUsage.year,
      smssSent: previousMonthUsage.smssSent,
      appointmentsCreated: previousMonthUsage.appointmentsCreated,
      staffMembersActive: previousMonthUsage.staffMembersActive,
      customersAdded: previousMonthUsage.customersAdded,
      servicesActive: previousMonthUsage.servicesActive,
      storageUsedMB: previousMonthUsage.storageUsedMB,
      apiCallsCount: previousMonthUsage.apiCallsCount,
      lastUpdatedAt: previousMonthUsage.lastUpdatedAt
    } : null;

    return {
      currentMonth: currentUsage,
      previousMonth: previousUsage,
      yearToDate: {
        smssSent: yearToDateAgg._sum.smssSent || 0,
        appointmentsCreated: yearToDateAgg._sum.appointmentsCreated || 0,
        customersAdded: yearToDateAgg._sum.customersAdded || 0
      },
      planLimits,
      remainingQuotas: {
        smsRemaining: Math.max(0, planLimits.smsQuota - (currentUsage?.smssSent || 0)),
        staffSlotsRemaining: Math.max(0, planLimits.maxStaffPerBusiness - (currentUsage?.staffMembersActive || 0)),
        customerSlotsRemaining: Math.max(0, planLimits.maxCustomers - (currentUsage?.customersAdded || 0)),
        serviceSlotsRemaining: Math.max(0, planLimits.maxServices - (currentUsage?.servicesActive || 0)),
        storageRemaining: Math.max(0, (planLimits.storageGB * 1024) - (currentUsage?.storageUsedMB || 0))
      }
    };
  }

  async getDailySmsUsage(businessId: string, days: number = 30): Promise<DailyUsageMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const usage = await this.prisma.dailySmsUsage.findMany({
      where: {
        businessId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return usage.map(u => ({
      businessId: u.businessId,
      date: u.date,
      smsCount: u.smsCount
    }));
  }

  async getMonthlyUsageHistory(businessId: string, months: number = 12): Promise<UsageMetrics[]> {
    const endDate = new Date();
    const startYear = months > 12 ? endDate.getFullYear() - Math.floor(months / 12) : endDate.getFullYear();
    const startMonth = months > 12 ? endDate.getMonth() + 1 : Math.max(1, endDate.getMonth() + 1 - months);

    const usage = await this.prisma.businessUsage.findMany({
      where: {
        businessId,
        OR: [
          {
            year: {
              gt: startYear
            }
          },
          {
            year: startYear,
            month: {
              gte: startMonth
            }
          }
        ]
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    return usage.map(u => ({
      businessId: u.businessId,
      month: u.month,
      year: u.year,
      smssSent: u.smssSent,
      appointmentsCreated: u.appointmentsCreated,
      staffMembersActive: u.staffMembersActive,
      customersAdded: u.customersAdded,
      servicesActive: u.servicesActive,
      storageUsedMB: u.storageUsedMB,
      apiCallsCount: u.apiCallsCount,
      lastUpdatedAt: u.lastUpdatedAt
    }));
  }

  async upsertBusinessUsage(businessId: string): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    await this.prisma.businessUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      },
      create: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        servicesActive: 0,
        appointmentsCreated: 0,
        staffMembersActive: 0,
        customersAdded: 0,
        lastUpdatedAt: new Date()
      },
      update: {
        lastUpdatedAt: new Date()
      }
    });
  }

  async recordCustomerUsage(businessId: string, count: number = 1): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await this.prisma.businessUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      },
      update: {
        customersAdded: {
          increment: count
        }
      },
      create: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        customersAdded: count
      }
    });
  }

  async updateServiceUsage(businessId: string): Promise<void> {
    const activeServiceCount = await this.prisma.service.count({
      where: {
        businessId,
        isActive: true
      }
    });
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    await this.prisma.businessUsage.upsert({
      where: {
        businessId_month_year: {
          businessId,
          month,
          year
        }
      },
      update: {
        servicesActive: activeServiceCount
      },
      create: {
        id: `usage_${businessId}_${year}${month.toString().padStart(2, '0')}`,
        businessId,
        month,
        year,
        servicesActive: activeServiceCount
      }
    });
  }
}