/**
 * JobMetrics
 * 
 * Prometheus metrics implementation for background jobs.
 * Tracks success/failure counts and execution duration.
 */

import { Counter, Histogram } from "prom-client";
import logger from "../../utils/Logger/logger";
import { JobMetrics as IJobMetrics } from "./BaseJob";

// Prometheus metrics
const jobSuccessCounter = new Counter({
    name: "background_job_success_total",
    help: "Total number of successful background job executions",
    labelNames: ["job_name"],
});

const jobFailureCounter = new Counter({
    name: "background_job_failure_total",
    help: "Total number of failed background job executions",
    labelNames: ["job_name"],
});

const jobDurationHistogram = new Histogram({
    name: "background_job_duration_seconds",
    help: "Duration of background job executions in seconds",
    labelNames: ["job_name"],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300], // Up to 5 minutes
});

/**
 * Implementation of JobMetrics using Prometheus
 */
export class PrometheusJobMetrics implements IJobMetrics {
    recordSuccess(jobName: string, durationMs: number): void {
        try {
            jobSuccessCounter.labels(jobName).inc();
            jobDurationHistogram.labels(jobName).observe(durationMs / 1000);
        } catch (error) {
            logger.error(`Failed to record success metrics for job ${jobName}:`, error);
        }
    }

    recordFailure(jobName: string, error: unknown): void {
        try {
            jobFailureCounter.labels(jobName).inc();
        } catch (metricsError) {
            logger.error(`Failed to record failure metrics for job ${jobName}:`, metricsError);
        }
    }
}

/**
 * Singleton instance for use across the application
 */
export const jobMetrics = new PrometheusJobMetrics();
