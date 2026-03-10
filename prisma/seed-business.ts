import { PrismaClient, AppointmentStatus, PaymentStatus } from '@prisma/client';

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
    displayName: 'Kuaför',
    description: 'Profesyonel saç kesim, şekillendirme ve boyama hizmetleri',
    icon: 'scissors',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'barber_shop',
    displayName: 'Berber',
    description: 'Geleneksel berberlik hizmetleri ve bakım',
    icon: 'razor',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'beauty_salon',
    displayName: 'Güzellik Salonu',
    description: 'Kapsamlı güzellik tedavileri ve spa hizmetleri',
    icon: 'makeup',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'nail_salon',
    displayName: 'Tırnak Stüdyosu',
    description: 'Manikür, pedikür ve nail art hizmetleri',
    icon: 'nail-polish',
    category: 'beauty'
  },
  {
    id: generateId('btype'),
    name: 'spa_wellness',
    displayName: 'Spa & Wellness',
    description: 'Rahatlama, masaj ve sağlık tedavileri',
    icon: 'spa',
    category: 'wellness'
  },
  {
    id: generateId('btype'),
    name: 'massage_therapy',
    displayName: 'Masaj Terapisi',
    description: 'Terapötik ve rahatlama masaj hizmetleri',
    icon: 'massage',
    category: 'wellness'
  },

  // Health & Medical
  {
    id: generateId('btype'),
    name: 'dental_clinic',
    displayName: 'Diş Kliniği',
    description: 'Diş bakımı ve ağız sağlığı hizmetleri',
    icon: 'tooth',
    category: 'healthcare'
  },
  {
    id: generateId('btype'),
    name: 'medical_clinic',
    displayName: 'Tıp Merkezi',
    description: 'Genel tıbbi konsültasyon ve tedavi hizmetleri',
    icon: 'medical',
    category: 'healthcare'
  },
  {
    id: generateId('btype'),
    name: 'physiotherapy',
    displayName: 'Fizyoterapi',
    description: 'Fizik tedavi ve rehabilitasyon hizmetleri',
    icon: 'therapy',
    category: 'healthcare'
  },
  {
    id: generateId('btype'),
    name: 'veterinary',
    displayName: 'Veteriner Kliniği',
    description: 'Evcil hayvan bakımı ve veteriner hizmetleri',
    icon: 'pet',
    category: 'healthcare'
  },

  // Professional Services
  {
    id: generateId('btype'),
    name: 'legal_services',
    displayName: 'Hukuk Hizmetleri',
    description: 'Hukuki danışmanlık ve avukatlık hizmetleri',
    icon: 'law',
    category: 'professional'
  },
  {
    id: generateId('btype'),
    name: 'financial_advisory',
    displayName: 'Mali Müşavirlik',
    description: 'Finansal planlama ve danışmanlık hizmetleri',
    icon: 'finance',
    category: 'professional'
  },
  {
    id: generateId('btype'),
    name: 'consulting',
    displayName: 'Danışmanlık',
    description: 'İş ve profesyonel danışmanlık hizmetleri',
    icon: 'consulting',
    category: 'professional'
  },

  // Personal Services
  {
    id: generateId('btype'),
    name: 'personal_training',
    displayName: 'Kişisel Antrenörlük',
    description: 'Fitness koçluğu ve kişisel antrenman seansları',
    icon: 'fitness',
    category: 'fitness'
  },
  {
    id: generateId('btype'),
    name: 'tutoring',
    displayName: 'Özel Ders & Eğitim',
    description: 'Eğitsel özel ders ve öğretim hizmetleri',
    icon: 'education',
    category: 'education'
  },
  {
    id: generateId('btype'),
    name: 'photography',
    displayName: 'Fotoğrafçılık',
    description: 'Profesyonel fotoğraf çekimi hizmetleri',
    icon: 'camera',
    category: 'creative'
  },

  // Automotive
  {
    id: generateId('btype'),
    name: 'auto_repair',
    displayName: 'Oto Tamir',
    description: 'Araç bakım ve onarım hizmetleri',
    icon: 'car-repair',
    category: 'automotive'
  },
  {
    id: generateId('btype'),
    name: 'car_wash',
    displayName: 'Oto Yıkama',
    description: 'Araç temizleme ve detaylı bakım hizmetleri',
    icon: 'car-wash',
    category: 'automotive'
  },

  // General
  {
    id: generateId('btype'),
    name: 'other',
    displayName: 'Diğer Hizmetler',
    description: 'Diğer randevu tabanlı hizmetler',
  icon: 'service',
    category: 'general'
  }
];

