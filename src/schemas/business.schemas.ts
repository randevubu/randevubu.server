import { z } from 'zod';
import { BusinessStaffRole, AppointmentStatus, ClosureType } from '../types/business';

// Business Hours validation schemas
const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const breakPeriodSchema = z.object({
  startTime: z.string()
    .regex(timeFormatRegex, 'Start time must be in HH:MM format (24-hour)'),
  endTime: z.string()
    .regex(timeFormatRegex, 'End time must be in HH:MM format (24-hour)'),
  description: z.string()
    .max(100, 'Break description must be less than 100 characters')
    .optional()
}).refine((data) => {
  // Validate that start time is before end time
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return startMinutes < endMinutes;
}, {
  message: 'Break start time must be before end time',
  path: ['endTime']
});

const dayHoursSchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string()
    .regex(timeFormatRegex, 'Open time must be in HH:MM format (24-hour)')
    .optional(),
  closeTime: z.string()
    .regex(timeFormatRegex, 'Close time must be in HH:MM format (24-hour)')
    .optional(),
  breaks: z.array(breakPeriodSchema)
    .max(5, 'Maximum 5 breaks per day allowed')
    .optional()
}).refine((data) => {
  // If open, require both open and close times
  if (data.isOpen) {
    return data.openTime && data.closeTime;
  }
  return true;
}, {
  message: 'Open and close times are required when business is open',
  path: ['openTime']
}).refine((data) => {
  // If open, validate that open time is before close time
  if (data.isOpen && data.openTime && data.closeTime) {
    const [openHour, openMin] = data.openTime.split(':').map(Number);
    const [closeHour, closeMin] = data.closeTime.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    return openMinutes < closeMinutes;
  }
  return true;
}, {
  message: 'Open time must be before close time',
  path: ['closeTime']
}).refine((data) => {
  // Validate breaks are within business hours
  if (data.isOpen && data.openTime && data.closeTime && data.breaks) {
    const [openHour, openMin] = data.openTime.split(':').map(Number);
    const [closeHour, closeMin] = data.closeTime.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    
    for (const breakPeriod of data.breaks) {
      const [breakStartHour, breakStartMin] = breakPeriod.startTime.split(':').map(Number);
      const [breakEndHour, breakEndMin] = breakPeriod.endTime.split(':').map(Number);
      const breakStartMinutes = breakStartHour * 60 + breakStartMin;
      const breakEndMinutes = breakEndHour * 60 + breakEndMin;
      
      if (breakStartMinutes < openMinutes || breakEndMinutes > closeMinutes) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'All breaks must be within business hours',
  path: ['breaks']
});

export const businessHoursSchema = z.object({
  monday: dayHoursSchema.optional(),
  tuesday: dayHoursSchema.optional(),
  wednesday: dayHoursSchema.optional(),
  thursday: dayHoursSchema.optional(),
  friday: dayHoursSchema.optional(),
  saturday: dayHoursSchema.optional(),
  sunday: dayHoursSchema.optional()
}).refine((data) => {
  // At least one day must be defined
  const days = Object.keys(data);
  return days.length > 0;
}, {
  message: 'At least one day must be defined in business hours',
  path: ['monday']
});

// Business Hours Override schemas
export const createBusinessHoursOverrideSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isOpen: z.boolean(),
  openTime: z.string()
    .regex(timeFormatRegex, 'Open time must be in HH:MM format (24-hour)')
    .optional(),
  closeTime: z.string()
    .regex(timeFormatRegex, 'Close time must be in HH:MM format (24-hour)')
    .optional(),
  breaks: z.array(breakPeriodSchema)
    .max(5, 'Maximum 5 breaks per day allowed')
    .optional(),
  reason: z.string()
    .max(200, 'Reason must be less than 200 characters')
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['YEARLY', 'MONTHLY', 'WEEKLY']),
    interval: z.number()
      .int('Interval must be an integer')
      .min(1, 'Interval must be at least 1')
      .max(10, 'Interval must be at most 10'),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
  }).optional()
}).refine((data) => {
  // If open, require both open and close times
  if (data.isOpen) {
    return data.openTime && data.closeTime;
  }
  return true;
}, {
  message: 'Open and close times are required when business is open',
  path: ['openTime']
}).refine((data) => {
  // If open, validate that open time is before close time
  if (data.isOpen && data.openTime && data.closeTime) {
    const [openHour, openMin] = data.openTime.split(':').map(Number);
    const [closeHour, closeMin] = data.closeTime.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    return openMinutes < closeMinutes;
  }
  return true;
}, {
  message: 'Open time must be before close time',
  path: ['closeTime']
});

