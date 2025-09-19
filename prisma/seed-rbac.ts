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
  {
    id: generateId('perm'),
    name: 'business:view_all',
    displayName: 'View All Businesses',
    description: 'View all businesses across the platform',
    resource: 'business',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:view_own',
    displayName: 'View Own Business',
    description: 'View businesses you own or work at',
    resource: 'business',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:edit_all',
    displayName: 'Edit All Businesses',
    description: 'Edit all businesses across the platform',
    resource: 'business',
    action: 'edit_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:edit_own',
    displayName: 'Edit Own Business',
    description: 'Edit businesses you own or work at',
    resource: 'business',
    action: 'edit_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:delete_all',
    displayName: 'Delete All Businesses',
    description: 'Delete all businesses across the platform',
    resource: 'business',
    action: 'delete_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:delete_own',
    displayName: 'Delete Own Business',
    description: 'Delete businesses you own or work at',
    resource: 'business',
    action: 'delete_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:close_all',
    displayName: 'Close All Businesses',
    description: 'Close all businesses across the platform',
    resource: 'business',
    action: 'close_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:close_own',
    displayName: 'Close Own Business',
    description: 'Close businesses you own or work at',
    resource: 'business',
    action: 'close_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business:verify',
    displayName: 'Verify Businesses',
    description: 'Verify business accounts (admin only)',
    resource: 'business',
    action: 'verify',
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
    name: 'appointment:view_all',
    displayName: 'View All Appointments',
    description: 'View all appointments across all businesses',
    resource: 'appointment',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:view_own',
    displayName: 'View Own Business Appointments',
    description: 'View appointments for own business',
    resource: 'appointment',
    action: 'view_own',
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
    name: 'appointment:edit_all',
    displayName: 'Edit All Appointments',
    description: 'Edit appointments across all businesses',
    resource: 'appointment',
    action: 'edit_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:edit_own',
    displayName: 'Edit Own Business Appointments',
    description: 'Edit appointments for own business',
    resource: 'appointment',
    action: 'edit_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:cancel_all',
    displayName: 'Cancel All Appointments',
    description: 'Cancel appointments across all businesses',
    resource: 'appointment',
    action: 'cancel_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:cancel_own',
    displayName: 'Cancel Own Business Appointments',
    description: 'Cancel appointments for own business',
    resource: 'appointment',
    action: 'cancel_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:confirm',
    displayName: 'Confirm Appointments',
    description: 'Confirm appointment bookings',
    resource: 'appointment',
    action: 'confirm',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:complete',
    displayName: 'Complete Appointments',
    description: 'Mark appointments as completed',
    resource: 'appointment',
    action: 'complete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'appointment:mark_no_show',
    displayName: 'Mark No Show',
    description: 'Mark appointments as no-show',
    resource: 'appointment',
    action: 'mark_no_show',
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

  // Enhanced Service Permissions (Required by routes)
  {
    id: generateId('perm'),
    name: 'service:manage_all',
    displayName: 'Manage All Services',
    description: 'Full management of services across all businesses',
    resource: 'service',
    action: 'manage_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'service:manage_own',
    displayName: 'Manage Own Services',
    description: 'Manage services for own business only',
    resource: 'service',
    action: 'manage_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'service:view_all',
    displayName: 'View All Services',
    description: 'View services across all businesses',
    resource: 'service',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'service:view_own',
    displayName: 'View Own Services',
    description: 'View services for own business only',
    resource: 'service',
    action: 'view_own',
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

  // Business Closure Permissions (Legacy)
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

  // Enhanced Closure Permissions (Required by routes)
  {
    id: generateId('perm'),
    name: 'closure:manage_all',
    displayName: 'Manage All Business Closures',
    description: 'Full management of closures across all businesses',
    resource: 'closure',
    action: 'manage_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'closure:manage_own',
    displayName: 'Manage Own Business Closures',
    description: 'Manage closures for own business only',
    resource: 'closure',
    action: 'manage_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'closure:view_all',
    displayName: 'View All Business Closures',
    description: 'View closures across all businesses',
    resource: 'closure',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'closure:view_own',
    displayName: 'View Own Business Closures',
    description: 'View closures for own business only',
    resource: 'closure',
    action: 'view_own',
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
    name: 'analytics:view_own',
    displayName: 'View Own Analytics',
    description: 'Access own business usage analytics and reports',
    resource: 'analytics',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'analytics:view_all',
    displayName: 'View All Analytics',
    description: 'Access all business analytics and reports',
    resource: 'analytics',
    action: 'view_all',
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
  },

  // Customer Management Permissions
  {
    id: generateId('perm'),
    name: 'customer:view_own',
    displayName: 'View Own Customers',
    description: 'View customers who have appointments at owned businesses',
    resource: 'customer',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'customer:view_all',
    displayName: 'View All Customers',
    description: 'View all customers across all businesses (admin only)',
    resource: 'customer',
    action: 'view_all',
    isSystem: true
  },

  // User Behavior Management (Enhanced)
  {
    id: generateId('perm'),
    name: 'user_behavior:view',
    displayName: 'View User Behavior',
    description: 'View user behavior analytics and reliability scores',
    resource: 'user_behavior',
    action: 'view',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_behavior:manage',
    displayName: 'Manage User Behavior',
    description: 'Manage user behavior settings and analytics',
    resource: 'user_behavior',
    action: 'manage',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_behavior:manage_strikes',
    displayName: 'Manage User Strikes',
    description: 'Add and remove strikes from user accounts',
    resource: 'user_behavior',
    action: 'manage_strikes',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_behavior:ban',
    displayName: 'Ban Users',
    description: 'Ban and unban users from the platform',
    resource: 'user_behavior',
    action: 'ban',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_behavior:flag',
    displayName: 'Flag Users',
    description: 'Flag users for review and investigation',
    resource: 'user_behavior',
    action: 'flag',
    isSystem: true
  },

  // Payment Management Permissions
  {
    id: generateId('perm'),
    name: 'payment:create',
    displayName: 'Create Payments',
    description: 'Process subscription and service payments',
    resource: 'payment',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'payment:read',
    displayName: 'View Payments',
    description: 'View payment history and details',
    resource: 'payment',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'payment:view_all',
    displayName: 'View All Payments',
    description: 'View all payments across all businesses',
    resource: 'payment',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'payment:view_own',
    displayName: 'View Own Payments',
    description: 'View payments for own business subscriptions',
    resource: 'payment',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'payment:refund',
    displayName: 'Refund Payments',
    description: 'Process payment refunds',
    resource: 'payment',
    action: 'refund',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'payment:cancel',
    displayName: 'Cancel Payments',
    description: 'Cancel payment transactions',
    resource: 'payment',
    action: 'cancel',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'payment:admin',
    displayName: 'Administer Payments',
    description: 'Full control over payment system',
    resource: 'payment',
    action: 'admin',
    isSystem: true
  },

  // Subscription Management (Enhanced Business-Level)
  {
    id: generateId('perm'),
    name: 'subscription:purchase',
    displayName: 'Purchase Subscription',
    description: 'Purchase subscription plans for business',
    resource: 'subscription',
    action: 'purchase',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:view_plans',
    displayName: 'View Subscription Plans',
    description: 'View available subscription plans',
    resource: 'subscription',
    action: 'view_plans',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:manage_own',
    displayName: 'Manage Own Subscription',
    description: 'Manage subscription for own business',
    resource: 'subscription',
    action: 'manage_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:view_own',
    displayName: 'View Own Subscription',
    description: 'View subscription details for own business',
    resource: 'subscription',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'subscription:cancel_own',
    displayName: 'Cancel Own Subscription',
    description: 'Cancel subscription for own business',
    resource: 'subscription',
    action: 'cancel_own',
    isSystem: true
  },

  // Business Hours Management Permissions
  {
    id: generateId('perm'),
    name: 'business_hours:read',
    displayName: 'View Business Hours',
    description: 'View business operating hours and schedules',
    resource: 'business_hours',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours:update',
    displayName: 'Update Business Hours',
    description: 'Modify business operating hours and schedules',
    resource: 'business_hours',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours:view_all',
    displayName: 'View All Business Hours',
    description: 'View business hours across all businesses',
    resource: 'business_hours',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours:view_own',
    displayName: 'View Own Business Hours',
    description: 'View business hours for own business only',
    resource: 'business_hours',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours:edit_all',
    displayName: 'Edit All Business Hours',
    description: 'Edit business hours across all businesses',
    resource: 'business_hours',
    action: 'edit_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours:edit_own',
    displayName: 'Edit Own Business Hours',
    description: 'Edit business hours for own business only',
    resource: 'business_hours',
    action: 'edit_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours:status',
    displayName: 'Check Business Hours Status',
    description: 'Check if business is open/closed at specific times',
    resource: 'business_hours',
    action: 'status',
    isSystem: true
  },

  // Business Hours Override Permissions
  {
    id: generateId('perm'),
    name: 'business_hours_override:create',
    displayName: 'Create Hours Override',
    description: 'Create special business hours for specific dates',
    resource: 'business_hours_override',
    action: 'create',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:read',
    displayName: 'View Hours Overrides',
    description: 'View special business hours and date overrides',
    resource: 'business_hours_override',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:update',
    displayName: 'Update Hours Override',
    description: 'Modify special business hours for specific dates',
    resource: 'business_hours_override',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:delete',
    displayName: 'Delete Hours Override',
    description: 'Remove special business hours for specific dates',
    resource: 'business_hours_override',
    action: 'delete',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:view_all',
    displayName: 'View All Hours Overrides',
    description: 'View hours overrides across all businesses',
    resource: 'business_hours_override',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:view_own',
    displayName: 'View Own Hours Overrides',
    description: 'View hours overrides for own business only',
    resource: 'business_hours_override',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:manage_all',
    displayName: 'Manage All Hours Overrides',
    description: 'Full management of hours overrides across all businesses',
    resource: 'business_hours_override',
    action: 'manage_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_hours_override:manage_own',
    displayName: 'Manage Own Hours Overrides',
    description: 'Manage hours overrides for own business only',
    resource: 'business_hours_override',
    action: 'manage_own',
    isSystem: true
  },

  // Business Notification Settings Permissions
  {
    id: generateId('perm'),
    name: 'business_notification:read',
    displayName: 'View Business Notification Settings',
    description: 'View business notification preferences and settings',
    resource: 'business_notification',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_notification:update',
    displayName: 'Update Business Notification Settings',
    description: 'Modify business notification preferences and settings',
    resource: 'business_notification',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_notification:view_all',
    displayName: 'View All Business Notifications',
    description: 'View notification settings across all businesses',
    resource: 'business_notification',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_notification:view_own',
    displayName: 'View Own Business Notifications',
    description: 'View notification settings for own business only',
    resource: 'business_notification',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_notification:edit_all',
    displayName: 'Edit All Business Notifications',
    description: 'Edit notification settings across all businesses',
    resource: 'business_notification',
    action: 'edit_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'business_notification:edit_own',
    displayName: 'Edit Own Business Notifications',
    description: 'Edit notification settings for own business only',
    resource: 'business_notification',
    action: 'edit_own',
    isSystem: true
  },

  // Push Notification Management Permissions
  {
    id: generateId('perm'),
    name: 'push_notification:send',
    displayName: 'Send Push Notifications',
    description: 'Send push notifications to users and businesses',
    resource: 'push_notification',
    action: 'send',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'push_notification:subscribe',
    displayName: 'Manage Push Subscriptions',
    description: 'Subscribe and unsubscribe from push notifications',
    resource: 'push_notification',
    action: 'subscribe',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'push_notification:test',
    displayName: 'Test Push Notifications',
    description: 'Send test push notifications',
    resource: 'push_notification',
    action: 'test',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'push_notification:admin',
    displayName: 'Administer Push Notifications',
    description: 'Full control over push notification system',
    resource: 'push_notification',
    action: 'admin',
    isSystem: true
  },

  // User Notification Preferences Permissions
  {
    id: generateId('perm'),
    name: 'user_notification:read',
    displayName: 'View User Notification Preferences',
    description: 'View user notification preferences and settings',
    resource: 'user_notification',
    action: 'read',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_notification:update',
    displayName: 'Update User Notification Preferences',
    description: 'Modify user notification preferences and settings',
    resource: 'user_notification',
    action: 'update',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_notification:view_all',
    displayName: 'View All User Notifications',
    description: 'View notification preferences for all users',
    resource: 'user_notification',
    action: 'view_all',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_notification:view_own',
    displayName: 'View Own Notification Preferences',
    description: 'View own notification preferences only',
    resource: 'user_notification',
    action: 'view_own',
    isSystem: true
  },
  {
    id: generateId('perm'),
    name: 'user_notification:edit_own',
    displayName: 'Edit Own Notification Preferences',
    description: 'Edit own notification preferences only',
    resource: 'user_notification',
    action: 'edit_own',
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
    'business:admin', 'business:view_all', 'business:edit_all', 'business:delete_all', 'business:close_all', 'business:verify',
    'subscription:admin', 'subscription:create', 'subscription:read', 'subscription:update',
    'appointment:admin', 'appointment:view_all', 'appointment:view_own',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:delete',
    'appointment:edit_all', 'appointment:edit_own', 'appointment:cancel_all', 'appointment:cancel_own',
    'appointment:confirm', 'appointment:complete', 'appointment:mark_no_show',
    'service:create', 'service:read', 'service:update', 'service:delete', 'service:manage_all', 'service:view_all',
    'staff:create', 'staff:read', 'staff:update', 'staff:delete', 'analytics:admin', 'analytics:view_all',
    // Payment system administration
    'payment:admin', 'payment:create', 'payment:read', 'payment:view_all', 'payment:view_own',
    'payment:refund', 'payment:cancel',
    // Subscription management (admin level)
    'subscription:purchase', 'subscription:view_plans', 'subscription:manage_own', 'subscription:view_own',
    'subscription:cancel_own',
    // Customer management (full access)
    'customer:view_own', 'customer:view_all',
    // User behavior and business closure management
    'user_behavior:read', 'user_behavior:update', 'user_behavior:moderate', 'user_behavior:view', 'user_behavior:manage', 'user_behavior:manage_strikes', 'user_behavior:ban', 'user_behavior:flag',
    'business_closure:create', 'business_closure:read', 'business_closure:update', 'business_closure:delete',
    // Enhanced closure management
    'closure:manage_all', 'closure:view_all',
    // Business hours management (admin level)
    'business_hours:read', 'business_hours:update', 'business_hours:view_all', 'business_hours:edit_all', 'business_hours:status',
    // Business hours override management (admin level)
    'business_hours_override:create', 'business_hours_override:read', 'business_hours_override:update', 'business_hours_override:delete',
    'business_hours_override:view_all', 'business_hours_override:manage_all',
    // Notification management (admin level)
    'business_notification:read', 'business_notification:update', 'business_notification:view_all', 'business_notification:edit_all',
    'push_notification:send', 'push_notification:subscribe', 'push_notification:test', 'push_notification:admin',
    'user_notification:read', 'user_notification:update', 'user_notification:view_all', 'user_notification:edit_own'
  ],
  'OWNER': [
    // Business owner capabilities - manage own business
    'business:create', 'business:read', 'business:update', 'business:view_own', 'business:edit_own', 'business:delete_own', 'business:close_own',
    'service:create', 'service:read', 'service:update', 'service:delete', 'service:manage_own', 'service:view_own',
    'staff:create', 'staff:read', 'staff:update', 'staff:delete',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:delete', 'appointment:admin', 'appointment:view_own',
    'appointment:edit_all', 'appointment:edit_own', 'appointment:cancel_all', 'appointment:cancel_own',
    'appointment:confirm', 'appointment:complete', 'appointment:mark_no_show',
    'analytics:read', 'analytics:view_own', 'support:create',
    // Payment and subscription management for own business
    'payment:create', 'payment:read', 'payment:view_own', 'payment:refund', 'payment:cancel',
    'subscription:purchase', 'subscription:view_plans', 'subscription:manage_own', 'subscription:view_own',
    'subscription:cancel_own', 'subscription:read', 'subscription:update',
    // Customer management for own business
    'customer:view_own',
    // Business closure management for own business
    'business_closure:create', 'business_closure:read', 'business_closure:update', 'business_closure:delete',
    // Enhanced closure management
    'closure:manage_own', 'closure:view_own',
    // User behavior for own customers
    'user_behavior:read', 'user_behavior:view', 'user_behavior:manage_strikes', 'user_behavior:ban', 'user_behavior:flag',
    // Business hours management for own business
    'business_hours:read', 'business_hours:update', 'business_hours:view_own', 'business_hours:edit_own', 'business_hours:status',
    // Business hours override management for own business
    'business_hours_override:create', 'business_hours_override:read', 'business_hours_override:update', 'business_hours_override:delete',
    'business_hours_override:view_own', 'business_hours_override:manage_own',
    // Notification management for own business
    'business_notification:read', 'business_notification:update', 'business_notification:view_own', 'business_notification:edit_own',
    'push_notification:send', 'push_notification:subscribe', 'push_notification:test',
    'user_notification:read', 'user_notification:update', 'user_notification:view_own', 'user_notification:edit_own'
  ],
  'STAFF': [
    // Staff capabilities - manage appointments and services for assigned business
    'service:read', 'service:view_own', 'appointment:create', 'appointment:read', 'appointment:update', 'appointment:delete', 'appointment:view_own',
    'appointment:edit_own', 'appointment:cancel_own', 'appointment:confirm', 'appointment:complete', 'appointment:mark_no_show',
    'support:create', 'business:read', 'business:view_own',
    // Basic subscription viewing (to understand business plan limits)
    'subscription:view_plans', 'subscription:view_own',
    // Customer management for assigned business
    'customer:view_own',
    // Basic analytics for assigned business
    'analytics:read', 'analytics:view_own', 'business_closure:read',
    // Limited user behavior for assigned business customers
    'user_behavior:read', 'user_behavior:view',
    // Basic business hours viewing for assigned business
    'business_hours:read', 'business_hours:view_own', 'business_hours:status',
    // View business hours overrides for assigned business
    'business_hours_override:read', 'business_hours_override:view_own',
    // Basic notification viewing for assigned business
    'business_notification:read', 'business_notification:view_own',
    'push_notification:subscribe',
    'user_notification:read', 'user_notification:view_own', 'user_notification:edit_own'
  ],
  'CUSTOMER': [
    // Customer capabilities - book appointments and manage own profile
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel_own',
    'business:read', 'business:view_own', 'service:read', 'support:create',
    // Business creation - customers can create businesses and become owners
    'business:create',
    // View subscription plans (for business discovery and understanding service limits)
    'subscription:view_plans',
    // Basic user profile management
    'user:read', 'user:update',
    // View business hours for booking appointments
    'business_hours:read', 'business_hours:status',
    // Basic notification preferences
    'push_notification:subscribe',
    'user_notification:read', 'user_notification:view_own', 'user_notification:edit_own'
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