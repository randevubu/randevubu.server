import { z } from 'zod';

export const submitRatingSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z.string()
    .max(1000, 'Comment must be less than 1000 characters')
    .optional(),
  isAnonymous: z.boolean().optional().default(false)
});

export const updateGoogleIntegrationSchema = z.object({
  // Accept either a Place ID (ChIJ...) or CID (0x... or numeric) or a Google URL
  googlePlaceId: z.string()
    .min(1, 'Google Place ID, CID, or URL is required')
    .optional(),
  googleUrl: z.string()
    .min(1, 'Google URL cannot be empty')
    .optional(),
  enabled: z.boolean(),
  mapEnabled: z.boolean().optional(),
  googleAverageRating: z.number().min(1).max(5).optional().nullable(),
  googleTotalRatings: z.number().int().min(0).optional().nullable(),
  isReset: z.boolean().optional(),
  reviewsHidden: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.isReset) return true;
    if (data.enabled && !data.googlePlaceId && !data.googleUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'Either googlePlaceId (or CID) or googleUrl must be provided when enabled is true'
  }
);

export const getRatingsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  minRating: z.string().regex(/^\d+$/).transform(Number).optional()
});
