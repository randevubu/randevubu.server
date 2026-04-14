/**
 * AutoCompleteAppointmentsJob
 * 
 * Background job that automatically marks CONFIRMED appointments as COMPLETED
 * when their service time has ended.
 * 
 * This job:
 * - Runs on a schedule (every 1 minute in dev, every 5 minutes in prod)
 * - Finds appointments with status CONFIRMED or IN_PROGRESS and endTime < now
 * - Updates them to status=COMPLETED
 * - Does not change CANCELED or NO_SHOW (gelmedi); those stay as manually set
 * - Is idempotent (safe to run multiple times)
 * - Uses repository pattern (no direct Prisma access)
 * - Emits Prometheus metrics
 */

import { BaseJob } from "../base/BaseJob";
import { AppointmentRepository } from "../../repositories/appointmentRepository";
import logger from "../../utils/Logger/logger";

export class AutoCompleteAppointmentsJob extends BaseJob {
    constructor(
        private readonly appointmentRepository: AppointmentRepository
    ) {
        super();
    }

    getName(): string {
        return "appointment_auto_complete";
    }

    async execute(): Promise<void> {
        // Real UTC instant — matches PostgreSQL timestamptz / Prisma DateTime comparisons
        const now = new Date();

        // Find appointments that need to be auto-completed
        const appointments = await this.appointmentRepository
            .findAppointmentsEligibleForAutoComplete(now);

        if (appointments.length === 0) {
            logger.debug("📋 No appointments to auto-complete");
            return;
        }

        logger.info(`🔄 Auto-completing ${appointments.length} appointments`);

        // Extract appointment IDs
        const appointmentIds = appointments.map((apt) => apt.id);

        // Mark them as completed
        const result = await this.appointmentRepository
            .markAppointmentsAsCompleted(appointmentIds, now);

        logger.info(`✅ Auto-completed ${result.count} appointments`);

        // Log details in development mode
        if (process.env.NODE_ENV === "development") {
            appointments.forEach((appointment) => {
                logger.debug(
                    `  📝 ${appointment.id}: ${appointment.customer?.firstName} ${appointment.customer?.lastName} - ${appointment.service?.name} at ${appointment.business?.name}`
                );
            });
        }
    }
}