// Subscription plans are now handled by seed-subscription-plans.ts

// Sample businesses for testing - these will have real phone numbers you can use to login
const SAMPLE_BUSINESSES = [
  {
    business: {
      name: 'Elite Kuaför',
      slug: 'elite-kuafor',
      description: 'İstanbul\'da premium saç şekillendirme ve boyama hizmetleri',
      email: 'info@elitekuafor.com',
      phone: '+905551234567',
      website: 'https://elitekuafor.com',
      address: 'Bağdat Caddesi No:123',
      city: 'İstanbul',
      state: 'Kadıköy',
      country: 'Turkey',
      postalCode: '34710',
      latitude: 40.9909,
      longitude: 29.0303,
      businessHours: {
        monday: { open: '09:00', close: '20:00', isOpen: true },
        tuesday: { open: '09:00', close: '20:00', isOpen: true },
        wednesday: { open: '09:00', close: '20:00', isOpen: true },
        thursday: { open: '09:00', close: '20:00', isOpen: true },
        friday: { open: '09:00', close: '20:00', isOpen: true },
        saturday: { open: '10:00', close: '18:00', isOpen: true },
        sunday: { open: '10:00', close: '16:00', isOpen: true }
      },
      timezone: 'Europe/Istanbul',
      primaryColor: '#FF6B6B',
      tags: ['premium', 'hair-styling', 'coloring', 'istanbul']
    },
    owner: {
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
    phoneNumber: '+905551234567',
      timezone: 'Europe/Istanbul',
      language: 'tr'
    },
    businessType: 'hair_salon',
    subscriptionPlan: 'premium_tier1'
  },
  {
    business: {
      name: 'Modern Berber',
      slug: 'modern-berber',
      description: 'Modern erkekler için çağdaş berberlik hizmetleri',
      email: 'hello@modernberber.com',
      phone: '+905552345678',
      website: 'https://modernberber.com',
      address: 'İstiklal Caddesi No:456',
      city: 'İstanbul',
      state: 'Beyoğlu',
      country: 'Turkey',
      postalCode: '34435',
      latitude: 41.0370,
      longitude: 28.9850,
      businessHours: {
        monday: { open: '08:00', close: '19:00', isOpen: true },
        tuesday: { open: '08:00', close: '19:00', isOpen: true },
        wednesday: { open: '08:00', close: '19:00', isOpen: true },
        thursday: { open: '08:00', close: '19:00', isOpen: true },
        friday: { open: '08:00', close: '19:00', isOpen: true },
        saturday: { open: '09:00', close: '17:00', isOpen: true },
        sunday: { open: '10:00', close: '16:00', isOpen: true }
      },
      timezone: 'Europe/Istanbul',
      primaryColor: '#4ECDC4',
      tags: ['barber', 'men-grooming', 'istanbul', 'modern']
    },
    owner: {
      firstName: 'Mehmet',
      lastName: 'Demir',
      phoneNumber: '+905552345678',
      timezone: 'Europe/Istanbul',
      language: 'tr'
    },
    businessType: 'barber_shop',
    subscriptionPlan: 'basic_tier1'
  },
  {
    business: {
      name: 'Wellness Spa Center',
      slug: 'wellness-spa-center',
      description: 'Relaxation and wellness treatments for body and mind',
      email: 'info@wellnessspa.com',
      phone: '+905553456789',
      website: 'https://wellnessspa.com',
      address: 'Çeşme Mahallesi No:789',
      city: 'Izmir',
      state: 'Çeşme',
      country: 'Turkey',
      postalCode: '35930',
      latitude: 38.3223,
      longitude: 26.3054,
      businessHours: {
        monday: { open: '10:00', close: '19:00', isOpen: true },
        tuesday: { open: '10:00', close: '19:00', isOpen: true },
        wednesday: { open: '10:00', close: '19:00', isOpen: true },
        thursday: { open: '10:00', close: '19:00', isOpen: true },
        friday: { open: '10:00', close: '20:00', isOpen: true },
        saturday: { open: '09:00', close: '20:00', isOpen: true },
        sunday: { open: '10:00', close: '18:00', isOpen: true }
      },
      timezone: 'Europe/Istanbul',
      primaryColor: '#A8E6CF',
      tags: ['spa', 'wellness', 'massage', 'relaxation', 'izmir']
    },
    owner: {
      firstName: 'Zeynep',
      lastName: 'Kaya',
      phoneNumber: '+905553456789',
      timezone: 'Europe/Istanbul',
      language: 'tr'
    },
    businessType: 'spa_wellness',
    subscriptionPlan: 'premium_tier2'
  },
  {
    business: {
      name: 'Diş Bakım Kliniği',
      slug: 'dis-bakim-klinigi',
      description: 'Profesyonel diş hizmetleri ve ağız sağlığı bakımı',
      email: 'randevu@disbakimklinigi.com',
      phone: '+905554567890',
      website: 'https://disbakimklinigi.com',
      address: 'Kızılay Meydanı No:321',
      city: 'Ankara',
      state: 'Çankaya',
      country: 'Turkey',
      postalCode: '06420',
      latitude: 39.9334,
      longitude: 32.8597,
      businessHours: {
        monday: { open: '08:00', close: '18:00', isOpen: true },
        tuesday: { open: '08:00', close: '18:00', isOpen: true },
        wednesday: { open: '08:00', close: '18:00', isOpen: true },
        thursday: { open: '08:00', close: '18:00', isOpen: true },
        friday: { open: '08:00', close: '17:00', isOpen: true },
        saturday: { open: '09:00', close: '14:00', isOpen: true },
        sunday: { open: '10:00', close: '14:00', isOpen: false }
      },
      timezone: 'Europe/Istanbul',
      primaryColor: '#FFEAA7',
      tags: ['dental', 'healthcare', 'ankara', 'professional']
    },
    owner: {
      firstName: 'Dr. Ahmet',
      lastName: 'Özkan',
      phoneNumber: '+905554567890',
      timezone: 'Europe/Istanbul',
      language: 'tr'
    },
    businessType: 'dental_clinic',
    subscriptionPlan: 'premium_tier1'
  }
];

