import { PrismaClient } from '@prisma/client';

export interface AuditEvent {
  id: string;
  businessId: string;
  userId: string;
  eventType: 'NOTIFICATION_SENT' | 'NOTIFICATION_FAILED' | 'RATE_LIMIT_EXCEEDED' | 'PERMISSION_DENIED' | 'CUSTOMER_OPTED_OUT' | 'BATCH_NOTIFICATION_SENT' | 'BROADCAST_SENT';
  action: string;
  details: Record<string, any>;
  recipientCount?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditQuery {
  businessId?: string;
  userId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  successRate: number;
  failureRate: number;
  eventsByType: Record<string, number>;
  eventsByBusiness: Record<string, number>;
  eventsByUser: Record<string, number>;
  dailyBreakdown: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
}

export class NotificationAuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log notification audit event
   * Industry Standard: Comprehensive audit trail
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...event
      };

      // Store in database
      await this.prisma.notificationAudit.create({
        data: {
          id: auditEvent.id,
          businessId: auditEvent.businessId,
          userId: auditEvent.userId,
          eventType: auditEvent.eventType,
          action: auditEvent.action,
          details: auditEvent.details,
          recipientCount: auditEvent.recipientCount,
          success: auditEvent.success,
          errorCode: auditEvent.errorCode,
          errorMessage: auditEvent.errorMessage,
          ipAddress: auditEvent.ipAddress,
          userAgent: auditEvent.userAgent,
          createdAt: auditEvent.timestamp
        }
      });

      // Log to console for development
      console.log(`[AUDIT] ${auditEvent.eventType}: ${auditEvent.action}`, {
        businessId: auditEvent.businessId,
        userId: auditEvent.userId,
        success: auditEvent.success,
        recipientCount: auditEvent.recipientCount
      });

    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error as audit logging shouldn't block operations
    }
  }

  /**
   * Log notification sent event
   * Industry Standard: Detailed success logging
   */
  async logNotificationSent(
    businessId: string,
    userId: string,
    recipientCount: number,
    notificationType: string,
    details: Record<string, any> = {},
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent({
      businessId,
      userId,
      eventType: 'NOTIFICATION_SENT',
      action: `Sent ${notificationType} notification`,
      details: {
        notificationType,
        ...details
      },
      recipientCount,
      success: true,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  /**
   * Log notification failed event
   * Industry Standard: Detailed failure logging
   */
  async logNotificationFailed(
    businessId: string,
    userId: string,
    errorCode: string,
    errorMessage: string,
    notificationType: string,
    details: Record<string, any> = {},
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent({
      businessId,
      userId,
      eventType: 'NOTIFICATION_FAILED',
      action: `Failed to send ${notificationType} notification`,
      details: {
        notificationType,
        ...details
      },
      success: false,
      errorCode,
      errorMessage,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  /**
   * Log rate limit exceeded event
   * Industry Standard: Abuse detection logging
   */
  async logRateLimitExceeded(
    businessId: string,
    userId: string,
    limitType: string,
    currentUsage: number,
    limit: number,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent({
      businessId,
      userId,
      eventType: 'RATE_LIMIT_EXCEEDED',
      action: `Rate limit exceeded: ${limitType}`,
      details: {
        limitType,
        currentUsage,
        limit,
        exceededBy: currentUsage - limit
      },
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      errorMessage: `${limitType} limit exceeded: ${currentUsage}/${limit}`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  /**
   * Log permission denied event
   * Industry Standard: Security violation logging
   */
  async logPermissionDenied(
    businessId: string,
    userId: string,
    action: string,
    reason: string,
    details: Record<string, any> = {},
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent({
      businessId,
      userId,
      eventType: 'PERMISSION_DENIED',
      action: `Permission denied: ${action}`,
      details: {
        reason,
        ...details
      },
      success: false,
      errorCode: 'PERMISSION_DENIED',
      errorMessage: reason,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  /**
   * Log customer opted out event
   * Industry Standard: Privacy compliance logging
   */
  async logCustomerOptedOut(
    businessId: string,
    userId: string,
    customerId: string,
    notificationType: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent({
      businessId,
      userId,
      eventType: 'CUSTOMER_OPTED_OUT',
      action: `Customer opted out: ${notificationType}`,
      details: {
        customerId,
        notificationType
      },
      success: false,
      errorCode: 'CUSTOMER_OPTED_OUT',
      errorMessage: 'Customer has opted out of notifications',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  /**
   * Log batch notification event
   * Industry Standard: Bulk operation logging
   */
  async logBatchNotification(
    businessId: string,
    userId: string,
    recipientCount: number,
    notificationType: string,
    successCount: number,
    failureCount: number,
    details: Record<string, any> = {},
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    await this.logEvent({
      businessId,
      userId,
      eventType: 'BATCH_NOTIFICATION_SENT',
      action: `Sent batch ${notificationType} notification`,
      details: {
        notificationType,
        successCount,
        failureCount,
        ...details
      },
      recipientCount,
      success: failureCount === 0,
      errorCode: failureCount > 0 ? 'PARTIAL_FAILURE' : undefined,
      errorMessage: failureCount > 0 ? `${failureCount} notifications failed` : undefined,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  /**
   * Query audit events
   * Industry Standard: Flexible audit querying
   */
  async queryEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        businessId,
        userId,
        eventType,
        startDate,
        endDate,
        success,
        limit = 100,
        offset = 0
      } = query;

      // Build where clause
      const whereClause: any = {};
      
      if (businessId) whereClause.businessId = businessId;
      if (userId) whereClause.userId = userId;
      if (eventType) whereClause.eventType = eventType;
      if (success !== undefined) whereClause.success = success;
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      // Get total count
      const total = await this.prisma.notificationAudit.count({
        where: whereClause
      });

      // Get events
      const events = await this.prisma.notificationAudit.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Convert to AuditEvent format
      const auditEvents: AuditEvent[] = events.map(event => ({
        id: event.id,
        businessId: event.businessId,
        userId: event.userId,
        eventType: event.eventType as any,
        action: event.action,
        details: event.details as Record<string, any>,
        recipientCount: event.recipientCount,
        success: event.success,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.createdAt
      }));

      return {
        events: auditEvents,
        total,
        hasMore: offset + limit < total
      };

    } catch (error) {
      console.error('Error querying audit events:', error);
      throw new Error('Failed to query audit events');
    }
  }

  /**
   * Get audit statistics
   * Industry Standard: Analytics and reporting
   */
  async getAuditStats(
    businessId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditStats> {
    try {
      const whereClause: any = {};
      if (businessId) whereClause.businessId = businessId;
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      // Get all events
      const events = await this.prisma.notificationAudit.findMany({
        where: whereClause,
        select: {
          eventType: true,
          businessId: true,
          userId: true,
          success: true,
          createdAt: true
        }
      });

      // Calculate statistics
      const totalEvents = events.length;
      const successCount = events.filter(e => e.success).length;
      const failureCount = totalEvents - successCount;
      const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0;
      const failureRate = 100 - successRate;

      // Events by type
      const eventsByType: Record<string, number> = {};
      events.forEach(event => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      });

      // Events by business
      const eventsByBusiness: Record<string, number> = {};
      events.forEach(event => {
        eventsByBusiness[event.businessId] = (eventsByBusiness[event.businessId] || 0) + 1;
      });

      // Events by user
      const eventsByUser: Record<string, number> = {};
      events.forEach(event => {
        eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
      });

      // Daily breakdown
      const dailyBreakdown: Array<{
        date: string;
        count: number;
        successCount: number;
        failureCount: number;
      }> = [];

      const dailyMap = new Map<string, { count: number; successCount: number; failureCount: number }>();
      
      events.forEach(event => {
        const date = event.createdAt.toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { count: 0, successCount: 0, failureCount: 0 });
        }
        const dayData = dailyMap.get(date)!;
        dayData.count++;
        if (event.success) {
          dayData.successCount++;
        } else {
          dayData.failureCount++;
        }
      });

      dailyMap.forEach((data, date) => {
        dailyBreakdown.push({
          date,
          count: data.count,
          successCount: data.successCount,
          failureCount: data.failureCount
        });
      });

      // Sort by date
      dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalEvents,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        eventsByType,
        eventsByBusiness,
        eventsByUser,
        dailyBreakdown
      };

    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Get security alerts
   * Industry Standard: Security monitoring
   */
  async getSecurityAlerts(
    businessId?: string,
    hours: number = 24
  ): Promise<Array<{
    type: 'RATE_LIMIT_ABUSE' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    count: number;
    description: string;
    firstOccurrence: Date;
    lastOccurrence: Date;
  }>> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const whereClause: any = { createdAt: { gte: since } };
      if (businessId) whereClause.businessId = businessId;

      const alerts: Array<{
        type: 'RATE_LIMIT_ABUSE' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY';
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        count: number;
        description: string;
        firstOccurrence: Date;
        lastOccurrence: Date;
      }> = [];

      // Check for rate limit abuse
      const rateLimitEvents = await this.prisma.notificationAudit.count({
        where: {
          ...whereClause,
          eventType: 'RATE_LIMIT_EXCEEDED'
        }
      });

      if (rateLimitEvents > 0) {
        const firstEvent = await this.prisma.notificationAudit.findFirst({
          where: {
            ...whereClause,
            eventType: 'RATE_LIMIT_EXCEEDED'
          },
          orderBy: { createdAt: 'asc' }
        });

        const lastEvent = await this.prisma.notificationAudit.findFirst({
          where: {
            ...whereClause,
            eventType: 'RATE_LIMIT_EXCEEDED'
          },
          orderBy: { createdAt: 'desc' }
        });

        alerts.push({
          type: 'RATE_LIMIT_ABUSE',
          severity: rateLimitEvents > 10 ? 'HIGH' : rateLimitEvents > 5 ? 'MEDIUM' : 'LOW',
          count: rateLimitEvents,
          description: `${rateLimitEvents} rate limit violations in the last ${hours} hours`,
          firstOccurrence: firstEvent?.createdAt || since,
          lastOccurrence: lastEvent?.createdAt || since
        });
      }

      // Check for permission violations
      const permissionEvents = await this.prisma.notificationAudit.count({
        where: {
          ...whereClause,
          eventType: 'PERMISSION_DENIED'
        }
      });

      if (permissionEvents > 0) {
        const firstEvent = await this.prisma.notificationAudit.findFirst({
          where: {
            ...whereClause,
            eventType: 'PERMISSION_DENIED'
          },
          orderBy: { createdAt: 'asc' }
        });

        const lastEvent = await this.prisma.notificationAudit.findFirst({
          where: {
            ...whereClause,
            eventType: 'PERMISSION_DENIED'
          },
          orderBy: { createdAt: 'desc' }
        });

        alerts.push({
          type: 'PERMISSION_VIOLATION',
          severity: permissionEvents > 5 ? 'HIGH' : 'MEDIUM',
          count: permissionEvents,
          description: `${permissionEvents} permission violations in the last ${hours} hours`,
          firstOccurrence: firstEvent?.createdAt || since,
          lastOccurrence: lastEvent?.createdAt || since
        });
      }

      return alerts;

    } catch (error) {
      console.error('Error getting security alerts:', error);
      throw new Error('Failed to get security alerts');
    }
  }
}

