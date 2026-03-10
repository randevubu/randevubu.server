-- Prevent overlapping appointments per staff using Postgres exclusion constraint

-- 1) Required extension for GiST btree operators (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) Drop conflicting index/constraints if they exist from prior attempts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_per_staff') THEN
    ALTER TABLE public.appointments DROP CONSTRAINT appointments_no_overlap_per_staff;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'appointments_time_range_idx') THEN
    DROP INDEX appointments_time_range_idx;
  END IF;
END$$;

-- 3) Create an immutable function that extracts the epoch and converts it to a standard timestamp
-- This is guaranteed to be immutable because epoch is an absolute number of seconds
CREATE OR REPLACE FUNCTION ts_to_immutable(t timestamptz) 
RETURNS timestamp AS $$
  SELECT to_timestamp(extract(epoch from t))::timestamp;
$$ LANGUAGE sql IMMUTABLE;

-- 4) Add a simple tsrange column (not generated, we will populate it via trigger)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS time_range tsrange;

-- 5) Create a trigger function to keep the time_range updated
CREATE OR REPLACE FUNCTION update_appointment_time_range()
RETURNS trigger AS $$
BEGIN
  -- We just cast to timestamp since triggers don't have the strict immutability requirement
  NEW.time_range := tsrange(NEW."startTime"::timestamp, NEW."endTime"::timestamp, '[)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6) Attach the trigger
DROP TRIGGER IF EXISTS trg_update_appointment_time_range ON public.appointments;
CREATE TRIGGER trg_update_appointment_time_range
  BEFORE INSERT OR UPDATE OF "startTime", "endTime"
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_time_range();

-- 7) Update existing rows to populate the time_range column
UPDATE public.appointments 
SET time_range = tsrange("startTime"::timestamp, "endTime"::timestamp, '[)');

-- 8) Forbid overlaps for the same staff using the time_range column directly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'appointments'
      AND c.conname = 'appointments_no_overlap_per_staff'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_no_overlap_per_staff
      EXCLUDE USING gist (
        "staffId" WITH =,
        time_range WITH &&
      )
      WHERE ("staffId" IS NOT NULL);
  END IF;
END$$;















