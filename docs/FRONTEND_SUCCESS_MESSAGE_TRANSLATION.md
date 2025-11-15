# Frontend Integration Guide: Success Message Translation

## Overview

The backend API now automatically translates all success messages based on the user's language preference. The API returns both:
- **Translation key** (`key` field) - for frontend i18n libraries
- **Translated message** (`message` field) - ready to display

You can use either approach or both, depending on your frontend setup.

## API Response Structure

### Success Response Format

```typescript
interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  data?: T;
  message?: string;        // Translated message (ready to display)
  key?: string;            // Translation key (e.g., 'success.appointment.created')
  meta?: Record<string, any>;
}
```

### Example Response

```json
{
  "success": true,
  "statusCode": 201,
  "key": "success.appointment.created",
  "message": "Randevu başarıyla oluşturuldu",
  "data": {
    "id": "appt_123",
    "date": "2024-01-15",
    "time": "14:00"
  }
}
```

### Error Response Format (for reference)

```typescript
interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    key: string;           // Translation key (e.g., 'errors.auth.unauthorized')
    message: string;       // Translated error message
    requestId?: string;
    details?: any;
  };
}
```

## Usage Approaches

### Approach 1: Use Translated Message Directly (Simplest)

The backend already translates the message, so you can display it directly:

```typescript
// React example
const createAppointment = async (appointmentData) => {
  try {
    const response = await api.post('/appointments', appointmentData);
    
    if (response.data.success) {
      // Display the translated message directly
      toast.success(response.data.message);
      // "Randevu başarıyla oluşturuldu" (Turkish)
      // or "Appointment created successfully" (English)
    }
  } catch (error) {
    // Handle error
  }
};
```

**Pros:**
- ✅ Simple, no frontend i18n setup needed
- ✅ Always matches backend language
- ✅ No translation maintenance

**Cons:**
- ❌ Can't customize message format
- ❌ Can't use frontend translation features (pluralization, etc.)

### Approach 2: Use Translation Key with Frontend i18n (Recommended)

Use the `key` field with your frontend i18n library for more control:

```typescript
// With i18next
import { useTranslation } from 'react-i18next';

const createAppointment = async (appointmentData) => {
  try {
    const response = await api.post('/appointments', appointmentData);
    
    if (response.data.success) {
      // Use the key with your frontend i18n
      const { t } = useTranslation();
      toast.success(t(response.data.key));
      // This uses your frontend translation files
    }
  } catch (error) {
    // Handle error
  }
};
```

**Pros:**
- ✅ Full control over message formatting
- ✅ Can use frontend i18n features (pluralization, formatting)
- ✅ Consistent with your frontend translation system
- ✅ Can customize messages per feature

**Cons:**
- ❌ Requires maintaining translation files on frontend
- ❌ Must keep frontend translations in sync with backend keys

### Approach 3: Hybrid Approach (Best of Both Worlds)

Try frontend translation first, fallback to backend message:

```typescript
const createAppointment = async (appointmentData) => {
  try {
    const response = await api.post('/appointments', appointmentData);
    
    if (response.data.success) {
      const { t } = useTranslation();
      
      // Try frontend translation, fallback to backend message
      const message = response.data.key 
        ? (t(response.data.key, { defaultValue: response.data.message }))
        : response.data.message;
      
      toast.success(message);
    }
  } catch (error) {
    // Handle error
  }
};
```

**Pros:**
- ✅ Flexible: Use frontend translation when available
- ✅ Safe fallback to backend message
- ✅ Best user experience

## Complete Examples

### React with TypeScript

```typescript
// types/api.ts
interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  message?: string;
  key?: string;
  meta?: Record<string, any>;
}

// hooks/useApi.ts
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

export const useApi = () => {
  const { t, i18n } = useTranslation();
  
  const handleSuccess = (response: ApiResponse, options?: {
    showToast?: boolean;
    customMessage?: string;
  }) => {
    if (options?.showToast !== false) {
      const message = options?.customMessage 
        || (response.key ? t(response.key, { defaultValue: response.message }) 
            : response.message) 
        || 'Success';
      
      toast.success(message);
    }
    
    return response.data;
  };
  
  return { handleSuccess };
};

// Component usage
const AppointmentForm = () => {
  const { handleSuccess } = useApi();
  
  const createAppointment = async (data) => {
    try {
      const response = await api.post('/appointments', data);
      
      if (response.data.success) {
        const appointment = handleSuccess(response.data);
        // Use appointment data...
      }
    } catch (error) {
      // Handle error
    }
  };
  
  return <form onSubmit={createAppointment}>...</form>;
};
```

### Vue.js with TypeScript

