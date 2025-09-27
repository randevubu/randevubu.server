const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateExistingWorkingHours() {
  try {
    console.log('🔄 Migrating existing businesses to WorkingHours table...\n');

    // Get all active businesses that have businessHours but no WorkingHours records
    const businesses = await prisma.business.findMany({
      where: {
        isActive: true,
        businessHours: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        businessHours: true
      }
    });

    console.log(`📋 Found ${businesses.length} businesses with businessHours JSON:`);

    for (const business of businesses) {
      console.log(`  - ${business.name} (${business.id})`);

      // Check if working hours already exist
      const existingHours = await prisma.workingHours.findFirst({
        where: {
          businessId: business.id,
          staffId: null
        }
      });

      if (existingHours) {
        console.log(`    ✅ Already has working hours records`);
        continue;
      }

      // Convert JSON to WorkingHours records
      const businessHours = business.businessHours;
      const dayOfWeekMap = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0
      };

      const workingHoursData = [];

      for (const [dayName, dayHours] of Object.entries(businessHours)) {
        if (!dayHours || !dayOfWeekMap.hasOwnProperty(dayName)) continue;

        const dayOfWeek = dayOfWeekMap[dayName];

        // Only create records for days that are open
        if (dayHours.isOpen && dayHours.openTime && dayHours.closeTime) {
          workingHoursData.push({
            id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            businessId: business.id,
            staffId: null,
            dayOfWeek,
            startTime: dayHours.openTime,
            endTime: dayHours.closeTime,
            isActive: true,
            breaks: dayHours.breaks ? JSON.stringify(dayHours.breaks) : null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      if (workingHoursData.length > 0) {
        await prisma.workingHours.createMany({
          data: workingHoursData,
          skipDuplicates: true
        });
        console.log(`    ✅ Created ${workingHoursData.length} working hours records`);
      } else {
        console.log(`    ⚠️  No open days found in businessHours`);
      }
    }

    // Also migrate existing staff to have working hours
    console.log('\n🔄 Creating working hours for existing staff...\n');

    const staffMembers = await prisma.businessStaff.findMany({
      where: {
        isActive: true,
        leftAt: null,
        business: {
          isActive: true
        }
      },
      include: {
        business: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`📋 Found ${staffMembers.length} active staff members:`);

    for (const staff of staffMembers) {
      console.log(`  - Staff ${staff.id} in ${staff.business.name}`);

      // Check if staff working hours already exist
      const existingStaffHours = await prisma.workingHours.findFirst({
        where: {
          businessId: staff.businessId,
          staffId: staff.id
        }
      });

      if (existingStaffHours) {
        console.log(`    ✅ Already has working hours records`);
        continue;
      }

      // Get business working hours
      const businessHours = await prisma.workingHours.findMany({
        where: {
          businessId: staff.businessId,
          staffId: null,
          isActive: true
        }
      });

      if (businessHours.length === 0) {
        console.log(`    ⚠️  Business has no working hours to copy`);
        continue;
      }

      // Copy business hours to staff
      const staffHoursData = businessHours.map(bh => ({
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: staff.businessId,
        staffId: staff.id,
        dayOfWeek: bh.dayOfWeek,
        startTime: bh.startTime,
        endTime: bh.endTime,
        isActive: true,
        breaks: bh.breaks,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.workingHours.createMany({
        data: staffHoursData,
        skipDuplicates: true
      });

      console.log(`    ✅ Created ${staffHoursData.length} working hours records`);
    }

    console.log('\n🎉 Migration completed successfully!');

    // Show summary
    const totalWorkingHours = await prisma.workingHours.count();
    const businessHours = await prisma.workingHours.count({
      where: { staffId: null }
    });
    const staffHours = await prisma.workingHours.count({
      where: { staffId: { not: null } }
    });

    console.log('\n📊 Summary:');
    console.log(`   Total working hours records: ${totalWorkingHours}`);
    console.log(`   Business hours: ${businessHours}`);
    console.log(`   Staff hours: ${staffHours}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingWorkingHours();