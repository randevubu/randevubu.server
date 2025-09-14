# 📱 Push Notifications Frontend Integration Guide

This guide explains how to integrate push notifications for appointment reminders in your PWA frontend application.

## 🚀 Quick Start

### 1. Check Push Notification Support

```javascript
// Check if push notifications are supported
if ('serviceWorker' in navigator && 'PushManager' in window) {
  console.log('Push notifications are supported');
} else {
  console.log('Push notifications are not supported');
}
```

### 2. Get VAPID Public Key

```javascript
const getVapidPublicKey = async () => {
  try {
    const response = await fetch('/api/v1/notifications/push/vapid-key');
    const data = await response.json();
    
    if (data.success) {
      return data.data.publicKey;
    } else {
      throw new Error('Push notifications not configured on server');
    }
  } catch (error) {
    console.error('Failed to get VAPID key:', error);
    return null;
  }
};
```

### 3. Register Service Worker

```javascript
// Register service worker
const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};
```

## 📋 API Endpoints

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
All endpoints (except VAPID key) require JWT authentication:
```javascript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

## 🔧 Core Implementation

### 1. Complete Push Notification Setup

```javascript
class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = null;
    this.registration = null;
    this.subscription = null;
    this.userToken = localStorage.getItem('authToken'); // Your auth token
  }

  async initialize() {
    try {
      // Check support
      if (!this.isSupported()) {
        throw new Error('Push notifications not supported');
      }

      // Get VAPID key
      this.vapidPublicKey = await this.getVapidPublicKey();
      if (!this.vapidPublicKey) {
        throw new Error('Failed to get VAPID key');
      }

      // Register service worker
      this.registration = await this.registerServiceWorker();
      if (!this.registration) {
        throw new Error('Failed to register service worker');
      }

      console.log('Push notification manager initialized');
      return true;
    } catch (error) {
      console.error('Push notification initialization failed:', error);
      return false;
    }
  }

  isSupported() {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  async getVapidPublicKey() {
    const response = await fetch('/api/v1/notifications/push/vapid-key');
    const data = await response.json();
    return data.success ? data.data.publicKey : null;
  }

  async registerServiceWorker() {
    return await navigator.serviceWorker.register('/sw.js');
  }

  async requestPermission() {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe() {
    try {
      if (!this.registration) {
        throw new Error('Service worker not registered');
      }

      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission denied');
      }

      // Create push subscription
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Send subscription to server
      const success = await this.sendSubscriptionToServer(this.subscription);
      if (success) {
        console.log('Successfully subscribed to push notifications');
        return true;
      } else {
        throw new Error('Failed to register subscription on server');
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/v1/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: this.arrayBufferToBase64(subscription.getKey('auth'))
          },
          deviceName: this.getDeviceName(),
          deviceType: 'web',
          userAgent: navigator.userAgent
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      return false;
    }
  }

  async unsubscribe() {
    try {
      if (this.subscription) {
        // Unsubscribe from browser
        await this.subscription.unsubscribe();
        
        // Remove from server
        await fetch('/api/v1/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: this.subscription.endpoint
          })
        });

        this.subscription = null;
        console.log('Unsubscribed from push notifications');
        return true;
      }
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  // Utility methods
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return window.btoa(binary);
  }

  getDeviceName() {
    // Simple device detection
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }
}
```

### 2. Notification Preferences Management

```javascript
class NotificationPreferences {
  constructor(userToken) {
    this.userToken = userToken;
  }

