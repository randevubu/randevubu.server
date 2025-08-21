import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate ID helper
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Default system roles for appointment booking system
const DEFAULT_ROLES = [
  {
    id: generateId('role'),
    name: 'ADMIN',
    displayName: 'Platform Administrator',
    description: 'Full platform administrative access - can manage all businesses and users',
    level: 1000,
    isSystem: true,
    isActive: true
  },
  {
    id: generateId('role'),
    name: 'OWNER',
    displayName: 'Business Owner',
    description: 'Business owner - can manage their own business, services, staff and appointments',
    level: 300,
    isSystem: true,
    isActive: true
  },
  {
    id: generateId('role'),
    name: 'STAFF',
    displayName: 'Business Staff',
    description: 'Business staff member - can manage appointments and services for assigned business',
    level: 200,
    isSystem: true,
    isActive: true
  },
  {
    id: generateId('role'),
    name: 'CUSTOMER',
    displayName: 'Customer',
    description: 'Customer - can book appointments and view business information',
    level: 100,
    isSystem: true,
    isActive: true
  }
];

// Comprehensive permission system following enterprise patterns
const DEFAULT_PERMISSIONS = [
  // User Management Permissions
  {
    id: generateId('perm'),
    name: 'user:create',
    displayName: 'Create Users',
    description: 'Create new user accounts',
    resource: 'user',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user:read',
    displayName: 'View Users',
    description: 'View user profiles and information',
    resource: 'user',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user:update',
    displayName: 'Update Users',
    description: 'Modify user profiles and settings',
    resource: 'user',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user:delete',
    displayName: 'Delete Users',
    description: 'Remove user accounts',
    resource: 'user',
    action: 'delete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user:admin',
    displayName: 'Administer Users',
    description: 'Full administrative control over users',
    resource: 'user',
    action: 'admin',
    isSystem: true
  },

  // Role Management Permissions
  {
    id: generateId('perm'),
    name: 'role:create',
    displayName: 'Create Roles',
    description: 'Create new roles',
    resource: 'role',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'role:read',
    displayName: 'View Roles',
    description: 'View roles and permissions',
    resource: 'role',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'role:update',
    displayName: 'Update Roles',
    description: 'Modify existing roles',
    resource: 'role',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'role:delete',
    displayName: 'Delete Roles',
    description: 'Remove roles from system',
    resource: 'role',
    action: 'delete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'role:assign',
    displayName: 'Assign Roles',
    description: 'Assign roles to users',
    resource: 'role',
    action: 'assign',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'role:revoke',
    displayName: 'Revoke Roles',
    description: 'Remove roles from users',
    resource: 'role',
    action: 'revoke',
    isSystem: true
  },

  // Permission Management Permissions
  {
    id: generateId('perm'),
    name: 'permission:create',
    displayName: 'Create Permissions',
    description: 'Create new permissions',
    resource: 'permission',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'permission:read',
    displayName: 'View Permissions',
    description: 'View system permissions',
    resource: 'permission',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'permission:update',
    displayName: 'Update Permissions',
    description: 'Modify existing permissions',
    resource: 'permission',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'permission:delete',
    displayName: 'Delete Permissions',
    description: 'Remove permissions from system',
    resource: 'permission',
    action: 'delete',
    isSystem: true
  },

  // Content Management Permissions
  {
    id: generateId('perm'),
    name: 'content:create',
    displayName: 'Create Content',
    description: 'Create new content',
    resource: 'content',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'content:read',
    displayName: 'View Content',
    description: 'View content and posts',
    resource: 'content',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'content:update',
    displayName: 'Update Content',
    description: 'Modify existing content',
    resource: 'content',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'content:delete',
    displayName: 'Delete Content',
    description: 'Remove content from platform',
    resource: 'content',
    action: 'delete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'content:moderate',
    displayName: 'Moderate Content',
    description: 'Moderate and review content',
    resource: 'content',
    action: 'moderate',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'content:approve',
    displayName: 'Approve Content',
    description: 'Approve content for publication',
    resource: 'content',
    action: 'approve',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'content:reject',
    displayName: 'Reject Content',
    description: 'Reject content submissions',
    resource: 'content',
    action: 'reject',
    isSystem: true
  },

  // System Permissions
  {
    id: generateId('perm'),
    name: 'system:admin',
    displayName: 'System Administration',
    description: 'Full system administrative access',
    resource: 'system',
    action: 'admin',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'system:read',
    displayName: 'System Monitoring',
    description: 'View system status and metrics',
    resource: 'system',
    action: 'read',
    isSystem: true
  },

  // Audit Permissions
  {
    id: generateId('perm'),
    name: 'audit:read',
    displayName: 'View Audit Logs',
    description: 'Access audit logs and system events',
    resource: 'audit',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'audit:admin',
    displayName: 'Administer Audits',
    description: 'Full control over audit system',
    resource: 'audit',
    action: 'admin',
    isSystem: true
  },

  // Support Permissions
  {
    id: generateId('perm'),
    name: 'support:create',
    displayName: 'Create Support Tickets',
    description: 'Create support cases and tickets',
    resource: 'support',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'support:read',
    displayName: 'View Support Cases',
    description: 'View support tickets and cases',
    resource: 'support',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'support:update',
    displayName: 'Update Support Cases',
    description: 'Modify support tickets and responses',
    resource: 'support',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'support:admin',
    displayName: 'Administer Support',
    description: 'Full control over support system',
    resource: 'support',
    action: 'admin',
    isSystem: true
  },

  // Business Management Permissions
  {
    id: generateId('perm'),
    name: 'business:create',
    displayName: 'Create Business',
    description: 'Create new business profiles',
    resource: 'business',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:read',
    displayName: 'View Businesses',
    description: 'View business information and profiles',
    resource: 'business',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:update',
    displayName: 'Update Business',
    description: 'Modify business information and settings',
    resource: 'business',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:delete',
    displayName: 'Delete Business',
    description: 'Remove businesses from the platform',
    resource: 'business',
    action: 'delete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:admin',
    displayName: 'Administer Business',
    description: 'Full administrative control over businesses',
    resource: 'business',
    action: 'admin',
    isSystem: true
  },

  // Business Subscription Permissions (only for platform admins)
  {
    id: generateId('perm'),
    name: 'subscription:create',
    displayName: 'Create Subscription Plans',
    description: 'Create new business subscription plans',
    resource: 'subscription',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:read',
    displayName: 'View Subscriptions',
    description: 'View subscription plans and business subscriptions',
    resource: 'subscription',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:update',
    displayName: 'Update Subscriptions',
    description: 'Modify subscription plans and business subscriptions',
    resource: 'subscription',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:admin',
    displayName: 'Administer Subscriptions',
    description: 'Full control over subscription system',
    resource: 'subscription',
    action: 'admin',
    isSystem: true
  },

  // Appointment Permissions
  {
    id: generateId('perm'),
    name: 'appointment:create',
    displayName: 'Create Appointments',
    description: 'Book new appointments',
    resource: 'appointment',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:read',
    displayName: 'View Appointments',
    description: 'View appointment information',
    resource: 'appointment',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:update',
    displayName: 'Update Appointments',
    description: 'Modify appointment details and status',
    resource: 'appointment',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:delete',
    displayName: 'Cancel Appointments',
    description: 'Cancel and remove appointments',
    resource: 'appointment',
    action: 'delete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:admin',
    displayName: 'Administer Appointments',
    description: 'Full control over appointment system',
    resource: 'appointment',
    action: 'admin',
    isSystem: true
  },

  // Service Management Permissions
  {
    id: generateId('perm'),
    name: 'service:create',
    displayName: 'Create Services',
    description: 'Add new services to business',
    resource: 'service',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'service:read',
    displayName: 'View Services',
    description: 'View service information and pricing',
    resource: 'service',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'service:update',
    displayName: 'Update Services',
    description: 'Modify service details and pricing',
    resource: 'service',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'service:delete',
    displayName: 'Delete Services',
    description: 'Remove services from business',
    resource: 'service',
    action: 'delete',
    isSystem: true
  },

  // Staff Management Permissions
  {
    id: generateId('perm'),
    name: 'staff:create',
    displayName: 'Add Staff',
    description: 'Add staff members to business',
    resource: 'staff',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'staff:read',
    displayName: 'View Staff',
    description: 'View staff information and schedules',
    resource: 'staff',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'staff:update',
    displayName: 'Update Staff',
    description: 'Modify staff details and permissions',
    resource: 'staff',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'staff:delete',
    displayName: 'Remove Staff',
    description: 'Remove staff members from business',
    resource: 'staff',
    action: 'delete',
    isSystem: true
  },

  // User Behavior Management Permissions
  {
    id: generateId('perm'),
    name: 'user_behavior:read',
    displayName: 'View User Behavior',
    description: 'View user cancellation and no-show statistics',
    resource: 'user_behavior',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_behavior:update',
    displayName: 'Update User Behavior',
    description: 'Update user behavior scores and strikes',
    resource: 'user_behavior',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_behavior:moderate',
    displayName: 'Moderate Users',
    description: 'Ban/unban users and manage strikes',
    resource: 'user_behavior',
    action: 'moderate',
    isSystem: true
  },

  // Business Closure Permissions
  {
    id: generateId('perm'),
    name: 'business_closure:create',
    displayName: 'Create Business Closures',
    description: 'Schedule business closures and vacations',
    resource: 'business_closure',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_closure:read',
    displayName: 'View Business Closures',
    description: 'View business closure schedules',
    resource: 'business_closure',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_closure:update',
    displayName: 'Update Business Closures',
    description: 'Modify business closure schedules',
    resource: 'business_closure',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_closure:delete',
    displayName: 'Cancel Business Closures',
    description: 'Cancel scheduled business closures',
    resource: 'business_closure',
    action: 'delete',
    isSystem: true
  },

  // Analytics Permissions
  {
    id: generateId('perm'),
    name: 'analytics:read',
    displayName: 'View Analytics',
    description: 'Access business analytics and reports',
    resource: 'analytics',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'analytics:admin',
    displayName: 'Administer Analytics',
    description: 'Full control over analytics system',
    resource: 'analytics',
    action: 'admin',
    isSystem: true
  }
];

