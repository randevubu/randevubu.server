# Push Notifications Frontend Implementation Guide

## Overview

This guide explains how to implement browser push notifications on the frontend to work with the Randevubu backend API. The backend is already configured and ready - you just need to implement the frontend subscription flow.

## 🎯 Problem Summary

Currently, the backend shows:
```
Found 0 active push subscriptions for user 74d5ac65-26a2-4cd5-9f45-5e89b8158385: []
```

This means the **browser hasn't subscribed** to push notifications yet, even though business notification settings are properly configured.

## 🔄 Two Different Systems

### 1. Business Notification Settings ✅ (Already Working)
- **Purpose**: Controls business-level notification preferences
- **Endpoint**: `PUT /api/v1/businesses/my-business/notification-settings`
- **Controls**: `pushEnabled`, `smsEnabled`, `emailEnabled`, `reminderChannels`
- **Status**: ✅ Working correctly

### 2. Browser Push Subscription ❌ (Missing - Needs Implementation)
- **Purpose**: Creates browser/device-specific push subscription tokens
- **Endpoint**: `POST /api/v1/notifications/push/subscribe`
- **Creates**: FCM tokens that allow actual notification delivery
- **Status**: ❌ Not implemented in frontend

## 🛠️ Frontend Implementation Steps

### Step 1: Check Browser Support

```javascript
function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

if (!isPushSupported()) {
  console.warn('Push notifications are not supported in this browser');
  // Show fallback UI or message
  return;
}
```

### Step 2: Request Permission

```javascript
async function requestNotificationPermission() {
  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    alert('Push notifications are blocked. Please enable them in your browser settings.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
```

### Step 3: Get VAPID Public Key

```javascript
async function getVapidPublicKey() {
  try {
    const response = await fetch('/api/v1/notifications/push/vapid-public-key', {
      headers: {
        'Authorization': `Bearer ${getAccessToken()}` // Your auth token
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }

    const data = await response.json();
    return data.data.publicKey;
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    throw error;
  }
}
```

### Step 4: Helper Function for VAPID Key Conversion

```javascript
function urlBase64ToUint8Array(base64String) {
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
```

### Step 5: Subscribe to Push Notifications

```javascript
async function subscribeToNotifications() {
  try {
    // 1. Check if already subscribed
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      return await sendSubscriptionToServer(existingSubscription);
    }

    // 2. Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission denied');
    }

    // 3. Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();

    // 4. Subscribe to push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // 5. Send subscription to server
    return await sendSubscriptionToServer(subscription);

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}
```

### Step 6: Send Subscription to Backend

```javascript
async function sendSubscriptionToServer(subscription) {
  try {
    const response = await fetch('/api/v1/notifications/push/subscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`, // Your auth token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        },
        deviceName: navigator.userAgent, // Optional: device identification
        deviceType: 'web' // Optional: device type
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to subscribe');
    }

    const result = await response.json();
    console.log('Successfully subscribed to push notifications:', result);
    return result;

  } catch (error) {
    console.error('Error sending subscription to server:', error);
    throw error;
  }
}
```

### Step 7: Create Service Worker

Create a file: `public/sw.js` or `public/service-worker.js`:

```javascript
// Service Worker for handling push notifications
self.addEventListener('push', function(event) {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png', // Your app icon
    badge: data.badge || '/badge-72x72.png', // Your badge icon
    data: data.data,
    requireInteraction: false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Handle click action
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll().then(function(clientList) {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
```

### Step 8: Register Service Worker

In your main application file:

```javascript
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

// Initialize when app loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await registerServiceWorker();
    console.log('Push notification system ready');
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
});
```

## 🎨 UI Implementation

### Simple Enable/Disable Button

```javascript
// React example
function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleNotifications = async () => {
    setIsLoading(true);

    try {
      if (isSubscribed) {
        await unsubscribeFromNotifications();
        setIsSubscribed(false);
      } else {
        await subscribeToNotifications();
        setIsSubscribed(true);
      }
    } catch (error) {
      alert('Failed to update notification settings: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleNotifications}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : (isSubscribed ? 'Disable Notifications' : 'Enable Notifications')}
    </button>
  );
}
```

### Unsubscribe Function

```javascript
async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('No subscription found');
      return;
    }

    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Notify server
    await fetch('/api/v1/notifications/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    console.log('Successfully unsubscribed from push notifications');
  } catch (error) {
    console.error('Error unsubscribing:', error);
    throw error;
  }
}
```

## 🧪 Testing the Implementation

### 1. Check Subscription Status

```javascript
async function checkSubscriptionStatus() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('Push subscription active:', subscription.endpoint);
      return true;
    } else {
      console.log('No push subscription found');
      return false;
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}
```

### 2. Test Notification

After implementing the above, you should see logs like:
```
Creating/updating push subscription: {
  userId: '74d5ac65-26a2-4cd5-9f45-5e89b8158385',
  endpoint: 'https://fcm.googleapis.com/fcm/send/NEW_TOKEN...',
  subscriptionId: 'push_TIMESTAMP_RANDOM'
}
```

And when testing reminders:
```
Found 1 active push subscriptions for user 74d5ac65-26a2-4cd5-9f45-5e89b8158385: [...]
```

## 🚨 Common Issues

### iOS Safari Limitations
- Push notifications require the site to be added to Home Screen
- Consider showing instructions or using a different browser for testing

### Permission Denied
```javascript
if (Notification.permission === 'denied') {
  // Show instructions to manually enable in browser settings
  showNotificationInstructions();
}
```

### Service Worker Issues
- Ensure service worker is served from root path (`/sw.js`)
- Check browser dev tools → Application → Service Workers
- Verify service worker is registered and active

### HTTPS Required
- Push notifications only work on HTTPS (or localhost for development)
- Ensure your site is served over HTTPS in production

## 🎯 Integration Points

### Backend API Endpoints Already Available:
- `GET /api/v1/notifications/push/vapid-public-key` - Get VAPID public key
- `POST /api/v1/notifications/push/subscribe` - Create subscription
- `POST /api/v1/notifications/push/unsubscribe` - Remove subscription
- `POST /api/v1/businesses/my-business/test-reminder` - Test notifications

### Business Settings Integration:
- The business notification settings (`pushEnabled`, `smsEnabled`) control which channels are used
- The push subscription creates the delivery mechanism
- Both are required for notifications to work

## ✅ Success Criteria

After implementation, you should be able to:

1. ✅ **Enable push notifications** in browser (permission granted)
2. ✅ **See subscription created** in backend logs
3. ✅ **Test reminder works** and delivers notification
4. ✅ **Click notification** opens your app
5. ✅ **Disable/re-enable** notifications as needed

## 🔗 Next Steps

1. **Implement the code above** in your frontend framework
2. **Test browser permission flow**
3. **Verify subscription creation** (check backend logs)
4. **Test notification delivery** with reminder endpoint
5. **Add UI controls** for users to manage their notification preferences

The backend is fully ready - you just need to implement the frontend subscription flow! 🚀