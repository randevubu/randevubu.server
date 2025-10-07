import { PrismaClient } from '@prisma/client';
import {
  BusinessClosureData,
  CreateBusinessClosureRequest,
  UpdateBusinessClosureRequest,
  ClosureType
} from '../types/business';

export interface BusinessClosureStats {
  totalClosures: number;
  totalDaysClosed: number;
  closuresByType: Record<ClosureType, number>;
  averageClosureDuration: number;
}

export interface ClosureConflictCheck {
  hasConflicts: boolean;
  conflictingClosures: BusinessClosureData[];
}

export interface BusinessClosureQueryOptions {
  includeInactive?: boolean;
  startDate?: Date;
  endDate?: Date;
  type?: ClosureType;
  limit?: number;
  offset?: number;
}

export class BusinessClosureRepository {
  constructor(private prisma: PrismaClient) {}

  async create(businessId: string, createdBy: string, data: CreateBusinessClosureRequest): Promise<BusinessClosureData> {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true }
    });

    if (!business) {
      throw new Error(`Business with ID ${businessId} not found`);
    }

    // Check for conflicting closures
    const conflicts = await this.findConflictingClosures(
      businessId,
      new Date(data.startDate),
      data.endDate ? new Date(data.endDate) : undefined
    );

    if (conflicts.length > 0) {
      throw new Error(`Closure conflicts with existing closures: ${conflicts.map(c => c.id).join(', ')}`);
    }

    const result = await this.prisma.businessClosure.create({
      data: {
        id: `bcl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId,
        createdBy,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reason: data.reason,
        type: data.type,
        isActive: true,
        notifyCustomers: data.notifyCustomers ?? false,
        notificationMessage: data.notificationMessage,
        notificationChannels: data.notificationChannels,
        affectedServices: data.affectedServices,
        isRecurring: data.isRecurring ?? false,
        recurringPattern: data.recurringPattern,
        createdAppointmentsCount: 0,
        notifiedCustomersCount: 0
      }
    });

    return this.mapPrismaResultToBusinessClosureData(result);
  }

  async findById(id: string): Promise<BusinessClosureData | null> {
    const result = await this.prisma.businessClosure.findUnique({
      where: { id }
    });

    return result ? this.mapPrismaResultToBusinessClosureData(result) : null;
  }

  async findByBusinessId(businessId: string, options?: BusinessClosureQueryOptions): Promise<BusinessClosureData[]> {
    const where: Record<string, unknown> = { businessId };
    
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    if (options?.startDate) {
      where.startDate = { gte: options.startDate };
    }

    if (options?.endDate) {
      where.endDate = { lte: options.endDate };
    }

    if (options?.type) {
      where.type = options.type;
    }

    const result = await this.prisma.businessClosure.findMany({
      where,
      orderBy: { startDate: 'desc' },
      take: options?.limit,
      skip: options?.offset
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async findActiveByBusinessId(businessId: string): Promise<BusinessClosureData[]> {
    const now = new Date();
    
    const result = await this.prisma.businessClosure.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          // Currently active (happening now)
          {
            startDate: { lte: now },
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          },
          // Upcoming (future closures)
          {
            startDate: { gt: now }
          }
        ]
      },
      orderBy: { startDate: 'asc' }
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async findUpcomingByBusinessId(businessId: string): Promise<BusinessClosureData[]> {
    const now = new Date();
    
    const result = await this.prisma.businessClosure.findMany({
      where: {
        businessId,
        isActive: true,
        startDate: { gt: now }
      },
      orderBy: { startDate: 'asc' }
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async update(id: string, data: UpdateBusinessClosureRequest): Promise<BusinessClosureData> {
    // Check if closure exists
    const existingClosure = await this.prisma.businessClosure.findUnique({
      where: { id },
      select: { id: true, businessId: true }
    });

    if (!existingClosure) {
      throw new Error(`Business closure with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = { ...data };
    
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    // Check for conflicts if dates are being updated
    if (data.startDate || data.endDate) {
      const conflicts = await this.findConflictingClosures(
        existingClosure.businessId,
        data.startDate ? new Date(data.startDate) : new Date(),
        data.endDate ? new Date(data.endDate) : undefined,
        id
      );

      if (conflicts.length > 0) {
        throw new Error(`Updated closure conflicts with existing closures: ${conflicts.map(c => c.id).join(', ')}`);
      }
    }

    const result = await this.prisma.businessClosure.update({
      where: { id },
      data: updateData
    });

    return this.mapPrismaResultToBusinessClosureData(result);
  }

  async delete(id: string): Promise<void> {
    const existingClosure = await this.prisma.businessClosure.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingClosure) {
      throw new Error(`Business closure with ID ${id} not found`);
    }

    await this.prisma.businessClosure.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async isBusinessClosed(businessId: string, checkDate: Date = new Date()): Promise<{
    isClosed: boolean;
    closure?: BusinessClosureData;
  }> {
    const activeClosure = await this.prisma.businessClosure.findFirst({
      where: {
        businessId,
        isActive: true,
        startDate: { lte: checkDate },
        OR: [
          { endDate: null },
          { endDate: { gte: checkDate } }
        ]
      }
    });

    return {
      isClosed: !!activeClosure,
      closure: activeClosure ? this.mapPrismaResultToBusinessClosureData(activeClosure) : undefined
    };
  }

  async findConflictingClosures(
    businessId: string,
    startDate: Date,
    endDate?: Date,
    excludeClosureId?: string
  ): Promise<BusinessClosureData[]> {
    const where: Record<string, unknown> = {
      businessId,
      isActive: true
    };

    if (excludeClosureId) {
      where.id = { not: excludeClosureId };
    }

    // Check for overlapping periods
    if (endDate) {
      where.OR = [
        {
          AND: [
            { startDate: { lte: startDate } },
            { OR: [
              { endDate: null },
              { endDate: { gte: startDate } }
            ]}
          ]
        },
        {
          AND: [
            { startDate: { lte: endDate } },
            { OR: [
              { endDate: null },
              { endDate: { gte: endDate } }
            ]}
          ]
        },
        {
          AND: [
            { startDate: { gte: startDate } },
            { startDate: { lte: endDate } }
          ]
        }
      ];
    } else {
      // For indefinite closure, check if there are any future closures
      where.startDate = { gte: startDate };
    }

    const result = await this.prisma.businessClosure.findMany({ where });
    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async checkClosureConflicts(
    businessId: string,
    startDate: Date,
    endDate?: Date,
    excludeClosureId?: string
  ): Promise<ClosureConflictCheck> {
    const conflictingClosures = await this.findConflictingClosures(
      businessId,
      startDate,
      endDate,
      excludeClosureId
    );

    return {
      hasConflicts: conflictingClosures.length > 0,
      conflictingClosures
    };
  }

  async extendClosure(id: string, newEndDate: Date): Promise<BusinessClosureData> {
    const existingClosure = await this.prisma.businessClosure.findUnique({
      where: { id },
      select: { id: true, businessId: true, startDate: true }
    });

    if (!existingClosure) {
      throw new Error(`Business closure with ID ${id} not found`);
    }

    if (newEndDate <= existingClosure.startDate) {
      throw new Error('End date must be after start date');
    }

    const result = await this.prisma.businessClosure.update({
      where: { id },
      data: { endDate: newEndDate }
    });

    return this.mapPrismaResultToBusinessClosureData(result);
  }

  async endClosureEarly(id: string, endDate: Date = new Date()): Promise<BusinessClosureData> {
    const existingClosure = await this.prisma.businessClosure.findUnique({
      where: { id },
      select: { id: true, startDate: true }
    });

    if (!existingClosure) {
      throw new Error(`Business closure with ID ${id} not found`);
    }

    if (endDate < existingClosure.startDate) {
      throw new Error('End date cannot be before start date');
    }

    const result = await this.prisma.businessClosure.update({
      where: { id },
      data: { 
        endDate,
        isActive: false
      }
    });

    return this.mapPrismaResultToBusinessClosureData(result);
  }

  async findByDateRange(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusinessClosureData[]> {
    const result = await this.prisma.businessClosure.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { OR: [
                { endDate: null },
                { endDate: { gte: startDate } }
              ]}
            ]
          }
        ]
      },
      orderBy: { startDate: 'asc' }
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async findByType(businessId: string, type: ClosureType): Promise<BusinessClosureData[]> {
    const result = await this.prisma.businessClosure.findMany({
      where: {
        businessId,
        type,
        isActive: true
      },
      orderBy: { startDate: 'desc' }
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async getClosureStats(businessId: string, year?: number): Promise<BusinessClosureStats> {
    const where: Record<string, unknown> = { businessId };
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);
      
      where.startDate = {
        gte: startOfYear,
        lt: endOfYear
      };
    }

    const closures = await this.prisma.businessClosure.findMany({
      where,
      select: {
        type: true,
        startDate: true,
        endDate: true
      }
    });

    const totalClosures = closures.length;
    let totalDaysClosed = 0;
    const closuresByType: Record<ClosureType, number> = {
      [ClosureType.VACATION]: 0,
      [ClosureType.MAINTENANCE]: 0,
      [ClosureType.EMERGENCY]: 0,
      [ClosureType.HOLIDAY]: 0,
      [ClosureType.STAFF_SHORTAGE]: 0,
      [ClosureType.OTHER]: 0
    };

    closures.forEach(closure => {
      closuresByType[closure.type]++;
      
      if (closure.endDate) {
        const days = Math.ceil(
          (closure.endDate.getTime() - closure.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDaysClosed += days;
      } else {
        // For ongoing closures, calculate days from start to now
        const days = Math.ceil(
          (new Date().getTime() - closure.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDaysClosed += days;
      }
    });

    const averageClosureDuration = totalClosures > 0 ? totalDaysClosed / totalClosures : 0;

    return {
      totalClosures,
      totalDaysClosed,
      closuresByType,
      averageClosureDuration
    };
  }

  async findRecurringHolidays(businessId: string): Promise<BusinessClosureData[]> {
    const result = await this.prisma.businessClosure.findMany({
      where: {
        businessId,
        type: ClosureType.HOLIDAY,
        isActive: true,
        isRecurring: true
      },
      orderBy: { startDate: 'asc' }
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async autoExpireClosures(): Promise<number> {
    const now = new Date();
    
    const result = await this.prisma.businessClosure.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now }
      },
      data: { isActive: false }
    });

    return result.count;
  }

  async getUpcomingClosuresForNotification(daysAhead: number = 7): Promise<BusinessClosureData[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

    const result = await this.prisma.businessClosure.findMany({
      where: {
        isActive: true,
        startDate: {
          gte: now,
          lte: futureDate
        },
        notifyCustomers: true
      },
      orderBy: { startDate: 'asc' }
    });

    return result.map(closure => this.mapPrismaResultToBusinessClosureData(closure));
  }

  async markCustomersNotified(closureId: string, count: number): Promise<void> {
    await this.prisma.businessClosure.update({
      where: { id: closureId },
      data: {
        notifiedCustomersCount: count
      }
    });
  }

  async incrementCreatedAppointmentsCount(closureId: string): Promise<void> {
    await this.prisma.businessClosure.update({
      where: { id: closureId },
      data: {
        createdAppointmentsCount: {
          increment: 1
        }
      }
    });
  }

  // Helper method to safely map Prisma results to BusinessClosureData
  private mapPrismaResultToBusinessClosureData(prismaResult: any): BusinessClosureData {
    return {
      id: prismaResult.id,
      businessId: prismaResult.businessId,
      startDate: prismaResult.startDate,
      endDate: prismaResult.endDate,
      reason: prismaResult.reason,
      type: prismaResult.type,
      isActive: prismaResult.isActive,
      createdBy: prismaResult.createdBy,
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt,
      notifyCustomers: prismaResult.notifyCustomers ?? false,
      notificationMessage: prismaResult.notificationMessage,
      notificationChannels: prismaResult.notificationChannels,
      affectedServices: prismaResult.affectedServices,
      isRecurring: prismaResult.isRecurring ?? false,
      recurringPattern: prismaResult.recurringPattern,
      createdAppointmentsCount: prismaResult.createdAppointmentsCount ?? 0,
      notifiedCustomersCount: prismaResult.notifiedCustomersCount ?? 0
    };
  }
}