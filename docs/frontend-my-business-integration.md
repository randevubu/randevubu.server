# Frontend Integration Guide: My Business Endpoint

## Overview

This guide explains how to properly integrate with the `/api/v1/businesses/my-business` endpoint in your frontend application. The endpoint has been updated to follow industry best practices by returning `200 OK` with empty data instead of `422` errors when users have no businesses.

## API Contract

### Endpoint
```
GET /api/v1/businesses/my-business
```

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Query Parameters
- `includeSubscription` (optional): `true` to include subscription information

### Response Structure

#### Success Response (200 OK)

**When user has businesses:**
```json
{
  "success": true,
  "message": "Business data retrieved successfully",
  "data": {
    "businesses": [
      {
        "id": "biz_1234567890_abc123",
        "name": "My Business",
        "slug": "my-business",
        "email": "contact@mybusiness.com",
        "phone": "+1234567890",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "isActive": true,
        "isVerified": false,
        "isClosed": false,
        "primaryColor": "#3B82F6",
        "timezone": "America/New_York",
        "logoUrl": "https://example.com/logo.png",
        "businessHours": {
          "monday": { "openTime": "09:00", "closeTime": "18:00", "isOpen": true },
          "tuesday": { "openTime": "09:00", "closeTime": "18:00", "isOpen": true },
          // ... other days
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "businessType": {
          "id": "bt_123",
          "name": "restaurant",
          "displayName": "Restaurant",
          "icon": "🍽️",
          "category": "food"
        },
        "subscription": {
          "id": "sub_123",
          "status": "active",
          "currentPeriodStart": "2024-01-01T00:00:00Z",
          "currentPeriodEnd": "2024-02-01T00:00:00Z",
          "cancelAtPeriodEnd": false,
          "plan": {
            "id": "plan_123",
            "name": "professional",
            "displayName": "Professional",
            "description": "Perfect for growing businesses",
            "price": 29.99,
            "currency": "USD",
            "billingInterval": "monthly",
            "features": ["unlimited_appointments", "custom_branding"],
            "limits": {
              "maxBusinesses": 1,
              "maxStaffPerBusiness": 5
            }
          }
        }
      }
    ],
    "hasBusinesses": true,
    "isFirstTimeUser": false,
    "canCreateBusiness": true,
    "context": {
      "primaryBusinessId": "biz_1234567890_abc123",
      "totalBusinesses": 1,
      "includesSubscriptionInfo": true
    }
  }
}
```

**When user has no businesses:**
```json
{
  "success": true,
  "message": "No businesses found",
  "data": {
    "businesses": [],
    "hasBusinesses": false,
    "isFirstTimeUser": true,
    "canCreateBusiness": true
  }
}
```

#### Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "message": "Access denied. Business role required.",
    "code": "BUSINESS_ACCESS_DENIED"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

## Frontend Integration Patterns

### 1. React/Next.js Example

```typescript
// hooks/useMyBusiness.ts
import { useState, useEffect } from 'react';

interface Business {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  // ... other fields
}

interface MyBusinessResponse {
  success: boolean;
  message: string;
  data: {
    businesses: Business[];
    hasBusinesses: boolean;
    isFirstTimeUser: boolean;
    canCreateBusiness: boolean;
    context?: {
      primaryBusinessId?: string;
      totalBusinesses: number;
      includesSubscriptionInfo: boolean;
    };
  };
}

export function useMyBusiness(includeSubscription = false) {
  const [data, setData] = useState<MyBusinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyBusiness = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `/api/v1/businesses/my-business?includeSubscription=${includeSubscription}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: MyBusinessResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch businesses');
      } finally {
        setLoading(false);
      }
    };

    fetchMyBusiness();
  }, [includeSubscription]);

  return { data, loading, error, refetch: () => fetchMyBusiness() };
}

// components/MyBusinessPage.tsx
import React from 'react';
import { useMyBusiness } from '../hooks/useMyBusiness';
import { CreateBusinessForm } from './CreateBusinessForm';
import { BusinessList } from './BusinessList';

