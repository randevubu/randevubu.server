import { createLogger, format, transports } from 'winston';
import { PrismaClient } from '@prisma/client';

export interface NotificationMetrics {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  averageProcessingTime: number;
  rateLimitHits: number;
  errorBreakdown: Record<string, number>;
}

export interface PerformanceMetrics {
  processingTimeMs: number;
  recipientCount: number;
  batchSize: number;
  concurrencyLevel: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export class NotificationMonitoringService {
  private logger: any;
  private metrics: Map<string, number> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];

  constructor(private prisma: PrismaClient) {
    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with structured logging
   * Industry Standard: Comprehensive logging setup
   */
  private initializeLogger(): void {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
          });
        })
      ),
      defaultMeta: {
        service: 'notification-service',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        }),
        new transports.File({
          filename: 'logs/notifications-error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new transports.File({
          filename: 'logs/notifications-combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],
      exceptionHandlers: [
        new transports.File({ filename: 'logs/notifications-exceptions.log' })
      ],
      rejectionHandlers: [
        new transports.File({ filename: 'logs/notifications-rejections.log' })
      ]
    });
  }

  /**
   * Track notification sent event
   * Industry Standard: Detailed success tracking
   */
  async trackNotificationSent(
    businessId: string,
    recipientCount: number,
    channel: string,
    processingTimeMs: number,
    metadata: {
      notificationType?: string;
      userId?: string;
      ipAddress?: string;
    } = {}
  ): Promise<void> {
    try {
      // Update metrics
      this.incrementMetric('notifications_sent_total');
      this.incrementMetric(`notifications_sent_${channel}`);
      this.incrementMetric(`notifications_sent_business_${businessId}`);

      // Track performance
      this.recordPerformanceMetrics({
        processingTimeMs,
        recipientCount,
        batchSize: recipientCount,
        concurrencyLevel: 1,
        memoryUsage: process.memoryUsage()
      });

      // Log success
      this.logger.info('Notification sent successfully', {
        businessId,
        recipientCount,
        channel,
        processingTimeMs,
        ...metadata,
        eventType: 'NOTIFICATION_SENT',
        success: true
      });

      // Store in database for analytics
      await this.storeNotificationEvent({
        businessId,
        eventType: 'NOTIFICATION_SENT',
        recipientCount,
        channel,
        processingTimeMs,
        success: true,
        metadata
      });

    } catch (error) {
      this.logger.error('Failed to track notification sent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        businessId,
        recipientCount,
        channel
      });
    }
  }

  /**
   * Track notification failed event
   * Industry Standard: Detailed failure tracking
   */
  async trackNotificationFailed(
    businessId: string,
    error: Error,
    context: {
      recipientCount?: number;
      channel?: string;
      processingTimeMs?: number;
      notificationType?: string;
      userId?: string;
      ipAddress?: string;
    } = {}
  ): Promise<void> {
    try {
      // Update metrics
      this.incrementMetric('notifications_failed_total');
      this.incrementMetric(`notifications_failed_${error.constructor.name}`);
      this.incrementMetric(`notifications_failed_business_${businessId}`);

      // Log error with context
      this.logger.error('Notification failed', {
        businessId,
        error: error.message,
        stack: error.stack,
        ...context,
        eventType: 'NOTIFICATION_FAILED',
        success: false
      });

      // Store in database for analytics
      await this.storeNotificationEvent({
        businessId,
        eventType: 'NOTIFICATION_FAILED',
        recipientCount: context.recipientCount || 0,
        channel: context.channel || 'unknown',
        processingTimeMs: context.processingTimeMs || 0,
        success: false,
        errorMessage: error.message,
        errorCode: error.constructor.name,
        metadata: context
      });

    } catch (trackingError) {
      this.logger.error('Failed to track notification failure', {
        originalError: error.message,
        trackingError: trackingError instanceof Error ? trackingError.message : 'Unknown error',
        businessId
      });
    }
  }

  /**
   * Track rate limit exceeded event
   * Industry Standard: Abuse detection tracking
   */
  async trackRateLimitExceeded(
    businessId: string,
    limitType: string,
    currentUsage: number,
    limit: number,
    metadata: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    try {
      // Update metrics
      this.incrementMetric('rate_limit_exceeded_total');
      this.incrementMetric(`rate_limit_exceeded_${limitType}`);
      this.incrementMetric(`rate_limit_exceeded_business_${businessId}`);

      // Log rate limit event
      this.logger.warn('Rate limit exceeded', {
        businessId,
        limitType,
        currentUsage,
        limit,
        exceededBy: currentUsage - limit,
        ...metadata,
        eventType: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARNING'
      });

      // Store in database for analytics
      await this.storeNotificationEvent({
        businessId,
        eventType: 'RATE_LIMIT_EXCEEDED',
        recipientCount: 0,
        channel: 'system',
        processingTimeMs: 0,
        success: false,
        errorMessage: `Rate limit exceeded: ${currentUsage}/${limit}`,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        metadata: {
          limitType,
          currentUsage,
          limit,
          ...metadata
        }
      });

    } catch (error) {
      this.logger.error('Failed to track rate limit exceeded', {
        error: error instanceof Error ? error.message : 'Unknown error',
        businessId,
        limitType
      });
    }
  }

  /**
   * Track batch processing performance
   * Industry Standard: Performance monitoring
   */
  async trackBatchProcessing(
    businessId: string,
    totalRecipients: number,
    successful: number,
    failed: number,
    processingTimeMs: number,
    batchSize: number,
    metadata: {
      notificationType?: string;
      userId?: string;
      ipAddress?: string;
    } = {}
  ): Promise<void> {
    try {
      // Calculate success rate
      const successRate = totalRecipients > 0 ? (successful / totalRecipients) * 100 : 0;

      // Update metrics
      this.incrementMetric('batch_processing_total');
      this.incrementMetric(`batch_processing_business_${businessId}`);
      this.setMetric('batch_success_rate', successRate);
      this.setMetric('batch_processing_time_avg', processingTimeMs);

      // Track performance
      this.recordPerformanceMetrics({
        processingTimeMs,
        recipientCount: totalRecipients,
        batchSize,
        concurrencyLevel: Math.ceil(totalRecipients / batchSize),
        memoryUsage: process.memoryUsage()
      });

      // Log batch processing
      this.logger.info('Batch processing completed', {
        businessId,
        totalRecipients,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        processingTimeMs,
        batchSize,
        ...metadata,
        eventType: 'BATCH_PROCESSING_COMPLETED'
      });

      // Store in database for analytics
      await this.storeNotificationEvent({
        businessId,
        eventType: 'BATCH_PROCESSING_COMPLETED',
        recipientCount: totalRecipients,
        channel: 'batch',
        processingTimeMs,
        success: failed === 0,
        metadata: {
          successful,
          failed,
          successRate,
          batchSize,
          ...metadata
        }
      });

    } catch (error) {
      this.logger.error('Failed to track batch processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
        businessId,
        totalRecipients
      });
    }
  }

  /**
   * Get notification metrics
   * Industry Standard: Metrics aggregation
   */
  getNotificationMetrics(businessId?: string): NotificationMetrics {
    const totalSent = this.getMetric('notifications_sent_total') || 0;
    const totalFailed = this.getMetric('notifications_failed_total') || 0;
    const total = totalSent + totalFailed;
    const successRate = total > 0 ? (totalSent / total) * 100 : 0;

    return {
      totalSent,
      totalFailed,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: this.getMetric('batch_processing_time_avg') || 0,
      rateLimitHits: this.getMetric('rate_limit_exceeded_total') || 0,
      errorBreakdown: this.getErrorBreakdown()
    };
  }

  /**
   * Get performance metrics
   * Industry Standard: Performance analysis
   */
  getPerformanceMetrics(): {
    averageProcessingTime: number;
    averageRecipientCount: number;
    averageBatchSize: number;
    memoryUsage: NodeJS.MemoryUsage;
    performanceHistory: PerformanceMetrics[];
  } {
    const history = this.performanceHistory;
    const averageProcessingTime = history.length > 0 
      ? history.reduce((sum, h) => sum + h.processingTimeMs, 0) / history.length 
      : 0;
    const averageRecipientCount = history.length > 0 
      ? history.reduce((sum, h) => sum + h.recipientCount, 0) / history.length 
      : 0;
    const averageBatchSize = history.length > 0 
      ? history.reduce((sum, h) => sum + h.batchSize, 0) / history.length 
      : 0;

    return {
      averageProcessingTime: Math.round(averageProcessingTime),
      averageRecipientCount: Math.round(averageRecipientCount),
      averageBatchSize: Math.round(averageBatchSize),
      memoryUsage: process.memoryUsage(),
      performanceHistory: history.slice(-100) // Last 100 entries
    };
  }

  /**
   * Store notification event in database
   * Industry Standard: Persistent event storage
   */
  private async storeNotificationEvent(event: {
    businessId: string;
    eventType: string;
    recipientCount: number;
    channel: string;
    processingTimeMs: number;
    success: boolean;
    errorMessage?: string;
    errorCode?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      // Store in notification_audit table
      await this.prisma.notificationAudit.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          businessId: event.businessId,
          userId: event.metadata?.userId || 'system',
          eventType: event.eventType,
          action: `Notification ${event.success ? 'sent' : 'failed'}`,
          details: {
            recipientCount: event.recipientCount,
            channel: event.channel,
            processingTimeMs: event.processingTimeMs,
            ...event.metadata
          },
          recipientCount: event.recipientCount,
          success: event.success,
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
          ipAddress: event.metadata?.ipAddress,
          userAgent: event.metadata?.userAgent
        }
      });
    } catch (error) {
      this.logger.error('Failed to store notification event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.eventType,
        businessId: event.businessId
      });
    }
  }

  /**
   * Record performance metrics
   * Industry Standard: Performance tracking
   */
  private recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  /**
   * Increment metric counter
   * Industry Standard: Metrics management
   */
  private incrementMetric(key: string, value: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  /**
   * Set metric value
   * Industry Standard: Metrics management
   */
  private setMetric(key: string, value: number): void {
    this.metrics.set(key, value);
  }

  /**
   * Get metric value
   * Industry Standard: Metrics retrieval
   */
  private getMetric(key: string): number | undefined {
    return this.metrics.get(key);
  }

  /**
   * Get error breakdown
   * Industry Standard: Error analysis
   */
  private getErrorBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith('notifications_failed_') && key !== 'notifications_failed_total') {
        const errorType = key.replace('notifications_failed_', '');
        breakdown[errorType] = value;
      }
    }
    
    return breakdown;
  }

  /**
   * Get system health status
   * Industry Standard: Health monitoring
   */
  getSystemHealth(): {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    metrics: NotificationMetrics;
    performance: any;
    issues: string[];
  } {
    const metrics = this.getNotificationMetrics();
    const performance = this.getPerformanceMetrics();
    const issues: string[] = [];

    // Check success rate
    if (metrics.successRate < 90) {
      issues.push(`Low success rate: ${metrics.successRate}%`);
    }

    // Check processing time
    if (performance.averageProcessingTime > 5000) {
      issues.push(`Slow processing time: ${performance.averageProcessingTime}ms`);
    }

    // Check memory usage
    const memoryUsage = performance.memoryUsage;
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      issues.push(`High memory usage: ${Math.round(memoryUsagePercent)}%`);
    }

    // Check rate limit hits
    if (metrics.rateLimitHits > 10) {
      issues.push(`High rate limit hits: ${metrics.rateLimitHits}`);
    }

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('Critical') || issue.includes('High memory')) 
        ? 'CRITICAL' 
        : 'WARNING';
    }

    return {
      status,
      metrics,
      performance,
      issues
    };
  }

  /**
   * Reset metrics (for testing)
   * Industry Standard: Metrics management
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.performanceHistory = [];
  }
}

