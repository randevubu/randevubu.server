# Salesman Tracking System - Deep Analysis Report

## 📋 Executive Summary

After a thorough analysis of the codebase, here's what we found:

**✅ What EXISTS:**
- Robust discount code system with usage tracking
- Metadata fields in `BusinessSubscription` and `Payment` models
- Payment and subscription tracking infrastructure

**❌ What's MISSING:**
- No dedicated salesman/referral tracking system
- No salesman code management
- No commission tracking or reporting
- No way to attribute sales to specific salesmen

## 🔍 Current System Analysis

### 1. Discount Code System (Existing)

**Location:** `src/services/domain/discount/discountCodeService.ts`

**What it does:**
- Creates and manages discount codes (e.g., "WELCOME20", "REFER15")
- Tracks usage per user/subscription
- Supports one-time and recurring discounts
- Validates codes before application
- Records discount usage in `DiscountCodeUsage` table

**Limitations for Salesman Tracking:**
- ❌ Discount codes are for **customer discounts**, not salesman attribution
- ❌ No commission/share calculation
- ❌ No salesman management
- ❌ No reporting on salesman performance

### 2. Subscription Metadata (Existing)

**Location:** `prisma/schema.prisma` - `BusinessSubscription.metadata` (JSON field)

**Current Usage:**
```typescript
metadata: {
  paymentMethodId: string,
  createdBy: string,
  pendingDiscount?: {
    code: string,
    validatedAt: string,
    appliedToPayments: string[],
    // ... discount details
  }
}
```

**Available for:**
- ✅ Can store salesman code here
- ✅ Already stores subscription creation info
- ✅ Flexible JSON structure

### 3. Payment Metadata (Existing)

**Location:** `prisma/schema.prisma` - `Payment.metadata` (JSON field)

**Current Usage:**
```typescript
metadata: {
  iyzicoResponse?: object,
  conversationId?: string,
  error?: string,
  // Payment provider specific data
}
```

**Available for:**
- ✅ Can store salesman code here
- ✅ Links to subscription via `businessSubscriptionId`
- ✅ Tracks payment amounts

## 🎯 Requirements for Salesman Tracking

Based on your requirements:

1. **Salesman Code Assignment**
   - Each salesman gets unique code (e.g., "John098")
   - Code format: `{Name}{Numbers}` pattern

2. **Sales Attribution**
   - When business subscribes, track which salesman code was used
   - Store in subscription metadata
   - Store in payment metadata

3. **Commission Tracking**
   - Calculate salesman's share/commission
   - Track all sales attributed to each salesman
   - Generate reports

## 📊 Recommended Implementation Approach

### Option 1: Separate Salesman System (RECOMMENDED)

**Pros:**
- ✅ Clean separation from discount codes
- ✅ Dedicated salesman management
- ✅ Commission tracking built-in
- ✅ Scalable for future features

**Implementation:**

1. **New Database Model: `Salesman`**
   ```prisma
   model Salesman {
     id          String   @id
     code        String   @unique  // "John098"
     name        String
     email       String?
     phone       String?
     commissionRate Decimal? @db.Decimal(5, 2)  // e.g., 10.00 for 10%
     isActive    Boolean  @default(true)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     sales       SalesmanSale[]
   }
   ```

2. **New Database Model: `SalesmanSale`**
   ```prisma
   model SalesmanSale {
     id                     String                @id
     salesmanId             String
     businessSubscriptionId String
     businessId             String
     paymentId              String?
     saleAmount             Decimal   @db.Decimal(10, 2)
     commissionAmount       Decimal? @db.Decimal(10, 2)
     commissionRate         Decimal? @db.Decimal(5, 2)
     saleDate               DateTime  @default(now())
     status                 String    // "PENDING", "PAID", "CANCELLED"
     salesman               Salesman  @relation(fields: [salesmanId], references: [id])
     businessSubscription   BusinessSubscription @relation(fields: [businessSubscriptionId], references: [id])
     payment                 Payment? @relation(fields: [paymentId], references: [id])
   }
   ```

3. **Update Subscription Schema**
   - Add `salesmanCode` field to `subscribeBusinessSchema`
   - Validate salesman code exists and is active
   - Store in `BusinessSubscription.metadata`

4. **Update Payment Processing**
   - Extract salesman code from subscription metadata
   - Create `SalesmanSale` record when payment succeeds
   - Calculate commission if commission rate is set

### Option 2: Extend Discount Code System (NOT RECOMMENDED)

**Cons:**
- ❌ Mixes discount logic with salesman tracking
- ❌ Confusing for users (salesman codes vs discount codes)
- ❌ Hard to track commissions
- ❌ Limited reporting capabilities

## 🚀 Implementation Plan

