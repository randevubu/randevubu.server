# Language Detection and Translation System

## Overview

This document explains the language detection and translation system implemented on the backend server. The system automatically detects the user's preferred language, applies it throughout the request lifecycle, and returns translated error messages and responses based on the detected language.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [How It Works](#how-it-works)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Integration Guide](#frontend-integration-guide)
5. [API Response Structure](#api-response-structure)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

---

## System Architecture

### Language Detection Priority

The system detects language in the following priority order:

1. **Authenticated User Preference** (Highest Priority)
   - If user is authenticated and has a `language` preference set in their profile
   - This overrides all other sources

2. **Accept-Language HTTP Header** (Standard HTTP)
   - Browser automatically sends this header
   - Supports quality scores (e.g., `en-US,en;q=0.9,tr;q=0.8`)
   - Only supported languages are considered: `tr`, `en`

3. **Default Language** (Fallback)
   - Falls back to `tr` (Turkish) if no language is detected

### Middleware Flow

```
Request → RequestID Middleware → Language Detection Middleware → ... → Auth Middleware → Routes → Error Handler
                                ↓                                                ↓
                          Sets req.language                            Updates req.language from user
                                                                    (if authenticated)
```

---

## How It Works

### Backend Flow

1. **Early Detection (Language Middleware)**
   - Runs immediately after `requestIdMiddleware`
   - Parses `Accept-Language` header
   - Sets `req.language` to detected/default language
   - Sets response header `X-Detected-Language` for debugging

2. **User Preference Override (Auth Middleware)**
   - After user authentication, checks `user.language`
   - If valid, overrides `req.language` with user preference
   - Happens automatically in:
     - `authMiddleware.authenticate()`
     - `authMiddleware.optionalAuth()`
     - `requireAuth()` from authUtils
     - `authenticateToken()` from authUtils

3. **Error Translation (Error Handler)**
   - Final check for user language (as fallback)
   - Translates error messages using detected language
   - Returns both translation key and translated message

4. **Translation Utilities**
   - `translateMessage()` function available throughout the application
   - Uses `TranslationService` with caching support
   - Automatically uses `req.language` if available

### Language Detection Example

**Request without authentication:**
```
Headers:
  Accept-Language: en-US,en;q=0.9,tr;q=0.8

Result: req.language = "en" (first supported language from header)
```

**Request with authenticated user:**
```
Headers:
  Accept-Language: en-US,en;q=0.9
  
User Profile:
  language: "tr"

Result: req.language = "tr" (user preference overrides header)
```

---

## Backend Implementation

### Key Files

- **`src/middleware/language.ts`**: Language detection middleware
- **`src/middleware/auth.ts`**: Auth middleware (updates language from user)
- **`src/middleware/error.ts`**: Error handler (translates messages)
- **`src/utils/translationUtils.ts`**: Translation utilities
- **`src/services/translationServiceFallback.ts`**: Translation service with all error messages in both languages
- **`src/types/auth.ts`**: Type definitions (includes `language` in `AuthenticatedUser`)

### Supported Languages

Currently supported:
- `tr` (Turkish) - Default
- `en` (English)

### Translation Files

All error messages and notification messages are stored in `src/services/translationServiceFallback.ts` with translations for both languages:

**Location:** `src/services/translationServiceFallback.ts`

**Structure:**
```typescript
{
  tr: {
    'errors.auth.unauthorized': 'Yetkilendirme gerekli',
    'errors.auth.invalidCredentials': 'Geçersiz kimlik bilgileri',
    // ... all error messages in Turkish
  },
  en: {
    'errors.auth.unauthorized': 'Authorization required',
    'errors.auth.invalidCredentials': 'Invalid credentials',
    // ... all error messages in English
  }
}
```

**Coverage:**
- ✅ All authentication errors (13 messages)
- ✅ All business errors (15 messages)
- ✅ All appointment errors (13 messages)
- ✅ All service errors (7 messages)
- ✅ All customer errors (4 messages)
- ✅ All staff errors (5 messages)
- ✅ All role & permission errors (7 messages)
- ✅ All validation errors (10 messages)
- ✅ All system errors (7 messages)
- ✅ All subscription errors (5 messages)
- ✅ All notification errors (3 messages)
- ✅ All notification messages (7 messages)

**Total: ~100 translation keys in both languages**

### Request Object Extension

The `Request` object is extended with:

```typescript
interface Request {
  language?: string; // Detected language code ('tr' or 'en')
}
```

This is available in all controllers, services, and middleware.

---

## Frontend Integration Guide

### What the Frontend Needs to Do

#### 1. Send Accept-Language Header (Automatic)

Browsers automatically send the `Accept-Language` header. However, you can explicitly set it in API requests:

```typescript
// Next.js API route or fetch call
fetch('/api/endpoint', {
  headers: {
    'Accept-Language': 'en', // or 'tr'
    'Authorization': 'Bearer ...'
  }
});

// With axios
axios.get('/api/endpoint', {
  headers: {
    'Accept-Language': userLanguage || 'tr'
  }
});
```

#### 2. Handle Language in User Profile

**When user logs in/registers:**
- Store the user's language preference in your state/context
- Send it to the backend when updating user profile

**API Request Example:**
```typescript
// Update user language preference
await api.put('/api/v1/users/me', {
  language: 'en' // or 'tr'
});
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "language": "en",
      ...
    }
  }
}
```

#### 3. Handle API Error Responses

The backend now returns errors with **both** translation keys and translated messages:

**Error Response Structure:**
```typescript
interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;              // Error code (e.g., "UNAUTHORIZED")
    key: string;               // Translation key (e.g., "errors.auth.unauthorized")
    message: string;          // Translated message in detected language
    requestId?: string;       // Request ID for debugging
    details?: any;            // Additional error details
  };
}
```

**Example Error Response:**
```json
{
  "success": false,
  "statusCode": 401,
  "error": {
    "code": "UNAUTHORIZED",
    "key": "errors.auth.unauthorized",
    "message": "Yetkilendirme gerekli",  // Turkish translation
    "requestId": "abc-123-def"
  }
}
```

#### 4. Frontend Error Handling Strategy

You have **three options** for handling errors:

**Option A: Use the Translated Message (Simplest)**
```typescript
// Just display the message directly
const response = await api.get('/endpoint');

if (!response.success && response.error) {
  // Backend already translated it!
  showError(response.error.message); // "Yetkilendirme gerekli"
}
```

**Option B: Use Translation Keys (More Flexible)**
```typescript
// Use the key with your i18n library (react-i18next, next-intl, etc.)
const response = await api.get('/endpoint');

if (!response.success && response.error) {
  // Use the key with your frontend translation system
  const message = t(response.error.key); // t('errors.auth.unauthorized')
  
  // Or fallback to backend message
  const message = t(response.error.key) || response.error.message;
  showError(message);
}
```

**Option C: Hybrid Approach (Recommended)**
```typescript
// Try frontend translation first, fallback to backend message
const response = await api.get('/endpoint');

if (!response.success && response.error) {
  // Frontend can override with better translations
  const frontendMessage = i18n.t(response.error.key);
  const message = frontendMessage !== response.error.key 
    ? frontendMessage 
    : response.error.message; // Fallback to backend translation
  
  showError(message);
}
```

#### 5. Check Detected Language

The backend sends the detected language in response headers:

```typescript
// Get detected language from response header
const response = await fetch('/api/endpoint');
const detectedLanguage = response.headers.get('X-Detected-Language'); // 'tr' or 'en'

// You can use this to sync your frontend language state
if (detectedLanguage) {
  setCurrentLanguage(detectedLanguage);
}
```

#### 6. Success Messages (Future Enhancement)

Currently, success messages are not automatically translated. If you want translated success messages, you can:

```typescript
// In your controllers/services, use:
import { translateMessage } from '../utils/translationUtils';

const message = await translateMessage(
  'success.user.updated',
  { name: user.firstName },
  req.language,
  req
);

sendSuccessResponse(res, message, userData);
```

---

## API Response Structure

### Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;        // Not currently translated, but can be
  data?: T;
  meta?: Record<string, any>;
}
```

**Example:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    "user": { ... }
  }
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;                    // Programmatic error code
    key: string;                      // Translation key for i18n
    message: string;                 // Translated message (detected language)
    requestId?: string;              // Request ID for debugging
    details?: {                      // Additional context
      field?: string;
      attemptCount?: number;
      maxAttempts?: number;
      retryAfter?: number;
    };
  };
}
```

