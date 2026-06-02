-- AddColumn
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "googleAverageRating" DOUBLE PRECISION;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "googleTotalRatings" INTEGER;
