# Randevubu Backend API Integration Guide

> **IMPORTANT**: This document is automatically generated for frontend integration testing and validation. It contains complete API specifications, types, schemas, and architectures to ensure seamless backend-frontend integration without conflicts or type issues.

**Last Updated**: 2025-10-30
**Base URL**: `http://localhost:3000` (Development) | `https://api.randevubu.com` (Production)
**API Version**: v1
**API Base Path**: `/api/v1`

---

## ⚠️ Important Frontend Integration Notes

### Data Type Conventions

1. **Billing Interval** (`billingInterval`):
   - ✅ Backend returns: `"monthly" | "yearly"` (lowercase)
   - Frontend should expect lowercase strings, not uppercase enums

2. **Date/Time Formats**:
   - ✅ Backend returns: ISO 8601 strings (e.g., `"2025-10-30T14:30:00.000Z"`)
   - Frontend should convert to `Date` objects as needed
   - Timezone handling: Use business `timezone` field for proper conversion

3. **Appointment Status**:
   - ✅ Backend supports: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`, `NO_SHOW`
   - `PENDING` is the initial status (added in latest update)

4. **Subscription Status**:
   - ✅ Backend supports: `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `UNPAID`, `INCOMPLETE`, `INCOMPLETE_EXPIRED`
   - `INCOMPLETE` and `INCOMPLETE_EXPIRED` are for partial payment flows

5. **Payment Status**:
   - ✅ Backend supports: `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELED`, `REFUNDED`
   - `PROCESSING` is used during async payment operations

6. **Auth Response Tokens**:
   - ✅ Backend returns BOTH `accessToken` AND `refreshToken` in verify-login response
   - Also includes: `expiresIn`, `refreshExpiresIn`, `isNewUser`

