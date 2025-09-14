-- Update existing businesses and users with UTC timezone to use Istanbul timezone
-- This script should be run after the schema changes

-- Update businesses that currently have UTC timezone to use Europe/Istanbul
UPDATE businesses
SET timezone = 'Europe/Istanbul'
WHERE timezone = 'UTC';

-- Update users that currently have UTC timezone to use Europe/Istanbul
UPDATE users
SET timezone = 'Europe/Istanbul'
WHERE timezone = 'UTC';

-- Optional: Check how many records were updated
-- SELECT COUNT(*) as updated_businesses FROM businesses WHERE timezone = 'Europe/Istanbul';
-- SELECT COUNT(*) as updated_users FROM users WHERE timezone = 'Europe/Istanbul';