export const updateBusinessHoursOverrideSchema = z.object({
  isOpen: z.boolean().optional(),
  openTime: z.string()
    .regex(timeFormatRegex, 'Open time must be in HH:MM format (24-hour)')
    .optional(),
  closeTime: z.string()
    .regex(timeFormatRegex, 'Close time must be in HH:MM format (24-hour)')
    .optional(),
  breaks: z.array(breakPeriodSchema)
    .max(5, 'Maximum 5 breaks per day allowed')
    .optional(),
  reason: z.string()
    .max(200, 'Reason must be less than 200 characters')
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['YEARLY', 'MONTHLY', 'WEEKLY']),
    interval: z.number()
      .int('Interval must be an integer')
      .min(1, 'Interval must be at least 1')
      .max(10, 'Interval must be at most 10'),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
  }).optional()
});

export const businessHoursStatusSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional()
});

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
  
  // website is auto-generated, not user input
  
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
  
  // website is auto-generated, not user input
  
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
  
  businessHours: businessHoursSchema.optional(),
  
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

// Business Settings validation schemas
export const updateBusinessPriceSettingsSchema = z.object({
  hideAllServicePrices: z.boolean()
    .optional()
    .describe('Hide prices for all services business-wide'),
  
  showPriceOnBooking: z.boolean()
    .optional()
    .default(true)
    .describe('Show prices during the booking flow even if hidden on service list'),
    
  priceDisplayMessage: z.string()
    .max(100, 'Price display message must be less than 100 characters')
    .optional()
    .describe('Custom message to show when prices are hidden (e.g., "Contact us for pricing")')
});

export const updateBusinessStaffPrivacySettingsSchema = z.object({
  hideStaffNames: z.boolean()
    .optional()
    .default(false)
    .describe('Hide individual staff member names from customers during booking'),
  
  staffDisplayMode: z.enum(['NAMES', 'ROLES', 'GENERIC'])
    .optional()
    .default('NAMES')
    .describe('How to display staff to customers: NAMES (show actual names), ROLES (show role titles), GENERIC (show generic labels)'),
    
  customStaffLabels: z.object({
    owner: z.string()
      .max(50, 'Owner label must be less than 50 characters')
      .optional()
      .default('Owner')
      .describe('Custom label for business owner'),
    manager: z.string()
      .max(50, 'Manager label must be less than 50 characters')
      .optional()
      .default('Manager')
      .describe('Custom label for managers'),
    staff: z.string()
      .max(50, 'Staff label must be less than 50 characters')
      .optional()
      .default('Staff')
      .describe('Custom label for staff members'),
    receptionist: z.string()
      .max(50, 'Receptionist label must be less than 50 characters')
      .optional()
      .default('Receptionist')
      .describe('Custom label for receptionists')
  })
  .optional()
  .describe('Custom labels for different staff roles when names are hidden')
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
  
  showPrice: z.boolean()
    .optional()
    .default(true),
  
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
  
  isActive: z.boolean().optional(),
  
  showPrice: z.boolean().optional(),
  
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
    .min(1, 'Staff ID is required'),

  customerId: z.string()
    .min(1, 'Customer ID is required')
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
    .refine((val) => {
      // Prefer datetime format (ISO) for better precision, but allow date-only
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return datetimeRegex.test(val) || dateRegex.test(val) || !isNaN(Date.parse(val));
    }, 'Start date must be a valid datetime (e.g., "2025-08-24T14:30:00") or date (e.g., "2025-08-24")'),
  
  endDate: z.string()
    .refine((val) => {
      // Prefer datetime format (ISO) for better precision, but allow date-only
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return datetimeRegex.test(val) || dateRegex.test(val) || !isNaN(Date.parse(val));
    }, 'End date must be a valid datetime (e.g., "2025-08-24T17:00:00") or date (e.g., "2025-08-24")')
    .optional(),
  
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(200, 'Reason must be less than 200 characters'),
  
  type: z.nativeEnum(ClosureType)
}).refine((data) => {
  if (data.endDate) {
    const start = parseDate(data.startDate);
    const end = parseDate(data.endDate);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
  }
  return true;
}, {
  message: 'End date must be at or after start date',
  path: ['endDate']
});

