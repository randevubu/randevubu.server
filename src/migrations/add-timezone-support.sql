-- Add timezone support to businesses table
-- This migration adds timezone field to businesses for scalable multi-timezone support

ALTER TABLE businesses 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Istanbul';

-- Update existing businesses to use Istanbul timezone
UPDATE businesses 
SET timezone = 'Europe/Istanbul' 
WHERE timezone IS NULL;

-- Add index for timezone queries
CREATE INDEX idx_businesses_timezone ON businesses(timezone);

-- Add timezone validation constraint
ALTER TABLE businesses 
ADD CONSTRAINT chk_businesses_timezone 
CHECK (timezone IN (
  'Europe/Istanbul',
  'Europe/London', 
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
));