7. **Buyer Information**:
   - ✅ All buyer fields are OPTIONAL on backend
   - Frontend can require fields for better UX, but backend accepts partial data

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Business Management](#2-business-management)
3. [Appointment Management](#3-appointment-management)
4. [Subscription & Payments](#4-subscription--payments)
5. [Staff Management](#5-staff-management)
6. [Services Management](#6-services-management)
7. [Reports & Analytics](#7-reports--analytics)
8. [Notifications](#8-notifications)
9. [Type Definitions](#9-type-definitions)
10. [Error Handling](#10-error-handling)
11. [Rate Limiting](#11-rate-limiting)
12. [Authentication Flow](#12-authentication-flow)

---

## 1. Authentication & Authorization

### Authentication Method
- **Type**: JWT-based Bearer Token Authentication
- **Phone Verification**: SMS-based OTP (One-Time Password) authentication

### Headers Required
```typescript
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

### 1.1 Send Verification Code

**Endpoint**: `POST /api/v1/auth/send-verification`

**Description**: Send a 6-digit verification code to the provided phone number via SMS

**Request Body**:
```typescript
{
  phoneNumber: string; // E.164 format (e.g., "+905551234567")
  purpose: "REGISTRATION" | "LOGIN" | "PHONE_CHANGE" | "ACCOUNT_RECOVERY";
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    expiresIn: number; // seconds
    purpose: string;
  };
}
```

**Rate Limit**: 10 requests per 5 minutes per IP

---

### 1.2 Verify Login

**Endpoint**: `POST /api/v1/auth/verify-login`

**Description**: Verify the 6-digit code and authenticate user, returning JWT tokens

**Request Body**:
```typescript
{
  phoneNumber: string; // E.164 format
  verificationCode: string; // 6 digits
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      phoneNumber: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      timezone: string;
      language: string;
      isVerified: boolean;
      createdAt: string; // ISO 8601
      lastLoginAt: string | null;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number; // seconds (typically 900 = 15 minutes)
      refreshExpiresIn: number; // seconds (typically 2592000 = 30 days)
    };
    isNewUser: boolean;
  };
}
```

**Rate Limit**: 10 requests per 15 minutes per IP

---

### 1.3 Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`

**Description**: Exchange a valid refresh token for a new access token pair

**Request Body**:
```typescript
{
  refreshToken?: string; // Optional for web apps using httpOnly cookies
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token

---

### 1.4 Logout

**Endpoint**: `POST /api/v1/auth/logout`

**Description**: Revoke refresh tokens and logout the authenticated user

**Headers**: Requires `Authorization: Bearer <access_token>`

**Request Body**:
```typescript
{
  refreshToken?: string;
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string; // "Logged out successfully"
}
```

---

## 2. Business Management

### 2.1 Create Business

**Endpoint**: `POST /api/v1/businesses`

**Headers**: Requires Authentication

**Request Body**:
```typescript
{
  name: string; // 2-100 characters
  businessTypeId: string; // Required
  description?: string; // Max 1000 characters
  email?: string; // Valid email format
  phone?: string; // E.164 format
  address?: string; // Max 200 characters
  city?: string; // Max 50 characters
  state?: string; // Max 50 characters
  country?: string; // Max 50 characters
  postalCode?: string; // Max 20 characters
  timezone?: string; // IANA timezone (default: "Europe/Istanbul")
  primaryColor?: string; // Hex color (#RRGGBB)
  tags?: string[]; // Max 10 tags
}
```

**Response** (201 Created):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    ownerId: string;
    name: string;
    slug: string; // Auto-generated from name
    businessTypeId: string;
    description: string | null;
    email: string | null;
    phone: string | null;
    website: string | null; // Auto-generated: randevubu.com/<slug>
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    businessHours: BusinessHours | null;
    timezone: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    primaryColor: string | null;
    isActive: boolean;
    isVerified: boolean;
    isClosed: boolean;
    tags: string[];
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
  };
}
```

---

### 2.2 Get Business Details

**Endpoint**: `GET /api/v1/businesses/:businessId`

**Headers**: Requires Authentication

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: {
    // Same as Create Business response
    // Plus:
    businessType: {
      id: string;
      name: string;
      displayName: string;
      icon: string | null;
      category: string;
    };
    services: ServiceData[];
    staff: BusinessStaffData[];
    subscription?: {
      id: string;
      planId: string;
      status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID";
      currentPeriodStart: string;
      currentPeriodEnd: string;
      plan: SubscriptionPlanData;
    };
  };
}
```

---

### 2.3 Update Business

**Endpoint**: `PUT /api/v1/businesses/:businessId`

**Headers**: Requires Authentication + Business Ownership

**Request Body**: All fields optional
```typescript
{
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  businessHours?: BusinessHours;
  timezone?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  theme?: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
}
```

**Response** (200 OK): Same structure as Get Business Details

---

### 2.4 Business Hours Structure

```typescript
type BusinessHours = {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
};

type DayHours = {
  isOpen: boolean;
  openTime?: string; // "HH:MM" format (24-hour)
  closeTime?: string; // "HH:MM" format (24-hour)
  breaks?: BreakPeriod[];
};

type BreakPeriod = {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  description?: string;
};
```

---

### 2.5 Get My Businesses

**Endpoint**: `GET /api/v1/businesses/my-businesses`

**Headers**: Requires Authentication

**Query Parameters**:
- `page?: number` (default: 1)
- `limit?: number` (default: 10, max: 100)

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: BusinessData[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}
```

---

### 2.6 Search Businesses (Public)

**Endpoint**: `GET /api/v1/public/businesses`

**Headers**: No authentication required

**Query Parameters**:
- `businessTypeId?: string`
- `city?: string`
- `state?: string`
- `country?: string`
- `tags?: string[]`
- `isVerified?: boolean`
- `latitude?: number`
- `longitude?: number`
- `radius?: number` (kilometers, max 100)
- `page?: number` (default: 1)
- `limit?: number` (default: 10, max: 100)

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: BusinessWithServices[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}
```

---

## 3. Appointment Management

### 3.1 Create Appointment

**Endpoint**: `POST /api/v1/appointments`

**Headers**: Requires Authentication

**Request Body**:
```typescript
{
  businessId: string;
  serviceId: string;
  staffId: string;
  customerId?: string; // Optional, defaults to authenticated user
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" (24-hour format)
  customerNotes?: string; // Max 500 characters
}
```

**Response** (201 Created):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    businessId: string;
    serviceId: string;
    staffId: string;
    customerId: string;
    date: string; // ISO 8601
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    duration: number; // minutes
    status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "NO_SHOW";
    price: number;
    currency: string;
    customerNotes: string | null;
    bookedAt: string; // ISO 8601
    createdAt: string;
    updatedAt: string;
  };
}
```

**Business Logic**:
- Staff availability is checked
- Business hours are validated
- Subscription limits are enforced
- No overlapping appointments allowed

---

### 3.2 Get Customer Appointments

**Endpoint**: `GET /api/v1/appointments/customer/:customerId?`

**Headers**: Requires Authentication

**Description**: If `customerId` is omitted, returns appointments for the authenticated user

**Query Parameters**:
- `page?: number` (default: 1)
- `limit?: number` (default: 20, max: 100)

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: AppointmentWithDetails[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}
```

**AppointmentWithDetails Structure**:
```typescript
{
  id: string;
  businessId: string;
  serviceId: string;
  staffId: string;
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: AppointmentStatus;
  price: number;
  currency: string;
  customerNotes: string | null;
  bookedAt: string;
  business: {
    id: string;
    name: string;
    address: string;
    phoneNumber: string;
    timezone: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  staff?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}
```

---

### 3.3 Get Business Appointments

**Endpoint**: `GET /api/v1/appointments/business/:businessId`

**Headers**: Requires Authentication + Business Access

**Query Parameters**:
- `status?: AppointmentStatus`
- `date?: string` (YYYY-MM-DD)
- `startDate?: string`
- `endDate?: string`
- `page?: number`
- `limit?: number`

**Response** (200 OK): Same structure as Get Customer Appointments

---

### 3.4 Cancel Appointment

**Endpoint**: `POST /api/v1/appointments/:id/cancel`

**Headers**: Requires Authentication

**Request Body**:
```typescript
{
  reason?: string; // Max 500 characters
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    status: "CANCELED";
    cancelledAt: string;
    cancelReason: string | null;
    // ... other appointment fields
  };
}
```

**Business Logic**:
- Customers can cancel their own appointments
- Business staff can cancel appointments in their business
- Cannot cancel already completed or cancelled appointments
- User behavior tracking is updated

---

### 3.5 Update Appointment Status

**Endpoint**: `PUT /api/v1/appointments/:id/status`

**Headers**: Requires Authentication + Business Staff Access

**Request Body**:
```typescript
{
  status: "CONFIRMED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: AppointmentData;
}
```

---

### 3.6 Get Appointment by ID

**Endpoint**: `GET /api/v1/appointments/:id`

**Headers**: Requires Authentication

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: AppointmentWithDetails;
}
```

---

### 3.7 Get My Today's Appointments (Business Staff)

**Endpoint**: `GET /api/v1/appointments/my/today`

**Headers**: Requires Authentication + Business Role (OWNER/STAFF)

**Description**: Returns today's appointments from all businesses the user owns or works at

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: AppointmentWithDetails[];
  meta: {
    total: number;
    businessId: "all";
    accessibleBusinesses: number;
    date: string; // YYYY-MM-DD
  };
}
```

---

### 3.8 Get Monitor Appointments (Real-time Queue)

**Endpoint**: `GET /api/v1/appointments/monitor/:businessId`

**Headers**: Requires Authentication + Business Ownership

**Description**: Optimized endpoint for monitor displays showing real-time appointment queue

**Query Parameters**:
- `date?: string` (YYYY-MM-DD, defaults to today)
- `includeStats?: boolean` (default: true)
- `maxQueueSize?: number` (1-50, default: 10)
- `live?: string` ("true" to skip cache, useful for real-time updates)

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    current: {
      appointment: AppointmentWithDetails;
      startedAt: string;
      estimatedEndTime: string;
    } | null;
    next: {
      appointment: AppointmentWithDetails;
      estimatedStartTime: string;
      waitTimeMinutes: number;
    } | null;
    queue: Array<{
      appointment: AppointmentWithDetails;
      estimatedStartTime: string;
      waitTimeMinutes: number;
      position: number;
    }>;
    stats: {
      completedToday: number;
      inProgress: number;
      waiting: number;
      averageWaitTime: number;
      averageServiceTime: number;
      totalScheduled: number;
    };
    lastUpdated: string;
    businessInfo: {
      name: string;
      timezone: string;
    };
  };
}
```

**Cache**: 15 seconds TTL for real-time data

---

## 4. Subscription & Payments

### 4.1 Get All Subscription Plans

**Endpoint**: `GET /api/v1/subscriptions/plans`

**Headers**: No authentication required (Public)

**Query Parameters**:
- `city?: string` (for location-based pricing)
- `state?: string`
- `country?: string` (default: "Turkey")

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    plans: SubscriptionPlanData[];
    location: {
      city: string;
      state: string;
      country: string;
    };
  };
}
```

**SubscriptionPlanData Structure**:
```typescript
{
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string; // "TRY", "USD", etc.
  billingInterval: "monthly" | "yearly"; // ⚠️ LOWERCASE values from backend
  maxBusinesses: number;
  maxStaffPerBusiness: number;
  features: {
    appointmentBooking: boolean;
    staffManagement: boolean;
    basicReports: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    customBranding: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    multiLocation: boolean;
    prioritySupport: boolean;
    integrations: string[];
    maxServices: number;
    maxCustomers: number;
    smsQuota: number;
    pricingTier: string;
    trialDays?: number;
    description: string[];
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

---

### 4.2 Subscribe Business to Plan

**Endpoint**: `POST /api/v1/subscriptions/business/:businessId/subscribe`

**Headers**: Requires Authentication + Business Ownership

**Request Body**:
```typescript
{
  planId: string;
  discountCode?: string; // Optional discount code
  card?: {
    cardHolderName: string;
    cardNumber: string; // 13-19 digits
    expireMonth: string; // "01"-"12"
    expireYear: string; // "YYYY"
    cvc: string; // 3-4 digits
  };
  buyer?: {
    name: string;
    surname: string;
    email: string;
    gsmNumber: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  };
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    subscription: {
      id: string;
      businessId: string;
      planId: string;
      status: "TRIAL" | "ACTIVE";
      currentPeriodStart: string;
      currentPeriodEnd: string;
      trialStart: string | null;
      trialEnd: string | null;
      autoRenewal: boolean;
      createdAt: string;
    };
    payment?: {
      id: string;
      amount: number;
      currency: string;
      status: "PENDING" | "SUCCEEDED" | "FAILED";
      iyzicoPaymentId: string;
    };
  };
}
```

---

### 4.3 Get Business Subscription

**Endpoint**: `GET /api/v1/subscriptions/business/:businessId`

**Headers**: Requires Authentication + Business Access

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: {
    id: string;
    businessId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    trialStart: string | null;
    trialEnd: string | null;
    autoRenewal: boolean;
    paymentMethodId: string | null;
    nextBillingDate: string | null;
    failedPaymentCount: number;
    plan: SubscriptionPlanData;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### 4.4 Cancel Subscription

**Endpoint**: `POST /api/v1/subscriptions/business/:businessId/cancel`

**Headers**: Requires Authentication + Business Ownership

**Request Body**:
```typescript
{
  cancelAtPeriodEnd?: boolean; // Default: true
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    status: "ACTIVE" | "CANCELED";
    cancelAtPeriodEnd: boolean;
    cancelledAt: string;
    currentPeriodEnd: string;
  };
}
```

---

### 4.5 Create Subscription Payment

**Endpoint**: `POST /api/v1/businesses/:businessId/payments`

**Headers**: Requires Authentication

**Request Body**:
```typescript
{
  planId: string;
  card: {
    cardHolderName: string;
    cardNumber: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
  };
  buyer?: {
    name: string;
    surname: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    country: string;
    zipCode?: string;
  };
  installment?: string; // Default: "1"
}
```

**Response** (201 Created):
```typescript
{
  success: boolean;
  message: string;
  data: {
    subscription: BusinessSubscriptionData;
    payment: {
      id: string;
      iyzicoPaymentId: string;
      amount: number;
      currency: string;
      status: PaymentStatus;
      createdAt: string;
    };
  };
}
```

---

### 4.6 Get Payment History

**Endpoint**: `GET /api/v1/businesses/:businessId/payments`

**Headers**: Requires Authentication + Business Access

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paymentMethod: string;
    iyzicoPaymentId: string;
    metadata: any;
    createdAt: string;
    updatedAt: string;
  }>;
  meta: {
    total: number;
    businessId: string;
    subscriptionId: string;
  };
}
```

---

### 4.7 Apply Discount Code

**Endpoint**: `POST /api/v1/subscriptions/business/:businessId/apply-discount`

**Headers**: Requires Authentication + Business Ownership

**Request Body**:
```typescript
{
  discountCode: string; // e.g., "WELCOME20"
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    discountApplied: boolean;
    discountCode: string;
    discountPercentage: number;
    originalAmount: number;
    discountedAmount: number;
    subscription: BusinessSubscriptionData;
  };
}
```

---

## 5. Staff Management

### 5.1 Add Staff to Business

**Endpoint**: `POST /api/v1/businesses/:businessId/staff`

**Headers**: Requires Authentication + Business Ownership

**Request Body**:
```typescript
{
  userId: string;
  role: "OWNER" | "MANAGER" | "STAFF" | "RECEPTIONIST";
  permissions?: Record<string, any>;
}
```

**Response** (201 Created):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    businessId: string;
    userId: string;
    role: BusinessStaffRole;
    permissions: any;
    isActive: boolean;
    joinedAt: string;
    createdAt: string;
  };
}
```

---

### 5.2 Get Business Staff

**Endpoint**: `GET /api/v1/businesses/:businessId/staff`

**Headers**: Requires Authentication + Business Access

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    businessId: string;
    userId: string;
    role: BusinessStaffRole;
    isActive: boolean;
    joinedAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      avatar: string | null;
    };
  }>;
}
```

---

### 5.3 Update Staff

**Endpoint**: `PUT /api/v1/businesses/:businessId/staff/:staffId`

**Headers**: Requires Authentication + Business Ownership

**Request Body**:
```typescript
{
  role?: BusinessStaffRole;
  permissions?: Record<string, any>;
  isActive?: boolean;
}
```

**Response** (200 OK): Same structure as Add Staff

---

### 5.4 Remove Staff

**Endpoint**: `DELETE /api/v1/businesses/:businessId/staff/:staffId`

**Headers**: Requires Authentication + Business Ownership

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 6. Services Management

### 6.1 Create Service

**Endpoint**: `POST /api/v1/businesses/:businessId/services`

**Headers**: Requires Authentication + Business Access

**Request Body**:
```typescript
{
  name: string; // 2-100 characters
  description?: string; // Max 500 characters
  duration: number; // Minutes, 15-480
  price: number; // Min 0, Max 10000
  currency?: string; // 3 characters, default: "TRY"
  showPrice?: boolean; // Default: true
  bufferTime?: number; // Minutes, 0-120
  maxAdvanceBooking?: number; // Days, 1-365
  minAdvanceBooking?: number; // Hours, 0-72
}
```

**Response** (201 Created):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    businessId: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    currency: string;
    image: string | null;
    isActive: boolean;
    showPrice: boolean;
    sortOrder: number;
    bufferTime: number;
    maxAdvanceBooking: number;
    minAdvanceBooking: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### 6.2 Get Business Services

**Endpoint**: `GET /api/v1/businesses/:businessId/services`

**Headers**: No authentication required for public businesses

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: ServiceData[];
}
```

**Note**: Prices may be hidden based on business settings

---

### 6.3 Update Service

**Endpoint**: `PUT /api/v1/businesses/:businessId/services/:serviceId`

**Headers**: Requires Authentication + Business Access

**Request Body**: All fields optional
```typescript
{
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
  showPrice?: boolean;
  sortOrder?: number;
  bufferTime?: number;
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
}
```

**Response** (200 OK): Same structure as Create Service

---

### 6.4 Delete Service

**Endpoint**: `DELETE /api/v1/businesses/:businessId/services/:serviceId`

**Headers**: Requires Authentication + Business Ownership

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 7. Reports & Analytics

### 7.1 Get Appointment Statistics

**Endpoint**: `GET /api/v1/appointments/my/stats`

**Headers**: Requires Authentication + Business Role

**Query Parameters**:
- `startDate?: string` (YYYY-MM-DD)
- `endDate?: string` (YYYY-MM-DD)

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: {
    [businessId: string]: {
      total: number;
      byStatus: {
        COMPLETED: number;
        CONFIRMED: number;
        CANCELLED: number;
        NO_SHOW: number;
      };
      totalRevenue: number;
      averageValue: number;
    };
  };
  meta: {
    businessId: string;
    accessibleBusinesses: number;
    startDate: string;
    endDate: string;
  };
}
```

---

### 7.2 Get Business Reports

**Endpoint**: `GET /api/v1/businesses/:businessId/reports`

**Headers**: Requires Authentication + Business Access

**Query Parameters**:
- `reportType: "appointments" | "revenue" | "customers" | "staff"`
- `startDate: string` (YYYY-MM-DD)
- `endDate: string` (YYYY-MM-DD)
- `groupBy?: "day" | "week" | "month"`

**Response** (200 OK):
```typescript
{
  success: boolean;
  data: {
    reportType: string;
    period: {
      start: string;
      end: string;
    };
    summary: {
      total: number;
      // Additional metrics based on reportType
    };
    breakdown: Array<{
      date: string;
      value: number;
      // Additional fields based on reportType
    }>;
  };
}
```

---

## 8. Notifications

### 8.1 Subscribe to Push Notifications

**Endpoint**: `POST /api/v1/notifications/push/subscribe`

**Headers**: Requires Authentication

**Request Body**:
```typescript
{
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
}
```

**Response** (201 Created):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    isActive: boolean;
    deviceName: string;
    createdAt: string;
  };
}
```

