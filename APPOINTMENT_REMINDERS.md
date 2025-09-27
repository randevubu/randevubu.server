# Appointment Reminder System - Complete Guide

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Testing Guide](#testing-guide)
- [Frontend Integration](#frontend-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Randevubu appointment reminder system is a comprehensive, multi-channel notification platform designed to reduce no-shows and improve customer engagement. The system supports **PUSH notifications, SMS, and Email** with configurable timing, quiet hours, and user preferences.

### Key Statistics
- **98% open rate** for SMS notifications
- **45% response rate** for text reminders
- Industry-standard timing: **1 hour and 24 hours** before appointments
- Automatic deduplication and timezone handling

---

## Features

### ✅ Core Features

1. **Multi-Channel Notifications**
   - 📱 **PUSH Notifications** (Default, highest engagement)
   - 💬 **SMS** (98% open rate, optional due to costs)
   - 📧 **Email** (Planned, professional communication)

2. **Smart Scheduling**
   - Configurable reminder timings (5 minutes to 7 days)
   - Multiple reminders per appointment (up to 5)
   - Automatic timezone conversion
   - Quiet hours support (business & user level)

3. **Two-Level Control**
   - **Business Settings**: Owner controls default behavior
   - **User Preferences**: Customers can override settings

4. **Advanced Features**
   - SMS quota management (prevents overage)
   - Reminder deduplication
   - Business owner notifications on new bookings
   - Analytics dashboard for effectiveness tracking

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│           Appointment Reminder System               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────┐    │
│  │  AppointmentReminderService (Scheduler)   │    │
│  │  - Runs every minute via cron             │    │
│  │  - Checks for upcoming appointments       │    │
│  │  - Respects quiet hours & timezones       │    │
│  └──────────────────────────────────────────┘    │
│                       ↓                           │
│  ┌──────────────────────────────────────────┐    │
│  │      NotificationService (Delivery)       │    │
│  │  - PUSH via web-push                      │    │
│  │  - SMS via SMS service (quota managed)    │    │
│  │  - Email (planned)                        │    │
│  └──────────────────────────────────────────┘    │
│                       ↓                           │
│  ┌──────────────────────────────────────────┐    │
│  │        Database Models (Storage)          │    │
│  │  - BusinessNotificationSettings           │    │
│  │  - NotificationPreference (user)          │    │
│  │  - PushSubscription                       │    │
│  │  - PushNotification (history)             │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Appointment Created** → Business owner receives instant notification
2. **Scheduler Runs** → Every minute, checks for appointments needing reminders
3. **Settings Check** → Loads business settings + user preferences
4. **Timing Check** → Verifies if current time matches reminder timing (±2 min tolerance)
5. **Quiet Hours Check** → Respects business + user quiet hours
6. **Channel Selection** → Filters enabled channels (PUSH/SMS/EMAIL)
7. **Delivery** → Sends notifications via enabled channels
8. **Tracking** → Marks appointment as reminded, logs delivery status

---

## Configuration

### Business Notification Settings

Configure at the business level to set defaults for all customers.

**Model: `BusinessNotificationSettings`**

```typescript
{
  enableAppointmentReminders: boolean;      // Default: true
  reminderChannels: ["PUSH" | "SMS" | "EMAIL"][]; // Default: ["PUSH"]
  reminderTiming: number[];                 // Minutes before appointment
                                            // Default: [60, 1440] (1h, 24h)
  smsEnabled: boolean;                      // Default: false
  pushEnabled: boolean;                     // Default: true
  emailEnabled: boolean;                    // Default: false
  quietHours?: {
    start: string;                          // HH:MM format (24-hour)
    end: string;                            // HH:MM format (24-hour)
  };
  timezone: string;                         // Default: "Europe/Istanbul"
}
```

### User Notification Preferences

Customers can override business settings with their own preferences.

**Model: `NotificationPreference`**

```typescript
{
  enableAppointmentReminders: boolean;      // Can opt-out entirely
  enableBusinessNotifications: boolean;     // Business updates
  enablePromotionalMessages: boolean;       // Marketing (default: false)
  reminderTiming: {
    hours: number[];                        // Hours before (e.g., [1, 24])
  };
  preferredChannels: {
    channels: ["PUSH" | "SMS" | "EMAIL"][];
  };
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  timezone: string;
}
```

### Priority Logic

**Business settings take precedence** for timing and channels, but users can:
- Disable reminders entirely (`enableAppointmentReminders: false`)
- Set their own quiet hours (additive with business quiet hours)

---

## API Reference

### 1. Configure Business Notification Settings

**Endpoint:** `PUT /api/v1/businesses/my-business/notification-settings`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "enableAppointmentReminders": true,
  "reminderChannels": ["PUSH", "SMS"],
  "reminderTiming": [60, 1440],
  "smsEnabled": true,
  "pushEnabled": true,
  "emailEnabled": false,
  "quietHours": {
    "start": "22:00",
    "end": "08:00"
  },
  "timezone": "Europe/Istanbul"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "settings_123",
    "businessId": "business_456",
    "enableAppointmentReminders": true,
    "reminderChannels": ["PUSH", "SMS"],
    "reminderTiming": [60, 1440],
    "smsEnabled": true,
    "pushEnabled": true,
    "emailEnabled": false,
    "quietHours": {
      "start": "22:00",
      "end": "08:00"
    },
    "timezone": "Europe/Istanbul",
    "createdAt": "2025-09-24T10:00:00Z",
    "updatedAt": "2025-09-24T10:00:00Z"
  },
  "message": "Notification settings updated successfully"
}
```

**Validation Rules:**
- `reminderChannels`: 1-3 channels, must include at least one
- `reminderTiming`: 1-5 timing values, range 5-10080 minutes (5 min - 7 days)
- `quietHours`: Start and end must be in HH:MM format, can span overnight

---

### 2. Get Business Notification Settings

**Endpoint:** `GET /api/v1/businesses/my-business/notification-settings`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "settings_123",
    "businessId": "business_456",
    "enableAppointmentReminders": true,
    "reminderChannels": ["PUSH"],
    "reminderTiming": [60, 1440],
    "smsEnabled": false,
    "pushEnabled": true,
    "emailEnabled": false,
    "quietHours": null,
    "timezone": "Europe/Istanbul"
  }
}
```

