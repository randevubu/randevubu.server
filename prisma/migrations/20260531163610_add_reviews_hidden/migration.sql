/*
  Warnings:

  - You are about to drop the column `time_range` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `city_pricing_mappings` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `city_pricing_mappings` table. All the data in the column will be lost.
  - You are about to drop the column `pricing_tier_id` on the `city_pricing_mappings` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `city_pricing_mappings` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `notification_usage` table. All the data in the column will be lost.
  - You are about to drop the column `notificationType` on the `notification_usage` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `pricing_tiers` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `pricing_tiers` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `pricing_tiers` table. All the data in the column will be lost.
  - You are about to drop the column `sort_order` on the `pricing_tiers` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `pricing_tiers` table. All the data in the column will be lost.
  - You are about to drop the `customer_opt_outs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_audit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rate_limit_overrides` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `pricingTierId` to the `city_pricing_mappings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `city_pricing_mappings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `notification_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `pricing_tiers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `pricing_tiers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "appointment_status" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "public"."city_pricing_mappings" DROP CONSTRAINT "city_pricing_mappings_pricing_tier_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."customer_opt_outs" DROP CONSTRAINT "customer_opt_outs_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."customer_opt_outs" DROP CONSTRAINT "customer_opt_outs_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."notification_audit" DROP CONSTRAINT "notification_audit_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."notification_audit" DROP CONSTRAINT "notification_audit_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."rate_limit_overrides" DROP CONSTRAINT "rate_limit_overrides_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."rate_limit_overrides" DROP CONSTRAINT "rate_limit_overrides_createdBy_fkey";

-- DropIndex
DROP INDEX "public"."city_pricing_mappings_pricing_tier_id_idx";

-- DropIndex
DROP INDEX "public"."notification_usage_type_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "time_range";

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "reviewsHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "city_pricing_mappings" DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "pricing_tier_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pricingTierId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "notification_usage" DROP COLUMN "createdAt",
DROP COLUMN "notificationType",
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "recipientCount" SET DEFAULT 1,
ALTER COLUMN "sentAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "pricing_tiers" DROP COLUMN "created_at",
DROP COLUMN "display_name",
DROP COLUMN "is_active",
DROP COLUMN "sort_order",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "public"."customer_opt_outs";

-- DropTable
DROP TABLE "public"."notification_audit";

-- DropTable
DROP TABLE "public"."rate_limit_overrides";

-- DropEnum
DROP TYPE "public"."pricing_tier";

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'notifications',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_evaluations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_evaluation_answers" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_evaluation_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_evaluation_questions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "minRating" INTEGER,
    "maxRating" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_evaluation_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birthday_reminders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "birthday_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_audits" (
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

    CONSTRAINT "notification_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reviews" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "googleReviewId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorPhotoUrl" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "publishTime" TIMESTAMP(3),
    "relativeTimeDescription" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translations_language_idx" ON "translations"("language");

-- CreateIndex
CREATE INDEX "translations_namespace_idx" ON "translations"("namespace");

-- CreateIndex
CREATE INDEX "translations_isActive_idx" ON "translations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "translations_key_language_namespace_key" ON "translations"("key", "language", "namespace");

-- CreateIndex
CREATE INDEX "customer_notes_customerId_idx" ON "customer_notes"("customerId");

-- CreateIndex
CREATE INDEX "customer_notes_businessId_idx" ON "customer_notes"("businessId");

-- CreateIndex
CREATE INDEX "customer_notes_authorId_idx" ON "customer_notes"("authorId");

-- CreateIndex
CREATE INDEX "customer_notes_noteType_idx" ON "customer_notes"("noteType");

-- CreateIndex
CREATE INDEX "customer_notes_createdAt_idx" ON "customer_notes"("createdAt");

-- CreateIndex
CREATE INDEX "customer_evaluations_customerId_idx" ON "customer_evaluations"("customerId");

-- CreateIndex
CREATE INDEX "customer_evaluations_businessId_idx" ON "customer_evaluations"("businessId");

-- CreateIndex
CREATE INDEX "customer_evaluations_appointmentId_idx" ON "customer_evaluations"("appointmentId");

-- CreateIndex
CREATE INDEX "customer_evaluations_rating_idx" ON "customer_evaluations"("rating");

-- CreateIndex
CREATE INDEX "customer_evaluations_createdAt_idx" ON "customer_evaluations"("createdAt");

-- CreateIndex
CREATE INDEX "customer_evaluation_answers_evaluationId_idx" ON "customer_evaluation_answers"("evaluationId");

-- CreateIndex
CREATE INDEX "customer_evaluation_answers_questionId_idx" ON "customer_evaluation_answers"("questionId");

-- CreateIndex
CREATE INDEX "customer_evaluation_questions_businessId_idx" ON "customer_evaluation_questions"("businessId");

-- CreateIndex
CREATE INDEX "customer_evaluation_questions_isActive_idx" ON "customer_evaluation_questions"("isActive");

-- CreateIndex
CREATE INDEX "birthday_reminders_customerId_idx" ON "birthday_reminders"("customerId");

-- CreateIndex
CREATE INDEX "birthday_reminders_businessId_idx" ON "birthday_reminders"("businessId");

-- CreateIndex
CREATE INDEX "birthday_reminders_reminderDate_idx" ON "birthday_reminders"("reminderDate");

-- CreateIndex
CREATE INDEX "birthday_reminders_sent_idx" ON "birthday_reminders"("sent");

-- CreateIndex
CREATE INDEX "notification_audits_businessId_idx" ON "notification_audits"("businessId");

-- CreateIndex
CREATE INDEX "notification_audits_userId_idx" ON "notification_audits"("userId");

-- CreateIndex
CREATE INDEX "notification_audits_eventType_idx" ON "notification_audits"("eventType");

-- CreateIndex
CREATE INDEX "notification_audits_createdAt_idx" ON "notification_audits"("createdAt");

-- CreateIndex
CREATE INDEX "notification_audits_success_idx" ON "notification_audits"("success");

-- CreateIndex
CREATE INDEX "google_reviews_businessId_idx" ON "google_reviews"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "google_reviews_businessId_googleReviewId_key" ON "google_reviews"("businessId", "googleReviewId");

-- CreateIndex
CREATE INDEX "appointments_businessId_date_status_idx" ON "appointments"("businessId", "date", "status");

-- CreateIndex
CREATE INDEX "appointments_customerId_status_startTime_idx" ON "appointments"("customerId", "status", "startTime");

-- CreateIndex
CREATE INDEX "appointments_businessId_staffId_date_idx" ON "appointments"("businessId", "staffId", "date");

-- CreateIndex
CREATE INDEX "business_usage_businessId_year_month_idx" ON "business_usage"("businessId", "year", "month");

-- CreateIndex
CREATE INDEX "city_pricing_mappings_pricingTierId_idx" ON "city_pricing_mappings"("pricingTierId");

-- CreateIndex
CREATE INDEX "notification_usage_type_idx" ON "notification_usage"("type");

-- CreateIndex
CREATE INDEX "payments_businessSubscriptionId_status_createdAt_idx" ON "payments"("businessSubscriptionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_paidAt_idx" ON "payments"("status", "paidAt");

-- AddForeignKey
ALTER TABLE "city_pricing_mappings" ADD CONSTRAINT "city_pricing_mappings_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "pricing_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_evaluations" ADD CONSTRAINT "customer_evaluations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_evaluations" ADD CONSTRAINT "customer_evaluations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_evaluations" ADD CONSTRAINT "customer_evaluations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_evaluation_answers" ADD CONSTRAINT "customer_evaluation_answers_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "customer_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_evaluation_answers" ADD CONSTRAINT "customer_evaluation_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "customer_evaluation_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_evaluation_questions" ADD CONSTRAINT "customer_evaluation_questions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birthday_reminders" ADD CONSTRAINT "birthday_reminders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birthday_reminders" ADD CONSTRAINT "birthday_reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audits" ADD CONSTRAINT "notification_audits_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audits" ADD CONSTRAINT "notification_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