---

### 8.2 Update Notification Preferences

**Endpoint**: `PUT /api/v1/notifications/push/preferences`

**Headers**: Requires Authentication

**Request Body**:
```typescript
{
  enableAppointmentReminders?: boolean;
  enableBusinessNotifications?: boolean;
  enablePromotionalMessages?: boolean;
  reminderTiming?: {
    hours: number[]; // e.g., [1, 24]
  };
  preferredChannels?: {
    channels: ("EMAIL" | "SMS" | "PUSH")[];
  };
  quietHours?: {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
    timezone: string;
  };
  timezone?: string;
}
```

**Response** (200 OK):
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string;
    enableAppointmentReminders: boolean;
    enableBusinessNotifications: boolean;
    enablePromotionalMessages: boolean;
    reminderTiming: { hours: number[] };
    preferredChannels: { channels: string[] };
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
    timezone: string;
  };
}
```

---

## 9. Type Definitions

### Core Enums

```typescript
enum AppointmentStatus {
  PENDING = "PENDING",           // Initial status before confirmation
  CONFIRMED = "CONFIRMED",       // Status after confirmation
  IN_PROGRESS = "IN_PROGRESS",   // Automatically when appointment time arrives
  COMPLETED = "COMPLETED",       // Automatically when service time ends
  CANCELED = "CANCELED",         // Manual action only
  NO_SHOW = "NO_SHOW"            // Manual action only
}

