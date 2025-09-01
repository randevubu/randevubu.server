import { PrismaClient, AppointmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Generate ID helper
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Sample customer data
const SAMPLE_CUSTOMERS = [
  {
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    phoneNumber: '+905551234567',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Ayşe',
    lastName: 'Demir',
    phoneNumber: '+905551234568',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Mehmet',
    lastName: 'Kaya',
    phoneNumber: '+905551234569',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Fatma',
    lastName: 'Özkan',
    phoneNumber: '+905551234570',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Ali',
    lastName: 'Çelik',
    phoneNumber: '+905551234571',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Zeynep',
    lastName: 'Arslan',
    phoneNumber: '+905551234572',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Mustafa',
    lastName: 'Şahin',
    phoneNumber: '+905551234573',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Elif',
    lastName: 'Koç',
    phoneNumber: '+905551234574',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Hasan',
    lastName: 'Özdemir',
    phoneNumber: '+905551234575',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  },
  {
    firstName: 'Selin',
    lastName: 'Yıldız',
    phoneNumber: '+905551234576',
    timezone: 'Europe/Istanbul',
    language: 'tr'
  }
];

// Sample appointment data with realistic scenarios
const SAMPLE_APPOINTMENTS = [
  {
    status: AppointmentStatus.CONFIRMED,
    customerNotes: 'First time visit, please be gentle',
    internalNotes: 'New customer, ensure excellent service',
    reminderSent: true
  },
  {
    status: AppointmentStatus.COMPLETED,
    customerNotes: 'Regular customer, prefers same stylist',
    internalNotes: 'Returning customer, very satisfied with previous service',
    reminderSent: true
  },
  {
    status: AppointmentStatus.CONFIRMED,
    customerNotes: 'Need consultation before booking full service',
    internalNotes: 'Customer wants to discuss options first',
    reminderSent: false
  },
  {
    status: AppointmentStatus.CONFIRMED,
    customerNotes: 'Birthday appointment, please make it special',
    internalNotes: 'Birthday customer, add extra care and attention',
    reminderSent: true
  },
  {
    status: AppointmentStatus.CANCELED,
    customerNotes: 'Emergency came up, will reschedule',
    internalNotes: 'Customer called to cancel, very polite about it',
    reminderSent: true,
    cancelReason: 'Emergency situation'
  },
  {
    status: AppointmentStatus.CONFIRMED,
    customerNotes: 'Running 10 minutes late due to traffic',
    internalNotes: 'Customer informed about delay, staff aware',
    reminderSent: true
  },
  {
    status: AppointmentStatus.NO_SHOW,
    customerNotes: 'No response to reminder calls',
    internalNotes: 'Customer did not show up, no contact made',
    reminderSent: true
  },
  {
    status: AppointmentStatus.COMPLETED,
    customerNotes: 'Very happy with previous service, booking again',
    internalNotes: 'Repeat customer, high satisfaction rating',
    reminderSent: true
  },
  {
    status: AppointmentStatus.CONFIRMED,
    customerNotes: 'Need to check availability for next week',
    internalNotes: 'Customer checking options, follow up needed',
    reminderSent: false
  },
  {
    status: AppointmentStatus.CONFIRMED,
    customerNotes: 'Group booking for family of 4',
    internalNotes: 'Family appointment, ensure consecutive slots',
    reminderSent: true
  }
];

// Helper function to get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random boolean
const getRandomBoolean = (): boolean => {
  return Math.random() > 0.5;
};

// Helper function to parse time string (e.g., "09:00") to hour number
const parseTimeToHour = (timeString: string): number => {
  return parseInt(timeString.split(':')[0], 10);
};

// Helper function to get business hours for today
const getBusinessHoursForToday = (businessHours: any): { open: number, close: number, isOpen: boolean } => {
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[today.getDay()];
  
  const todayHours = businessHours[todayName];
  if (!todayHours || !todayHours.isOpen) {
    return { open: 9, close: 17, isOpen: false };
  }
  
  const openHour = parseTimeToHour(todayHours.open);
  const closeHour = parseTimeToHour(todayHours.close);
  
  if (openHour >= closeHour) {
    console.log(`⚠️  Invalid business hours for ${todayName}: ${todayHours.open} - ${todayHours.close}, using defaults`);
    return { open: 9, close: 17, isOpen: true };
  }
  
  return {
    open: openHour,
    close: closeHour,
    isOpen: true
  };
};

// Helper function to create time slots
const createTimeSlots = (openHour: number, closeHour: number, slotDuration: number = 15): Date[] => {
  const slots: Date[] = [];
  const today = new Date(2025, 7, 23); // August 23rd (month is 0-indexed, so 7 = August)
  today.setHours(0, 0, 0, 0); // Start of today
  
  for (let hour = openHour; hour < closeHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slot = new Date(today);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }
  }
  
  return slots;
};

