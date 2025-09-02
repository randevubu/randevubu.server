/*
  Warnings:

  - The values [PENDING,IN_PROGRESS] on the enum `appointment_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `category` on the `services` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."notification_channel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "public"."notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "public"."customer_response" AS ENUM ('ACCEPTED', 'DECLINED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "public"."discount_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."appointment_status_new" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW');
ALTER TABLE "public"."appointments" ALTER COLUMN "status" TYPE "public"."appointment_status_new" USING ("status"::text::"public"."appointment_status_new");
ALTER TYPE "public"."appointment_status" RENAME TO "appointment_status_old";
ALTER TYPE "public"."appointment_status_new" RENAME TO "appointment_status";
DROP TYPE "public"."appointment_status_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."services_category_idx";

-- AlterTable
ALTER TABLE "public"."business_closures" ADD COLUMN     "affectedServices" JSONB,
ADD COLUMN     "createdAppointmentsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationChannels" JSONB,
ADD COLUMN     "notificationMessage" TEXT,
ADD COLUMN     "notifiedCustomersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notifyCustomers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurringPattern" JSONB;

-- AlterTable
ALTER TABLE "public"."business_subscriptions" ADD COLUMN     "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "failedPaymentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethodId" TEXT;

-- AlterTable
ALTER TABLE "public"."services" DROP COLUMN "category";

-- CreateTable
CREATE TABLE "public"."stored_payment_methods" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cardHolderName" TEXT NOT NULL,
    "lastFourDigits" TEXT NOT NULL,
    "cardBrand" TEXT,
    "expiryMonth" TEXT NOT NULL,
    "expiryYear" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerToken" TEXT,
    "providerCardId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stored_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."availability_alerts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT,
    "preferredDates" JSONB,
    "notificationPreferences" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."closure_notifications" (
    "id" TEXT NOT NULL,
    "closureId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "public"."notification_channel" NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "public"."notification_status" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closure_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reschedule_suggestions" (
    "id" TEXT NOT NULL,
    "originalAppointmentId" TEXT NOT NULL,
    "closureId" TEXT NOT NULL,
    "suggestedDates" JSONB NOT NULL,
    "customerResponse" "public"."customer_response",
    "responseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reschedule_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "discountType" "public"."discount_type" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUsages" INTEGER NOT NULL DEFAULT 1,
    "currentUsages" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "minPurchaseAmount" DECIMAL(10,2),
    "applicablePlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."discount_code_usages" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "businessSubscriptionId" TEXT,
    "paymentId" TEXT,
    "userId" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "discount_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "smssSent" INTEGER NOT NULL DEFAULT 0,
    "appointmentsCreated" INTEGER NOT NULL DEFAULT 0,
    "staffMembersActive" INTEGER NOT NULL DEFAULT 0,
    "customersAdded" INTEGER NOT NULL DEFAULT 0,
    "servicesActive" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
    "apiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_sms_usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "smsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_sms_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stored_payment_methods_businessId_idx" ON "public"."stored_payment_methods"("businessId");

-- CreateIndex
CREATE INDEX "stored_payment_methods_isDefault_isActive_idx" ON "public"."stored_payment_methods"("isDefault", "isActive");

-- CreateIndex
CREATE INDEX "availability_alerts_customerId_idx" ON "public"."availability_alerts"("customerId");

-- CreateIndex
CREATE INDEX "availability_alerts_businessId_idx" ON "public"."availability_alerts"("businessId");

-- CreateIndex
CREATE INDEX "availability_alerts_serviceId_idx" ON "public"."availability_alerts"("serviceId");

-- CreateIndex
CREATE INDEX "availability_alerts_isActive_idx" ON "public"."availability_alerts"("isActive");

-- CreateIndex
CREATE INDEX "closure_notifications_closureId_idx" ON "public"."closure_notifications"("closureId");

-- CreateIndex
CREATE INDEX "closure_notifications_customerId_idx" ON "public"."closure_notifications"("customerId");

-- CreateIndex
CREATE INDEX "closure_notifications_status_idx" ON "public"."closure_notifications"("status");

-- CreateIndex
CREATE INDEX "closure_notifications_sentAt_idx" ON "public"."closure_notifications"("sentAt");

-- CreateIndex
CREATE INDEX "reschedule_suggestions_originalAppointmentId_idx" ON "public"."reschedule_suggestions"("originalAppointmentId");

-- CreateIndex
CREATE INDEX "reschedule_suggestions_closureId_idx" ON "public"."reschedule_suggestions"("closureId");

-- CreateIndex
CREATE INDEX "reschedule_suggestions_customerResponse_idx" ON "public"."reschedule_suggestions"("customerResponse");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "public"."discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_code_idx" ON "public"."discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_isActive_idx" ON "public"."discount_codes"("isActive");

-- CreateIndex
CREATE INDEX "discount_codes_validFrom_validUntil_idx" ON "public"."discount_codes"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "discount_code_usages_discountCodeId_idx" ON "public"."discount_code_usages"("discountCodeId");

-- CreateIndex
CREATE INDEX "discount_code_usages_userId_idx" ON "public"."discount_code_usages"("userId");

-- CreateIndex
CREATE INDEX "discount_code_usages_usedAt_idx" ON "public"."discount_code_usages"("usedAt");

-- CreateIndex
CREATE INDEX "business_usage_businessId_idx" ON "public"."business_usage"("businessId");

-- CreateIndex
CREATE INDEX "business_usage_month_year_idx" ON "public"."business_usage"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "business_usage_businessId_month_year_key" ON "public"."business_usage"("businessId", "month", "year");

-- CreateIndex
CREATE INDEX "daily_sms_usage_businessId_idx" ON "public"."daily_sms_usage"("businessId");

-- CreateIndex
CREATE INDEX "daily_sms_usage_date_idx" ON "public"."daily_sms_usage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_sms_usage_businessId_date_key" ON "public"."daily_sms_usage"("businessId", "date");

-- CreateIndex
CREATE INDEX "business_closures_type_idx" ON "public"."business_closures"("type");

-- CreateIndex
CREATE INDEX "business_closures_isRecurring_idx" ON "public"."business_closures"("isRecurring");

-- AddForeignKey
ALTER TABLE "public"."stored_payment_methods" ADD CONSTRAINT "stored_payment_methods_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."stored_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."availability_alerts" ADD CONSTRAINT "availability_alerts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."availability_alerts" ADD CONSTRAINT "availability_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."availability_alerts" ADD CONSTRAINT "availability_alerts_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."closure_notifications" ADD CONSTRAINT "closure_notifications_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "public"."business_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."closure_notifications" ADD CONSTRAINT "closure_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reschedule_suggestions" ADD CONSTRAINT "reschedule_suggestions_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "public"."business_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reschedule_suggestions" ADD CONSTRAINT "reschedule_suggestions_originalAppointmentId_fkey" FOREIGN KEY ("originalAppointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_codes" ADD CONSTRAINT "discount_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "public"."discount_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "public"."business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_code_usages" ADD CONSTRAINT "discount_code_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_usage" ADD CONSTRAINT "business_usage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_sms_usage" ADD CONSTRAINT "daily_sms_usage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