export function MyBusinessPage() {
  const { data, loading, error } = useMyBusiness(true);

  if (loading) {
    return <div>Loading your businesses...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  // Handle first-time user (no businesses)
  if (data.data.isFirstTimeUser) {
    return (
      <div className="first-time-user">
        <h1>Welcome! Let's create your first business</h1>
        <p>Get started by setting up your business profile.</p>
        <CreateBusinessForm />
      </div>
    );
  }

  // Handle existing businesses
  return (
    <div className="my-businesses">
      <h1>Your Businesses</h1>
      <BusinessList businesses={data.data.businesses} />
      
      {data.data.canCreateBusiness && (
        <button onClick={() => setShowCreateForm(true)}>
          Create Another Business
        </button>
      )}
    </div>
  );
}
```

### 2. Vue.js Example

```vue
<!-- components/MyBusiness.vue -->
<template>
  <div class="my-business">
    <!-- Loading state -->
    <div v-if="loading" class="loading">
      Loading your businesses...
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error">
      Error: {{ error }}
    </div>

    <!-- First-time user -->
    <div v-else-if="businessData?.isFirstTimeUser" class="first-time">
      <h1>Welcome! Let's create your first business</h1>
      <p>Get started by setting up your business profile.</p>
      <CreateBusinessForm @business-created="fetchBusinesses" />
    </div>

    <!-- Existing businesses -->
    <div v-else class="businesses">
      <h1>Your Businesses</h1>
      <BusinessList :businesses="businessData?.businesses || []" />
      
      <button 
        v-if="businessData?.canCreateBusiness" 
        @click="showCreateForm = true"
      >
        Create Another Business
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Business {
  id: string;
  name: string;
  slug: string;
  // ... other fields
}

interface BusinessData {
  businesses: Business[];
  hasBusinesses: boolean;
  isFirstTimeUser: boolean;
  canCreateBusiness: boolean;
}

const loading = ref(true);
const error = ref<string | null>(null);
const businessData = ref<BusinessData | null>(null);
const showCreateForm = ref(false);

const fetchBusinesses = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/v1/businesses/my-business', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    businessData.value = result.data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch businesses';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBusinesses();
});
</script>
```

### 3. Angular Example

```typescript
// services/business.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Business {
  id: string;
  name: string;
  slug: string;
  // ... other fields
}

export interface MyBusinessResponse {
  success: boolean;
  message: string;
  data: {
    businesses: Business[];
    hasBusinesses: boolean;
    isFirstTimeUser: boolean;
    canCreateBusiness: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private apiUrl = '/api/v1/businesses';

  constructor(private http: HttpClient) {}

  getMyBusiness(includeSubscription = false): Observable<MyBusinessResponse> {
    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<MyBusinessResponse>(
      `${this.apiUrl}/my-business?includeSubscription=${includeSubscription}`,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Error fetching businesses:', error);
        throw error;
      })
    );
  }
}

// components/my-business.component.ts
import { Component, OnInit } from '@angular/core';
import { BusinessService, MyBusinessResponse } from '../services/business.service';

@Component({
  selector: 'app-my-business',
  template: `
    <div *ngIf="loading" class="loading">
      Loading your businesses...
    </div>

    <div *ngIf="error" class="error">
      Error: {{ error }}
    </div>

    <div *ngIf="businessData?.isFirstTimeUser" class="first-time">
      <h1>Welcome! Let's create your first business</h1>
      <p>Get started by setting up your business profile.</p>
      <app-create-business-form (businessCreated)="loadBusinesses()"></app-create-business-form>
    </div>

    <div *ngIf="businessData && !businessData.isFirstTimeUser" class="businesses">
      <h1>Your Businesses</h1>
      <app-business-list [businesses]="businessData.businesses"></app-business-list>
      
      <button 
        *ngIf="businessData.canCreateBusiness" 
        (click)="showCreateForm = true"
      >
        Create Another Business
      </button>
    </div>
  `
})
export class MyBusinessComponent implements OnInit {
  loading = true;
  error: string | null = null;
  businessData: MyBusinessResponse['data'] | null = null;
  showCreateForm = false;

