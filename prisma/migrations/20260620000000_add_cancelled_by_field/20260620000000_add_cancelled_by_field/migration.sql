-- CreateEnum
CREATE TYPE "cancelled_by" AS ENUM ('CUSTOMER', 'BUSINESS', 'SYSTEM');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "cancelledBy" "cancelled_by";
