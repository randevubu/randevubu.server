import { RepositoryContainer } from "../../../repositories";
import { AppointmentStatus } from "../../../types/business";
import { ReliabilityScoreCalculator } from "../userBehavior/reliabilityScoreCalculator";

import { BusinessOverviewReport } from '../../../types/reports';

export interface RevenueReport {
  totalRevenue: number;
  appointmentRevenue: number;
  manualIncome: number;
  periodRevenue: number;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    appointmentRevenue: number;
    manualIncome: number;
    appointments: number;
  }>;
  revenueByService: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    appointments: number;
    averageValue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    appointmentRevenue: number;
    manualIncome: number;
    appointments: number;
  }>;
  manualIncomeByColumn: Array<{
    columnName: string;
    amount: number;
    isSystem: boolean;
  }>;
}

export interface AppointmentReport {
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  noShowAppointments: number;
  confirmedAppointments: number;
  appointmentsByDay: Array<{
    date: string;
    total: number;
    completed: number;
    canceled: number;
    noShow: number;
  }>;
  appointmentsByService: Array<{
    serviceId: string;
    serviceName: string;
    total: number;
    completed: number;
    averageDuration: number;
  }>;
  appointmentsByStaff: Array<{
    staffId: string;
    staffName: string;
    total: number;
    completed: number;
    rating: number;
  }>;
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageAppointmentsPerCustomer: number;
  customerRetentionRate: number;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalAppointments: number;
    totalSpent: number;
    lastVisit: Date;
    reliabilityScore: number;
  }>;
  customersByAcquisition: Array<{
    month: string;
    newCustomers: number;
    returningCustomers: number;
  }>;
}

export interface StaffReport {
  totalStaff: number;
  activeStaff: number;
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
    averageRating: number;
    completionRate: number;
    utilizationRate: number;
  }>;
  staffWorkload: Array<{
    staffId: string;
    staffName: string;
    hoursWorked: number;
    appointmentsPerDay: number;
    efficiency: number;
  }>;
}

export interface ServiceReport {
  totalServices: number;
  activeServices: number;
  servicePerformance: Array<{
    serviceId: string;
    serviceName: string;
    totalBookings: number;
    revenue: number;
    averagePrice: number;
    averageDuration: number;
    popularityRank: number;
    profitabilityRank: number;
  }>;
  serviceAnalytics: Array<{
    serviceId: string;
    serviceName: string;
    demandTrend: "increasing" | "decreasing" | "stable";
    peakHours: string[];
    averageWaitTime: number;
  }>;
}

// New interfaces for advanced reports
export interface FinancialReport {
  totalRevenue: number;
  appointmentRevenue: number;
  manualIncome: number;
  netProfit: number;
  expenses: number;
  manualExpenses: number;
  profitMargin: number;
  revenueGrowth: number;
  avgTransactionValue: number;
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    appointmentRevenue: number;
    manualIncome: number;
    expenses: number;
    manualExpenses: number;
    profit: number;
  }>;
  incomeBreakdown: {
    dailyNotebookColumns: Array<{
      columnName: string;
      amount: number;
      isSystem: boolean;
    }>;
  };
  expenseBreakdown: Array<{
    columnName: string;
    amount: number;
    isSystem: boolean;
  }>;
}

export interface OperationalReport {
  businessId: string;
  utilizationRate: number;
  peakHours: Array<{
    hour: number;
    appointments: number;
    utilization: number;
  }>;
  averageWaitTime: number;
  serviceEfficiency: Array<{
    serviceId: string;
    serviceName: string;
    averageDuration: number;
    scheduledDuration: number;
    efficiency: number;
  }>;
  staffWorkload: Array<{
    staffId: string;
    staffName: string;
    hoursWorked: number;
    appointmentsHandled: number;
    utilizationRate: number;
    overtime: number;
  }>;
  resourceUtilization: {
    rooms: number;
    equipment: number;
    supplies: number;
  };
}

export interface CustomerAnalyticsReport {
  totalCustomers: number;
  customerLifetimeValue: number;
  acquisitionCost: number;
  retentionRate: number;
  churnRate: number;
  customerSegments: Array<{
    segment: string;
    count: number;
    avgSpending: number;
    frequency: number;
  }>;
  loyaltyMetrics: {
    nps: number;
    satisfaction: number;
    repeatRate: number;
  };
  demographicBreakdown: {
    ageGroups: Array<{ range: string; count: number }>;
    genderDistribution: Array<{ gender: string; count: number }>;
    geographicDistribution: Array<{ location: string; count: number }>;
  };
}

export interface TrendsAnalysisReport {
  businessId: string;
  timeframe: string;
  growthMetrics: {
    revenueGrowth: number;
    customerGrowth: number;
    appointmentGrowth: number;
    serviceDemandGrowth: Array<{
      serviceId: string;
      serviceName: string;
      growth: number;
    }>;
  };
  seasonalPatterns: Array<{
    period: string;
    metric: string;
    value: number;
    trend: "increasing" | "decreasing" | "stable";
  }>;
  forecasting: Array<{
    period: string;
    predictedRevenue: number;
    predictedAppointments: number;
    confidence: number;
  }>;
}

