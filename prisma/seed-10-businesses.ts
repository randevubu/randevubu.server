import { PrismaClient, AppointmentStatus, PaymentStatus, BusinessStaffRole } from '@prisma/client';

const prisma = new PrismaClient();

// Generate ID helper
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Sample business data
const BUSINESS_NAMES = [
  { name: 'Elite Hair Studio', type: 'hair_salon', city: 'İstanbul', state: 'Kadıköy' },
  { name: 'Modern Barber Shop', type: 'barber_shop', city: 'İstanbul', state: 'Beyoğlu' },
  { name: 'Serenity Spa', type: 'spa_wellness', city: 'İzmir', state: 'Çeşme' },
  { name: 'Smile Dental Clinic', type: 'dental_clinic', city: 'Ankara', state: 'Çankaya' },
  { name: 'Glamour Beauty Salon', type: 'beauty_salon', city: 'İstanbul', state: 'Şişli' },
  { name: 'Nail Art Studio', type: 'nail_salon', city: 'İstanbul', state: 'Beşiktaş' },
  { name: 'Relaxation Massage', type: 'massage_therapy', city: 'Antalya', state: 'Konyaaltı' },
  { name: 'FitZone Personal Training', type: 'personal_training', city: 'İstanbul', state: 'Ataşehir' },
  { name: 'VetCare Animal Clinic', type: 'veterinary', city: 'Ankara', state: 'Yenimahalle' },
  { name: 'Photo Studio Pro', type: 'photography', city: 'İzmir', state: 'Konak' }
];

// Service templates by business type
const SERVICE_TEMPLATES: Record<string, Array<{ name: string; description: string; duration: number; price: number }>> = {
  hair_salon: [
    { name: 'Kadın Saç Kesimi', description: 'Profesyonel saç kesim ve şekillendirme', duration: 60, price: 200 },
    { name: 'Erkek Saç Kesimi', description: 'Erkek saç kesim ve şekillendirme', duration: 45, price: 120 },
    { name: 'Saç Boyama', description: 'Profesyonel saç boyama hizmeti', duration: 120, price: 400 },
    { name: 'Saç Bakımı', description: 'Derin nemlendirme saç bakımı', duration: 90, price: 250 },
    { name: 'Fön Çekme', description: 'Profesyonel fön ve şekillendirme', duration: 30, price: 100 }
  ],
  barber_shop: [
    { name: 'Klasik Traş', description: 'Geleneksel erkek saç kesimi', duration: 30, price: 80 },
    { name: 'Sakal Düzeltme', description: 'Profesyonel sakal kesim ve şekillendirme', duration: 20, price: 60 },
    { name: 'Sıcak Havlu Traşı', description: 'Geleneksel sıcak havlu traş deneyimi', duration: 45, price: 120 },
    { name: 'Saç & Sakal Kombo', description: 'Tam saç ve sakal hizmeti', duration: 50, price: 140 }
  ],
  spa_wellness: [
    { name: 'İsveç Masajı', description: 'Rahatlatıcı tam vücut İsveç masajı', duration: 60, price: 300 },
    { name: 'Derin Doku Masajı', description: 'Terapotik derin doku masajı', duration: 90, price: 450 },
    { name: 'Yüz Bakımı', description: 'Yenileştirici yüz bakım tedavisi', duration: 75, price: 250 },
    { name: 'Vücut Peelingi', description: 'Ölü deri temizleme vücut peelingi', duration: 45, price: 200 }
  ],
  dental_clinic: [
    { name: 'Genel Kontrol', description: 'Rutin diş muayenesi', duration: 30, price: 200 },
    { name: 'Diş Temizliği', description: 'Profesyonel diş temizleme', duration: 45, price: 300 },
    { name: 'Diş Dolgusu', description: 'Kompozit diş dolgusu', duration: 60, price: 400 },
    { name: 'Diş Beyazlatma', description: 'Profesyonel diş beyazlatma', duration: 90, price: 1000 }
  ],
  beauty_salon: [
    { name: 'Cilt Bakımı', description: 'Profesyonel cilt bakım tedavisi', duration: 90, price: 350 },
    { name: 'Makyaj', description: 'Özel gün makyajı', duration: 60, price: 250 },
    { name: 'Kaş Tasarımı', description: 'Profesyonel kaş şekillendirme', duration: 45, price: 150 },
    { name: 'Kirpik Lifting', description: 'Kirpik lifting ve boyama', duration: 30, price: 200 }
  ],
  nail_salon: [
    { name: 'Manikür', description: 'Klasik manikür hizmeti', duration: 45, price: 120 },
    { name: 'Pedikür', description: 'Klasik pedikür hizmeti', duration: 60, price: 150 },
    { name: 'Nail Art', description: 'Özel nail art tasarımı', duration: 90, price: 250 },
    { name: 'Gel Manikür', description: 'Kalıcı gel manikür', duration: 75, price: 200 }
  ],
  massage_therapy: [
    { name: 'Rahatlatıcı Masaj', description: 'Tam vücut rahatlatıcı masaj', duration: 60, price: 280 },
    { name: 'Spor Masajı', description: 'Spor sonrası masaj', duration: 45, price: 200 },
    { name: 'Aromaterapi Masajı', description: 'Aromaterapi ile masaj', duration: 75, price: 350 }
  ],
  personal_training: [
    { name: 'Bireysel Antrenman', description: 'Kişisel antrenör eşliğinde antrenman', duration: 60, price: 300 },
    { name: 'Grup Antrenmanı', description: 'Grup fitness dersi', duration: 45, price: 150 },
    { name: 'Beslenme Danışmanlığı', description: 'Beslenme planı oluşturma', duration: 60, price: 400 }
  ],
  veterinary: [
    { name: 'Genel Muayene', description: 'Rutin veteriner muayenesi', duration: 30, price: 200 },
    { name: 'Aşı', description: 'Aşı uygulaması', duration: 15, price: 150 },
    { name: 'Kısırlaştırma', description: 'Kedi/köpek kısırlaştırma', duration: 120, price: 1500 }
  ],
  photography: [
    { name: 'Portre Çekimi', description: 'Profesyonel portre fotoğraf çekimi', duration: 60, price: 500 },
    { name: 'Düğün Çekimi', description: 'Düğün fotoğraf çekimi', duration: 480, price: 5000 },
    { name: 'Ürün Çekimi', description: 'E-ticaret ürün fotoğraf çekimi', duration: 120, price: 800 }
  ]
};

