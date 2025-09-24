# Frontend Usage Control Implementation Guide

This document outlines all frontend changes needed to integrate with the new backend usage control system. The backend is fully protected - these changes are for improved user experience.

## Overview

The backend now enforces subscription limits for:
- SMS sending
- Staff member creation
- Service creation
- Customer/appointment creation

All violations return specific error codes with 403 HTTP status.

## 1. Error Code Translations (HIGH PRIORITY)

Add these new error codes to your translation files:

### Turkish Translations (`tr.json`)
```json
{
  "errors": {
    "business": {
      "smsQuotaExceeded": "SMS kotanız dolmuş. Paketinizi yükseltin veya yeni döngüyü bekleyin.",
      "staffLimitExceeded": "Personel limitiniz dolmuş. Daha fazla personel eklemek için paketinizi yükseltin.",
      "serviceLimitExceeded": "Hizmet limitiniz dolmuş. Daha fazla hizmet eklemek için paketinizi yükseltin.",
      "customerLimitExceeded": "Müşteri limitiniz dolmuş. Daha fazla müşteri eklemek için paketinizi yükseltin."
    }
  }
}
```

### English Translations (`en.json`)
```json
{
  "errors": {
    "business": {
      "smsQuotaExceeded": "SMS quota exceeded. Upgrade your plan or wait for the next cycle.",
      "staffLimitExceeded": "Staff limit reached. Upgrade your plan to add more staff members.",
      "serviceLimitExceeded": "Service limit reached. Upgrade your plan to add more services.",
      "customerLimitExceeded": "Customer limit reached. Upgrade your plan to add more customers."
    }
  }
}
```

## 2. Error Handler Updates (HIGH PRIORITY)

Update your API error handler to recognize the new error codes:

```javascript
// Add to your error handling service/utility
const QUOTA_ERROR_CODES = [
  'SMS_QUOTA_EXCEEDED',
  'STAFF_LIMIT_EXCEEDED',
  'SERVICE_LIMIT_EXCEEDED',
  'CUSTOMER_LIMIT_EXCEEDED'
];

function handleApiError(error) {
  if (error.response?.status === 403 && QUOTA_ERROR_CODES.includes(error.response?.data?.code)) {
    // Show upgrade prompt or quota exceeded modal
    showQuotaExceededDialog(error.response.data);
    return;
  }

  // Handle other errors...
}

function showQuotaExceededDialog(errorData) {
  // Show modal with:
  // - Error message from translations
  // - Current usage stats
  // - Upgrade plan button
  // - "Understood" button
}
```

## 3. Proactive Usage Checking (MEDIUM PRIORITY)

Use existing endpoints to prevent user frustration:

### Usage Limits Check Hook
```javascript
// Custom React hook for checking limits
import { useState, useEffect } from 'react';
import { usageApi } from './api';

export function useUsageLimits(businessId) {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLimits() {
      try {
        const response = await usageApi.checkLimits(businessId);
        setLimits(response.data);
      } catch (error) {
        console.error('Failed to fetch usage limits:', error);
      } finally {
        setLoading(false);
      }
    }

    if (businessId) {
      fetchLimits();
    }
  }, [businessId]);

  return {
    limits,
    loading,
    canSendSms: limits?.sms?.allowed ?? true,
    canAddStaff: limits?.staff?.allowed ?? true,
    canAddService: limits?.service?.allowed ?? true,
    canAddCustomer: limits?.customer?.allowed ?? true,
    refresh: () => fetchLimits()
  };
}
```