// Sample services by business type
function getServicesByBusinessType(businessType: string) {
  const servicesByType: Record<string, any[]> = {
    hair_salon: [
      { name: 'Kadın Saç Kesimi', description: 'Profesyonel saç kesim ve şekillendirme', duration: 60, price: 150, currency: 'TRY' },
      { name: 'Erkek Saç Kesimi', description: 'Erkek saç kesim ve şekillendirme', duration: 45, price: 100, currency: 'TRY' },
      { name: 'Saç Boyama', description: 'Profesyonel saç boyama hizmeti', duration: 120, price: 300, currency: 'TRY' },
      { name: 'Saç Bakımı', description: 'Derin nemlendirme saç bakımı', duration: 90, price: 200, currency: 'TRY' },
      { name: 'Fön Çekme', description: 'Profesyonel fön ve şekillendirme', duration: 30, price: 80, currency: 'TRY' }
    ],
    barber_shop: [
      { name: 'Klasik Traş', description: 'Geleneksel erkek saç kesimi', duration: 30, price: 75, currency: 'TRY' },
      { name: 'Sakal Düzeltme', description: 'Profesyonel sakal kesim ve şekillendirme', duration: 20, price: 50, currency: 'TRY' },
      { name: 'Sıcak Havlu Traşı', description: 'Geleneksel sıcak havlu traş deneyimi', duration: 45, price: 100, currency: 'TRY' },
      { name: 'Saç & Sakal Kombo', description: 'Tam saç ve sakal hizmeti', duration: 50, price: 120, currency: 'TRY' }
    ],
    spa_wellness: [
      { name: 'İsveç Masajı', description: 'Rahatlatıcı tam vücut İsveç masajı', duration: 60, price: 250, currency: 'TRY' },
      { name: 'Derin Doku Masajı', description: 'Terapotik derin doku masajı', duration: 90, price: 350, currency: 'TRY' },
      { name: 'Yüz Bakımı', description: 'Yenileştirici yüz bakım tedavisi', duration: 75, price: 200, currency: 'TRY' },
      { name: 'Vücut Peelingi', description: 'Ölü deri temizleme vücut peelingi', duration: 45, price: 180, currency: 'TRY' },
      { name: 'Çift Masajı', description: 'İki kişilik rahatlatıcı masaj', duration: 60, price: 450, currency: 'TRY' }
    ],
    dental_clinic: [
      { name: 'Genel Kontrole', description: 'Rutin diş muayenesi', duration: 30, price: 150, currency: 'TRY' },
      { name: 'Diş Temizliği', description: 'Profesyonel diş temizleme', duration: 45, price: 200, currency: 'TRY' },
      { name: 'Diş Dolgusu', description: 'Kompozit diş dolgusu', duration: 60, price: 300, currency: 'TRY' },
      { name: 'Diş Beyazlatma', description: 'Profesyonel diş beyazlatma', duration: 90, price: 800, currency: 'TRY' },
      { name: 'Kanal Tedavisi', description: 'Kök kanalı tedavisi', duration: 120, price: 1200, currency: 'TRY' }
    ]
  };

  return servicesByType[businessType] || [
    { name: 'Genel Hizmet', description: 'Standart hizmet sunumu', duration: 60, price: 100, currency: 'TRY' }
  ];
}

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

    // Subscription plans are handled by seed-subscription-plans.ts
    console.log('\nℹ️  Subscription plans are managed by seed-subscription-plans.ts');

    // Create sample businesses with owners
    console.log('\nCreating sample businesses with owners...');
    for (const sampleBusiness of SAMPLE_BUSINESSES) {
      // Find or create business type
      const businessType = await prisma.businessType.findUnique({
        where: { name: sampleBusiness.businessType }
      });

      if (!businessType) {
        console.log(`⚠️  Business type ${sampleBusiness.businessType} not found, skipping business creation`);
        continue;
      }

      // Find or create subscription plan
      const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: sampleBusiness.subscriptionPlan }
      });

      if (!subscriptionPlan) {
        console.log(`⚠️  Subscription plan ${sampleBusiness.subscriptionPlan} not found, skipping business creation`);
        continue;
      }

      // Create or find owner user
      let owner = await prisma.user.findUnique({
        where: { phoneNumber: sampleBusiness.owner.phoneNumber }
      });

      if (!owner) {
        owner = await prisma.user.create({
          data: {
            id: generateId('user'),
            phoneNumber: sampleBusiness.owner.phoneNumber,
            firstName: sampleBusiness.owner.firstName,
            lastName: sampleBusiness.owner.lastName,
            timezone: sampleBusiness.owner.timezone,
            language: sampleBusiness.owner.language,
            isVerified: true,
            isActive: true,
            updatedAt: new Date()
          }
        });
        console.log(`✅ Created owner user: ${owner.firstName} ${owner.lastName} (${owner.phoneNumber})`);
      } else {
        console.log(`ℹ️  Owner user already exists: ${owner.firstName} ${owner.lastName} (${owner.phoneNumber})`);
      }

      // Create business
      const business = await prisma.business.upsert({
        where: { slug: sampleBusiness.business.slug },
        update: {
          name: sampleBusiness.business.name,
          description: sampleBusiness.business.description,
          email: sampleBusiness.business.email,
          phone: sampleBusiness.business.phone,
          website: sampleBusiness.business.website,
          address: sampleBusiness.business.address,
          city: sampleBusiness.business.city,
          state: sampleBusiness.business.state,
          country: sampleBusiness.business.country,
          postalCode: sampleBusiness.business.postalCode,
          latitude: sampleBusiness.business.latitude,
          longitude: sampleBusiness.business.longitude,
          businessHours: sampleBusiness.business.businessHours,
          timezone: sampleBusiness.business.timezone,
          primaryColor: sampleBusiness.business.primaryColor,
          tags: sampleBusiness.business.tags,
          isActive: true,
          isVerified: true,
          verifiedAt: new Date()
        },
        create: {
          id: generateId('business'),
          ownerId: owner.id,
          businessTypeId: businessType.id,
          ...sampleBusiness.business,
          isActive: true,
          isVerified: true,
          verifiedAt: new Date()
        }
      });

      console.log(`✅ Created/Updated business: ${business.name} (${business.slug})`);

      // Create sample services for each business based on business type
      const services = getServicesByBusinessType(sampleBusiness.businessType);
      
      // Check if services already exist for this business
      const existingServices = await prisma.service.findMany({
        where: { businessId: business.id }
      });
      
      if (existingServices.length === 0) {
        for (const serviceData of services) {
          await prisma.service.create({
            data: {
              id: generateId('service'),
              businessId: business.id,
              name: serviceData.name,
              description: serviceData.description,
              duration: serviceData.duration,
              price: serviceData.price,
              currency: serviceData.currency,
              isActive: true
            }
          });
        }
        console.log(`✅ Created ${services.length} services for ${business.name}`);
      } else {
        console.log(`ℹ️  Services already exist for ${business.name} (${existingServices.length} services)`);
      }

      // Create business subscription
      await prisma.businessSubscription.upsert({
        where: { businessId: business.id },
        update: {
          planId: subscriptionPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          cancelAtPeriodEnd: false
        },
        create: {
          id: generateId('sub'),
          businessId: business.id,
          planId: subscriptionPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          cancelAtPeriodEnd: false
        }
      });

      console.log(`✅ Created/Updated subscription for ${business.name}: ${subscriptionPlan.displayName}`);

      // Assign OWNER role to the business owner
      const ownerRole = await prisma.role.findUnique({
        where: { name: 'OWNER' }
      });

      if (ownerRole) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: owner.id,
              roleId: ownerRole.id
            }
          },
          update: {
            isActive: true,
            grantedAt: new Date()
          },
          create: {
            id: generateId('urole'),
            userId: owner.id,
            roleId: ownerRole.id,
            grantedBy: null,
            grantedAt: new Date(),
            isActive: true
          }
        });
        console.log(`✅ Assigned OWNER role to ${owner.firstName} ${owner.lastName}`);
      }
    }

    console.log('\n🎉 Business Data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Business Types: ${DEFAULT_BUSINESS_TYPES.length}`);
    console.log(`   Sample Businesses: ${SAMPLE_BUSINESSES.length}`);
    console.log(`   Note: Subscription plans are managed separately by seed-subscription-plans.ts`);
    
    console.log('\n📋 Business Categories:');
    const categorySet = new Set(DEFAULT_BUSINESS_TYPES.map(bt => bt.category));
    const categories = Array.from(categorySet);
    categories.forEach(category => {
      const count = DEFAULT_BUSINESS_TYPES.filter(bt => bt.category === category).length;
      console.log(`   ${category}: ${count} types`);
    });

    console.log('\n🔑 Test Login Credentials:');
    console.log('   You can now login with these phone numbers:');
    SAMPLE_BUSINESSES.forEach(sample => {
      console.log(`   📱 ${sample.owner.phoneNumber} - ${sample.owner.firstName} ${sample.owner.lastName} (${sample.business.name})`);
    });
    console.log('\n   Note: You\'ll need to send verification codes to these numbers first');

  } catch (error) {
    console.error('❌ Error seeding business data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedBusinessData();
    await createModernBerberAppointments();
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

// Helper function to create appointments for Modern Berber
async function createModernBerberAppointments() {
  console.log('📅 Creating appointments for Modern Berber...');

  // Clear existing appointments for Modern Berber first
  console.log('🧹 Clearing existing Modern Berber appointments...');
  const modernBerberExisting = await prisma.business.findUnique({
    where: { slug: 'modern-berber' },
    select: { id: true }
  });
  
  if (modernBerberExisting) {
    // Delete payments for appointments first
    const appointmentsToDelete = await prisma.appointment.findMany({
      where: { businessId: modernBerberExisting.id },
      select: { id: true }
    });
    
    if (appointmentsToDelete.length > 0) {
      await prisma.appointment_payments.deleteMany({
        where: {
          appointmentId: {
            in: appointmentsToDelete.map(apt => apt.id)
          }
        }
      });
    }
    await prisma.appointment.deleteMany({
      where: { businessId: modernBerberExisting.id }
    });
    console.log('✅ Cleared existing appointments');
  }

  const modernBerber = await prisma.business.findUnique({
    where: { slug: 'modern-berber' },
    include: {
      services: true,
      staff: {
        include: {
          user: true
        }
      }
    }
  });

  if (!modernBerber) {
    console.log('⚠️  Modern Berber not found, skipping appointments');
    return;
  }

  if (!modernBerber.services || modernBerber.services.length === 0) {
    console.log('⚠️  Modern Berber has no services, skipping appointments');
    return;
  }

  // Sample customers for appointments (expanded list for high density)
  const sampleCustomers = [
    { firstName: 'Ahmet', lastName: 'Yılmaz', phoneNumber: '+905551111001' },
    { firstName: 'Mehmet', lastName: 'Kaya', phoneNumber: '+905551111002' },
    { firstName: 'Ali', lastName: 'Çelik', phoneNumber: '+905551111003' },
    { firstName: 'Mustafa', lastName: 'Şahin', phoneNumber: '+905551111004' },
    { firstName: 'Hasan', lastName: 'Özdemir', phoneNumber: '+905551111005' },
    { firstName: 'Emre', lastName: 'Arslan', phoneNumber: '+905551111006' },
    { firstName: 'Burak', lastName: 'Koç', phoneNumber: '+905551111007' },
    { firstName: 'Oğuz', lastName: 'Yıldız', phoneNumber: '+905551111008' },
    { firstName: 'Can', lastName: 'Aydın', phoneNumber: '+905551111009' },
    { firstName: 'Eren', lastName: 'Polat', phoneNumber: '+905551111010' },
    { firstName: 'Berk', lastName: 'Güler', phoneNumber: '+905551111011' },
    { firstName: 'Cem', lastName: 'Soylu', phoneNumber: '+905551111012' },
    { firstName: 'Deniz', lastName: 'Aktaş', phoneNumber: '+905551111013' },
    { firstName: 'Ege', lastName: 'Tunç', phoneNumber: '+905551111014' },
    { firstName: 'Furkan', lastName: 'Bayrak', phoneNumber: '+905551111015' },
    { firstName: 'Gökhan', lastName: 'Mutlu', phoneNumber: '+905551111016' },
    { firstName: 'Halil', lastName: 'Erdoğan', phoneNumber: '+905551111017' },
    { firstName: 'İbrahim', lastName: 'Çakır', phoneNumber: '+905551111018' },
    { firstName: 'Kerim', lastName: 'Acar', phoneNumber: '+905551111019' },
    { firstName: 'Levent', lastName: 'Başar', phoneNumber: '+905551111020' }
  ];

  // Create customers if they don't exist
  const customers: any[] = [];
  for (const customerData of sampleCustomers) {
    let customer = await prisma.user.findUnique({
      where: { phoneNumber: customerData.phoneNumber }
    });

    if (!customer) {
      customer = await prisma.user.create({
        data: {
          id: generateId('user'),
          ...customerData,
          timezone: 'Europe/Istanbul',
          language: 'tr',
          isVerified: true,
          isActive: true,
          updatedAt: new Date()
        }
      });
    }
    customers.push(customer);
  }

  // Get today and this week's dates
  const today = new Date();
  const weekDates: Date[] = [];
  
  // Add today and next 6 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    weekDates.push(date);
  }

  console.log(`📅 Creating appointments for Modern Berber from ${today.toDateString()} to ${weekDates[6].toDateString()}`);

  let totalAppointments = 0;

  // Create appointments for each day this week
  for (const date of weekDates) {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const businessHours = modernBerber.businessHours as any;
    
    if (!businessHours[dayName] || !businessHours[dayName].isOpen) {
      console.log(`🏢 Modern Berber is closed on ${dayName}, skipping`);
      continue;
    }

    const openHour = parseInt(businessHours[dayName].open.split(':')[0]);
    const closeHour = parseInt(businessHours[dayName].close.split(':')[0]);

    // Create a single timeline for the day - no overlaps allowed
    let currentTime = new Date(date);
    currentTime.setHours(openHour, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(closeHour, 0, 0, 0);

    let appointmentCount = 0;
    const createdAppointments: { start: Date; end: Date; service: string; customer: string }[] = [];

    // Fill the entire day with sequential appointments (no gaps, no overlaps)
    while (currentTime < endOfDay) {
      const service = modernBerber.services[Math.floor(Math.random() * modernBerber.services.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      
      const startTime = new Date(currentTime);
      const endTime = new Date(startTime.getTime() + (service.duration * 60 * 1000));
      
      // Check if this appointment would fit within business hours
      if (endTime > endOfDay) {
        // Try with a shorter service if available
        const shorterServices = modernBerber.services.filter(s => {
          const testEnd = new Date(startTime.getTime() + (s.duration * 60 * 1000));
          return testEnd <= endOfDay;
        });
        
        if (shorterServices.length === 0) {
          break; // No service fits, end of day
        }
        
        const shorterService = shorterServices[Math.floor(Math.random() * shorterServices.length)];
        service.id = shorterService.id;
        service.name = shorterService.name;
        service.duration = shorterService.duration;
        service.price = shorterService.price;
        service.currency = shorterService.currency;
        endTime.setTime(startTime.getTime() + (service.duration * 60 * 1000));
      }

      // Determine status based on date
      let status: AppointmentStatus = AppointmentStatus.CONFIRMED;
      if (date < today) {
        const pastStatuses: AppointmentStatus[] = [AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW];
        status = pastStatuses[Math.floor(Math.random() * pastStatuses.length)];
      }

      try {
        const appointment = await prisma.appointment.create({
          data: {
            id: generateId('apt'),
            businessId: modernBerber.id,
            serviceId: service.id,
            customerId: customer.id,
            date: date,
            startTime: startTime,
            endTime: endTime,
            duration: service.duration,
            status: status,
            price: service.price,
            currency: service.currency,
            customerNotes: 'Randevu notları',
            internalNotes: 'İç notlar',
            bookedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
            confirmedAt: status !== AppointmentStatus.CANCELED && status !== AppointmentStatus.NO_SHOW ? new Date() : null,
            completedAt: status === AppointmentStatus.COMPLETED ? startTime : null,
            canceledAt: status === AppointmentStatus.CANCELED ? new Date() : null,
            reminderSent: true,
            reminderSentAt: new Date()
          }
        });

        console.log(`   ✅ ${date.toDateString()} ${startTime.toTimeString().substring(0, 5)}-${endTime.toTimeString().substring(0, 5)} - ${customer.firstName} ${customer.lastName} (${service.name}) [${status}]`);
        appointmentCount++;
        totalAppointments++;

        // Create payment if needed
        if (status === AppointmentStatus.COMPLETED || status === AppointmentStatus.CONFIRMED) {
          await prisma.appointment_payments.create({
            data: {
              id: generateId('pay'),
              appointmentId: appointment.id,
              amount: service.price,
              currency: service.currency,
              status: status === AppointmentStatus.COMPLETED ? PaymentStatus.SUCCEEDED : PaymentStatus.PENDING,
              paymentMethod: ['card', 'cash', 'bank_transfer'][Math.floor(Math.random() * 3)],
              paidAt: status === AppointmentStatus.COMPLETED ? startTime : null
            }
          });
        }

        // Add to tracking array
        createdAppointments.push({
          start: startTime,
          end: endTime,
          service: service.name,
          customer: `${customer.firstName} ${customer.lastName}`
        });

        // Move to next time slot (exactly when this appointment ends)
        currentTime = new Date(endTime);
        
      } catch (error) {
        console.log(`   ❌ Error creating appointment at ${startTime.toTimeString().substring(0, 5)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // If there's an error, move forward by 15 minutes and try again
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }
    }
    
    console.log(`   📊 ${dayName}: Created ${appointmentCount} back-to-back appointments (${openHour}:00-${closeHour}:00)`)
  }

  console.log(`✅ Created ${totalAppointments} appointments for Modern Berber this week`);
}

export { seedBusinessData, createModernBerberAppointments };