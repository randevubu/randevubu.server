import { AppointmentStatus } from '../types/business';

/**
 * Appointment statuses that occupy a time slot.
 *
 * This is the single source of truth for "is this slot taken?" logic. Every
 * overlap / availability check (booking, reschedule, public slot generation)
 * MUST use this set so the application layer and the database exclusion
 * constraint agree. CANCELED, NO_SHOW and COMPLETED do NOT block a slot.
 */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.PENDING_APPROVAL,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
];

/** Postgres-literal form of {@link ACTIVE_APPOINTMENT_STATUSES} for raw SQL / migrations. */
export const ACTIVE_APPOINTMENT_STATUSES_SQL = `'PENDING','PENDING_APPROVAL','CONFIRMED','IN_PROGRESS'`;
