import { PrismaClient } from '@prisma/client';
import { ClosureType } from '../../../types/business';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ClosureAnalytics {
  totalClosures: number;
  closuresByType: Record<ClosureType, number>;
  averageClosureDuration: number; // in hours
  totalClosureHours: number;
  affectedAppointments: number;
  estimatedRevenueLoss: number;
  customerImpact: {
    totalAffectedCustomers: number;
    notificationsSent: number;
    rescheduledAppointments: number;
    canceledAppointments: number;
  };
  monthlyTrend: Array<{
    month: string;
    year: number;
    closures: number;
    hours: number;
    revenue: number;
  }>;
  recurringPatterns: Array<{
    pattern: string;
    frequency: number;
    impact: number;
  }>;
}

export interface CustomerImpactReport {
  closureId: string;
  businessId: string;
  businessName: string;
  startDate: Date;
  endDate?: Date;
  totalAffectedAppointments: number;
  affectedCustomers: Array<{
    customerId: string;
    customerName: string;
    appointmentCount: number;
    totalValue: number;
    notificationStatus: string;
    rescheduleStatus: string;
  }>;
  notificationStats: {
    total: number;
    sent: number;
    failed: number;
    channels: Record<string, number>;
  };
}

export interface RevenueImpact {
  directRevenueLoss: number;
  potentialRevenueLoss: number;
  rescheduledRevenue: number;
  netRevenueLoss: number;
  impactPercentage: number; // percentage of monthly revenue
  comparisonWithPreviousPeriod: {
    previousLoss: number;
    changePercentage: number;
  };
}

export interface ClosureData {
  id: string;
  businessId: string;
  startDate: Date;
  endDate?: Date;
  type: ClosureType;
  reason: string;
}

