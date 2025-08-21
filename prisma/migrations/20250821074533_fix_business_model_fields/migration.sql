/*
  Warnings:

  - You are about to drop the column `coverImage` on the `businesses` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `businesses` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `businesses` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."businesses" DROP CONSTRAINT "businesses_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropIndex
DROP INDEX "public"."businesses_subscriptionId_idx";

-- DropIndex
DROP INDEX "public"."payments_subscriptionId_idx";

-- AlterTable
ALTER TABLE "public"."businesses" DROP COLUMN "coverImage",
DROP COLUMN "logo",
DROP COLUMN "subscriptionId",
ADD COLUMN     "closedUntil" TIMESTAMP(3),
ADD COLUMN     "closureReason" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "isClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."payments" DROP COLUMN "subscriptionId",
ADD COLUMN     "businessSubscriptionId" TEXT;

-- DropTable
DROP TABLE "public"."subscriptions";

-- CreateTable
CREATE TABLE "public"."business_subscriptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."subscription_status" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_businessId_key" ON "public"."business_subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "business_subscriptions_businessId_idx" ON "public"."business_subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "business_subscriptions_status_idx" ON "public"."business_subscriptions"("status");

-- CreateIndex
CREATE INDEX "business_subscriptions_currentPeriodEnd_idx" ON "public"."business_subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "payments_businessSubscriptionId_idx" ON "public"."payments"("businessSubscriptionId");

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "public"."business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
