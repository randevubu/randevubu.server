import { PrismaClient } from '@prisma/client';
import {
  BusinessClosureData,
  CreateBusinessClosureRequest,
  UpdateBusinessClosureRequest,
  ClosureType
} from '../types/business';
import { convertBusinessData, convertBusinessDataArray } from '../utils/prismaTypeHelpers';

export class BusinessClosureRepository {
  constructor(private prisma: PrismaClient) {}

  async create(businessId: string, createdBy: string, data: CreateBusinessClosureRequest): Promise<BusinessClosureData> {
    const result = await this.prisma.businessClosure.create({
      data: {
        id: `bcl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId,
        createdBy,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reason: data.reason,
        type: data.type,
        isActive: true
      }
    });
    return convertBusinessData<BusinessClosureData>(result as any);
  }

  async findById(id: string): Promise<BusinessClosureData | null> {
    const result = await this.prisma.businessClosure.findUnique({
      where: { id }
    });
    return result ? convertBusinessData<BusinessClosureData>(result as any) : null;
  }

  async findByBusinessId(businessId: string): Promise<BusinessClosureData[]> {
    const result = await this.prisma.businessClosure.findMany({
      where: { businessId },
      orderBy: { startDate: 'desc' }
    });
    return convertBusinessDataArray<BusinessClosureData>(result as any);
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
    return convertBusinessDataArray<BusinessClosureData>(result as any);
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
    return convertBusinessDataArray<BusinessClosureData>(result as any);
  }

  async update(id: string, data: UpdateBusinessClosureRequest): Promise<BusinessClosureData> {
    const updateData: any = { ...data };
    
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    const result = await this.prisma.businessClosure.update({
      where: { id },
      data: updateData
    });
    return convertBusinessData<BusinessClosureData>(result as any);
  }

  async delete(id: string): Promise<void> {
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
      closure: activeClosure ? convertBusinessData<BusinessClosureData>(activeClosure as any) : undefined
    };
  }

  async findConflictingClosures(
    businessId: string,
    startDate: Date,
    endDate?: Date,
    excludeClosureId?: string
  ): Promise<BusinessClosureData[]> {
    const where: any = {
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
    return convertBusinessDataArray<BusinessClosureData>(result as any);
  }

  async extendClosure(id: string, newEndDate: Date): Promise<BusinessClosureData> {
    const result = await this.prisma.businessClosure.update({
      where: { id },
      data: { endDate: newEndDate }
    });
    return convertBusinessData<BusinessClosureData>(result as any);
  }

  async endClosureEarly(id: string, endDate: Date = new Date()): Promise<BusinessClosureData> {
    const result = await this.prisma.businessClosure.update({
      where: { id },
      data: { 
        endDate,
        isActive: false
      }
    });
    return convertBusinessData<BusinessClosureData>(result as any);
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
    return convertBusinessDataArray<BusinessClosureData>(result as any);
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
    return convertBusinessDataArray<BusinessClosureData>(result as any);
  }

  async getClosureStats(businessId: string, year?: number): Promise<{
    totalClosures: number;
    totalDaysClosed: number;
    closuresByType: Record<ClosureType, number>;
    averageClosureDuration: number;
  }> {
    const where: any = { businessId };
    
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
        isActive: true
      },
      orderBy: { startDate: 'asc' }
    });
    return convertBusinessDataArray<BusinessClosureData>(result as any);
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
}