  async getPreferences() {
    try {
      const response = await fetch('/api/v1/notifications/push/preferences', {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return null;
    }
  }

  async updatePreferences(preferences) {
    try {
      const response = await fetch('/api/v1/notifications/push/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }
}

// Usage example
const preferences = new NotificationPreferences(userToken);

// Get current preferences
const currentPrefs = await preferences.getPreferences();
console.log('Current preferences:', currentPrefs);

// Update preferences
const success = await preferences.updatePreferences({
  enableAppointmentReminders: true,
  enableBusinessNotifications: true,
  enablePromotionalMessages: false,
  reminderTiming: {
    hours: [1, 24] // 1 hour and 24 hours before appointment
  },
  preferredChannels: {
    channels: ['PUSH', 'SMS']
  },
  quietHours: {
    start: '22:00',
    end: '08:00',
    timezone: 'Europe/Istanbul'
  },
  timezone: 'Europe/Istanbul'
});
```

### 3. Appointment Data Integration

```javascript
class AppointmentManager {
  constructor(userToken) {
    this.userToken = userToken;
  }

  // Get the nearest appointment in the current hour
  async getNearestAppointmentCurrentHour() {
    try {
      const response = await fetch('/api/v1/appointments/nearest-current-hour', {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          appointment: data.data,
          timeUntilAppointment: data.data.timeUntilAppointment // milliseconds
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get nearest appointment:', error);
      return null;
    }
  }

  // Get all appointments in current hour
  async getCurrentHourAppointments() {
    try {
      const response = await fetch('/api/v1/appointments/current-hour', {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Failed to get current hour appointments:', error);
      return [];
    }
  }

  // Format time until appointment for display
  formatTimeUntil(milliseconds) {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
}
```

## 🎯 Service Worker Implementation

Create `/public/sw.js`:

```javascript
// Service Worker for handling push notifications
self.addEventListener('push', function(event) {
  console.log('Push received:', event);

  let notificationData = {
    title: 'Appointment Reminder',
    body: 'You have an upcoming appointment',
    icon: '/icons/appointment.png',
    badge: '/icons/badge.png',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        data: pushData.data || {}
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: [
      {
        action: 'view',
        title: 'View Appointment',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    requireInteraction: true, // Keep notification visible
    tag: 'appointment-reminder' // Prevent duplicate notifications
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view') {
    // Open appointment details
    const appointmentId = event.notification.data.appointmentId;
    const url = appointmentId ? `/appointments/${appointmentId}` : '/appointments';
    
    event.waitUntil(
      clients.openWindow(url)
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    console.log('Notification dismissed');
  } else {
    // Default click action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
```

## 🖥️ UI Components

### 1. Notification Settings Component

```jsx
import React, { useState, useEffect } from 'react';

const NotificationSettings = ({ userToken }) => {
  const [preferences, setPreferences] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const pushManager = new PushNotificationManager();
  const preferencesManager = new NotificationPreferences(userToken);

  useEffect(() => {
    loadPreferences();
    checkSubscriptionStatus();
  }, []);

  const loadPreferences = async () => {
    const prefs = await preferencesManager.getPreferences();
    setPreferences(prefs || {
      enableAppointmentReminders: true,
      enableBusinessNotifications: true,
      enablePromotionalMessages: false,
      reminderTiming: { hours: [1, 24] },
      preferredChannels: { channels: ['PUSH'] },
      quietHours: null,
      timezone: 'Europe/Istanbul'
    });
    setLoading(false);
  };

  const checkSubscriptionStatus = async () => {
    // Check if already subscribed
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    const initialized = await pushManager.initialize();
    if (initialized) {
      const success = await pushManager.subscribe();
      setIsSubscribed(success);
    }
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    const success = await pushManager.unsubscribe();
    if (success) {
      setIsSubscribed(false);
    }
    setLoading(false);
  };

  const handlePreferenceChange = async (newPreferences) => {
    setPreferences(newPreferences);
    await preferencesManager.updatePreferences(newPreferences);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="notification-settings">
      <h2>Push Notification Settings</h2>
      
      {/* Subscription Status */}
      <div className="subscription-status">
        <h3>Push Notifications</h3>
        <p>Status: {isSubscribed ? '✅ Enabled' : '❌ Disabled'}</p>
        
        {!isSubscribed ? (
          <button onClick={handleSubscribe} disabled={loading}>
            Enable Push Notifications
          </button>
        ) : (
          <button onClick={handleUnsubscribe} disabled={loading}>
            Disable Push Notifications
          </button>
        )}
      </div>

      {/* Preferences */}
      {isSubscribed && preferences && (
        <div className="preferences">
          <h3>Notification Preferences</h3>
          
          <label>
            <input
              type="checkbox"
              checked={preferences.enableAppointmentReminders}
              onChange={(e) => handlePreferenceChange({
                ...preferences,
                enableAppointmentReminders: e.target.checked
              })}
            />
            Appointment Reminders
          </label>

          <label>
            <input
              type="checkbox"
              checked={preferences.enableBusinessNotifications}
              onChange={(e) => handlePreferenceChange({
                ...preferences,
                enableBusinessNotifications: e.target.checked
              })}
            />
            Business Updates
          </label>

          {/* Reminder Timing */}
          <div className="reminder-timing">
            <h4>Remind me:</h4>
            {[0.5, 1, 2, 24].map(hours => (
              <label key={hours}>
                <input
                  type="checkbox"
                  checked={preferences.reminderTiming.hours.includes(hours)}
                  onChange={(e) => {
                    const newHours = e.target.checked
                      ? [...preferences.reminderTiming.hours, hours]
                      : preferences.reminderTiming.hours.filter(h => h !== hours);
                    
                    handlePreferenceChange({
                      ...preferences,
                      reminderTiming: { hours: newHours }
                    });
                  }}
                />
                {hours < 1 ? `${hours * 60} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`} before
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
```

### 2. Appointment Dashboard Widget

```jsx
import React, { useState, useEffect } from 'react';

const NearestAppointmentWidget = ({ userToken }) => {
  const [appointment, setAppointment] = useState(null);
  const [timeUntil, setTimeUntil] = useState('');
  const [loading, setLoading] = useState(true);

  const appointmentManager = new AppointmentManager(userToken);

  useEffect(() => {
    loadNearestAppointment();
    // Refresh every minute
    const interval = setInterval(loadNearestAppointment, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (appointment?.timeUntilAppointment) {
      updateTimeDisplay();
      const interval = setInterval(updateTimeDisplay, 1000);
      return () => clearInterval(interval);
    }
  }, [appointment]);

  const loadNearestAppointment = async () => {
    const result = await appointmentManager.getNearestAppointmentCurrentHour();
    setAppointment(result?.appointment || null);
    setLoading(false);
  };

  const updateTimeDisplay = () => {
    if (appointment) {
      const now = Date.now();
      const appointmentTime = new Date(appointment.startTime).getTime();
      const remaining = Math.max(0, appointmentTime - now);
      setTimeUntil(appointmentManager.formatTimeUntil(remaining));
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!appointment) {
    return (
      <div className="appointment-widget">
        <h3>Next Appointment</h3>
        <p>No appointments in the current hour</p>
      </div>
    );
  }

  return (
    <div className="appointment-widget urgent">
      <h3>🔔 Next Appointment</h3>
      <div className="appointment-info">
        <h4>{appointment.service.name}</h4>
        <p><strong>{appointment.business.name}</strong></p>
        <p>⏰ {new Date(appointment.startTime).toLocaleTimeString()}</p>
        <p className="time-until">Starting in: <strong>{timeUntil}</strong></p>
      </div>
      <button 
        onClick={() => window.location.href = `/appointments/${appointment.id}`}
        className="view-appointment-btn"
      >
        View Details
      </button>
    </div>
  );
};

export default NearestAppointmentWidget;
```

## 🧪 Testing

### Test Push Notifications

```javascript
const testPushNotification = async (userToken) => {
  try {
    const response = await fetch('/api/v1/notifications/push/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Notification',
        body: 'This is a test push notification from your PWA!',
        icon: '/icons/test.png',
        data: { test: true }
      })
    });

    const data = await response.json();
    console.log('Test notification result:', data);
    return data.success;
  } catch (error) {
    console.error('Test notification failed:', error);
    return false;
  }
};
```

## 📱 PWA Manifest Updates

Update your `manifest.json`:

```json
{
  "name": "RandevuBu",
  "short_name": "RandevuBu",
  "description": "Appointment booking and management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007bff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "gcm_sender_id": "103953800507"
}
```

## 🚨 Error Handling

```javascript
class NotificationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
  }
}

const handleNotificationError = (error) => {
  console.error('Notification error:', error);
  
  switch (error.code || error.name) {
    case 'NotAllowedError':
      return 'Please allow notifications in your browser settings';
    case 'AbortError':
      return 'Notification request was cancelled';
    case 'NotSupportedError':
      return 'Push notifications are not supported on this device';
    default:
      return 'An error occurred with notifications. Please try again.';
  }
};
```

## 📋 Implementation Checklist

- [ ] Set up service worker (`/public/sw.js`)
- [ ] Implement `PushNotificationManager` class
- [ ] Add notification permission request UI
- [ ] Create notification settings page
- [ ] Add nearest appointment widget to dashboard
- [ ] Test push notifications on different devices
- [ ] Handle offline scenarios
- [ ] Add proper error messages for users
- [ ] Configure VAPID keys on server
- [ ] Test notification preferences
- [ ] Verify quiet hours functionality
- [ ] Test appointment reminder timing

## 🔧 Environment Configuration

Make sure your server has these environment variables:

```bash
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:admin@randevubu.com
```

## 📚 Additional Resources

- [Web Push Protocol](https://web.dev/push-notifications/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

This guide provides everything needed to implement push notifications in your PWA. The backend automatically handles appointment reminders, and the frontend provides user control over notification preferences and displays upcoming appointments prominently.