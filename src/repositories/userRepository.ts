import { PrismaClient, User, Prisma } from '@prisma/client';
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

  async findByIdWithSecurity(id: string): Promise<(UserProfile & UserSecurity) | null> {
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
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    return user;
  }

  async create(data: CreateUserData): Promise<UserProfile> {
    if (!data.phoneNumber || !data.phoneNumber.trim()) {
      throw new Error('phoneNumber is required');
    }
    // firstName and lastName are optional during registration (phone-only registration)
    // They can be updated later in the user profile
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        phoneNumber: data.phoneNumber,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        timezone: data.timezone || 'Europe/Istanbul',
        language: data.language || 'tr',
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
    if (data.firstName !== undefined && !data.firstName.trim()) {
      throw new Error('firstName cannot be empty');
    }
    if (data.lastName !== undefined && !data.lastName.trim()) {
      throw new Error('lastName cannot be empty');
    }
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

  async findCustomersByUserBusinesses(userId: string, filters?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: 'all' | 'banned' | 'flagged' | 'active';
    sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'lastLoginAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    customers: UserProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    
    // Build sort order
    const sortBy = filters?.sortBy ?? 'createdAt';
    const sortOrder: 'asc' | 'desc' = filters?.sortOrder ?? 'desc';
    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortBy]: sortOrder };

    // Build where clause for customers with appointments at user's businesses
    const whereClause: Prisma.UserWhereInput = {
      appointments: {
        some: {
          business: {
            OR: [
              // Businesses owned by user
              { ownerId: userId },
              // Businesses where user is active staff
              {
                staff: {
                  some: {
                    userId,
                    isActive: true,
                    leftAt: null
                  }
                }
              }
            ]
          }
        }
      },
      isActive: true
    };

    // Build additional filters array
    const additionalFilters: Prisma.UserWhereInput[] = [];

    // Apply search filter
    if (filters?.search) {
      additionalFilters.push({
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { phoneNumber: { contains: filters.search } }
        ]
      });
    }

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      const now = new Date();
      switch (filters.status) {
        case 'banned':
          additionalFilters.push({
            behavior: {
              isBanned: true,
              OR: [
                { bannedUntil: null }, // Permanent ban
                { bannedUntil: { gt: now } } // Temporary ban still active
              ]
            }
          });
          break;
        case 'flagged':
          // Add flagged logic if you have a flag system
          break;
        case 'active':
          additionalFilters.push({
            OR: [
              { behavior: null }, // No behavior record
              { behavior: { isBanned: false } }, // Not banned
              { behavior: { isBanned: true, bannedUntil: { lte: now } } } // Ban expired
            ]
          });
          break;
      }
    }

    // Combine all filters with AND
    if (additionalFilters.length > 0) {
      whereClause.AND = [
        ...(Array.isArray(whereClause.AND) ? whereClause.AND : whereClause.AND ? [whereClause.AND] : []),
        ...additionalFilters
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
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
          behavior: {
            select: {
              isBanned: true,
              bannedUntil: true,
              banReason: true,
              currentStrikes: true
            }
          }
        },
        orderBy,
        skip,
        take: limit,
        distinct: ['id'] // Remove duplicates if customer has multiple appointments
      }),
      this.prisma.user.count({ where: whereClause })
    ]);

    return {
      customers: customers.map(customer => ({
        ...customer,
        isBanned: customer.behavior?.isBanned ?? false,
        bannedUntil: customer.behavior?.bannedUntil ?? null,
        banReason: customer.behavior?.banReason ?? null,
        currentStrikes: customer.behavior?.currentStrikes ?? 0
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
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
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : '0.00',
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