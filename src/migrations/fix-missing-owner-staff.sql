-- Fix missing owner staff records for existing businesses
-- This script identifies businesses where the owner doesn't have a staff record
-- and creates the missing staff record

INSERT INTO business_staff (
    id,
    business_id,
    user_id,
    role,
    permissions,
    is_active,
    joined_at,
    created_at,
    updated_at
)
SELECT 
    'staff_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || SUBSTRING(MD5(b.id || u.id), 1, 8) as id,
    b.id as business_id,
    b.owner_id as user_id,
    'OWNER' as role,
    '{}' as permissions,
    true as is_active,
    b.created_at as joined_at,
    NOW() as created_at,
    NOW() as updated_at
FROM businesses b
JOIN users u ON b.owner_id = u.id
WHERE b.is_active = true
  AND u.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM business_staff bs 
    WHERE bs.business_id = b.id 
      AND bs.user_id = b.owner_id 
      AND bs.role = 'OWNER'
      AND bs.is_active = true
  );

