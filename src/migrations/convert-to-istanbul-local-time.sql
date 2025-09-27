-- Migration to convert appointment times from UTC to Istanbul local time
-- This ensures all times are stored as Istanbul local time, not UTC

-- Add comments to document the timezone approach
COMMENT ON COLUMN appointments.date IS 'Business date in YYYY-MM-DD format, representing which business day the appointment belongs to, timezone-independent';
COMMENT ON COLUMN appointments.start_time IS 'Appointment start time in Istanbul local time (no UTC conversion)';
COMMENT ON COLUMN appointments.end_time IS 'Appointment end time in Istanbul local time (no UTC conversion)';
COMMENT ON COLUMN appointments.booked_at IS 'When appointment was booked, in Istanbul local time';

-- Note: Existing appointment times will need manual adjustment if they were stored as UTC
-- For new deployments, this ensures all times are consistently Istanbul local time