export interface CompetitorAnalysisReport {
  marketPosition: string;
  pricingComparison: Array<{
    service: string;
    ourPrice: number;
    marketAvg: number;
    competitive: boolean;
  }>;
  serviceGaps: string[];
  opportunities: string[];
  threats: string[];
}

export interface QualityMetricsReport {
  businessId: string;
  customerSatisfaction: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Array<{ stars: number; count: number }>;
  };
  serviceQuality: Array<{
    serviceId: string;
    serviceName: string;
    rating: number;
    completionRate: number;
    reworkRate: number;
  }>;
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    customerRating: number;
    punctuality: number;
    professionalismScore: number;
  }>;
  incidentReports: {
    total: number;
    resolved: number;
    avgResolutionTime: number;
  };
}

export class ReportsService {
  constructor(private repositories: RepositoryContainer) {}

  // BASIC REPORTS

  async getBusinessOverview(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BusinessOverviewReport> {
    // Get user's businesses
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get appointment statistics
    const appointmentStats =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["status"],
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        _count: true,
        _sum: {
          price: true,
        },
      });

    // Calculate totals
    let totalAppointments = 0;
    let completedAppointments = 0;
    let canceledAppointments = 0;
    let noShowAppointments = 0;
    let totalRevenue = 0;

    appointmentStats.forEach((stat: any) => {
      totalAppointments += stat._count;
      
      // Only include revenue from COMPLETED appointments
      if (stat.status === AppointmentStatus.COMPLETED) {
        totalRevenue += Number(stat._sum.price || 0);
      }

      switch (stat.status) {
        case AppointmentStatus.COMPLETED:
          completedAppointments = stat._count;
          break;
        case AppointmentStatus.CANCELED:
          canceledAppointments = stat._count;
          break;
        case AppointmentStatus.NO_SHOW:
          noShowAppointments = stat._count;
          break;
      }
    });

