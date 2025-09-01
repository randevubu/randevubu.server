import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  console.log('🎯 Seeding subscription plans...');

  const subscriptionPlans = [
    {
      id: 'plan_starter_monthly',
      name: 'starter',
      displayName: 'Starter Plan',
      description: 'Perfect for small businesses just getting started',
      price: 750.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      maxBusinesses: 1,
      maxStaffPerBusiness: 3,
      maxAppointmentsPerDay: 50,
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
        integrations: ['whatsapp'],
        maxServices: 15,
        maxCustomers: 1000,
        storageGB: 2,
        smsQuota: 1000,
        description: [
          'Online appointment booking system',
          'Up to 3 staff members',
          'Customer management (up to 1,000)',
          'Email & SMS notifications',
          '1,000 SMS per month',
          'Basic reporting & analytics',
          'WhatsApp integration',
          '50 appointments per day',
          '2 GB storage',
          'Email support'
        ]
      },
      isActive: true,
      isPopular: false,
      sortOrder: 1
    },
    {
      id: 'plan_professional_monthly',
      name: 'professional',
      displayName: 'Professional Plan',
      description: 'Ideal for growing businesses with advanced needs',
      price: 1250.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      maxBusinesses: 1,
      maxStaffPerBusiness: 10,
      maxAppointmentsPerDay: 150,
      features: {
        appointmentBooking: true,
        staffManagement: true,
        basicReports: true,
        emailNotifications: true,
        smsNotifications: true,
        customBranding: true,
        advancedReports: true,
        apiAccess: false,
        multiLocation: false,
        prioritySupport: true,
        integrations: ['calendar', 'whatsapp', 'google'],
        maxServices: 50,
        maxCustomers: 5000,
        storageGB: 10,
        smsQuota: 2500,
        description: [
          'All Starter features',
          'Up to 10 staff members',
          'Customer management (up to 5,000)',
          '2,500 SMS per month',
          'Advanced reporting & analytics',
          'Custom branding & themes',
          'Google Calendar integration',
          'Online payment processing',
          'Priority email & phone support',
          '150 appointments per day',
          '10 GB storage'
        ]
      },
      isActive: true,
      isPopular: true,
      sortOrder: 2
    },
    {
      id: 'plan_enterprise_monthly',
      name: 'enterprise',
      displayName: 'Enterprise Plan',
      description: 'Complete solution for large businesses and chains',
      price: 2000.00,
      currency: 'TRY',
      billingInterval: 'MONTHLY',
      maxBusinesses: 5,
      maxStaffPerBusiness: 50,
      maxAppointmentsPerDay: 500,
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
        integrations: ['calendar', 'whatsapp', 'pos', 'crm', 'google', 'outlook'],
        maxServices: 200,
        maxCustomers: 25000,
        storageGB: 50,
        smsQuota: 5000,
        description: [
          'All Professional features',
          'Up to 5 business locations',
          'Up to 50 staff members per location',
          'Customer management (up to 25,000)',
          '5,000 SMS per month',
          'Full API access',
          'Multi-location management',
          'POS system integration',
          'CRM integration',
          'Advanced analytics & reporting',
          'Custom integrations',
          'Dedicated account manager',
          '500 appointments per day',
          '50 GB storage'
        ]
      },
      isActive: true,
      isPopular: false,
      sortOrder: 3
    }
  ];

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
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
        sortOrder: plan.sortOrder
      },
      create: plan
    });
    
    console.log(`✅ Created/Updated subscription plan: ${plan.displayName} - ${plan.price} ${plan.currency}/${plan.billingInterval.toLowerCase()}`);
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