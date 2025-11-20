-- Add Google integration fields to businesses table
-- Run this directly on your production database

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS "googleIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "googleLinkedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "googleLinkedBy" TEXT,
ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT,
ADD COLUMN IF NOT EXISTS "googleOriginalUrl" TEXT;

-- Create unique index for googlePlaceId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'businesses_googlePlaceId_key'
  ) THEN
    CREATE UNIQUE INDEX "businesses_googlePlaceId_key" ON public.businesses("googlePlaceId");
  END IF;
END$$;

-- Create regular index for querying
CREATE INDEX IF NOT EXISTS "businesses_googlePlaceId_idx" ON public.businesses("googlePlaceId");




