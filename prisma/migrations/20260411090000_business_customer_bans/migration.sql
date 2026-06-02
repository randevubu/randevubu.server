-- AddColumn business customer bans
ALTER TABLE "user_behavior" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_behavior" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "user_behavior" ADD COLUMN IF NOT EXISTS "banCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "user_behavior_isBanned_idx" ON "user_behavior"("isBanned");
