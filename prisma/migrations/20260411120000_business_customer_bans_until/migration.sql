-- AddColumn bannedUntil
ALTER TABLE "user_behavior" ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "user_behavior_bannedUntil_idx" ON "user_behavior"("bannedUntil");
