import { PrismaClient } from '@prisma/client';
import {
  RefreshTokenRepository,
  RefreshTokenData
} from '../types/auth';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<RefreshTokenData, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<RefreshTokenData> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: data.userId,
        token: data.token,
        isRevoked: data.isRevoked,
        expiresAt: data.expiresAt,
        deviceId: data.deviceId || null,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        lastUsedAt: new Date(),
      },
    });

    return refreshToken;
  }

  async findByToken(token: string): Promise<RefreshTokenData | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
    });

    if (!refreshToken) {
      return null;
    }

    // Return the token data without the nested user object for consistency
    const { user, ...tokenData } = refreshToken;
    return tokenData;
  }

  async findByTokenWithUser(token: string): Promise<(RefreshTokenData & { user: any }) | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            isActive: true,
            isVerified: true,
          },
        },
      },
    });

    return refreshToken;
  }

  async update(id: string, data: Partial<Pick<RefreshTokenData, 'isRevoked' | 'lastUsedAt'>>): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data,
    });
  }

  async updateLastUsed(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { lastUsedAt: new Date() },
    });
  }

  async revokeByToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async revokeByDevice(userId: string, deviceId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { 
        userId,
        deviceId,
      },
      data: { isRevoked: true },
    });
  }

  async cleanup(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true },
        ],
      },
    });

    return result.count;
  }

  async findUserTokens(userId: string, activeOnly: boolean = true): Promise<RefreshTokenData[]> {
    const where: any = { userId };
    
    if (activeOnly) {
      where.isRevoked = false;
      where.expiresAt = { gt: new Date() };
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return tokens;
  }

  async countUserTokens(userId: string): Promise<number> {
    return await this.prisma.refreshToken.count({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findExpiredTokens(): Promise<RefreshTokenData[]> {
    const expired = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: { lt: new Date() },
        isRevoked: false,
      },
    });

    return expired;
  }

  async getTokensByDeviceId(deviceId: string): Promise<RefreshTokenData[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    return tokens;
  }

  async revokeOldTokens(userId: string, keepLatest: number = 5): Promise<number> {
    // Find tokens to keep (most recent ones)
    const tokensToKeep = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: keepLatest,
      select: { id: true },
    });

    const keepIds = tokensToKeep.map(token => token.id);

    // Revoke all other tokens for this user
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        id: { notIn: keepIds },
      },
      data: { isRevoked: true },
    });

    return result.count;
  }

  async getTokenStats(userId?: string) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const [total, active, revoked, expired] = await Promise.all([
      this.prisma.refreshToken.count({ where }),
      this.prisma.refreshToken.count({ 
        where: { 
          ...where, 
          isRevoked: false, 
          expiresAt: { gt: new Date() } 
        } 
      }),
      this.prisma.refreshToken.count({ 
        where: { ...where, isRevoked: true } 
      }),
      this.prisma.refreshToken.count({ 
        where: { 
          ...where, 
          expiresAt: { lt: new Date() } 
        } 
      }),
    ]);

    return {
      total,
      active,
      revoked,
      expired,
      activeRate: total > 0 ? (active / total * 100).toFixed(2) : '0.00',
    };
  }
}