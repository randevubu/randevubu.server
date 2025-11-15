# Salesman Code Integration - Frontend Guide

## Overview

When a business subscribes, you can optionally include a `salesmanCode` to track which salesman made the sale. The code is stored automatically and can be used for commission tracking later.

## API Integration

### Subscription Endpoint

**Endpoint:** `POST /api/v1/subscriptions/business/{businessId}/subscribe`

**Request Body:**
```json
{
  "planId": "plan_basic_tier1",
  "salesmanCode": "John098",  // ← Optional: Add this field
  "discountCode": "WELCOME20", // Optional: Discount code (separate from salesman code)
  "paymentMethodId": "pm_123", // Optional: If using stored payment method
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

## Field Details

### `salesmanCode` (Optional)

- **Type:** `string`
- **Required:** No
- **Format:** 3-20 characters, letters and numbers only
- **Example:** `"John098"`, `"Sarah123"`, `"Mike456"`
- **Validation:**
  - Minimum 3 characters
  - Maximum 20 characters
  - Only letters (A-Z, a-z) and numbers (0-9)
  - Case-sensitive

## Implementation Examples

### React/TypeScript Example

```typescript
interface SubscribeRequest {
  planId: string;
  salesmanCode?: string;  // Optional
  discountCode?: string;
  paymentMethodId?: string;
  card?: {
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
    gsmNumber: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  };
}

async function subscribeBusiness(
  businessId: string,
  planId: string,
  salesmanCode?: string,
  discountCode?: string
) {
  const response = await fetch(
    `/api/v1/subscriptions/business/${businessId}/subscribe`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        planId,
        ...(salesmanCode && { salesmanCode }),  // Only include if provided
        ...(discountCode && { discountCode }),
        card: {
          cardHolderName: "John Doe",
          cardNumber: "5528790000000008",
          expireMonth: "12",
          expireYear: "2030",
          cvc: "123"
        },
        buyer: {
          name: "John",
          surname: "Doe",
          email: "john.doe@example.com",
          gsmNumber: "+905350000000"
        }
      })
    }
  );

  return response.json();
}

// Usage
await subscribeBusiness(
  'business_123',
  'plan_basic_tier1',
  'John098',  // Salesman code
  'WELCOME20' // Discount code (separate)
);
```

### Vue.js Example

```javascript
async function subscribeBusiness(businessId, planId, salesmanCode) {
  const response = await axios.post(
    `/api/v1/subscriptions/business/${businessId}/subscribe`,
    {
      planId,
      salesmanCode,  // Optional - can be undefined
      card: {
        cardHolderName: "John Doe",
        cardNumber: "5528790000000008",
        expireMonth: "12",
        expireYear: "2030",
        cvc: "123"
      },
      buyer: {
        name: "John",
        surname: "Doe",
        email: "john.doe@example.com",
        gsmNumber: "+905350000000"
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
}
```

## Form Implementation

### Example Form Component

```typescript
function SubscriptionForm({ businessId, planId }) {
  const [salesmanCode, setSalesmanCode] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await subscribeBusiness(
      businessId,
      planId,
      salesmanCode || undefined,  // Send undefined if empty
      discountCode || undefined
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Other form fields */}
      
      {/* Salesman Code (Optional) */}
      <input
        type="text"
        placeholder="Salesman Code (e.g., John098)"
        value={salesmanCode}
        onChange={(e) => setSalesmanCode(e.target.value)}
        pattern="[A-Za-z0-9]{3,20}"
        maxLength={20}
      />
      
      {/* Discount Code (Optional) */}
      <input
        type="text"
        placeholder="Discount Code (e.g., WELCOME20)"
        value={discountCode}
        onChange={(e) => setDiscountCode(e.target.value)}
      />
      
      <button type="submit">Subscribe</button>
    </form>
  );
}
```

## Important Notes

### ✅ Salesman Code vs Discount Code

These are **separate fields**:
- **`salesmanCode`**: Tracks which salesman made the sale (for commission tracking)
- **`discountCode`**: Applies a discount to the customer (e.g., "WELCOME20")

You can use both together:
```json
{
  "planId": "plan_basic_tier1",
  "salesmanCode": "John098",    // For tracking salesman
  "discountCode": "WELCOME20"   // For customer discount
}
```

### ✅ Validation

The backend validates:
- Minimum 3 characters
- Maximum 20 characters
- Only letters and numbers (A-Z, a-z, 0-9)
- Case-sensitive

Invalid codes will return a validation error.

### ✅ Optional Field

- If `salesmanCode` is not provided, subscription works normally
- If `salesmanCode` is empty string, it's treated as not provided
- Only send the field if you have a valid code

## Response

The subscription endpoint returns the normal subscription response. The salesman code is stored internally and doesn't appear in the response.

**Success Response:**
```json
{
  "success": true,
  "message": "Business subscribed successfully",
  "subscription": {
    "id": "bs_123",
    "businessId": "business_123",
    "planId": "plan_basic_tier1",
    "status": "TRIAL",
    // ... other subscription fields
  }
}
```

## Error Handling

If salesman code validation fails:
```json
{
  "success": false,
  "error": "Salesman code must contain only letters and numbers"
}
```

## Quick Reference

| Field | Type | Required | Format | Example |
|-------|------|---------|--------|---------|
| `salesmanCode` | string | No | 3-20 chars, letters/numbers | `"John098"` |

## Questions?

- **Where do I get salesman codes?** You create and manage them yourself
- **Do I need to validate them?** Backend validates format automatically
- **Can I use both salesman code and discount code?** Yes, they're separate
- **What if I don't have a salesman code?** Just omit the field - it's optional

---

**Summary:** Just add `salesmanCode` to your subscription request body when you have it. The backend handles everything else automatically.