**Example (Turkish):**
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "key": "errors.validation.general",
    "message": "Geçersiz veri gönderildi",
    "requestId": "req-123-456"
  }
}
```

**Example (English):**
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "key": "errors.validation.general",
    "message": "Invalid data provided",
    "requestId": "req-123-456"
  }
}
```

---

## Error Handling

### Error Codes and Translation Keys

All error codes have corresponding translation keys. The mapping is defined in `src/constants/errorCodes.ts`.

**Common Error Codes:**
- `UNAUTHORIZED` → `errors.auth.unauthorized`
- `INVALID_CREDENTIALS` → `errors.auth.invalidCredentials`
- `VALIDATION_ERROR` → `errors.validation.general`
- `BUSINESS_NOT_FOUND` → `errors.business.notFound`
- `APPOINTMENT_TIME_CONFLICT` → `errors.appointment.timeConflict`

**Full list available in:** `src/constants/errorCodes.ts`

### Error Handling in Frontend

**Recommended Frontend Error Handler:**

```typescript
// utils/errorHandler.ts
import { ErrorResponse } from '@/types/api';

export function handleApiError(error: ErrorResponse['error']) {
  // Option 1: Use backend translated message
  return error.message;
  
  // Option 2: Use translation key with your i18n
  // return i18n.t(error.key);
  
  // Option 3: Hybrid
  // const translated = i18n.t(error.key);
  // return translated !== error.key ? translated : error.message;
}

// Usage
try {
  const response = await api.post('/endpoint', data);
  if (!response.success) {
    const errorMessage = handleApiError(response.error);
    toast.error(errorMessage);
  }
} catch (error) {
  // Network errors, etc.
  toast.error('Network error occurred');
}
```

