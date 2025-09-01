import { PrismaClient } from '@prisma/client';
import {
  BusinessData,
  BusinessWithDetails,
  BusinessWithServices,
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
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        businessHours: true,
        timezone: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        theme: true,
        settings: true,
        isActive: true,
        isVerified: true,
        verifiedAt: true,
        isClosed: true,
        closedUntil: true,
        closureReason: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return result as BusinessData[];
  }

  async findByStaffUserId(userId: string): Promise<BusinessData[]> {
    const result = await this.prisma.business.findMany({
      where: {
        staff: {
          some: {
            userId,
            isActive: true,
            leftAt: null
          }
        },
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        businessHours: true,
        timezone: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        theme: true,
        settings: true,
        isActive: true,
        isVerified: true,
        verifiedAt: true,
        isClosed: true,
        closedUntil: true,
        closureReason: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return result as BusinessData[];
  }

  async findBySlug(slug: string): Promise<BusinessData | null> {
    const result = await this.prisma.business.findUnique({
      where: { slug }
    });
    return result ? convertBusinessData<BusinessData>(result) : null;
  }

  async findBySlugWithServices(slug: string): Promise<BusinessWithServices | null> {
    const result = await this.prisma.business.findUnique({
      where: { 
        slug,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        businessHours: true,
        timezone: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        isVerified: true,
        isClosed: true,
        tags: true,
        businessType: {
          select: {
            id: true,
            name: true,
            displayName: true,
            icon: true,
            category: true
          }
        },
        services: {
          where: { 
            isActive: true 
          },
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
            currency: true,
            isActive: true
          },
          orderBy: { 
            sortOrder: 'asc' 
          }
        }
      }
    });
    
    return result ? convertBusinessData<BusinessWithServices>(result) : null;
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

  async getMultipleBusinessStats(businessIds: string[]): Promise<Record<string, {
    totalAppointments: number;
    activeServices: number;
    totalStaff: number;
    isSubscribed: boolean;
  }>> {
    const [appointments, services, staff, subscriptions] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['businessId'],
        where: { businessId: { in: businessIds } },
        _count: { id: true }
      }),
      this.prisma.service.groupBy({
        by: ['businessId'],
        where: { businessId: { in: businessIds }, isActive: true },
        _count: { id: true }
      }),
      this.prisma.businessStaff.groupBy({
        by: ['businessId'],
        where: { businessId: { in: businessIds }, isActive: true },
        _count: { id: true }
      }),
      this.prisma.businessSubscription.findMany({
        where: {
          businessId: { in: businessIds },
          status: { in: ['ACTIVE', 'TRIAL'] }
        },
        select: { businessId: true }
      })
    ]);

    const result: Record<string, any> = {};
    
    businessIds.forEach(businessId => {
      result[businessId] = {
        totalAppointments: appointments.find(a => a.businessId === businessId)?._count.id || 0,
        activeServices: services.find(s => s.businessId === businessId)?._count.id || 0,
        totalStaff: staff.find(st => st.businessId === businessId)?._count.id || 0,
        isSubscribed: subscriptions.some(sub => sub.businessId === businessId)
      };
    });

    return result;
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

  async updateBusinessHours(businessId: string, businessHours: any): Promise<BusinessData> {
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
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        isActive: true,
        isVerified: true,
        isClosed: true,
        primaryColor: true,
        tags: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return result as BusinessData[];
  }

  async getServicesByBusinessIds(businessIds: string[], options: {
    active?: boolean;
    page: number;
    limit: number;
  }): Promise<{
    services: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: any = {
      businessId: { in: businessIds }
    };

    if (options.active !== undefined) {
      where.isActive = options.active;
    }

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          price: true,
          currency: true,
          isActive: true,
          business: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: [
          { createdAt: 'desc' }
        ]
      }),
      this.prisma.service.count({ where })
    ]);

    const totalPages = Math.ceil(total / options.limit);

    return {
      services,
      total,
      page: options.page,
      totalPages
    };
  }

  async getAllBusinessesMinimalDetails(page = 1, limit = 20): Promise<{
    businesses: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      logoUrl: string | null;
      coverImageUrl: string | null;
      primaryColor: string | null;
      isVerified: boolean;
      isClosed: boolean;
      tags: string[];
      businessType: {
        id: string;
        name: string;
        displayName: string;
        icon: string | null;
        category: string;
      };
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      deletedAt: null
    };

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          city: true,
          state: true,
          country: true,
          logoUrl: true,
          coverImageUrl: true,
          primaryColor: true,
          isVerified: true,
          isClosed: true,
          tags: true,
          businessType: {
            select: {
              id: true,
              name: true,
              displayName: true,
              icon: true,
              category: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      this.prisma.business.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      businesses,
      total,
      page,
      totalPages
    };
  }

  // Enhanced methods with subscription information
  async findByOwnerIdWithSubscription(ownerId: string): Promise<(BusinessData & {
    subscription?: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      plan: {
        id: string;
        name: string;
        displayName: string;
        description: string | null;
        price: number;
        currency: string;
        billingInterval: string;
        maxBusinesses: number;
        maxStaffPerBusiness: number;
        maxAppointmentsPerDay: number;
        features: string[];
        isPopular: boolean;
      };
    };
  })[]> {
    const result = await this.prisma.business.findMany({
      where: {
        ownerId,
        deletedAt: null
      },
      select: {
        id: true,
        ownerId: true,
        businessTypeId: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        businessHours: true,
        timezone: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        theme: true,
        settings: true,
        isActive: true,
        isVerified: true,
        verifiedAt: true,
        isClosed: true,
        closedUntil: true,
        closureReason: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            trialStart: true,
            trialEnd: true,
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                price: true,
                currency: true,
                billingInterval: true,
                maxBusinesses: true,
                maxStaffPerBusiness: true,
                maxAppointmentsPerDay: true,
                features: true,
                isPopular: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter businesses with active subscriptions and format the response
    return result.map(business => {
      const filteredSubscription = business.subscription && ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(business.subscription.status)
        ? business.subscription
        : undefined;
      
      return {
        ...business,
        subscription: filteredSubscription
      };
    }) as (BusinessData & {
      subscription?: {
        id: string;
        status: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        plan: {
          id: string;
          name: string;
          displayName: string;
          description: string | null;
          price: number;
          currency: string;
          billingInterval: string;
          maxBusinesses: number;
          maxStaffPerBusiness: number;
          maxAppointmentsPerDay: number;
          features: string[];
          isPopular: boolean;
        };
      };
    })[];
  }

  async findByIdWithSubscription(id: string): Promise<(BusinessData & {
    subscription?: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      trialStart?: Date;
      trialEnd?: Date;
      plan: {
        id: string;
        name: string;
        displayName: string;
        description: string | null;
        price: number;
        currency: string;
        billingInterval: string;
        maxBusinesses: number;
        maxStaffPerBusiness: number;
        maxAppointmentsPerDay: number;
        features: string[];
        isPopular: boolean;
      };
    };
  }) | null> {
    const result = await this.prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        businessTypeId: true,
        name: true,
        slug: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        businessHours: true,
        timezone: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        theme: true,
        settings: true,
        isActive: true,
        isVerified: true,
        verifiedAt: true,
        isClosed: true,
        closedUntil: true,
        closureReason: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            trialStart: true,
            trialEnd: true,
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                price: true,
                currency: true,
                billingInterval: true,
                maxBusinesses: true,
                maxStaffPerBusiness: true,
                maxAppointmentsPerDay: true,
                features: true,
                isPopular: true
              }
            }
          }
        }
      }
    });

    if (!result) return null;

    // Filter subscription based on active status
    const filteredSubscription = result.subscription && ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(result.subscription.status)
      ? result.subscription
      : undefined;

    return {
      ...result,
      subscription: filteredSubscription
    } as BusinessData & {
      subscription?: {
        id: string;
        status: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialStart?: Date;
        trialEnd?: Date;
        plan: {
          id: string;
          name: string;
          displayName: string;
          description: string | null;
          price: number;
          currency: string;
          billingInterval: string;
          maxBusinesses: number;
          maxStaffPerBusiness: number;
          maxAppointmentsPerDay: number;
          features: string[];
          isPopular: boolean;
        };
      };
    };
  }
}