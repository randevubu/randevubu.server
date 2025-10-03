-- Add notification security tables
-- Industry Standard: Comprehensive audit and usage tracking

-- Notification Usage Tracking
CREATE TABLE "public"."notification_usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_usage_pkey" PRIMARY KEY ("id")
);

-- Notification Audit Log
CREATE TABLE "public"."notification_audit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "recipientCount" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_pkey" PRIMARY KEY ("id")
);

-- Customer Opt-out Tracking
CREATE TABLE "public"."customer_opt_outs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_opt_outs_pkey" PRIMARY KEY ("id")
);

-- Rate Limit Overrides (for admin use)
CREATE TABLE "public"."rate_limit_overrides" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "overrideType" TEXT NOT NULL,
    "newLimit" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_overrides_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX "notification_usage_businessId_idx" ON "public"."notification_usage"("businessId");
CREATE INDEX "notification_usage_sentAt_idx" ON "public"."notification_usage"("sentAt");
CREATE INDEX "notification_usage_type_idx" ON "public"."notification_usage"("notificationType");

CREATE INDEX "notification_audit_businessId_idx" ON "public"."notification_audit"("businessId");
CREATE INDEX "notification_audit_userId_idx" ON "public"."notification_audit"("userId");
CREATE INDEX "notification_audit_eventType_idx" ON "public"."notification_audit"("eventType");
CREATE INDEX "notification_audit_createdAt_idx" ON "public"."notification_audit"("createdAt");
CREATE INDEX "notification_audit_success_idx" ON "public"."notification_audit"("success");

CREATE INDEX "customer_opt_outs_customerId_idx" ON "public"."customer_opt_outs"("customerId");
CREATE INDEX "customer_opt_outs_businessId_idx" ON "public"."customer_opt_outs"("businessId");
CREATE UNIQUE INDEX "customer_opt_outs_customer_business_type_idx" ON "public"."customer_opt_outs"("customerId", "businessId", "notificationType");

CREATE INDEX "rate_limit_overrides_businessId_idx" ON "public"."rate_limit_overrides"("businessId");
CREATE INDEX "rate_limit_overrides_expiresAt_idx" ON "public"."rate_limit_overrides"("expiresAt");

-- Foreign key constraints
ALTER TABLE "public"."notification_usage" ADD CONSTRAINT "notification_usage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."notification_audit" ADD CONSTRAINT "notification_audit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."notification_audit" ADD CONSTRAINT "notification_audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."customer_opt_outs" ADD CONSTRAINT "customer_opt_outs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."customer_opt_outs" ADD CONSTRAINT "customer_opt_outs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."rate_limit_overrides" ADD CONSTRAINT "rate_limit_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."rate_limit_overrides" ADD CONSTRAINT "rate_limit_overrides_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

