import { z } from 'zod';
import { DiscountType } from '@prisma/client';

// Base discount code schema
export const discountCodeBaseSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers')
    .optional(),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  
  discountType: z.enum([DiscountType.PERCENTAGE, DiscountType.FIXED_AMOUNT], {
    errorMap: () => ({ message: 'Discount type must be PERCENTAGE or FIXED_AMOUNT' })
  }),
  
  discountValue: z.number()
    .positive('Discount value must be positive'),
  
  maxUsages: z.number()
    .int('Max usages must be an integer')
    .positive('Max usages must be positive')
    .max(10000, 'Max usages cannot exceed 10,000')
    .default(1)
    .optional(),
  
  validFrom: z.string()
    .datetime('Invalid date format for validFrom')
    .transform((str) => new Date(str))
    .optional(),
  
  validUntil: z.string()
    .datetime('Invalid date format for validUntil')
    .transform((str) => new Date(str))
    .optional(),
  
  minPurchaseAmount: z.number()
    .positive('Minimum purchase amount must be positive')
    .optional(),
  
  applicablePlans: z.array(z.string().uuid('Invalid plan ID format'))
    .default([])
    .optional(),
  
  metadata: z.record(z.any()).optional()
});

// Create discount code schema with custom validation
export const createDiscountCodeSchema = discountCodeBaseSchema
  .refine(
    (data) => {
      if (data.validFrom && data.validUntil) {
        return data.validUntil > data.validFrom;
      }
      return true;
    },
    {
      message: 'Valid until date must be after valid from date',
      path: ['validUntil']
    }
  )
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue']
    }
  );

// Update discount code schema (all fields optional except validation rules)
export const updateDiscountCodeSchema = discountCodeBaseSchema
  .partial()
  .refine(
    (data) => {
      if (data.validFrom && data.validUntil) {
        return data.validUntil > data.validFrom;
      }
      return true;
    },
    {
      message: 'Valid until date must be after valid from date',
      path: ['validUntil']
    }
  )
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE && data.discountValue && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue']
    }
  );

// Validate discount code schema for checkout
export const validateDiscountCodeSchema = z.object({
  code: z.string()
    .min(1, 'Discount code is required')
    .max(20, 'Invalid discount code format'),
  
  planId: z.string()
    .uuid('Invalid plan ID format'),
  
  amount: z.number()
    .positive('Amount must be positive')
});

// Bulk discount code generation schema
export const bulkDiscountCodeSchema = z.object({
  prefix: z.string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(8, 'Prefix must be at most 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Prefix must contain only uppercase letters and numbers')
    .default('BULK')
    .optional(),
  
  count: z.number()
    .int('Count must be an integer')
    .min(1, 'Count must be at least 1')
    .max(1000, 'Cannot generate more than 1000 codes at once'),
  
  discountType: z.enum([DiscountType.PERCENTAGE, DiscountType.FIXED_AMOUNT]),
  
  discountValue: z.number()
    .positive('Discount value must be positive'),
  
  maxUsages: z.number()
    .int('Max usages must be an integer')
    .positive('Max usages must be positive')
    .max(10000, 'Max usages cannot exceed 10,000')
    .default(1)
    .optional(),
  
  validUntil: z.string()
    .datetime('Invalid date format for validUntil')
    .transform((str) => new Date(str))
    .optional(),
  
  minPurchaseAmount: z.number()
    .positive('Minimum purchase amount must be positive')
    .optional(),
  
  applicablePlans: z.array(z.string().uuid('Invalid plan ID format'))
    .default([])
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
}).refine(
  (data) => {
    if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue']
  }
);

// Query parameters schema for listing discount codes
export const listDiscountCodesSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform((str) => parseInt(str, 10))
    .refine((num) => num >= 1, 'Page must be at least 1')
    .default('1')
    .optional(),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform((str) => parseInt(str, 10))
    .refine((num) => num >= 1 && num <= 100, 'Limit must be between 1 and 100')
    .default('20')
    .optional(),
  
  isActive: z.string()
    .refine((str) => str === 'true' || str === 'false', 'isActive must be true or false')
    .transform((str) => str === 'true')
    .optional(),
  
  search: z.string()
    .max(100, 'Search query must be at most 100 characters')
    .optional()
});

// Usage history query schema
export const usageHistoryQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform((str) => parseInt(str, 10))
    .refine((num) => num >= 1, 'Page must be at least 1')
    .default('1')
    .optional(),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform((str) => parseInt(str, 10))
    .refine((num) => num >= 1 && num <= 100, 'Limit must be between 1 and 100')
    .default('20')
    .optional()
});

// Export type definitions for use in controllers
export type CreateDiscountCodeRequest = z.infer<typeof createDiscountCodeSchema>;
export type UpdateDiscountCodeRequest = z.infer<typeof updateDiscountCodeSchema>;
export type ValidateDiscountCodeRequest = z.infer<typeof validateDiscountCodeSchema>;
export type BulkDiscountCodeRequest = z.infer<typeof bulkDiscountCodeSchema>;
export type ListDiscountCodesQuery = z.infer<typeof listDiscountCodesSchema>;
export type UsageHistoryQuery = z.infer<typeof usageHistoryQuerySchema>;