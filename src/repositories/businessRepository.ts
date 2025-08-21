import { PrismaClient } from '@prisma/client';
import {
  BusinessData,
  BusinessWithDetails,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessSearchFilters
} from '../types/business';
import { convertBusinessData, convertBusinessDataArray } from '../utils/prismaTypeHelpers';

export class BusinessRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateBusinessRequest & { ownerId: string; slug: string }): Promise<BusinessData> {
    const result = await this.prisma.business.create({
      data: {
        id: `biz_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        ownerId: data.ownerId,
        businessTypeId: data.businessTypeId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        timezone: data.timezone || 'UTC',
        primaryColor: data.primaryColor,
        tags: data.tags || [],
        isActive: true,
        isVerified: false,
        isClosed: false
      }
    });
    return convertBusinessData<BusinessData>(result);
  }

  async findById(id: string): Promise<BusinessData | null> {
    const result = await this.prisma.business.findUnique({
      where: { id }
    });
    return result ? convertBusinessData<BusinessData>(result) : null;
  }

  async findByIdWithDetails(id: string): Promise<BusinessWithDetails | null> {
    const result = await this.prisma.business.findUnique({
      where: { id },
      include: {
        businessType: true,
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
    return result ? convertBusinessData<BusinessWithDetails>(result) : null;
  }

  async findByOwnerId(ownerId: string): Promise<BusinessData[]> {
    const result = await this.prisma.business.findMany({
      where: {
        ownerId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
    return convertBusinessDataArray<BusinessData>(result);
  }

  async findBySlug(slug: string): Promise<BusinessData | null> {
    const result = await this.prisma.business.findUnique({
      where: { slug }
    });
    return result ? convertBusinessData<BusinessData>(result) : null;
  }

  async update(id: string, data: UpdateBusinessRequest): Promise<BusinessData> {
    const result = await this.prisma.business.update({
      where: { id },
      data
    });
    return convertBusinessData<BusinessData>(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  }

  async search(filters: BusinessSearchFilters, page = 1, limit = 20): Promise<{
    businesses: BusinessData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const where: any = {
      isActive: true,
      deletedAt: null
    };

    if (filters.businessTypeId) {
      where.businessTypeId = filters.businessTypeId;
    }

    if (filters.city) {
      where.city = {
        contains: filters.city,
        mode: 'insensitive'
      };
    }

    if (filters.state) {
      where.state = {
        contains: filters.state,
        mode: 'insensitive'
      };
    }

    if (filters.country) {
      where.country = {
        contains: filters.country,
        mode: 'insensitive'
      };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    // Geographic search
    if (filters.latitude && filters.longitude && filters.radius) {
      const radiusInDegrees = filters.radius / 111; // Rough conversion to degrees
      where.latitude = {
        gte: filters.latitude - radiusInDegrees,
        lte: filters.latitude + radiusInDegrees
      };
      where.longitude = {
        gte: filters.longitude - radiusInDegrees,
        lte: filters.longitude + radiusInDegrees
      };
    }

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      this.prisma.business.count({ where })
    ]);

    return {
      businesses: convertBusinessDataArray<BusinessData>(businesses),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateVerificationStatus(id: string, isVerified: boolean): Promise<BusinessData> {
    const result = await this.prisma.business.update({
      where: { id },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null
      }
    });
    return convertBusinessData<BusinessData>(result);
  }

  async updateClosureStatus(
    id: string, 
    isClosed: boolean, 
    closedUntil?: Date, 
    closureReason?: string
  ): Promise<BusinessData> {
    const result = await this.prisma.business.update({
      where: { id },
      data: {
        isClosed,
        closedUntil,
        closureReason
      }
    });
    return convertBusinessData<BusinessData>(result);
  }

  async findByBusinessTypeId(businessTypeId: string): Promise<BusinessData[]> {
    const result = await this.prisma.business.findMany({
      where: {
        businessTypeId,
        isActive: true,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
    return convertBusinessDataArray<BusinessData>(result);
  }

  async getBusinessStats(businessId: string): Promise<{
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  }> {
    const [appointments, services, staff, subscription] = await Promise.all([
      this.prisma.appointment.count({
        where: { businessId }
      }),
      this.prisma.service.count({
        where: { businessId, isActive: true }
      }),
      this.prisma.businessStaff.count({
        where: { businessId, isActive: true }
      }),
      this.prisma.businessSubscription.findFirst({
        where: {
          businessId,
          status: { in: ['ACTIVE', 'TRIAL'] }
        }
      })
    ]);

    return {
      totalAppointments: appointments,
      activeServices: services,
      totalStaff: staff,
      isSubscribed: !!subscription
    };
  }

  async findNearby(
    latitude: number, 
    longitude: number, 
    radiusKm: number, 
    limit = 10
  ): Promise<BusinessData[]> {
    const radiusInDegrees = radiusKm / 111;
    
    const result = await this.prisma.business.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        latitude: {
          gte: latitude - radiusInDegrees,
          lte: latitude + radiusInDegrees
        },
        longitude: {
          gte: longitude - radiusInDegrees,
          lte: longitude + radiusInDegrees
        }
      },
      take: limit,
      orderBy: [
        { isVerified: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return convertBusinessDataArray<BusinessData>(result);
  }

  async bulkUpdateBusinessHours(businessId: string, businessHours: any): Promise<BusinessData> {
    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: { businessHours }
    });
    return convertBusinessData<BusinessData>(result);
  }

  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    const where: any = { slug };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.prisma.business.findFirst({ where });
    return !existing;
  }

  async findActiveBusinessesByOwner(ownerId: string): Promise<BusinessData[]> {
    const result = await this.prisma.business.findMany({
      where: {
        ownerId,
        isActive: true,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
    return convertBusinessDataArray<BusinessData>(result);
  }
}