  constructor(private businessService: BusinessService) {}

  ngOnInit() {
    this.loadBusinesses();
  }

  loadBusinesses() {
    this.loading = true;
    this.error = null;

    this.businessService.getMyBusiness(true).subscribe({
      next: (response) => {
        this.businessData = response.data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to fetch businesses';
        this.loading = false;
      }
    });
  }
}
```

## State Management Recommendations

### Redux Toolkit (React)

```typescript
// store/slices/businessSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface BusinessState {
  businesses: Business[];
  hasBusinesses: boolean;
  isFirstTimeUser: boolean;
  canCreateBusiness: boolean;
  loading: boolean;
  error: string | null;
}

export const fetchMyBusiness = createAsyncThunk(
  'business/fetchMyBusiness',
  async (includeSubscription: boolean = false) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
      `/api/v1/businesses/my-business?includeSubscription=${includeSubscription}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
);

const businessSlice = createSlice({
  name: 'business',
  initialState: {
    businesses: [],
    hasBusinesses: false,
    isFirstTimeUser: false,
    canCreateBusiness: true,
    loading: false,
    error: null,
  } as BusinessState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBusiness.fulfilled, (state, action) => {
        state.loading = false;
        state.businesses = action.payload.data.businesses;
        state.hasBusinesses = action.payload.data.hasBusinesses;
        state.isFirstTimeUser = action.payload.data.isFirstTimeUser;
        state.canCreateBusiness = action.payload.data.canCreateBusiness;
      })
      .addCase(fetchMyBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch businesses';
      });
  },
});

export const { clearError } = businessSlice.actions;
export default businessSlice.reducer;
```

### Vuex (Vue.js)

```typescript
// store/modules/business.ts
import { Module } from 'vuex';

interface BusinessState {
  businesses: Business[];
  hasBusinesses: boolean;
  isFirstTimeUser: boolean;
  canCreateBusiness: boolean;
  loading: boolean;
  error: string | null;
}

export const businessModule: Module<BusinessState, any> = {
  namespaced: true,
  state: {
    businesses: [],
    hasBusinesses: false,
    isFirstTimeUser: false,
    canCreateBusiness: true,
    loading: false,
    error: null,
  },
  mutations: {
    SET_LOADING(state, loading: boolean) {
      state.loading = loading;
    },
    SET_ERROR(state, error: string | null) {
      state.error = error;
    },
    SET_BUSINESS_DATA(state, data: BusinessState) {
      state.businesses = data.businesses;
      state.hasBusinesses = data.hasBusinesses;
      state.isFirstTimeUser = data.isFirstTimeUser;
      state.canCreateBusiness = data.canCreateBusiness;
    },
  },
  actions: {
    async fetchMyBusiness({ commit }, includeSubscription = false) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `/api/v1/businesses/my-business?includeSubscription=${includeSubscription}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        commit('SET_BUSINESS_DATA', result.data);
      } catch (error) {
        commit('SET_ERROR', error.message || 'Failed to fetch businesses');
      } finally {
        commit('SET_LOADING', false);
      }
    },
  },
};
```

## Error Handling Guidelines

### 1. Network Errors
```typescript
try {
  const response = await fetch('/api/v1/businesses/my-business');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
} catch (error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    // Network error - show offline message
    showNotification('You appear to be offline. Please check your connection.');
  } else {
    // Other errors
    showNotification('Failed to load businesses. Please try again.');
  }
}
```

### 2. Authentication Errors
```typescript
if (response.status === 401) {
  // Redirect to login or refresh token
  localStorage.removeItem('authToken');
  router.push('/login');
  return;
}
```

### 3. Permission Errors
```typescript
if (response.status === 403) {
  // User doesn't have business role
  showNotification('You need a business account to access this feature.');
  router.push('/upgrade');
  return;
}
```

## Common Pitfalls and Best Practices

### ❌ Don't Do This
```typescript
// DON'T: Treat empty businesses as an error
try {
  const response = await fetch('/api/v1/businesses/my-business');
  const data = await response.json();
  if (data.data.businesses.length === 0) {
    throw new Error('No businesses found'); // This is wrong!
  }
} catch (error) {
  // This will never catch the "no businesses" case anymore
}
```

### ✅ Do This Instead
```typescript
// DO: Handle empty state gracefully
const response = await fetch('/api/v1/businesses/my-business');
const data = await response.json();