---

## Best Practices

### For Frontend Developers

1. **Always Check Both `key` and `message`**
   ```typescript
   // Backend provides both for flexibility
   const message = i18n.t(error.key) || error.message;
   ```

2. **Handle Language Changes**
   ```typescript
   // When user changes language in frontend
   async function changeLanguage(lang: 'tr' | 'en') {
     // Update user profile on backend
     await api.put('/api/v1/users/me', { language: lang });
     
     // Update frontend state
     setLanguage(lang);
     i18n.changeLanguage(lang);
   }
   ```

3. **Sync Language on Login**
   ```typescript
   // After successful login
   const { user } = await login(credentials);
   
   // Sync language from backend
   if (user.language) {
     i18n.changeLanguage(user.language);
     setLanguage(user.language);
   }
   ```

4. **Use Translation Keys for Consistency**
   - If you're using a frontend i18n library (react-i18next, next-intl, etc.)
   - Keep your frontend translation keys matching backend keys
   - This allows you to override backend translations if needed

5. **Check Response Headers**
   ```typescript
   // Sync language from backend detection
   const response = await fetch('/api/endpoint');
   const detectedLang = response.headers.get('X-Detected-Language');
   if (detectedLang && detectedLang !== currentLanguage) {
     // Language was detected/overridden
   }
   ```

### For Backend Developers

1. **Use Translation Utilities**
   ```typescript
   import { translateMessage } from '../utils/translationUtils';
   
   const message = await translateMessage(
     'success.operation.completed',
     { itemName: 'Appointment' },
     req.language,
     req
   );
   ```

2. **Language is Always Available**
   ```typescript
   // req.language is always set (defaults to 'tr')
   const language = req.language || 'tr';
   ```

3. **Don't Hardcode Messages**
   ```typescript
   // ❌ Bad
   sendSuccessResponse(res, 'İşlem başarılı', data);
   
   // ✅ Good
   const message = await translateMessage(
     'success.operation.completed',
     {},
     req.language,
     req
   );
   sendSuccessResponse(res, message, data);
   ```

---

## Testing

### Testing Language Detection

**Test with Different Headers:**
```bash
# Test Turkish
curl -H "Accept-Language: tr" http://localhost:3000/api/v1/status

# Test English
curl -H "Accept-Language: en" http://localhost:3000/api/v1/status

# Check response header
# X-Detected-Language: tr (or en)
```

