#!/usr/bin/env ts-node

/**
 * Production-Safe Subscription Plans Seeding Script
 * 
 * This script safely creates or updates subscription plans in production.
 * It uses upsert logic to avoid deleting existing data and can be run multiple times safely.
 * 
 * Compatible with:
 * - Neon DB (serverless PostgreSQL) - uses standard PostgreSQL connection
 * - Docker environments
 * - Local development
 * 
 * Usage:
 *   Local:
 *     npm run db:seed-subscription-plans:production
 *     or
 *     ts-node scripts/seed-subscription-plans-production.ts
 * 
 *   Docker (Production):
 *     npm run docker:seed-subscription-plans:production
 *     or
 *     docker-compose -f docker-compose.production.yml exec app1 npx ts-node scripts/seed-subscription-plans-production.ts
 * 
 *   Docker (Development):
 *     docker-compose -f docker-compose.dev.yml exec app npx ts-node scripts/seed-subscription-plans-production.ts
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string (Neon DB format supported)
 *     Example: postgresql://user:password@host.neon.tech/dbname?sslmode=require
 * 
 * Features:
 * - Uses upsert (create or update) instead of delete
 * - Preserves existing business subscriptions
 * - Idempotent (safe to run multiple times)
 * - Detailed logging
 * - Error handling
 * - Neon DB compatible (standard PostgreSQL protocol)
 */

// Load environment variables from .env file (for local development)
import { config } from 'dotenv';

