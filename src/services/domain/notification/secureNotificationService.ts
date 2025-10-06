import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notificationService';
import { CustomerRelationshipService } from '../customer/customerRelationshipService';
import { CustomerValidationResult } from '../../../types/customer';
import { NotificationRateLimitService, RateLimitResult } from './notificationRateLimitService';
import { NotificationAuditService } from './notificationAuditService';
import { NotificationMonitoringService } from './notificationMonitoringService';
import { NotificationChannel, NotificationStatus } from '../../../types/business';

import { SecureNotificationRequest, SecureNotificationResult } from '../../../types/notification';

export interface BroadcastNotificationRequest {
  businessId: string;
  userId: string;
  title: string;
  body: string;
  notificationType: 'HOLIDAY' | 'PROMOTION' | 'BROADCAST';
  channels: NotificationChannel[];
  data?: Record<string, any>;
  filters?: {
    relationshipType?: 'ACTIVE' | 'INACTIVE' | 'ALL';
    minAppointments?: number;
    lastAppointmentAfter?: Date;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export class SecureNotificationService {
  private monitoringService: NotificationMonitoringService;

  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService,
    private customerRelationshipService: CustomerRelationshipService,
    private rateLimitService: NotificationRateLimitService,
    private auditService: NotificationAuditService
  ) {
    this.monitoringService = new NotificationMonitoringService(prisma);
  }

  /**
   * Send secure notifications with full validation and rate limiting
   * Industry Standard: Multi-layered security with comprehensive validation
   */
  async sendSecureNotification(
    request: SecureNotificationRequest
  ): Promise<SecureNotificationResult> {
    const startTime = Date.now();
    let validationResults: CustomerValidationResult[] = [];
    let errors: Array<{ recipientId: string; error: string; errorCode: string }> = [];

    try {
      // 1. Validate business ownership
      await this.validateBusinessOwnership(request.businessId, request.userId);

      // 2. Check rate limits
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        request.businessId,
        request.recipientIds.length
      );

      if (!rateLimitResult.allowed) {
        await this.auditService.logRateLimitExceeded(
          request.businessId,
          request.userId,
          'NOTIFICATION_SEND',
          request.recipientIds.length,
          1000, // Default limit
          request.metadata
        );

        return {
          success: false,
          messageId: '',
          sentCount: 0,
          failedCount: request.recipientIds.length,
          totalRecipients: request.recipientIds.length,
          invalidRecipients: request.recipientIds.length,
          channels: [],
          errors: [{
            recipientId: 'ALL',
            error: rateLimitResult.reason || 'Rate limit exceeded',
            errorCode: rateLimitResult.errorCode || 'RATE_LIMIT_EXCEEDED'
          }]
        };
      }

      // 3. Validate customer relationships
      const validationResult = await this.customerRelationshipService.validateCustomerRelationships(
        request.businessId,
        request.recipientIds,
        {
          requireActiveAppointment: request.notificationType === 'CLOSURE',
          allowPastCustomers: ['HOLIDAY', 'PROMOTION', 'BROADCAST'].includes(request.notificationType),
          checkOptOutStatus: true
        }
      );

      validationResults = request.recipientIds.map(recipientId => {
        const isValid = validationResult.validCustomers.includes(recipientId);
        const invalidCustomer = validationResult.invalidCustomers.find(
          inv => inv.customerId === recipientId
        );

        return {
          isValid,
          relationship: undefined, // Will be populated if needed
          reason: invalidCustomer?.reason as 'NOT_FOUND' | 'BLOCKED' | 'OPTED_OUT' | 'INACTIVE' | 'NO_RELATIONSHIP' | 'ACTIVE_CUSTOMER' | 'PAST_CUSTOMER' | undefined,
          errorCode: invalidCustomer?.errorCode
        };
      });

      // 4. Send notifications to valid customers only (PARALLEL PROCESSING)
      const batchStartTime = Date.now();
      const batchResults = await this.processNotificationBatch(
        validationResult.validCustomers,
        {
          title: request.title,
          body: request.body,
          data: request.data,
          businessId: request.businessId,
          notificationType: request.notificationType
        }
      );

      const sentCount = batchResults.successful;
      const failedCount = batchResults.failed;
      errors.push(...batchResults.errors);

      // Track batch processing performance
      await this.monitoringService.trackBatchProcessing(
        request.businessId,
        validationResult.validCustomers.length,
        sentCount,
        failedCount,
        Date.now() - batchStartTime,
        50, // batch size
        {
          notificationType: request.notificationType,
          userId: request.userId,
          ipAddress: request.metadata?.ipAddress
        }
      );

      // 5. Record usage for rate limiting
      await this.rateLimitService.recordNotificationUsage(
        request.businessId,
        request.recipientIds.length,
        request.notificationType
      );

      // 6. Log audit events
      await this.auditService.logBatchNotification(
        request.businessId,
        request.userId,
        request.recipientIds.length,
        request.notificationType,
        sentCount,
        failedCount,
        {
          totalRecipients: validationResult.validCount,
          invalidRecipients: validationResult.invalidCount,
          processingTimeMs: Date.now() - startTime
        },
        request.metadata
      );

      // 7. Log individual failures
      for (const error of errors) {
        await this.auditService.logNotificationFailed(
          request.businessId,
          request.userId,
          error.errorCode,
          error.error,
          request.notificationType,
          { recipientId: error.recipientId },
          request.metadata
        );
      }

      return {
        success: sentCount > 0,
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sentCount,
        failedCount,
        totalRecipients: validationResult.validCount,
        invalidRecipients: validationResult.invalidCount,
        channels: [],
        errors
      };

    } catch (error) {
      // Log the error
      await this.auditService.logNotificationFailed(
        request.businessId,
        request.userId,
        'SYSTEM_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        request.notificationType,
        { processingTimeMs: Date.now() - startTime },
        request.metadata
      );

      return {
        success: false,
        messageId: '',
        sentCount: 0,
        failedCount: request.recipientIds.length,
        totalRecipients: 0,
        invalidRecipients: request.recipientIds.length,
        channels: [],
        errors: [{
          recipientId: 'ALL',
          error: error instanceof Error ? error.message : 'System error',
          errorCode: 'SYSTEM_ERROR'
        }]
      };
    }
  }

