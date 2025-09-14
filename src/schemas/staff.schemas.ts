import { z } from 'zod';
import { BusinessStaffRole } from '@prisma/client';

// Staff invitation validation schemas
export const inviteStaffSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID is required'),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .transform(val => val.trim()),
  
  role: z.nativeEnum(BusinessStaffRole, {
    errorMap: () => ({ message: 'Invalid staff role' }),
  }),
  
  permissions: z.record(z.any())
    .optional(),
  
  firstName: z.string()
    .min(1, 'First name must be at least 1 character')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  
  lastName: z.string()
    .min(1, 'Last name must be at least 1 character')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
});

export const verifyStaffInvitationSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID is required'),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .transform(val => val.trim()),
  
  verificationCode: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
  
  role: z.nativeEnum(BusinessStaffRole, {
    errorMap: () => ({ message: 'Invalid staff role' }),
  }),
  
  permissions: z.record(z.any())
    .optional(),
  
  firstName: z.string()
    .min(1, 'First name must be at least 1 character')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  
  lastName: z.string()
    .min(1, 'Last name must be at least 1 character')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
});

export const updateStaffSchema = z.object({
  role: z.nativeEnum(BusinessStaffRole, {
    errorMap: () => ({ message: 'Invalid staff role' }),
  }).optional(),
  
  permissions: z.record(z.any())
    .optional(),
  
  isActive: z.boolean()
    .optional(),
});

export const bulkInviteStaffSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID is required'),
  
  invitations: z.array(
    z.object({
      phoneNumber: z.string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
        .transform(val => val.trim()),
      
      role: z.nativeEnum(BusinessStaffRole, {
        errorMap: () => ({ message: 'Invalid staff role' }),
      }),
      
      permissions: z.record(z.any())
        .optional(),
      
      firstName: z.string()
        .min(1, 'First name must be at least 1 character')
        .max(50, 'First name must be less than 50 characters')
        .trim()
        .optional(),
      
      lastName: z.string()
        .min(1, 'Last name must be at least 1 character')
        .max(50, 'Last name must be less than 50 characters')
        .trim()
        .optional(),
    })
  )
  .min(1, 'At least one invitation is required')
  .max(10, 'Cannot invite more than 10 staff members at once'),
});

export const transferStaffSchema = z.object({
  staffIds: z.array(z.string())
    .min(1, 'At least one staff ID is required')
    .max(50, 'Cannot transfer more than 50 staff members at once'),
  
  fromBusinessId: z.string()
    .min(1, 'Source business ID is required'),
  
  toBusinessId: z.string()
    .min(1, 'Target business ID is required'),
}).refine(
  (data) => data.fromBusinessId !== data.toBusinessId,
  {
    message: 'Source and target business must be different',
    path: ['toBusinessId'],
  }
);

// Query parameter schemas
export const getBusinessStaffQuerySchema = z.object({
  includeInactive: z.string()
    .optional()
    .transform(val => val === 'true'),
});

export const getStaffByRoleQuerySchema = z.object({
  includeInactive: z.string()
    .optional()
    .transform(val => val === 'true'),
});

export const staffRoleParamSchema = z.object({
  role: z.nativeEnum(BusinessStaffRole, {
    errorMap: () => ({ message: 'Invalid staff role' }),
  }),
});

// Parameter schemas
export const businessIdParamSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID is required'),
});

export const staffIdParamSchema = z.object({
  staffId: z.string()
    .min(1, 'Staff ID is required'),
});

export const staffRoleAndBusinessParamSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID is required'),
  role: z.nativeEnum(BusinessStaffRole, {
    errorMap: () => ({ message: 'Invalid staff role' }),
  }),
});

// Type exports for use in controllers
export type InviteStaffRequest = z.infer<typeof inviteStaffSchema>;
export type VerifyStaffInvitationRequest = z.infer<typeof verifyStaffInvitationSchema>;
export type UpdateStaffRequest = z.infer<typeof updateStaffSchema>;
export type BulkInviteStaffRequest = z.infer<typeof bulkInviteStaffSchema>;
export type TransferStaffRequest = z.infer<typeof transferStaffSchema>;
export type GetBusinessStaffQuery = z.infer<typeof getBusinessStaffQuerySchema>;
export type GetStaffByRoleQuery = z.infer<typeof getStaffByRoleQuerySchema>;
export type BusinessIdParam = z.infer<typeof businessIdParamSchema>;
export type StaffIdParam = z.infer<typeof staffIdParamSchema>;
export type StaffRoleAndBusinessParam = z.infer<typeof staffRoleAndBusinessParamSchema>;

// Custom validation functions
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

export const validateStaffRole = (role: string): role is BusinessStaffRole => {
  return Object.values(BusinessStaffRole).includes(role as BusinessStaffRole);
};

// Role hierarchy validation (optional - for permission checks)
export const getRoleHierarchy = (): Record<BusinessStaffRole, number> => {
  return {
    [BusinessStaffRole.OWNER]: 4,
    [BusinessStaffRole.MANAGER]: 3,
    [BusinessStaffRole.STAFF]: 2,
    [BusinessStaffRole.RECEPTIONIST]: 1,
  };
};

export const canManageRole = (managerRole: BusinessStaffRole, targetRole: BusinessStaffRole): boolean => {
  const hierarchy = getRoleHierarchy();
  return hierarchy[managerRole] > hierarchy[targetRole];
};