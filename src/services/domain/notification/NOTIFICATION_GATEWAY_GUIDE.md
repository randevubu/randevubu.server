# Unified Notification Gateway - Usage Guide

## Overview

The **UnifiedNotificationGateway** is your single entry point for ALL notifications across the application. It automatically respects:

- ✅ Business notification settings (enabled channels, quiet hours)
- ✅ User notification preferences (opt-outs, preferred channels, quiet hours)
- ✅ SMS quota limits
- ✅ Rate limiting
- ✅ Channel availability

## Why Use the Gateway?

**Before (scattered notifications):**
```typescript
// ❌ Old way - manually checking settings everywhere
const businessSettings = await getBusinessSettings(businessId);
if (businessSettings.pushEnabled) {
  await notificationService.sendPushNotification(...);
}
if (businessSettings.smsEnabled) {
  const canSend = await checkSMSQuota(...);
  if (canSend) {
    await smsService.sendSMS(...);
  }
}
```

**After (using gateway):**
```typescript
// ✅ New way - all checks handled automatically
const result = await notificationGateway.sendSystemAlert({
  businessId,
  userId,
  title: 'New Appointment',
  body: 'You have a new booking!',
  appointmentId,
  data: { ... }
});
// That's it! Settings, quotas, quiet hours all checked automatically
```

## Initialization

```typescript
import { UnifiedNotificationGateway } from './services/domain/notification';

const gateway = new UnifiedNotificationGateway(
  prisma,
  repositories,
  usageService // optional, for SMS quota checking
);
```

## Methods

### 1. `sendTransactional()` - For Critical Messages

Use for **appointment confirmations, reminders, booking updates** - messages users EXPECT to receive.

```typescript
const result = await gateway.sendTransactional({
  businessId: 'biz_123',
  customerId: 'user_456',
  title: 'Appointment Reminder',
  body: 'Your appointment is tomorrow at 2 PM',
  appointmentId: 'apt_789',
  data: {
    appointmentDate: '2025-01-20',
    serviceName: 'Haircut'
  },
  url: '/appointments/apt_789',

  // Optional overrides for critical messages
  forceChannels: [NotificationChannel.SMS, NotificationChannel.PUSH], // Force specific channels
  ignoreQuietHours: true // Send even during quiet hours (use sparingly!)
});

// Check results
if (result.success) {
  console.log(`Sent via: ${result.sentChannels.join(', ')}`);
} else {
  console.log(`Skipped: ${result.skippedChannels.map(sc => sc.reason).join(', ')}`);
}
```

### 2. `sendSystemAlert()` - For Business Owner Notifications

Use for **new bookings, cancellations, staff alerts** - notifications TO the business.

```typescript
const result = await gateway.sendSystemAlert({
  businessId: 'biz_123',
  userId: 'owner_456', // Business owner or staff member
  title: 'New Appointment',
  body: 'John Doe booked Haircut for tomorrow at 2 PM',
  appointmentId: 'apt_789',
  data: {
    customerName: 'John Doe',
    serviceName: 'Haircut',
    appointmentDate: '2025-01-20'
  },
  url: '/appointments/apt_789'
});
```

### 3. `sendMarketing()` - For Promotional Messages

Use for **promotions, announcements, holiday greetings** - ALWAYS respects all settings.

```typescript
const results = await gateway.sendMarketing({
  businessId: 'biz_123',
  customerIds: ['user_1', 'user_2', 'user_3'],
  title: 'Special Offer!',
  body: '20% off all services this weekend!',
  data: {
    promoCode: 'WEEKEND20',
    validUntil: '2025-01-25'
  },
  url: '/promotions/weekend20'
});

// Results is an array (one per customer)
results.forEach((result, index) => {
  console.log(`Customer ${index + 1}: ${result.success ? 'sent' : 'skipped'}`);
});
```

### 4. `sendBulk()` - For Batch Operations

Use for **closure notifications, mass updates** - efficient bulk sending.

