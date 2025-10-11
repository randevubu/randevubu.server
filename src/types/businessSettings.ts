/**
 * Business Settings Types
 * Defines the structure of business settings stored in the database
 */

import { CustomerManagementSettings } from './customerManagement';

export interface PriceVisibilitySettings {
  hideAllServicePrices?: boolean;
  showPricesToCustomers?: boolean;
  currency?: string;
}

export interface StaffPrivacySettings {
  hideStaffNames?: boolean;
  staffDisplayMode?: 'NAMES' | 'ROLES' | 'GENERIC';
  customStaffLabels?: Record<string, string>;
}

export interface CancellationPolicySettings {
  minCancellationHours: number;
  maxMonthlyCancellations: number;
  maxMonthlyNoShows: number;
  enablePolicyEnforcement: boolean;
  policyWarningMessage?: string;
  gracePeriodDays?: number;
  autoBanEnabled?: boolean;
  banDurationDays?: number;
}

export interface BusinessSettings {
  priceVisibility?: PriceVisibilitySettings;
  staffPrivacy?: StaffPrivacySettings;
  cancellationPolicies?: CancellationPolicySettings;
  customerManagement?: CustomerManagementSettings;
  timezone?: string;
  currency?: string;
  language?: string;
  notifications?: {
    emailReminders?: boolean;
    smsReminders?: boolean;
    pushNotifications?: boolean;
  };
  booking?: {
    allowOnlineBooking?: boolean;
    requireApproval?: boolean;
    advanceBookingDays?: number;
  };
}

export interface AppointmentWithBusinessSettings {
  business?: {
    settings?: BusinessSettings;
  };
}

export interface StaffDisplayInfo {
  displayName?: string;
  role?: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface FilteredAppointmentData {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: string;
  price: number | unknown;
  currency: string;
  customerNotes?: string;
  business?: {
    id: string;
    name: string;
    settings?: BusinessSettings;
  };
  service?: {
    id: string;
    name: string;
    duration: number;
    price: number | unknown;
    currency: string;
    showPrice: boolean;
  };
  staff?: StaffDisplayInfo;
  customer?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
  };
}