---

### 3. Update User Notification Preferences

**Endpoint:** `PUT /api/v1/users/notification-preferences`

**Authentication:** Required

**Request Body:**
```json
{
  "enableAppointmentReminders": true,
  "enableBusinessNotifications": true,
  "enablePromotionalMessages": false,
  "reminderTiming": {
    "hours": [1, 24]
  },
  "preferredChannels": {
    "channels": ["PUSH", "SMS"]
  },
  "quietHours": {
    "start": "22:00",
    "end": "08:00",
    "timezone": "Europe/Istanbul"
  },
  "timezone": "Europe/Istanbul"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pref_789",
    "userId": "user_123",
    "enableAppointmentReminders": true,
    "enableBusinessNotifications": true,
    "enablePromotionalMessages": false,
    "reminderTiming": {
      "hours": [1, 24]
    },
    "preferredChannels": {
      "channels": ["PUSH", "SMS"]
    },
    "quietHours": {
      "start": "22:00",
      "end": "08:00",
      "timezone": "Europe/Istanbul"
    },
    "timezone": "Europe/Istanbul",
    "createdAt": "2025-09-24T10:00:00Z",
    "updatedAt": "2025-09-24T10:00:00Z"
  },
  "message": "Notification preferences updated successfully"
}
```

---

### 4. Test Reminder (For Business Owners)

**Endpoint:** `POST /api/v1/businesses/my-business/test-reminder`

**Authentication:** Required (Business owner/manager)

**Request Body:**
```json
{
  "channels": ["PUSH"],
  "appointmentId": "optional_existing_appointment_id",
  "customMessage": "This is a test reminder"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "success": true,
        "messageId": "notif_abc123",
        "channel": "PUSH",
        "status": "SENT"
      }
    ],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0,
      "channels": ["PUSH"],
      "testMessage": "This is a test reminder"
    }
  },
  "message": "Test reminder completed: 1 successful, 0 failed"
}
```

**Rate Limiting:**
- SMS tests are rate-limited to **1 per 5 minutes per user** to prevent costs
- PUSH tests have no rate limiting

---

### 5. Get Notification Analytics

