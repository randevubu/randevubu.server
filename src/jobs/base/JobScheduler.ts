/**
 * JobScheduler
 * 
 * Centralized scheduler for all background jobs.
 * Manages job registration, scheduling, and lifecycle.
 * 
 * Uses node-cron for scheduling with timezone support.
 */

// @ts-ignore - node-cron is available in Docker container
import * as cron from "node-cron";
import { BaseJob } from "./BaseJob";
import logger from "../../utils/Logger/logger";

export interface JobConfig {
    schedule: string;
    timezone?: string;
    enabled?: boolean;
}

export interface RegisteredJob {
    job: BaseJob;
    config: JobConfig;
    task: cron.ScheduledTask | null;
    isRunning: boolean;
}

export class JobScheduler {
    private jobs: Map<string, RegisteredJob> = new Map();
    private defaultTimezone = "Europe/Istanbul";

    /**
     * Register a job with the scheduler
     */
    register(job: BaseJob, config: JobConfig): void {
        const jobName = job.getName();

        if (this.jobs.has(jobName)) {
            logger.warn(`⚠️  Job "${jobName}" is already registered. Skipping.`);
            return;
        }

        const fullConfig: JobConfig = {
            timezone: this.defaultTimezone,
            enabled: true,
            ...config,
        };

        this.jobs.set(jobName, {
            job,
            config: fullConfig,
            task: null,
            isRunning: false,
        });

        logger.info(
            `📋 Registered job: ${jobName} (schedule: ${fullConfig.schedule}, timezone: ${fullConfig.timezone})`
        );
    }

    /**
     * Start a specific job or all jobs
     */
    start(jobName?: string): void {
        if (jobName) {
            this.startJob(jobName);
        } else {
            this.startAllJobs();
        }
    }

    /**
     * Stop a specific job or all jobs
     */
    stop(jobName?: string): void {
        if (jobName) {
            this.stopJob(jobName);
        } else {
            this.stopAllJobs();
        }
    }

    /**
     * Start a specific job
     */
    private startJob(jobName: string): void {
        const registeredJob = this.jobs.get(jobName);

        if (!registeredJob) {
            logger.error(`❌ Job "${jobName}" not found`);
            return;
        }

        if (registeredJob.isRunning) {
            logger.warn(`⚠️  Job "${jobName}" is already running`);
            return;
        }

        if (registeredJob.config.enabled === false) {
            logger.info(`⏸️  Job "${jobName}" is disabled. Skipping.`);
            return;
        }

        try {
            const task = cron.schedule(
                registeredJob.config.schedule,
                async () => {
                    try {
                        await registeredJob.job.runWithErrorHandling();
                    } catch (error) {
                        // Error already logged in BaseJob.runWithErrorHandling
                        // We catch here to prevent the cron task from stopping
                    }
                },
                {
                    scheduled: false,
                    timezone: registeredJob.config.timezone,
                }
            );

            task.start();
            registeredJob.task = task;
            registeredJob.isRunning = true;

            logger.info(
                `✅ Started job: ${jobName} (${registeredJob.config.schedule})`
            );
        } catch (error) {
            logger.error(`❌ Failed to start job: ${jobName}`, error);
        }
    }

    /**
     * Stop a specific job
     */
    private stopJob(jobName: string): void {
        const registeredJob = this.jobs.get(jobName);

        if (!registeredJob) {
            logger.error(`❌ Job "${jobName}" not found`);
            return;
        }

        if (!registeredJob.isRunning || !registeredJob.task) {
            logger.warn(`⚠️  Job "${jobName}" is not running`);
            return;
        }

        registeredJob.task.stop();
        registeredJob.task = null;
        registeredJob.isRunning = false;

        logger.info(`🛑 Stopped job: ${jobName}`);
    }

    /**
     * Start all registered jobs
     */
    private startAllJobs(): void {
        logger.info(`🚀 Starting all registered jobs...`);

        const jobNames = Array.from(this.jobs.keys());

        for (const jobName of jobNames) {
            this.startJob(jobName);
        }

        const runningCount = Array.from(this.jobs.values()).filter(
            (j) => j.isRunning
        ).length;

        logger.info(
            `✅ Job scheduler started: ${runningCount}/${jobNames.length} jobs running`
        );
    }

    /**
     * Stop all running jobs
     */
    private stopAllJobs(): void {
        logger.info(`🛑 Stopping all jobs...`);

        for (const jobName of this.jobs.keys()) {
            this.stopJob(jobName);
        }

        logger.info(`✅ All jobs stopped`);
    }

    /**
     * Manually trigger a job execution (useful for testing)
     */
    async triggerJob(jobName: string): Promise<void> {
        const registeredJob = this.jobs.get(jobName);

        if (!registeredJob) {
            throw new Error(`Job "${jobName}" not found`);
        }

        logger.info(`🔧 Manually triggering job: ${jobName}`);
        await registeredJob.job.runWithErrorHandling();
    }

    /**
     * Get status of all jobs or a specific job
     */
    getStatus(jobName?: string): any {
        if (jobName) {
            const registeredJob = this.jobs.get(jobName);
            if (!registeredJob) {
                return null;
            }

            return {
                ...registeredJob.job.getStatus(),
                config: registeredJob.config,
                isRunning: registeredJob.isRunning,
            };
        }

        // Return status of all jobs
        const allStatus: Record<string, any> = {};

        for (const [name, registeredJob] of this.jobs.entries()) {
            allStatus[name] = {
                ...registeredJob.job.getStatus(),
                config: registeredJob.config,
                isRunning: registeredJob.isRunning,
            };
        }

        return allStatus;
    }

    /**
     * Get list of all registered job names
     */
    getRegisteredJobs(): string[] {
        return Array.from(this.jobs.keys());
    }

    /**
     * Check if scheduler has any running jobs
     */
    hasRunningJobs(): boolean {
        return Array.from(this.jobs.values()).some((j) => j.isRunning);
    }

    /**
     * Reset failure counter for a specific job
     */
    resetJobFailures(jobName: string): void {
        const registeredJob = this.jobs.get(jobName);

        if (!registeredJob) {
            logger.error(`❌ Job "${jobName}" not found`);
            return;
        }

        registeredJob.job.resetFailureCounter();
    }
}