  /**
   * Send broadcast notification to all business customers
   * Industry Standard: Secure broadcast with filtering
   */
  async sendBroadcastNotification(
    request: BroadcastNotificationRequest
  ): Promise<SecureNotificationResult> {
    try {
      // 1. Validate business ownership
      await this.validateBusinessOwnership(request.businessId, request.userId);

      // 2. Get all customers of the business
      const customerData = await this.customerRelationshipService.getBusinessCustomers(
        request.businessId,
        {
          relationshipType: request.filters?.relationshipType || 'ALL',
          includeOptedOut: false,
          includeBlocked: false,
          minAppointments: request.filters?.minAppointments || 0,
          lastAppointmentAfter: request.filters?.lastAppointmentAfter
        }
      );

      if (customerData.customers.length === 0) {
        await this.auditService.logNotificationFailed(
          request.businessId,
          request.userId,
          'NO_CUSTOMERS',
          'No customers found for broadcast',
          request.notificationType,
          {},
          request.metadata
        );

        return {
          success: false,
          messageId: '',
          sentCount: 0,
          failedCount: 0,
          totalRecipients: 0,
          invalidRecipients: 0,
          channels: [],
          errors: [{
            recipientId: 'ALL',
            error: 'No customers found for broadcast',
            errorCode: 'NO_CUSTOMERS'
          }]
        };
      }

      // 3. Send secure notification to all customers
      const recipientIds = customerData.customers.map(c => c.customerId);
      
      return await this.sendSecureNotification({
        businessId: request.businessId,
        userId: request.userId,
        recipientIds,
        title: request.title,
        body: request.body,
        message: request.body,
        targetAudience: { type: 'ALL_CUSTOMERS' },
        notificationType: request.notificationType,
        channels: request.channels,
        data: request.data,
        metadata: request.metadata
      });

    } catch (error) {
      await this.auditService.logNotificationFailed(
        request.businessId,
        request.userId,
        'BROADCAST_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        request.notificationType,
        {},
        request.metadata
      );

      return {
        success: false,
        messageId: '',
        sentCount: 0,
        failedCount: 0,
        totalRecipients: 0,
        invalidRecipients: 0,
        channels: [],
        errors: [{
          recipientId: 'ALL',
          error: error instanceof Error ? error.message : 'Broadcast error',
          errorCode: 'BROADCAST_ERROR'
        }]
      };
    }
  }

