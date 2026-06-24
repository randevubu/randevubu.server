-- Restore double-booking protection for appointments.
--
-- A previous migration dropped the `time_range` column (Prisma drift), which
-- silently removed the `appointments_no_overlap_per_staff` exclusion constraint.
-- The application code still expects that constraint (it maps the violation to a
-- clean 409). This migration restores it AND tightens it to only block ACTIVE
-- statuses, so cancelled/completed/no-show appointments no longer hold a slot.
--
-- The `time_range` column is now also declared in schema.prisma as
-- Unsupported("tsrange") so Prisma will not drop it again.

-- 1) Required extension for GiST btree operators (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) SAFETY GUARD: refuse to run if the current data already contains overlapping
--    appointments for the same staff among active statuses. Adding the constraint
--    would otherwise fail midway; instead we abort with a clear, actionable error
--    and the whole migration transaction rolls back (no partial changes).
DO $$
DECLARE
  overlap_count integer;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM appointments a
  JOIN appointments b
    ON a."staffId" = b."staffId"
   AND a.id < b.id
   AND a."startTime" < b."endTime"
   AND b."startTime" < a."endTime"
  WHERE a."staffId" IS NOT NULL
    AND a.status IN ('PENDING','CONFIRMED','IN_PROGRESS')
    AND b.status IN ('PENDING','CONFIRMED','IN_PROGRESS');

  IF overlap_count > 0 THEN
    RAISE EXCEPTION
      'Cannot add appointments_no_overlap_per_staff: % existing overlapping active appointment pair(s) found. Resolve them (cancel/reassign/reschedule) before applying this migration.',
      overlap_count;
  END IF;
END$$;

-- 3) Drop any stale objects from prior attempts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_per_staff') THEN
    ALTER TABLE public.appointments DROP CONSTRAINT appointments_no_overlap_per_staff;
  END IF;
END$$;

-- 4) Time-range column populated via trigger (kept in sync with start/end times)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS time_range tsrange;

-- 5) Trigger to keep time_range updated on insert/update of the time columns
CREATE OR REPLACE FUNCTION update_appointment_time_range()
RETURNS trigger AS $$
BEGIN
  NEW.time_range := tsrange(NEW."startTime"::timestamp, NEW."endTime"::timestamp, '[)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_appointment_time_range ON public.appointments;
CREATE TRIGGER trg_update_appointment_time_range
  BEFORE INSERT OR UPDATE OF "startTime", "endTime"
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_time_range();

-- 6) Backfill existing rows
UPDATE public.appointments
SET time_range = tsrange("startTime"::timestamp, "endTime"::timestamp, '[)')
WHERE time_range IS NULL;

-- 7) Exclusion constraint: no two appointments for the same staff may overlap,
--    but only among ACTIVE statuses (matches ACTIVE_APPOINTMENT_STATUSES in code).
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap_per_staff
  EXCLUDE USING gist (
    "staffId" WITH =,
    time_range WITH &&
  )
  WHERE ("staffId" IS NOT NULL AND status IN ('PENDING','CONFIRMED','IN_PROGRESS'));
