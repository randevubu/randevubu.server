# Appointment Reminder - Quick Start Guide

## 🚀 5-Minute Setup

### For Business Owners

#### Step 1: Configure Reminder Settings (2 minutes)

**API Call:**
```bash
curl -X PUT https://api.randevubu.com/api/v1/businesses/my-business/notification-settings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableAppointmentReminders": true,
    "reminderChannels": ["PUSH"],
    "reminderTiming": [60, 1440],
    "pushEnabled": true,
    "smsEnabled": false
  }'
```

**JavaScript:**
```javascript
const response = await fetch('/api/v1/businesses/my-business/notification-settings', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enableAppointmentReminders: true,
    reminderChannels: ['PUSH'],
    reminderTiming: [60, 1440], // 1 hour and 24 hours before
    pushEnabled: true,
    smsEnabled: false
  })
});
```

#### Step 2: Test It (1 minute)

```bash
curl -X POST https://api.randevubu.com/api/v1/businesses/my-business/test-reminder \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["PUSH"]
  }'
```

#### Step 3: Check Analytics (2 minutes)

```bash
curl -X GET "https://api.randevubu.com/api/v1/businesses/my-business/notification-analytics?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📱 Common Configurations

### 1. Basic Setup (PUSH Only)
**Best for:** Most businesses, no SMS costs

```json
{
  "enableAppointmentReminders": true,
  "reminderChannels": ["PUSH"],
  "reminderTiming": [60, 1440],
  "pushEnabled": true,
  "smsEnabled": false,
  "emailEnabled": false
}
```

### 2. High-Value Services (PUSH + SMS)
**Best for:** Medical, legal, high-ticket services

```json
{
  "enableAppointmentReminders": true,
  "reminderChannels": ["PUSH", "SMS"],
  "reminderTiming": [60, 1440, 2880],
  "pushEnabled": true,
  "smsEnabled": true,
  "emailEnabled": false
}
```

### 3. Multiple Reminders
**Best for:** Services with high no-show rates

```json
{
  "enableAppointmentReminders": true,
  "reminderChannels": ["PUSH"],
  "reminderTiming": [60, 720, 1440],
  "pushEnabled": true,
  "smsEnabled": false
}
```

### 4. With Quiet Hours
**Best for:** Businesses respecting customer sleep time

```json
{
  "enableAppointmentReminders": true,
  "reminderChannels": ["PUSH"],
  "reminderTiming": [60, 1440],
  "pushEnabled": true,
  "smsEnabled": false,
  "quietHours": {
    "start": "22:00",
    "end": "08:00"
  },
  "timezone": "Europe/Istanbul"
}
```

### 5. Emergency Services (Immediate)
**Best for:** Urgent appointments

```json
{
  "enableAppointmentReminders": true,
  "reminderChannels": ["PUSH", "SMS"],
  "reminderTiming": [15, 60],
  "pushEnabled": true,
  "smsEnabled": true
}
```

---

## 👤 Customer Preferences

### Allow Customers to Customize

```javascript
// Update user notification preferences
const updatePreferences = async (preferences) => {
  const response = await fetch('/api/v1/users/notification-preferences', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
  return response.json();
};

// Example: Customer wants only 1 hour reminder
await updatePreferences({
  enableAppointmentReminders: true,
  reminderTiming: { hours: [1] },
  preferredChannels: { channels: ['PUSH'] }
});

// Example: Customer opts out of all reminders
await updatePreferences({
  enableAppointmentReminders: false
});

// Example: Customer sets quiet hours
await updatePreferences({
  enableAppointmentReminders: true,
  quietHours: {
    start: "22:00",
    end: "08:00",
    timezone: "Europe/Istanbul"
  }
});
```

---

## 🧪 Testing Checklist

### Before Going Live

- [ ] **Configure Settings**
  ```bash
  GET /api/v1/businesses/my-business/notification-settings
  ```

- [ ] **Subscribe to PUSH** (if using PUSH)
  ```bash
  POST /api/v1/push-notifications/subscribe
  ```

- [ ] **Send Test Reminder**
  ```bash
  POST /api/v1/businesses/my-business/test-reminder
  ```

- [ ] **Verify Notification Received**
  - Check device for notification
  - Verify content and formatting

- [ ] **Test Quiet Hours** (optional)
  - Set quiet hours
  - Send test during quiet hours
  - Verify no notification sent

- [ ] **Test User Opt-Out**
  - Disable user reminders
  - Send test
  - Verify no notification sent

---

## 📊 Monitoring & Analytics

### Daily Checks

```bash
# Get today's reminder stats
curl -X GET "https://api.randevubu.com/api/v1/businesses/my-business/notification-analytics?days=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Weekly Review

```bash
# Get weekly stats
curl -X GET "https://api.randevubu.com/api/v1/businesses/my-business/notification-analytics?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Key Metrics to Watch

1. **Reminder Coverage** - Should be >90%
2. **No-Show Rate** - Compare with/without reminders
3. **Delivery Rate** - Should be >95% for PUSH
4. **Read Rate** - Indicates engagement

---

## 🔧 Troubleshooting

### Reminders Not Sending?

1. **Check settings are enabled:**
   ```bash
   curl -X GET https://api.randevubu.com/api/v1/businesses/my-business/notification-settings \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Verify `enableAppointmentReminders: true`**

3. **Check reminder timings are set**

4. **Ensure channels are enabled** (`pushEnabled: true`)

### PUSH Not Appearing?

1. **Check browser permission:**
   ```javascript
   console.log('Permission:', Notification.permission);
   ```

2. **Verify subscription exists:**
   ```bash
   curl -X GET https://api.randevubu.com/api/v1/push-notifications/subscriptions \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Re-subscribe if needed:**
   ```bash
   POST /api/v1/push-notifications/subscribe
   ```

### SMS Not Sending?

1. **Check `smsEnabled: true`**

2. **Verify SMS quota available**

3. **Check rate limiting** (5 min cooldown for tests)

---

## 💡 Pro Tips

### Optimize No-Show Rates

1. **Use 2 reminders:** 1 hour + 24 hours
2. **Enable PUSH first** (free, effective)
3. **Add SMS for high-value** appointments only
4. **Monitor analytics** weekly
5. **Adjust timing** based on data

### Cost Management

1. **Start with PUSH only** (no cost)
2. **Enable SMS selectively** for VIP customers
3. **Set SMS daily limits** in subscription plan
4. **Use test endpoint carefully** (SMS rate limited)

### Customer Experience

1. **Set reasonable quiet hours** (22:00 - 08:00)
2. **Allow opt-outs** (legal requirement)
3. **Keep messages concise** and clear
4. **Include business name** in all notifications

---

## 📱 Frontend Integration

### Minimal Setup (React)

```jsx
import { useState, useEffect } from 'react';

function ReminderSettings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Fetch current settings
    fetch('/api/v1/businesses/my-business/notification-settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSettings(data.data));
  }, []);

  const updateSettings = async () => {
    await fetch('/api/v1/businesses/my-business/notification-settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    alert('Settings updated!');
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      <h2>Reminder Settings</h2>

      <label>
        <input
          type="checkbox"
          checked={settings.enableAppointmentReminders}
          onChange={(e) => setSettings({
            ...settings,
            enableAppointmentReminders: e.target.checked
          })}
        />
        Enable Reminders
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.pushEnabled}
          onChange={(e) => setSettings({
            ...settings,
            pushEnabled: e.target.checked
          })}
        />
        Push Notifications
      </label>

      <button onClick={updateSettings}>Save</button>
    </div>
  );
}
```

---

## 📚 Additional Resources

- [Full Documentation](./APPOINTMENT_REMINDERS.md)
- [API Reference](http://localhost:3001/api-docs)
- [Frontend Examples](./APPOINTMENT_REMINDERS.md#frontend-integration)

---

**Quick Links:**
- Settings: `PUT /api/v1/businesses/my-business/notification-settings`
- Test: `POST /api/v1/businesses/my-business/test-reminder`
- Analytics: `GET /api/v1/businesses/my-business/notification-analytics`
- User Prefs: `PUT /api/v1/users/notification-preferences`