// Usage Domain Types
export interface UsageAlerts {
  smsQuotaAlert: {
    isNearLimit: boolean;
    isAtLimit: boolean;
    percentage: number;
    remaining: number;
    quota: number;
  };
  staffLimitAlert: {
    isNearLimit: boolean;
    isAtLimit: boolean;
    current: number;
    limit: number;
  };
  customerLimitAlert: {
    isNearLimit: boolean;
    isAtLimit: boolean;
    percentage: number;
    current: number;
    limit: number;
  };
  storageLimitAlert: {
    isNearLimit: boolean;
    isAtLimit: boolean;
    percentage: number;
    usedMB: number;
    limitMB: number;
    remaining: number;
  };
}


