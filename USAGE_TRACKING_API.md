# Usage Tracking API - Frontend Integration Guide

## Overview

The Usage Tracking system allows business owners to monitor their subscription usage across various metrics like SMS, appointments, staff members, and customers. This guide provides all the API endpoints and data structures needed for frontend integration.

## Updated Subscription Plans

| Plan | Price (TRY) | SMS/Month | Staff | Appointments/Day | Customers | Services | Storage |
|------|-------------|-----------|-------|------------------|-----------|----------|---------|
| **Starter** | 750 | 1,000 | 3 | 50 | 1,000 | 15 | 2 GB |
| **Professional** | 1,250 | 2,500 | 10 | 150 | 5,000 | 50 | 10 GB |
| **Enterprise** | 2,000 | 5,000 | 50 | 500 | 25,000 | 200 | 50 GB |

## API Endpoints

All endpoints require authentication and business context. Base URL: `/api/v1/businesses/:businessId/usage/`

### 1. Get Usage Summary

**GET** `/api/v1/businesses/:businessId/usage/summary`

Returns current month usage, previous month for comparison, plan limits, and remaining quotas.

**Response:**
```json
{
  "success": true,
  "message": "Usage summary retrieved successfully",
  "data": {
    "currentMonth": {
      "businessId": "biz_123",
      "month": 12,
      "year": 2024,
      "smssSent": 850,
      "appointmentsCreated": 125,
      "staffMembersActive": 7,
      "customersAdded": 2340,
      "servicesActive": 23,
      "storageUsedMB": 1024,
      "apiCallsCount": 450,
      "lastUpdatedAt": "2024-12-15T10:30:00Z"
    },
    "previousMonth": {
      "businessId": "biz_123",
      "month": 11,
      "year": 2024,
      "smssSent": 720,
      "appointmentsCreated": 98,
      "staffMembersActive": 6,
      "customersAdded": 2156,
      "servicesActive": 22,
      "storageUsedMB": 890,
      "apiCallsCount": 380,
      "lastUpdatedAt": "2024-11-30T23:59:59Z"
    },
    "yearToDate": {
      "smssSent": 8450,
      "appointmentsCreated": 1250,
      "customersAdded": 23400
    },
    "planLimits": {
      "smsQuota": 2500,
      "maxStaffPerBusiness": 10,
      "maxAppointmentsPerDay": 150,
      "maxCustomers": 5000,
      "maxServices": 50,
      "storageGB": 10
    },
    "remainingQuotas": {
      "smsRemaining": 1650,
      "staffSlotsRemaining": 3,
      "customerSlotsRemaining": 2660,
      "serviceSlotsRemaining": 27,
      "storageRemaining": 9216
    }
  }
}
```

### 2. Get Usage Alerts

**GET** `/api/v1/businesses/:businessId/usage/alerts`

Returns alerts for quotas that are near (80%+) or at their limits.

**Response:**
```json
{
  "success": true,
  "message": "Usage alerts retrieved successfully",
  "data": {
    "smsQuotaAlert": {
      "isNearLimit": false,
      "percentage": 34.0,
      "remaining": 1650,
      "quota": 2500
    },
    "staffLimitAlert": {
      "isAtLimit": false,
      "current": 7,
      "limit": 10
    },
    "customerLimitAlert": {
      "isNearLimit": false,
      "percentage": 46.8,
      "current": 2340,
      "limit": 5000
    },
    "storageLimitAlert": {
      "isNearLimit": false,
      "percentage": 10.0,
      "usedMB": 1024,
      "limitMB": 10240
    }
  }
}
```

### 3. Get Daily SMS Usage Chart

**GET** `/api/v1/businesses/:businessId/usage/sms-daily?days=30`

Returns daily SMS usage for charts and analytics.

**Query Parameters:**
- `days` (optional): Number of days to retrieve (default: 30, max: 365)

**Response:**
```json
{
  "success": true,
  "message": "Daily SMS usage for last 30 days retrieved successfully",
  "data": [
    {
      "businessId": "biz_123",
      "date": "2024-12-15",
      "smsCount": 45
    },
    {
      "businessId": "biz_123",
      "date": "2024-12-14",
      "smsCount": 32
    },
    {
      "businessId": "biz_123",
      "date": "2024-12-13",
      "smsCount": 28
    }
  ]
}
```