// Review comments
const REVIEW_COMMENTS = [
  'Harika bir deneyim! Kesinlikle tekrar geleceğim.',
  'Çok profesyonel ve nazik personel. Memnun kaldım.',
  'Fiyat performans açısından çok iyi. Tavsiye ederim.',
  'Hizmet kalitesi mükemmel. Teşekkürler!',
  'Biraz beklemek zorunda kaldım ama sonuç harikaydı.',
  'Çok temiz ve modern bir yer. Personel çok ilgili.',
  'İlk defa geldim ve çok memnun kaldım.',
  'Uzun zamandır buraya geliyorum, her zaman memnunum.',
  'Biraz pahalı ama kalite gerçekten çok iyi.',
  'Randevu sistemi çok pratik. Zamanında hizmet aldım.',
  'Personel çok bilgili ve yardımsever.',
  'Ortam çok rahatlatıcı. Tekrar gelmek istiyorum.',
  'Hizmet hızlı ve kaliteli. Teşekkürler!',
  'Biraz daha uygun fiyatlı olabilirdi ama memnunum.',
  'Mükemmel bir deneyim! Herkese tavsiye ederim.'
];

// Customer names
const CUSTOMER_NAMES = [
  { firstName: 'Ahmet', lastName: 'Yılmaz' },
  { firstName: 'Ayşe', lastName: 'Demir' },
  { firstName: 'Mehmet', lastName: 'Kaya' },
  { firstName: 'Fatma', lastName: 'Özkan' },
  { firstName: 'Ali', lastName: 'Çelik' },
  { firstName: 'Zeynep', lastName: 'Arslan' },
  { firstName: 'Mustafa', lastName: 'Şahin' },
  { firstName: 'Elif', lastName: 'Koç' },
  { firstName: 'Hasan', lastName: 'Özdemir' },
  { firstName: 'Selin', lastName: 'Yıldız' },
  { firstName: 'Burak', lastName: 'Aydın' },
  { firstName: 'Ceren', lastName: 'Polat' },
  { firstName: 'Deniz', lastName: 'Aktaş' },
  { firstName: 'Ege', lastName: 'Tunç' },
  { firstName: 'Furkan', lastName: 'Bayrak' },
  { firstName: 'Gizem', lastName: 'Mutlu' },
  { firstName: 'Halil', lastName: 'Erdoğan' },
  { firstName: 'İpek', lastName: 'Çakır' },
  { firstName: 'Kerem', lastName: 'Acar' },
  { firstName: 'Leyla', lastName: 'Başar' },
  { firstName: 'Murat', lastName: 'Özdemir' },
  { firstName: 'Nazlı', lastName: 'Kurt' },
  { firstName: 'Onur', lastName: 'Şen' },
  { firstName: 'Pınar', lastName: 'Doğan' },
  { firstName: 'Rıza', lastName: 'Yıldırım' }
];

