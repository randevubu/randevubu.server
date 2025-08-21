import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate ID helper
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Business Types - Enterprise categorization for appointment-based businesses
const DEFAULT_BUSINESS_TYPES = [
  // Beauty & Wellness
  {
    id: generateId('btype'),
    name: 'hair_salon',
    displayName: 'Hair Salon',
    description: 'Professional hair cutting, styling, and coloring services',
    icon: 'scissors',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'barber_shop',
    displayName: 'Barber Shop',
    description: 'Traditional barbering services and grooming',
    icon: 'razor',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'beauty_salon',
    displayName: 'Beauty Salon',
    description: 'Comprehensive beauty treatments and spa services',
    icon: 'makeup',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'nail_salon',
    displayName: 'Nail Salon',
    description: 'Manicure, pedicure, and nail art services',
    icon: 'nail-polish',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'spa_wellness',
    displayName: 'Spa & Wellness',
    description: 'Relaxation, massage, and wellness treatments',
    icon: 'spa',
    category: 'wellness'
  },
  {
    id: generateId('btype'),
    name: 'massage_therapy',
    displayName: 'Massage Therapy',
    description: 'Therapeutic and relaxation massage services',
    icon: 'massage',
    category: 'wellness'
  },

  // Health & Medical
  {
    id: generateId('btype'),
    name: 'dental_clinic',
    displayName: 'Dental Clinic',
    description: 'Dental care and oral health services',
    icon: 'tooth',
    category: 'healthcare'
  },
  {
    id: generateId('btype'),
    name: 'medical_clinic',
    displayName: 'Medical Clinic',
    description: 'General medical consultations and treatments',
    icon: 'medical',
    category: 'healthcare'
  },
  {
    id: generateId('btype'),
    name: 'physiotherapy',
    displayName: 'Physiotherapy',
    description: 'Physical therapy and rehabilitation services',
    icon: 'therapy',
    category: 'healthcare'
  },
  {
    id: generateId('btype'),
    name: 'veterinary',
    displayName: 'Veterinary Clinic',
    description: 'Pet care and veterinary services',
    icon: 'pet',
    category: 'healthcare'
  },

  // Professional Services
  {
    id: generateId('btype'),
    name: 'legal_services',
    displayName: 'Legal Services',
    description: 'Legal consultations and advisory services',
    icon: 'law',
    category: 'professional'
  },
  {
    id: generateId('btype'),
    name: 'financial_advisory',
    displayName: 'Financial Advisory',
    description: 'Financial planning and advisory services',
    icon: 'finance',
    category: 'professional'
  },
  {
    id: generateId('btype'),
    name: 'consulting',
    displayName: 'Consulting',
    description: 'Business and professional consulting services',
    icon: 'consulting',
    category: 'professional'
  },

  // Personal Services
  {
    id: generateId('btype'),
    name: 'personal_training',
    displayName: 'Personal Training',
    description: 'Fitness coaching and personal training sessions',
    icon: 'fitness',
    category: 'fitness'
  },
  {
    id: generateId('btype'),
    name: 'tutoring',
    displayName: 'Tutoring & Education',
    description: 'Educational tutoring and learning services',
    icon: 'education',
    category: 'education'
  },
  {
    id: generateId('btype'),
    name: 'photography',
    displayName: 'Photography',
    description: 'Professional photography sessions',
    icon: 'camera',
    category: 'creative'
  },

  // Automotive
  {
    id: generateId('btype'),
    name: 'auto_repair',
    displayName: 'Auto Repair',
    description: 'Vehicle maintenance and repair services',
    icon: 'car-repair',
    category: 'automotive'
  },
  {
    id: generateId('btype'),
    name: 'car_wash',
    displayName: 'Car Wash',
    description: 'Vehicle cleaning and detailing services',
    icon: 'car-wash',
    category: 'automotive'
  },

  // General
  {
    id: generateId('btype'),
    name: 'other',
    displayName: 'Other Services',
    description: 'Other appointment-based services',
    icon: 'service',
    category: 'general'
  }
];