**Test with Authenticated User:**
```bash
# 1. Login and get token
# 2. User has language='en' in profile
# 3. Make request with Turkish Accept-Language header

curl -H "Authorization: Bearer <token>" \
     -H "Accept-Language: tr" \
     http://localhost:3000/api/v1/users/me

# Result: Should use user language ('en'), not header ('tr')
```

### Testing Error Translation

**Trigger an error and check response:**
```bash
# Unauthorized request
curl http://localhost:3000/api/v1/protected-endpoint

# Response should include:
# {
#   "error": {
#     "code": "UNAUTHORIZED",
#     "key": "errors.auth.unauthorized",
#     "message": "..." // Translated based on Accept-Language
#   }
# }
```

---

## Translation Keys Reference

### Error Keys Format

All error translation keys follow this pattern:
```
errors.{category}.{specificError}
```

**Categories:**
- `errors.auth.*` - Authentication errors
- `errors.business.*` - Business-related errors
- `errors.appointment.*` - Appointment errors
- `errors.validation.*` - Validation errors
- `errors.system.*` - System errors

**Examples:**
- `errors.auth.unauthorized` - "Authorization required"
- `errors.auth.invalidCredentials` - "Invalid credentials"
- `errors.business.notFound` - "Business not found"
- `errors.appointment.timeConflict` - "Appointment time conflict"

### Full Key List

See `src/constants/errorCodes.ts` for the complete list of error codes and their corresponding translation keys.

---

## Migration Guide for Existing Frontend

If you have an existing frontend that handles errors:

### Before (Old Way)
```typescript
// Old: Only error code
if (error.code === 'UNAUTHORIZED') {
  showError('You are not authorized');
}
```

### After (New Way)
```typescript
// New: Use translated message directly
if (!response.success) {
  showError(response.error.message); // Already translated!
}

// Or use key for more control
const message = i18n.t(response.error.key) || response.error.message;
showError(message);
```

### Step-by-Step Migration

1. **Update Error Type Definition**
   ```typescript
   // types/api.ts
   interface ErrorResponse {
     success: false;
     statusCode: number;
     error: {
       code: string;
       key: string;        // NEW
       message: string;    // NEW (translated)
       requestId?: string;
       details?: any;
     };
   }
   ```

2. **Update Error Handler**
   ```typescript
   // utils/api.ts
   function handleError(error: ErrorResponse['error']) {
     // Use translated message
     return error.message;
   }
   ```

3. **Optional: Add Frontend Translations**
   ```typescript
   // locales/en.json
   {
     "errors": {
       "auth": {
         "unauthorized": "Authorization required",
         "invalidCredentials": "Invalid credentials"
       }
     }
   }
   
   // locales/tr.json
   {
     "errors": {
       "auth": {
         "unauthorized": "Yetkilendirme gerekli",
         "invalidCredentials": "Geçersiz kimlik bilgileri"
       }
     }
   }
   ```

---

## FAQ

### Q: What if the frontend wants to override backend translations?

**A:** Use the `key` field to look up your own translations:
```typescript
const message = myTranslations[error.key] || error.message;
```

### Q: What happens if translation fails?

**A:** The backend falls back to the original error message, so you always get a message.

### Q: How do I change the user's language preference?

**A:** Update the user profile:
```typescript
PUT /api/v1/users/me
{
  "language": "en"
}
```

### Q: What if Accept-Language header has unsupported language?

**A:** Backend falls back to default language (`tr`).

### Q: Do success messages get translated?

**A:** Not automatically yet. Controllers can use `translateMessage()` utility if needed. This can be added per endpoint as needed.

### Q: How do I test language detection locally?

**A:** 
1. Use browser dev tools to modify `Accept-Language` header
2. Or use curl: `curl -H "Accept-Language: en" http://localhost:3000/api/v1/status`
3. Check `X-Detected-Language` response header

### Q: What languages are currently supported?

**A:** Currently `tr` (Turkish) and `en` (English). Default is `tr`.

### Q: Can I add more languages?