**Endpoint:** `GET /api/v1/businesses/my-business/notification-analytics?days=30`

**Authentication:** Required (Business owner/manager)

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2025-08-25T10:00:00Z",
      "endDate": "2025-09-24T10:00:00Z"
    },
    "summary": {
      "totalAppointments": 150,
      "remindedAppointments": 142,
      "reminderCoverage": 94.67,
      "noShowRate": 5.33,
      "completionRate": 89.33
    },
    "channelPerformance": {
      "PUSH": {
        "sent": 142,
        "delivered": 138,
        "read": 125,
        "failed": 4
      }
    },
    "reminderEffectiveness": {
      "withReminder": {
        "total": 142,
        "noShow": 5,
        "completed": 130,
        "noShowRate": 3.52
      },
      "withoutReminder": {
        "total": 8,
        "noShow": 3,
        "completed": 4,
        "noShowRate": 37.5
      }
    }
  },
  "message": "Notification analytics retrieved successfully"
}
```

**Insights:**
- Compare no-show rates with vs without reminders
- Track channel performance (delivery, read rates)
- Measure reminder coverage across appointments

---

### 6. Subscribe to Push Notifications

**Endpoint:** `POST /api/v1/push-notifications/subscribe`

**Authentication:** Required

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1...",
    "auth": "tBHItJI5svbpez7KI4CCXg=="
  },
  "deviceName": "Chrome on Windows",
  "deviceType": "web",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "push_sub_123",
    "userId": "user_456",
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "deviceName": "Chrome on Windows",
    "deviceType": "web",
    "isActive": true,
    "createdAt": "2025-09-24T10:00:00Z"
  },
  "message": "Push subscription created successfully"
}
```

---

## Testing Guide

### Quick Start Testing

#### 1. **Setup Business Notification Settings**

```bash
curl -X PUT https://api.randevubu.com/api/v1/businesses/my-business/notification-settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableAppointmentReminders": true,
    "reminderChannels": ["PUSH"],
    "reminderTiming": [60, 1440],
    "pushEnabled": true,
    "smsEnabled": false
  }'
```

#### 2. **Subscribe to Push Notifications**

**Frontend (Web Push):**
```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY // Get from /api/v1/push-notifications/vapid-public-key
  });

  // Send subscription to backend
  await fetch('/api/v1/push-notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
      },
      deviceName: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown',
      deviceType: 'web'
    })
  });
}
```

#### 3. **Test Reminder**

```bash
curl -X POST https://api.randevubu.com/api/v1/businesses/my-business/test-reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["PUSH"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "success": true,
        "messageId": "notif_1727180400123_xyz789",
        "channel": "PUSH",
        "status": "SENT"
      }
    ],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0,
      "channels": ["PUSH"]
    }
  },
  "message": "Test reminder completed: 1 successful, 0 failed"
}
```

#### 4. **Check Analytics**

