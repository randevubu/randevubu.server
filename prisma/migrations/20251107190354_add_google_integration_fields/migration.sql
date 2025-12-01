-- Add Google integration fields to businesses table
-- These fields are needed for Google Maps/Places integration

-- AlterTable
ALTER TABLE "public"."businesses" 
ADD COLUMN IF NOT EXISTS "googleIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "googleLinkedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "googleLinkedBy" TEXT,
ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT,
ADD COLUMN IF NOT EXISTS "googleOriginalUrl" TEXT;

-- CreateIndex (googlePlaceId should be unique per schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'businesses_googlePlaceId_key'
  ) THEN
    CREATE UNIQUE INDEX "businesses_googlePlaceId_key" ON "public"."businesses"("googlePlaceId");
  END IF;
END$$;

-- CreateIndex (for querying by googlePlaceId)
CREATE INDEX IF NOT EXISTS "businesses_googlePlaceId_idx" ON "public"."businesses"("googlePlaceId");





