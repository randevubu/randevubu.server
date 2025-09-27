/*
  Warnings:

  - You are about to drop the column `staffId` on the `services` table. All the data in the column will be lost.

*/
-- DropForeignKey (only if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'services_staffId_fkey') THEN
        ALTER TABLE "public"."services" DROP CONSTRAINT "services_staffId_fkey";
    END IF;
END $$;

-- DropIndex (only if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'services_staffId_idx') THEN
        DROP INDEX "public"."services_staffId_idx";
    END IF;
END $$;

-- AlterTable (only if column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'staffId') THEN
        ALTER TABLE "public"."services" DROP COLUMN "staffId";
    END IF;
END $$;
