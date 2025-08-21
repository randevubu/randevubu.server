import { z } from 'zod';

// Role validation schemas
export const createRoleSchema = z.object({
  name: z.string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[A-Z_]+$/, 'Role name must be uppercase letters and underscores only'),
  
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  level: z.number()
    .int('Level must be an integer')
    .min(0, 'Level must be at least 0')
    .max(1000, 'Level must be less than 1000'),
  
  permissionIds: z.array(z.string().uuid('Invalid permission ID'))
    .optional()
});

export const updateRoleSchema = z.object({
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  level: z.number()
    .int('Level must be an integer')
    .min(0, 'Level must be at least 0')
    .max(1000, 'Level must be less than 1000')
    .optional(),
  
  isActive: z.boolean().optional()
});

// Permission validation schemas
export const createPermissionSchema = z.object({
  name: z.string()
    .min(3, 'Permission name must be at least 3 characters')
    .max(100, 'Permission name must be less than 100 characters')
    .regex(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/, 'Permission name must be in format "resource:action"'),
  
  displayName: z.string()
    .min(3, 'Display name must be at least 3 characters')
    .max(100, 'Display name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  resource: z.string()
    .min(2, 'Resource must be at least 2 characters')
    .max(50, 'Resource must be less than 50 characters')
    .regex(/^[a-z][a-z0-9_]*$/, 'Resource must be lowercase letters, numbers, and underscores'),
  
  action: z.string()
    .min(2, 'Action must be at least 2 characters')
    .max(50, 'Action must be less than 50 characters')
    .regex(/^[a-z][a-z0-9_]*$/, 'Action must be lowercase letters, numbers, and underscores'),
  
  conditions: z.record(z.any()).optional()
});

export const updatePermissionSchema = z.object({
  displayName: z.string()
    .min(3, 'Display name must be at least 3 characters')
    .max(100, 'Display name must be less than 100 characters')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  conditions: z.record(z.any()).optional()
});

// Role-Permission assignment schemas
export const assignPermissionsToRoleSchema = z.object({
  permissionIds: z.array(z.string().uuid('Invalid permission ID'))
    .min(1, 'At least one permission ID is required')
    .max(50, 'Cannot assign more than 50 permissions at once')
});

// User-Role assignment schemas
export const assignRoleSchema = z.object({
  userId: z.string()
    .min(1, 'User ID is required'),
  
  roleId: z.string()
    .min(1, 'Role ID is required'),
  
  expiresAt: z.string()
    .datetime('Invalid expiration date format')
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, 'Expiration date must be in the future'),
  
  metadata: z.record(z.any()).optional()
});

// Validation for role queries
export const getRolesQuerySchema = z.object({
  includeInactive: z.string()
    .transform(val => val === 'true')
    .optional()
});

export const getRoleByIdQuerySchema = z.object({
  includePermissions: z.string()
    .transform(val => val === 'true')
    .optional()
});

export const getPermissionsQuerySchema = z.object({
  resource: z.string()
    .regex(/^[a-z][a-z0-9_]*$/, 'Resource must be lowercase letters, numbers, and underscores')
    .optional()
});

// Role hierarchy validation
export const validateRoleHierarchy = (userLevel: number, targetLevel: number): boolean => {
  return userLevel > targetLevel;
};

// Permission name validation helper
export const validatePermissionName = (name: string): { resource: string; action: string } | null => {
  const match = name.match(/^([a-z][a-z0-9_]*):([a-z][a-z0-9_]*)$/);
  if (!match) return null;
  
  return {
    resource: match[1],
    action: match[2]
  };
};

// Common resource and action patterns
export const VALID_RESOURCES = [
  'user',
  'role',
  'permission',
  'booking',
  'payment',
  'content',
  'system',
  'audit',
  'notification',
  'support'
] as const;

export const VALID_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'admin',
  'moderate',
  'approve',
  'reject',
  'assign',
  'revoke'
] as const;

// Role level constants
export const ROLE_LEVELS = {
  GUEST: 0,
  USER: 100,
  SUPPORT: 300,
  MODERATOR: 500,
  ADMIN: 900,
  SUPER_ADMIN: 1000
} as const;

// System role names (cannot be modified/deleted)
export const SYSTEM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'USER',
  'GUEST'
] as const;

// Validation functions for business rules
export const validateRoleCreation = {
  // Ensure role name follows conventions
  validateRoleName: (name: string): boolean => {
    return SYSTEM_ROLES.includes(name as any) ? false : true;
  },
  
  // Ensure level is appropriate
  validateLevel: (level: number, creatorLevel: number): boolean => {
    return level < creatorLevel;
  },
  
  // Ensure permissions are valid for the role level
  validatePermissionsForLevel: (permissions: string[], roleLevel: number): boolean => {
    // Admin-level permissions should only be assigned to high-level roles
    const adminPermissions = permissions.filter(p => 
      p.includes(':admin') || p.includes(':delete') || p.includes('system:')
    );
    
    if (adminPermissions.length > 0 && roleLevel < ROLE_LEVELS.MODERATOR) {
      return false;
    }
    
    return true;
  }
};

// Export types for TypeScript
export type CreateRoleSchema = z.infer<typeof createRoleSchema>;
export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
export type CreatePermissionSchema = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionSchema = z.infer<typeof updatePermissionSchema>;
export type AssignRoleSchema = z.infer<typeof assignRoleSchema>;
export type AssignPermissionsToRoleSchema = z.infer<typeof assignPermissionsToRoleSchema>;