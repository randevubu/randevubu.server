// Subscription Domain Types
export interface SchedulerConfig {
  renewalCheckSchedule?: string; // Cron expression, default: daily at 2 AM
  reminderSchedule?: string; // Cron expression, default: daily at 9 AM
  cleanupSchedule?: string; // Cron expression, default: weekly on Sunday 3 AM
  timezone?: string; // Default: 'Europe/Istanbul'
  developmentMode?: boolean; // Enable for testing with accelerated schedules
  batchSize?: number; // Number of subscriptions to process at once
  maxRetries?: number; // Maximum retry attempts for failed operations
  retryDelay?: number; // Delay between retries in milliseconds
}