export async function seedCustomersAndAppointments() {
  console.log('\n🌱 Starting customers and appointments seeding...');

  try {
    // Clear existing appointments to start fresh
    console.log('🧹 Clearing existing appointments...');
    await prisma.appointment_payments.deleteMany();
    await prisma.appointment.deleteMany();
    console.log('✅ Cleared existing appointments');

    // Get existing businesses and services
    const businesses = await prisma.business.findMany({
      include: {
        services: true,
        staff: {
          include: {
            user: true
          }
        }
      }
    });

    if (businesses.length === 0) {
      console.log('⚠️  No businesses found. Please run business seeding first.');
      return;
    }

    // Filter businesses that have services
    const businessesWithServices = businesses.filter(b => b.services && b.services.length > 0);
    
    if (businessesWithServices.length === 0) {
      console.log('⚠️  No businesses with services found. Please run business seeding first.');
      return;
    }
    
    console.log(`📊 Found ${businessesWithServices.length} businesses with services`);

    // Create or find customers
    const customers: any[] = [];
    for (const customerData of SAMPLE_CUSTOMERS) {
      let customer = await prisma.user.findUnique({
        where: { phoneNumber: customerData.phoneNumber }
      });

      if (!customer) {
        customer = await prisma.user.create({
          data: {
            id: generateId('user'),
            ...customerData,
            isVerified: true,
            isActive: true,
            updatedAt: new Date()
          }
        });
        console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName}`);
      } else {
        console.log(`ℹ️  Customer already exists: ${customer.firstName} ${customer.lastName}`);
      }

      customers.push(customer);

      // Create user behavior record for each customer
      await prisma.userBehavior.upsert({
        where: { userId: customer.id },
        update: {},
        create: {
          id: generateId('ub'),
          userId: customer.id,
          totalAppointments: Math.floor(Math.random() * 20) + 1,
          canceledAppointments: Math.floor(Math.random() * 5),
          noShowAppointments: Math.floor(Math.random() * 3),
          completedAppointments: Math.floor(Math.random() * 15) + 1,
          currentStrikes: Math.floor(Math.random() * 2),
          isBanned: false,
          updatedAt: new Date()
        }
      });
    }

    console.log(`👥 Processed ${customers.length} customers`);

    // Create appointments for each business
    const appointmentsCreated: any[] = [];
    const now = new Date();
    // Force the date to be August 23rd for consistent testing
    const today = new Date(2025, 7, 23); // August 23rd (month is 0-indexed, so 7 = August)

    console.log(`📅 Creating appointments for ${today.toDateString()}`);

    for (const business of businessesWithServices) {
      const businessHours = getBusinessHoursForToday(business.businessHours);
      
      if (!businessHours.isOpen) {
        console.log(`🏢 ${business.name} is closed today, skipping appointments`);
        continue;
      }
      
      const openTime = businessHours.open;
      const closeTime = businessHours.close;
      
      console.log(`🏢 Creating appointments for ${business.name} (${openTime}:00 - ${closeTime}:00)`);
      
      // Create time slots for the business day
      const timeSlots = createTimeSlots(openTime, closeTime, 15); // 15-minute slots
      
      // Track used time slots to prevent overlaps
      const usedSlots: { start: Date; end: Date }[] = [];
      let appointmentCount = 0;
      // Normal appointment density - aim for 60-70% capacity (realistic for most businesses)
      let targetCapacity = 0.65; // 65% capacity
      
      // Give Modern Barber Shop slightly higher capacity for testing
      if (business.name === 'Modern Barber Shop') {
        targetCapacity = 0.75; // 75% capacity for the main test business
        console.log(`   🚀 Modern Barber Shop detected - using higher capacity for better testing data`);
      }
      
      const maxAppointments = Math.floor(timeSlots.length * targetCapacity);
      
      console.log(`   📊 Target: ${maxAppointments} appointments (${Math.round(targetCapacity * 100)}% capacity)`);
      
      // Create appointments with realistic spacing
      const appointmentTargets = Math.min(maxAppointments, customers.length * 2); // Max 2 appointments per customer
      
      for (let i = 0; i < appointmentTargets; i++) {
        // Pick a random time slot
        let attempts = 0;
        let slot: Date | null = null;
        let service = getRandomItem(business.services);
        
        // Try to find an available slot (max 50 attempts to avoid infinite loops)
        while (attempts < 50) {
          const randomSlot = getRandomItem(timeSlots);
          const endTime = new Date(randomSlot.getTime() + service.duration * 60 * 1000);
          
          // Ensure end time doesn't exceed business hours
          if (endTime.getHours() >= closeTime) {
            attempts++;
            continue;
          }
          
          // Check if this slot overlaps with any existing appointments
          const hasOverlap = usedSlots.some(usedSlot => {
            return (randomSlot < usedSlot.end && endTime > usedSlot.start);
          });
          
          if (!hasOverlap) {
            slot = randomSlot;
            break;
          }
          
          attempts++;
        }
        
        // If we couldn't find a slot, skip this appointment
        if (!slot) {
          continue;
        }
        
        const endTime = new Date(slot.getTime() + service.duration * 60 * 1000);
        const customer = getRandomItem(customers);
        const appointmentData = getRandomItem(SAMPLE_APPOINTMENTS);
        const staff = business.staff.length > 0 ? getRandomItem(business.staff) : null;
        
        // Adjust appointment status based on time
        let finalStatus = appointmentData.status;
        
        if (slot > now) {
          // Future appointment - only pending or confirmed
          if (appointmentData.status === AppointmentStatus.COMPLETED || 
              appointmentData.status === AppointmentStatus.NO_SHOW) {
            finalStatus = getRandomBoolean() ? AppointmentStatus.CONFIRMED : AppointmentStatus.CONFIRMED;
          }
        } else {
          // Past appointment - can be any status
          if (appointmentData.status === AppointmentStatus.CONFIRMED) {
            finalStatus = getRandomItem([
              AppointmentStatus.COMPLETED, 
              AppointmentStatus.COMPLETED, // Higher chance of completed
              AppointmentStatus.COMPLETED,
              AppointmentStatus.NO_SHOW, 
              AppointmentStatus.CANCELED
            ]);
          }
        }
        
        // Create appointment
        const appointment = await prisma.appointment.create({
          data: {
            id: generateId('apt'),
            businessId: business.id,
            serviceId: service.id,
            staffId: staff?.id || null,
            customerId: customer.id,
            date: today,
            startTime: slot,
            endTime: endTime,
            duration: service.duration,
            status: finalStatus,
            price: service.price,
            currency: service.currency,
            customerNotes: appointmentData.customerNotes,
            internalNotes: appointmentData.internalNotes,
            bookedAt: new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            confirmedAt: finalStatus === AppointmentStatus.CONFIRMED || finalStatus === AppointmentStatus.COMPLETED ? 
              new Date(today.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null,
            completedAt: finalStatus === AppointmentStatus.COMPLETED ? slot : null,
            canceledAt: finalStatus === AppointmentStatus.CANCELED ? 
              new Date(today.getTime() - Math.random() * 12 * 60 * 60 * 1000) : null,
            cancelReason: finalStatus === AppointmentStatus.CANCELED ? appointmentData.cancelReason : null,
            reminderSent: appointmentData.reminderSent,
            reminderSentAt: appointmentData.reminderSent ? 
              new Date(today.getTime() - Math.random() * 24 * 60 * 60 * 1000) : null
          }
        });

        console.log(`   📅 Appointment ${appointmentCount + 1}: ${customer.firstName} ${customer.lastName} - ${slot.toTimeString().substring(0, 5)} to ${endTime.toTimeString().substring(0, 5)} (${service.duration}min) [${finalStatus}]`);

        // Mark this time slot as used (with some buffer time for realistic spacing)
        const bufferStart = new Date(slot.getTime() - 5 * 60 * 1000); // 5 min buffer before
        const bufferEnd = new Date(endTime.getTime() + 10 * 60 * 1000); // 10 min buffer after
        usedSlots.push({ start: bufferStart, end: bufferEnd });
        
        appointmentsCreated.push(appointment);
        appointmentCount++;

        // Create payment record for completed/confirmed appointments
        if (finalStatus === AppointmentStatus.COMPLETED || 
            finalStatus === AppointmentStatus.CONFIRMED) {
          await prisma.appointment_payments.create({
            data: {
              id: generateId('pay'),
              appointmentId: appointment.id,
              amount: service.price,
              currency: service.currency,
              status: PaymentStatus.SUCCEEDED,
              paymentMethod: getRandomItem(['card', 'cash', 'bank_transfer']),
              paidAt: finalStatus === AppointmentStatus.COMPLETED && appointment.completedAt ? 
                new Date(appointment.completedAt.getTime() + Math.random() * 60 * 60 * 1000) :
                new Date(appointment.startTime.getTime() - Math.random() * 24 * 60 * 60 * 1000)
            }
          });
        }

        // Update user behavior statistics
        if (finalStatus === AppointmentStatus.COMPLETED) {
          await prisma.userBehavior.update({
            where: { userId: customer.id },
            data: {
              completedAppointments: { increment: 1 }
            }
          });
        } else if (finalStatus === AppointmentStatus.CANCELED) {
          await prisma.userBehavior.update({
            where: { userId: customer.id },
            data: {
              canceledAppointments: { increment: 1 }
            }
          });
        } else if (finalStatus === AppointmentStatus.NO_SHOW) {
          await prisma.userBehavior.update({
            where: { userId: customer.id },
            data: {
              noShowAppointments: { increment: 1 }
            }
          });
        }
      }
      
      console.log(`✅ Created ${appointmentCount} appointments for ${business.name}`);
    }

    console.log(`📅 Created ${appointmentsCreated.length} total appointments for ${today.toDateString()}`);

    // Assign CUSTOMER role to all customers
    const customerRole = await prisma.role.findUnique({
      where: { name: 'CUSTOMER' }
    });

    if (customerRole) {
      for (const customer of customers) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: customer.id,
              roleId: customerRole.id
            }
          },
          update: {},
          create: {
            id: generateId('ur'),
            userId: customer.id,
            roleId: customerRole.id,
            isActive: true,
            updatedAt: new Date()
          }
        });
      }
      console.log(`🎭 Assigned CUSTOMER role to ${customers.length} customers`);
    }

    console.log('✅ Customers and appointments seeding completed successfully!');
    
    // Print summary statistics
    const totalAppointments = await prisma.appointment.count();
    const totalCustomers = await prisma.user.count();
    const totalBusinesses = await prisma.business.count();
    
    console.log('\n📊 Seeding Summary:');
    console.log(`   • Total Customers: ${totalCustomers}`);
    console.log(`   • Total Appointments: ${totalAppointments}`);
    console.log(`   • Total Businesses: ${totalBusinesses}`);

  } catch (error) {
    console.error('❌ Customers and appointments seeding failed:', error);
    throw error;
  }
}