### 4. Get Monthly Usage History

**GET** `/api/v1/businesses/:businessId/usage/monthly-history?months=12`

Returns monthly usage history for trend analysis.

**Query Parameters:**
- `months` (optional): Number of months to retrieve (default: 12, max: 24)

**Response:**
```json
{
  "success": true,
  "message": "Monthly usage history for last 12 months retrieved successfully",
  "data": [
    {
      "businessId": "biz_123",
      "month": 12,
      "year": 2024,
      "smssSent": 850,
      "appointmentsCreated": 125,
      "staffMembersActive": 7,
      "customersAdded": 184,
      "servicesActive": 23,
      "storageUsedMB": 1024,
      "apiCallsCount": 450,
      "lastUpdatedAt": "2024-12-15T10:30:00Z"
    },
    {
      "businessId": "biz_123",
      "month": 11,
      "year": 2024,
      "smssSent": 720,
      "appointmentsCreated": 98,
      "staffMembersActive": 6,
      "customersAdded": 156,
      "servicesActive": 22,
      "storageUsedMB": 890,
      "apiCallsCount": 380,
      "lastUpdatedAt": "2024-11-30T23:59:59Z"
    }
  ]
}
```

### 5. Check Usage Limits

**GET** `/api/v1/businesses/:businessId/usage/limits-check`

Returns whether the business can perform specific actions based on current usage and plan limits.

**Response:**
```json
{
  "success": true,
  "message": "Usage limits check completed successfully",
  "data": {
    "sms": {
      "allowed": true,
      "reason": null
    },
    "staff": {
      "allowed": true,
      "reason": null
    },
    "service": {
      "allowed": true,
      "reason": null
    },
    "customer": {
      "allowed": false,
      "reason": "Customer limit reached. Current: 5000/5000"
    }
  }
}
```

## Frontend Implementation Examples

### 1. Usage Dashboard Component

```typescript
interface UsageSummary {
  currentMonth: MonthlyUsage;
  previousMonth: MonthlyUsage;
  yearToDate: YearToDateUsage;
  planLimits: PlanLimits;
  remainingQuotas: RemainingQuotas;
}

interface MonthlyUsage {
  businessId: string;
  month: number;
  year: number;
  smssSent: number;
  appointmentsCreated: number;
  staffMembersActive: number;
  customersAdded: number;
  servicesActive: number;
  storageUsedMB: number;
  apiCallsCount: number;
  lastUpdatedAt: string;
}

const UsageDashboard: React.FC = () => {
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const { businessId } = useParams();

  useEffect(() => {
    const fetchUsageSummary = async () => {
      try {
        const response = await api.get(`/businesses/${businessId}/usage/summary`);
        setUsageSummary(response.data.data);
      } catch (error) {
        console.error('Failed to fetch usage summary:', error);
      }
    };

    fetchUsageSummary();
  }, [businessId]);

  if (!usageSummary) return <LoadingSpinner />;

  return (
    <div className="usage-dashboard">
      <UsageCards summary={usageSummary} />
      <UsageCharts businessId={businessId} />
      <UsageAlerts businessId={businessId} />
    </div>
  );
};
```

### 2. Usage Progress Bars

```typescript
const UsageProgressBar: React.FC<{ 
  current: number; 
  limit: number; 
  label: string; 
  unit?: string 
}> = ({ current, limit, label, unit = '' }) => {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="usage-progress">
      <div className="usage-header">
        <span className="usage-label">{label}</span>
        <span className="usage-value">
          {current.toLocaleString()}{unit} / {limit.toLocaleString()}{unit}
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className={`progress-fill ${isAtLimit ? 'danger' : isNearLimit ? 'warning' : 'normal'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="usage-percentage">{percentage.toFixed(1)}%</div>
    </div>
  );
};

// Usage
<UsageProgressBar 
  current={usageSummary.currentMonth.smssSent} 
  limit={usageSummary.planLimits.smsQuota} 
  label="SMS Usage"
  unit=" SMS"
