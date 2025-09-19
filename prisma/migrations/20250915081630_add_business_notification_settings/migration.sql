-- AlterTable
ALTER TABLE "public"."businesses" ALTER COLUMN "timezone" SET DEFAULT 'Europe/Istanbul';

-- CreateTable
CREATE TABLE "public"."business_notification_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enableAppointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderChannels" JSONB NOT NULL DEFAULT '["PUSH"]',
    "reminderTiming" JSONB NOT NULL DEFAULT '[60, 1440]',
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_notification_settings_businessId_key" ON "public"."business_notification_settings"("businessId");

-- CreateIndex
CREATE INDEX "business_notification_settings_businessId_idx" ON "public"."business_notification_settings"("businessId");

-- AddForeignKey
ALTER TABLE "public"."business_notification_settings" ADD CONSTRAINT "business_notification_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