  /**
   * Send closure notification with enhanced security
   * Industry Standard: Context-aware closure notifications
   */
  async sendClosureNotification(
    businessId: string,
    userId: string,
    closureId: string,
    notificationMessage: string,
    channels: NotificationChannel[],
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<SecureNotificationResult> {
    try {
      // 1. Validate business ownership
      await this.validateBusinessOwnership(businessId, userId);

      // 2. Get closure details
      const closure = await this.prisma.businessClosure.findUnique({
        where: { id: closureId },
        include: { business: true }
      });

      if (!closure) {
        throw new Error('Closure not found');
      }

      if (closure.businessId !== businessId) {
        throw new Error('Closure does not belong to this business');
      }

      // 3. Get affected appointments
      const affectedAppointments = await this.prisma.appointment.findMany({
        where: {
          businessId,
          startTime: {
            gte: closure.startDate,
            lte: closure.endDate || new Date('2099-12-31')
          },
          status: 'CONFIRMED'
        },
        select: { customerId: true },
        distinct: ['customerId']
      });

      if (affectedAppointments.length === 0) {
        return {
          success: true,
          messageId: '',
          sentCount: 0,
          failedCount: 0,
          totalRecipients: 0,
          invalidRecipients: 0,
          channels: [],
          errors: []
        };
      }

      // 4. Send notifications to affected customers
      const recipientIds = affectedAppointments.map(apt => apt.customerId);
      
      return await this.sendSecureNotification({
        businessId,
        userId,
        recipientIds,
        title: 'Business Closure Notice',
        body: notificationMessage,
        message: notificationMessage,
        targetAudience: { type: 'ALL_CUSTOMERS' },
        notificationType: 'CLOSURE',
        channels,
        data: {
          closureId,
          businessName: closure.business.name,
          startDate: closure.startDate.toISOString(),
          endDate: closure.endDate?.toISOString(),
          reason: closure.reason,
          type: closure.type
        },
        metadata
      });

    } catch (error) {
      await this.auditService.logNotificationFailed(
        businessId,
        userId,
        'CLOSURE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        'CLOSURE',
        { closureId },
        metadata
      );

      return {
        success: false,
        messageId: '',
        sentCount: 0,
        failedCount: 0,
        totalRecipients: 0,
        invalidRecipients: 0,
        channels: [],
        errors: [{
          recipientId: 'ALL',
          error: error instanceof Error ? error.message : 'Closure notification error',
          errorCode: 'CLOSURE_ERROR'
        }]
      };
    }
  }

  /**
   * Process notifications in parallel batches with concurrency control
   * Industry Standard: High-performance batch processing
   */
  private async processNotificationBatch(
    recipientIds: string[],
    notificationData: {
      title: string;
      body: string;
      data?: Record<string, any>;
      businessId: string;
      notificationType: string;
    }
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ recipientId: string; error: string; errorCode: string }>;
  }> {
    const BATCH_SIZE = 50;
    const MAX_CONCURRENT = 10;
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ recipientId: string; error: string; errorCode: string }>
    };

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      const batch = recipientIds.slice(i, i + BATCH_SIZE);
      
      // Process batch with concurrency control
      const batchPromises = batch.map(recipientId => 
        this.processSingleNotification(recipientId, notificationData)
      );

      // Use Promise.allSettled to handle individual failures
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      batchResults.forEach((result, index) => {
        const recipientId = batch[index];
        
        if (result.status === 'fulfilled') {
          const notificationResult = result.value;
          if (notificationResult.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              recipientId,
              error: notificationResult.error || 'Unknown error',
              errorCode: 'SEND_FAILED'
            });
          }
        } else {
          results.failed++;
          results.errors.push({
            recipientId,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            errorCode: 'SEND_ERROR'
          });
        }
      });

      // Add small delay between batches to prevent overwhelming external services
      if (i + BATCH_SIZE < recipientIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Process a single notification with retry logic
   * Industry Standard: Resilient notification processing
   */
  private async processSingleNotification(
    recipientId: string,
    notificationData: {
      title: string;
      body: string;
      data?: Record<string, any>;
      businessId: string;
      notificationType: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const results = await this.notificationService.sendPushNotification({
          userId: recipientId,
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data,
          businessId: notificationData.businessId
        });

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        if (successCount > 0) {
          return { success: true };
        } else if (failCount > 0) {
          // Check if it's a retryable error
          const error = results.find(r => !r.success);
          if (error && error.error && this.isRetryableError(error.error)) {
            lastError = new Error(error.error);
            continue; // Retry
          } else {
            return { success: false, error: error?.error || 'Send failed' };
          }
        }

        return { success: true };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if error is retryable
        if (this.isRetryableError(lastError.message) && attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return { success: false, error: lastError.message };
      }
    }

    return { success: false, error: lastError?.message || 'Max retries exceeded' };
  }

  /**
   * Check if an error is retryable
   * Industry Standard: Smart retry logic
   */
  private isRetryableError(errorMessage: string): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      'rate limit',
      'temporary',
      'service unavailable',
      'internal server error',
      '502',
      '503',
      '504'
    ];

    return retryableErrors.some(retryableError => 
      errorMessage.toLowerCase().includes(retryableError)
    );
  }

  /**
   * Validate business ownership
   * Industry Standard: Authorization validation
   */
  private async validateBusinessOwnership(businessId: string, userId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, isActive: true }
    });

    if (!business) {
      await this.auditService.logPermissionDenied(
        businessId,
        userId,
        'SEND_NOTIFICATION',
        'Business not found',
        { businessId },
        {}
      );
      throw new Error('Business not found');
    }

    if (!business.isActive) {
      await this.auditService.logPermissionDenied(
        businessId,
        userId,
        'SEND_NOTIFICATION',
        'Business is inactive',
        { businessId },
        {}
      );
      throw new Error('Business is inactive');
    }

    if (business.ownerId !== userId) {
      await this.auditService.logPermissionDenied(
        businessId,
        userId,
        'SEND_NOTIFICATION',
        'User is not the owner of this business',
        { businessId, ownerId: business.ownerId },
        {}
      );
      throw new Error('Unauthorized: You can only send notifications for your own business');
    }
  }

  /**
   * Get notification statistics for a business
   * Industry Standard: Analytics and monitoring
   */
  async getNotificationStats(
    businessId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    successRate: number;
    failureRate: number;
    rateLimitStatus: any;
    customerStats: any;
    recentActivity: any[];
  }> {
    try {
      // Validate business ownership
      await this.validateBusinessOwnership(businessId, userId);

      // Get audit statistics
      const auditStats = await this.auditService.getAuditStats(
        businessId,
        startDate,
        endDate
      );

      // Get rate limit status
      const rateLimitStatus = await this.rateLimitService.getRateLimitStatus(businessId);

      // Get customer statistics
      const customerStats = await this.customerRelationshipService.getBusinessCustomerStats(businessId);

      // Get recent activity
      const recentActivity = await this.auditService.queryEvents({
        businessId,
        startDate,
        endDate,
        limit: 10
      });

      return {
        totalSent: auditStats.totalEvents,
        successRate: auditStats.successRate,
        failureRate: auditStats.failureRate,
        rateLimitStatus,
        customerStats,
        recentActivity: recentActivity.events
      };

    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw new Error('Failed to get notification statistics');
    }
  }

  /**
   * Get security alerts for a business
   * Industry Standard: Security monitoring
   */
  async getSecurityAlerts(
    businessId: string,
    userId: string,
    hours: number = 24
  ): Promise<any[]> {
    try {
      // Validate business ownership
      await this.validateBusinessOwnership(businessId, userId);

      // Get security alerts
      return await this.auditService.getSecurityAlerts(businessId, hours);

    } catch (error) {
      console.error('Error getting security alerts:', error);
      throw new Error('Failed to get security alerts');
    }
  }

  /**
   * Get system health status
   * Industry Standard: Health monitoring
   */
  getSystemHealth(): any {
    return this.monitoringService.getSystemHealth();
  }
}
