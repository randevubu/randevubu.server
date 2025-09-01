# Discount Codes API Documentation

## Overview

The Discount Codes system allows administrators to create promotional codes that customers can use to get discounts on subscription purchases. The system supports both percentage-based and fixed-amount discounts with comprehensive usage tracking and validation.

## Features

- ✅ **One-time use per customer** - Prevents multiple usage by the same user
- ✅ **Usage limits** - Set maximum total usage for each code
- ✅ **Expiration dates** - Control validity period with from/until dates
- ✅ **Plan restrictions** - Limit codes to specific subscription plans
- ✅ **Minimum purchase amounts** - Require minimum spend to use code
- ✅ **Two discount types** - Percentage (20% off) or Fixed Amount (100 TL off)
- ✅ **Admin management** - Full CRUD operations for administrators
- ✅ **Public validation** - Customers can validate codes during checkout
- ✅ **Bulk generation** - Create multiple codes at once
- ✅ **Usage analytics** - Track code performance and statistics

## Database Models

### DiscountCode
```typescript
interface DiscountCode {
  id: string
  code: string              // Unique code (e.g., "SAVE20")
  name?: string            // Display name
  description?: string     // Description
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number    // 20 for 20% or 100 for 100 TL
  maxUsages: number        // Maximum total uses
  currentUsages: number    // Current usage count
  isActive: boolean        // Can be used
  validFrom: Date          // Start date
  validUntil?: Date        // End date (optional)
  minPurchaseAmount?: number  // Minimum spend required
  applicablePlans: string[]   // Plan IDs this code works with
  metadata?: any           // Additional data
  createdAt: Date
  updatedAt: Date
  createdById?: string     // Admin who created it
}
```

### DiscountCodeUsage
```typescript
interface DiscountCodeUsage {
  id: string
  discountCodeId: string
  userId: string           // User who used the code
  businessSubscriptionId?: string
  paymentId?: string
  discountAmount: number   // Actual discount applied
  originalAmount: number   // Original price
  finalAmount: number      // Final price after discount
  usedAt: Date
  metadata?: any
}
```

## API Endpoints

### Base URL
```
https://your-domain.com/api/v1/discount-codes
```

---

## Admin Endpoints (Require Authentication & Admin Permissions)

### 1. Create Discount Code

**`POST /discount-codes`**

Create a new discount code.

#### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "code": "SAVE20",
  "name": "20% Off Special",
  "description": "Special discount for new customers",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "maxUsages": 100,
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "minPurchaseAmount": 50,
  "applicablePlans": [
    "plan-premium-monthly",
    "plan-premium-yearly"
  ],
  "metadata": {
    "campaign": "new_year_2025"
  }
}
```

#### Request Schema
```typescript
{
  code?: string                    // Optional - auto-generated if not provided
  name?: string                   // Display name
  description?: string            // Description
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"  // Required
  discountValue: number          // Required - positive number
  maxUsages?: number             // Default: 1
  validFrom?: string             // ISO date string
  validUntil?: string            // ISO date string
  minPurchaseAmount?: number     // Minimum purchase required
  applicablePlans?: string[]     // Plan IDs (empty = all plans)
  metadata?: object              // Additional data
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "dc_1735123456789_abc123",
    "code": "SAVE20",
    "name": "20% Off Special",
    "description": "Special discount for new customers",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "maxUsages": 100,
    "currentUsages": 0,
    "isActive": true,
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "minPurchaseAmount": 50,
    "applicablePlans": [
      "plan-premium-monthly",
      "plan-premium-yearly"
    ],
    "metadata": {
      "campaign": "new_year_2025"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "createdById": "user-admin-123"
  },
  "message": "Discount code created successfully"
}
```

#### Error Responses
```json
// 400 Bad Request - Validation Error
{
  "success": false,
  "error": "Discount code already exists"
}

// 403 Forbidden - Insufficient Permissions
{
  "success": false,
  "error": "Insufficient permissions"
}
```

---

### 2. Get All Discount Codes

**`GET /discount-codes`**

Retrieve all discount codes with pagination.

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Query Parameters
```
?page=1&limit=20&isActive=true
```

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | integer | Page number | 1 |
| limit | integer | Items per page (1-100) | 20 |
| isActive | boolean | Filter by active status | - |

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "discountCodes": [
      {
        "id": "dc_1735123456789_abc123",
        "code": "SAVE20",
        "name": "20% Off Special",
        "description": "Special discount for new customers",
        "discountType": "PERCENTAGE",
        "discountValue": 20,
        "maxUsages": 100,
        "currentUsages": 15,
        "isActive": true,
        "validFrom": "2025-01-01T00:00:00.000Z",
        "validUntil": "2025-12-31T23:59:59.000Z",
        "minPurchaseAmount": 50,
        "applicablePlans": [
          "plan-premium-monthly",
          "plan-premium-yearly"
        ],
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 2
  }
}
```

