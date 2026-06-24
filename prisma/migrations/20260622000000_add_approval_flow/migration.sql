-- Add PENDING_APPROVAL and REJECTED_BY_BUSINESS to appointment_status enum
ALTER TYPE "appointment_status" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' AFTER 'PENDING';
ALTER TYPE "appointment_status" ADD VALUE IF NOT EXISTS 'REJECTED_BY_BUSINESS' AFTER 'NO_SHOW';

-- Add requireApproval column to businesses table
ALTER TABLE "businesses" ADD COLUMN "requireApproval" BOOLEAN NOT NULL DEFAULT false;
