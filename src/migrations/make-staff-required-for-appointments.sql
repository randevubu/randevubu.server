-- Migration: Make staffId required for all appointments and implement staff-specific timelines
-- Date: 2025-01-XX
-- Description: This migration fixes a critical architectural flaw where appointments could exist without staff assignment
-- This ensures industry-standard staff-specific timeline functionality

BEGIN;

-- Step 1: Check if there are any appointments without staffId
SELECT COUNT(*) as appointments_without_staff FROM appointments WHERE "staffId" IS NULL;

-- Step 2: For any appointments without staff, assign them to the business owner
-- This is a data migration to ensure all appointments have a staff member before we make the field required

-- Create a temporary function to assign unassigned appointments to business owners
CREATE OR REPLACE FUNCTION assign_missing_staff_to_owners()
RETURNS VOID AS $$
DECLARE
    appointment_record RECORD;
    owner_staff_id TEXT;
BEGIN
    -- Loop through appointments without staff
    FOR appointment_record IN
        SELECT id, "businessId" FROM appointments WHERE "staffId" IS NULL
    LOOP
        -- Find the owner's staff record for this business
        SELECT bs.id INTO owner_staff_id
        FROM business_staff bs
        INNER JOIN businesses b ON bs."businessId" = b.id
        WHERE b.id = appointment_record."businessId"
        AND bs."userId" = b."ownerId"
        AND bs."isActive" = true
        AND bs."leftAt" IS NULL
        AND bs.role = 'OWNER'
        LIMIT 1;

        -- If no owner staff record exists, create one
        IF owner_staff_id IS NULL THEN
            -- Get the business owner's user ID
            SELECT b."ownerId" INTO owner_staff_id
            FROM businesses b
            WHERE b.id = appointment_record."businessId";

            -- Create staff record for owner if it doesn't exist
            INSERT INTO business_staff (
                id,
                "businessId",
                "userId",
                role,
                permissions,
                "isActive",
                "joinedAt",
                "createdAt",
                "updatedAt"
            ) VALUES (
                'staff_' || EXTRACT(EPOCH FROM NOW()) || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
                appointment_record."businessId",
                owner_staff_id,
                'OWNER'::business_staff_role,
                '{}',
                true,
                NOW(),
                NOW(),
                NOW()
            )
            ON CONFLICT ("businessId", "userId") DO NOTHING
            RETURNING id INTO owner_staff_id;

            -- If still null (due to conflict), get the existing record
            IF owner_staff_id IS NULL THEN
                SELECT bs.id INTO owner_staff_id
                FROM business_staff bs
                INNER JOIN businesses b ON bs."businessId" = b.id
                WHERE b.id = appointment_record."businessId"
                AND bs."userId" = b."ownerId"
                LIMIT 1;
            END IF;
        END IF;

        -- Update the appointment with the staff ID
        UPDATE appointments
        SET "staffId" = owner_staff_id
        WHERE id = appointment_record.id;

        RAISE NOTICE 'Assigned appointment % to staff %', appointment_record.id, owner_staff_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the data migration
SELECT assign_missing_staff_to_owners();

-- Step 3: Verify all appointments now have staff assigned
DO $$
DECLARE
    unassigned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unassigned_count FROM appointments WHERE "staffId" IS NULL;

    IF unassigned_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % appointments still without staff assignment', unassigned_count;
    END IF;

    RAISE NOTICE 'Data migration successful: All appointments now have staff assigned';
END;
$$;

-- Step 4: Now make staffId NOT NULL
ALTER TABLE appointments ALTER COLUMN "staffId" SET NOT NULL;

-- Step 5: Add composite index for staff-specific queries (if not exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_staff_date_time
ON appointments ("staffId", date, "startTime");

-- Step 6: Update the foreign key constraint to be non-nullable
-- Drop the existing constraint and recreate it
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_staffId_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_staffId_fkey
    FOREIGN KEY ("staffId") REFERENCES business_staff(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Clean up the temporary function
DROP FUNCTION assign_missing_staff_to_owners();

-- Verify the final schema
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'appointments' AND column_name = 'staffId';

COMMIT;

-- Post-migration verification queries
-- Run these after the migration to verify everything is working correctly:

-- 1. Check that all appointments have staff
-- SELECT COUNT(*) as total_appointments,
--        COUNT("staffId") as appointments_with_staff
-- FROM appointments;

-- 2. Check that staff-specific queries work efficiently
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM appointments
-- WHERE "staffId" = 'some_staff_id'
-- AND date = '2025-01-15'::date
-- ORDER BY "startTime";

-- 3. Verify foreign key constraint is working
-- This should fail: INSERT INTO appointments (id, "businessId", "serviceId", "staffId", "customerId", date, "startTime", "endTime", duration, status, price, currency, "bookedAt")
-- VALUES ('test', 'business_id', 'service_id', 'non_existent_staff', 'customer_id', NOW()::date, NOW(), NOW() + INTERVAL '1 hour', 60, 'CONFIRMED', 100, 'TRY', NOW());