### Button Disabling Components
```javascript
// Component wrapper for limit-aware buttons
import { useUsageLimits } from './hooks/useUsageLimits';

function LimitAwareButton({
  action, // 'sms', 'staff', 'service', 'customer'
  businessId,
  children,
  onClick,
  ...props
}) {
  const { limits, canSendSms, canAddStaff, canAddService, canAddCustomer } = useUsageLimits(businessId);

  const actionLimits = {
    sms: canSendSms,
    staff: canAddStaff,
    service: canAddService,
    customer: canAddCustomer
  };

  const isAllowed = actionLimits[action];
  const reason = limits?.[action]?.reason;

  return (
    <div>
      <button
        {...props}
        disabled={!isAllowed || props.disabled}
        onClick={isAllowed ? onClick : undefined}
        className={`${props.className} ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {children}
      </button>
      {!isAllowed && (
        <div className="text-red-500 text-sm mt-1">
          {reason || 'Limit reached'}
        </div>
      )}
    </div>
  );
}

// Usage examples:
<LimitAwareButton action="staff" businessId={businessId} onClick={handleAddStaff}>
  Add Staff Member
</LimitAwareButton>

<LimitAwareButton action="sms" businessId={businessId} onClick={handleSendSms}>
  Send SMS
</LimitAwareButton>
```

## 4. Usage Dashboard Components (MEDIUM PRIORITY)

### Usage Summary Component
```javascript
import { useState, useEffect } from 'react';
import { usageApi } from './api';

function UsageDashboard({ businessId }) {
  const [usage, setUsage] = useState(null);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    Promise.all([
      usageApi.getSummary(businessId),
      usageApi.getAlerts(businessId)
    ]).then(([summaryRes, alertsRes]) => {
      setUsage(summaryRes.data);
      setAlerts(alertsRes.data);
    });
  }, [businessId]);

  if (!usage) return <div>Loading...</div>;

  return (
    <div className="usage-dashboard">
      <h3>Usage Summary</h3>

      {/* SMS Usage */}
      <UsageBar
        label="SMS"
        current={usage.currentMonth?.smssSent || 0}
        limit={usage.planLimits.smsQuota}
        isNearLimit={alerts?.smsQuotaAlert?.isNearLimit}
      />

      {/* Staff Usage */}
      <UsageBar
        label="Staff Members"
        current={usage.currentMonth?.staffMembersActive || 0}
        limit={usage.planLimits.maxStaffPerBusiness}
        isAtLimit={alerts?.staffLimitAlert?.isAtLimit}
      />

      {/* Services Usage */}
      <UsageBar
        label="Services"
        current={usage.currentMonth?.servicesActive || 0}
        limit={usage.planLimits.maxServices}
      />

      {/* Customer Usage */}
      <UsageBar
        label="Customers"
        current={usage.currentMonth?.customersAdded || 0}
        limit={usage.planLimits.maxCustomers}
        isNearLimit={alerts?.customerLimitAlert?.isNearLimit}
      />
    </div>
  );
}

function UsageBar({ label, current, limit, isNearLimit, isAtLimit }) {
  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  const barColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="usage-bar mb-4">
      <div className="flex justify-between mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-gray-600">
          {current} / {limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isAtLimit && (
        <div className="text-red-500 text-xs mt-1">Limit reached!</div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="text-yellow-600 text-xs mt-1">Approaching limit</div>
      )}
    </div>
  );
}
```

## 5. Form Validation (MEDIUM PRIORITY)

### Real-time Validation in Forms
```javascript
// Add to appointment booking form
function AppointmentForm({ businessId }) {
  const { canAddCustomer } = useUsageLimits(businessId);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleSubmit = async (formData) => {
    if (!canAddCustomer) {
      setShowUpgrade(true);
      return;
    }

    // Continue with appointment creation...
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields... */}

      {!canAddCustomer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-yellow-800">
            Customer limit reached. Upgrade your plan to book more appointments.
          </p>
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="text-yellow-600 underline"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={!canAddCustomer}
        className={!canAddCustomer ? 'opacity-50 cursor-not-allowed' : ''}
      >
        Book Appointment
      </button>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </form>
  );
}
```

## 6. Navigation and Menu Updates (LOW PRIORITY)

### Add Usage Indicators to Navigation
```javascript
function BusinessNavigation({ businessId }) {
  const { limits } = useUsageLimits(businessId);

  return (
    <nav>
      <NavItem
        to="/staff"
        icon={<StaffIcon />}
        label="Staff"
        badge={!limits?.staff?.allowed ? <LimitBadge /> : null}
      />
      <NavItem
        to="/services"
        icon={<ServiceIcon />}
        label="Services"
        badge={!limits?.service?.allowed ? <LimitBadge /> : null}
      />
      {/* Other nav items... */}
    </nav>
  );
}

