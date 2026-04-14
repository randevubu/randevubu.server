/**
 * Cancellation Policy Types
 * Defines types for business cancellation and no-show policies
 */

import { CancellationPolicySettings } from './businessSettings';

export interface PolicyViolationResult {
  isViolation: boolean;
  violationType?: 'CANCELLATION_TIME' | 'DAILY_CANCELLATIONS' | 'MONTHLY_CANCELLATIONS' | 'MONTHLY_NO_SHOWS' | 'BANNED_USER';
  message: string;
  remainingCount?: number;
  nextResetDate?: Date;
  canBookAppointment: boolean;
  canCancelAppointment: boolean;
}

export interface CustomerPolicyStatus {
  customerId: string;
  businessId: string;
  /** Cancellations counted today (Europe/Istanbul calendar day) for daily policy limit */
  currentCancellations: number;
  currentNoShows: number;
  isBanned: boolean;
  bannedUntil?: Date;
  banReason?: string;
  gracePeriodActive: boolean;
  gracePeriodEndsAt?: Date;
  policySettings: CancellationPolicySettings;
  violations: PolicyViolationResult[];
}

export interface PolicyEnforcementContext {
  customerId: string;
  businessId: string;
  appointmentDate?: Date;
  action: 'BOOK' | 'CANCEL' | 'NO_SHOW';
  currentTime: Date;
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: PolicyViolationResult[];
  warnings: string[];
  nextAvailableDate?: Date;
}

export interface DefaultPolicySettings {
  minCancellationHours: number;
  maxDailyCancellations: number;
  maxMonthlyNoShows: number;
  enablePolicyEnforcement: boolean;
  policyWarningMessage: string;
  gracePeriodDays: number;
  autoBanEnabled: boolean;
  banDurationDays: number;
}

export const DEFAULT_CANCELLATION_POLICIES: DefaultPolicySettings = {
  minCancellationHours: 4,
  maxDailyCancellations: 3,
  maxMonthlyNoShows: 2,
  enablePolicyEnforcement: true,
  policyWarningMessage: 'Bu kuralları aşan müşteriler sistemden otomatik olarak engellenecek ve bir daha işletmenizden randevu alamayacaktır. Bu politikalar müşteri deneyimini korumak ve adil bir rezervasyon sistemi sağlamak için uygulanır.',
  gracePeriodDays: 0,
  autoBanEnabled: false,
  banDurationDays: 30
};