// Try to load .env.production first, then .env
config({ path: '.env.production' });
config({ path: '.env' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const subscriptionPlans = [
  {
    id: 'plan_basic_tier1',
    name: 'basic_tier1',
    displayName: 'Basic Plan - Tier 1',
    description: 'Perfect for small businesses in major cities',
    price: 949.00,
    currency: 'TRY',
    billingInterval: 'MONTHLY',
    maxBusinesses: 1,
    maxStaffPerBusiness: 1,
    maxAppointmentsPerDay: 0, // Unlimited
    features: {
      appointmentBooking: true,
      staffManagement: true,
      basicReports: true,
      emailNotifications: true,
      smsNotifications: true,
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      multiLocation: false,
      prioritySupport: false,
      integrations: ['whatsapp', 'calendar', 'google'],
      maxServices: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      smsQuota: 1000,
      pricingTier: 'TIER_1',
      trialDays: 7,
      description: [
        'Online appointment booking system',
        'Up to 1 staff member',
        'Unlimited customers',
        'Email & SMS notifications',
        '1,000 SMS per month',
        'Basic reporting & analytics',
        'WhatsApp integration',
        'Google Calendar sync',
        'Unlimited appointments',
        'Email support',
        'Mobile app access',
        'Customer management',
        'Service management',
        'Basic customer segmentation',
        'Appointment reminders',
        'Business hours management'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1
  },
  {
    id: 'plan_premium_tier1',
    name: 'premium_tier1',
    displayName: 'Premium Plan - Tier 1',
    description: 'Advanced features for growing businesses in major cities',
    price: 1499.00,
    currency: 'TRY',
    billingInterval: 'MONTHLY',
    maxBusinesses: 1,
    maxStaffPerBusiness: 5,
    maxAppointmentsPerDay: 0, // Unlimited
    features: {
      appointmentBooking: true,
      staffManagement: true,
      basicReports: true,
      emailNotifications: true,
      smsNotifications: true,
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      multiLocation: false,
      prioritySupport: true,
      integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics'],
      maxServices: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      smsQuota: 1500,
      pricingTier: 'TIER_1',
      description: [
        'All Basic features',
        'Up to 5 staff members',
        'Unlimited customers',
        '1,500 SMS per month',
        'Advanced reporting & analytics',
        'Custom branding & themes',
        'Google Calendar & Outlook integration',
        'Priority email & phone support',
        'Unlimited appointments',
        'API access',
        'Advanced customer segmentation',
        'Automated marketing campaigns',
        'Customer loyalty programs',
        'Advanced appointment scheduling',
        'Staff performance tracking',
        'Revenue analytics',
        'Customer feedback system',
        'Advanced notification settings',
        'Custom business rules'
      ]
    },
    isActive: true,
    isPopular: true,
    sortOrder: 2
  },
  {
    id: 'plan_basic_tier2',
    name: 'basic_tier2',
    displayName: 'Basic Plan - Tier 2',
    description: 'Perfect for small businesses in regional centers',
    price: 799.00,
    currency: 'TRY',
    billingInterval: 'MONTHLY',
    maxBusinesses: 1,
    maxStaffPerBusiness: 1,
    maxAppointmentsPerDay: 0, // Unlimited
    features: {
      appointmentBooking: true,
      staffManagement: true,
      basicReports: true,
      emailNotifications: true,
      smsNotifications: true,
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      multiLocation: false,
      prioritySupport: false,
      integrations: ['whatsapp', 'calendar', 'google'],
      maxServices: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      smsQuota: 1000,
      pricingTier: 'TIER_2',
      trialDays: 7,
      description: [
        'Online appointment booking system',
        'Up to 1 staff member',
        'Unlimited customers',
        'Email & SMS notifications',
        '1,000 SMS per month',
        'Basic reporting & analytics',
        'WhatsApp integration',
        'Google Calendar sync',
        'Unlimited appointments',
        'Email support',
        'Mobile app access',
        'Customer management',
        'Service management',
        'Basic customer segmentation',
        'Appointment reminders',
        'Business hours management'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 3
  },
  {
    id: 'plan_premium_tier2',
    name: 'premium_tier2',
    displayName: 'Premium Plan - Tier 2',
    description: 'Advanced features for growing businesses in regional centers',
    price: 1299.00,
    currency: 'TRY',
    billingInterval: 'MONTHLY',
    maxBusinesses: 1,
    maxStaffPerBusiness: 5,
    maxAppointmentsPerDay: 0, // Unlimited
    features: {
      appointmentBooking: true,
      staffManagement: true,
      basicReports: true,
      emailNotifications: true,
      smsNotifications: true,
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      multiLocation: false,
      prioritySupport: true,
      integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics'],
      maxServices: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      smsQuota: 1500,
      pricingTier: 'TIER_2',
      description: [
        'All Basic features',
        'Up to 5 staff members',
        'Unlimited customers',
        '1,500 SMS per month',
        'Advanced reporting & analytics',
        'Custom branding & themes',
        'Google Calendar & Outlook integration',
        'Priority email & phone support',
        'Unlimited appointments',
        'API access',
        'Advanced customer segmentation',
        'Automated marketing campaigns',
        'Customer loyalty programs',
        'Advanced appointment scheduling',
        'Staff performance tracking',
        'Revenue analytics',
        'Customer feedback system',
        'Advanced notification settings',
        'Custom business rules'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 4
  },
  {
    id: 'plan_basic_tier3',
    name: 'basic_tier3',
    displayName: 'Basic Plan - Tier 3',
    description: 'Perfect for small businesses in smaller cities',
    price: 749.00,
    currency: 'TRY',
    billingInterval: 'MONTHLY',
    maxBusinesses: 1,
    maxStaffPerBusiness: 1,
    maxAppointmentsPerDay: 0, // Unlimited
    features: {
      appointmentBooking: true,
      staffManagement: true,
      basicReports: true,
      emailNotifications: true,
      smsNotifications: true,
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      multiLocation: false,
      prioritySupport: false,
      integrations: ['whatsapp', 'calendar', 'google'],
      maxServices: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      smsQuota: 1000,
      pricingTier: 'TIER_3',
      trialDays: 7,
      description: [
        'Online appointment booking system',
        'Up to 1 staff member',
        'Unlimited customers',
        'Email & SMS notifications',
        '1,000 SMS per month',
        'Basic reporting & analytics',
        'WhatsApp integration',
        'Google Calendar sync',
        'Unlimited appointments',
        'Email support',
        'Mobile app access',
        'Customer management',
        'Service management',
        'Basic customer segmentation',
        'Appointment reminders',
        'Business hours management'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 5
  },
  {
    id: 'plan_premium_tier3',
    name: 'premium_tier3',
    displayName: 'Premium Plan - Tier 3',
    description: 'Advanced features for growing businesses in smaller cities',
    price: 1199.00,
    currency: 'TRY',
    billingInterval: 'MONTHLY',
    maxBusinesses: 1,
    maxStaffPerBusiness: 5,
    maxAppointmentsPerDay: 0, // Unlimited
    features: {
      appointmentBooking: true,
      staffManagement: true,
      basicReports: true,
      emailNotifications: true,
      smsNotifications: true,
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      multiLocation: false,
      prioritySupport: true,
      integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics'],
      maxServices: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      smsQuota: 1500,
      pricingTier: 'TIER_3',
      description: [
        'All Basic features',
        'Up to 5 staff members',
        'Unlimited customers',
        '1,500 SMS per month',
        'Advanced reporting & analytics',
        'Custom branding & themes',
        'Google Calendar & Outlook integration',
        'Priority email & phone support',
        'Unlimited appointments',
        'API access',
        'Advanced customer segmentation',
        'Automated marketing campaigns',
        'Customer loyalty programs',
        'Advanced appointment scheduling',
        'Staff performance tracking',
        'Revenue analytics',
        'Customer feedback system',
        'Advanced notification settings',
        'Custom business rules'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 6
  }
];

async function seedSubscriptionPlansProduction() {
  console.log('🎯 Seeding subscription plans for production...\n');

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const plan of subscriptionPlans) {
    try {
      // Check if plan exists
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: plan.name }
      });

      if (existingPlan) {
        // Update existing plan
        await prisma.subscriptionPlan.update({
          where: { name: plan.name },
          data: {
            displayName: plan.displayName,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            maxBusinesses: plan.maxBusinesses,
            maxStaffPerBusiness: plan.maxStaffPerBusiness,
            maxAppointmentsPerDay: plan.maxAppointmentsPerDay,
            features: plan.features,
            isActive: plan.isActive,
            isPopular: plan.isPopular,
            sortOrder: plan.sortOrder,
            updatedAt: new Date()
          }
        });
        updatedCount++;
        console.log(`🔄 Updated: ${plan.displayName} - ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
      } else {
        // Create new plan
        await prisma.subscriptionPlan.create({
          data: plan
        });
        createdCount++;
        console.log(`✅ Created: ${plan.displayName} - ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`❌ Error processing plan ${plan.name}:`, error);
      skippedCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${createdCount} plans`);
  console.log(`   🔄 Updated: ${updatedCount} plans`);
  if (skippedCount > 0) {
    console.log(`   ⚠️  Skipped: ${skippedCount} plans (errors)`);
  }
}

async function displaySubscriptionSummary() {
  console.log('\n📊 SUBSCRIPTION PLANS SUMMARY');
  console.log('========================================\n');

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  if (plans.length === 0) {
    console.log('⚠️  No subscription plans found in database.');
    return;
  }

  plans.forEach(plan => {
    const features = plan.features as any;
    const tier = features?.pricingTier || 'N/A';
    console.log(`🎯 ${plan.displayName} (${plan.name})`);
    console.log(`   💰 Price: ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
    console.log(`   📍 Tier: ${tier}`);
    console.log(`   👥 Staff: ${plan.maxStaffPerBusiness} members`);
    console.log(`   📅 Appointments: ${plan.maxAppointmentsPerDay === 0 ? 'Unlimited' : plan.maxAppointmentsPerDay}/day`);
    console.log(`   ⭐ Popular: ${plan.isPopular ? 'Yes' : 'No'}`);
    console.log(`   ✅ Active: ${plan.isActive ? 'Yes' : 'No'}`);
    console.log('');
  });

  // Count active subscriptions
  const activeSubscriptionsCount = await prisma.businessSubscription.count({
    where: {
      status: {
        in: ['ACTIVE', 'TRIAL']
      }
    }
  });

  console.log(`📈 Active Business Subscriptions: ${activeSubscriptionsCount}`);
  console.log('========================================\n');
}

async function main() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set!');
      console.error('   Please set DATABASE_URL in your .env file or environment variables.');
      console.error('   For Neon DB: postgresql://user:password@host.neon.tech/dbname?sslmode=require');
      process.exit(1);
    }

    // Display connection info (masked)
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
    console.log('🔗 Connecting to database...');
    console.log(`   ${maskedUrl}\n`);

    // Verify database connection with retry logic
    let connected = false;
    let retries = 3;
    let lastError: Error | null = null;

    while (!connected && retries > 0) {
      try {
        await prisma.$connect();
        connected = true;
        console.log('✅ Database connection established\n');
      } catch (error: any) {
        lastError = error;
        retries--;
        
        if (retries > 0) {
          console.log(`⚠️  Connection failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
      }
    }

    if (!connected) {
      console.error('\n❌ Failed to connect to database after retries\n');
      console.error('🔍 Troubleshooting Tips for Neon DB:');
      console.error('   1. Check if your database is paused in Neon dashboard');
      console.error('      → Go to Neon dashboard and wake up/resume the database');
      console.error('');
      console.error('   2. Verify IP allowlisting (if enabled)');
      console.error('      → Check Neon dashboard → Settings → IP Allowlist');
      console.error('      → Add your current IP address or allow all IPs (0.0.0.0/0)');
      console.error('');
      console.error('   3. Try using direct connection instead of pooler');
      console.error('      → In Neon dashboard, get the "Direct connection" string');
      console.error('      → Replace "-pooler" with direct endpoint in your DATABASE_URL');
      console.error('');
      console.error('   4. Verify SSL is enabled');
      console.error('      → Ensure your connection string includes: ?sslmode=require');
      console.error('');
      console.error('   5. Try running from Docker container instead:');
      console.error('      → npm run docker:seed-subscription-plans:production');
      console.error('');
      console.error('   6. Check network/firewall settings');
      console.error('      → Ensure port 5432 is not blocked');
      console.error('');
      
      if (lastError) {
        console.error('   Original error:', lastError.message);
      }
      
      process.exit(1);
    }

    // Seed subscription plans
    await seedSubscriptionPlansProduction();

    // Display summary
    await displaySubscriptionSummary();

    console.log('🎉 Subscription plans seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding subscription plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default main;