**A:** Yes, but you need to:
1. Add translations to `TranslationService` 
2. Update `SUPPORTED_LANGUAGES` in `src/middleware/language.ts`
3. Add frontend translations for the new language

---

## Complete Frontend Implementation Example

### TypeScript Types for Frontend

```typescript
// types/api.ts

export interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    key: string;
    message: string;  // Translated message
    requestId?: string;
    details?: {
      field?: string;
      attemptCount?: number;
      maxAttempts?: number;
      retryAfter?: number;
    };
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
```

### React Hook Example (Next.js)

```typescript
// hooks/useApi.ts
import { useState } from 'react';
import { ApiResponse } from '@/types/api';

export function useApi<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T> | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': getUserLanguage(), // Get from your state/context
          ...options.headers,
        },
      });

      const data: ApiResponse<T> = await response.json();

      // Check detected language from header
      const detectedLang = response.headers.get('X-Detected-Language');
      if (detectedLang) {
        syncLanguage(detectedLang); // Sync with your language state
      }

      if (!data.success) {
        // Handle error - message is already translated!
        setError(data.error.message);
        return null;
      }

      return data;
    } catch (err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { request, loading, error };
}

function getUserLanguage(): string {
  // Get from your language context/state
  return localStorage.getItem('language') || 'tr';
}

function syncLanguage(lang: string) {
  // Update your language state if different
  const currentLang = localStorage.getItem('language');
  if (currentLang !== lang) {
    localStorage.setItem('language', lang);
    // Trigger language change in your i18n library
  }
}
```

### Error Display Component Example

```typescript
// components/ErrorMessage.tsx
import { ErrorResponse } from '@/types/api';

interface Props {
  error: ErrorResponse['error'];
}

export function ErrorMessage({ error }: Props) {
  // Option 1: Use backend translated message directly
  return <div className="error">{error.message}</div>;

  // Option 2: Use frontend translation with fallback
  // const message = i18n.t(error.key) || error.message;
  // return <div className="error">{message}</div>;
}
```

### Language Sync on Login Example

```typescript
// utils/auth.ts
export async function handleLogin(credentials: LoginCredentials) {
  const response = await api.post('/api/v1/auth/verify-login', credentials);

  if (response.success && response.data?.user) {
    const { user, tokens } = response.data;

    // Sync language from backend
    if (user.language) {
      i18n.changeLanguage(user.language);
      localStorage.setItem('language', user.language);
      setLanguage(user.language); // Your state setter
    }

    // Store tokens, user data, etc.
    return { user, tokens };
  }

  // Handle error (already translated by backend)
  throw new Error(response.error?.message || 'Login failed');
}
```

### Update User Language Preference Example

```typescript
// utils/user.ts
export async function updateUserLanguage(language: 'tr' | 'en') {
  const response = await api.put('/api/v1/users/me', { language });

  if (response.success) {
    // Update frontend language
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    setLanguage(language);
    
    // Backend will use this language for all future requests
    return true;
  }

  throw new Error(response.error?.message || 'Failed to update language');
}
```

### Axios Interceptor Example

```typescript
// utils/apiClient.ts
import axios, { AxiosError, AxiosResponse } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor - Add Accept-Language header
apiClient.interceptors.request.use((config) => {
  const language = getCurrentLanguage(); // From your state/context
  config.headers['Accept-Language'] = language || 'tr';
  return config;
});

// Response interceptor - Sync language and handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Check detected language from header
    const detectedLang = response.headers['x-detected-language'];
    if (detectedLang && detectedLang !== getCurrentLanguage()) {
      syncLanguageFromBackend(detectedLang);
    }
    return response;
  },
  (error: AxiosError<ErrorResponse>) => {
    if (error.response?.data?.error) {
      // Error message is already translated!
      const errorMessage = error.response.data.error.message;
      // Display error message
      showErrorNotification(errorMessage);
    }
    return Promise.reject(error);
  }
);

function getCurrentLanguage(): string {
  // Get from localStorage, context, or i18n
  return localStorage.getItem('language') || 'tr';
}

function syncLanguageFromBackend(lang: string) {
  localStorage.setItem('language', lang);
  // Update your i18n library
  i18n.changeLanguage(lang);
}

export default apiClient;
```

### Next.js API Route Handler Example