function LimitBadge() {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Limit
    </span>
  );
}
```

## 7. API Service Updates (HIGH PRIORITY)

Update your API service to handle the new endpoints:

```javascript
// Add to your API service
export const usageApi = {
  async getSummary(businessId) {
    return axios.get(`/api/v1/businesses/${businessId}/usage/summary`);
  },

  async getAlerts(businessId) {
    return axios.get(`/api/v1/businesses/${businessId}/usage/alerts`);
  },

  async checkLimits(businessId) {
    return axios.get(`/api/v1/businesses/${businessId}/usage/limits-check`);
  },

  async getDailySms(businessId, days = 30) {
    return axios.get(`/api/v1/businesses/${businessId}/usage/sms-daily?days=${days}`);
  },

  async getMonthlyHistory(businessId, months = 12) {
    return axios.get(`/api/v1/businesses/${businessId}/usage/monthly-history?months=${months}`);
  }
};
```

## 8. Notification System (MEDIUM PRIORITY)

### Toast Notifications for Quota Events
```javascript
// Add to your notification/toast system
function showQuotaWarning(quotaType, remaining) {
  toast.warning(
    `${quotaType} quota warning: Only ${remaining} remaining this month.`,
    {
      action: {
        label: 'Upgrade',
        onClick: () => navigate('/billing/upgrade')
      }
    }
  );
}

// Call when approaching limits (80%+)
if (alerts?.smsQuotaAlert?.isNearLimit && alerts.smsQuotaAlert.percentage >= 80) {
  showQuotaWarning('SMS', alerts.smsQuotaAlert.remaining);
}
```

## 9. Settings Page Integration (LOW PRIORITY)

### Add Usage Section to Business Settings
```javascript
function BusinessSettings({ businessId }) {
  return (
    <div className="settings">
      {/* Other settings sections... */}

      <section className="usage-settings">
        <h3>Usage & Billing</h3>
        <UsageDashboard businessId={businessId} />

        <div className="actions mt-4">
          <button onClick={() => navigate('/billing/upgrade')}>
            Upgrade Plan
          </button>
          <button onClick={() => navigate('/billing/history')}>
            View Billing History
          </button>
        </div>
      </section>
    </div>
  );
}
```

## Implementation Priority

### Phase 1 (Critical - Implement First)
1. ✅ Error code translations
2. ✅ Error handler updates
3. ✅ API service updates

### Phase 2 (High Value - Implement Next)
1. ✅ Usage limits hook
2. ✅ Button disabling components
3. ✅ Form validation updates

### Phase 3 (Polish - Implement Later)
1. ✅ Usage dashboard
2. ✅ Navigation indicators
3. ✅ Notification system
4. ✅ Settings integration

## Testing

### Test Cases to Verify
1. **Error Handling**: Try to exceed each limit type and verify proper error display
2. **Button States**: Verify buttons disable when limits are reached
3. **Form Validation**: Test form submission when quotas are exceeded
4. **Real-time Updates**: Check that limits refresh after successful operations
5. **Navigation**: Verify limit indicators appear in navigation

### API Testing
```bash
# Test the usage endpoints
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/businesses/biz_123/usage/summary"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/businesses/biz_123/usage/limits-check"
```

## Notes

- **Backend is Fully Protected**: All these frontend changes are for UX improvement only
- **Graceful Degradation**: If frontend checks fail, backend will still enforce limits
- **Real-time Data**: Use the existing usage endpoints for live quota information
- **Subscription Integration**: Limits automatically sync with subscription plan changes

The backend enforcement is complete and working. Implement these frontend changes in phases based on your priorities!