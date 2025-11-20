-- Add rating fields to businesses table
-- Run this directly on your production database

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalRatings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastRatingAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "businesses_averageRating_idx" ON public.businesses("averageRating");
CREATE INDEX IF NOT EXISTS "businesses_totalRatings_idx" ON public.businesses("totalRatings");




