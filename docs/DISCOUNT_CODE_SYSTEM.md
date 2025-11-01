# Discount Code System Documentation

## Overview

The discount code system provides flexible discount application for subscription plans, supporting multiple scenarios including trial subscriptions, immediate payments, renewals, and late application. The system is designed to be completely optional and backward compatible.

## 🎯 Key Features

- **Optional Integration**: Discount codes are completely optional for subscriptions
- **Multiple Application Points**: Apply at trial start, conversion, renewals, or late
- **Flexible Discount Types**: One-time or recurring discounts
- **Smart Tracking**: Usage tracking, remaining uses, and application history
- **Backward Compatible**: Existing subscriptions continue working normally

## 📋 Discount Code Types

### One-time Discount
- Applied to first payment only
- Subsequent renewals use full price
- Example: `WELCOME20` (20% off first payment)

### Recurring Discount
- Applied to all payments until exhausted
- Configurable maximum number of uses
- Example: `LOYAL35` (35% off for 3 renewals)

## 🔌 API Endpoints

### 1. Create Subscription with Discount

**Endpoint:** `POST /api/v1/subscriptions/business/{businessId}/subscribe`

**Request Schema:**
```typescript
{
  "planId": "plan_basic_tier1",
  "discountCode": "WELCOME20",  // Optional field
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
    "email": "john.doe@example.com",
    "gsmNumber": "+905350000000",
    "address": "Test Address, Istanbul",
    "city": "Istanbul",
    "country": "Turkey",
    "zipCode": "34000"
  }
}
```

