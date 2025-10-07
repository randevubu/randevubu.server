import { PrismaClient } from '@prisma/client';
import { UserBehaviorData, UserBehaviorSummary } from '../types/business';
import { ReliabilityScoreCalculator } from '../services/domain/userBehavior/reliabilityScoreCalculator';

export class UserBehaviorRepository {
  constructor(private prisma: PrismaClient) {}

  private mapToUserBehaviorData(record: any): UserBehaviorData {
    return {
      id: record.id,
      userId: record.userId,
      totalAppointments: record.totalAppointments,
      canceledAppointments: record.canceledAppointments,
      noShowAppointments: record.noShowAppointments,
      completedAppointments: record.completedAppointments,
      lastCancelDate: record.lastCancelDate ?? null,
      cancelationsThisMonth: record.cancelationsThisMonth,
      cancelationsThisWeek: record.cancelationsThisWeek,
      lastNoShowDate: record.lastNoShowDate ?? null,
      noShowsThisMonth: record.noShowsThisMonth,
      noShowsThisWeek: record.noShowsThisWeek,
      currentStrikes: record.currentStrikes,
      lastStrikeDate: record.lastStrikeDate ?? null,
      strikeResetDate: record.strikeResetDate ?? null,
      isBanned: record.isBanned,
      bannedUntil: record.bannedUntil ?? null,
      banReason: record.banReason ?? null,
      banCount: record.banCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  async findByUserId(userId: string): Promise<UserBehaviorData | null> {
    const result = await this.prisma.userBehavior.findUnique({
      where: { userId }
    });
    return result ? this.mapToUserBehaviorData(result) : null;
  }

  async createOrUpdate(userId: string): Promise<UserBehaviorData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // Get appointment statistics
    const [total, canceled, noShow, completed] = await Promise.all([
      this.prisma.appointment.count({
        where: { customerId: userId }
      }),
      this.prisma.appointment.count({
        where: { customerId: userId, status: 'CANCELED' }
      }),
      this.prisma.appointment.count({
        where: { customerId: userId, status: 'NO_SHOW' }
      }),
      this.prisma.appointment.count({
        where: { customerId: userId, status: 'COMPLETED' }
      })
    ]);

    // Get recent cancellations and no-shows
    const [monthlyCancel, weeklyCancel, monthlyNoShow, weeklyNoShow] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          customerId: userId,
          status: 'CANCELED',
          canceledAt: { gte: startOfMonth }
        }
      }),
      this.prisma.appointment.count({
        where: {
          customerId: userId,
          status: 'CANCELED',
          canceledAt: { gte: startOfWeek }
        }
      }),
      this.prisma.appointment.count({
        where: {
          customerId: userId,
          status: 'NO_SHOW',
          canceledAt: { gte: startOfMonth }
        }
      }),
      this.prisma.appointment.count({
        where: {
          customerId: userId,
          status: 'NO_SHOW',
          canceledAt: { gte: startOfWeek }
        }
      })
    ]);

    // Get last cancellation and no-show dates
    const [lastCancel, lastNoShow] = await Promise.all([
      this.prisma.appointment.findFirst({
        where: { customerId: userId, status: 'CANCELED' },
        orderBy: { canceledAt: 'desc' },
        select: { canceledAt: true }
      }),
      this.prisma.appointment.findFirst({
        where: { customerId: userId, status: 'NO_SHOW' },
        orderBy: { canceledAt: 'desc' },
        select: { canceledAt: true }
      })
    ]);

    // Calculate current strikes
    const recentProblematicBehavior = monthlyCancel + monthlyNoShow;
    let currentStrikes = 0;
    
    if (recentProblematicBehavior >= 5) currentStrikes = 3;
    else if (recentProblematicBehavior >= 3) currentStrikes = 2;
    else if (recentProblematicBehavior >= 2) currentStrikes = 1;

    const existing = await this.findByUserId(userId);
    
    const data = {
      totalAppointments: total,
      canceledAppointments: canceled,
      noShowAppointments: noShow,
      completedAppointments: completed,
      lastCancelDate: lastCancel?.canceledAt,
      cancelationsThisMonth: monthlyCancel,
      cancelationsThisWeek: weeklyCancel,
      lastNoShowDate: lastNoShow?.canceledAt,
      noShowsThisMonth: monthlyNoShow,
      noShowsThisWeek: weeklyNoShow,
      currentStrikes,
      lastStrikeDate: currentStrikes > 0 ? new Date() : existing?.lastStrikeDate,
      strikeResetDate: this.calculateStrikeResetDate(currentStrikes)
    };

    if (existing) {
      const updated = await this.prisma.userBehavior.update({
        where: { userId },
        data
      });
      return this.mapToUserBehaviorData(updated);
    } else {
      const created = await this.prisma.userBehavior.create({
        data: {
          id: `ub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          userId,
          ...data,
          isBanned: false,
          banCount: 0
        }
      });
      return this.mapToUserBehaviorData(created);
    }
  }

  async addStrike(userId: string, reason: string): Promise<UserBehaviorData> {
    const behavior = await this.findByUserId(userId) || 
      await this.createOrUpdate(userId);

    const newStrikes = behavior.currentStrikes + 1;
    let isBanned = false;
    let bannedUntil: Date | undefined;
    let banCount = behavior.banCount;

    // Ban logic: 3 strikes = ban
    if (newStrikes >= 3) {
      isBanned = true;
      banCount += 1;
      
      // Progressive ban duration
      if (banCount === 1) {
        bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week
      } else if (banCount === 2) {
        bannedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month
      } else {
        bannedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
      }
    }

    const result = await this.prisma.userBehavior.update({
      where: { userId },
      data: {
        currentStrikes: newStrikes,
        lastStrikeDate: new Date(),
        strikeResetDate: this.calculateStrikeResetDate(newStrikes),
        isBanned,
        bannedUntil,
        banReason: isBanned ? reason : behavior.banReason,
        banCount
      }
    });
    return this.mapToUserBehaviorData(result);
  }

  async removeStrike(userId: string): Promise<UserBehaviorData> {
    const behavior = await this.findByUserId(userId);
    if (!behavior) {
      throw new Error('User behavior record not found');
    }

    const newStrikes = Math.max(0, behavior.currentStrikes - 1);

    const result = await this.prisma.userBehavior.update({
      where: { userId },
      data: {
        currentStrikes: newStrikes,
        strikeResetDate: this.calculateStrikeResetDate(newStrikes),
        isBanned: false,
        bannedUntil: null,
        banReason: null
      }
    });
    return this.mapToUserBehaviorData(result);
  }

  async banUser(userId: string, reason: string, durationDays?: number): Promise<UserBehaviorData> {
    // For permanent bans, don't set bannedUntil (null means permanent)
    const bannedUntil = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;
    
    const behavior = await this.findByUserId(userId) || 
      await this.createOrUpdate(userId);

    const result = await this.prisma.userBehavior.update({
      where: { userId },
      data: {
        isBanned: true,
        bannedUntil,
        banReason: reason,
        banCount: behavior.banCount + 1,
        currentStrikes: 3
      }
    });
    return this.mapToUserBehaviorData(result);
  }

  async unbanUser(userId: string): Promise<UserBehaviorData> {
    const behavior = await this.findByUserId(userId);
    if (!behavior) {
      throw new Error('User behavior record not found');
    }

    const result = await this.prisma.userBehavior.update({
      where: { userId },
      data: {
        isBanned: false,
        bannedUntil: null,
        banReason: null,
        currentStrikes: 0,
        strikeResetDate: null
      }
    });
    return this.mapToUserBehaviorData(result);
  }

  async getUserSummary(userId: string): Promise<UserBehaviorSummary> {
    const behavior = await this.findByUserId(userId) || 
      await this.createOrUpdate(userId);

    const completionRate = behavior.totalAppointments > 0 
      ? (behavior.completedAppointments / behavior.totalAppointments) * 100 
      : 100;

    const cancellationRate = behavior.totalAppointments > 0 
      ? (behavior.canceledAppointments / behavior.totalAppointments) * 100 
      : 0;

    const noShowRate = behavior.totalAppointments > 0 
      ? (behavior.noShowAppointments / behavior.totalAppointments) * 100 
      : 0;

    // Calculate reliability score using centralized calculator
    const reliabilityResult = ReliabilityScoreCalculator.calculate({
      totalAppointments: behavior.totalAppointments,
      completedAppointments: behavior.completedAppointments,
      cancelledAppointments: behavior.canceledAppointments,
      noShowAppointments: behavior.noShowAppointments,
      currentStrikes: behavior.currentStrikes,
      isBanned: behavior.isBanned,
      bannedUntil: behavior.bannedUntil
    });

    const reliabilityScore = reliabilityResult.score;
    const riskLevel = reliabilityResult.riskLevel;

    return {
      userId,
      completionRate,
      cancellationRate,
      noShowRate,
      reliabilityScore,
      riskLevel,
      strikes: behavior.currentStrikes,
      isBanned: behavior.isBanned,
      lastActivity: behavior.updatedAt
    };
  }

  async resetExpiredStrikes(): Promise<number> {
    const now = new Date();
    
    const result = await this.prisma.userBehavior.updateMany({
      where: {
        strikeResetDate: { lte: now },
        currentStrikes: { gt: 0 }
      },
      data: {
        currentStrikes: 0,
        strikeResetDate: null,
        lastStrikeDate: null
      }
    });

    return result.count;
  }

  async unbanExpiredBans(): Promise<number> {
    const now = new Date();
    
    const result = await this.prisma.userBehavior.updateMany({
      where: {
        isBanned: true,
        bannedUntil: { lte: now }
      },
      data: {
        isBanned: false,
        bannedUntil: null,
        banReason: null
      }
    });

    return result.count;
  }

  async findProblematicUsers(limit = 50): Promise<UserBehaviorSummary[]> {
    const behaviors = await this.prisma.userBehavior.findMany({
      where: {
        OR: [
          { currentStrikes: { gte: 2 } },
          { cancelationsThisMonth: { gte: 5 } },
          { noShowsThisMonth: { gte: 3 } }
        ]
      },
      take: limit,
      orderBy: [
        { currentStrikes: 'desc' },
        { cancelationsThisMonth: 'desc' },
        { noShowsThisMonth: 'desc' }
      ]
    });

    return Promise.all(
      behaviors.map(behavior => this.getUserSummary(behavior.userId))
    );
  }

  private calculateStrikeResetDate(strikes: number): Date | null {
    if (strikes === 0) return null;
    
    // Strikes reset after 30 days
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
}