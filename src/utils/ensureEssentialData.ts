import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Ensures essential database data exists for production
 * This runs automatically on app startup to handle Render free tier limitations
 */
export async function ensureEssentialData(prisma: PrismaClient): Promise<void> {
  try {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') {
      logger.info('⏭️  Skipping database seeding - not in production mode');
      return;
    }

    logger.info('🔍 Checking essential database data...');

    // Test database connection first
    await prisma.$connect();
    logger.info('✅ Database connection established');

    // Ensure CUSTOMER role exists (critical for user registration)
    const customerRole = await prisma.role.findUnique({
      where: { name: 'CUSTOMER' }
    });

    if (!customerRole) {
      logger.info('⚠️  CUSTOMER role missing, creating all essential roles...');

      const rolesData = [
        {
          id: `role_customer_${Date.now()}`,
          name: 'CUSTOMER',
          displayName: 'Customer',
          description: 'Customer - can book appointments and view business information',
          level: 100,
          isSystem: true,
          isActive: true
        },
        {
          id: `role_owner_${Date.now() + 1}`,
          name: 'OWNER',
          displayName: 'Business Owner',
          description: 'Business owner - can manage their own business, services, staff and appointments',
          level: 300,
          isSystem: true,
          isActive: true
        },
        {
          id: `role_staff_${Date.now() + 2}`,
          name: 'STAFF',
          displayName: 'Business Staff',
          description: 'Business staff member - can manage appointments and services for assigned business',
          level: 200,
          isSystem: true,
          isActive: true
        },
        {
          id: `role_admin_${Date.now() + 3}`,
          name: 'ADMIN',
          displayName: 'Platform Administrator',
          description: 'Full platform administrative access - can manage all businesses and users',
          level: 1000,
          isSystem: true,
          isActive: true
        }
      ];

      const result = await prisma.role.createMany({
        data: rolesData,
        skipDuplicates: true
      });

      logger.info(`✅ Created ${result.count} essential roles successfully`);

      // Verify roles were created
      const roleCount = await prisma.role.count();
      logger.info(`📊 Total roles in database: ${roleCount}`);
    } else {
      logger.info('✅ Essential roles already exist');

      // Log existing roles for verification
      const allRoles = await prisma.role.findMany({
        select: { name: true, isActive: true }
      });
      logger.info(`📊 Existing roles: ${allRoles.map(r => r.name).join(', ')}`);
    }

    // Ensure at least one subscription plan exists
    const planCount = await prisma.subscriptionPlan.count();

    if (planCount === 0) {
      logger.info('⚠️  No subscription plans found, creating starter plan...');

      await prisma.subscriptionPlan.create({
        data: {
          id: 'plan_starter_monthly',
          name: 'starter',
          displayName: 'Starter Plan',
          description: 'Perfect for small businesses just getting started',
          price: 750.00,
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
            smsQuota: 1000
          },
          isActive: true,
          sortOrder: 1
        }
      });

      logger.info('✅ Starter subscription plan created');
    } else {
      logger.info('✅ Subscription plans already exist');
    }

    // Check for users without roles and assign CUSTOMER role
    const usersWithoutRoles = await prisma.user.findMany({
      where: {
        userRoles: {
          none: {}
        }
      },
      select: {
        id: true,
        phoneNumber: true
      }
    });

    if (usersWithoutRoles.length > 0) {
      logger.info(`⚠️  Found ${usersWithoutRoles.length} users without roles, assigning CUSTOMER role...`);

      const customerRole = await prisma.role.findUnique({
        where: { name: 'CUSTOMER' }
      });

      if (customerRole) {
        for (const user of usersWithoutRoles) {
          try {
            await prisma.userRole.create({
              data: {
                id: `user_role_${user.id}_${Date.now()}`,
                userId: user.id,
                roleId: customerRole.id,
                grantedBy: user.id, // Self-assigned
                grantedAt: new Date(),
                isActive: true
              }
            });
            logger.info(`✅ Assigned CUSTOMER role to user: ${user.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`);
          } catch (error) {
            logger.warn(`⚠️  Failed to assign role to user ${user.id}:`, error);
          }
        }
      } else {
        logger.error('❌ CUSTOMER role not found, cannot assign to users');
      }
    } else {
      logger.info('✅ All users have roles assigned');
    }

    logger.info('✅ Essential data check completed');

  } catch (error) {
    logger.error('❌ Failed to ensure essential data:', error);
    // Don't throw - let app start even if this fails
  }
}