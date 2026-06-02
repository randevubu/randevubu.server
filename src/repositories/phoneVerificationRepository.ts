import { PrismaClient, VerificationPurpose } from '@prisma/client';
import { cacheManager } from '../services/redis-client';
import {
  PhoneVerificationRepository,
  PhoneVerificationData,
  VerificationStats
} from '../types/auth';

export class PrismaPhoneVerificationRepository implements PhoneVerificationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<PhoneVerificationData, 'id' | 'createdAt'>): Promise<PhoneVerificationData> {
    const verification = await this.prisma.phoneVerification.create({
      data: {
        id: crypto.randomUUID(),
        userId: data.userId || null,
        phoneNumber: data.phoneNumber,
        code: data.code,
        purpose: data.purpose,
        isUsed: data.isUsed,
        attempts: data.attempts,
        maxAttempts: data.maxAttempts,
        expiresAt: data.expiresAt,
      },
    });

    return verification;
  }

  async findLatest(phoneNumber: string, purpose: VerificationPurpose): Promise<PhoneVerificationData | null> {
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phoneNumber,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return verification;
  }

  async findMostRecent(phoneNumber: string, purpose: VerificationPurpose): Promise<PhoneVerificationData | null> {
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phoneNumber,
        purpose,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return verification;
  }

  async findById(id: string): Promise<PhoneVerificationData | null> {
    const verification = await this.prisma.phoneVerification.findUnique({
      where: { id },
    });

    return verification;
  }

  async update(id: string, data: Partial<Pick<PhoneVerificationData, 'attempts' | 'isUsed'>>): Promise<void> {
    await this.prisma.phoneVerification.update({
      where: { id },
      data,
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.phoneVerification.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  async incrementAttempts(id: string): Promise<number> {
    const verification = await this.prisma.phoneVerification.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
      select: { attempts: true },
    });

    return verification.attempts;
  }

  async invalidateExisting(phoneNumber: string, purpose: VerificationPurpose): Promise<void> {
    await this.prisma.phoneVerification.updateMany({
      where: {
        phoneNumber,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });
  }

  async cleanup(): Promise<number> {
    const result = await this.prisma.phoneVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { 
            isUsed: true, 
            createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
          },
        ],
      },
    });

    return result.count;
  }

  async getStats(phoneNumber?: string, purpose?: VerificationPurpose): Promise<VerificationStats> {
    const where: any = {};
    
    if (phoneNumber) {
      where.phoneNumber = phoneNumber;
    }
    
    if (purpose) {
      where.purpose = purpose;
    }

    const [total, successful, expired] = await Promise.all([
      this.prisma.phoneVerification.count({ where }),
      this.prisma.phoneVerification.count({ 
        where: { ...where, isUsed: true } 
      }),
      this.prisma.phoneVerification.count({ 
        where: { ...where, expiresAt: { lt: new Date() } } 
      }),
    ]);

    // Calculate failed as those that exceeded max attempts
    const failed = await this.prisma.phoneVerification.count({
      where: {
        ...where,
        attempts: { gte: 3 }, // Assuming max attempts is 3
        isUsed: false,
      },
    });

    return {
      total,
      successful,
      expired,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : '0.00',
    };
  }

  async countDailyRequests(phoneNumber: string, ipAddress?: string): Promise<{ phoneCount: number; ipCount: number }> {
    const dayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const phoneCount = await this.prisma.phoneVerification.count({
      where: {
        phoneNumber,
        createdAt: { gte: dayStart },
      },
    });

    // Track IP-based counts in Redis with a 24-hour TTL so we don't need a schema migration
    let ipCount = 0;
    if (ipAddress) {
      try {
        const redis = cacheManager.getRedis();
        const key = `otp_ip_daily:${ipAddress}:${dayStart.toISOString().slice(0, 10)}`;
        const raw = await redis.incr(key);
        // Set TTL only on first increment
        if (raw === 1) await redis.expire(key, 86400);
        // Decrement by 1 because incr already counted the *current* request;
        // we want the count *before* this request to decide whether to block.
        ipCount = Math.max(0, raw - 1);
      } catch {
        // Redis unavailable — fail open (don't block legitimate users)
        ipCount = 0;
      }
    }

    return { phoneCount, ipCount };
  }

  async countRecentByPhone(phoneNumber: string, minutes: number): Promise<number> {
    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);

    return await this.prisma.phoneVerification.count({
      where: {
        phoneNumber,
        createdAt: { gte: timeThreshold },
      },
    });
  }

  async findExpiredCodes(): Promise<PhoneVerificationData[]> {
    const expired = await this.prisma.phoneVerification.findMany({
      where: {
        expiresAt: { lt: new Date() },
        isUsed: false,
      },
    });

    return expired;
  }

  async invalidateUserVerifications(userId: string): Promise<void> {
    await this.prisma.phoneVerification.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: { isUsed: true },
    });
  }

  async getVerificationHistory(
    phoneNumber: string,
    limit: number = 10
  ): Promise<PhoneVerificationData[]> {
    const history = await this.prisma.phoneVerification.findMany({
      where: { phoneNumber },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history;
  }
}