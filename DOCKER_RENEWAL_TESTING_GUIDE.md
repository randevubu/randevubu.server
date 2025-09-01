# 🐳 Docker Testing Guide - Subscription Auto-Renewal System

## Quick Start

### 1. **Start Development Environment**
```bash
# Build and start all containers
make dev

# Or manually:
docker-compose up --build -d
docker-compose logs -f app
```

### 2. **Install Dependencies & Run Migrations**
```bash
# Install new dependencies (node-cron)
docker-compose exec app npm install

# Run database migrations
docker-compose exec app npx prisma migrate dev --name add-auto-renewal-system

# Generate Prisma client
docker-compose exec app npx prisma generate
```

### 3. **Restart Container** (to pick up new dependencies)
```bash
docker-compose restart app
make logs
```

## ⚡ 1-Minute Testing Setup

### Development Mode Configuration
- ✅ **Renewal checks**: Every 1 minute
- ✅ **Reminders**: Every 2 minutes  
- ✅ **Cleanup**: Every 5 minutes
- ✅ **Auto-enabled** in development mode

### Test Schedule:
```
00:00 - Create test subscription (expires in 2 minutes)
01:00 - First renewal check (no action yet)
02:00 - Second renewal check (subscription expired, triggers renewal)
02:01 - Renewal processed, subscription extended
```

## 🧪 Testing API Endpoints

### Available Testing Endpoints (Development Only):

#### 1. **Create Test Subscription** (expires in 2 minutes)
```bash
curl -X POST http://localhost:3001/api/v1/testing/subscription/create-expiring \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "your-business-id",
    "planId": "your-plan-id",
    "minutesUntilExpiry": 2,
    "autoRenewal": true
  }'
```

#### 2. **Monitor Test Subscriptions**
```bash
curl -X GET http://localhost:3001/api/v1/testing/subscription/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 3. **Check Scheduler Status**
```bash
curl -X GET http://localhost:3001/api/v1/testing/scheduler/status
```

#### 4. **Clean Up Test Data**
```bash
curl -X DELETE http://localhost:3001/api/v1/testing/subscription/cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📋 Step-by-Step Testing Process

### Step 1: Setup Test Data
```bash
# Access container shell
docker-compose exec app bash

# Use Prisma Studio to get business and plan IDs
npx prisma studio
# Opens at http://localhost:5555
```

### Step 2: Create Test Subscription
```bash
# Replace with actual IDs from your database
curl -X POST http://localhost:3001/api/v1/testing/subscription/create-expiring \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "clxxxxx-business-id",
    "planId": "clxxxxx-plan-id",
    "minutesUntilExpiry": 2
  }'
```

**Response Example:**
```json
{
  "success": true,
  "message": "Test subscription created, expires in 2 minutes",
  "subscription": {
    "id": "test_sub_1234_abcd",
    "businessId": "clxxxxx",
    "currentPeriodEnd": "2024-08-31T15:47:00.000Z",
    "autoRenewal": true,
    "paymentMethodId": "test_pm_1234_abcd"
  },
  "testingInfo": {
    "expiresAt": "2024-08-31T15:47:00.000Z",
    "nextRenewalCheck": "Within 1 minute",
    "watchLogs": "Check server logs for renewal attempts"
  }
}
```

### Step 3: Monitor Logs
```bash
# Watch renewal attempts in real-time
make logs

# Or:
docker-compose logs -f app | grep -E "(renewal|scheduler)"
```

**Expected Log Output:**
```
📅 Subscription scheduler started in DEVELOPMENT mode
⚡ Development schedules:
   - Renewals: Every minute
   - Reminders: Every 2 minutes  
   - Cleanup: Every 5 minutes
⚠️  DEVELOPMENT MODE - Do not use in production!

🔄 Running subscription renewal check...
✅ Successfully renewed subscription test_sub_1234_abcd for business Test Business
🔄 Renewal check completed: 1 processed, 1 renewed, 0 failed
```

