import { PrismaClient, User } from '@prisma/client';
import {
  UserRepository,
  UserProfile,
  UserSecurity,
  CreateUserData,
  UpdateUserData,
  UserStats
} from '../types/auth';

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByPhoneNumber(phoneNumber: string): Promise<(UserProfile & UserSecurity) | null> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber, isActive: true },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        avatar: true,
        timezone: true,
        language: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    return user;
  }

  async findById(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        avatar: true,
        timezone: true,
        language: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  }

  async create(data: CreateUserData): Promise<UserProfile> {
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        phoneNumber: data.phoneNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        isVerified: false,
        isActive: true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        avatar: true,
        timezone: true,
        language: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  }

  async update(id: string, data: Partial<UpdateUserData>): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id, isActive: true },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        avatar: true,
        timezone: true,
        language: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  }

  async updateSecurity(id: string, data: Partial<UserSecurity>): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePhoneNumber(id: string, phoneNumber: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        phoneNumber,
        updatedAt: new Date(),
      },
    });
  }

  async markAsVerified(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        updatedAt: new Date(),
      },
    });
  }

  async updateLastLogin(id: string, ipAddress?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async incrementFailedAttempts(id: string): Promise<{ attempts: number; shouldLock: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { failedLoginAttempts: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= 5; // Max attempts from config

    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: shouldLock 
          ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes lock
          : undefined,
      },
    });

    return { attempts: newAttempts, shouldLock };
  }

  async unlockUser(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  async getUserStats(): Promise<UserStats> {
    const [totalUsers, activeUsers, verifiedUsers, newUsersToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersToday,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : '0.00',
    };
  }

  async findUsersWithExpiredLocks(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        lockedUntil: {
          not: null,
          lte: new Date(),
        },
      },
      select: { id: true },
    });

    return users.map(user => user.id);
  }

  async countByPhonePattern(pattern: string): Promise<number> {
    return await this.prisma.user.count({
      where: {
        phoneNumber: {
          contains: pattern,
        },
      },
    });
  }
}