export class ClosureAnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getClosureImpactAnalytics(
    businessId: string,
    period: DateRange
  ): Promise<ClosureAnalytics> {
    try {
      // Get all closures in the period
      const closures = await this.prisma.businessClosure.findMany({
        where: {
          businessId,
          startDate: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        include: {
          business: true
        }
      });

      // Get affected appointments
      const affectedAppointments = await this.getAffectedAppointmentsForPeriod(
        businessId,
        period
      );

      // Calculate analytics
      const analytics: ClosureAnalytics = {
        totalClosures: closures.length,
        closuresByType: this.calculateClosuresByType(closures),
        averageClosureDuration: this.calculateAverageClosureDuration(closures),
        totalClosureHours: this.calculateTotalClosureHours(closures),
        affectedAppointments: affectedAppointments.length,
        estimatedRevenueLoss: this.calculateRevenueLoss(affectedAppointments),
        customerImpact: await this.calculateCustomerImpact(businessId, period),
        monthlyTrend: await this.calculateMonthlyTrend(businessId, period),
        recurringPatterns: this.analyzeRecurringPatterns(closures)
      };

      return analytics;
    } catch (error) {
      throw new Error(`Failed to calculate closure analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCustomerImpactReport(closureId: string): Promise<CustomerImpactReport> {
    try {
      const closure = await this.prisma.businessClosure.findUnique({
        where: { id: closureId },
        include: {
          business: true
        }
      });

      if (!closure) {
        throw new Error('Closure not found');
      }

      // Get affected appointments
      const affectedAppointments = await this.prisma.appointment.findMany({
        where: {
          businessId: closure.businessId,
          startTime: {
            gte: closure.startDate,
            lte: closure.endDate || new Date('2099-12-31')
          }
        },
        include: {
          customer: true,
          service: true
        }
      });

      // Group by customer
      const customerImpacts = new Map<string, any>();
      
      affectedAppointments.forEach(appointment => {
        const customerId = appointment.customerId;
        if (!customerImpacts.has(customerId)) {
          customerImpacts.set(customerId, {
            customerId,
            customerName: `${appointment.customer.firstName || ''} ${appointment.customer.lastName || ''}`.trim() || 'Unknown',
            appointmentCount: 0,
            totalValue: 0,
            notificationStatus: 'pending',
            rescheduleStatus: 'pending'
          });
        }

        const impact = customerImpacts.get(customerId);
        impact.appointmentCount++;
        impact.totalValue += Number(appointment.price);
      });

      // Get notifications for this closure
      const notifications = await this.prisma.closureNotification.findMany({
        where: { closureId: closure.id }
      });

      const rescheduleSuggestions = await this.prisma.rescheduleSuggestion.findMany({
        where: { closureId: closure.id },
        include: {
          originalAppointment: {
            include: {
              customer: true
            }
          }
        }
      });

      // Update notification status
      notifications.forEach(notification => {
        const impact = customerImpacts.get(notification.customerId);
        if (impact) {
          impact.notificationStatus = notification.status.toLowerCase();
        }
      });

      // Update reschedule status
      rescheduleSuggestions.forEach(suggestion => {
        const impact = customerImpacts.get(suggestion.originalAppointment.customerId);
        if (impact) {
          impact.rescheduleStatus = suggestion.customerResponse?.toLowerCase() || 'pending';
        }
      });

      // Calculate notification stats
      const notificationStats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'SENT').length,
        failed: notifications.filter(n => n.status === 'FAILED').length,
        channels: {} as Record<string, number>
      };

      notifications.forEach(notification => {
        const channel = notification.channel;
        notificationStats.channels[channel] = (notificationStats.channels[channel] || 0) + 1;
      });

      return {
        closureId: closure.id,
        businessId: closure.businessId,
        businessName: closure.business.name,
        startDate: closure.startDate,
        endDate: closure.endDate || undefined,
        totalAffectedAppointments: affectedAppointments.length,
        affectedCustomers: Array.from(customerImpacts.values()),
        notificationStats
      };
    } catch (error) {
      throw new Error(`Failed to generate customer impact report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRevenueImpactAnalysis(
    businessId: string,
    closureData: ClosureData
  ): Promise<RevenueImpact> {
    try {
      // Get affected appointments
      const affectedAppointments = await this.prisma.appointment.findMany({
        where: {
          businessId: closureData.businessId,
          startTime: {
            gte: closureData.startDate,
            lte: closureData.endDate || new Date('2099-12-31')
          }
        }
      });

      // Calculate direct revenue loss
      const directRevenueLoss = affectedAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.price),
        0
      );

      // Get rescheduled appointments
      const rescheduled = await this.prisma.rescheduleSuggestion.findMany({
        where: {
          closureId: closureData.id,
          customerResponse: 'ACCEPTED'
        },
        include: {
          originalAppointment: true
        }
      });

      const rescheduledRevenue = rescheduled.reduce(
        (sum: number, suggestion: any) => sum + Number(suggestion.originalAppointment.price),
        0
      );

      // Calculate potential revenue loss (bookings that might have been made)
      const averageBookingsPerDay = await this.calculateAverageBookingsPerDay(businessId);
      const closureDurationDays = this.calculateClosureDurationInDays(
        closureData.startDate,
        closureData.endDate
      );
      
      const potentialRevenueLoss = averageBookingsPerDay * closureDurationDays * 50; // Average appointment value

      // Net revenue loss
      const netRevenueLoss = directRevenueLoss + potentialRevenueLoss - rescheduledRevenue;

      // Calculate monthly revenue for comparison
      const monthlyRevenue = await this.getMonthlyRevenue(businessId);
      const impactPercentage = monthlyRevenue > 0 ? (netRevenueLoss / monthlyRevenue) * 100 : 0;

      // Compare with previous period
      const previousPeriodComparison = await this.calculatePreviousPeriodComparison(
        businessId,
        closureData
      );

      return {
        directRevenueLoss,
        potentialRevenueLoss,
        rescheduledRevenue,
        netRevenueLoss,
        impactPercentage,
        comparisonWithPreviousPeriod: previousPeriodComparison
      };
    } catch (error) {
      throw new Error(`Failed to calculate revenue impact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateClosuresByType(closures: any[]): Record<ClosureType, number> {
    const typeCount = {} as Record<ClosureType, number>;
    
    // Initialize all types to 0
    Object.values(ClosureType).forEach(type => {
      typeCount[type] = 0;
    });

    closures.forEach(closure => {
      typeCount[closure.type as ClosureType]++;
    });

    return typeCount;
  }

  private calculateAverageClosureDuration(closures: any[]): number {
    if (closures.length === 0) return 0;

    const totalHours = closures.reduce((sum, closure) => {
      return sum + this.calculateClosureDurationInHours(closure.startDate, closure.endDate);
    }, 0);

    return totalHours / closures.length;
  }

  private calculateTotalClosureHours(closures: any[]): number {
    return closures.reduce((sum, closure) => {
      return sum + this.calculateClosureDurationInHours(closure.startDate, closure.endDate);
    }, 0);
  }

  private calculateClosureDurationInHours(startDate: Date, endDate?: Date): number {
    const end = endDate || new Date();
    const start = new Date(startDate);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  private calculateClosureDurationInDays(startDate: Date, endDate?: Date): number {
    const end = endDate || new Date();
    const start = new Date(startDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  private calculateRevenueLoss(appointments: any[]): number {
    return appointments.reduce((sum, appointment) => sum + Number(appointment.price), 0);
  }

  private async calculateCustomerImpact(businessId: string, period: DateRange): Promise<any> {
    // Get notifications for closures in the period
    const notifications = await this.prisma.closureNotification.findMany({
      where: {
        closure: {
          businessId,
          startDate: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      }
    });

    const rescheduleSuggestions = await this.prisma.rescheduleSuggestion.findMany({
      where: {
        closure: {
          businessId,
          startDate: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      }
    });

    const sentNotifications = notifications.filter(n => n.status === 'SENT').length;
    const rescheduledAppointments = rescheduleSuggestions.filter(r => r.customerResponse === 'ACCEPTED').length;
    const totalAffectedCustomers = new Set(notifications.map(n => n.customerId)).size;

    return {
      totalAffectedCustomers,
      notificationsSent: sentNotifications,
      rescheduledAppointments,
      canceledAppointments: notifications.length - rescheduledAppointments
    };
  }

  private async calculateMonthlyTrend(businessId: string, period: DateRange): Promise<any[]> {
    const trend = [];
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const monthClosures = await this.prisma.businessClosure.findMany({
        where: {
          businessId,
          startDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      const hours = this.calculateTotalClosureHours(monthClosures);
      
      // Estimate revenue impact for the month
      const avgDailyRevenue = await this.getAverageDailyRevenue(businessId);
      const revenue = (hours / 24) * avgDailyRevenue;

      trend.push({
        month: currentDate.toLocaleString('default', { month: 'long' }),
        year: currentDate.getFullYear(),
        closures: monthClosures.length,
        hours,
        revenue
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return trend;
  }

  private analyzeRecurringPatterns(closures: any[]): any[] {
    const patterns = new Map<string, { frequency: number; impact: number }>();

    closures.forEach(closure => {
      if (closure.isRecurring && closure.recurringPattern) {
        const pattern = JSON.stringify(closure.recurringPattern);
        const existing = patterns.get(pattern) || { frequency: 0, impact: 0 };
        
        existing.frequency++;
        existing.impact += this.calculateClosureDurationInHours(closure.startDate, closure.endDate);
        
        patterns.set(pattern, existing);
      }
    });

    return Array.from(patterns.entries()).map(([pattern, data]) => ({
      pattern,
      frequency: data.frequency,
      impact: data.impact
    }));
  }

  private async getAffectedAppointmentsForPeriod(
    businessId: string,
    period: DateRange
  ): Promise<any[]> {
    return await this.prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: period.startDate,
          lte: period.endDate
        }
      }
    });
  }

  private async calculateAverageBookingsPerDay(businessId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    return appointments.length / 30;
  }

  private async getMonthlyRevenue(businessId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        status: 'COMPLETED',
        completedAt: {
          gte: startOfMonth
        }
      }
    });

    return appointments.reduce((sum, appointment) => sum + Number(appointment.price), 0);
  }

  private async getAverageDailyRevenue(businessId: string): Promise<number> {
    const monthlyRevenue = await this.getMonthlyRevenue(businessId);
    const daysInMonth = new Date().getDate();
    return monthlyRevenue / daysInMonth;
  }

  private async calculatePreviousPeriodComparison(
    businessId: string,
    closureData: ClosureData
  ): Promise<{ previousLoss: number; changePercentage: number }> {
    // Calculate the same period last year
    const previousYear = new Date(closureData.startDate);
    previousYear.setFullYear(previousYear.getFullYear() - 1);
    
    const previousEndDate = closureData.endDate ? new Date(closureData.endDate) : null;
    if (previousEndDate) {
      previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
    }

    const previousClosures = await this.prisma.businessClosure.findMany({
      where: {
        businessId,
        startDate: {
          gte: previousYear,
          lte: previousEndDate || new Date(previousYear.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    const previousAppointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: previousYear,
          lte: previousEndDate || new Date(previousYear.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    const previousLoss = this.calculateRevenueLoss(previousAppointments);
    const currentLoss = await this.calculateCurrentPeriodLoss(businessId, closureData);
    
    const changePercentage = previousLoss > 0 
      ? ((currentLoss - previousLoss) / previousLoss) * 100 
      : 0;

    return {
      previousLoss,
      changePercentage
    };
  }

  private async calculateCurrentPeriodLoss(businessId: string, closureData: ClosureData): Promise<number> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: closureData.startDate,
          lte: closureData.endDate || new Date('2099-12-31')
        }
      }
    });

    return this.calculateRevenueLoss(appointments);
  }
}