enum SubscriptionStatus {
  TRIAL = "TRIAL",
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
  UNPAID = "UNPAID",
  INCOMPLETE = "INCOMPLETE",                   // Payment incomplete
  INCOMPLETE_EXPIRED = "INCOMPLETE_EXPIRED"    // Payment expired
}

enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",     // Payment is being processed
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
  REFUNDED = "REFUNDED"
}

enum BusinessStaffRole {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  RECEPTIONIST = "RECEPTIONIST"
}

enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH"
}
```

---

## 10. Error Handling

### Standard Error Response

All errors follow this structure:

```typescript
{
  success: false;
  error: {
    message: string;
    code?: string; // Optional error code
    details?: any; // Optional additional details
  };
}
```

### HTTP Status Codes

- **200 OK**: Successful GET, PUT, PATCH requests
- **201 Created**: Successful POST requests
- **204 No Content**: Successful DELETE requests
- **400 Bad Request**: Validation errors, malformed requests
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Resource conflict (e.g., duplicate appointment)
- **422 Unprocessable Entity**: Business logic errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side errors

### Common Error Examples

**Validation Error (400)**:
```typescript
{
  success: false;
  error: {
    message: "Validation failed",
    code: "VALIDATION_ERROR",
    details: {
      phoneNumber: "Phone number must be in E.164 format",
      date: "Date must be in YYYY-MM-DD format"
    }
  }
}
```

**Authentication Error (401)**:
```typescript
{
  success: false;
  error: {
    message: "Unauthorized",
    code: "INVALID_TOKEN"
  }
}
```

**Permission Error (403)**:
```typescript
{
  success: false;
  error: {
    message: "Access denied: You do not have permission to access this resource",
    code: "FORBIDDEN"
  }
}
```

**Resource Not Found (404)**:
```typescript
{
  success: false;
  error: {
    message: "Business not found",
    code: "NOT_FOUND"
  }
}
```

**Rate Limit Error (429)**:
```typescript
{
  success: false;
  error: {
    message: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
    details: {
      retryAfter: "15 minutes"
    }
  }
}
```

---

## 11. Rate Limiting

### Endpoint-Specific Limits

- **`/auth/send-verification`**: 10 requests per 5 minutes per IP
- **`/auth/verify-login`**: 10 requests per 15 minutes per IP
- **`/auth/refresh`**: 10 requests per 15 minutes per IP
- **Default**: 100 requests per 15 minutes per IP (development), 10 per 15 minutes (production)

### Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640000000
```

