// Closure Domain Types
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ClosureAnalytics {
  totalClosures: number;
  totalDaysClosed: number;
  averageClosureDuration: number;
  closureFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  closureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
    totalDays: number;
  }>;
  seasonalPatterns: Array<{
    month: string;
    closureCount: number;
    totalDays: number;
    averageDuration: number;
  }>;
  businessImpact: {
    totalAppointmentsAffected: number;
    totalRevenueLost: number;
    averageAppointmentsPerClosure: number;
    averageRevenueLostPerClosure: number;
  };
  reschedulingStats: {
    totalRescheduled: number;
    reschedulingRate: number;
    averageReschedulingDelay: number;
    customerSatisfaction: number;
  };
  staffImpact: {
    totalStaffAffected: number;
    averageStaffUtilization: number;
    staffSatisfaction: number;
  };
  customerImpact: {
    totalCustomersAffected: number;
    customerRetentionRate: number;
    customerSatisfaction: number;
    complaintRate: number;
  };
  recommendations: Array<{
    type: 'OPERATIONAL' | 'STRATEGIC' | 'CUSTOMER_SERVICE';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    expectedImpact: string;
    implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}


