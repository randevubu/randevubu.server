# Docker Discount Code Seeding Guide

This guide explains how to seed discount codes in a Docker environment.

## 🐳 Docker Setup Options

### **Option 1: Using Existing Docker Compose (Recommended)**

If you already have your application running with Docker Compose:

```bash
# Run discount seeding in existing container
docker-compose exec app npx ts-node scripts/seed-comprehensive-discount-codes.ts
```

### **Option 2: Using Dedicated Seeding Service**

Use the standalone discount seeding Docker Compose:

```bash
# Run the dedicated discount seeding service
docker-compose -f docker-compose.discount-seeding.yml up discount-seeder

# Clean up after seeding
docker-compose -f docker-compose.discount-seeding.yml down
```

### **Option 3: Using Scripts (Cross-Platform)**

#### **Windows (PowerShell/CMD):**
```bash
# Run the Windows batch script
scripts\seed-discounts-docker.bat
```

#### **Linux/macOS:**
```bash
# Run the shell script
./scripts/seed-discounts-docker.sh
```

## 🚀 Quick Start Commands

### **1. Basic Seeding (Existing Container)**
```bash
# If your app is already running
docker-compose exec app npm run db:seed-discounts
```

### **2. Standalone Seeding**
```bash
# Run dedicated seeding service
docker-compose -f docker-compose.discount-seeding.yml up --build discount-seeder
```

### **3. One-liner Seeding**
```bash
# Windows
scripts\seed-discounts-docker.bat

# Linux/macOS
./scripts/seed-discounts-docker.sh
```

## 🔧 Docker Environment Setup

### **Prerequisites**
- Docker and Docker Compose installed
- Your application Docker setup working
- Database accessible from containers

### **Environment Variables**
Make sure these are set in your `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/randevubu?schema=public

# Redis (if used)
REDIS_HOST=redis
REDIS_PORT=6379

# Application
NODE_ENV=development
```

## 📊 What Gets Created

### **15 Comprehensive Discount Codes:**

#### **One-Time Discounts (7 codes):**
- `WELCOME20` - 20% off first payment
- `EARLY50` - 50% off first payment  
- `SAVE100` - 100 TL off first payment
- `FLASH60` - 60% off first payment
- `HOLIDAY40` - 40% off first payment
- `REFER15` - 15% off first payment
- `TRIAL50` - 50 TL off first payment

#### **Recurring Discounts (5 codes):**
- `LOYAL35` - 35% off for 3 payments
- `UPGRADE25` - 25% off for 2 payments
- `STUDENT50` - 50% off for 6 payments
- `VIP30` - 30% off for 4 payments
- `ANNUAL20` - 20% off for 12 payments

#### **Test/Edge Case Codes (3 codes):**
- `EXPIRED10` - Expired discount (Testing)
- `LIMITED5` - Usage limit reached (Testing)
- `MINIMUM25` - High minimum purchase (Testing)

## 🧪 Testing in Docker

### **Test Trial Subscription with Discount**
```bash
# Test with one-time discount
curl -X POST http://localhost:3001/api/v1/subscriptions/business/biz_123/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "planId": "plan_basic_tier1",
    "discountCode": "WELCOME20",
    "card": {...},
    "buyer": {...}
  }'
```

### **Test Recurring Discount**
```bash
# Test with recurring discount
curl -X POST http://localhost:3001/api/v1/subscriptions/business/biz_123/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "planId": "plan_premium_tier1",
    "discountCode": "LOYAL35",
    "card": {...},
    "buyer": {...}
  }'
```

### **Test Late Discount Application**
```bash
# Apply discount to existing subscription
curl -X POST http://localhost:3001/api/v1/subscriptions/business/biz_123/apply-discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "discountCode": "UPGRADE25"
  }'
```

## 🔍 Verification Commands

### **Check if Seeding Worked**
```bash
# Connect to database and verify
docker-compose exec postgres psql -U postgres -d randevubu -c "SELECT COUNT(*) FROM discount_codes;"

# Check active codes
docker-compose exec postgres psql -U postgres -d randevubu -c "SELECT code, name, is_active FROM discount_codes WHERE is_active = true;"

# Check recurring codes
docker-compose exec postgres psql -U postgres -d randevubu -c "SELECT code, name FROM discount_codes WHERE metadata->>'isRecurring' = 'true';"
```

### **View Sample Usage Records**
```bash
# Check usage records
docker-compose exec postgres psql -U postgres -d randevubu -c "SELECT * FROM discount_code_usages LIMIT 5;"
```

## 🐛 Troubleshooting

### **Common Issues:**

#### **1. Container Not Found**
```bash
# Check running containers
docker ps

# Check if app container is running
docker-compose ps
```

#### **2. Database Connection Issues**
```bash
# Check database health
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres
```

#### **3. Permission Issues**
```bash
# Make scripts executable (Linux/macOS)
chmod +x scripts/seed-discounts-docker.sh

# Run with proper permissions
docker-compose exec app sh -c "npx ts-node scripts/seed-comprehensive-discount-codes.ts"
```

#### **4. Dependencies Missing**
```bash
# Install dependencies in container
docker-compose exec app npm install

# Generate Prisma client
docker-compose exec app npx prisma generate
```

### **Debug Mode:**
```bash
# Run with verbose output
docker-compose exec app npx ts-node scripts/seed-comprehensive-discount-codes.ts --verbose

# Check container logs
docker-compose logs app
```

## 📝 Docker Compose Files

### **Main Application (docker-compose.dev.yml)**
- Runs your main application
- Includes database and Redis
- Hot reload enabled

### **Discount Seeding (docker-compose.discount-seeding.yml)**
- Standalone seeding service
- Runs once and exits
- Uses separate ports to avoid conflicts

## 🎯 Success Indicators

You'll know the seeding was successful when you see:

```bash
✅ Created discount code: WELCOME20 (New Customer Welcome)
✅ Created discount code: EARLY50 (Early Bird Special)
✅ Created discount code: SAVE100 (Save 100 TL)
# ... (15 total codes)

🎫 Comprehensive discount codes seeded successfully!
   Total codes: 15
   Active codes: 12
   Sample usages: 1

🎉 All discount codes have been created and are ready for use.
```

## 🚀 Next Steps

After successful seeding:

1. **Test the discount system** with the provided codes
2. **Verify API endpoints** are working
3. **Test all discount scenarios** (trial, renewal, late application)
4. **Check payment processing** with discounts applied
5. **Validate recurring discounts** work correctly

## 📞 Support

If you encounter issues:

1. **Check container logs**: `docker-compose logs app`
2. **Verify database connection**: `docker-compose exec postgres pg_isready`
3. **Check environment variables**: Ensure `.env` file is correct
4. **Verify dependencies**: Run `docker-compose exec app npm install`
5. **Check Prisma**: Run `docker-compose exec app npx prisma generate`

**The discount system is now ready for comprehensive testing in your Docker environment!** 🎉