export const updateBusinessClosureSchema = z.object({
  startDate: z.string()
    .refine((val) => {
      // Accept both date (YYYY-MM-DD) and datetime (ISO) formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      return dateRegex.test(val) || datetimeRegex.test(val) || !isNaN(Date.parse(val));
    }, 'Start date must be a valid date')
    .optional(),
  
  endDate: z.string()
    .refine((val) => {
      // Accept both date (YYYY-MM-DD) and datetime (ISO) formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      return dateRegex.test(val) || datetimeRegex.test(val) || !isNaN(Date.parse(val));
    }, 'End date must be a valid date')
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

const parseDate = (dateString: string): Date => {
  // Check if it's a date-only string (YYYY-MM-DD)
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (dateOnlyRegex.test(dateString)) {
    // For date-only strings, create a date in local timezone at start of day
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  }
  
  // For datetime strings, use normal parsing
  return new Date(dateString);
};

export const validateClosureDates = (startDate: string, endDate?: string): boolean => {
  try {
    const start = parseDate(startDate);
    const now = new Date();
    
    // Allow a small buffer (5 minutes) to account for time differences and request processing
    const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    const minimumAllowedTime = new Date(now.getTime() - bufferMs);
    
    // Start date cannot be in the past (with buffer)
    if (start < minimumAllowedTime) {
      return false;
    }
    
    if (endDate) {
      const end = parseDate(endDate);
      // End date must be at or after start date
      return end >= start;
    }
    
    return true;
  } catch {
    return false;
  }
};

// Image upload validation schemas
export const imageUploadSchema = z.object({
  imageType: z.enum(['logo', 'cover', 'profile', 'gallery'], {
    errorMap: () => ({ message: 'Image type must be one of: logo, cover, profile, gallery' })
  })
});

export const updateBusinessImagesSchema = z.object({
  logoUrl: z.string()
    .url('Invalid logo URL')
    .optional(),
  
  coverImageUrl: z.string()
    .url('Invalid cover image URL')
    .optional(),
    
  profileImageUrl: z.string()
    .url('Invalid profile image URL')
    .optional(),
    
  galleryImages: z.array(z.string().url('Invalid gallery image URL'))
    .max(10, 'Maximum 10 gallery images allowed')
    .optional()
});

export const deleteImageSchema = z.object({
  imageType: z.enum(['logo', 'cover', 'profile'], {
    errorMap: () => ({ message: 'Image type must be one of: logo, cover, profile' })
  })
});

export const deleteGalleryImageSchema = z.object({
  imageUrl: z.string()
    .url('Invalid image URL')
});

// Export schema types for TypeScript
export type CreateBusinessSchema = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessSchema = z.infer<typeof updateBusinessSchema>;
export type UpdateBusinessPriceSettingsSchema = z.infer<typeof updateBusinessPriceSettingsSchema>;
export type UpdateBusinessStaffPrivacySettingsSchema = z.infer<typeof updateBusinessStaffPrivacySettingsSchema>;
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

// Image schema types
export type ImageUploadSchema = z.infer<typeof imageUploadSchema>;
export type UpdateBusinessImagesSchema = z.infer<typeof updateBusinessImagesSchema>;
export type DeleteImageSchema = z.infer<typeof deleteImageSchema>;
export type DeleteGalleryImageSchema = z.infer<typeof deleteGalleryImageSchema>;

// Business Hours schema types
export type BusinessHoursSchema = z.infer<typeof businessHoursSchema>;
export type CreateBusinessHoursOverrideSchema = z.infer<typeof createBusinessHoursOverrideSchema>;
export type UpdateBusinessHoursOverrideSchema = z.infer<typeof updateBusinessHoursOverrideSchema>;
export type BusinessHoursStatusSchema = z.infer<typeof businessHoursStatusSchema>;

// Business Notification Settings schemas
export const businessNotificationSettingsSchema = z.object({
  enableAppointmentReminders: z.boolean()
    .optional()
    .default(true)
    .describe('Enable appointment reminder notifications'),

  reminderChannels: z.array(z.enum(['SMS', 'PUSH', 'EMAIL']))
    .min(1, 'At least one reminder channel must be selected')
    .max(3, 'Maximum 3 reminder channels allowed')
    .optional()
    .default(['PUSH'])
    .describe('Notification channels to use for reminders'),

  reminderTiming: z.array(z.number()
    .int('Reminder timing must be integers')
    .min(5, 'Minimum reminder time is 5 minutes')
    .max(10080, 'Maximum reminder time is 7 days (10080 minutes)'))
    .min(1, 'At least one reminder time must be specified')
    .max(5, 'Maximum 5 reminder times allowed')
    .optional()
    .default([60, 1440])
    .describe('Minutes before appointment to send reminders'),

  smsEnabled: z.boolean()
    .optional()
    .default(false)
    .describe('Enable SMS notifications'),

  pushEnabled: z.boolean()
    .optional()
    .default(true)
    .describe('Enable push notifications'),

  emailEnabled: z.boolean()
    .optional()
    .default(false)
    .describe('Enable email notifications'),

  quietHours: z.object({
    start: z.string()
      .regex(timeFormatRegex, 'Start time must be in HH:MM format (24-hour)'),
    end: z.string()
      .regex(timeFormatRegex, 'End time must be in HH:MM format (24-hour)')
  }).optional()
    .describe('Quiet hours when notifications should not be sent'),

  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional()
    .default('Europe/Istanbul')
    .describe('Business timezone for scheduling reminders')
}).refine((data) => {
  // Validate quiet hours if provided
  if (data.quietHours) {
    const [startHour, startMin] = data.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = data.quietHours.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Allow overnight quiet hours (e.g., 22:00 - 06:00)
    // Both same time (no quiet hours) and different times are valid
    return startMinutes !== endMinutes;
  }
  return true;
}, {
  message: 'Quiet hours start and end times cannot be the same',
  path: ['quietHours']
}).refine((data) => {
  // Sort and validate reminder timing
  if (data.reminderTiming && data.reminderTiming.length > 1) {
    const sorted = [...data.reminderTiming].sort((a, b) => a - b);
    const hasDuplicates = sorted.some((time, index) => index > 0 && time === sorted[index - 1]);
    return !hasDuplicates;
  }
  return true;
}, {
  message: 'Reminder times must be unique',
  path: ['reminderTiming']
});

// Partial update schema for notification settings (supports smart validation)
export const updateBusinessNotificationSettingsSchema = z.object({
  enableAppointmentReminders: z.boolean()
    .optional()
    .describe('Enable appointment reminder notifications'),

  reminderChannels: z.array(z.enum(['SMS', 'PUSH', 'EMAIL']))
    .max(3, 'Maximum 3 reminder channels allowed')
    .optional()
    .describe('Notification channels to use for reminders (auto-synced with enabled channels)'),

  reminderTiming: z.array(z.number()
    .int('Reminder timing must be integers')
    .min(5, 'Minimum reminder time is 5 minutes')
    .max(10080, 'Maximum reminder time is 7 days (10080 minutes)'))
    .max(5, 'Maximum 5 reminder times allowed')
    .optional()
    .describe('Minutes before appointment to send reminders'),

  smsEnabled: z.boolean()
    .optional()
    .describe('Enable SMS notifications'),

  pushEnabled: z.boolean()
    .optional()
    .describe('Enable push notifications'),

  emailEnabled: z.boolean()
    .optional()
    .describe('Enable email notifications'),

  quietHours: z.object({
    start: z.string()
      .regex(timeFormatRegex, 'Start time must be in HH:MM format (24-hour)'),
    end: z.string()
      .regex(timeFormatRegex, 'End time must be in HH:MM format (24-hour)')
  }).optional()
    .describe('Quiet hours when notifications should not be sent'),

  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional()
    .describe('Business timezone for scheduling reminders')
});

export const testReminderSchema = z.object({
  appointmentId: z.string()
    .optional()
    .describe('Existing appointment ID to test reminder for'),

  channels: z.array(z.enum(['SMS', 'PUSH', 'EMAIL']))
    .min(1, 'At least one channel must be selected for testing')
    .optional()
    .describe('Channels to test (will use business settings if not provided)'),

  customMessage: z.string()
    .max(500, 'Custom message must be less than 500 characters')
    .optional()
    .describe('Custom message for testing')
});

// Export notification settings schema types
export type BusinessNotificationSettingsSchema = z.infer<typeof businessNotificationSettingsSchema>;
export type UpdateBusinessNotificationSettingsSchema = z.infer<typeof updateBusinessNotificationSettingsSchema>;
export type TestReminderSchema = z.infer<typeof testReminderSchema>;