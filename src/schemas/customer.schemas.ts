import { z } from 'zod';

// Customer search and filtering schemas
export const customerSearchSchema = z.object({
  search: z.string()
    .min(1, 'Search term must be at least 1 character')
    .max(100, 'Search term must be less than 100 characters')
    .optional(),
  
  page: z.coerce.number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(1),
  
  limit: z.coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50),
  
  status: z.enum(['active', 'banned', 'flagged', 'all'])
    .default('all'),
  
  sortBy: z.enum(['firstName', 'lastName', 'phoneNumber', 'createdAt', 'lastLoginAt'])
    .default('createdAt'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
});

// Customer ban/unban schemas
export const banCustomerSchema = z.object({
  reason: z.string()
    .min(10, 'Ban reason must be at least 10 characters')
    .max(500, 'Ban reason must be less than 500 characters'),
  
  durationDays: z.coerce.number()
    .int()
    .min(1, 'Ban duration must be at least 1 day')
    .max(365, 'Ban duration cannot exceed 365 days')
    .optional(),
  
  isTemporary: z.boolean().default(true),
  
  notifyCustomer: z.boolean().default(true),
  
  additionalNotes: z.string()
    .max(1000, 'Additional notes must be less than 1000 characters')
    .optional()
});

export const unbanCustomerSchema = z.object({
  reason: z.string()
    .min(5, 'Unban reason must be at least 5 characters')
    .max(500, 'Unban reason must be less than 500 characters'),
  
  notifyCustomer: z.boolean().default(true),
  
  restoreAccess: z.boolean().default(true)
});

// Customer flag schema
export const flagCustomerSchema = z.object({
  reason: z.string()
    .min(10, 'Flag reason must be at least 10 characters')
    .max(500, 'Flag reason must be less than 500 characters'),
  
  priority: z.enum(['low', 'medium', 'high', 'critical'])
    .default('medium'),
  
  category: z.enum([
    'inappropriate_behavior',
    'spam',
    'fake_bookings',
    'payment_issues',
    'harassment',
    'fraud_suspicion',
    'other'
  ]).default('other'),
  
  additionalDetails: z.string()
    .max(1000, 'Additional details must be less than 1000 characters')
    .optional(),
  
  requiresReview: z.boolean().default(true)
});

// Customer strike schema
export const addStrikeSchema = z.object({
  reason: z.string()
    .min(10, 'Strike reason must be at least 10 characters')
    .max(500, 'Strike reason must be less than 500 characters'),
  
  severity: z.enum(['minor', 'major', 'severe'])
    .default('minor'),
  
  category: z.enum([
    'no_show',
    'late_cancellation',
    'inappropriate_behavior',
    'policy_violation',
    'other'
  ]).default('other'),
  
  appointmentId: z.string().optional(),
  
  additionalNotes: z.string()
    .max(1000, 'Additional notes must be less than 1000 characters')
    .optional(),
  
  autoExpire: z.boolean().default(true),
  
  expireAfterDays: z.coerce.number()
    .int()
    .min(30, 'Strike must expire after at least 30 days')
    .max(365, 'Strike cannot last longer than 365 days')
    .default(90)
});

// Batch operation schemas
export const batchCustomerActionSchema = z.object({
  customerIds: z.array(z.string())
    .min(1, 'At least one customer ID is required')
    .max(50, 'Cannot process more than 50 customers at once'),
  
  action: z.enum(['ban', 'unban', 'flag', 'strike']),
  
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
  
  // Optional fields that apply based on action
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  severity: z.enum(['minor', 'major', 'severe']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  notifyCustomers: z.boolean().default(false)
});

// Customer profile update schema (for admins/business owners)
export const updateCustomerProfileSchema = z.object({
  firstName: z.string()
    .min(1, 'First name must be at least 1 character')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  
  lastName: z.string()
    .min(1, 'Last name must be at least 1 character')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  
  isActive: z.boolean().optional(),
  
  adminNotes: z.string()
    .max(1000, 'Admin notes must be less than 1000 characters')
    .optional(),
  
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
});

// Customer detail schema for responses
export const customerDetailQuerySchema = z.object({
  includeAppointments: z.boolean().default(false),
  includeStrikes: z.boolean().default(false),
  includeBehaviorData: z.boolean().default(false),
  includeBusinessRelations: z.boolean().default(false),
  
  appointmentLimit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  
  appointmentStartDate: z.string()
    .datetime()
    .optional(),
  
  appointmentEndDate: z.string()
    .datetime()
    .optional()
});