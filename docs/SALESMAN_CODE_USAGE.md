# Salesman Code Tracking - Simple Implementation

## Overview

This is a simple salesman tracking system that stores salesman codes in metadata. No database tables needed - just metadata fields!

## How It Works

1. **Salesman Code**: A simple string code (e.g., "John098", "Sarah123")
2. **Storage**: Stored in `BusinessSubscription.metadata` and `Payment.metadata`
3. **Tracking**: All payments are automatically tagged with the salesman code from the subscription

## Usage

### 1. When Creating a Subscription

Include `salesmanCode` in the subscription request:

```json
POST /api/v1/subscriptions/business/{businessId}/subscribe
{
  "planId": "plan_basic_tier1",
  "salesmanCode": "John098",
  "discountCode": "WELCOME20",  // optional
  "card": { ... },
  "buyer": { ... }
}
```

### 2. What Gets Stored

**In Subscription Metadata:**
```json
{
  "paymentMethodId": "...",
  "createdBy": "user_123",
  "salesmanCode": "John098",
  "pendingDiscount": { ... }
}
```

**In Payment Metadata:**
```json
{
  "salesmanCode": "John098",
  "conversationId": "..."
}
```

### 3. Query Sales by Salesman Code

Use the payment repository to find all sales for a salesman:

```typescript
// In your service or controller
const payments = await paymentRepository.findBySalesmanCode('John098', {
  status: PaymentStatus.SUCCEEDED,
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
});

// Calculate total sales
const totalSales = payments.reduce((sum, p) => sum + p.amount, 0);
```

### 4. Example: Calculate Commission

```typescript
async function getSalesmanStats(salesmanCode: string) {
  const payments = await paymentRepository.findBySalesmanCode(salesmanCode, {
    status: PaymentStatus.SUCCEEDED
  });

  const totalSales = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalSalesCount = payments.length;
  
  // Example: 10% commission
  const commissionRate = 0.10;
  const totalCommission = totalSales * commissionRate;

  return {
    salesmanCode,
    totalSales,
    totalSalesCount,
    commissionRate,
    totalCommission,
    payments: payments.map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.createdAt
    }))
  };
}
```

## API Integration

### Subscription Endpoint
The existing subscription endpoint now accepts `salesmanCode`:

```typescript
// Request body schema
{
  planId: string;
  salesmanCode?: string;  // NEW - optional
  discountCode?: string;
  // ... other fields
}
```

## Data Structure

### Subscription Metadata
```typescript
{
  paymentMethodId?: string;
  createdBy?: string;
  salesmanCode?: string;  // The salesman code
  pendingDiscount?: { ... }
}
```

### Payment Metadata
```typescript
{
  salesmanCode?: string;  // Copied from subscription
  conversationId?: string;
  // ... other payment metadata
}
```

## Querying Sales

### By Salesman Code
```typescript
// Find all successful payments for a salesman
const sales = await paymentRepository.findBySalesmanCode('John098', {
  status: PaymentStatus.SUCCEEDED
});
```

### By Date Range
```typescript
const sales = await paymentRepository.findBySalesmanCode('John098', {
  status: PaymentStatus.SUCCEEDED,
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
});
```

## Notes

- ✅ **Simple**: No database migrations needed
- ✅ **Flexible**: Works with existing subscription/payment flow
- ✅ **Optional**: Salesman code is optional - works without it
- ✅ **Backward Compatible**: Existing subscriptions continue to work
- ⚠️ **Performance**: For large datasets, consider adding a database index on metadata JSON field if needed

## Future Enhancements (Optional)

If you need more features later:
- Add database index on metadata JSON field for faster queries
- Create a simple API endpoint for salesman stats
- Add commission calculation service
- Create salesman dashboard

But for now, this simple metadata-based approach should work perfectly!