```typescript
// composables/useApi.ts
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';

export const useApi = () => {
  const { t } = useI18n();
  const toast = useToast();
  
  const handleSuccess = (response: ApiResponse, options?: {
    showToast?: boolean;
    customMessage?: string;
  }) => {
    if (options?.showToast !== false) {
      const message = options?.customMessage 
        || (response.key ? t(response.key, response.message) 
            : response.message) 
        || 'Success';
      
      toast.success(message);
    }
    
    return response.data;
  };
  
  return { handleSuccess };
};

// Component usage
<script setup lang="ts">
import { useApi } from '@/composables/useApi';

const { handleSuccess } = useApi();

const createAppointment = async (data) => {
  try {
    const response = await api.post('/appointments', data);
    
    if (response.data.success) {
      const appointment = handleSuccess(response.data);
      // Use appointment data...
    }
  } catch (error) {
    // Handle error
  }
};
</script>
```

### React Native

```typescript
// utils/api.ts
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/toast';

export const handleApiSuccess = (response: ApiResponse) => {
  const { t } = useTranslation();
  
  const message = response.key 
    ? t(response.key, { defaultValue: response.message })
    : response.message;
  
  if (message) {
    showToast(message, 'success');
  }
  
  return response.data;
};

// Usage
const createAppointment = async (data) => {
  try {
    const response = await api.post('/appointments', data);
    
    if (response.data.success) {
      const appointment = handleApiSuccess(response.data);
      // Use appointment data...
    }
  } catch (error) {
    // Handle error
  }
};
```

### Axios Interceptor (Global Handler)

```typescript
// utils/axios.ts
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Accept-Language': localStorage.getItem('language') || 'tr',
  },
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Handle success responses
    if (response.data.success && response.data.message) {
      const { t } = useTranslation();
      
      // Optionally show toast for all success messages
      if (response.config.showSuccessToast !== false) {
        const message = response.data.key 
          ? t(response.data.key, { defaultValue: response.data.message })
          : response.data.message;
        
        toast.success(message);
      }
    }
    
    return response;
  },
  (error) => {
    // Handle error responses
    if (error.response?.data?.error) {
      const { t } = useTranslation();
      const errorData = error.response.data.error;
      
      const message = errorData.key 
        ? t(errorData.key, { defaultValue: errorData.message })
        : errorData.message;
      
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## Language Detection

The backend automatically detects the language from:

1. **`Accept-Language` header** (sent by frontend)
2. **User's stored language preference** (after authentication)
3. **Default: `tr` (Turkish)**

### Setting Language in Frontend

```typescript
// Set language in API requests
api.defaults.headers.common['Accept-Language'] = userLanguage || 'tr';

// Or per request
api.post('/appointments', data, {
  headers: {
    'Accept-Language': 'en'
  }
});
```

### Synchronizing Language

```typescript
// When user changes language, update API headers
const changeLanguage = (lang: string) => {
  // Update frontend i18n
  i18n.changeLanguage(lang);
  
  // Update API headers
  api.defaults.headers.common['Accept-Language'] = lang;
  
  // Optionally save to backend
  api.patch('/users/me', { language: lang });
};
```

## Available Translation Keys

### Common Success Keys

#### Appointments
- `success.appointment.created` - Appointment created successfully
- `success.appointment.updated` - Appointment updated successfully
- `success.appointment.cancelled` - Appointment cancelled successfully
- `success.appointment.confirmed` - Appointment confirmed successfully
- `success.appointment.batchUpdated` - `{{count}} appointments updated`
- `success.appointment.batchCancelled` - `{{count}} appointments cancelled`
- `success.appointment.retrieved` - Appointment retrieved successfully
- `success.appointment.retrievedList` - Appointments retrieved successfully

#### Authentication
- `success.auth.login` - Login successful
- `success.auth.logout` - Logout successful
- `success.auth.registered` - Registration successful
- `success.auth.verified` - Account verified successfully
- `success.auth.passwordReset` - Password reset link sent
- `success.auth.passwordChanged` - Password changed successfully

#### Business
- `success.business.created` - Business created successfully
- `success.business.updated` - Business updated successfully
- `success.business.deleted` - Business deleted successfully

#### Services
- `success.service.created` - Service created successfully
- `success.service.updated` - Service updated successfully
- `success.service.deleted` - Service deleted successfully

#### Staff
- `success.staff.created` - Staff member created successfully
- `success.staff.updated` - Staff member updated successfully
- `success.staff.deleted` - Staff member deleted successfully

#### Subscriptions
- `success.subscription.created` - Subscription created successfully
- `success.subscription.updated` - Subscription updated successfully
- `success.subscription.cancelled` - Subscription cancelled successfully

#### Discount Codes
- `success.discountCode.created` - Discount code created successfully
- `success.discountCode.applied` - Discount code applied successfully
- `success.discountCode.validated` - Discount code validated

#### Payments
- `success.payment.subscriptionCreated` - Subscription payment created
- `success.payment.refunded` - Payment refunded successfully
- `success.payment.cancelled` - Payment cancelled successfully

#### Notifications
- `success.notification.sent` - Notification sent successfully
- `success.pushNotification.subscribed` - Subscribed to push notifications
- `success.pushNotification.unsubscribed` - Unsubscribed from push notifications

#### Reports
- `success.report.businessOverviewRetrieved` - Business overview retrieved
- `success.report.revenueRetrieved` - Revenue report retrieved
- `success.report.exported` - `{{reportType}} report exported`

#### General
- `success.general.created` - `{{resource}} created successfully`
- `success.general.updated` - `{{resource}} updated successfully`
- `success.general.deleted` - `{{resource}} deleted successfully`
- `success.general.retrieved` - `{{resource}} retrieved successfully`

> **Note:** For a complete list of all translation keys, refer to `src/services/translationServiceFallback.ts` in the backend codebase.

## Handling Parameters

Some messages include parameters that need to be interpolated:

```typescript
// Backend response
{
  "success": true,
  "key": "success.appointment.batchUpdated",
  "message": "5 randevu başarıyla güncellendi",
  "data": { ... }
}
```

If using frontend i18n, you may need to handle parameters:

```typescript
// Frontend translation file
{
  "success.appointment.batchUpdated": "{{count}} appointments updated successfully"
}

