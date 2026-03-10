import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSubscriptionPlans() {
  console.log('🎯 Seeding subscription plans...');

  // Clear all existing subscription plans first
  console.log('🧹 Clearing existing subscription plans...');

  // First delete business subscriptions that reference the plans
  console.log('   Deleting business subscriptions...');
  await prisma.businessSubscription.deleteMany({});
  console.log('   ✅ Cleared business subscriptions');

  // Then delete the subscription plans
  console.log('   Deleting subscription plans...');
  await prisma.subscriptionPlan.deleteMany({});
  console.log('✅ Cleared all existing subscription plans');

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
        mobileAppAccess: true,
        integrations: ['whatsapp', 'calendar', 'google'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 1000,
        pricingTier: 'TIER_1',
        trialDays: 7,
        description: [
          'Up to 1 staff member',
          '1,000 SMS per month',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Basic reporting & analytics',
          'WhatsApp integration',
          'Google Calendar sync',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Basic customer segmentation',
          'Appointment reminders',
          'Business hours management',
          'Revenue analytics',
          'Customer feedback system'
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
        customBranding: false,
        advancedReports: true,
        apiAccess: false,
        multiLocation: false,
        prioritySupport: true,
        mobileAppAccess: true,
        integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 1500,
        pricingTier: 'TIER_1',
        description: [
          'Up to 5 staff members',
          '1,500 SMS per month',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Advanced reporting & analytics',
          'WhatsApp integration',
          'Google Calendar & Outlook integration',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Advanced customer segmentation',
          'Appointment reminders',
          'Business hours management',
          'Revenue analytics',
          'Customer feedback system',
          'Customer loyalty programs',
          'Advanced appointment scheduling',
          'Staff performance tracking',
          'Advanced notification settings'
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
        mobileAppAccess: true,
        integrations: ['whatsapp', 'calendar', 'google'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 1000,
        pricingTier: 'TIER_2',
        trialDays: 7,
        description: [
          'Up to 1 staff member',
          '1,000 SMS per month',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Basic reporting & analytics',
          'WhatsApp integration',
          'Google Calendar sync',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Basic customer segmentation',
          'Appointment reminders',
          'Business hours management',
          'Revenue analytics',
          'Customer feedback system'
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
        customBranding: false,
        advancedReports: true,
        apiAccess: false,
        multiLocation: false,
        prioritySupport: true,
        mobileAppAccess: true,
        integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 1500,
        pricingTier: 'TIER_2',
        description: [
          'Up to 5 staff members',
          '1,500 SMS per month',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Advanced reporting & analytics',
          'WhatsApp integration',
          'Google Calendar & Outlook integration',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Advanced customer segmentation',
          'Appointment reminders',
          'Business hours management',
          'Revenue analytics',
          'Customer feedback system',
          'Customer loyalty programs',
          'Advanced appointment scheduling',
          'Staff performance tracking',
          'Advanced notification settings'
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
        mobileAppAccess: true,
        integrations: ['whatsapp', 'calendar', 'google'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 1000,
        pricingTier: 'TIER_3',
        trialDays: 7,
        description: [
          'Up to 1 staff member',
          '1,000 SMS per month',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Basic reporting & analytics',
          'WhatsApp integration',
          'Google Calendar sync',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Basic customer segmentation',
          'Appointment reminders',
          'Business hours management',
          'Revenue analytics',
          'Customer feedback system'
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
        customBranding: false,
        advancedReports: true,
        apiAccess: false,
        multiLocation: false,
        prioritySupport: true,
        mobileAppAccess: true,
        integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 1500,
        pricingTier: 'TIER_3',
        description: [
          'Up to 5 staff members',
          '1,500 SMS per month',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Advanced reporting & analytics',
          'WhatsApp integration',
          'Google Calendar & Outlook integration',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Advanced customer segmentation',
          'Appointment reminders',
          'Business hours management',
          'Revenue analytics',
          'Customer feedback system',
          'Customer loyalty programs',
          'Advanced appointment scheduling',
          'Staff performance tracking',
          'Advanced notification settings'
        ]
      },
      isActive: true,
      isPopular: false,
      sortOrder: 6
    },
    {
      id: 'plan_pro',
      name: 'pro',
      displayName: 'Pro Plan',
      description: 'Enterprise features for scaling businesses',
      price: 2999.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      maxBusinesses: 1,
      maxStaffPerBusiness: 999,
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
        multiLocation: true,
        prioritySupport: true,
        mobileAppAccess: true,
        integrations: ['calendar', 'whatsapp', 'google', 'outlook', 'analytics', 'custom'],
        maxServices: 0, // Unlimited
        maxCustomers: 0, // Unlimited
        smsQuota: 0, // Unlimited
        pricingTier: 'PRO',
        description: [
          'Unlimited staff',
          'Unlimited SMS',
          'Unlimited customers',
          'Email & SMS notifications',
          'Mobile app access',
          'Advanced reports',
          'WhatsApp integration',
          'Google Calendar & Outlook integration',
          'Unlimited appointments',
          'Customer management',
          'Service management',
          'Advanced customer segmentation',
          'API access',
          'Dedicated account manager',
          'Custom integrations',
          'Priority support',
          'Custom reporting',
          'Custom branding',
          'Multi-location support'
        ]
      },
      isActive: true,
      isPopular: false,
      sortOrder: 7
    }
  ];

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.create({
      data: plan
    });

    console.log(`✅ Created subscription plan: ${plan.displayName} - ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
  }
}

async function seedTestBusiness() {
  console.log('🏢 Creating test business for subscription demo...');

  // Check if test business already exists
  const existingBusiness = await prisma.business.findFirst({
    where: { slug: 'test-subscription-business' }
  });

  if (existingBusiness) {
    console.log('ℹ️ Test business already exists');
    return existingBusiness;
  }

  // Create test user (business owner)
  const testUser = await prisma.user.upsert({
    where: { phoneNumber: '+905550001234' },
    update: {},
    create: {
      id: 'user_sub_test_owner',
      phoneNumber: '+905550001234',
      firstName: 'Test',
      lastName: 'Business Owner',
      isVerified: true,
      isActive: true,
      updatedAt: new Date(),
      timezone: 'Europe/Istanbul',
      language: 'tr'
    }
  });

  // Get or create business type
  const businessType = await prisma.businessType.upsert({
    where: { name: 'beauty_salon' },
    update: {},
    create: {
      id: 'bt_beauty_salon',
      name: 'beauty_salon',
      displayName: 'Beauty Salon',
      category: 'Beauty & Wellness',
      description: 'Beauty and wellness services',
      isActive: true
    }
  });

  // Create test business
  const testBusiness = await prisma.business.create({
    data: {
      id: 'biz_sub_test_001',
      ownerId: testUser.id,
      businessTypeId: businessType.id,
      name: 'Test Subscription Business',
      slug: 'test-subscription-business',
      description: 'Test business for subscription payment integration',
      email: 'test@subscriptionbusiness.com',
      phone: '+905550001234',
      address: 'Test Address, Istanbul',
      city: 'Istanbul',
      country: 'Turkey',
      timezone: 'Europe/Istanbul',
      isActive: true,
      isVerified: true,
      verifiedAt: new Date()
    }
  });

  console.log('✅ Created test business:', testBusiness.name);
  return testBusiness;
}

async function seedTestSubscriptions() {
  console.log('💳 Creating test subscriptions with payment integration...');

  const testBusiness = await seedTestBusiness();

  // Check if subscription already exists
  const existingSubscription = await prisma.businessSubscription.findUnique({
    where: { businessId: testBusiness.id }
  });

  if (existingSubscription) {
    console.log('ℹ️ Test subscription already exists');
    return;
  }

  // Get the professional plan for demo
  const professionalPlan = await prisma.subscriptionPlan.findUnique({
    where: { name: 'professional' }
  });

  if (!professionalPlan) {
    console.error('❌ Professional plan not found');
    return;
  }

  // Create a trial subscription
  const currentDate = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(currentDate.getDate() + 14); // 14-day trial

  const subscription = await prisma.businessSubscription.create({
    data: {
      id: 'sub_test_professional',
      businessId: testBusiness.id,
      planId: professionalPlan.id,
      status: 'TRIAL',
      currentPeriodStart: currentDate,
      currentPeriodEnd: trialEnd,
      trialStart: currentDate,
      trialEnd: trialEnd,
      cancelAtPeriodEnd: false,
      metadata: {
        source: 'seed_data',
        createdFor: 'testing_payments',
        trialDays: 14
      }
    }
  });

  console.log('✅ Created trial subscription for test business');
  console.log(`   Plan: ${professionalPlan.displayName}`);
  console.log(`   Trial Period: ${currentDate.toISOString().split('T')[0]} to ${trialEnd.toISOString().split('T')[0]}`);

  // Create a sample successful payment record
  const samplePayment = await prisma.payment.create({
    data: {
      id: 'pay_sample_sub_001',
      businessSubscriptionId: subscription.id,
      amount: professionalPlan.price,
      currency: professionalPlan.currency,
      status: 'SUCCEEDED',
      paymentMethod: 'card',
      paymentProvider: 'iyzico',
      providerPaymentId: 'sample_iyzico_payment_123',
      paidAt: currentDate,
      metadata: {
        type: 'subscription_payment',
        source: 'seed_data',
        plan: {
          id: professionalPlan.id,
          name: professionalPlan.name,
          displayName: professionalPlan.displayName,
          amount: professionalPlan.price
        },
        testCard: {
          cardType: 'MASTER_CARD',
          cardAssociation: 'MASTER_CARD',
          cardFamily: 'Bonus',
          lastFourDigits: '0008',
          binNumber: '552879'
        }
      }
    }
  });

  console.log('✅ Created sample payment record');
}

async function displaySubscriptionSummary() {
  console.log('\n📊 SUBSCRIPTION PLANS SUMMARY');
  console.log('========================================');

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  plans.forEach(plan => {
    const features = plan.features as any;
    console.log(`\n🎯 ${plan.displayName} (${plan.name})`);
    console.log(`   💰 Price: ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
    console.log(`   👥 Staff: ${plan.maxStaffPerBusiness} members`);
    console.log(`   📅 Appointments: ${plan.maxAppointmentsPerDay}/day`);
    console.log(`   ⭐ Popular: ${plan.isPopular ? 'Yes' : 'No'}`);

    if (features.description) {
      console.log(`   📋 Features:`);
      features.description.forEach((feature: string, index: number) => {
        console.log(`      ${index + 1}. ${feature}`);
      });
    }
  });

  // Show integration info
  console.log('\n🔗 PAYMENT INTEGRATION');
  console.log('========================================');
  console.log('✅ Iyzico Payment Gateway Integrated');
  console.log('✅ Subscription Payment Flow Ready');
  console.log('✅ Trial Period Support');
  console.log('✅ Payment Status Tracking');
  console.log('✅ Refund & Cancellation Support');

  // Successful Test Cards:

  // Card Number: 5528790000000008
  // Expiry: 12/30yi
  // CVC: 123
  // Cardholder: Test User

  // Card Number: 4766620000000001
  // Expiry: 12/30
  // CVC: 123
  // Cardholder: Test User

  // Card Number: 4603450000000000
  // Expiry: 12/30
  // CVC: 123
  // Cardholder: Test User

  // Failed Payment Test Cards:

  // Card Number: 5406670000000009 (Insufficient funds)
  // Card Number: 4111111111111129 (Invalid card)

  // Show usage example
  console.log('\n💡 USAGE EXAMPLE');
  console.log('========================================');
  console.log('POST /api/v1/businesses/{businessId}/payments');
  console.log(`{
  "planName": "professional",
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
    "country": "Turkey"
  }
}`);
}

export default async function main() {
  try {
    await seedSubscriptionPlans();
    await seedTestSubscriptions();
    await displaySubscriptionSummary();

    console.log('\n🎉 Subscription plans seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}