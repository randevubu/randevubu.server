import { z } from 'zod';
import { BusinessStaffRole, AppointmentStatus, ClosureType } from '../types/business';

// Business validation schemas
export const createBusinessSchema = z.object({
  name: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters')
    .trim(),
  
  businessTypeId: z.string()
    .min(1, 'Business type is required'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .optional(),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  
  website: z.string()
    .url('Invalid website URL')
    .optional(),
  
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional(),
  
  city: z.string()
    .max(50, 'City must be less than 50 characters')
    .optional(),
  
  state: z.string()
    .max(50, 'State must be less than 50 characters')
    .optional(),
  
  country: z.string()
    .max(50, 'Country must be less than 50 characters')
    .optional(),
  
  postalCode: z.string()
    .max(20, 'Postal code must be less than 20 characters')
    .optional(),
  
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional(),
  
  primaryColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Primary color must be a valid hex color')
    .optional(),
  
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
});

export const updateBusinessSchema = z.object({
  name: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters')
    .optional(),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .optional(),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  
  website: z.string()
    .url('Invalid website URL')
    .optional(),
  
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional(),
  
  city: z.string()
    .max(50, 'City must be less than 50 characters')
    .optional(),
  
  state: z.string()
    .max(50, 'State must be less than 50 characters')
    .optional(),
  
  country: z.string()
    .max(50, 'Country must be less than 50 characters')
    .optional(),
  
  postalCode: z.string()
    .max(20, 'Postal code must be less than 20 characters')
    .optional(),
  
  businessHours: z.record(z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    closed: z.boolean()
  })).optional(),
  
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional(),
  
  logoUrl: z.string()
    .url('Invalid logo URL')
    .optional(),
  
  coverImageUrl: z.string()
    .url('Invalid cover image URL')
    .optional(),
  
  primaryColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Primary color must be a valid hex color')
    .optional(),
  
  theme: z.record(z.any()).optional(),
  
  settings: z.record(z.any()).optional(),
  
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
});

// Service validation schemas
export const createServiceSchema = z.object({
  name: z.string()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name must be less than 100 characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  duration: z.number()
    .int('Duration must be an integer')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration must be less than 8 hours'),
  
  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(10000, 'Price must be less than 10,000'),
  
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .optional(),
  
  category: z.string()
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  
  bufferTime: z.number()
    .int('Buffer time must be an integer')
    .min(0, 'Buffer time must be non-negative')
    .max(120, 'Buffer time must be less than 2 hours')
    .optional(),
  
  maxAdvanceBooking: z.number()
    .int('Max advance booking must be an integer')
    .min(1, 'Max advance booking must be at least 1 day')
    .max(365, 'Max advance booking must be less than 1 year')
    .optional(),
  
  minAdvanceBooking: z.number()
    .int('Min advance booking must be an integer')
    .min(0, 'Min advance booking must be non-negative')
    .max(72, 'Min advance booking must be less than 3 days')
    .optional()
});

export const updateServiceSchema = z.object({
  name: z.string()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name must be less than 100 characters')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  duration: z.number()
    .int('Duration must be an integer')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration must be less than 8 hours')
    .optional(),
  
  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(10000, 'Price must be less than 10,000')
    .optional(),
  
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .optional(),
  
  category: z.string()
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  
  isActive: z.boolean().optional(),
  
  sortOrder: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .optional(),
  
  bufferTime: z.number()
    .int('Buffer time must be an integer')
    .min(0, 'Buffer time must be non-negative')
    .max(120, 'Buffer time must be less than 2 hours')
    .optional(),
  
  maxAdvanceBooking: z.number()
    .int('Max advance booking must be an integer')
    .min(1, 'Max advance booking must be at least 1 day')
    .max(365, 'Max advance booking must be less than 1 year')
    .optional(),
  
  minAdvanceBooking: z.number()
    .int('Min advance booking must be an integer')
    .min(0, 'Min advance booking must be non-negative')
    .max(72, 'Min advance booking must be less than 3 days')
    .optional()
});

// Appointment validation schemas
export const createAppointmentSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID is required'),
  
  serviceId: z.string()
    .min(1, 'Service ID is required'),
  
  staffId: z.string()
    .min(1, 'Staff ID is required')
    .optional(),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  startTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  
  customerNotes: z.string()
    .max(500, 'Customer notes must be less than 500 characters')
    .optional()
});

export const updateAppointmentSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  
  startTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format')
    .optional(),
  
  status: z.nativeEnum(AppointmentStatus).optional(),
  
  customerNotes: z.string()
    .max(500, 'Customer notes must be less than 500 characters')
    .optional(),
  
  internalNotes: z.string()
    .max(500, 'Internal notes must be less than 500 characters')
    .optional(),
  
  cancelReason: z.string()
    .max(200, 'Cancel reason must be less than 200 characters')
    .optional()
});