// Usage
const { t } = useTranslation();
const message = t(response.data.key, { count: response.data.meta?.count });
```

## Best Practices

### 1. Type Safety

Define TypeScript interfaces for API responses:

```typescript
interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  data?: T;
  message?: string;
  key?: string;
  meta?: Record<string, any>;
}

interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    key: string;
    message: string;
    requestId?: string;
  };
}

type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
```

### 2. Centralized Success Handler

Create a reusable utility:

```typescript
// utils/apiHelpers.ts
export const handleSuccess = <T>(
  response: SuccessResponse<T>,
  options?: {
    showToast?: boolean;
    useFrontendTranslation?: boolean;
    customMessage?: string;
  }
): T | undefined => {
  const { showToast = true, useFrontendTranslation = false, customMessage } = options || {};
  
  if (showToast) {
    const { t } = useTranslation();
    
    let message = customMessage;
    
    if (!message) {
      if (useFrontendTranslation && response.key) {
        message = t(response.key, { defaultValue: response.message });
      } else {
        message = response.message;
      }
    }
    
    if (message) {
      toast.success(message);
    }
  }
  
  return response.data;
};
```

### 3. Consistent Error Handling

Handle both success and error responses consistently:

```typescript
const handleApiResponse = <T>(
  response: ApiResponse<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: ErrorResponse) => void;
    showMessages?: boolean;
  }
) => {
  if (response.success) {
    if (options?.showMessages) {
      handleSuccess(response);
    }
    options?.onSuccess?.(response.data);
  } else {
    if (options?.showMessages) {
      handleError(response);
    }
    options?.onError?.(response);
  }
};
```

### 4. Testing

Test with different languages:

```typescript
describe('API Success Messages', () => {
  it('should receive translated message in Turkish', async () => {
    const response = await api.post('/appointments', data, {
      headers: { 'Accept-Language': 'tr' }
    });
    
    expect(response.data.message).toBe('Randevu başarıyla oluşturuldu');
    expect(response.data.key).toBe('success.appointment.created');
  });
  
  it('should receive translated message in English', async () => {
    const response = await api.post('/appointments', data, {
      headers: { 'Accept-Language': 'en' }
    });
    
    expect(response.data.message).toBe('Appointment created successfully');
    expect(response.data.key).toBe('success.appointment.created');
  });
});
```

## Migration Guide

### From Hardcoded Messages

**Before:**
```typescript
if (response.data.success) {
  toast.success('Appointment created successfully');
}
```

**After:**
```typescript
if (response.data.success) {
  toast.success(response.data.message); // Use translated message
  // or
  toast.success(t(response.data.key)); // Use frontend i18n
}
```

### From Custom Success Messages

**Before:**
```typescript
const SUCCESS_MESSAGES = {
  APPOINTMENT_CREATED: 'Appointment created successfully',
  APPOINTMENT_UPDATED: 'Appointment updated successfully',
};
```

**After:**
```typescript
// Use API response message directly
toast.success(response.data.message);

// Or use translation key with frontend i18n
toast.success(t(response.data.key));
```

## Troubleshooting

### Message Not Translated

**Issue:** Receiving translation key instead of message

**Solution:** Ensure `Accept-Language` header is set:
```typescript
api.defaults.headers.common['Accept-Language'] = 'tr';
```

### Frontend Translation Not Found

**Issue:** `t(response.data.key)` returns the key

**Solution:** Add translation to your frontend i18n files, or use fallback:
```typescript
t(response.data.key, { defaultValue: response.data.message })
```

### Language Mismatch

**Issue:** Frontend shows one language, backend returns another

**Solution:** Synchronize language settings:
```typescript
// When user changes language
const changeLanguage = (lang) => {
  i18n.changeLanguage(lang);
  api.defaults.headers.common['Accept-Language'] = lang;
  localStorage.setItem('language', lang);
};
```

## Support

For questions or issues:
- Check backend documentation: `docs/SUCCESS_MESSAGE_TRANSLATION.md`
- Review translation keys: `src/services/translationServiceFallback.ts`
- Contact backend team for new translation keys

---

**Last Updated:** January 2024
**API Version:** v1