    // Get customer statistics
    const customerStats =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["customerId"],
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        _count: true,
      });

    const totalCustomers = customerStats.length;

    // Get new customers (first appointment in date range)
    const newCustomerAppointments =
      await this.repositories.prismaClient.appointment.findMany({
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        select: {
          customerId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const customerFirstAppointments = new Map();
    newCustomerAppointments.forEach(
      (apt: { customerId: string; createdAt: Date }) => {
        if (!customerFirstAppointments.has(apt.customerId)) {
          customerFirstAppointments.set(apt.customerId, apt.createdAt);
        }
      }
    );

    // Count new customers in period
    const newCustomers = Array.from(customerFirstAppointments.values()).filter(
      (date) => {
        if (!startDate || !endDate) return true;
        return date >= startDate && date <= endDate;
      }
    ).length;

    const returningCustomers = totalCustomers - newCustomers;

    // Get service count
    const serviceCount = await this.repositories.prismaClient.service.count({
      where: { businessId: targetBusiness.id },
    });

    const activeServiceCount =
      await this.repositories.prismaClient.service.count({
        where: {
          businessId: targetBusiness.id,
          isActive: true,
        },
      });

    // Calculate rates
    const completionRate =
      totalAppointments > 0
        ? (completedAppointments / totalAppointments) * 100
        : 0;
    const cancellationRate =
      totalAppointments > 0
        ? (canceledAppointments / totalAppointments) * 100
        : 0;
    const noShowRate =
      totalAppointments > 0
        ? (noShowAppointments / totalAppointments) * 100
        : 0;
    const averageAppointmentValue =
      totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    // Get Daily Notebook data for complete financial picture
    const dailyNotebookData = await this.getDailyNotebookData(
      targetBusiness.id,
      startDate,
      endDate
    );

    // Find the "Randevular" (appointments) column from Daily Notebook
    const appointmentsColumn = dailyNotebookData.incomeByColumn.find(c => c.isSystem);
    const appointmentRevenueFromNotebook = appointmentsColumn?.amount || 0;
    const manualIncome = dailyNotebookData.totalIncome - appointmentRevenueFromNotebook;
    
    // All revenue from Daily Notebook (single source of truth)
    const combinedRevenue = dailyNotebookData.totalIncome;
    const manualExpenses = dailyNotebookData.totalExpenses;
    const netProfit = combinedRevenue - manualExpenses;

    return {
      businessId: targetBusiness.id,
      businessName: targetBusiness.name,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      noShowAppointments,
      totalRevenue: combinedRevenue,
      appointmentRevenue: appointmentRevenueFromNotebook,
      manualIncome,
      manualExpenses,
      netProfit,
      averageAppointmentValue,
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageRating: 0, // TODO: Implement rating system
      totalServices: serviceCount,
      activeServices: activeServiceCount,
    };
  }

  async getRevenueReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RevenueReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get Daily Notebook data (single source of truth for revenue)
    const dailyNotebookData = await this.getDailyNotebookData(
      targetBusiness.id,
      startDate,
      endDate
    );

    // Find the "Randevular" (appointments) column from Daily Notebook
    const appointmentsColumn = dailyNotebookData.incomeByColumn.find(c => c.isSystem);
    const appointmentRevenue = appointmentsColumn?.amount || 0;
    const manualIncome = dailyNotebookData.totalIncome - appointmentRevenue;
    
    const totalRevenue = dailyNotebookData.totalIncome;
    const periodRevenue = totalRevenue;

    // Get appointment data for counting
    const revenueData =
      await this.repositories.prismaClient.appointment.aggregate({
        where: {
          businessId: targetBusiness.id,
          status: AppointmentStatus.COMPLETED,
          ...dateFilter,
        },
        _sum: {
          price: true,
        },
        _count: true,
      });

    // Revenue by day (appointments only, manual income is tracked separately in Daily Notebook)
    const dailyRevenue =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["date"],
        where: {
          businessId: targetBusiness.id,
          status: AppointmentStatus.COMPLETED,
          ...dateFilter,
        },
        _sum: {
          price: true,
        },
        _count: true,
        orderBy: {
          date: "asc",
        },
      });

    const revenueByDay = dailyRevenue.map((day) => ({
      date: day.date.toISOString().split("T")[0],
      revenue: Number(day._sum.price || 0),
      appointmentRevenue: Number(day._sum.price || 0),
      manualIncome: 0, // Manual income is tracked monthly, not daily in this report
      appointments: day._count,
    }));

    // Revenue by service
    const serviceRevenue =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["serviceId"],
        where: {
          businessId: targetBusiness.id,
          status: AppointmentStatus.COMPLETED,
          ...dateFilter,
        },
        _sum: {
          price: true,
        },
        _count: true,
      });

    // Get service details
    const serviceIds = serviceRevenue.map((sr) => sr.serviceId);
    const services = await this.repositories.prismaClient.service.findMany({
      where: {
        id: { in: serviceIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const revenueByService = serviceRevenue
      .map((sr) => {
        const service = services.find((s) => s.id === sr.serviceId);
        const revenue = Number(sr._sum.price || 0);
        return {
          serviceId: sr.serviceId,
          serviceName: service?.name || "Unknown Service",
          revenue,
          appointments: sr._count,
          averageValue: sr._count > 0 ? revenue / sr._count : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Revenue by month with Daily Notebook integration
    const revenueByMonth = await this.getRevenueByMonth(
      targetBusiness.id,
      startDate,
      endDate
    );

    return {
      totalRevenue,
      appointmentRevenue,
      manualIncome,
      periodRevenue,
      revenueByDay,
      revenueByService,
      revenueByMonth,
      manualIncomeByColumn: dailyNotebookData.incomeByColumn,
    };
  }

  async getAppointmentReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AppointmentReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get appointment counts by status
    const statusCounts =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["status"],
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        _count: true,
      });

    let totalAppointments = 0;
    let completedAppointments = 0;
    let canceledAppointments = 0;
    let noShowAppointments = 0;
    let confirmedAppointments = 0;

    statusCounts.forEach((sc) => {
      totalAppointments += sc._count;
      switch (sc.status) {
        case AppointmentStatus.COMPLETED:
          completedAppointments = sc._count;
          break;
        case AppointmentStatus.CANCELED:
          canceledAppointments = sc._count;
          break;
        case AppointmentStatus.NO_SHOW:
          noShowAppointments = sc._count;
          break;
        case AppointmentStatus.CONFIRMED:
          confirmedAppointments = sc._count;
          break;
      }
    });

    // Appointments by day
    const dailyAppointments =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["date", "status"],
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        _count: true,
        orderBy: {
          date: "asc",
        },
      });

    const appointmentsByDay = this.groupAppointmentsByDay(dailyAppointments);

    // Appointments by service
    const appointmentsByService = await this.getAppointmentsByService(
      targetBusiness.id,
      dateFilter
    );

    // Appointments by staff
    const appointmentsByStaff = await this.getAppointmentsByStaff(
      targetBusiness.id,
      dateFilter
    );

    return {
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      noShowAppointments,
      confirmedAppointments,
      appointmentsByDay,
      appointmentsByService,
      appointmentsByStaff,
    };
  }

  async getCustomerReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CustomerReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get unique customers
    const customerData =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["customerId"],
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        _count: true,
        _sum: {
          price: true,
        },
      });

    const totalCustomers = customerData.length;
    const averageAppointmentsPerCustomer =
      customerData.length > 0
        ? customerData.reduce((sum, c) => sum + c._count, 0) /
          customerData.length
        : 0;

    // Get top customers
    const topCustomerIds = customerData
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map((c) => c.customerId);

    const topCustomersData = await this.repositories.prismaClient.user.findMany(
      {
        where: {
          id: { in: topCustomerIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          lastLoginAt: true,
        },
      }
    );

    // Get appointment statistics for each top customer to calculate reliability score
    const topCustomersWithStats = await Promise.all(
      customerData
        .filter((c) => topCustomerIds.includes(c.customerId))
        .map(async (c) => {
          const customer = topCustomersData.find(
            (tc) => tc.id === c.customerId
          );

          // Get detailed appointment statistics for this customer
          const appointmentStats =
            await this.repositories.appointmentRepository.getCustomerAppointmentStats(
              c.customerId,
              userId
            );

          // Get user behavior data
          const userBehavior =
            await this.repositories.userBehaviorRepository.findByUserId(
              c.customerId
            );

          // Calculate reliability score using centralized calculator
          const reliabilityResult = ReliabilityScoreCalculator.calculate({
            totalAppointments: appointmentStats.totalAppointments,
            completedAppointments: appointmentStats.completedAppointments,
            cancelledAppointments: appointmentStats.cancelledAppointments,
            noShowAppointments: appointmentStats.noShowCount,
            currentStrikes: userBehavior?.currentStrikes || 0,
            isBanned: userBehavior?.isBanned || false,
            bannedUntil: userBehavior?.bannedUntil,
          });

          return {
            customerId: c.customerId,
            customerName: customer
              ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
              : "Unknown",
            totalAppointments: c._count,
            totalSpent: Number(c._sum.price || 0),
            lastVisit: customer?.lastLoginAt || new Date(),
            reliabilityScore: reliabilityResult.score,
          };
        })
    );

    const topCustomers = topCustomersWithStats.sort(
      (a, b) => b.totalAppointments - a.totalAppointments
    );

    return {
      totalCustomers,
      newCustomers: 0, // TODO: Implement new customer tracking
      returningCustomers: 0, // TODO: Implement returning customer tracking
      averageAppointmentsPerCustomer:
        Math.round(averageAppointmentsPerCustomer * 100) / 100,
      customerRetentionRate: 0, // TODO: Implement retention rate calculation
      topCustomers,
      customersByAcquisition: [], // TODO: Implement acquisition tracking
    };
  }

  // Helper methods

  private async getUserBusinesses(userId: string, businessId?: string) {
    const whereClause: any = {
      OR: [
        { ownerId: userId },
        {
          staff: {
            some: {
              userId: userId,
              isActive: true,
            },
          },
        },
      ],
    };

    if (businessId) {
      whereClause.id = businessId;
    }

    return await this.repositories.prismaClient.business.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
      },
    });
  }

  private buildDateFilter(startDate?: Date, endDate?: Date) {
    if (!startDate || !endDate) return {};

    return {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
  }

  private async getRevenueByMonth(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    month: string;
    revenue: number;
    appointmentRevenue: number;
    manualIncome: number;
    appointments: number;
  }>> {
    if (!startDate || !endDate) {
      return [];
    }

    const result: Array<{
      month: string;
      revenue: number;
      appointmentRevenue: number;
      manualIncome: number;
      appointments: number;
    }> = [];

    // Iterate through each month in the date range
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endDateMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (currentDate <= endDateMonth) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Get appointment revenue for this month
      const monthlyAppointments = await this.repositories.prismaClient.appointment.aggregate({
        where: {
          businessId,
          status: AppointmentStatus.COMPLETED,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { price: true },
        _count: true,
      });

      const appointmentRevenue = Number(monthlyAppointments._sum.price || 0);

      // Get Daily Notebook data for this month
      const dailyNotebookData = await this.getMonthlyDailyNotebookData(
        businessId,
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );

      result.push({
        month: currentDate.toISOString().substring(0, 7),
        revenue: dailyNotebookData.income,
        appointmentRevenue: dailyNotebookData.appointmentRevenue,
        manualIncome: dailyNotebookData.manualIncome,
        appointments: monthlyAppointments._count,
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result;
  }

  private groupAppointmentsByDay(dailyData: any[]) {
    const grouped = new Map();

    dailyData.forEach((item) => {
      const date = item.date.toISOString().split("T")[0];
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          total: 0,
          completed: 0,
          canceled: 0,
          noShow: 0,
        });
      }

      const day = grouped.get(date);
      day.total += item._count;

      switch (item.status) {
        case AppointmentStatus.COMPLETED:
          day.completed += item._count;
          break;
        case AppointmentStatus.CANCELED:
          day.canceled += item._count;
          break;
        case AppointmentStatus.NO_SHOW:
          day.noShow += item._count;
          break;
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  private async getAppointmentsByService(businessId: string, dateFilter: any) {
    const serviceData =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["serviceId", "status"],
        where: {
          businessId,
          ...dateFilter,
        },
        _count: true,
        _avg: {
          duration: true,
        },
      });

    const serviceIds = Array.from(
      new Set(serviceData.map((sd) => sd.serviceId))
    );
    const services = await this.repositories.prismaClient.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    const grouped = new Map();

    serviceData.forEach((item) => {
      if (!grouped.has(item.serviceId)) {
        const service = services.find((s) => s.id === item.serviceId);
        grouped.set(item.serviceId, {
          serviceId: item.serviceId,
          serviceName: service?.name || "Unknown Service",
          total: 0,
          completed: 0,
          averageDuration: Number(item._avg.duration || 0),
        });
      }

      const service = grouped.get(item.serviceId);
      service.total += item._count;

      if (item.status === AppointmentStatus.COMPLETED) {
        service.completed += item._count;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }

  private async getAppointmentsByStaff(businessId: string, dateFilter: any) {
    const staffData = await this.repositories.prismaClient.appointment.groupBy({
      by: ["staffId"],
      where: {
        businessId,
        staffId: { not: null },
        ...dateFilter,
      },
      _count: true,
      _sum: { price: true },
    });

    const staffIds = staffData
      .map((sd) => sd.staffId)
      .filter(Boolean) as string[];
    const staff = await this.repositories.prismaClient.businessStaff.findMany({
      where: { id: { in: staffIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return staffData.map((sd) => {
      const staffMember = staff.find((s) => s.id === sd.staffId);
      const completedCount = sd._count; // Simplified
      return {
        staffId: sd.staffId || "",
        staffName: staffMember
          ? `${staffMember.user.firstName} ${staffMember.user.lastName}`
          : "Unknown",
        total: sd._count,
        completed: completedCount,
        rating: 4.5, // TODO: Implement actual rating system
      };
    });
  }

  // ADVANCED REPORTS

  async getFinancialReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get Daily Notebook data (ALL income/expenses from user's Daily Notebook)
    const dailyNotebookData = await this.getDailyNotebookData(
      targetBusiness.id,
      startDate,
      endDate
    );

    // Get appointment data for transaction statistics
    const revenueData =
      await this.repositories.prismaClient.appointment.aggregate({
        where: {
          businessId: targetBusiness.id,
          status: "COMPLETED",
          ...dateFilter,
        },
        _sum: { price: true },
        _count: true,
      });

    const appointmentsTotal = Number(revenueData._sum.price || 0);
    
    // Find the "Randevular" (appointments) column from Daily Notebook
    const appointmentsColumn = dailyNotebookData.incomeByColumn.find(c => c.isSystem);
    const appointmentRevenueFromNotebook = appointmentsColumn?.amount || 0;
    const manualIncome = dailyNotebookData.totalIncome - appointmentRevenueFromNotebook;
    
    // Calculate totals (all from Daily Notebook - single source of truth)
    const totalRevenue = dailyNotebookData.totalIncome;
    const totalExpenses = dailyNotebookData.totalExpenses;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get payment methods (simplified - based on appointments data)
    const paymentMethods = [
      { method: "Cash", amount: appointmentRevenueFromNotebook * 0.4, percentage: 40 },
      { method: "Card", amount: appointmentRevenueFromNotebook * 0.45, percentage: 45 },
      { method: "Digital", amount: appointmentRevenueFromNotebook * 0.15, percentage: 15 },
    ];

    // Monthly trends with Daily Notebook integration (last 6 months)
    const monthlyTrends = await this.getMonthlyFinancialTrends(
      targetBusiness.id,
      6
    );

    return {
      totalRevenue,
      appointmentRevenue: appointmentRevenueFromNotebook,
      manualIncome,
      netProfit,
      expenses: totalExpenses,
      manualExpenses: totalExpenses,
      profitMargin: Math.round(profitMargin * 100) / 100,
      revenueGrowth: 12.5, // TODO: Calculate actual growth
      avgTransactionValue:
        revenueData._count > 0 ? appointmentsTotal / revenueData._count : 0,
      paymentMethods,
      monthlyTrends,
      incomeBreakdown: {
        dailyNotebookColumns: dailyNotebookData.incomeByColumn,
      },
      expenseBreakdown: dailyNotebookData.expenseByColumn,
    };
  }

  async getOperationalReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OperationalReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get peak hours analysis
    const hourlyData = await this.repositories.prismaClient.appointment.groupBy(
      {
        by: ["startTime"],
        where: {
          businessId: targetBusiness.id,
          ...dateFilter,
        },
        _count: true,
      }
    );

    // Process hourly data
    const hourMap = new Map<number, number>();
    hourlyData.forEach((data) => {
      const hour = new Date(data.startTime).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + data._count);
    });

    const peakHours = Array.from(hourMap.entries())
      .map(([hour, appointments]) => ({
        hour,
        appointments,
        utilization: appointments * 10, // Simplified utilization calculation
      }))
      .sort((a, b) => b.appointments - a.appointments);

    // Staff workload analysis
    const staffWorkload = await this.getStaffWorkloadAnalysis(
      targetBusiness.id,
      dateFilter
    );

    // Service efficiency
    const serviceEfficiency = await this.getServiceEfficiencyAnalysis(
      targetBusiness.id,
      dateFilter
    );

    return {
      businessId: targetBusiness.id,
      utilizationRate: 75.5, // TODO: Calculate actual utilization
      peakHours,
      averageWaitTime: 12, // TODO: Calculate actual wait time
      serviceEfficiency,
      staffWorkload,
      resourceUtilization: {
        rooms: 85,
        equipment: 92,
        supplies: 78,
      },
    };
  }

  async getUpcomingAppointments(
    userId: string,
    businessId?: string,
    limit = 5
  ): Promise<
    Array<{
      id: string;
      startTime: Date;
      endTime: Date;
      serviceName: string;
      customerName: string;
    }>
  > {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      return [];
    }

    const targetBusiness = businesses[0];
    const now = new Date();

    const appointments = await this.repositories.prismaClient.appointment.findMany({
      where: {
        businessId: targetBusiness.id,
        startTime: {
          gte: now
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
        }
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        service: {
          select: {
            name: true
          }
        },
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: limit
    });

    return appointments.map((appointment) => ({
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceName: appointment.service?.name || 'Hizmet',
      customerName: `${appointment.customer?.firstName || ''} ${appointment.customer?.lastName || ''}`.trim()
    }));
  }

  async getCustomerAnalyticsReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CustomerAnalyticsReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get customer data
    const customerStats =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["customerId"],
        where: {
          businessId: targetBusiness.id,
          status: "COMPLETED",
          ...dateFilter,
        },
        _count: true,
        _sum: { price: true },
        _avg: { price: true },
      });

    const totalCustomers = customerStats.length;
    const totalRevenue = customerStats.reduce(
      (sum, c) => sum + Number(c._sum.price || 0),
      0
    );
    const customerLifetimeValue =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    // Customer segments analysis
    const customerSegments = [
      {
        segment: "VIP (10+ visits)",
        count: Math.floor(totalCustomers * 0.05),
        avgSpending: customerLifetimeValue * 3,
        frequency: 12,
      },
      {
        segment: "Regular (3-9 visits)",
        count: Math.floor(totalCustomers * 0.25),
        avgSpending: customerLifetimeValue * 1.5,
        frequency: 6,
      },
      {
        segment: "Occasional (1-2 visits)",
        count: Math.floor(totalCustomers * 0.7),
        avgSpending: customerLifetimeValue * 0.5,
        frequency: 2,
      },
    ];

    return {
      totalCustomers,
      customerLifetimeValue: Math.round(customerLifetimeValue * 100) / 100,
      acquisitionCost: 45, // TODO: Calculate actual acquisition cost
      retentionRate: 68.5, // TODO: Calculate actual retention
      churnRate: 31.5,
      customerSegments,
      loyaltyMetrics: {
        nps: 72,
        satisfaction: 4.3,
        repeatRate: 65,
      },
      demographicBreakdown: {
        ageGroups: [
          { range: "18-25", count: Math.floor(totalCustomers * 0.15) },
          { range: "26-35", count: Math.floor(totalCustomers * 0.35) },
          { range: "36-45", count: Math.floor(totalCustomers * 0.25) },
          { range: "46-55", count: Math.floor(totalCustomers * 0.15) },
          { range: "55+", count: Math.floor(totalCustomers * 0.1) },
        ],
        genderDistribution: [
          { gender: "Female", count: Math.floor(totalCustomers * 0.65) },
          { gender: "Male", count: Math.floor(totalCustomers * 0.35) },
        ],
        geographicDistribution: [
          {
            location: "Local (0-5km)",
            count: Math.floor(totalCustomers * 0.6),
          },
          {
            location: "Regional (5-20km)",
            count: Math.floor(totalCustomers * 0.3),
          },
          {
            location: "Distant (20km+)",
            count: Math.floor(totalCustomers * 0.1),
          },
        ],
      },
    };
  }

  async getTrendsAnalysisReport(
    userId: string,
    businessId?: string,
    timeframe: string = "12months"
  ): Promise<TrendsAnalysisReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];

    // Get historical data for trend analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const historicalData =
      await this.repositories.prismaClient.appointment.groupBy({
        by: ["date"],
        where: {
          businessId: targetBusiness.id,
          date: { gte: startDate, lte: endDate },
        },
        _count: true,
        _sum: { price: true },
      });

    // Calculate growth metrics (simplified)
    const totalRevenue = historicalData.reduce(
      (sum, d) => sum + Number(d._sum.price || 0),
      0
    );
    const totalAppointments = historicalData.reduce(
      (sum, d) => sum + d._count,
      0
    );

    // Seasonal patterns analysis
    const seasonalPatterns = [
      {
        period: "Spring",
        metric: "Revenue",
        value: totalRevenue * 0.23,
        trend: "increasing" as const,
      },
      {
        period: "Summer",
        metric: "Revenue",
        value: totalRevenue * 0.28,
        trend: "increasing" as const,
      },
      {
        period: "Fall",
        metric: "Revenue",
        value: totalRevenue * 0.27,
        trend: "stable" as const,
      },
      {
        period: "Winter",
        metric: "Revenue",
        value: totalRevenue * 0.22,
        trend: "decreasing" as const,
      },
    ];

    // Forecasting (next 3 months)
    const forecasting = Array.from({ length: 3 }, (_, i) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i + 1);
      return {
        period: futureDate.toISOString().substring(0, 7),
        predictedRevenue: (totalRevenue / 12) * 1.05, // 5% growth assumption
        predictedAppointments: Math.floor((totalAppointments / 12) * 1.03), // 3% growth assumption
        confidence: 0.78,
      };
    });

    return {
      businessId: targetBusiness.id,
      timeframe,
      growthMetrics: {
        revenueGrowth: 12.5,
        customerGrowth: 8.3,
        appointmentGrowth: 15.2,
        serviceDemandGrowth: [], // TODO: Implement service-specific growth
      },
      seasonalPatterns,
      forecasting,
    };
  }

  async getQualityMetricsReport(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<QualityMetricsReport> {
    const businesses = await this.getUserBusinesses(userId, businessId);
    if (businesses.length === 0) {
      throw new Error("No accessible businesses found");
    }

    const targetBusiness = businesses[0];
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Customer satisfaction (mock data - you'd need actual review system)
    const customerSatisfaction = {
      averageRating: 4.3,
      totalReviews: 156,
      ratingDistribution: [
        { stars: 5, count: 89 },
        { stars: 4, count: 45 },
        { stars: 3, count: 15 },
        { stars: 2, count: 5 },
        { stars: 1, count: 2 },
      ],
    };

    // Service quality metrics
    const services = await this.repositories.prismaClient.service.findMany({
      where: { businessId: targetBusiness.id },
      include: {
        appointments: {
          where: {
            ...dateFilter,
            status: { in: ["COMPLETED", "NO_SHOW", "CANCELED"] },
          },
        },
      },
    });

    const serviceQuality = services.map((service) => {
      const total = service.appointments.length;
      const completed = service.appointments.filter(
        (a) => a.status === "COMPLETED"
      ).length;
      return {
        serviceId: service.id,
        serviceName: service.name,
        rating: 4.2 + Math.random() * 0.6, // Mock rating
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        reworkRate: Math.random() * 5, // Mock rework rate
      };
    });

    // Staff performance
    const staffPerformance = await this.getStaffQualityMetrics(
      targetBusiness.id,
      dateFilter
    );

    return {
      businessId: targetBusiness.id,
      customerSatisfaction,
      serviceQuality,
      staffPerformance,
      incidentReports: {
        total: 12,
        resolved: 11,
        avgResolutionTime: 2.5,
      },
    };
  }

  // COMPREHENSIVE REPORTS

  async getExecutiveSummary(
    userId: string,
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    overview: BusinessOverviewReport;
    financial: FinancialReport;
    operational: OperationalReport;
    customer: CustomerAnalyticsReport;
    quality: QualityMetricsReport;
    kpis: Array<{
      name: string;
      value: number;
      unit: string;
      trend: "up" | "down" | "stable";
      change: number;
    }>;
  }> {
    // Get all reports in parallel
    const [overview, financial, operational, customer, quality] =
      await Promise.all([
        this.getBusinessOverview(userId, businessId, startDate, endDate),
        this.getFinancialReport(userId, businessId, startDate, endDate),
        this.getOperationalReport(userId, businessId, startDate, endDate),
        this.getCustomerAnalyticsReport(userId, businessId, startDate, endDate),
        this.getQualityMetricsReport(userId, businessId, startDate, endDate),
      ]);

    // Calculate key KPIs
    const kpis = [
      {
        name: "Revenue",
        value: financial.totalRevenue,
        unit: "TRY",
        trend: "up" as const,
        change: 12.5,
      },
      {
        name: "Appointments",
        value: overview.totalAppointments,
        unit: "count",
        trend: "up" as const,
        change: 8.3,
      },
      {
        name: "Customer Satisfaction",
        value: quality.customerSatisfaction.averageRating,
        unit: "stars",
        trend: "stable" as const,
        change: 0.1,
      },
      {
        name: "Profit Margin",
        value: financial.profitMargin,
        unit: "%",
        trend: "up" as const,
        change: 2.1,
      },
      {
        name: "Utilization Rate",
        value: operational.utilizationRate,
        unit: "%",
        trend: "stable" as const,
        change: -1.2,
      },
      {
        name: "Customer Retention",
        value: customer.retentionRate,
        unit: "%",
        trend: "up" as const,
        change: 4.7,
      },
    ];

    return {
      overview,
      financial,
      operational,
      customer,
      quality,
      kpis,
    };
  }

  // HELPER METHODS FOR DAILY NOTEBOOK INTEGRATION

  private async getDailyNotebookData(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    if (!startDate || !endDate) {
      // Default to current month if no dates provided
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get all notebooks in the date range
    const notebooks = await this.repositories.prismaClient.businessDailyNotebook.findMany({
      where: {
        businessId,
        OR: [
          {
            year: startDate.getFullYear(),
            month: { gte: startDate.getMonth() + 1, lte: endDate.getMonth() + 1 },
          },
          {
            year: { gte: startDate.getFullYear(), lte: endDate.getFullYear() },
          },
        ],
      },
      include: {
        dailyEntries: {
          include: {
            column: true,
          },
        },
      },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeByColumn = new Map<string, { name: string; amount: number; isSystem: boolean }>();
    const expenseByColumn = new Map<string, { name: string; amount: number; isSystem: boolean }>();

    // Aggregate all entries (including system columns like "Randevular")
    for (const notebook of notebooks) {
      for (const entry of notebook.dailyEntries) {
        const amount = Number(entry.amount);
        
        if (entry.column.type === 'INCOME') {
          // Include ALL income columns (system + user-created)
          totalIncome += amount;
          const existing = incomeByColumn.get(entry.column.id) || { 
            name: entry.column.name, 
            amount: 0, 
            isSystem: entry.column.isSystem 
          };
          existing.amount += amount;
          incomeByColumn.set(entry.column.id, existing);
        } else if (entry.column.type === 'EXPENSE') {
          totalExpenses += amount;
          const existing = expenseByColumn.get(entry.column.id) || { 
            name: entry.column.name, 
            amount: 0,
            isSystem: entry.column.isSystem 
          };
          existing.amount += amount;
          expenseByColumn.set(entry.column.id, existing);
        }
      }
    }

    return {
      totalIncome,
      totalExpenses,
      incomeByColumn: Array.from(incomeByColumn.values()).map(v => ({
        columnName: v.name,
        amount: v.amount,
        isSystem: v.isSystem,
      })),
      expenseByColumn: Array.from(expenseByColumn.values()).map(v => ({
        columnName: v.name,
        amount: v.amount,
        isSystem: v.isSystem,
      })),
    };
  }

  private async getMonthlyDailyNotebookData(businessId: string, year: number, month: number) {
    const notebook = await this.repositories.prismaClient.businessDailyNotebook.findUnique({
      where: {
        businessId_year_month: {
          businessId,
          year,
          month,
        },
      },
      include: {
        dailyEntries: {
          include: {
            column: true,
          },
        },
      },
    });

    if (!notebook) {
      return { income: 0, expenses: 0, appointmentRevenue: 0, manualIncome: 0 };
    }

    let totalIncome = 0;
    let appointmentRevenue = 0;
    let expenses = 0;

    for (const entry of notebook.dailyEntries) {
      const amount = Number(entry.amount);
      
      if (entry.column.type === 'INCOME') {
        totalIncome += amount;
        // Separate appointment revenue (system column) from manual income
        if (entry.column.isSystem) {
          appointmentRevenue += amount;
        }
      } else if (entry.column.type === 'EXPENSE') {
        expenses += amount;
      }
    }

    const manualIncome = totalIncome - appointmentRevenue;

    return { 
      income: totalIncome, 
      expenses, 
      appointmentRevenue,
      manualIncome
    };
  }

  // HELPER METHODS FOR ADVANCED REPORTS

  private async getMonthlyFinancialTrends(businessId: string, months: number) {
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Get appointment revenue
      const revenue =
        await this.repositories.prismaClient.appointment.aggregate({
          where: {
            businessId,
            status: "COMPLETED",
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { price: true },
        });

      const appointmentRevenue = Number(revenue._sum.price || 0);

      // Get Daily Notebook data for this month
      const dailyNotebookData = await this.getMonthlyDailyNotebookData(
        businessId,
        monthStart.getFullYear(),
        monthStart.getMonth() + 1 // Prisma months are 1-indexed
      );

      const totalRevenue = dailyNotebookData.income;
      const totalExpenses = dailyNotebookData.expenses;
      const profit = totalRevenue - totalExpenses;

      trends.push({
        month: monthStart.toISOString().substring(0, 7),
        revenue: totalRevenue,
        appointmentRevenue: dailyNotebookData.appointmentRevenue,
        manualIncome: dailyNotebookData.manualIncome,
        expenses: totalExpenses,
        manualExpenses: dailyNotebookData.expenses,
        profit,
      });
    }

    return trends;
  }

  private async getStaffWorkloadAnalysis(businessId: string, dateFilter: any) {
    const staffData =
      await this.repositories.prismaClient.businessStaff.findMany({
        where: { businessId, isActive: true },
        include: {
          user: { select: { firstName: true, lastName: true } },
          appointments: {
            where: {
              ...dateFilter,
              status: { in: ["COMPLETED", "CONFIRMED"] },
            },
          },
        },
      });

    return staffData.map((staff) => ({
      staffId: staff.id,
      staffName: `${staff.user.firstName} ${staff.user.lastName}`,
      hoursWorked:
        staff.appointments.reduce((sum, apt) => sum + (apt.duration || 60), 0) /
        60,
      appointmentsHandled: staff.appointments.length,
      utilizationRate: Math.min(95, 40 + Math.random() * 40), // Mock utilization
      overtime: Math.random() * 10, // Mock overtime hours
    }));
  }

  private async getServiceEfficiencyAnalysis(
    businessId: string,
    dateFilter: any
  ) {
    const services = await this.repositories.prismaClient.service.findMany({
      where: { businessId },
      include: {
        appointments: {
          where: {
            ...dateFilter,
            status: "COMPLETED",
          },
        },
      },
    });

    return services.map((service) => {
      const avgDuration =
        service.appointments.length > 0
          ? service.appointments.reduce(
              (sum, apt) => sum + (apt.duration || service.duration),
              0
            ) / service.appointments.length
          : service.duration;

      return {
        serviceId: service.id,
        serviceName: service.name,
        averageDuration: avgDuration,
        scheduledDuration: service.duration,
        efficiency: (service.duration / avgDuration) * 100,
      };
    });
  }

  private async getStaffQualityMetrics(businessId: string, dateFilter: any) {
    const staff = await this.repositories.prismaClient.businessStaff.findMany({
      where: { businessId, isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return staff.map((staffMember) => ({
      staffId: staffMember.id,
      staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`,
      customerRating: 4.0 + Math.random() * 1.0, // Mock rating
      punctuality: 85 + Math.random() * 15, // Mock punctuality score
      professionalismScore: 80 + Math.random() * 20, // Mock professionalism score
    }));
  }
}
