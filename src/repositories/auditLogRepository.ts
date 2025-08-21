import { PrismaClient, AuditAction } from '@prisma/client';
import { 
  AuditLogRepository,
  CreateAuditLogData 
} from '../types/auth';

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateAuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: data.userId || null,
        action: data.action,
        entity: data.entity || null,
        entityId: data.entityId || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs;
  }

  async findByAction(
    action: AuditAction,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs;
  }

  async findByEntity(
    entity: string,
    entityId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const where: any = { entity };
    if (entityId) {
      where.entityId = entityId;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs;
  }

  async findByTimeRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs;
  }

  async findSecurityEvents(
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const securityActions = [
      'USER_LOGIN',
      'USER_LOGOUT', 
      'USER_LOCK',
      'USER_UNLOCK',
      'PHONE_VERIFY',
      'TOKEN_REFRESH',
      'PASSWORD_RESET'
    ] as AuditAction[];

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: securityActions },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs;
  }

  async countByAction(action: AuditAction, timeRange?: { start: Date; end: Date }): Promise<number> {
    const where: any = { action };
    
    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    return await this.prisma.auditLog.count({ where });
  }

  async countByUser(userId: string, timeRange?: { start: Date; end: Date }): Promise<number> {
    const where: any = { userId };
    
    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    return await this.prisma.auditLog.count({ where });
  }

  async getActionStats(timeRange?: { start: Date; end: Date }) {
    const where: any = {};
    
    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    const stats = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    return stats.map(stat => ({
      action: stat.action,
      count: stat._count.action,
    }));
  }

  async getTopUsers(
    limit: number = 10,
    timeRange?: { start: Date; end: Date }
  ): Promise<any[]> {
    const where: any = {};
    
    if (timeRange) {
      where.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    const stats = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        ...where,
        userId: { not: null },
      },
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    // Get user details for the top users
    const userIds = stats.map(stat => stat.userId).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
      },
    });

    return stats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        userId: stat.userId,
        count: stat._count.userId,
        user: user ? {
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
      };
    });
  }

  async findSuspiciousActivity(
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    // Find patterns that might indicate suspicious activity
    const suspiciousActions = ['USER_LOCK', 'USER_UNLOCK'];
    
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { in: suspiciousActions as AuditAction[] } },
          // Multiple failed attempts from same IP
          {
            action: 'PHONE_VERIFY',
            details: { path: ['success'], equals: false },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs;
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        // Keep security-related logs longer
        action: {
          notIn: [
            'USER_LOCK',
            'USER_UNLOCK', 
            'PASSWORD_RESET'
          ] as AuditAction[],
        },
      },
    });

    return result.count;
  }

  async findFailedLogins(
    timeRange: { start: Date; end: Date },
    ipAddress?: string
  ): Promise<any[]> {
    const where: any = {
      action: 'USER_LOGIN',
      createdAt: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
      details: { path: ['success'], equals: false },
    };

    if (ipAddress) {
      where.ipAddress = ipAddress;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  async getDailyStats(days: number = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        action: true,
        createdAt: true,
      },
    });

    // Group by day and action
    const dailyStats: { [date: string]: { [action: string]: number } } = {};

    logs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {};
      }
      if (!dailyStats[date][log.action]) {
        dailyStats[date][log.action] = 0;
      }
      dailyStats[date][log.action]++;
    });

    return dailyStats;
  }
}