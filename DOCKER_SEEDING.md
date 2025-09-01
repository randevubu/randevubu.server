# 🐳 Docker Seeding Guide

This guide explains how to seed your database with sample data using Docker.

## 🚀 Quick Start

```bash
# Complete setup and seeding
make db-seed

# Or seed individual components
make db-seed-rbac        # Roles and permissions
make db-seed-business    # Business types, plans, and sample businesses with services
make db-seed-customers   # Customers and appointments
```

## 📋 Available Commands

| Command | Description | Creates |
|---------|-------------|---------|
| `make db-seed` | Complete seeding (all components) | Everything below |
| `make db-seed-rbac` | RBAC system | 4 roles, 61 permissions, role assignments |
| `make db-seed-business` | Business infrastructure | 19 business types, 7 plans, 4 businesses with 19 services |
| `make db-seed-customers` | Customer data | 10 customers, 50 appointments, payments, user behavior |
| `make db-reset` | Reset and reseed everything | Drops all data and recreates |

## 🗂️ What Gets Created

### 👥 Customers (10)
- Turkish customer names with realistic phone numbers
- User behavior tracking (appointments, cancellations, no-shows)
- CUSTOMER role assignments

### 📅 Appointments (50)
- Various statuses: PENDING, CONFIRMED, COMPLETED, CANCELED, NO_SHOW, IN_PROGRESS
- Realistic scenarios with customer and internal notes
- Payment records for completed appointments
- Reminder tracking

### 🏢 Businesses (4)
**Elite Hair Salon** - Hair services
- Women's Haircut (60 min, ₺150)
- Men's Haircut (45 min, ₺100)
- Hair Coloring (120 min, ₺300)
- Hair Treatment (90 min, ₺200)
- Blowdry (30 min, ₺80)

**Modern Barber Shop** - Men's grooming
- Classic Haircut (30 min, ₺75)
- Beard Trim (20 min, ₺50)
- Hot Towel Shave (45 min, ₺100)
- Hair & Beard Combo (50 min, ₺120)

**Wellness Spa Center** - Spa treatments
- Swedish Massage (60 min, ₺250)
- Deep Tissue Massage (90 min, ₺350)
- Facial Treatment (75 min, ₺200)
- Body Scrub (45 min, ₺180)
- Couples Massage (60 min, ₺450)

**Dental Care Clinic** - Dental services
- General Checkup (30 min, ₺150)
- Dental Cleaning (45 min, ₺200)
- Tooth Filling (60 min, ₺300)
- Teeth Whitening (90 min, ₺800)
- Root Canal (120 min, ₺1200)

### 🎭 RBAC System
- **ADMIN**: Full platform access
- **OWNER**: Business management
- **STAFF**: Basic operations
- **CUSTOMER**: Booking and profile

## 🔑 Test Login Credentials

You can test the system using these business owner accounts:

| Phone | Owner | Business | Type |
|-------|-------|----------|------|
| `+905551234567` | Ayşe Yılmaz | Elite Hair Salon | Hair Salon |
| `+905552345678` | Mehmet Demir | Modern Barber Shop | Barber Shop |
| `+905553456789` | Zeynep Kaya | Wellness Spa Center | Spa |
| `+905554567890` | Dr. Ahmet Özkan | Dental Care Clinic | Dental |

**Note**: You'll need to send verification codes to these numbers during login.

## 🔄 Dependencies & Order

Seeding must happen in this order due to foreign key relationships:

1. **RBAC** → Creates roles and permissions
2. **Business** → Creates business types, plans, businesses, and services
3. **Customers** → Creates customers and appointments (requires businesses with services)

## 🛠️ Troubleshooting

### "No businesses with services found"
```bash
# Run business seeding first
make db-seed-business
```

### "Role not found" 
```bash
# Run RBAC seeding first
make db-seed-rbac
```

### Complete Reset
```bash
# Nuclear option - resets everything
make db-reset
```

### Check Database Content
```bash
# Open Prisma Studio to browse data
make db-studio
```

## 📊 Seeding Results

After successful seeding, you should have:
- ✅ 14 total users (4 business owners + 10 customers)
- ✅ 4 businesses with 19 total services
- ✅ 50+ appointments with various statuses
- ✅ Payment records for completed appointments
- ✅ User behavior tracking for all customers
- ✅ Complete RBAC system with proper role assignments

## 🚀 Next Steps

After seeding:
1. **Start the app**: `make dev`
2. **View API docs**: http://localhost:3001/api-docs
3. **Browse database**: `make db-studio`
4. **Test authentication**: Use the phone numbers above
5. **Create appointments**: Test the booking system

Your randevubu.server is now ready for development and testing! 🎉
