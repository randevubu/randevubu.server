-- Add rating fields to businesses table
-- These fields were removed in a previous migration but are needed for the rating system

-- AlterTable
ALTER TABLE "public"."businesses" 
ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalRatings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastRatingAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "businesses_averageRating_idx" ON "public"."businesses"("averageRating");

-- CreateIndex  
CREATE INDEX IF NOT EXISTS "businesses_totalRatings_idx" ON "public"."businesses"("totalRatings");




