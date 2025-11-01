-- Prevent overlapping appointments per staff using Postgres exclusion constraint

-- 1) Required extension for GiST btree operators (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) Add a generated half-open time range column so back-to-back is allowed
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS time_range tstzrange
  GENERATED ALWAYS AS (tstzrange("startTime", "endTime", '[)')) STORED;

-- 3) Forbid overlaps for the same staff
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