// Subscription Plans - SaaS pricing tiers following industry best practices
const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    id: generateId('plan'),
    name: 'starter',
    displayName: 'Starter',
    description: 'Perfect for individual professionals and small salons',
    price: 899.00,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: 1,
    maxStaffPerBusiness: 2,
    maxAppointmentsPerDay: 30,
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'basic_analytics',
      'business_hours',
      'staff_management',
      's3_image_storage'
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 1
  },
  {
    id: generateId('plan'),
    name: 'professional',
    displayName: 'Professional',
    description: 'Ideal for growing salons and clinics with multiple staff',
    price: 2399.00,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: 1,
    maxStaffPerBusiness: 10,
    maxAppointmentsPerDay: 150,
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'sms_notifications',
      'advanced_analytics',
      'business_hours',
      'staff_management',
      'service_management',
      'custom_branding',
      'business_closure_management',
      's3_image_storage',
      'user_behavior_tracking'
    ],
    isActive: true,
    isPopular: true,
    sortOrder: 2
  },
  {
    id: generateId('plan'),
    name: 'business',
    displayName: 'Business',
    description: 'Complete solution for established businesses and chains',
    price: 4499.00,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: 3,
    maxStaffPerBusiness: 25,
    maxAppointmentsPerDay: 300,
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'sms_notifications',
      'premium_analytics',
      'business_hours',
      'staff_management',
      'service_management',
      'custom_branding',
      'business_closure_management',
      'multi_location',
      'api_access',
      'priority_support',
      's3_image_storage',
      'user_behavior_tracking',
      'advanced_reporting'
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 3
  },
  {
    id: generateId('plan'),
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Custom solution for large salon chains and franchises',
    price: 8999.00,
    currency: 'TRY',
    billingInterval: 'monthly',
    maxBusinesses: -1, // Unlimited
    maxStaffPerBusiness: -1, // Unlimited
    maxAppointmentsPerDay: -1, // Unlimited
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'sms_notifications',
      'enterprise_analytics',
      'business_hours',
      'staff_management',
      'service_management',
      'custom_branding',
      'business_closure_management',
      'multi_location',
      'api_access',
      'priority_support',
      'custom_integrations',
      'dedicated_support',
      'white_label',
      'advanced_security',
      's3_image_storage',
      'user_behavior_tracking',
      'advanced_reporting',
      'franchise_management'
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 4
  },
  // Yearly plans (20% discount)
  {
    id: generateId('plan'),
    name: 'starter_yearly',
    displayName: 'Starter (Annual)',
    description: 'Perfect for individual professionals - billed annually',
    price: 8630.00, // 899 * 12 * 0.8
    currency: 'TRY',
    billingInterval: 'yearly',
    maxBusinesses: 1,
    maxStaffPerBusiness: 2,
    maxAppointmentsPerDay: 30,
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'basic_analytics',
      'business_hours',
      'staff_management',
      's3_image_storage'
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 5
  },
  {
    id: generateId('plan'),
    name: 'professional_yearly',
    displayName: 'Professional (Annual)',
    description: 'Ideal for growing businesses - billed annually',
    price: 23030.00, // 2399 * 12 * 0.8
    currency: 'TRY',
    billingInterval: 'yearly',
    maxBusinesses: 1,
    maxStaffPerBusiness: 10,
    maxAppointmentsPerDay: 150,
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'sms_notifications',
      'advanced_analytics',
      'business_hours',
      'staff_management',
      'service_management',
      'custom_branding',
      'business_closure_management',
      's3_image_storage',
      'user_behavior_tracking'
    ],
    isActive: true,
    isPopular: true,
    sortOrder: 6
  },
  {
    id: generateId('plan'),
    name: 'business_yearly',
    displayName: 'Business (Annual)',
    description: 'Complete solution for established businesses - billed annually',
    price: 43190.00, // 4499 * 12 * 0.8
    currency: 'TRY',
    billingInterval: 'yearly',
    maxBusinesses: 3,
    maxStaffPerBusiness: 25,
    maxAppointmentsPerDay: 300,
    features: [
      'appointment_booking',
      'calendar_management',
      'customer_database',
      'email_notifications',
      'sms_notifications',
      'premium_analytics',
      'business_hours',
      'staff_management',
      'service_management',
      'custom_branding',
      'business_closure_management',
      'multi_location',
      'api_access',
      'priority_support',
      's3_image_storage',
      'user_behavior_tracking',
      'advanced_reporting'
    ],
    isActive: true,
    isPopular: false,
    sortOrder: 7
  }
];

async function seedBusinessData() {
  console.log('🏢 Starting Business Data seed...');

  try {
    // Create business types
    console.log('\nCreating business types...');
    for (const businessType of DEFAULT_BUSINESS_TYPES) {
      await prisma.businessType.upsert({
        where: { name: businessType.name },
        update: {
          displayName: businessType.displayName,
          description: businessType.description,
          icon: businessType.icon,
          category: businessType.category,
          isActive: true
        },
        create: businessType
      });
      console.log(`✅ Created/Updated business type: ${businessType.displayName} (${businessType.category})`);
    }

    // Create subscription plans
    console.log('\nCreating subscription plans...');
    for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
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
      
      const pricing = plan.billingInterval === 'yearly' 
        ? `₺${plan.price}/year` 
        : `₺${plan.price}/month`;
      console.log(`✅ Created/Updated plan: ${plan.displayName} (${pricing})`);
    }

    console.log('\n🎉 Business Data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Business Types: ${DEFAULT_BUSINESS_TYPES.length}`);
    console.log(`   Subscription Plans: ${DEFAULT_SUBSCRIPTION_PLANS.length}`);
    
    console.log('\n📋 Business Categories:');
    const categories = [...new Set(DEFAULT_BUSINESS_TYPES.map(bt => bt.category))];
    categories.forEach(category => {
      const count = DEFAULT_BUSINESS_TYPES.filter(bt => bt.category === category).length;
      console.log(`   ${category}: ${count} types`);
    });

  } catch (error) {
    console.error('❌ Error seeding business data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedBusinessData();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedBusinessData };