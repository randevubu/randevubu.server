/*
  Warnings:

  - You are about to drop the column `staffId` on the `services` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."services" DROP CONSTRAINT "services_staffId_fkey";

-- DropIndex
DROP INDEX "public"."services_staffId_idx";

-- AlterTable
ALTER TABLE "public"."services" DROP COLUMN "staffId";
