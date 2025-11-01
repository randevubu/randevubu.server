# Comprehensive Discount Code Seeding

This script creates all types of discount codes to test the complete discount system functionality.

## 🎯 What This Script Creates

### **One-Time Discount Codes (7 codes)**
- **WELCOME20** - 20% off first payment (Welcome)
- **EARLY50** - 50% off first payment (Early Bird)
- **SAVE100** - 100 TL off first payment (Fixed Amount)
- **FLASH60** - 60% off first payment (Flash Sale)
- **HOLIDAY40** - 40% off first payment (Holiday Special)
- **REFER15** - 15% off first payment (Referral Bonus)
- **TRIAL50** - 50 TL off first payment (Trial Extension)

### **Recurring Discount Codes (5 codes)**
- **LOYAL35** - 35% off for 3 payments (Loyalty Reward)
- **UPGRADE25** - 25% off for 2 payments (Premium Upgrade)
- **STUDENT50** - 50% off for 6 payments (Student Discount)
- **VIP30** - 30% off for 4 payments (VIP Customer)
- **ANNUAL20** - 20% off for 12 payments (Annual Commitment)

### **Test/Edge Case Codes (3 codes)**
- **EXPIRED10** - Expired discount (Testing)
- **LIMITED5** - Usage limit reached (Testing)
- **MINIMUM25** - High minimum purchase (Testing)

## 🚀 How to Run

### **Option 1: Run the comprehensive seeding script**
```bash
npx ts-node scripts/seed-comprehensive-discount-codes.ts
```

### **Option 2: Use the runner script**
```bash
npx ts-node scripts/run-discount-seeding.ts
```

### **Option 3: Run from package.json (if added)**
```bash
npm run seed:discounts
```

## 🧪 Testing Scenarios

### **Trial Subscription with Discount**
```bash
# Test with one-time discount
curl -X POST http://localhost:3000/api/v1/subscriptions/business/biz_123/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "planId": "plan_basic_tier1",
    "discountCode": "WELCOME20",
    "card": {...},
    "buyer": {...}
  }'
```

### **Recurring Discount Test**
```bash
# Test with recurring discount
curl -X POST http://localhost:3000/api/v1/subscriptions/business/biz_123/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "planId": "plan_premium_tier1",
    "discountCode": "LOYAL35",
    "card": {...},
    "buyer": {...}
  }'
```

### **Late Discount Application**
```bash
# Apply discount to existing subscription
curl -X POST http://localhost:3000/api/v1/subscriptions/business/biz_123/apply-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "discountCode": "UPGRADE25"
  }'
```

### **Discount Validation**
```bash
# Validate discount code
curl -X POST http://localhost:3000/api/v1/discount-codes/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME20",
    "planId": "plan_basic_tier1",
    "amount": 949.00
  }'
```

## 📊 Discount Code Categories

### **Welcome & Onboarding**
- `WELCOME20` - New customer welcome
- `TRIAL50` - Trial extension incentive

### **Limited Time Offers**
- `EARLY50` - Early bird special
- `FLASH60` - Flash sale
- `HOLIDAY40` - Holiday special

### **Loyalty & Retention**
- `LOYAL35` - Loyalty reward (recurring)
- `VIP30` - VIP customer exclusive (recurring)

### **Upgrade Incentives**
- `UPGRADE25` - Premium upgrade (recurring)
- `ANNUAL20` - Annual commitment (recurring)

### **Educational & Special Groups**
- `STUDENT50` - Student discount (recurring)

### **Referral Programs**
- `REFER15` - Referral bonus

### **Fixed Amount Discounts**
- `SAVE100` - Fixed amount discount
- `TRIAL50` - Fixed amount trial extension

### **Test & Edge Cases**
- `EXPIRED10` - Expired discount
- `LIMITED5` - Usage limit reached
- `MINIMUM25` - High minimum purchase

## 🔧 Configuration Options

### **Recurring Discount Settings**
```typescript
metadata: {
  isRecurring: true,           // Enable recurring
  maxRecurringUses: 3,         // Number of payments to apply
  category: 'loyalty',         // Category for tracking
  targetAudience: 'returning'  // Target audience
}
```

### **One-Time Discount Settings**
```typescript
metadata: {
  isRecurring: false,          // One-time only
  maxRecurringUses: 1,         // Apply once
  category: 'welcome',          // Category for tracking
  urgency: 'high'              // Urgency level
}
```

## 📈 Usage Tracking

The script creates sample usage records to demonstrate:
- Discount application tracking
- Payment type identification
- Metadata storage
- Usage count updates

## 🎯 Expected Results

After running the script, you should have:
- ✅ **15 discount codes** created
- ✅ **12 active codes** ready for use
- ✅ **3 test codes** for edge case testing
- ✅ **Sample usage records** for demonstration
- ✅ **All discount types** covered (percentage, fixed amount)
- ✅ **All application scenarios** supported (one-time, recurring)
- ✅ **All edge cases** handled (expired, limited, minimum purchase)

## 🔍 Verification

Check the database to verify:
```sql
-- Count all discount codes
SELECT COUNT(*) FROM discount_codes;

-- Count active codes
SELECT COUNT(*) FROM discount_codes WHERE is_active = true;

-- Count recurring codes
SELECT COUNT(*) FROM discount_codes 
WHERE metadata->>'isRecurring' = 'true';

-- Count one-time codes
SELECT COUNT(*) FROM discount_codes 
WHERE metadata->>'isRecurring' = 'false';
```

## 🚨 Important Notes

1. **Backup First**: This script clears existing discount codes
2. **Admin Required**: Some operations require admin permissions
3. **Test Environment**: Run in development/staging first
4. **Database Migration**: Ensure all migrations are applied
5. **Service Dependencies**: Ensure all services are properly configured

## 🎉 Success Indicators

You'll know the seeding was successful when you see:
- ✅ All 15 discount codes created
- ✅ Sample usage records created
- ✅ No database errors
- ✅ All discount types represented
- ✅ Both one-time and recurring codes available
- ✅ Test scenarios ready for validation



