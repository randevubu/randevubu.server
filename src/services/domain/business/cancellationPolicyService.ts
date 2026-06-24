/**
 * Cancellation Policy Service
 * Handles business cancellation and no-show policy enforcement
 */

import { CancellationPolicySettings } from '../../../types/businessSettings';
import { AppError } from '../../../types/responseTypes';
import { 
  PolicyViolationResult, 
  CustomerPolicyStatus, 
  PolicyEnforcementContext, 
  PolicyCheckResult,
  DEFAULT_CANCELLATION_POLICIES
} from '../../../types/cancellationPolicy';
import { UserBehaviorRepository } from '../../../repositories/userBehaviorRepository';
import { BusinessRepository } from '../../../repositories/businessRepository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CancellationPolicyService {
  constructor(
    private userBehaviorRepository: UserBehaviorRepository,
    private businessRepository: BusinessRepository
  ) {}

  /** Merge stored JSON with defaults; resolve maxDailyCancellations from legacy maxMonthlyCancellations if needed */
  private normalizeCancellationPolicies(
    raw: Partial<CancellationPolicySettings> & { maxMonthlyCancellations?: number }
  ): CancellationPolicySettings & { maxMonthlyCancellations: number } {
    const maxDailyCancellations =
      raw.maxDailyCancellations ??
      raw.maxMonthlyCancellations ??
      DEFAULT_CANCELLATION_POLICIES.maxDailyCancellations;
    const merged = {
      ...DEFAULT_CANCELLATION_POLICIES,
      ...raw,
      maxDailyCancellations,
      // Always include maxMonthlyCancellations alias so the client can read and send it back
      maxMonthlyCancellations: maxDailyCancellations,
    };
    return merged;
  }

  /**
   * Get business cancellation policy settings
   */
  async getBusinessPolicySettings(businessId: string): Promise<CancellationPolicySettings> {
    const business = await this.businessRepository.findById(businessId);
    
    if (!business || !business.settings) {
      return this.normalizeCancellationPolicies(DEFAULT_CANCELLATION_POLICIES);
    }

    const settings = business.settings as Record<string, unknown>;
    const policies = settings.cancellationPolicies as
      | (Partial<CancellationPolicySettings> & { maxMonthlyCancellations?: number })
      | undefined;

    if (!policies) {
      return this.normalizeCancellationPolicies(DEFAULT_CANCELLATION_POLICIES);
    }

    return this.normalizeCancellationPolicies(policies);
  }

  /**
   * Update business cancellation policy settings
   */
  async updateBusinessPolicySettings(
    businessId: string, 
    policySettings: Partial<CancellationPolicySettings>
  ): Promise<CancellationPolicySettings> {
    const business = await this.businessRepository.findById(businessId);
    
    if (!business) {
      throw new AppError('BUSINESS_NOT_FOUND', { message: 'Business not found' });
    }

    const currentSettings = business.settings as Record<string, unknown> || {};
    const currentPolicies = currentSettings.cancellationPolicies as CancellationPolicySettings || DEFAULT_CANCELLATION_POLICIES;

    const updatedPolicies = this.normalizeCancellationPolicies({
      ...currentPolicies,
      ...policySettings
    });

    const updatedSettings = {
      ...currentSettings,
      cancellationPolicies: updatedPolicies
    };

    await this.businessRepository.update(businessId, {
      settings: updatedSettings
    });

    return updatedPolicies;
  }

  /**
   * Get customer policy status for a specific business
   */
  async getCustomerPolicyStatus(
    customerId: string, 
    businessId: string
  ): Promise<CustomerPolicyStatus> {
    const [userBehavior, policySettings] = await Promise.all([
      this.userBehaviorRepository.findByUserId(customerId),
      this.getBusinessPolicySettings(businessId)
    ]);

    if (!userBehavior) {
      await this.userBehaviorRepository.createOrUpdate(customerId);
      const newBehavior = await this.userBehaviorRepository.findByUserId(customerId);
      if (!newBehavior) {
        throw new AppError('INTERNAL_SERVER_ERROR', { message: 'Failed to create user behavior record' });
      }
      const cancelledThisMonth = await this.userBehaviorRepository.countCanceledThisMonthIstanbul(customerId);
      return await this.buildCustomerPolicyStatus(
        customerId,
        businessId,
        newBehavior,
        policySettings,
        cancelledThisMonth
      );
    }

    const cancelledThisMonth = await this.userBehaviorRepository.countCanceledThisMonthIstanbul(customerId);
    return await this.buildCustomerPolicyStatus(
      customerId,
      businessId,
      userBehavior,
      policySettings,
      cancelledThisMonth
    );
  }

  /**
   * Check if a customer can perform an action based on policies
   */
  async checkPolicyViolations(context: PolicyEnforcementContext): Promise<PolicyCheckResult> {
    const { customerId, businessId, appointmentDate, action } = context;
    
    const customerStatus = await this.getCustomerPolicyStatus(customerId, businessId);
    const violations: PolicyViolationResult[] = [];
    const warnings: string[] = [];

    // Check if user is banned
    if (customerStatus.isBanned) {
      const banViolation: PolicyViolationResult = {
        isViolation: true,
        violationType: 'BANNED_USER',
        message: customerStatus.banReason || 'Bu müşteri sistemden engellenmiştir',
        canBookAppointment: false,
        canCancelAppointment: false
      };
      violations.push(banViolation);
      
      return {
        allowed: false,
        violations,
        warnings
      };
    }

    // Check grace period
    if (customerStatus.gracePeriodActive) {
      return {
        allowed: true,
        violations: [],
        warnings: [`Yeni müşteri olarak ${customerStatus.gracePeriodEndsAt?.toLocaleDateString('tr-TR')} tarihine kadar politika muafiyetiniz bulunmaktadır`]
      };
    }

    // Check cancellation time policy
    // Use real UTC "now" — appointmentDate from DB is a UTC instant; getCurrentTimeInIstanbul() is not
    // a reliable instant on servers whose TZ is not Europe/Istanbul (e.g. Docker UTC).
    if (action === 'CANCEL' && appointmentDate) {
      const nowMs = Date.now();
      const hoursUntilAppointment = (appointmentDate.getTime() - nowMs) / (1000 * 60 * 60);
      
      if (hoursUntilAppointment < customerStatus.policySettings.minCancellationHours) {
        const timeViolation: PolicyViolationResult = {
          isViolation: true,
          violationType: 'CANCELLATION_TIME',
          message: `Randevu iptali için en az ${customerStatus.policySettings.minCancellationHours} saat önceden iptal etmeniz gerekmektedir`,
          canBookAppointment: true,
          canCancelAppointment: false
        };
        violations.push(timeViolation);
      }
    }

    // Daily cancellation cap (Istanbul calendar day): blocks new bookings only
    if (
      action === 'BOOK' &&
      customerStatus.currentCancellations >= customerStatus.policySettings.maxDailyCancellations
    ) {
      const cancellationViolation: PolicyViolationResult = {
        isViolation: true,
        violationType: 'DAILY_CANCELLATIONS',
        message: `Bu ay ${customerStatus.policySettings.maxDailyCancellations} iptal hakkınızı kullandınız. Yeni randevu almak için gelecek ayı bekleyiniz.`,
        remainingCount: 0,
        canBookAppointment: false,
        canCancelAppointment: true
      };
      violations.push(cancellationViolation);
    }

    // Check monthly no-show limit
    if (action === 'NO_SHOW' && customerStatus.currentNoShows >= customerStatus.policySettings.maxMonthlyNoShows) {
      const noShowViolation: PolicyViolationResult = {
        isViolation: true,
        violationType: 'MONTHLY_NO_SHOWS',
        message: `Aylık maksimum gelmeme sayısına ulaştınız (${customerStatus.policySettings.maxMonthlyNoShows})`,
        remainingCount: 0,
        canBookAppointment: false,
        canCancelAppointment: true
      };
      violations.push(noShowViolation);
    }

    // Check if booking is allowed based on no-show violations
    if (action === 'BOOK' && customerStatus.currentNoShows >= customerStatus.policySettings.maxMonthlyNoShows) {
      const noShowViolation: PolicyViolationResult = {
        isViolation: true,
        violationType: 'MONTHLY_NO_SHOWS',
        message: `Bu ay ${customerStatus.policySettings.maxMonthlyNoShows} gelmeme limitinize ulaştınız. Yeni randevu almak için gelecek ayı bekleyiniz.`,
        remainingCount: 0,
        canBookAppointment: false,
        canCancelAppointment: true
      };
      violations.push(noShowViolation);
    }

    const hasViolations = violations.some(v => v.isViolation);
    const allowed = !hasViolations;

    return {
      allowed,
      violations,
      warnings
    };
  }

  /**
   * Handle policy violation (e.g., add strikes, ban user)
   */
  async handlePolicyViolation(
    customerId: string, 
    businessId: string, 
    violationType: string, 
    reason: string
  ): Promise<void> {
    const policySettings = await this.getBusinessPolicySettings(businessId);
    
    if (!policySettings.autoBanEnabled) {
      return;
    }

    // Add strike for policy violation
    await this.userBehaviorRepository.addStrike(customerId, reason);

    // Check if user should be banned based on strikes
    const userBehavior = await this.userBehaviorRepository.findByUserId(customerId);
    if (userBehavior && userBehavior.currentStrikes >= 3) {
      await this.userBehaviorRepository.banUser(
        customerId, 
        `Policy violation: ${reason}`, 
        policySettings.banDurationDays || 30
      );
    }
  }

  /**
   * Build customer policy status from user behavior data
   */
  private async buildCustomerPolicyStatus(
    customerId: string,
    businessId: string,
    userBehavior: any,
    policySettings: CancellationPolicySettings,
    cancellationsToday: number
  ): Promise<CustomerPolicyStatus> {
    const now = new Date();
    const gracePeriodEndsAt = new Date(userBehavior.createdAt);
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + (policySettings.gracePeriodDays || 0));
    
    const gracePeriodActive = (policySettings.gracePeriodDays || 0) > 0 && now < gracePeriodEndsAt;

    // Check per-business ban (replaces global UserBehavior.isBanned)
    const now2 = new Date();
    const businessBan = await prisma.businessBan.findUnique({
      where: { userId_businessId: { userId: customerId, businessId } },
    });
    const isBusinessBanned = !!(businessBan?.isActive && (!businessBan.bannedUntil || businessBan.bannedUntil > now2));

    return {
      customerId,
      businessId,
      currentCancellations: cancellationsToday,
      currentNoShows: userBehavior.noShowsThisMonth || 0,
      isBanned: isBusinessBanned,
      bannedUntil: isBusinessBanned ? (businessBan?.bannedUntil ?? undefined) : undefined,
      banReason: isBusinessBanned ? businessBan?.reason : undefined,
      gracePeriodActive,
      gracePeriodEndsAt: gracePeriodActive ? gracePeriodEndsAt : undefined,
      policySettings,
      violations: []
    };
  }
}