### Phase 1: Database Schema
1. Create `Salesman` model
2. Create `SalesmanSale` model
3. Add indexes for performance
4. Create migration

### Phase 2: Core Services
1. `SalesmanService` - CRUD operations for salesmen
2. `SalesmanSaleService` - Track sales and calculate commissions
3. Update `SubscriptionService` to accept and validate salesman codes
4. Update `PaymentService` to create sales records

### Phase 3: API Endpoints
1. `POST /api/v1/salesmen` - Create salesman
2. `GET /api/v1/salesmen` - List salesmen
3. `GET /api/v1/salesmen/:id/sales` - Get salesman sales
4. `GET /api/v1/salesmen/:id/commission` - Get commission report
5. Update subscription endpoint to accept `salesmanCode`

### Phase 4: Reporting
1. Salesman performance dashboard
2. Commission reports
3. Sales attribution reports

## 📝 Code Locations to Modify

### Files to Create:
- `src/models/Salesman.ts` (types)
- `src/repositories/salesmanRepository.ts`
- `src/services/domain/salesman/salesmanService.ts`
- `src/services/domain/salesman/salesmanSaleService.ts`
- `src/controllers/salesmanController.ts`
- `src/routes/v1/salesmen.ts`
- `src/schemas/salesman.schemas.ts`

### Files to Modify:
- `prisma/schema.prisma` - Add Salesman and SalesmanSale models
- `src/schemas/business.schemas.ts` - Add `salesmanCode` to `subscribeBusinessSchema`
- `src/services/domain/subscription/subscriptionService.ts` - Validate and store salesman code
- `src/services/domain/payment/paymentService.ts` - Create sales records
- `src/controllers/subscriptionController.ts` - Accept salesman code in request

## 🔗 Integration Points

### Subscription Creation Flow
```
1. User submits subscription with salesmanCode
2. SubscriptionService validates salesman code exists
3. Store salesmanCode in BusinessSubscription.metadata
4. Create subscription
```

### Payment Processing Flow
```
1. Payment succeeds
2. PaymentService extracts salesmanCode from subscription metadata
3. Create SalesmanSale record with:
   - salesmanId (from code lookup)
   - businessSubscriptionId
   - paymentId
   - saleAmount
   - commissionAmount (if commission rate set)
4. Store salesmanSaleId in Payment.metadata
```

## 📈 Example Data Flow

### Scenario: John (Code: "John098") sells to Business ABC

**Subscription Creation:**
```json
{
  "businessSubscription": {
    "id": "bs_123",
    "businessId": "business_abc",
    "metadata": {
      "salesmanCode": "John098",
      "createdBy": "user_123",
      "pendingDiscount": {...}
    }
  }
}
```

**Payment Processing:**
```json
{
  "payment": {
    "id": "pay_456",
    "amount": 949.00,
    "metadata": {
      "salesmanSaleId": "sale_789",
      "conversationId": "..."
    }
  },
  "salesmanSale": {
    "id": "sale_789",
    "salesmanId": "salesman_john",
    "businessSubscriptionId": "bs_123",
    "paymentId": "pay_456",
    "saleAmount": 949.00,
    "commissionAmount": 94.90,  // 10% commission
    "commissionRate": 10.00,
    "status": "PENDING"
  }
}
```

## ✅ Implementation Status - COMPLETED

**Simple Metadata-Based Solution Implemented** ✅

A simple salesman code tracking system has been implemented using metadata fields:

1. ✅ Added `salesmanCode` field to subscription schema
2. ✅ Store salesman code in `BusinessSubscription.metadata`
3. ✅ Copy salesman code to `Payment.metadata` when payment succeeds
4. ✅ Added query method `findBySalesmanCode()` to payment repository

**No database migrations needed** - uses existing metadata JSON fields!

## 📝 Implementation Details

### What Was Added:
- `salesmanCode` field in subscription request schema (optional)
- Salesman code stored in subscription metadata
- Salesman code automatically copied to payment metadata
- `PaymentRepository.findBySalesmanCode()` method for querying

### How to Use:
See `docs/SALESMAN_CODE_USAGE.md` for complete usage guide.

### Example:
```typescript
// When subscribing
POST /api/v1/subscriptions/business/{businessId}/subscribe
{
  "planId": "plan_basic_tier1",
  "salesmanCode": "John098"  // Just add this!
}

// Query sales
const sales = await paymentRepository.findBySalesmanCode('John098');
```

## 🎯 Future Enhancements (Optional)

If more features are needed later:
- Add database index on metadata JSON field
- Create API endpoint for salesman stats
- Add commission calculation service
- Create salesman dashboard

But the current simple solution should work perfectly for tracking sales by salesman code!

---

**Conclusion:** ✅ Simple salesman tracking is now implemented using metadata fields. No overengineering - just store the code and query it when needed!

