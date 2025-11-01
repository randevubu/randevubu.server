import { PrismaClient } from '@prisma/client';
import logger from '../utils/Logger/logger';

/**
 * Startup service for application initialization
 * Handles essential data checks and production setup
 */
export class StartupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Ensures essential database data exists for production
   * This runs automatically on app startup to handle Render free tier limitations
   */
  async ensureEssentialData(): Promise<void> {
    try {
      // Only run in production
      if (process.env.NODE_ENV !== 'production') {
        logger.info('⏭️  Skipping database seeding - not in production mode');
        return;
      }

      logger.info('🔍 Checking essential database data...');

      // Test database connection first
      await this.prisma.$connect();
      logger.info('✅ Database connection established');

      // Ensure CUSTOMER role exists (critical for user registration)
      const customerRole = await this.prisma.role.findUnique({
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

        const result = await this.prisma.role.createMany({
          data: rolesData,
          skipDuplicates: true
        });

        logger.info(`✅ Created ${result.count} essential roles successfully`);

        // Verify roles were created
        const roleCount = await this.prisma.role.count();
        logger.info(`📊 Total roles in database: ${roleCount}`);
      } else {
        logger.info('✅ Essential roles already exist');

        // Log existing roles for verification
        const allRoles = await this.prisma.role.findMany({
          select: { name: true, isActive: true }
        });
        logger.info(`📊 Existing roles: ${allRoles.map(r => r.name).join(', ')}`);
      }

      // Ensure all 3 subscription plans exist
      const planCount = await this.prisma.subscriptionPlan.count();

      if (planCount < 3) {
        logger.info(`⚠️  Found ${planCount} subscription plans, creating missing plans...`);

        const plansToCreate = [
          {
            id: 'plan_basic_tier1',
            name: 'basic_tier1',
            displayName: 'Basic Plan',
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
              pricingTier: 'TIER_1'
            },
            isActive: true,
            sortOrder: 1
          },
          {
            id: 'plan_premium_tier1',
            name: 'premium_tier1',
            displayName: 'Premium Plan',
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
              pricingTier: 'TIER_1'
            },
            isActive: true,
            isPopular: true,
            sortOrder: 2
          },
          {
            id: 'plan_basic_tier2',
            name: 'basic_tier2',
            displayName: 'Basic Plan',
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
              pricingTier: 'TIER_2'
            },
            isActive: true,
            sortOrder: 3
          },
          {
            id: 'plan_premium_tier2',
            name: 'premium_tier2',
            displayName: 'Premium Plan',
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
              pricingTier: 'TIER_2'
            },
            isActive: true,
            sortOrder: 4
          },
          {
            id: 'plan_basic_tier3',
            name: 'basic_tier3',
            displayName: 'Basic Plan',
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
              pricingTier: 'TIER_3'
            },
            isActive: true,
            sortOrder: 5
          },
          {
            id: 'plan_premium_tier3',
            name: 'premium_tier3',
            displayName: 'Premium Plan',
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
              pricingTier: 'TIER_3'
            },
            isActive: true,
            sortOrder: 6
          }
        ];

        // Create each plan using upsert to avoid duplicates
        for (const plan of plansToCreate) {
          try {
            await this.prisma.subscriptionPlan.upsert({
              where: { name: plan.name },
              update: {}, // Don't update if exists
              create: plan
            });
            logger.info(`✅ Created/verified ${plan.displayName}`);
          } catch (error) {
            logger.warn(`⚠️  Failed to create ${plan.displayName}:`, error);
          }
        }

        // Verify final count
        const finalPlanCount = await this.prisma.subscriptionPlan.count();
        logger.info(`📊 Total subscription plans: ${finalPlanCount}`);
      } else {
        logger.info('✅ All subscription plans already exist');

        // Log existing plans for verification
        const allPlans = await this.prisma.subscriptionPlan.findMany({
          select: { name: true, displayName: true, price: true }
        });
        logger.info(`📊 Existing plans: ${allPlans.map(p => `${p.displayName} (${p.price} TRY)`).join(', ')}`);
      }

      // Check for users without roles and assign CUSTOMER role
      const usersWithoutRoles = await this.prisma.user.findMany({
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

        const customerRole = await this.prisma.role.findUnique({
          where: { name: 'CUSTOMER' }
        });

        if (customerRole) {
          for (const user of usersWithoutRoles) {
            try {
              await this.prisma.userRole.create({
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

  /**
   * Initialize application startup procedures
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Starting application initialization...');
    
    // Ensure essential data exists
    await this.ensureEssentialData();
    
    logger.info('✅ Application initialization completed');
  }
}


