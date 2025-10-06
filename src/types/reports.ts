// Reports Domain Types
export interface BusinessOverviewReport {
  businessId: string;
  businessName: string;
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number;
  averageAppointmentValue: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageRating: number;
  totalServices: number;
  activeServices: number;
}

export interface StaffReport {
  totalStaff: number;
  activeStaff: number;
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalRevenue: number;
    averageRating: number;
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
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    growth: number;
  }>;
  revenueByService: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    percentage: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  refunds: {
    totalRefunds: number;
    refundRate: number;
    averageRefundAmount: number;
  };
  taxes: {
    totalTax: number;
    taxRate: number;
  };
}

export interface OperationalReport {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  averageAppointmentDuration: number;
  peakHours: Array<{
    hour: string;
    appointmentCount: number;
  }>;
  busiestDays: Array<{
    dayOfWeek: string;
    appointmentCount: number;
  }>;
}

export interface CustomerAnalyticsReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
  averageAppointmentsPerCustomer: number;
  customerLifetimeValue: number;
  customerSegments: Array<{
    segment: string;
    count: number;
    percentage: number;
    averageValue: number;
  }>;
  customerSatisfaction: {
    averageRating: number;
    ratingDistribution: Array<{
      rating: number;
      count: number;
      percentage: number;
    }>;
  };
}

export interface TrendsReport {
  appointmentTrends: Array<{
    period: string;
    appointments: number;
    revenue: number;
    growth: number;
  }>;
  serviceTrends: Array<{
    serviceId: string;
    serviceName: string;
    trend: "increasing" | "decreasing" | "stable";
    growthRate: number;
  }>;
  customerTrends: Array<{
    period: string;
    newCustomers: number;
    returningCustomers: number;
    churnRate: number;
  }>;
  seasonalPatterns: Array<{
    month: string;
    appointments: number;
    revenue: number;
    averageRating: number;
  }>;
}

export interface QualityMetricsReport {
  serviceQuality: {
    averageRating: number;
    ratingDistribution: Array<{
      rating: number;
      count: number;
      percentage: number;
    }>;
    improvementAreas: Array<{
      area: string;
      currentScore: number;
      targetScore: number;
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>;
  };
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    averageRating: number;
    totalAppointments: number;
    efficiency: number;
    customerSatisfaction: number;
  }>;
  serviceEfficiency: Array<{
    serviceId: string;
    serviceName: string;
    averageDuration: number;
    targetDuration: number;
    efficiency: number;
    bottlenecks: string[];
  }>;
}
