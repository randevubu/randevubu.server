-- Migration: Associate services with staff members instead of only businesses
-- This is a breaking change that requires data migration

-- Step 1: Add staffId column to services table (nullable first for safe migration)
ALTER TABLE services ADD COLUMN staff_id TEXT;

-- Step 2: Create an index for performance
CREATE INDEX IF NOT EXISTS "services_staff_id_idx" ON "services"("staff_id");

-- Step 3: Migrate existing services to business owners
-- This will assign all existing services to the business owner (OWNER role)
UPDATE services
SET staff_id = (
    SELECT bs.id
    FROM business_staff bs
    WHERE bs.business_id = services.business_id
    AND bs.role = 'OWNER'
    AND bs.is_active = true
    LIMIT 1
)
WHERE staff_id IS NULL;

-- Step 4: For services where no owner was found, create a staff record for the business owner
-- This handles edge cases where the owner might not be in business_staff table
INSERT INTO business_staff (id, business_id, user_id, role, is_active, joined_at, created_at, updated_at)
SELECT
    CONCAT('staff_', b.id, '_', b.owner_id),
    b.id,
    b.owner_id,
    'OWNER',
    true,
    b.created_at,
    b.created_at,
    b.updated_at
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1
    FROM business_staff bs
    WHERE bs.business_id = b.id
    AND bs.user_id = b.owner_id
    AND bs.role = 'OWNER'
)
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Step 5: Update any remaining services without staff_id (fallback)
UPDATE services
SET staff_id = (
    SELECT bs.id
    FROM business_staff bs
    WHERE bs.business_id = services.business_id
    AND bs.role = 'OWNER'
    AND bs.is_active = true
    LIMIT 1
)
WHERE staff_id IS NULL;

-- Step 6: Make staff_id NOT NULL after migration
ALTER TABLE services ALTER COLUMN staff_id SET NOT NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE services ADD CONSTRAINT "services_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "business_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Remove the old ServiceStaff relationships that are now redundant
-- Keep the table for now but we'll phase it out in future updates
-- The ServiceStaff table can now be used for additional service assignments beyond the primary owner