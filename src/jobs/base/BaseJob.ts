/**
 * BaseJob
 * 
 * Abstract base class for all background jobs.
 * Provides common functionality for error handling, metrics, and alerting.
 * 
 * All background jobs should extend this class and implement:
 * - execute(): The actual job logic
 * - getName(): Unique job identifier for logging/metrics
 */

import logger from "../../utils/Logger/logger";

export interface JobMetrics {
    recordSuccess(jobName: string, durationMs: number): void;
    recordFailure(jobName: string, error: unknown): void;
}

export abstract class BaseJob {
    protected consecutiveFailures = 0;
    protected maxConsecutiveFailures = 3;
    protected lastExecutionTime: Date | null = null;
    protected lastExecutionStatus: 'success' | 'failure' | null = null;

    constructor(protected readonly metrics?: JobMetrics) { }

    /**
     * Main execution method - must be implemented by subclasses
     */
    abstract execute(): Promise<void>;

    /**
     * Returns unique job name for logging and metrics
     */
    abstract getName(): string;

    /**
     * Runs the job with error handling, metrics, and alerting
     * This is the method that should be called by the scheduler
     */
    async runWithErrorHandling(): Promise<void> {
        const startTime = Date.now();
        const jobName = this.getName();

        logger.info(`🔄 Starting job: ${jobName}`);

        try {
            await this.execute();

            const durationMs = Date.now() - startTime;
            this.consecutiveFailures = 0;
            this.lastExecutionTime = new Date();
            this.lastExecutionStatus = 'success';

            this.recordSuccess(durationMs);

            logger.info(`✅ Job completed successfully: ${jobName} (${durationMs}ms)`);
        } catch (error) {
            const durationMs = Date.now() - startTime;
            this.consecutiveFailures++;
            this.lastExecutionTime = new Date();
            this.lastExecutionStatus = 'failure';

            this.recordFailure(error);

            logger.error(`❌ Job failed: ${jobName} (${durationMs}ms)`, error);

            // Alert operations if too many consecutive failures
            if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
                await this.alertOps(error);
            }

            // Re-throw to allow scheduler to handle if needed
            throw error;
        }
    }

    /**
     * Record successful job execution
     */
    protected recordSuccess(durationMs: number): void {
        if (this.metrics) {
            this.metrics.recordSuccess(this.getName(), durationMs);
        }
    }

    /**
     * Record failed job execution
     */
    protected recordFailure(error: unknown): void {
        if (this.metrics) {
            this.metrics.recordFailure(this.getName(), error);
        }
    }

    /**
     * Alert operations team about repeated failures
     * Override this method to integrate with your alerting system
     */
    protected async alertOps(error: unknown): Promise<void> {
        logger.error(
            `🚨 CRITICAL: Job "${this.getName()}" has failed ${this.consecutiveFailures} times consecutively`,
            error
        );

        // TODO: Integrate with alerting service (PagerDuty, Slack, email, etc.)
        // Example:
        // await this.notificationService.alertOps({
        //   severity: 'critical',
        //   message: `Job ${this.getName()} failing repeatedly`,
        //   error: error
        // });
    }

    /**
     * Get job status information
     */
    getStatus(): {
        name: string;
        consecutiveFailures: number;
        lastExecutionTime: Date | null;
        lastExecutionStatus: 'success' | 'failure' | null;
    } {
        return {
            name: this.getName(),
            consecutiveFailures: this.consecutiveFailures,
            lastExecutionTime: this.lastExecutionTime,
            lastExecutionStatus: this.lastExecutionStatus,
        };
    }

    /**
     * Reset failure counter (useful for manual interventions)
     */
    resetFailureCounter(): void {
        this.consecutiveFailures = 0;
        logger.info(`🔄 Reset failure counter for job: ${this.getName()}`);
    }
}
