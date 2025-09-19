# Push Notification Troubleshooting Guide

## Problem: VAPID Credentials Mismatch

### Error Description
When testing push notifications, you receive a 403 error with the message:
```
the VAPID credentials in the authorization header do not correspond to the credentials used to create the subscriptions.
```

### Root Cause
The push subscription stored in your database was created using a different VAPID public key than what's currently configured in your backend `.env` file.

### Current Backend VAPID Key
Your backend is currently using:
```
VAPID_PUBLIC_KEY=BN6yWsGKd4MpPimb4VyGBdUt2nz5uOd6Pmi2KTz8SeR6Z37VYVjpBkKxSsln1ZgivnZL6LFNLoeP-azWtIH6PcI
```

## Solutions

### Option 1: Re-subscribe with Current VAPID Key (Recommended)
This is the quickest fix - unsubscribe and re-subscribe with the correct VAPID key.

### Option 2: Generate New VAPID Keys
Generate fresh VAPID keys and update both backend and frontend.

---

## Frontend Implementation

### Complete Push Notification Management Code

```javascript
// Push Notification Manager
class PushNotificationManager {
  constructor(baseUrl = '/api/v1/notifications/push') {
    this.baseUrl = baseUrl;
    this.registration = null;
    this.subscription = null;
  }

  // Get auth token (implement based on your auth system)
  getAccessToken() {
    // Replace with your actual token retrieval method
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
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

  // Get VAPID public key from backend
  async getVapidPublicKey() {
    try {
      const response = await fetch(`${this.baseUrl}/vapid-key`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`
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

  // Check if push notifications are supported
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Check notification permission
  async checkPermission() {
    if (!this.isSupported()) {
      return 'not-supported';
    }
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Register service worker
  async registerServiceWorker(swPath = '/sw.js') {
    if (!this.isSupported()) {
      throw new Error('Service workers are not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered successfully');
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribe(deviceName = 'Web Browser', deviceType = 'web') {
    try {
      // 1. Check if supported
      if (!this.isSupported()) {
        throw new Error('Push notifications are not supported');
      }

      // 2. Request permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      // 3. Register service worker if not already registered
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      // 4. Get VAPID public key from backend
      const vapidPublicKey = await this.getVapidPublicKey();

      // 5. Subscribe to push manager
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // 6. Send subscription to backend
      const subscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(this.subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(this.subscription.getKey('auth'))
        },
        deviceName,
        deviceType,
        userAgent: navigator.userAgent
      };

      const response = await fetch(`${this.baseUrl}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      const result = await response.json();
      console.log('Successfully subscribed to push notifications:', result);
      return result.data;

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(subscriptionId = null) {
    try {
      // 1. Get current subscription if not provided
      if (!this.subscription && this.registration) {
        this.subscription = await this.registration.pushManager.getSubscription();
      }

      if (!this.subscription && !subscriptionId) {
        console.log('No active subscription found');
        return true;
      }

      // 2. Unsubscribe from push manager
      if (this.subscription) {
        await this.subscription.unsubscribe();
        console.log('Unsubscribed from push manager');
      }

      // 3. Remove subscription from backend
      const requestBody = {};
      if (subscriptionId) {
        requestBody.subscriptionId = subscriptionId;
      } else if (this.subscription) {
        requestBody.endpoint = this.subscription.endpoint;
      }

      if (Object.keys(requestBody).length > 0) {
        const response = await fetch(`${this.baseUrl}/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          console.warn('Failed to remove subscription from server, but local unsubscribe successful');
        } else {
          console.log('Successfully removed subscription from server');
        }
      }

      this.subscription = null;
      return true;

    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Get all user subscriptions
  async getSubscriptions(activeOnly = true) {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions?activeOnly=${activeOnly}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get subscriptions');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      throw error;
    }
  }

  // Send test notification
  async sendTestNotification(title = 'Test Notification', body = 'This is a test push notification') {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`
        },
        body: JSON.stringify({ title, body })
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      const result = await response.json();
      console.log('Test notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Check current subscription status
  async getSubscriptionStatus() {
    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.getRegistration();
      }

      if (!this.registration) {
        return { subscribed: false, reason: 'No service worker registered' };
      }

      this.subscription = await this.registration.pushManager.getSubscription();

      if (!this.subscription) {
        return { subscribed: false, reason: 'No push subscription found' };
      }

      return {
        subscribed: true,
        endpoint: this.subscription.endpoint,
        subscription: this.subscription
      };
    } catch (error) {
      return { subscribed: false, reason: error.message };
    }
  }
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Usage Examples
const pushManager = new PushNotificationManager();

// Example 1: Subscribe to push notifications
async function subscribeToPushNotifications() {
  try {
    const result = await pushManager.subscribe('My Device', 'web');
    console.log('Subscribed successfully:', result);
  } catch (error) {
    console.error('Failed to subscribe:', error);
  }
}

// Example 2: Unsubscribe from push notifications
async function unsubscribeFromPushNotifications() {
  try {
    await pushManager.unsubscribe();
    console.log('Unsubscribed successfully');
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
  }
}

// Example 3: Check subscription status
async function checkPushSubscriptionStatus() {
  const status = await pushManager.getSubscriptionStatus();
  console.log('Subscription status:', status);
}

// Example 4: Send test notification
async function testPushNotification() {
  try {
    await pushManager.sendTestNotification();
    console.log('Test notification sent');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
}
```

## Step-by-Step Fix Instructions

### Step 1: Check Current Subscription Status
```javascript
const status = await pushManager.getSubscriptionStatus();
console.log('Current subscription:', status);
```

### Step 2: Unsubscribe from Existing Subscription
```javascript
await pushManager.unsubscribe();
```

### Step 3: Subscribe with Correct VAPID Key
```javascript
await pushManager.subscribe('My Device', 'web');
```

### Step 4: Test Push Notification
```javascript
await pushManager.sendTestNotification('Test', 'Push notification fixed!');
```

## Service Worker (sw.js)

Create a service worker file at `/public/sw.js`:

```javascript
// sw.js - Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);

  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      data: data.data,
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icon-open.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-close.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Handle notification click
  event.waitUntil(
    clients.matchAll().then(function(clientList) {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window/tab if none exists
      if (clients.openWindow) {
        const data = event.notification.data;
        const url = data && data.url ? data.url : '/';
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});
```

## Backend API Endpoints Reference

Your backend already has these endpoints available:

- `GET /api/v1/notifications/push/vapid-key` - Get VAPID public key
- `POST /api/v1/notifications/push/subscribe` - Subscribe to push notifications
- `POST /api/v1/notifications/push/unsubscribe` - Unsubscribe from push notifications
- `GET /api/v1/notifications/push/subscriptions` - Get user subscriptions
- `POST /api/v1/notifications/push/test` - Send test notification
- `GET /api/v1/notifications/push/health` - Health check

## Troubleshooting Tips

1. **Always unsubscribe before subscribing again** when changing VAPID keys
2. **Check browser console** for detailed error messages
3. **Verify service worker registration** before subscribing
4. **Test with different browsers** to isolate browser-specific issues
5. **Check notification permissions** in browser settings

## Testing the Fix

After implementing the fix:

1. Open browser developer tools
2. Navigate to your application
3. Run the unsubscribe function
4. Run the subscribe function
5. Test push notifications
6. Verify notifications appear properly

The error should be resolved after re-subscribing with the correct VAPID key.