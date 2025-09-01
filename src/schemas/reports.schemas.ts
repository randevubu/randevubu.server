import { z } from 'zod';

// Common date range schema for all reports
export const dateRangeSchema = z.object({
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
  
  endDate: z.string()
    .datetime('Invalid end date format')
    .optional(),
    
  businessId: z.string()
    .min(1, 'Business ID is required')
    .optional()
});

// Report query parameters validation
export const reportQuerySchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID must be at least 1 character')
    .optional(),
    
  startDate: z.string()
    .datetime('Start date must be a valid ISO date')
    .optional(),
    
  endDate: z.string()
    .datetime('End date must be a valid ISO date')
    .optional(),
    
  format: z.enum(['json', 'csv'])
    .default('json')
    .optional()
}).refine(data => {
  // Validate that if both dates are provided, start date is before end date
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['startDate']
});

// Export report parameters
export const exportReportSchema = z.object({
  reportType: z.enum(['overview', 'revenue', 'appointments', 'customers'], {
    errorMap: () => ({ message: 'Report type must be one of: overview, revenue, appointments, customers' })
  }),
  
  businessId: z.string()
    .min(1, 'Business ID must be at least 1 character')
    .optional(),
    
  startDate: z.string()
    .datetime('Start date must be a valid ISO date')
    .optional(),
    
  endDate: z.string()
    .datetime('End date must be a valid ISO date')
    .optional(),
    
  format: z.enum(['json', 'csv', 'pdf'])
    .default('json')
    .optional(),
    
  includeCharts: z.boolean()
    .default(false)
    .optional(),
    
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional()
});

// Dashboard report configuration
export const dashboardConfigSchema = z.object({
  businessId: z.string()
    .min(1, 'Business ID must be at least 1 character')
    .optional(),
    
  dateRange: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom'])
    .default('month'),
    
  startDate: z.string()
    .datetime('Start date must be a valid ISO date')
    .optional(),
    
  endDate: z.string()
    .datetime('End date must be a valid ISO date')
    .optional(),
    
  widgets: z.array(z.enum([
    'overview', 'revenue', 'appointments', 'customers', 
    'staff', 'services', 'trends', 'comparison'
  ]))
    .min(1, 'At least one widget must be selected')
    .max(8, 'Maximum 8 widgets allowed')
    .default(['overview', 'revenue', 'appointments', 'customers'])
    .optional(),
    
  refreshInterval: z.number()
    .int('Refresh interval must be an integer')
    .min(30, 'Minimum refresh interval is 30 seconds')
    .max(3600, 'Maximum refresh interval is 1 hour')
    .default(300)
    .optional()
});

// Business comparison parameters
export const businessComparisonSchema = z.object({
  businessIds: z.array(z.string())
    .min(2, 'At least 2 businesses required for comparison')
    .max(5, 'Maximum 5 businesses can be compared')
    .optional(),
    
  startDate: z.string()
    .datetime('Start date must be a valid ISO date')
    .optional(),
    
  endDate: z.string()
    .datetime('End date must be a valid ISO date')
    .optional(),
    
  metrics: z.array(z.enum([
    'revenue', 'appointments', 'customers', 'completion_rate', 
    'average_value', 'growth_rate', 'retention'
  ]))
    .min(1, 'At least one metric must be selected')
    .default(['revenue', 'appointments', 'completion_rate'])
    .optional(),
    
  groupBy: z.enum(['day', 'week', 'month'])
    .default('day')
    .optional()
});

// Advanced filtering for detailed reports
export const advancedFilterSchema = z.object({
  businessId: z.string().optional(),
  
  // Date filters
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  
  // Service filters
  serviceIds: z.array(z.string())
    .max(20, 'Maximum 20 services can be selected')
    .optional(),
    
  // Staff filters
  staffIds: z.array(z.string())
    .max(10, 'Maximum 10 staff members can be selected')
    .optional(),
    
  // Customer filters
  customerSegment: z.enum(['new', 'returning', 'vip', 'all'])
    .default('all')
    .optional(),
    
  // Appointment filters
  appointmentStatus: z.array(z.enum(['CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW']))
    .optional(),
    
  // Financial filters
  minRevenue: z.number()
    .min(0, 'Minimum revenue must be non-negative')
    .optional(),
    
  maxRevenue: z.number()
    .min(0, 'Maximum revenue must be non-negative')
    .optional(),
    
  // Geographic filters (if applicable)
  locations: z.array(z.string())
    .max(10, 'Maximum 10 locations can be selected')
    .optional(),
    
  // Sorting and pagination
  sortBy: z.enum(['date', 'revenue', 'appointments', 'rating', 'name'])
    .default('date')
    .optional(),
    
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
    .optional(),
    
  page: z.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1)
    .optional(),
    
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit cannot exceed 1000')
    .default(50)
    .optional()
}).refine(data => {
  // Validate revenue range
  if (data.minRevenue !== undefined && data.maxRevenue !== undefined) {
    return data.minRevenue <= data.maxRevenue;
  }
  return true;
}, {
  message: 'Minimum revenue must be less than or equal to maximum revenue',
  path: ['minRevenue']
}).refine(data => {
  // Validate date range
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['startDate']
});

// Schedule report parameters
export const scheduleReportSchema = z.object({
  reportType: z.enum(['overview', 'revenue', 'appointments', 'customers']),
  
  name: z.string()
    .min(3, 'Report name must be at least 3 characters')
    .max(100, 'Report name must be less than 100 characters'),
    
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
    
  businessId: z.string().optional(),
  
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.number()
      .int()
      .min(0)
      .max(6)
      .optional(), // 0 = Sunday, 6 = Saturday (for weekly reports)
    dayOfMonth: z.number()
      .int()
      .min(1)
      .max(31)
      .optional(), // For monthly reports
    hour: z.number()
      .int()
      .min(0)
      .max(23)
      .default(9),
    timezone: z.string()
      .max(50)
      .default('UTC')
  }),
  
  recipients: z.array(z.string().email('Invalid email address'))
    .min(1, 'At least one recipient is required')
    .max(10, 'Maximum 10 recipients allowed'),
    
  format: z.enum(['pdf', 'csv', 'excel'])
    .default('pdf'),
    
  filters: advancedFilterSchema.optional(),
  
  isActive: z.boolean()
    .default(true)
});

// Report template parameters
export const reportTemplateSchema = z.object({
  name: z.string()
    .min(3, 'Template name must be at least 3 characters')
    .max(100, 'Template name must be less than 100 characters'),
    
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
    
  reportType: z.enum(['overview', 'revenue', 'appointments', 'customers']),
  
  layout: z.object({
    sections: z.array(z.enum([
      'header', 'summary', 'charts', 'tables', 'trends', 'footer'
    ])),
    theme: z.enum(['light', 'dark', 'professional', 'modern'])
      .default('professional'),
    logo: z.boolean().default(true),
    colors: z.object({
      primary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      secondary: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
    }).optional()
  }),
  
  defaultFilters: advancedFilterSchema.optional(),
  
  isPublic: z.boolean()
    .default(false),
    
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
});

// Validation helpers
export const validateDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return true;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (start > end) {
    throw new Error('Start date must be before end date');
  }
  
  // Limit date range to prevent performance issues
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    throw new Error('Date range cannot exceed 365 days');
  }
  
  return true;
};

export const validateBusinessAccess = async (userId: string, businessId?: string) => {
  // This would be implemented to check if user has access to the business
  // For now, just return true
  return true;
};