```typescript
const { successful, failed, results } = await gateway.sendBulk({
  businessId: 'biz_123',
  recipients: [
    {
      customerId: 'user_1',
      personalizedData: { appointmentTime: '2 PM' }
    },
    {
      customerId: 'user_2',
      personalizedData: { appointmentTime: '3 PM' }
    }
  ],
  title: 'Business Closure Notice',
  body: 'We will be closed on Jan 25. Your appointment has been rescheduled.',
  baseData: {
    closureDate: '2025-01-25',
    reason: 'Holiday'
  },
  url: '/closures/cls_123'
});

console.log(`✅ Sent: ${successful}, ❌ Failed: ${failed}`);
```

### 5. `sendCriticalSMS()` - For Security Messages ONLY

Use **ONLY for verification codes, password resets** - bypasses ALL settings.

```typescript
// ⚠️ WARNING: This bypasses business settings!
// Only use for security-critical messages
const result = await gateway.sendCriticalSMS(
  '+905551234567',
  'Your verification code is: 123456',
  { requestId: 'verify_789' }
);
```

## Understanding the Results

Every method returns a `NotificationGatewayResult`:

```typescript
interface NotificationGatewayResult {
  success: boolean;           // True if at least ONE channel succeeded
  results: NotificationResult[];  // Detailed results per channel
  skippedChannels: Array<{    // Channels that were skipped and why
    channel: NotificationChannel;
    reason: string;
  }>;
  sentChannels: NotificationChannel[];  // Channels that succeeded
}
```

### Example: Handling Results

```typescript
const result = await gateway.sendSystemAlert({...});

if (result.success) {
  // At least one channel worked
  console.log(`✅ Notification sent via: ${result.sentChannels.join(', ')}`);
} else {
  // All channels failed or were skipped
  console.log(`❌ Notification failed:`);
  result.skippedChannels.forEach(sc => {
    console.log(`  - ${sc.channel}: ${sc.reason}`);
  });
}

// Common skip reasons:
// - "User has disabled notifications"
// - "Within business quiet hours"
// - "Within user quiet hours"
// - "SMS quota exceeded: ..."
// - "User phone number not found"
// - "Email notifications not yet implemented"
```

## Settings Hierarchy

The gateway checks settings in this order:

1. **User Opt-Out** (highest priority) - If user disabled notifications, skip
2. **Quiet Hours Check** - Business quiet hours AND user quiet hours
3. **Enabled Channels** - Business settings for which channels are on
4. **SMS Quota** - Check if business has remaining SMS credits
5. **Channel Availability** - Check if channel is implemented and working

## Common Use Cases

### Use Case 1: New Appointment Created

```typescript
// In appointmentService.ts
async sendNewAppointmentNotification(appointment: Appointment, business: Business) {
  const result = await this.notificationGateway.sendSystemAlert({
    businessId: appointment.businessId,
    userId: business.ownerId,
    title: 'New Appointment',
    body: `${customer.name} booked ${service.name}`,
    appointmentId: appointment.id,
    data: {
      appointmentId: appointment.id,
      customerName: customer.name,
      serviceName: service.name
    },
    url: `/appointments/${appointment.id}`
  });

  // Log the result
  if (result.success) {
    console.log(`✅ Owner notified via ${result.sentChannels.join(', ')}`);
  }
}
```

### Use Case 2: Business Closure Notifications

```typescript
// In businessClosureService.ts
async notifyAffectedCustomers(closure: Closure, affectedAppointments: Appointment[]) {
  const recipients = affectedAppointments.map(apt => ({
    customerId: apt.customerId,
    personalizedData: {
      originalTime: apt.startTime,
      serviceName: apt.service.name
    }
  }));

  const { successful, failed } = await this.notificationGateway.sendBulk({
    businessId: closure.businessId,
    recipients,
    title: 'Business Closure Notice',
    body: `We will be closed from ${closure.startDate} to ${closure.endDate}`,
    baseData: {
      closureId: closure.id,
      reason: closure.reason
    },
    url: `/closures/${closure.id}`
  });

  console.log(`📧 Notified ${successful}/${recipients.length} customers`);
}
```