**Response Schema (Trial with Discount):**
```typescript
{
  "success": true,
  "message": "Business subscribed successfully",
  "data": {
    "id": "bs_1703123456789_abc123",
    "businessId": "biz_12345",
    "planId": "plan_basic_tier1",
    "status": "TRIAL",
    "currentPeriodStart": "2024-01-15T10:00:00.000Z",
    "currentPeriodEnd": "2024-01-22T10:00:00.000Z",
    "trialStart": "2024-01-15T10:00:00.000Z",
    "trialEnd": "2024-01-22T10:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "autoRenewal": true,
    "paymentMethodId": "pm_1703123456789_xyz789",
    "metadata": {
      "trialDays": 7,
      "requiresPaymentMethod": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "pendingDiscount": {
        "code": "WELCOME20",
        "validatedAt": "2024-01-15T10:00:00.000Z",
        "appliedToPayments": [],
        "isRecurring": false,
        "remainingUses": 1,
        "discountType": "PERCENTAGE",
        "discountValue": 20,
        "discountCodeId": "dc_welcome_123"
      }
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### 2. Apply Discount Code Later

**Endpoint:** `POST /api/v1/subscriptions/business/{businessId}/apply-discount`

**Request Schema:**
```typescript
{
  "discountCode": "LATE20"
}
```

**Response Schema:**
```typescript
{
  "success": true,
  "message": "Discount code applied successfully",
  "data": {
    "success": true
  }
}
```

### 3. Validate Discount Code

**Endpoint:** `POST /api/v1/discount-codes/validate`

**Request Schema:**
```typescript
{
  "code": "WELCOME20",
  "planId": "plan_basic_tier1",
  "amount": 949.00
}
```

**Response Schema:**
```typescript
{
  "success": true,
  "data": {
    "isValid": true,
    "discountCode": {
      "id": "dc_welcome_123",
      "code": "WELCOME20",
      "name": "New Customer Welcome",
      "discountType": "PERCENTAGE",
      "discountValue": 20,
      "isRecurring": false,
      "maxRecurringUses": 1
    },
    "calculatedDiscount": {
      "originalAmount": 949.00,
      "discountAmount": 189.80,
      "finalAmount": 759.20
    }
  }
}
```

## 🔄 Discount Application Scenarios

### Scenario 1: Trial Subscription with Discount

**Flow:**
1. User subscribes with discount code at trial start
2. Discount code is validated and stored in subscription metadata
3. Trial starts (7 days for basic plans)
4. At trial conversion, discount is automatically applied
5. Payment processed with discounted amount

**Example Request:**
```typescript
POST /api/v1/subscriptions/business/biz_12345/subscribe
{
  "planId": "plan_basic_tier1",
  "discountCode": "WELCOME20",
  "card": { ... },
  "buyer": { ... }
}
```

**Result:**
- Trial starts with full access
- Discount stored for later application
- At day 7, payment charged with 20% discount

### Scenario 2: Immediate Paid Subscription with Discount

**Flow:**
1. User subscribes to premium plan (no trial) with discount
2. Discount applied immediately to first payment
3. Payment processed with discounted amount

**Example Request:**
```typescript
POST /api/v1/subscriptions/business/biz_12345/subscribe
{
  "planId": "plan_premium_tier1",
  "discountCode": "UPGRADE25",
  "card": { ... },
  "buyer": { ... }
}
```

**Result:**
- Immediate payment with 25% discount
- Subscription becomes active immediately

### Scenario 3: Late Discount Application

**Flow:**
1. User has existing subscription (trial or active)
2. User applies discount code later
3. Discount stored for next payment (conversion or renewal)

**Example Request:**
```typescript
POST /api/v1/subscriptions/business/biz_12345/apply-discount
{
  "discountCode": "LATE20"
}
```

**Result:**
- Discount added to subscription metadata
- Applied to next payment (trial conversion or renewal)

### Scenario 4: Recurring Discount

**Flow:**
1. User subscribes with recurring discount code
2. Discount applied to first payment
3. Discount continues to apply to renewals until exhausted
4. Usage tracked and remaining uses decremented

**Example Metadata:**
```json
{
  "pendingDiscount": {
    "code": "LOYAL35",
    "isRecurring": true,
    "remainingUses": 3,
    "discountType": "PERCENTAGE",
    "discountValue": 35
  }
}
```

**Result:**
- First payment: 35% discount
- Second renewal: 35% discount (remainingUses: 2)
- Third renewal: 35% discount (remainingUses: 1)
- Fourth renewal: Full price (remainingUses: 0)

## 💾 Discount Metadata Structure

### Subscription Metadata
```json
{
  "pendingDiscount": {
    "code": "WELCOME20",
    "validatedAt": "2024-01-15T10:00:00.000Z",
    "appliedToPayments": [
      "trial_conversion_1703123456789",
      "renewal_1703209456789"
    ],
    "isRecurring": false,
    "remainingUses": 0,
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "discountCodeId": "dc_welcome_123"
  }
}
```

### Payment Metadata
```json
{
  "type": "trial_conversion",
  "plan": {
    "id": "plan_basic_tier1",
    "name": "basic_tier1",
    "displayName": "Basic Plan - Tier 1"
  },
  "discount": {
    "code": "WELCOME20",
    "originalAmount": 949.00,
    "discountAmount": 189.80,
    "finalAmount": 759.20
  }
}
```

## 🎨 Frontend Integration

### React Component Example

```typescript
import React, { useState } from 'react';

interface DiscountCodeInputProps {
  onApply: (code: string) => Promise<void>;
  onRemove?: () => void;
  appliedCode?: string;
  loading?: boolean;
}