### Step 4: Verify Renewal
```bash
# Check if subscription was renewed
curl -X GET http://localhost:3001/api/v1/testing/subscription/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Look for:**
- ✅ Status: `ACTIVE`
- ✅ New `currentPeriodEnd` (extended by 1 month/year)
- ✅ `failedPaymentCount: 0`

## 🔧 Docker Debugging Commands

### Container Management:
```bash
# Check container status
make status

# View all logs
make logs

# Access container shell
make shell

# Restart specific service
docker-compose restart app

# Rebuild containers
make down && make dev
```

### Database Operations:
```bash
# Access database shell
make db-shell

# Open Prisma Studio
make db-studio

# Check migration status
docker-compose exec app npx prisma migrate status

# Reset database (if needed)
docker-compose exec app npx prisma migrate reset
```

### Application Debugging:
```bash
# Check environment variables
docker-compose exec app env | grep NODE_ENV

# View package.json dependencies
docker-compose exec app npm list | grep cron

# Check server process
docker-compose exec app ps aux | grep node
```

## 🧹 Testing Scenarios

### Scenario 1: Successful Renewal
1. Create subscription expiring in 2 minutes
2. Wait for renewal check (every minute)
3. Verify successful renewal in logs
4. Check extended subscription period

### Scenario 2: Payment Failure
```bash
# Create subscription with invalid payment method
# (modify test helper to simulate failure)
```

### Scenario 3: Auto-Renewal Disabled
```bash
curl -X POST http://localhost:3001/api/v1/testing/subscription/create-expiring \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "your-business-id",
    "planId": "your-plan-id", 
    "autoRenewal": false
  }'
```

### Scenario 4: Multiple Subscriptions
Create multiple test subscriptions with different expiry times and observe batch processing.

## 📊 Monitoring & Verification

### Key Metrics to Watch:
- **Renewal Success Rate**: Should be ~100% for test data
- **Processing Time**: Renewals should complete within seconds
- **Log Clarity**: Clear success/failure messages
- **Database Consistency**: Proper period extensions

### Expected Behaviors:
- ✅ Scheduler starts automatically in development
- ✅ Renewal checks run every minute
- ✅ Test subscriptions renew successfully
- ✅ Logs show detailed renewal process
- ✅ Database reflects updated periods
- ✅ No memory leaks or performance issues

### Warning Signs:
- ❌ Scheduler not starting
- ❌ Cron jobs not running
- ❌ Payment processing failures
- ❌ Database connection issues
- ❌ Memory usage growing continuously

## 🚀 Production Deployment Notes

When ready for production:

1. **Environment Variables:**
```bash
NODE_ENV=production  # Switches to production schedules
```

2. **Production Schedules:**
   - Renewals: Daily at 2:00 AM
   - Reminders: Daily at 9:00 AM
   - Cleanup: Weekly on Sunday at 3:00 AM

3. **Remove Testing Routes:**
   Testing endpoints automatically return 404 in production.

4. **Monitoring:**
   Set up proper monitoring for renewal success rates and payment failures.

## 🛠️ Troubleshooting

### Issue: Scheduler not running
```bash
# Check logs for startup messages
make logs | grep scheduler

# Verify NODE_ENV
docker-compose exec app env | grep NODE_ENV
```

### Issue: Database connection errors
```bash
# Check database container
docker-compose ps db

# Test database connection
docker-compose exec app npx prisma db pull
```

### Issue: Payment processing failures
```bash
# Check Iyzico credentials
docker-compose exec app env | grep IYZICO

# Review payment service logs
make logs | grep payment
```

### Issue: Cron jobs not triggering
```bash
# Check server timezone
docker-compose exec app date

# Verify cron expressions
curl -X GET http://localhost:3001/api/v1/testing/scheduler/status
```

## 🎯 Success Criteria

Your testing is successful when:

- [x] Scheduler starts in development mode
- [x] Test subscription created with 2-minute expiry
- [x] Renewal check runs every minute (visible in logs)
- [x] Subscription automatically renewed when expired
- [x] Payment processed using stored payment method
- [x] Subscription period extended correctly
- [x] No errors or warnings in logs
- [x] Database state consistent

You now have a fully functional auto-renewal system that processes subscriptions every minute in development mode for easy testing! 🎉