---

### 3. Get Discount Code by ID

**`GET /discount-codes/{id}`**

Retrieve a specific discount code by ID.

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "dc_1735123456789_abc123",
    "code": "SAVE20",
    "name": "20% Off Special",
    "description": "Special discount for new customers",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "maxUsages": 100,
    "currentUsages": 15,
    "isActive": true,
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "minPurchaseAmount": 50,
    "applicablePlans": [
      "plan-premium-monthly",
      "plan-premium-yearly"
    ],
    "metadata": {
      "campaign": "new_year_2025"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "createdById": "user-admin-123"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "success": false,
  "error": "Discount code not found"
}
```

---

### 4. Update Discount Code

**`PUT /discount-codes/{id}`**

Update an existing discount code.

#### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "25% Off Special - Updated",
  "discountValue": 25,
  "maxUsages": 150,
  "validUntil": "2025-06-30T23:59:59.000Z"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "dc_1735123456789_abc123",
    "code": "SAVE20",
    "name": "25% Off Special - Updated",
    "description": "Special discount for new customers",
    "discountType": "PERCENTAGE",
    "discountValue": 25,
    "maxUsages": 150,
    "currentUsages": 15,
    "isActive": true,
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validUntil": "2025-06-30T23:59:59.000Z",
    "minPurchaseAmount": 50,
    "applicablePlans": [
      "plan-premium-monthly",
      "plan-premium-yearly"
    ],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-20T15:45:00.000Z",
    "createdById": "user-admin-123"
  },
  "message": "Discount code updated successfully"
}
```

---

### 5. Deactivate Discount Code

**`PATCH /discount-codes/{id}/deactivate`**

Deactivate a discount code (sets isActive to false).

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Discount code deactivated successfully"
}
```

---

### 6. Delete Discount Code

**`DELETE /discount-codes/{id}`**

Delete a discount code (only if it hasn't been used).

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Discount code deleted successfully"
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Cannot delete discount code that has been used. Deactivate it instead."
}
```

---

### 7. Get Usage History

**`GET /discount-codes/{id}/usage`**

Get usage history for a specific discount code.

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Query Parameters
```
?page=1&limit=20
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "usages": [
      {
        "id": "dcu_1735234567890_def456",
        "discountCodeId": "dc_1735123456789_abc123",
        "userId": "user-customer-456",
        "businessSubscriptionId": "sub_1735234567890_ghi789",
        "paymentId": "pay_1735234567890_jkl012",
        "discountAmount": 20,
        "originalAmount": 100,
        "finalAmount": 80,
        "usedAt": "2025-01-18T14:22:00.000Z",
        "metadata": {
          "planName": "Premium Monthly"
        }
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### 8. Get Statistics

**`GET /discount-codes/statistics`**

Get overall discount code statistics.

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalCodes": 50,
    "activeCodes": 35,
    "expiredCodes": 10,
    "totalUsages": 1250,
    "totalDiscountAmount": 25600.50
  }
}
```

---

### 9. Generate Bulk Discount Codes

**`POST /discount-codes/bulk`**

Generate multiple discount codes at once.

#### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "prefix": "BULK",
  "count": 50,
  "discountType": "PERCENTAGE",
  "discountValue": 15,
  "maxUsages": 1,
  "validUntil": "2025-03-31T23:59:59.000Z",
  "minPurchaseAmount": 100,
  "applicablePlans": ["plan-premium-monthly"],
  "description": "Bulk generated codes for March campaign"
}
```

#### Request Schema
```typescript
{
  prefix?: string              // Default: "BULK"
  count: number               // Required, max 1000
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"  // Required
  discountValue: number       // Required
  maxUsages?: number          // Default: 1
  validUntil?: string         // ISO date string
  minPurchaseAmount?: number
  applicablePlans?: string[]
  description?: string
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "id": "dc_1735345678901_bulk1",
        "code": "BULK12A45B",
        "name": "BULK Code 1",
        "discountType": "PERCENTAGE",
        "discountValue": 15,
        "maxUsages": 1,
        "currentUsages": 0,
        "isActive": true,
        "validUntil": "2025-03-31T23:59:59.000Z",
        "metadata": {
          "bulkGenerated": true,
          "bulkPrefix": "BULK",
          "bulkIndex": 1
        },
        "createdAt": "2025-01-20T12:00:00.000Z"
      }
    ],
    "count": 50
  },
  "message": "Successfully generated 50 discount codes"
}
```

---

## Public Endpoints (No Authentication Required)

### 10. Validate Discount Code

**`POST /discount-codes/validate`**

Validate a discount code for a specific plan and amount.

#### Request Body
```json
{
  "code": "SAVE20",
  "planId": "plan-premium-monthly",
  "amount": 100
}
```

#### Request Schema
```typescript
{
  code: string      // Required - the discount code
  planId: string    // Required - subscription plan ID
  amount: number    // Required - purchase amount
}
```

#### Response - Valid Code (200 OK)
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "discountAmount": 20,
    "originalAmount": 100,
    "finalAmount": 80,
    "errorMessage": null
  }
}
```