/>
```

### 3. SMS Usage Chart

```typescript
const SmsUsageChart: React.FC<{ businessId: string }> = ({ businessId }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await api.get(`/businesses/${businessId}/usage/sms-daily?days=30`);
        setChartData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch SMS chart data:', error);
      }
    };

    fetchChartData();
  }, [businessId]);

  return (
    <LineChart width={600} height={300} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="smsCount" stroke="#8884d8" />
    </LineChart>
  );
};
```

### 4. Usage Alerts Component

```typescript
const UsageAlerts: React.FC<{ businessId: string }> = ({ businessId }) => {
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await api.get(`/businesses/${businessId}/usage/alerts`);
        setAlerts(response.data.data);
      } catch (error) {
        console.error('Failed to fetch usage alerts:', error);
      }
    };

    fetchAlerts();
  }, [businessId]);

  if (!alerts) return null;

  const activeAlerts = [];
  
  if (alerts.smsQuotaAlert.isNearLimit) {
    activeAlerts.push({
      type: 'warning',
      title: 'SMS Quota Warning',
      message: `You've used ${alerts.smsQuotaAlert.percentage.toFixed(1)}% of your SMS quota`
    });
  }

  if (alerts.staffLimitAlert.isAtLimit) {
    activeAlerts.push({
      type: 'error',
      title: 'Staff Limit Reached',
      message: `You've reached your staff limit (${alerts.staffLimitAlert.current}/${alerts.staffLimitAlert.limit})`
    });
  }

  return (
    <div className="usage-alerts">
      {activeAlerts.map((alert, index) => (
        <Alert key={index} type={alert.type} title={alert.title} message={alert.message} />
      ))}
    </div>
  );
};
```

### 5. Pre-action Validation

```typescript
const useUsageLimits = (businessId: string) => {
  const [limits, setLimits] = useState(null);

  const checkLimits = async () => {
    try {
      const response = await api.get(`/businesses/${businessId}/usage/limits-check`);
      setLimits(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to check usage limits:', error);
      return null;
    }
  };

  const canSendSms = () => limits?.sms?.allowed || false;
  const canAddStaff = () => limits?.staff?.allowed || false;
  const canAddService = () => limits?.service?.allowed || false;
  const canAddCustomer = () => limits?.customer?.allowed || false;

  return {
    limits,
    checkLimits,
    canSendSms,
    canAddStaff,
    canAddService,
    canAddCustomer
  };
};

// Usage in component
const CreateStaffModal: React.FC = () => {
  const { businessId } = useParams();
  const { canAddStaff, checkLimits } = useUsageLimits(businessId);

  const handleCreateStaff = async () => {
    const currentLimits = await checkLimits();
    
    if (!currentLimits.staff.allowed) {
      showError(currentLimits.staff.reason);
      return;
    }

    // Proceed with staff creation
  };
};
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_NOT_FOUND",
    "message": "Business subscription not found",
    "timestamp": "2024-12-15T10:30:00Z"
  }
}
```

Common error codes:
- `BUSINESS_NOT_FOUND`: Business or subscription not found
- `VALIDATION_ERROR`: Invalid query parameters
- `FORBIDDEN`: Insufficient permissions
- `UNAUTHORIZED`: Authentication required

## Best Practices

1. **Caching**: Cache usage data for 5-10 minutes to reduce API calls
2. **Real-time Updates**: Refresh usage data after actions that consume quotas
3. **Progressive Loading**: Load critical usage metrics first, then detailed charts
4. **Offline Handling**: Show last known usage data when offline
5. **Validation**: Always check limits before allowing quota-consuming actions
6. **Visual Indicators**: Use colors and icons to indicate usage levels (green < 50%, yellow 50-80%, red > 80%)

## Mobile Considerations

- Prioritize critical metrics on smaller screens
- Use collapsible sections for detailed usage data
- Implement pull-to-refresh for usage updates
- Show simplified charts optimized for mobile viewing

This comprehensive API allows you to build a complete usage tracking dashboard that helps business owners monitor their subscription usage and optimize their plan utilization.