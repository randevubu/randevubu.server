-- Rate limit Google Places sync (max 3 attempts, then 30-day cooldown)
ALTER TABLE "businesses" ADD COLUMN     "googleSyncCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "businesses" ADD COLUMN     "googleSyncCooldownUntil" TIMESTAMP(3);
