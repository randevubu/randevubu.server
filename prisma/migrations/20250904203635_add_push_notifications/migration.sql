-- CreateTable
CREATE TABLE "public"."push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT DEFAULT 'web',
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableAppointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "enableBusinessNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enablePromotionalMessages" BOOLEAN NOT NULL DEFAULT false,
    "reminderTiming" JSONB NOT NULL DEFAULT '{"hours": [1, 24]}',
    "preferredChannels" JSONB NOT NULL DEFAULT '{"channels": ["PUSH", "SMS"]}',
    "quietHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."push_notifications" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "businessId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "icon" TEXT,
    "badge" TEXT,
    "data" JSONB,
    "status" "public"."notification_status" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "public"."push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_isActive_idx" ON "public"."push_subscriptions"("isActive");

-- CreateIndex
CREATE INDEX "push_subscriptions_lastUsedAt_idx" ON "public"."push_subscriptions"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "public"."push_subscriptions"("userId", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "public"."notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "public"."notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "push_notifications_subscriptionId_idx" ON "public"."push_notifications"("subscriptionId");

-- CreateIndex
CREATE INDEX "push_notifications_appointmentId_idx" ON "public"."push_notifications"("appointmentId");

-- CreateIndex
CREATE INDEX "push_notifications_businessId_idx" ON "public"."push_notifications"("businessId");

-- CreateIndex
CREATE INDEX "push_notifications_status_idx" ON "public"."push_notifications"("status");

-- CreateIndex
CREATE INDEX "push_notifications_sentAt_idx" ON "public"."push_notifications"("sentAt");

-- CreateIndex
CREATE INDEX "push_notifications_createdAt_idx" ON "public"."push_notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_notifications" ADD CONSTRAINT "push_notifications_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_notifications" ADD CONSTRAINT "push_notifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_notifications" ADD CONSTRAINT "push_notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
