// Usage Domain Types
export interface UsageAlerts {
  smsQuotaAlert: {
    isNearLimit: boolean;
    percentage: number;
    remaining: number;
    quota: number;
  };
  staffLimitAlert: {
    isAtLimit: boolean;
    current: number;
    limit: number;
  };
  customerLimitAlert: {
    isNearLimit: boolean;
    percentage: number;
    current: number;
    limit: number;
  };
  storageLimitAlert: {
    isNearLimit: boolean;
    percentage: number;
    usedMB: number;
    limitMB: number;
  };
}


