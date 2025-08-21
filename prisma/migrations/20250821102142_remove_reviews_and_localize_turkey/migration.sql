/*
  Warnings:

  - You are about to drop the column `rating` on the `businesses` table. All the data in the column will be lost.
  - You are about to drop the column `totalReviews` on the `businesses` table. All the data in the column will be lost.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_customerId_fkey";

-- DropIndex
DROP INDEX "public"."businesses_rating_idx";

-- AlterTable
ALTER TABLE "public"."appointment_payments" ALTER COLUMN "currency" SET DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "public"."appointments" ALTER COLUMN "currency" SET DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "public"."businesses" DROP COLUMN "rating",
DROP COLUMN "totalReviews";

-- AlterTable
ALTER TABLE "public"."payments" ALTER COLUMN "currency" SET DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "public"."services" ALTER COLUMN "currency" SET DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "public"."subscription_plans" ALTER COLUMN "currency" SET DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "timezone" SET DEFAULT 'Europe/Istanbul',
ALTER COLUMN "language" SET DEFAULT 'tr';

-- DropTable
DROP TABLE "public"."reviews";