const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({
  onApply,
  onRemove,
  appliedCode,
  loading = false
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setError('');
    try {
      await onApply(code.toUpperCase());
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply discount code');
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  if (appliedCode) {
    return (
      <div className="applied-discount">
        <div className="discount-badge">
          <span className="code">{appliedCode}</span>
          <span className="label">Applied</span>
        </div>
        {onRemove && (
          <button 
            type="button" 
            onClick={handleRemove}
            className="remove-btn"
          >
            Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="discount-code-input">
      <div className="input-group">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter discount code"
          maxLength={20}
          pattern="[A-Z0-9]+"
          disabled={loading}
          className={error ? 'error' : ''}
        />
        <button 
          onClick={handleApply} 
          disabled={loading || !code.trim()}
          className="apply-btn"
        >
          {loading ? 'Applying...' : 'Apply'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default DiscountCodeInput;
```

### Usage in Subscription Form

```typescript
const SubscriptionForm = () => {
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApplyDiscount = async (code: string) => {
    setLoading(true);
    try {
      // Validate discount code
      const response = await fetch('/api/v1/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          planId: selectedPlan.id,
          amount: selectedPlan.price
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.isValid) {
        setAppliedDiscount(code);
        // Update pricing display
        updatePricing(result.data.calculatedDiscount);
      } else {
        throw new Error(result.error || 'Invalid discount code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    // Reset pricing to original
    resetPricing();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Plan selection */}
      
      {/* Discount code input */}
      <DiscountCodeInput
        onApply={handleApplyDiscount}
        onRemove={handleRemoveDiscount}
        appliedCode={appliedDiscount}
        loading={loading}
      />
      
      {/* Payment form */}
      
      <button type="submit">
        {appliedDiscount ? 'Subscribe with Discount' : 'Subscribe'}
      </button>
    </form>
  );
};
```

## 🔧 Error Handling

### Common Error Responses

```typescript
// Invalid discount code
{
  "success": false,
  "error": "Invalid discount code: WELCOME20",
  "code": "INVALID_DISCOUNT_CODE"
}

// Discount code expired
{
  "success": false,
  "error": "Discount code has expired",
  "code": "DISCOUNT_EXPIRED"
}

// Discount code already used
{
  "success": false,
  "error": "You have already used this discount code",
  "code": "DISCOUNT_ALREADY_USED"
}

// Minimum purchase amount not met
{
  "success": false,
  "error": "Minimum purchase amount is 500.00",
  "code": "MINIMUM_AMOUNT_NOT_MET"
}

// Discount code usage limit reached
{
  "success": false,
  "error": "Discount code has reached its usage limit",
  "code": "USAGE_LIMIT_REACHED"
}
```

## 📊 Analytics and Tracking

### Discount Usage Metrics

```typescript
// Get discount code statistics
GET /api/v1/discount-codes/statistics

// Response
{
  "success": true,
  "data": {
    "totalCodes": 15,
    "activeCodes": 12,
    "totalUsages": 1250,
    "totalDiscountAmount": 125000.00,
    "topPerformingCodes": [
      {
        "code": "WELCOME20",
        "usages": 450,
        "totalDiscount": 45000.00
      }
    ],
    "conversionRates": {
      "withDiscount": 0.35,
      "withoutDiscount": 0.22
    }
  }
}
```

### Usage History

```typescript
// Get discount code usage history
GET /api/v1/discount-codes/{id}/usage

// Response
{
  "success": true,
  "data": {
    "discountCode": {
      "id": "dc_welcome_123",
      "code": "WELCOME20",
      "name": "New Customer Welcome"
    },
    "usages": [
      {
        "id": "dcu_123",
        "userId": "user_456",
        "businessId": "biz_789",
        "discountAmount": 189.80,
        "originalAmount": 949.00,
        "finalAmount": 759.20,
        "usedAt": "2024-01-15T10:00:00.000Z",
        "paymentId": "pay_123"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 450,
      "totalPages": 23
    }
  }
}
```

## 🚀 Best Practices

### Frontend Implementation

1. **Validate Early**: Check discount codes before form submission
2. **Show Savings**: Display discount amount and final price clearly
3. **Handle Errors**: Provide clear error messages for invalid codes
4. **Loading States**: Show loading indicators during validation
5. **Persistence**: Remember applied discounts during form navigation

### Backend Implementation

1. **Validation**: Always validate discount codes before storing
2. **Security**: Never expose full discount code details to unauthorized users
3. **Tracking**: Record all discount applications for analytics
4. **Cleanup**: Remove expired discount metadata periodically
5. **Monitoring**: Track discount usage patterns and conversion rates

### Security Considerations

1. **Rate Limiting**: Limit discount code validation attempts
2. **Audit Trail**: Log all discount code applications
3. **Access Control**: Restrict discount code management to admins
4. **Data Privacy**: Anonymize discount usage data for analytics
5. **Fraud Prevention**: Monitor for suspicious discount usage patterns

## 🔄 Migration Guide

### Existing Subscriptions

- **No Impact**: Existing subscriptions continue working normally
- **Optional Enhancement**: Discount functionality is additive
- **Backward Compatible**: All existing API calls remain unchanged

### Database Changes

```sql
-- Optional: Add recurring discount support
ALTER TABLE discount_codes 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN max_recurring_uses INTEGER;

-- Update existing discount codes
UPDATE discount_codes 
SET is_recurring = FALSE, max_recurring_uses = 1 
WHERE is_recurring IS NULL;
```

### Code Migration

1. **Update Service Dependencies**: Pass discount code service to subscription service
2. **Update Schemas**: Add discount code field to subscription schemas
3. **Update Controllers**: Add discount application endpoints
4. **Update Frontend**: Add discount code input components
5. **Test Thoroughly**: Verify all discount scenarios work correctly

## 📈 Performance Considerations

### Caching Strategy

```typescript
// Cache discount code validation results
const cacheKey = `discount:${code}:${planId}:${amount}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// Validate and cache result
const result = await validateDiscountCode(code, planId, amount);
await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min cache
```

### Database Optimization

```sql
-- Indexes for discount code queries
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX idx_discount_codes_validity ON discount_codes(valid_from, valid_until);
CREATE INDEX idx_discount_usage_code ON discount_code_usages(discount_code_id);
CREATE INDEX idx_discount_usage_user ON discount_code_usages(user_id);
```

## 🧪 Testing Scenarios

### Unit Tests

```typescript
describe('Discount Code Service', () => {
  test('should validate one-time discount', async () => {
    const result = await discountService.validateDiscountCode(
      'WELCOME20',
      'plan_basic_tier1',
      949.00,
      'user_123'
    );
    
    expect(result.isValid).toBe(true);
    expect(result.calculatedDiscount.finalAmount).toBe(759.20);
  });

  test('should reject expired discount', async () => {
    const result = await discountService.validateDiscountCode(
      'EXPIRED20',
      'plan_basic_tier1',
      949.00,
      'user_123'
    );
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('expired');
  });
});
```

### Integration Tests

```typescript
describe('Subscription with Discount', () => {
  test('should apply discount at trial conversion', async () => {
    // Create trial subscription with discount
    const subscription = await createTrialSubscription({
      planId: 'plan_basic_tier1',
      discountCode: 'WELCOME20',
      businessId: 'biz_123'
    });

    // Simulate trial conversion
    const payment = await convertTrialToActive(subscription.id);

    expect(payment.amount).toBe(759.20); // 20% discount applied
    expect(payment.metadata.discount.code).toBe('WELCOME20');
  });
});
```

## 📞 Support and Troubleshooting

### Common Issues

1. **Discount Not Applied**: Check if code is valid and not expired
2. **Recurring Discount Issues**: Verify `isRecurring` flag and `remainingUses`
3. **Validation Errors**: Ensure proper plan and amount validation
4. **Usage Tracking**: Check discount code usage limits and user eligibility

### Debug Information

```typescript
// Enable debug logging
process.env.DISCOUNT_DEBUG = 'true';

// Check subscription metadata
const subscription = await getSubscription(subscriptionId);
console.log('Pending discount:', subscription.metadata.pendingDiscount);

// Check discount code status
const discountCode = await getDiscountCode('WELCOME20');
console.log('Discount code status:', {
  isActive: discountCode.isActive,
  currentUsages: discountCode.currentUsages,
  maxUsages: discountCode.maxUsages,
  validFrom: discountCode.validFrom,
  validUntil: discountCode.validUntil
});
```

---

*This documentation covers the complete discount code system implementation. For additional details, refer to the source code in the respective service files.*



