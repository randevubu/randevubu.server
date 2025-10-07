import {
  UsageRepository,
  UsageMetrics,
  DailyUsageMetrics,
  UsageSummary
} from '../../../repositories/usageRepository';
import { RBACService } from '../rbac';
import { PermissionName } from '../../../types/auth';
import { RepositoryContainer } from '../../../repositories';

import { UsageAlerts } from '../../../types/usage';

export class UsageService {
  constructor(
    private usageRepository: UsageRepository,
    private rbacService: RBACService,
    private repositories: RepositoryContainer
  ) {}

  async getBusinessUsageSummary(
    userId: string,
    businessId: string
  ): Promise<UsageSummary | null> {
    // Check permissions
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VIEW_OWN_ANALYTICS
    );

    return await this.usageRepository.getUsageSummary(businessId);
  }

  async getDailyUsageChart(
    userId: string,
    businessId: string,
    days: number = 30
  ): Promise<DailyUsageMetrics[]> {
    // Check permissions
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VIEW_OWN_ANALYTICS
    );

    return await this.usageRepository.getDailySmsUsage(businessId, days);
  }

  async getMonthlyUsageHistory(
    userId: string,
    businessId: string,
    months: number = 12
  ): Promise<UsageMetrics[]> {
    // Check permissions
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VIEW_OWN_ANALYTICS
    );

    return await this.usageRepository.getMonthlyUsageHistory(businessId, months);
  }

  async getUsageAlerts(
    userId: string,
    businessId: string
  ): Promise<UsageAlerts | null> {
    // Check permissions
    await this.rbacService.requirePermission(
      userId,
      PermissionName.VIEW_OWN_ANALYTICS
    );

    const summary = await this.usageRepository.getUsageSummary(businessId);
    if (!summary) return null;

    const smsUsagePercentage = summary.planLimits.smsQuota > 0
      ? (summary.currentMonth?.smssSent || 0) / summary.planLimits.smsQuota * 100
      : 0;

    const customerUsagePercentage = summary.planLimits.maxCustomers > 0
      ? (summary.currentMonth?.customersAdded || 0) / summary.planLimits.maxCustomers * 100
      : 0;

    const storageUsagePercentage = summary.planLimits.storageGB > 0
      ? (summary.currentMonth?.storageUsedMB || 0) / (summary.planLimits.storageGB * 1024) * 100
      : 0;

    return {
      smsQuotaAlert: {
        isNearLimit: smsUsagePercentage >= 80,
        percentage: smsUsagePercentage,
        remaining: summary.remainingQuotas.smsRemaining,
        quota: summary.planLimits.smsQuota
      },
      staffLimitAlert: {
        isAtLimit: (summary.currentMonth?.staffMembersActive || 0) >= summary.planLimits.maxStaffPerBusiness,
        current: summary.currentMonth?.staffMembersActive || 0,
        limit: summary.planLimits.maxStaffPerBusiness
      },
      customerLimitAlert: {
        isNearLimit: false, // Unlimited customers
        percentage: 0,
        current: summary.currentMonth?.customersAdded || 0,
        limit: 0 // Unlimited
      },
      storageLimitAlert: {
        isNearLimit: false, // Unlimited storage
        percentage: 0,
        usedMB: summary.currentMonth?.storageUsedMB || 0,
        limitMB: 0 // Unlimited
      }
    };
  }

  // Method to be called when SMS is sent
  async recordSmsUsage(businessId: string, count: number = 1): Promise<void> {
    await this.usageRepository.incrementSmsUsage(businessId, count);
    
    // Check if usage exceeds limits and potentially send alerts
    const summary = await this.usageRepository.getUsageSummary(businessId);
    if (summary && summary.currentMonth && summary.currentMonth.smssSent > summary.planLimits.smsQuota) {
      // Here you could integrate with notification service to alert business owner
      console.warn(`Business ${businessId} has exceeded SMS quota: ${summary.currentMonth.smssSent}/${summary.planLimits.smsQuota}`);
    }
  }

  // Method to be called when appointment is created
  async recordAppointmentUsage(businessId: string, count: number = 1): Promise<void> {
    await this.usageRepository.incrementAppointmentUsage(businessId, count);
  }

  // Method to be called when staff is added/removed
  async updateStaffUsage(businessId: string): Promise<void> {
    await this.usageRepository.updateActiveStaffCount(businessId);
  }

  // Method to be called when customer is added
  async recordCustomerUsage(businessId: string, count: number = 1): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await this.repositories.usageRepository.recordCustomerUsage(businessId, count);
  }

  // Method to be called when service is added/removed  
  async updateServiceUsage(businessId: string): Promise<void> {
    await this.repositories.usageRepository.updateServiceUsage(businessId);
  }

  // Check if business can perform action based on limits
  async canSendSms(businessId: string): Promise<{ allowed: boolean; reason?: string }> {
    const summary = await this.usageRepository.getUsageSummary(businessId);
    if (!summary) {
      return { allowed: false, reason: 'Business subscription not found' };
    }

    const currentUsage = summary.currentMonth?.smssSent || 0;
    if (currentUsage >= summary.planLimits.smsQuota) {
      return {
        allowed: false,
        reason: `SMS quota exceeded. Used ${currentUsage}/${summary.planLimits.smsQuota} for this month.`
      };
    }

    return { allowed: true };
  }

  async canAddStaffMember(businessId: string): Promise<{ allowed: boolean; reason?: string }> {
    const summary = await this.usageRepository.getUsageSummary(businessId);
    if (!summary) {
      return { allowed: false, reason: 'Business subscription not found' };
    }

    const currentStaff = summary.currentMonth?.staffMembersActive || 0;
    if (currentStaff >= summary.planLimits.maxStaffPerBusiness) {
      return {
        allowed: false,
        reason: `Staff limit reached. Current: ${currentStaff}/${summary.planLimits.maxStaffPerBusiness}`
      };
    }

    return { allowed: true };
  }

  async canAddService(businessId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Unlimited services allowed
    return { allowed: true };
  }

  async canAddCustomer(businessId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Unlimited customers allowed
    return { allowed: true };
  }
}