// Role-Permission mappings for appointment booking system
const ROLE_PERMISSION_MAPPINGS = {
  'ADMIN': [
    // Full platform administrative access
    'user:admin', 'role:create', 'role:read', 'role:update', 'role:delete', 'role:assign', 'role:revoke',
    'permission:create', 'permission:read', 'permission:update', 'permission:delete',
    'system:admin', 'system:read', 'audit:admin', 'audit:read', 'support:admin',
    // Business platform administration
    'business:admin', 'subscription:admin', 'appointment:admin', 'service:create', 'service:read', 'service:update', 'service:delete',
    'staff:create', 'staff:read', 'staff:update', 'staff:delete', 'analytics:admin',
    // User behavior and business closure management
    'user_behavior:read', 'user_behavior:update', 'user_behavior:moderate',
    'business_closure:create', 'business_closure:read', 'business_closure:update', 'business_closure:delete'
  ],
  'OWNER': [
    // Business owner capabilities - manage own business
    'business:create', 'business:read', 'business:update', 'subscription:read', 'subscription:update',
    'service:create', 'service:read', 'service:update', 'service:delete',
    'staff:create', 'staff:read', 'staff:update', 'staff:delete',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:delete', 'appointment:admin',
    'analytics:read', 'support:create',
    // Business closure management for own business
    'business_closure:create', 'business_closure:read', 'business_closure:update', 'business_closure:delete',
    // User behavior for own customers
    'user_behavior:read'
  ],
  'STAFF': [
    // Staff capabilities - manage appointments and services for assigned business
    'service:read', 'appointment:create', 'appointment:read', 'appointment:update', 'appointment:delete',
    'support:create', 'business:read',
    // Basic analytics for assigned business
    'analytics:read', 'business_closure:read'
  ],
  'CUSTOMER': [
    // Customer capabilities - book appointments and manage own profile
    'appointment:create', 'appointment:read', 'appointment:update',
    'business:read', 'service:read', 'support:create',
    // Basic user profile management
    'user:read', 'user:update'
  ]
};