### Use Case 3: Appointment Reminder

```typescript
// In appointmentReminderService.ts
async sendReminder(appointment: Appointment) {
  const result = await this.notificationGateway.sendTransactional({
    businessId: appointment.businessId,
    customerId: appointment.customerId,
    title: 'Appointment Reminder',
    body: `Reminder: ${appointment.service.name} tomorrow at ${formatTime(appointment.startTime)}`,
    appointmentId: appointment.id,
    data: {
      appointmentTime: appointment.startTime,
      businessName: appointment.business.name
    },
    url: `/appointments/${appointment.id}`,
    ignoreQuietHours: false // Respect quiet hours for reminders
  });

  if (!result.success) {
    console.log(`⏭️ Reminder skipped: ${result.skippedChannels[0]?.reason}`);
  }
}
```

## Migration Guide

### Replacing Direct SMS Calls

**Before:**
```typescript
const { SMSService } = await import('../sms/smsService');
const smsService = new SMSService();
const canSend = await usageService.canSendSms(businessId);
if (canSend.allowed) {
  const result = await smsService.sendSMS({
    phoneNumber: user.phoneNumber,
    message: 'Your appointment...'
  });
  if (result.success) {
    await usageService.recordSmsUsage(businessId, 1);
  }
}
```

**After:**
```typescript
const result = await notificationGateway.sendTransactional({
  businessId,
  customerId: user.id,
  title: 'Appointment Confirmation',
  body: 'Your appointment...'
});
// SMS quota, sending, and usage recording all handled automatically!
```

### Replacing Direct Push Notifications

**Before:**
```typescript
const businessSettings = await getBusinessNotificationSettings(businessId);
if (businessSettings.pushEnabled) {
  await notificationService.sendPushNotification({
    userId,
    title: 'New Message',
    body: 'You have a new message'
  });
}
```

**After:**
```typescript
const result = await notificationGateway.sendSystemAlert({
  businessId,
  userId,
  title: 'New Message',
  body: 'You have a new message'
});
```

## Best Practices

1. ✅ **Always use the gateway** for notifications (except verification codes)
2. ✅ **Use the right method** - `sendTransactional` for important, `sendMarketing` for promotional
3. ✅ **Check the results** - Log whether notifications were sent or skipped
4. ✅ **Provide meaningful data** - Include relevant context in the `data` field
5. ❌ **Don't force channels** unless absolutely necessary (let settings decide)
6. ❌ **Don't ignore quiet hours** for marketing messages
7. ❌ **Don't use `sendCriticalSMS`** for anything except security

## Troubleshooting

### "No notifications being sent"

Check:
1. Business notification settings - are channels enabled?
2. Current time - is it quiet hours?
3. User preferences - has user opted out?
4. SMS quota - has business exceeded limit?

### "SMS not sending but push works"

Check:
1. Business `smsEnabled` setting
2. SMS quota via `usageService.canSendSms(businessId)`
3. User has valid phone number
4. SMS provider credentials in environment

### "All notifications skipped during quiet hours"

This is expected behavior! Quiet hours are:
- **Business quiet hours**: Set in business notification settings
- **User quiet hours**: Set in user notification preferences

To override (use sparingly):
```typescript
{
  ignoreQuietHours: true // Only for critical transactional messages
}
```

## Summary

The UnifiedNotificationGateway gives you:

- 🎯 **One API** for all notifications
- ⚙️ **Automatic settings checks** - no manual validation needed
- 📊 **Quota management** - SMS limits handled automatically
- 🕐 **Quiet hours** - respects business and user preferences
- 📈 **Consistent logging** - see exactly what was sent/skipped
- 🛡️ **Type safety** - TypeScript types for all methods

**Start using it today for cleaner, more consistent notifications!**
