# Frontend SMS Removal Guide

## Overview

**Decision**: SMS notifications have been removed for business owners and staff members. They will only receive **push notifications**. SMS is now reserved exclusively for **customers** when they book appointments.

**Date**: 2025-11-04

---

## What Changed

### ✅ Backend Changes (Completed)

1. **Removed SMS from Business Owner/Staff Notifications**
   - Modified `determineEnabledChannelsForBusiness()` in `unifiedNotificationGateway.ts`
   - SMS channel is no longer included for system alerts (new appointments, cancellations, etc.)
   - Business owners and staff now receive **push notifications only**

2. **Customer SMS Remains Intact**
   - Customer booking confirmations still send SMS via `sendCriticalSMS()`
   - This is a critical transactional message and bypasses all settings
   - No changes to customer SMS functionality

---

## Frontend Changes Required

### 1. Remove SMS Toggle from Business Notification Settings

**Location**: Business notification settings page/component

**Action**: Remove or hide the SMS toggle/checkbox for business notification settings

**API Endpoint**: 
- `GET /api/v1/businesses/my-business/notification-settings`
- `PUT /api/v1/businesses/my-business/notification-settings`

**What to Remove**:
```typescript
// ❌ REMOVE THIS from UI
smsEnabled: boolean  // Remove SMS toggle for business owners/staff
```

**Note**: The API may still return `smsEnabled` in the response (for backward compatibility), but it will be **ignored** by the backend. Frontend should hide this field from the UI.

---

### 2. Update Notification Settings UI

**Before**:
```
Business Notification Settings:
☑️ Enable Appointment Reminders
☑️ Push Notifications
☑️ SMS Notifications  ← REMOVE THIS
☑️ Email Notifications
```

**After**:
```
Business Notification Settings:
☑️ Enable Appointment Remointments
☑️ Push Notifications
☑️ Email Notifications
```

---

### 3. Update API Request Handling

**When updating notification settings**, you can either:

**Option A**: Don't send `smsEnabled` in the request (recommended)
```typescript
// ✅ CORRECT - Don't include smsEnabled
const updateData = {
  enableAppointmentReminders: true,
  pushEnabled: true,
  emailEnabled: false,
  reminderChannels: ['PUSH'],
  // smsEnabled is removed - don't send it
};
```

**Option B**: If you must send it, backend will ignore it
```typescript
// ⚠️ Backend will ignore smsEnabled, but it's better to not send it
const updateData = {
  enableAppointmentReminders: true,
  pushEnabled: true,
  smsEnabled: false,  // Backend ignores this now
  emailEnabled: false,
};
```

---

### 4. Update Documentation/Tooltips

**Remove any references to SMS for business owners/staff**:

- ❌ "Enable SMS notifications for new appointments"
- ❌ "Receive SMS when customers book appointments"
- ❌ "SMS notifications for business owners"

**Replace with**:
- ✅ "Push notifications are sent for new appointments"
- ✅ "Receive push notifications when customers book appointments"
- ✅ "Push notifications for business owners and staff"

---

### 5. Customer Reminder Settings (Still Supported)

**Important**: SMS is still available for **customer appointment reminders** (not business owner notifications)

If your UI has reminder channel selection for customers, **keep SMS there**:
```typescript
// ✅ KEEP THIS - This is for customer reminders, not business owner
reminderChannels: ['PUSH', 'SMS', 'EMAIL']  // Customer can choose SMS
```

---

## API Response Changes

### GET `/api/v1/businesses/my-business/notification-settings`

**Response Structure** (may still include `smsEnabled` but it's ignored):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "businessId": "...",
    "enableAppointmentReminders": true,
    "reminderChannels": ["PUSH"],  // SMS removed from business owner notifications
    "reminderTiming": [60, 1440],
    "smsEnabled": false,  // ⚠️ Still in response but IGNORED by backend
    "pushEnabled": true,  // ✅ Use this for business owners/staff
    "emailEnabled": false,
    "timezone": "Europe/Istanbul"
  }
}
```

**Frontend Action**: 
- Display `pushEnabled` toggle
- Hide or ignore `smsEnabled` field
- Don't show SMS option for business notification settings

---

## Testing Checklist

After making frontend changes, verify:

- [ ] SMS toggle is removed from business notification settings UI
- [ ] Business owner receives push notifications when appointments are created
- [ ] Business owner does NOT receive SMS for new appointments
- [ ] Customer still receives SMS when booking appointments (unchanged)
- [ ] Customer can still select SMS in reminder preferences (if applicable)
- [ ] No errors when updating notification settings without `smsEnabled`

---

## Migration Notes

### Existing Users
- Existing settings with `smsEnabled: true` will be ignored
- Business owners will automatically receive push notifications only
- No data migration needed - backend handles it gracefully

### Backward Compatibility
- API still accepts `smsEnabled` in requests (for backward compatibility)
- Backend ignores `smsEnabled` for business owner/staff notifications
- Frontend should remove UI elements to avoid confusion

---

## Related Files (Backend)

- `src/services/domain/notification/unifiedNotificationGateway.ts`
  - `determineEnabledChannelsForBusiness()` - SMS removed
- `src/services/domain/appointment/appointmentService.ts`
  - `notifyNewAppointment()` - Uses system alerts (push only now)
  - `sendCustomerBookingConfirmation()` - Customer SMS (unchanged)

---

## Summary

| Recipient | SMS Available? | Notification Type |
|-----------|----------------|------------------|
| **Customer** | ✅ Yes | SMS for booking confirmation (always) |
| **Business Owner** | ❌ No | Push notifications only |
| **Staff Member** | ❌ No | Push notifications only |

---

## Questions?

If you have questions about this change:
1. Check the backend code comments in `unifiedNotificationGateway.ts`
2. Review the updated `SMS_NOTIFICATION_FLOW_ANALYSIS.md`
3. Test with the API endpoints to verify behavior