```typescript
// app/api/proxy/[...path]/route.ts (Next.js 13+ App Router)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const language = req.headers.get('accept-language') || 'tr';

  const response = await fetch(`${process.env.API_URL}/api/v1/${path}`, {
    headers: {
      'Accept-Language': language,
      'Authorization': req.headers.get('authorization') || '',
    },
  });

  const data = await response.json();

  // Forward the detected language header
  const detectedLang = response.headers.get('X-Detected-Language');
  const headers = new Headers();
  if (detectedLang) {
    headers.set('X-Detected-Language', detectedLang);
  }

  return NextResponse.json(data, { headers });
}
```

### Complete Error Boundary Example (React)

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorResponse } from '@/types/api';

interface Props {
  children: ReactNode;
}

interface State {
  error: ErrorResponse['error'] | null;
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: any): State {
    // If it's an API error, extract it
    if (error?.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('API Error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      // Display translated error message
      return (
        <div className="error-container">
          <h2>Error</h2>
          <p>{this.state.error.message}</p>
          {this.state.error.requestId && (
            <small>Request ID: {this.state.error.requestId}</small>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

### React Query Hook Example

```typescript
// hooks/useQuery.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiResponse } from '@/types/api';

export function useApiQuery<T>(endpoint: string) {
  return useQuery<ApiResponse<T>>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint, {
        headers: {
          'Accept-Language': getCurrentLanguage(),
        },
      });
      const data: ApiResponse<T> = await response.json();
      
      // Check for errors (message already translated)
      if (!data.success) {
        throw new Error(data.error.message);
      }
      
      return data;
    },
    onError: (error: Error) => {
      // Error message is already translated!
      showErrorToast(error.message);
    },
  });
}
```

---

## Quick Reference Card for Frontend

### API Response Structure

```typescript
// Success
{
  success: true,
  statusCode: 200,
  message?: string,
  data: { ... }
}

// Error
{
  success: false,
  statusCode: 400,
  error: {
    code: "ERROR_CODE",
    key: "errors.category.specific",  // Use with i18n
    message: "Translated message",     // Use directly
    requestId?: string
  }
}
```

### What to Do in Frontend

1. **Display Error Messages:**
   ```typescript
   // Simplest: Use translated message
   toast.error(response.error.message);
   ```

2. **Sync Language:**
   ```typescript
   // On login
   if (user.language) {
     i18n.changeLanguage(user.language);
   }
   
   // From response header
   const lang = response.headers.get('X-Detected-Language');
   if (lang) i18n.changeLanguage(lang);
   ```

3. **Update User Language:**
   ```typescript
   await api.put('/api/v1/users/me', { language: 'en' });
   ```

4. **Send Accept-Language Header:**
   ```typescript
   // Optional - browser sends it automatically
   fetch(url, {
     headers: { 'Accept-Language': currentLanguage }
   });
   ```

---

## Summary

### What the Backend Does

✅ Automatically detects language from `Accept-Language` header  
✅ Overrides with authenticated user's language preference  
✅ Translates all error messages to detected language  
✅ Returns both translation keys and translated messages  
✅ Provides language in response headers (`X-Detected-Language`)  
✅ Handles language validation and fallbacks gracefully  

### What the Frontend Should Do

✅ Optionally send `Accept-Language` header (browser does this automatically)  
✅ Update user's language preference when they change language  
✅ Sync user's language preference on login  
✅ Display error messages using `error.message` (already translated)  
✅ Optionally use `error.key` for frontend translation overrides  
✅ Check `X-Detected-Language` header to sync language state  

### Key Points for Frontend Agent

1. **Error messages are already translated** - Just use `error.message`
2. **Translation keys are available** - Use `error.key` if you want frontend translations
3. **Language is detected automatically** - Based on header + user preference
4. **Update user profile** - When user changes language in frontend
5. **Both fields are provided** - `key` for flexibility, `message` for simplicity

---

## Support

For questions or issues:
- Check error response structure in `src/types/responseTypes.ts`
- Check translation keys in `src/constants/errorCodes.ts`
- Review middleware implementation in `src/middleware/language.ts`

---

**Last Updated:** Implementation completed - Ready for frontend integration