// Staff names
const STAFF_NAMES = [
  { firstName: 'Emre', lastName: 'Yıldız' },
  { firstName: 'Seda', lastName: 'Kara' },
  { firstName: 'Tolga', lastName: 'Öz' },
  { firstName: 'Burcu', lastName: 'Şahin' },
  { firstName: 'Can', lastName: 'Aydın' }
];

async function seed10Businesses() {
  console.log('🏢 Starting 10 Businesses seed...\n');

  // Check database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure your database is running');
    console.error('   2. Check your DATABASE_URL in .env file');
    console.error('   3. If using Docker, use: postgresql://postgres:postgres@localhost:5432/randevubu?schema=public');
    console.error('   4. Or run the script inside Docker: docker-compose exec app npx ts-node prisma/seed-10-businesses.ts\n');
    throw error;
  }

  try {
    // Get or create business types
    const businessTypes = await prisma.businessType.findMany();
    if (businessTypes.length === 0) {
      console.log('⚠️  No business types found. Please run seed-business.ts first.');
      return;
    }

    // Get subscription plan
    const subscriptionPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true }
    });

    if (!subscriptionPlan) {
      console.log('⚠️  No subscription plan found. Please run seed-subscription-plans.ts first.');
      return;
    }

    // Create customers
    console.log('👥 Creating customers...');
    const customers: any[] = [];
    for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
      const customerData = CUSTOMER_NAMES[i];
      const phoneNumber = `+90555${String(1000000 + i).padStart(7, '0')}`;
      
      let customer = await prisma.user.findUnique({
        where: { phoneNumber }
      });

      if (!customer) {
        customer = await prisma.user.create({
          data: {
            id: generateId('user'),
            phoneNumber,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
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
    console.log(`✅ Created/found ${customers.length} customers\n`);

    // Create 10 businesses
    for (let i = 0; i < BUSINESS_NAMES.length; i++) {
      const businessData = BUSINESS_NAMES[i];
      console.log(`\n🏢 Creating business ${i + 1}/10: ${businessData.name}`);

      // Find business type
      const businessType = businessTypes.find(bt => bt.name === businessData.type);
      if (!businessType) {
        console.log(`⚠️  Business type ${businessData.type} not found, skipping`);
        continue;
      }

      // Create owner
      const ownerPhone = `+90555${String(2000000 + i).padStart(7, '0')}`;
      let owner = await prisma.user.findUnique({
        where: { phoneNumber: ownerPhone }
      });

      if (!owner) {
        owner = await prisma.user.create({
          data: {
            id: generateId('user'),
            phoneNumber: ownerPhone,
            firstName: businessData.name.split(' ')[0],
            lastName: 'Owner',
            timezone: 'Europe/Istanbul',
            language: 'tr',
            isVerified: true,
            isActive: true,
            updatedAt: new Date()
          }
        });
      }

      // Create business
      const slug = businessData.name.toLowerCase().replace(/\s+/g, '-');
      let business = await prisma.business.findUnique({
        where: { slug }
      });

      if (!business) {
        business = await prisma.business.create({
          data: {
            id: generateId('business'),
            ownerId: owner.id,
            businessTypeId: businessType.id,
            name: businessData.name,
            slug,
            description: `${businessData.name} - Profesyonel hizmet kalitesi`,
            email: `info@${slug.replace(/-/g, '')}.com`,
            phone: ownerPhone,
            address: `${businessData.state} Mahallesi, ${i + 1}. Sokak No:${i + 10}`,
            city: businessData.city,
            state: businessData.state,
            country: 'Turkey',
            postalCode: String(34000 + i),
            latitude: 41.0082 + (Math.random() - 0.5) * 0.1,
            longitude: 28.9784 + (Math.random() - 0.5) * 0.1,
            businessHours: {
              monday: { open: '09:00', close: '18:00', isOpen: true },
              tuesday: { open: '09:00', close: '18:00', isOpen: true },
              wednesday: { open: '09:00', close: '18:00', isOpen: true },
              thursday: { open: '09:00', close: '18:00', isOpen: true },
              friday: { open: '09:00', close: '18:00', isOpen: true },
              saturday: { open: '10:00', close: '16:00', isOpen: true },
              sunday: { open: '10:00', close: '14:00', isOpen: false }
            },
            timezone: 'Europe/Istanbul',
            primaryColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            tags: [businessData.type, businessData.city.toLowerCase()],
            isActive: true,
            isVerified: true,
            verifiedAt: new Date()
          }
        });
        console.log(`   ✅ Created business: ${business.name}`);
      } else {
        console.log(`   ℹ️  Business already exists: ${business.name}`);
      }

      // Create subscription
      await prisma.businessSubscription.upsert({
        where: { businessId: business.id },
        update: {},
        create: {
          id: generateId('sub'),
          businessId: business.id,
          planId: subscriptionPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false
        }
      });

      // Create services
      const serviceTemplates = SERVICE_TEMPLATES[businessData.type] || SERVICE_TEMPLATES.hair_salon;
      const existingServices = await prisma.service.findMany({
        where: { businessId: business.id }
      });

      if (existingServices.length === 0) {
        for (const serviceTemplate of serviceTemplates) {
          await prisma.service.create({
            data: {
              id: generateId('service'),
              businessId: business.id,
              name: serviceTemplate.name,
              description: serviceTemplate.description,
              duration: serviceTemplate.duration,
              price: serviceTemplate.price,
              currency: 'TRY',
              isActive: true,
              sortOrder: serviceTemplates.indexOf(serviceTemplate)
            }
          });
        }
        console.log(`   ✅ Created ${serviceTemplates.length} services`);
      } else {
        console.log(`   ℹ️  Services already exist (${existingServices.length} services)`);
      }

      // Create staff members (2-3 per business)
      const services = await prisma.service.findMany({
        where: { businessId: business.id }
      });

      const numStaff = 2 + Math.floor(Math.random() * 2); // 2-3 staff
      const existingStaff = await prisma.businessStaff.findMany({
        where: { businessId: business.id }
      });

      if (existingStaff.length === 0) {
        for (let j = 0; j < numStaff; j++) {
          const staffName = STAFF_NAMES[j % STAFF_NAMES.length];
          const staffPhone = `+90555${String(3000000 + i * 10 + j).padStart(7, '0')}`;
          
          let staffUser = await prisma.user.findUnique({
            where: { phoneNumber: staffPhone }
          });

          if (!staffUser) {
            staffUser = await prisma.user.create({
              data: {
                id: generateId('user'),
                phoneNumber: staffPhone,
                firstName: staffName.firstName,
                lastName: staffName.lastName,
                timezone: 'Europe/Istanbul',
                language: 'tr',
                isVerified: true,
                isActive: true,
                updatedAt: new Date()
              }
            });
          }

          const staffRole = j === 0 ? BusinessStaffRole.MANAGER : BusinessStaffRole.STAFF;
          const createdStaff = await prisma.businessStaff.create({
            data: {
              id: generateId('staff'),
              businessId: business.id,
              userId: staffUser.id,
              role: staffRole,
              isActive: true
            }
          });

          // Assign staff to some services
          const servicesToAssign = services.slice(0, Math.min(services.length, 2 + Math.floor(Math.random() * 2)));
          for (const service of servicesToAssign) {
            await prisma.serviceStaff.upsert({
              where: {
                serviceId_staffId: {
                  serviceId: service.id,
                  staffId: createdStaff.id
                }
              },
              update: {},
              create: {
                id: generateId('svcstaff'),
                serviceId: service.id,
                staffId: createdStaff.id,
                isActive: true
              }
            });
          }
        }
        console.log(`   ✅ Created ${numStaff} staff members`);
      } else {
        console.log(`   ℹ️  Staff already exists (${existingStaff.length} staff)`);
      }

      // Create working hours for business
      const existingWorkingHours = await prisma.workingHours.findMany({
        where: { businessId: business.id, staffId: null }
      });

      if (existingWorkingHours.length === 0) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNumbers = [1, 2, 3, 4, 5, 6, 0];
        const businessHours = business.businessHours as any;

        for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
          const dayName = days[dayIdx];
          const dayNumber = dayNumbers[dayIdx];
          const dayHours = businessHours[dayName];

          if (dayHours && dayHours.isOpen) {
            await prisma.workingHours.create({
              data: {
                id: generateId('wh'),
                businessId: business.id,
                dayOfWeek: dayNumber,
                startTime: dayHours.open,
                endTime: dayHours.close,
                isActive: true
              }
            });
          }
        }
        console.log(`   ✅ Created working hours`);
      }

      // Create appointments (past and future)
      const allStaff = await prisma.businessStaff.findMany({
        where: { businessId: business.id }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create appointments for the past 30 days and next 14 days
      const appointmentsCreated: any[] = [];
      const appointmentsPerDay = 3 + Math.floor(Math.random() * 5); // 3-7 appointments per day

      for (let dayOffset = -30; dayOffset <= 14; dayOffset++) {
        const appointmentDate = new Date(today);
        appointmentDate.setDate(today.getDate() + dayOffset);
        
        // Skip if business is closed on this day
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][appointmentDate.getDay()];
        const businessHours = business.businessHours as any;
        const dayHours = businessHours[dayName];
        
        if (!dayHours || !dayHours.isOpen) {
          continue;
        }

        const openHour = parseInt(dayHours.open.split(':')[0]);
        const closeHour = parseInt(dayHours.close.split(':')[0]);

        // Create appointments for this day
        const numAppointments = dayOffset < 0 ? appointmentsPerDay : Math.floor(appointmentsPerDay * 0.7);
        
        for (let aptIdx = 0; aptIdx < numAppointments; aptIdx++) {
          const service = services[Math.floor(Math.random() * services.length)];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const staff = allStaff.length > 0 ? allStaff[Math.floor(Math.random() * allStaff.length)] : null;

          // Random time within business hours
          const hour = openHour + Math.floor(Math.random() * (closeHour - openHour - 1));
          const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
          
          const startTime = new Date(appointmentDate);
          startTime.setHours(hour, minute, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + service.duration);

          // Determine status based on date
          let status: AppointmentStatus;
          if (dayOffset < 0) {
            // Past appointments
            const rand = Math.random();
            if (rand < 0.7) status = AppointmentStatus.COMPLETED;
            else if (rand < 0.85) status = AppointmentStatus.CANCELED;
            else status = AppointmentStatus.NO_SHOW;
          } else if (dayOffset === 0) {
            // Today - mostly confirmed, some pending
            status = Math.random() < 0.8 ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING;
          } else {
            // Future - pending or confirmed
            status = Math.random() < 0.7 ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING;
          }

          try {
            const appointment = await prisma.appointment.create({
              data: {
                id: generateId('apt'),
                businessId: business.id,
                serviceId: service.id,
                staffId: staff?.id || null,
                customerId: customer.id,
                date: appointmentDate,
                startTime,
                endTime,
                duration: service.duration,
                status,
                price: service.price,
                currency: 'TRY',
                customerNotes: Math.random() < 0.3 ? 'Özel notlar' : null,
                internalNotes: Math.random() < 0.2 ? 'İç notlar' : null,
                bookedAt: new Date(startTime.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                confirmedAt: status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.COMPLETED ? 
                  new Date(startTime.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000) : null,
                completedAt: status === AppointmentStatus.COMPLETED ? endTime : null,
                canceledAt: status === AppointmentStatus.CANCELED ? 
                  new Date(startTime.getTime() - Math.random() * 12 * 60 * 60 * 1000) : null,
                cancelReason: status === AppointmentStatus.CANCELED ? 'Müşteri iptali' : null,
                reminderSent: status !== AppointmentStatus.CANCELED && Math.random() < 0.8,
                reminderSentAt: status !== AppointmentStatus.CANCELED && Math.random() < 0.8 ? 
                  new Date(startTime.getTime() - Math.random() * 24 * 60 * 60 * 1000) : null
              }
            });

            appointmentsCreated.push(appointment);

            // Create payment for completed/confirmed appointments
            if (status === AppointmentStatus.COMPLETED || (status === AppointmentStatus.CONFIRMED && dayOffset < 0)) {
              await prisma.appointment_payments.create({
                data: {
                  id: generateId('pay'),
                  appointmentId: appointment.id,
                  amount: service.price,
                  currency: 'TRY',
                  status: status === AppointmentStatus.COMPLETED ? PaymentStatus.SUCCEEDED : PaymentStatus.PENDING,
                  paymentMethod: ['card', 'cash', 'bank_transfer'][Math.floor(Math.random() * 3)],
                  paidAt: status === AppointmentStatus.COMPLETED ? endTime : null
                }
              });
            }
          } catch (error) {
            // Skip if there's an overlap or other error
            continue;
          }
        }
      }

      console.log(`   ✅ Created ${appointmentsCreated.length} appointments`);

      // Create reviews for completed appointments
      const completedAppointments = appointmentsCreated.filter(apt => apt.status === AppointmentStatus.COMPLETED);
      const reviewsToCreate = Math.min(completedAppointments.length, Math.floor(completedAppointments.length * 0.6)); // 60% review rate

      let reviewsCreated = 0;
      for (let revIdx = 0; revIdx < reviewsToCreate; revIdx++) {
        const appointment = completedAppointments[revIdx];
        
        // Check if review already exists
        const existingReview = await prisma.customerEvaluation.findFirst({
          where: { appointmentId: appointment.id }
        });

        if (existingReview) continue;

        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars (mostly positive)
        const hasComment = Math.random() < 0.7;

        await prisma.customerEvaluation.create({
          data: {
            id: generateId('eval'),
            customerId: appointment.customerId,
            businessId: business.id,
            appointmentId: appointment.id,
            rating,
            comment: hasComment ? REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)] : null,
            isAnonymous: Math.random() < 0.1 // 10% anonymous
          }
        });

        reviewsCreated++;
      }

      console.log(`   ✅ Created ${reviewsCreated} reviews`);

      // Update business rating
      const allReviews = await prisma.customerEvaluation.findMany({
        where: { businessId: business.id }
      });

      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await prisma.business.update({
          where: { id: business.id },
          data: {
            averageRating: Math.round(avgRating * 10) / 10,
            totalRatings: allReviews.length,
            lastRatingAt: new Date()
          }
        });
        console.log(`   ✅ Updated business rating: ${Math.round(avgRating * 10) / 10}/5 (${allReviews.length} reviews)`);
      }
    }

    console.log('\n🎉 Successfully created 10 businesses with reviews, bookings, and related data!');
    console.log('\n📊 Summary:');
    const totalBusinesses = await prisma.business.count();
    const totalAppointments = await prisma.appointment.count();
    const totalReviews = await prisma.customerEvaluation.count();
    const totalServices = await prisma.service.count();
    const totalStaff = await prisma.businessStaff.count();
    
    console.log(`   • Businesses: ${totalBusinesses}`);
    console.log(`   • Services: ${totalServices}`);
    console.log(`   • Staff: ${totalStaff}`);
    console.log(`   • Appointments: ${totalAppointments}`);
    console.log(`   • Reviews: ${totalReviews}`);

  } catch (error) {
    console.error('❌ Error seeding 10 businesses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seed10Businesses()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { seed10Businesses };

