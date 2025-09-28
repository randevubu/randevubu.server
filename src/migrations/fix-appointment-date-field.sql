-- Migration to fix appointment date field format
-- This ensures the date field only contains the business date (YYYY-MM-DD)
-- without timezone information, which was causing confusion

-- Update all appointments to have proper date format
-- Extract the date part from existing timestamp and store as date only
UPDATE appointments
SET date = DATE(date)
WHERE date IS NOT NULL;

-- Add a comment explaining the field purpose
COMMENT ON COLUMN appointments.date IS 'Business date in YYYY-MM-DD format, representing which business day the appointment belongs to, independent of timezone conversions';