async function seedRBAC() {
  console.log('🌱 Starting RBAC seed...');

  try {
    // Create roles
    console.log('Creating default roles...');
    for (const role of DEFAULT_ROLES) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {
          displayName: role.displayName,
          description: role.description,
          level: role.level,
          isActive: role.isActive
        },
        create: role
      });
      console.log(`✅ Created/Updated role: ${role.name} (Level ${role.level})`);
    }

    // Create permissions
    console.log('\nCreating default permissions...');
    for (const permission of DEFAULT_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          displayName: permission.displayName,
          description: permission.description
        },
        create: permission
      });
      console.log(`✅ Created/Updated permission: ${permission.name}`);
    }

    // Assign permissions to roles
    console.log('\nAssigning permissions to roles...');
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSION_MAPPINGS)) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        console.log(`❌ Role ${roleName} not found, skipping permission assignment`);
        continue;
      }

      // Remove existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id }
      });

      // Add new role permissions
      let assignedCount = 0;
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
        if (permission) {
          await prisma.rolePermission.create({
            data: {
              id: generateId('rperm'),
              roleId: role.id,
              permissionId: permission.id,
              grantedBy: null, // Set to null instead of 'system'
              grantedAt: new Date(),
              isActive: true
            }
          });
          assignedCount++;
        } else {
          console.log(`⚠️  Permission ${permissionName} not found for role ${roleName}`);
        }
      }
      console.log(`✅ Assigned ${assignedCount} permissions to role: ${roleName}`);
    }

    // Create a default super admin user role assignment (if there are any users)
    console.log('\nChecking for existing users to assign default roles...');
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' }
      });
      
      if (firstUser) {
        const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
        if (adminRole) {
          // Check if user already has admin role
          const existingAssignment = await prisma.userRole.findFirst({
            where: {
              userId: firstUser.id,
              roleId: adminRole.id,
              isActive: true
            }
          });

          if (!existingAssignment) {
            await prisma.userRole.create({
              data: {
                id: generateId('urole'),
                userId: firstUser.id,
                roleId: adminRole.id,
                grantedBy: null, // Set to null instead of 'system' since no system user exists
                grantedAt: new Date(),
                isActive: true
              }
            });
            console.log(`✅ Assigned ADMIN role to first user: ${firstUser.phoneNumber}`);
          } else {
            console.log(`ℹ️  First user already has ADMIN role: ${firstUser.phoneNumber}`);
          }
        }
      }
    } else {
      console.log('ℹ️  No users found. Admin role will be assigned to the first registered user.');
    }

    console.log('\n🎉 RBAC seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Roles: ${DEFAULT_ROLES.length}`);
    console.log(`   Permissions: ${DEFAULT_PERMISSIONS.length}`);
    console.log(`   Role-Permission mappings: ${Object.keys(ROLE_PERMISSION_MAPPINGS).length}`);

  } catch (error) {
    console.error('❌ Error seeding RBAC data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedRBAC();
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

export { seedRBAC };