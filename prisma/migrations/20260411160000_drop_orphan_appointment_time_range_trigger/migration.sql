-- DB was left with update_appointment_time_range() trigger but without time_range column
-- (e.g. partial revert / manual DDL). Inserts then fail inside the trigger.
DROP TRIGGER IF EXISTS trg_update_appointment_time_range ON public.appointments;
DROP FUNCTION IF EXISTS update_appointment_time_range();