if (data.data.isFirstTimeUser) {
  // Show onboarding flow
  showOnboarding();
} else {
  // Show business list
  showBusinessList(data.data.businesses);
}
```

### Best Practices

1. **Always check `success` field**: The API always returns a `success` boolean
2. **Use metadata flags**: `hasBusinesses`, `isFirstTimeUser`, `canCreateBusiness` provide clear state information
3. **Handle loading states**: Show appropriate loading indicators
4. **Implement retry logic**: For network failures, allow users to retry
5. **Cache responses**: Use appropriate caching strategies for better UX
6. **Validate data**: Always validate the response structure before using it

## Migration from Previous Behavior

### Before (422 Error)
```typescript
// Old code that handled 422 errors
try {
  const response = await fetch('/api/v1/businesses/my-business');
  const data = await response.json();
  // Handle businesses
} catch (error) {
  if (error.status === 422) {
    // Show create business form
    showCreateBusinessForm();
  } else {
    // Handle other errors
    showError(error.message);
  }
}
```

### After (200 OK)
```typescript
// New code that handles 200 responses
const response = await fetch('/api/v1/businesses/my-business');
const data = await response.json();

if (data.success) {
  if (data.data.isFirstTimeUser) {
    // Show create business form
    showCreateBusinessForm();
  } else {
    // Show business list
    showBusinessList(data.data.businesses);
  }
} else {
  // Handle actual errors
  showError(data.error.message);
}
```

## Testing Examples

### Unit Tests
```typescript
// __tests__/useMyBusiness.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useMyBusiness } from '../hooks/useMyBusiness';

// Mock fetch
global.fetch = jest.fn();

describe('useMyBusiness', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should handle first-time user correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'No businesses found',
        data: {
          businesses: [],
          hasBusinesses: false,
          isFirstTimeUser: true,
          canCreateBusiness: true,
        },
      }),
    });

    const { result } = renderHook(() => useMyBusiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.data.isFirstTimeUser).toBe(true);
    expect(result.current.data?.data.hasBusinesses).toBe(false);
  });

  it('should handle existing businesses correctly', async () => {
    const mockBusinesses = [
      { id: '1', name: 'Test Business', slug: 'test-business' },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Business data retrieved successfully',
        data: {
          businesses: mockBusinesses,
          hasBusinesses: true,
          isFirstTimeUser: false,
          canCreateBusiness: true,
        },
      }),
    });

    const { result } = renderHook(() => useMyBusiness());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.data.hasBusinesses).toBe(true);
    expect(result.current.data?.data.businesses).toEqual(mockBusinesses);
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/my-business.test.ts
import { test, expect } from '@playwright/test';

test('should show create business form for first-time user', async ({ page }) => {
  // Mock API response for first-time user
  await page.route('**/api/v1/businesses/my-business', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'No businesses found',
        data: {
          businesses: [],
          hasBusinesses: false,
          isFirstTimeUser: true,
          canCreateBusiness: true,
        },
      }),
    });
  });

  await page.goto('/my-business');
  
  // Should show create business form
  await expect(page.locator('h1')).toContainText('Welcome! Let\'s create your first business');
  await expect(page.locator('form')).toBeVisible();
});
```

## Conclusion

The updated `/my-business` endpoint now follows industry best practices by returning `200 OK` with clear metadata instead of `422` errors for empty states. This makes frontend integration cleaner and more semantic. Always use the provided metadata flags (`hasBusinesses`, `isFirstTimeUser`, `canCreateBusiness`) to determine the appropriate UI state rather than checking array lengths or catching errors.