---

## 12. Authentication Flow

### Complete Authentication Flow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       │ 1. POST /auth/send-verification
       │    { phoneNumber: "+905551234567", purpose: "LOGIN" }
       ▼
┌─────────────┐
│   Backend   │──────► Send SMS with 6-digit code
└──────┬──────┘
       │
       │ 2. Response: { success: true, expiresIn: 300 }
       ▼
┌─────────────┐
│   Frontend  │──────► User enters verification code
└──────┬──────┘
       │
       │ 3. POST /auth/verify-login
       │    { phoneNumber: "+905551234567", verificationCode: "123456" }
       ▼
┌─────────────┐
│   Backend   │──────► Validate code
└──────┬──────┘
       │
       │ 4. Response: { user: {...}, tokens: { accessToken, refreshToken }, isNewUser }
       ▼
┌─────────────┐
│   Frontend  │──────► Store tokens (localStorage/sessionStorage)
│             │──────► Include in all requests: Authorization: Bearer <accessToken>
└─────────────┘

Refresh Flow:
────────────
When accessToken expires (15 minutes):

1. POST /auth/refresh
   { refreshToken: "<refresh_token>" }

2. Response: { accessToken, refreshToken, expiresIn, refreshExpiresIn }

3. Update stored tokens

When refreshToken expires (30 days):
- User must log in again from step 1
```

### Token Lifecycle

- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 30 days
- **Verification Code**: Expires in 5 minutes

---

## Additional Integration Notes

### Date & Time Formats

- **Dates**: Always use `YYYY-MM-DD` format for request parameters
- **Date-Times**: Always ISO 8601 format in responses (e.g., `2025-10-30T14:30:00.000Z`)
- **Times**: Always `HH:MM` format in 24-hour notation

### Timezone Handling

- All businesses have a `timezone` field (IANA timezone database, e.g., `Europe/Istanbul`)
- Appointment times are stored in UTC and should be converted client-side based on business timezone
- User preferences also support timezone settings

### Pagination

Standard pagination parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response includes `meta` object with pagination info.

### Caching Strategy

- **Static Data** (subscription plans, business types): Long-term cache (1 hour+)
- **Dynamic Data** (appointments, businesses): Short-term cache (5-15 minutes)
- **Real-time Data** (monitor queue): Very short cache (15 seconds)

Use query parameter `?nocache=true` or header `Cache-Control: no-cache` to bypass cache when needed.

---

## Testing & Development

### Test Credentials

**Development Environment Only**

Test Phone Numbers (bypass SMS):
- `+905551234567`: Always returns code `123456`
- `+905551234568`: Always returns code `654321`

Test Credit Cards (Iyzico Sandbox):
```typescript
// Success Card
{
  cardHolderName: "Test User",
  cardNumber: "5528790000000008",
  expireMonth: "12",
  expireYear: "2030",
  cvc: "123"
}

// Failure Card (for testing error handling)
{
  cardHolderName: "Test User",
  cardNumber: "5406670000000009",
  expireMonth: "12",
  expireYear: "2030",
  cvc: "123"
}
```

### Environment Variables Required on Frontend

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_ENABLE_MOCK_DATA=false
```

---

## Contact & Support

For integration issues or questions:
- GitHub Issues: https://github.com/randevubu/randevubu.server/issues
- Email: dev@randevubu.com

---

**Document Version**: 1.0
**Generated**: 2025-10-30
**Last API Update**: 2025-10-30