#### Response - Invalid Code (200 OK)
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "discountAmount": null,
    "originalAmount": null,
    "finalAmount": null,
    "errorMessage": "Discount code has expired"
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Code, planId, and amount are required"
}
```

---

## Integration with Payment System

### Using Discount Code in Subscription Purchase

When creating a subscription, include the `discountCode` in the payment data:

```json
POST /api/v1/payments/subscription
{
  "businessId": "business-123",
  "planId": "plan-premium-monthly",
  "paymentData": {
    "discountCode": "SAVE20",
    "card": {
      "cardHolderName": "John Doe",
      "cardNumber": "5528790000000008",
      "expireMonth": "12",
      "expireYear": "2030",
      "cvc": "123"
    },
    "buyer": {
      "name": "John",
      "surname": "Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

### Response with Discount Applied
```json
{
  "success": true,
  "subscriptionId": "sub_1735456789012_xyz789",
  "paymentId": "pay_1735456789012_abc123",
  "message": "Successfully subscribed to Premium Monthly",
  "discountApplied": {
    "code": "SAVE20",
    "discountAmount": 20,
    "originalAmount": 100,
    "finalAmount": 80
  }
}
```

---

## Pre-seeded Discount Codes

The system comes with 10 pre-configured discount codes for testing:

| Code | Type | Value | Description | Expiry |
|------|------|-------|-------------|--------|
| `WELCOME20` | Percentage | 20% | New customer welcome | 1 year |
| `EARLY50` | Percentage | 50% | Early bird special | 1 month |
| `UPGRADE25` | Percentage | 25% | Premium upgrade incentive | 1 year |
| `SAVE100` | Fixed Amount | 100 TL | Fixed discount for annual plans | 1 year |
| `HOLIDAY40` | Percentage | 40% | Holiday season special | 1 week |
| `VIP30` | Percentage | 30% | VIP customer exclusive | 1 year |
| `REFER15` | Percentage | 15% | Referral program bonus | 1 year |
| `STUDENT50` | Percentage | 50% | Student discount | 1 year |
| `FLASH60` | Percentage | 60% | Flash sale | 2 days |
| `LOYAL35` | Percentage | 35% | Loyalty reward | 1 year |

---

## Error Codes and Messages

### Common Error Messages
- `"Discount code not found"`
- `"Discount code is not active"`
- `"Discount code has expired"`
- `"Discount code is not yet valid"`
- `"Discount code has reached its usage limit"`
- `"You have already used this discount code"`
- `"Minimum purchase amount is X"`
- `"Discount code is not applicable to this plan"`
- `"Percentage discount cannot exceed 100%"`
- `"Cannot delete discount code that has been used. Deactivate it instead."`

### HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation error or business logic error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Management Commands

### Seed Discount Codes
```bash
make db-seed-discounts
```

### Seed All Data (Including Discount Codes)
```bash
make db-seed
```

---

## Best Practices

### For Administrators
1. **Use clear, memorable codes** - Keep codes short and meaningful (e.g., `WELCOME20`, `HOLIDAY50`)
2. **Set appropriate expiration dates** - Don't leave codes active indefinitely
3. **Monitor usage** - Check statistics regularly to track code performance
4. **Deactivate instead of delete** - Preserve usage history by deactivating used codes
5. **Use plan restrictions** - Limit high-value discounts to specific plans
6. **Set minimum purchase amounts** - Prevent abuse on very small purchases

### For Frontend Developers
1. **Validate codes before checkout** - Use the validate endpoint to show real-time feedback
2. **Show discount breakdown** - Display original price, discount amount, and final price
3. **Handle all error cases** - Provide clear error messages for invalid codes
4. **Implement auto-uppercase** - Convert codes to uppercase before sending to API
5. **Cache validation results** - Avoid repeated validation calls for the same code

### For Integration
1. **Always validate codes** - Never trust client-side validation alone
2. **Handle payment failures** - Don't mark codes as used if payment fails
3. **Log usage attempts** - Track both successful and failed code usage for analytics
4. **Implement rate limiting** - Prevent abuse of validation endpoint
5. **Monitor conversion rates** - Track which codes lead to successful purchases

---

## Security Considerations

1. **One-time use enforcement** - Codes can only be used once per customer
2. **Expiration enforcement** - Expired codes are automatically rejected
3. **Permission-based access** - Admin operations require proper RBAC permissions
4. **Input validation** - All inputs are validated using Zod schemas
5. **SQL injection prevention** - Using Prisma ORM with parameterized queries
6. **Rate limiting** - API endpoints should be rate-limited to prevent abuse

---

## Support

For technical support or feature requests, please refer to the main API documentation or contact the development team.