// Staff management schemas
export const addStaffSchema = z.object({
  userId: z.string()
    .min(1, 'User ID is required'),
  
  role: z.nativeEnum(BusinessStaffRole),
  
  permissions: z.record(z.any()).optional()
});

export const updateStaffSchema = z.object({
  role: z.nativeEnum(BusinessStaffRole).optional(),
  
  permissions: z.record(z.any()).optional(),
  
  isActive: z.boolean().optional()
});

// Business closure schemas
export const createBusinessClosureSchema = z.object({
  startDate: z.string()
    .datetime('Start date must be a valid ISO datetime'),
  
  endDate: z.string()
    .datetime('End date must be a valid ISO datetime')
    .optional(),
  
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(200, 'Reason must be less than 200 characters'),
  
  type: z.nativeEnum(ClosureType)
}).refine((data) => {
  if (data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

export const updateBusinessClosureSchema = z.object({
  startDate: z.string()
    .datetime('Start date must be a valid ISO datetime')
    .optional(),
  
  endDate: z.string()
    .datetime('End date must be a valid ISO datetime')
    .optional(),
  
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(200, 'Reason must be less than 200 characters')
    .optional(),
  
  type: z.nativeEnum(ClosureType).optional(),
  
  isActive: z.boolean().optional()
});

// Subscription schemas
export const subscribeBusinessSchema = z.object({
  planId: z.string()
    .min(1, 'Plan ID is required'),
  
  paymentMethodId: z.string()
    .min(1, 'Payment method ID is required')
    .optional()
});

// Search and filter schemas
export const businessSearchSchema = z.object({
  businessTypeId: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isVerified: z.string()
    .transform(val => val === 'true')
    .optional(),
  latitude: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= -90 && val <= 90, 'Invalid latitude')
    .optional(),
  longitude: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= -180 && val <= 180, 'Invalid longitude')
    .optional(),
  radius: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 100, 'Radius must be between 0 and 100 km')
    .optional(),
  page: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .optional(),
  limit: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
});

export const appointmentSearchSchema = z.object({
  businessId: z.string().optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
  page: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .optional(),
  limit: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
});

// Utility validation functions
export const validateBusinessHours = (businessHours: any): boolean => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  if (!businessHours || typeof businessHours !== 'object') {
    return false;
  }
  
  for (const day of days) {
    if (businessHours[day]) {
      const { open, close, closed } = businessHours[day];
      
      if (typeof closed !== 'boolean') {
        return false;
      }
      
      if (!closed) {
        if (!open || !close) {
          return false;
        }
        
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(open) || !timeRegex.test(close)) {
          return false;
        }
        
        // Validate that open time is before close time
        const [openHour, openMin] = open.split(':').map(Number);
        const [closeHour, closeMin] = close.split(':').map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;
        
        if (openMinutes >= closeMinutes) {
          return false;
        }
      }
    }
  }
  
  return true;
};

export const validateAppointmentTime = (date: string, startTime: string): boolean => {
  try {
    const appointmentDateTime = new Date(`${date}T${startTime}:00`);
    const now = new Date();
    
    // Appointment cannot be in the past
    return appointmentDateTime > now;
  } catch {
    return false;
  }
};

export const validateClosureDates = (startDate: string, endDate?: string): boolean => {
  try {
    const start = new Date(startDate);
    const now = new Date();
    
    // Start date cannot be in the past
    if (start <= now) {
      return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      // End date must be after start date
      return end > start;
    }
    
    return true;
  } catch {
    return false;
  }
};

// Export schema types for TypeScript
export type CreateBusinessSchema = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessSchema = z.infer<typeof updateBusinessSchema>;
export type CreateServiceSchema = z.infer<typeof createServiceSchema>;
export type UpdateServiceSchema = z.infer<typeof updateServiceSchema>;
export type CreateAppointmentSchema = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentSchema = z.infer<typeof updateAppointmentSchema>;
export type AddStaffSchema = z.infer<typeof addStaffSchema>;
export type UpdateStaffSchema = z.infer<typeof updateStaffSchema>;
export type CreateBusinessClosureSchema = z.infer<typeof createBusinessClosureSchema>;
export type UpdateBusinessClosureSchema = z.infer<typeof updateBusinessClosureSchema>;
export type SubscribeBusinessSchema = z.infer<typeof subscribeBusinessSchema>;
export type BusinessSearchSchema = z.infer<typeof businessSearchSchema>;
export type AppointmentSearchSchema = z.infer<typeof appointmentSearchSchema>;