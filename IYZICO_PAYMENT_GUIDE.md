# Iyzico Payment Integration Guide

This guide explains how to set up and use the Iyzico payment integration for subscription payments in your RandevuBu application.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The Iyzico payment integration provides:
- Subscription payment processing
- Credit card payment support
- Payment refunds and cancellations
- Webhook handling for payment notifications
- Test card support for development

## Setup

### 1. Install Dependencies

The required dependencies are already installed:
- `iyzipay@^2.0.64` - Official Iyzico Node.js SDK

### 2. Environment Configuration

Copy `.env.example` to `.env` and update the Iyzico configuration:

```bash
cp .env.example .env
```

Update the following values in your `.env` file:

```env
# Iyzico Sandbox Configuration (for testing)
IYZICO_API_KEY="sandbox-your-api-key"
IYZICO_SECRET_KEY="sandbox-your-secret-key"
IYZICO_BASE_URL="https://sandbox-api.iyzipay.com"

# For production, use:
# IYZICO_API_KEY="your-production-api-key"
# IYZICO_SECRET_KEY="your-production-secret-key"
# IYZICO_BASE_URL="https://api.iyzipay.com"
```

### 3. Get Iyzico Credentials

#### Sandbox (Testing)
1. Register at [Iyzico Sandbox](https://sandbox-merchant.iyzipay.com/)
2. Get your sandbox API key and secret key
3. Use `https://sandbox-api.iyzipay.com` as the base URL

#### Production
1. Register at [Iyzico Merchant Panel](https://merchant.iyzipay.com/)
2. Complete business verification
3. Get your production API key and secret key
4. Use `https://api.iyzipay.com` as the base URL

## Configuration

The payment system is automatically configured when you start the application. The `PaymentService` class handles all Iyzico interactions.

### Key Files
- `src/services/paymentService.ts` - Main payment service
- `src/controllers/paymentController.ts` - Payment API endpoints
- `src/routes/v1/payments.ts` - Payment routes

## API Endpoints

### 1. Create Subscription Payment

```http
POST /api/v1/businesses/{businessId}/payments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "planId": "plan_123",
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
    "phone": "+905350000000",
    "address": "Test Address",
    "city": "Istanbul",
    "country": "Turkey",
    "zipCode": "34000"
  },
  "installment": "1"
}
```

### 2. Get Payment History

```http
GET /api/v1/businesses/{businessId}/payments
Authorization: Bearer <access_token>
```

### 3. Get Payment Details

```http
GET /api/v1/payments/{paymentId}
Authorization: Bearer <access_token>
```

### 4. Refund Payment

```http
POST /api/v1/payments/{paymentId}/refund
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 50.00,
  "reason": "Customer requested refund"
}
```

### 5. Cancel Payment

```http
POST /api/v1/payments/{paymentId}/cancel
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}
```

### 6. Get Test Cards

```http
GET /api/v1/payments/test-cards
```

Returns test credit cards for sandbox testing.

### 7. Webhook Endpoint

```http
POST /api/v1/payments/webhook
Content-Type: application/json

# This endpoint receives Iyzico webhook notifications
```

## Testing

### Test Credit Cards

Use these test cards in sandbox mode:

#### Successful Payment
- Card Number: `5528790000000008`
- Holder Name: `John Doe`
- Expiry: `12/2030`
- CVC: `123`

#### Failed Payment
- Card Number: `5406670000000009`
- Holder Name: `John Doe`
- Expiry: `12/2030`
- CVC: `123`

### Example Test Flow

1. **Get Test Cards**:
   ```bash
   curl -X GET http://localhost:3000/api/v1/payments/test-cards
   ```

2. **Create a Business Subscription Payment**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/businesses/business_123/payments \
     -H "Authorization: Bearer <your_token>" \
     -H "Content-Type: application/json" \
     -d '{
       "planId": "plan_123",
       "card": {
         "cardHolderName": "John Doe",
         "cardNumber": "5528790000000008",
         "expireMonth": "12",
         "expireYear": "2030",
         "cvc": "123"
       }
     }'
   ```

3. **Check Payment Status**:
   ```bash
   curl -X GET http://localhost:3000/api/v1/payments/pay_123 \
     -H "Authorization: Bearer <your_token>"
   ```

### Database Verification

After a successful payment, verify in your database:

```sql
-- Check payment records
SELECT * FROM payments ORDER BY "createdAt" DESC LIMIT 5;

-- Check subscription status
SELECT * FROM business_subscriptions WHERE status = 'ACTIVE';
```

## Production Deployment

### 1. Update Environment Variables

```env
# Production Iyzico Configuration
IYZICO_API_KEY="your-production-api-key"
IYZICO_SECRET_KEY="your-production-secret-key"
IYZICO_BASE_URL="https://api.iyzipay.com"
NODE_ENV="production"
```

### 2. Security Considerations

- Never log sensitive card information
- Use HTTPS in production
- Validate webhook signatures (implement if needed)
- Set up proper error monitoring
- Configure rate limiting for payment endpoints

### 3. Webhook Configuration

1. In Iyzico merchant panel, set webhook URL to:
   ```
   https://your-domain.com/api/v1/payments/webhook
   ```

2. Handle webhook events in your application for:
   - Payment success/failure notifications
   - Refund notifications
   - Chargeback notifications

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error
- Verify your `IYZICO_API_KEY` and `IYZICO_SECRET_KEY`
- Ensure you're using the correct base URL for your environment
- Check that keys don't have extra spaces or quotes

#### 2. "Payment Failed" with Valid Card
- Verify you're using test cards in sandbox mode
- Check that card details are formatted correctly
- Ensure buyer information is complete and valid

#### 3. "Subscription Already Exists" Error
- Check if business already has an active subscription
- Cancel existing subscription before creating a new one

#### 4. Database Connection Issues
- Verify `DATABASE_URL` is correct
- Run `npm run db:generate` to ensure Prisma client is updated
- Check database connectivity

### Debugging

Enable debug logging:

```env
LOG_LEVEL="debug"
NODE_ENV="development"
```

Check application logs for detailed error information:

```bash
# View logs in development
npm run dev

# Check payment service logs
tail -f logs/app.log | grep -i payment
```

### Support

For Iyzico-specific issues:
- [Iyzico Documentation](https://dev.iyzipay.com/en)
- [Iyzico Support](https://www.iyzico.com/en/support)
- [GitHub Repository](https://github.com/iyzico/iyzipay-node)

For application-specific issues:
- Check the application logs
- Review the payment service implementation
- Verify database schema and migrations

## Additional Features

### Subscription Management

The integration automatically:
- Creates subscription records in the database
- Updates subscription status after successful payment
- Handles payment failures and updates subscription accordingly
- Supports subscription cancellation and refunds

### Payment Analytics

You can query payment data for analytics:

```sql
-- Revenue by month
SELECT 
  DATE_TRUNC('month', "paidAt") as month,
  SUM(amount) as revenue,
  COUNT(*) as payment_count
FROM payments 
WHERE status = 'SUCCEEDED'
GROUP BY DATE_TRUNC('month', "paidAt")
ORDER BY month DESC;

-- Subscription plan popularity
SELECT 
  sp.name,
  sp."displayName",
  COUNT(p.*) as payment_count,
  SUM(p.amount) as total_revenue
FROM payments p
JOIN business_subscriptions bs ON p."businessSubscriptionId" = bs.id
JOIN subscription_plans sp ON bs."planId" = sp.id
WHERE p.status = 'SUCCEEDED'
GROUP BY sp.id, sp.name, sp."displayName"
ORDER BY total_revenue DESC;
```

## Next Steps

1. Test the payment flow in sandbox mode
2. Implement webhook signature validation for security
3. Add payment retry logic for failed payments
4. Set up monitoring and alerts for payment issues
5. Implement subscription renewal automation
6. Add payment analytics dashboard