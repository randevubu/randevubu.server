# SMS Notification Flow Analysis

## Current Behavior After Appointment Creation

### ✅ Customer SMS (REQUIRED - Always Attempted)

**Status**: ✅ **Always sent** (if customer has phone number)

**Implementation**:
- Method: `sendCustomerBookingConfirmation()` in `appointmentService.ts`
- Uses: `sendCriticalSMS()` - bypasses business settings
- Message: Turkish confirmation message with appointment details
- Timing: Immediately after appointment creation
- Success Rate: High (only fails if customer has no phone number)

**Code Location**: `src/services/domain/appointment/appointmentService.ts:1279-1331`

```typescript
// Always sends SMS - this is a critical transactional message
private async sendCustomerBookingConfirmation(...) {
  const result = await this.notificationGateway.sendCriticalSMS(
    customer.phoneNumber,
    message,
    { requestId: `booking-${appointment.id}` }
  );
}
```

**Message Format**:
```
Randevunuz onaylandı!

[Business Name]
[Service Name]
[Date] - [Time]

İptal için: https://randevubu.com/appointments/[appointmentId]
```

---

### ⚠️ Business Owner SMS (OPTIONAL - Based on Settings)

**Status**: ⚠️ **Optional** - Only if enabled in business settings

**Implementation**:
- Method: `notifyNewAppointment()` in `appointmentService.ts`
- Uses: `sendSystemAlert()` - respects business notification settings
- Recipient: Business owner (`business.ownerId`)
- Timing: Immediately after appointment creation
- Success Rate: Depends on settings

**Requirements**:
1. ✅ Business notification settings must have `smsEnabled: true`
2. ✅ Owner must have phone number in their user account
3. ✅ SMS quota must be available
4. ✅ Not in quiet hours (if configured)

**Code Location**: `src/services/domain/appointment/appointmentService.ts:1204-1273`

```typescript
// Use unified notification gateway - respects all business settings
const result = await this.notificationGateway.sendSystemAlert({
  businessId: appointment.businessId,
  userId: business.ownerId,  // Only owner, not staff!
  title: 'New Appointment Booking',
  body: `${customer.firstName} ${customer.lastName} booked ${service.name}...`,
  ...
});
```

**Message Format**:
```
New Appointment Booking

[Customer Name] booked [Service Name] for [Date] at [Time]
```

**Default Setting**: `smsEnabled: false` (SMS disabled by default)

---

### ❌ Staff Member SMS (NOT IMPLEMENTED)

**Status**: ❌ **Not implemented** - Staff members do NOT get SMS notifications

**Current Behavior**:
- Appointments can be assigned to staff members (`appointment.staffId`)
- When appointment is created, notification is sent ONLY to business owner
- The assigned staff member does NOT receive any notification

**Code Issue**: 
- `notifyNewAppointment()` only sends to `business.ownerId`
- Does NOT check `appointment.staffId` or send to assigned staff

**Location**: `src/services/domain/appointment/appointmentService.ts:1246`
```typescript
userId: business.ownerId,  // ❌ Only owner, staff not included!
```

---

## Summary

| Recipient | SMS Sent? | Required? | Settings Required |
|-----------|-----------|-----------|------------------|
| **Customer** | ✅ Yes | ✅ **ALWAYS** (if phone exists) | None - uses `sendCriticalSMS` |
| **Business Owner** | ⚠️ Maybe | ❌ Optional | `smsEnabled: true` in business settings |
| **Assigned Staff** | ❌ No | ❌ Not implemented | N/A |

---

## Recommendations

### 1. ✅ Customer SMS - Working Correctly
- Already uses critical SMS (always attempts)
- No changes needed

### 2. ⚠️ Business Owner SMS - Needs Documentation
- Should document that SMS must be enabled in business settings
- Consider making it default ON for new businesses

### 3. ❌ Staff Member SMS - Missing Feature
- **CRITICAL**: Staff members should receive SMS when assigned to appointments
- Need to add logic to send SMS to assigned staff member if:
  - `appointment.staffId` exists
  - Staff member has phone number
  - Business has `smsEnabled: true`
  - Staff member has notification preferences enabled

---

## Proposed Fix for Staff Notifications

Add staff notification logic in `notifyNewAppointment()`:

```typescript
// After sending to owner, check if staff is assigned
if (appointment.staffId) {
  const staff = await this.repositories.staffRepository.findById(appointment.staffId);
  if (staff?.userId && staff.user?.phoneNumber) {
    // Send notification to assigned staff member
    await this.notificationGateway.sendSystemAlert({
      businessId: appointment.businessId,
      userId: staff.userId,  // Staff member's user ID
      title: 'New Appointment Assigned',
      body: `You have been assigned: ${customer.firstName} ${customer.lastName} - ${service.name} on ${appointmentDate} at ${appointmentTime}`,
      appointmentId: appointment.id,
      ...
    });
  }
}
```

---

## Testing Checklist

- [x] Customer gets SMS when appointment is created (if phone exists)
- [x] Business owner gets SMS only if `smsEnabled: true`
- [ ] Staff member gets SMS when assigned (NOT IMPLEMENTED)
- [x] SMS respects quiet hours (for business owner)
- [x] SMS respects quota limits (for business owner)
- [x] Customer SMS bypasses all settings (critical message)

---

## Related Files

- `src/services/domain/appointment/appointmentService.ts` - Main appointment creation logic
- `src/services/domain/notification/unifiedNotificationGateway.ts` - Notification routing
- `src/services/domain/sms/smsService.ts` - SMS sending service
- `prisma/schema.prisma` - Database schema (BusinessNotificationSettings, Appointment)