```bash
curl -X GET "https://api.randevubu.com/api/v1/businesses/my-business/notification-analytics?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Testing Scenarios

#### Scenario 1: Basic PUSH Reminder
1. Enable PUSH notifications in business settings
2. Subscribe to push on a device
3. Send test reminder
4. Verify notification appears on device

#### Scenario 2: Multi-Channel (PUSH + SMS)
1. Enable both PUSH and SMS in settings
2. Add SMS timing: `[60, 1440]`
3. Send test reminder with both channels
4. Note: SMS is rate-limited (5 min cooldown)

#### Scenario 3: Quiet Hours
1. Set quiet hours: `{ start: "22:00", end: "08:00" }`
2. Send test reminder during quiet hours
3. Verify reminder is NOT sent
4. Send test outside quiet hours
5. Verify reminder IS sent

#### Scenario 4: User Opt-Out
1. User disables reminders: `enableAppointmentReminders: false`
2. Send test reminder
3. Verify reminder is NOT sent

#### Scenario 5: Timezone Handling
1. Set business timezone: `Europe/Istanbul`
2. Set user timezone: `America/New_York`
3. Create appointment in business timezone
4. Verify reminder timing is correct in both zones

---

## Frontend Integration

### React Example

#### 1. **Notification Settings Component**

```tsx
import React, { useState, useEffect } from 'react';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    enableAppointmentReminders: true,
    reminderChannels: ['PUSH'],
    reminderTiming: [60, 1440],
    smsEnabled: false,
    pushEnabled: true,
    quietHours: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const response = await fetch('/api/v1/businesses/my-business/notification-settings', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setSettings(data.data);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    const response = await fetch('/api/v1/businesses/my-business/notification-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    setLoading(false);

    if (data.success) {
      alert('Settings updated successfully!');
    }
  };

  return (
    <div className="notification-settings">
      <h2>Appointment Reminder Settings</h2>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.enableAppointmentReminders}
            onChange={(e) => setSettings({
              ...settings,
              enableAppointmentReminders: e.target.checked
            })}
          />
          Enable Appointment Reminders
        </label>
      </div>

      <div className="setting-item">
        <h3>Notification Channels</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.pushEnabled}
            onChange={(e) => setSettings({
              ...settings,
              pushEnabled: e.target.checked,
              reminderChannels: e.target.checked
                ? [...settings.reminderChannels, 'PUSH']
                : settings.reminderChannels.filter(c => c !== 'PUSH')
            })}
          />
          Push Notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.smsEnabled}
            onChange={(e) => setSettings({
              ...settings,
              smsEnabled: e.target.checked,
              reminderChannels: e.target.checked
                ? [...settings.reminderChannels, 'SMS']
                : settings.reminderChannels.filter(c => c !== 'SMS')
            })}
          />
          SMS (charges may apply)
        </label>
      </div>

      <div className="setting-item">
        <h3>Reminder Timing (minutes before appointment)</h3>
        {settings.reminderTiming.map((timing, index) => (
          <div key={index}>
            <input
              type="number"
              value={timing}
              min={5}
              max={10080}
              onChange={(e) => {
                const newTiming = [...settings.reminderTiming];
                newTiming[index] = parseInt(e.target.value);
                setSettings({ ...settings, reminderTiming: newTiming });
              }}
            />
            <span>{timing} minutes ({Math.round(timing / 60)} hours)</span>
          </div>
        ))}
        <button onClick={() => setSettings({
          ...settings,
          reminderTiming: [...settings.reminderTiming, 120]
        })}>
          + Add Another Reminder
        </button>
      </div>

      <button onClick={updateSettings} disabled={loading}>
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default NotificationSettings;
```

#### 2. **Push Notification Subscription**

```tsx
const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const subscribeToPush = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.error('Notification permission denied');
        return;
      }

      // Get VAPID public key
      const vapidResponse = await fetch('/api/v1/push-notifications/vapid-public-key');
      const vapidData = await vapidResponse.json();
      const vapidPublicKey = vapidData.data.publicKey;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Convert keys to base64
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('p256dh'))));
      const auth = btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('auth'))));

      // Send to backend
      const response = await fetch('/api/v1/push-notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          endpoint: pushSubscription.endpoint,
          keys: { p256dh, auth },
          deviceName: getDeviceName(),
          deviceType: 'web',
          userAgent: navigator.userAgent
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSubscribed(true);
        setSubscription(data.data);
        console.log('Push subscription successful:', data.data);
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    await fetch(`/api/v1/push-notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        subscriptionId: subscription.id
      })
    });

    setIsSubscribed(false);
    setSubscription(null);
  };

  return { isSubscribed, subscribeToPush, unsubscribe };
};

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown Browser';
}
```

#### 3. **Analytics Dashboard**

```tsx
const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const response = await fetch(
      `/api/v1/businesses/my-business/notification-analytics?days=${days}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    if (data.success) {
      setAnalytics(data.data);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!analytics) return <div>No data available</div>;

  return (
    <div className="analytics-dashboard">
      <h2>Notification Analytics</h2>

      <div className="period-selector">
        <button onClick={() => setDays(7)}>Last 7 days</button>
        <button onClick={() => setDays(30)}>Last 30 days</button>
        <button onClick={() => setDays(90)}>Last 90 days</button>
      </div>

      <div className="summary-cards">
        <div className="card">
          <h3>Total Appointments</h3>
          <p className="value">{analytics.summary.totalAppointments}</p>
        </div>
        <div className="card">
          <h3>Reminder Coverage</h3>
          <p className="value">{analytics.summary.reminderCoverage}%</p>
        </div>
        <div className="card">
          <h3>No-Show Rate</h3>
          <p className="value">{analytics.summary.noShowRate}%</p>
        </div>
        <div className="card">
          <h3>Completion Rate</h3>
          <p className="value">{analytics.summary.completionRate}%</p>
        </div>
      </div>

      <div className="effectiveness-comparison">
        <h3>Reminder Effectiveness</h3>
        <div className="comparison">
          <div className="with-reminder">
            <h4>With Reminders</h4>
            <p>Total: {analytics.reminderEffectiveness.withReminder.total}</p>
            <p>No-Shows: {analytics.reminderEffectiveness.withReminder.noShow}</p>
            <p className="rate">
              No-Show Rate: {analytics.reminderEffectiveness.withReminder.noShowRate}%
            </p>
          </div>
          <div className="without-reminder">
            <h4>Without Reminders</h4>
            <p>Total: {analytics.reminderEffectiveness.withoutReminder.total}</p>
            <p>No-Shows: {analytics.reminderEffectiveness.withoutReminder.noShow}</p>
            <p className="rate">
              No-Show Rate: {analytics.reminderEffectiveness.withoutReminder.noShowRate}%
            </p>
          </div>
        </div>
      </div>

      <div className="channel-performance">
        <h3>Channel Performance</h3>
        <div className="channel">
          <h4>Push Notifications</h4>
          <p>Sent: {analytics.channelPerformance.PUSH.sent}</p>
          <p>Delivered: {analytics.channelPerformance.PUSH.delivered}</p>
          <p>Read: {analytics.channelPerformance.PUSH.read}</p>
          <p>Failed: {analytics.channelPerformance.PUSH.failed}</p>
          <p className="rate">
            Delivery Rate: {
              (analytics.channelPerformance.PUSH.delivered /
               analytics.channelPerformance.PUSH.sent * 100).toFixed(2)
            }%
          </p>
        </div>
      </div>
    </div>
  );
};
```

---

## Best Practices

### For Business Owners

1. **Start with PUSH Only**
   - PUSH notifications are free and have excellent engagement
   - Enable SMS only if necessary (costs apply)

2. **Optimal Timing**
   - **1 hour before**: Last-minute reminder, highest impact
   - **24 hours before**: Planning reminder, reduces no-shows
   - Avoid too many reminders (2-3 is optimal)

3. **Set Quiet Hours**
   - Recommended: 22:00 - 08:00
   - Prevents annoying customers during sleep hours

4. **Monitor Analytics**
   - Check no-show rates weekly
   - Compare effectiveness with/without reminders
   - Adjust timing based on data

5. **Test Regularly**
   - Use test endpoint before enabling SMS
   - Verify PUSH notifications on multiple devices

### For Developers

1. **Service Worker Setup**
   ```javascript
   // sw.js (Service Worker)
   self.addEventListener('push', event => {
     const data = event.data.json();

     const options = {
       body: data.body,
       icon: data.icon || '/icon.png',
       badge: data.badge || '/badge.png',
       data: data.data,
       vibrate: [200, 100, 200],
       actions: [
         {
           action: 'view',
           title: 'View Appointment'
         },
         {
           action: 'dismiss',
           title: 'Dismiss'
         }
       ]
     };

     event.waitUntil(
       self.registration.showNotification(data.title, options)
     );
   });

   self.addEventListener('notificationclick', event => {
     event.notification.close();

     if (event.action === 'view' && event.notification.data.url) {
       event.waitUntil(
         clients.openWindow(event.notification.data.url)
       );
     }
   });
   ```

2. **Error Handling**
   - Always check for notification permission
   - Handle subscription failures gracefully
   - Log errors for debugging

3. **Subscription Management**
   - Store subscription status locally
   - Re-subscribe on token refresh
   - Handle expired subscriptions

---

## Troubleshooting

### Common Issues

#### 1. **Reminders Not Sending**

**Symptoms:** Appointments are created but no reminders are sent.

**Checklist:**
- [ ] Is `enableAppointmentReminders` set to `true` in business settings?
- [ ] Is the scheduler running? Check logs for "📅 Appointment reminder scheduler started"
- [ ] Are reminder timings configured? Check `reminderTiming` array
- [ ] Is the appointment in the future?
- [ ] Has `reminderSent` already been set to `true` for this appointment?

**Debug:**
```bash
# Check scheduler status
curl -X GET https://api.randevubu.com/api/v1/appointments/reminder-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check business settings
curl -X GET https://api.randevubu.com/api/v1/businesses/my-business/notification-settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. **PUSH Notifications Not Appearing**

**Symptoms:** Test reminder succeeds but notification doesn't show.

**Checklist:**
- [ ] Browser notification permission granted?
- [ ] Service worker registered and active?
- [ ] Valid push subscription exists?
- [ ] VAPID keys configured on server?
- [ ] Check browser console for errors

**Debug:**
```javascript
// Check notification permission
console.log('Permission:', Notification.permission);

// Check service worker
navigator.serviceWorker.ready.then(reg => {
  console.log('SW active:', reg.active);
  console.log('Push manager:', reg.pushManager);
});

// Check subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

#### 3. **SMS Not Sending**

**Symptoms:** SMS enabled but not sending.

**Checklist:**
- [ ] Is `smsEnabled` set to `true`?
- [ ] Is SMS quota available for business? Check subscription plan
- [ ] Valid phone number format?
- [ ] Rate limiting in effect? (5 min cooldown for tests)

**Debug:**
```bash
# Check SMS quota
curl -X GET https://api.randevubu.com/api/v1/businesses/my-business/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. **Quiet Hours Not Working**

**Symptoms:** Reminders sent during quiet hours.

**Checklist:**
- [ ] Quiet hours format correct? (HH:MM in 24-hour format)
- [ ] Timezone set correctly?
- [ ] Both business and user quiet hours checked?

**Test:**
```bash
# Current time in business timezone
date -u +"%Y-%m-%d %H:%M:%S %Z"

# Test reminder during quiet hours
curl -X POST https://api.randevubu.com/api/v1/businesses/my-business/test-reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"channels": ["PUSH"]}'
```

#### 5. **Analytics Not Showing Data**

**Symptoms:** Analytics dashboard returns empty or zero values.

**Checklist:**
- [ ] Are there appointments in the selected period?
- [ ] Has the reminder scheduler run?
- [ ] Check database for push notification records

**Debug:**
```bash
# Check with different time ranges
curl -X GET "https://api.randevubu.com/api/v1/businesses/my-business/notification-analytics?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X GET "https://api.randevubu.com/api/v1/businesses/my-business/notification-analytics?days=90" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Appendix

### Reminder Timing Presets

| Preset | Minutes | Hours | Use Case |
|--------|---------|-------|----------|
| Last minute | 15 | 0.25 | Very urgent services |
| 30 minutes | 30 | 0.5 | Quick appointments |
| **1 hour** | **60** | **1** | **Most common** |
| 2 hours | 120 | 2 | Preparation time |
| 12 hours | 720 | 12 | Half day notice |
| **24 hours** | **1440** | **24** | **Industry standard** |
| 48 hours | 2880 | 48 | 2-day notice |
| 72 hours | 4320 | 72 | 3-day notice |
| 1 week | 10080 | 168 | Maximum allowed |

### Notification Channel Comparison

| Channel | Open Rate | Response Rate | Cost | Speed | Best For |
|---------|-----------|---------------|------|-------|----------|
| **PUSH** | 90%+ | 40%+ | Free | Instant | Mobile apps, web |
| **SMS** | 98% | 45% | Paid (per SMS) | Instant | High priority |
| **Email** | 20-30% | 6% | Low/Free | Seconds | Detailed info |

### Status Codes

| Code | Status | Description |
|------|--------|-------------|
| PENDING | Queued | Notification created, not yet sent |
| SENT | Sent | Notification sent to provider |
| DELIVERED | Delivered | Confirmed delivery to device |
| READ | Read | User opened/viewed notification |
| FAILED | Failed | Delivery failed |
| RATE_LIMITED | Rate Limited | SMS test rate limit hit |

---

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review API documentation at `/api-docs`
- Contact support: support@randevubu.com

---

**Last Updated:** September 24, 2025
**Version:** 2.0
**Author:** Randevubu Development Team