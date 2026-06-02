-- AddColumn
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "googleMapEnabled" BOOLEAN NOT NULL DEFAULT false;
