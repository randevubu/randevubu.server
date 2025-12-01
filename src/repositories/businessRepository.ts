import { PrismaClient, Prisma } from '@prisma/client';
import {
  BusinessData,
  BusinessWithDetails,
  BusinessWithServices,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessSearchFilters,
  BusinessHours,
  BreakPeriod,
  RecurringPattern,
  BusinessHoursOverride,
  BusinessNotificationSettingsData,
  StoredPaymentMethodData,
  ServiceData,
  CustomerEvaluationData,
  SubscriptionStatus
} from '../types/business';
import logger from "../utils/Logger/logger";
import { NotFoundError, ValidationError } from '../types/errors';
import { ERROR_CODES } from '../constants/errorCodes';
export interface BusinessQueryOptions {
  includeInactive?: boolean;
  includeDeleted?: boolean;
  businessTypeId?: string;
  isVerified?: boolean;
  isClosed?: boolean;
  limit?: number;
  offset?: number;
}

export interface BusinessStats {
  totalAppointments: number;
  activeServices: number;
  totalStaff: number;
  isSubscribed: boolean;
}

export interface BusinessWithSubscription extends BusinessData {
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
      features: string[];
      isPopular: boolean;
    };
  };
}

export interface BusinessImages {
  logoUrl: string | null;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
  galleryImages: string[];
}

export interface BusinessSearchResult {
  businesses: BusinessData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BusinessMinimalDetails {
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
  averageRating: number | null;
  totalRatings: number;
  businessType: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
    category: string;
  };
}

export class BusinessRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateBusinessRequest & { ownerId: string; slug: string; website: string }): Promise<BusinessData> {
    // Validate business type exists
    const businessType = await this.prisma.businessType.findUnique({
      where: { id: data.businessTypeId },
      select: { id: true, isActive: true }
    });

    if (!businessType || !businessType.isActive) {
      throw new Error(`Business type with ID ${data.businessTypeId} not found or inactive`);
    }

    // Validate slug uniqueness
    const existingSlug = await this.prisma.business.findUnique({
      where: { slug: data.slug }
    });

    if (existingSlug) {
      throw new Error(`Business slug '${data.slug}' already exists`);
    }

    // Validate owner exists
    const owner = await this.prisma.user.findUnique({
      where: { id: data.ownerId },
      select: { id: true, isActive: true }
    });

    if (!owner || !owner.isActive) {
      throw new Error(`Owner with ID ${data.ownerId} not found or inactive`);
    }

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
        timezone: data.timezone || 'Europe/Istanbul',
        primaryColor: data.primaryColor,
        tags: data.tags || [],
        isActive: true,
        isVerified: false,
        isClosed: false
      }
    });

    return this.mapPrismaResultToBusinessData(result);
  }

  async createWithRoleAssignment(
    data: CreateBusinessRequest & { 
      ownerId: string; 
      slug: string; 
      website: string;
      businessHours: BusinessHours;
    }
  ): Promise<BusinessData> {
    // Validate business type exists
    const businessType = await this.prisma.businessType.findUnique({
      where: { id: data.businessTypeId },
      select: { id: true, isActive: true }
    });

    if (!businessType || !businessType.isActive) {
      throw new Error(`Business type with ID ${data.businessTypeId} not found or inactive`);
    }

    // Validate slug uniqueness
    const existingSlug = await this.prisma.business.findUnique({
      where: { slug: data.slug }
    });

    if (existingSlug) {
      throw new Error(`Business slug '${data.slug}' already exists`);
    }

    // Validate owner exists
    const owner = await this.prisma.user.findUnique({
      where: { id: data.ownerId },
      select: { id: true, isActive: true }
    });

    if (!owner || !owner.isActive) {
      throw new Error(`Owner with ID ${data.ownerId} not found or inactive`);
    }

    const business = await this.prisma.$transaction(async (tx) => {
      // Debug logging for business hours
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 BUSINESS REPOSITORY: Business hours being stored:', JSON.stringify(data.businessHours, null, 2));
      }

      // Create business
      const businessId = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const createdBusiness = await tx.business.create({
        data: {
          id: businessId,
          ownerId: data.ownerId,
          businessTypeId: data.businessTypeId,
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          businessHours: data.businessHours as Prisma.InputJsonValue,
          timezone: data.timezone,
          primaryColor: data.primaryColor,
          galleryImages: [],
          isActive: true,
          isVerified: false,
          isClosed: false,
          tags: data.tags || [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Debug logging to verify business hours were stored
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 BUSINESS REPOSITORY: Business created with hours:', JSON.stringify(createdBusiness.businessHours, null, 2));
      }

      // Get the OWNER role
      const ownerRole = await tx.role.findUnique({
        where: { name: 'OWNER' }
      });

      if (!ownerRole || !ownerRole.isActive) {
        throw new NotFoundError('OWNER role not found or inactive', undefined, { additionalData: { errorCode: ERROR_CODES.ROLE_NOT_FOUND } });
      }

      // Assign the role within the same transaction (upsert to handle existing roles)
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: data.ownerId,
            roleId: ownerRole.id
          }
        },
        create: {
          id: `urole_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          userId: data.ownerId,
          roleId: ownerRole.id,
          grantedBy: data.ownerId,
          grantedAt: new Date(),
          isActive: true,
          metadata: {
            businessId: businessId
          }
        },
        update: {
          isActive: true,
          grantedBy: data.ownerId,
          grantedAt: new Date(),
          metadata: {
            businessId: businessId
          },
          updatedAt: new Date()
        }
      });

      // Create owner as staff member in the business
      await tx.businessStaff.create({
        data: {
          id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          businessId: businessId,
          userId: data.ownerId,
          role: 'OWNER',
          permissions: {},
          isActive: true,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return createdBusiness;
    });

    return this.mapPrismaResultToBusinessData(business);
  }

  // Business Hours Override methods
  async findBusinessHoursOverride(businessId: string, date: string): Promise<BusinessHoursOverride | null> {
    const result = await this.prisma.businessHoursOverride.findUnique({
      where: {
        businessId_date: {
          businessId,
          date: new Date(date)
        }
      }
    });

    return result ? this.mapPrismaResultToBusinessHoursOverride(result) : null;
  }

  async createBusinessHoursOverride(data: {
    businessId: string;
    date: Date;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breaks?: BreakPeriod[];
    reason?: string;
    isRecurring?: boolean;
    recurringPattern?: RecurringPattern;
  }): Promise<BusinessHoursOverride> {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true }
    });

    if (!business) {
      throw new Error(`Business with ID ${data.businessId} not found`);
    }

    // Validate date is not in the past
    if (data.date < new Date()) {
      throw new Error('Cannot create business hours override for past dates');
    }

    const result = await this.prisma.businessHoursOverride.create({
      data: {
        id: `bho_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: data.businessId,
        date: data.date,
        isOpen: data.isOpen,
        openTime: data.openTime,
        closeTime: data.closeTime,
        breaks: data.breaks as Prisma.InputJsonValue,
        reason: data.reason,
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapPrismaResultToBusinessHoursOverride(result);
  }

  async updateBusinessHoursOverride(
    businessId: string, 
    date: Date, 
    data: {
      isOpen?: boolean;
      openTime?: string;
      closeTime?: string;
      breaks?: BreakPeriod[];
      reason?: string;
      isRecurring?: boolean;
      recurringPattern?: RecurringPattern;
    }
  ): Promise<BusinessHoursOverride> {
    // Check if override exists
    const existingOverride = await this.prisma.businessHoursOverride.findUnique({
      where: {
        businessId_date: {
          businessId,
          date
        }
      }
    });

    if (!existingOverride) {
      throw new Error(`Business hours override not found for business ${businessId} on date ${date.toISOString().split('T')[0]}`);
    }

    const result = await this.prisma.businessHoursOverride.update({
      where: {
        businessId_date: {
          businessId,
          date
        }
      },
      data: {
        ...data,
        breaks: data.breaks as Prisma.InputJsonValue,
        recurringPattern: data.recurringPattern as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });

    return this.mapPrismaResultToBusinessHoursOverride(result);
  }

  async deleteBusinessHoursOverride(businessId: string, date: Date): Promise<void> {
    const existingOverride = await this.prisma.businessHoursOverride.findUnique({
      where: {
        businessId_date: {
          businessId,
          date
        }
      }
    });

    if (!existingOverride) {
      throw new Error(`Business hours override not found for business ${businessId} on date ${date.toISOString().split('T')[0]}`);
    }

    await this.prisma.businessHoursOverride.delete({
      where: {
        businessId_date: {
          businessId,
          date
        }
      }
    });
  }

  async findBusinessHoursOverrides(businessId: string, startDate?: Date, endDate?: Date): Promise<BusinessHoursOverride[]> {
    const where: { businessId: string; date?: { gte?: Date; lte?: Date } } = { businessId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const result = await this.prisma.businessHoursOverride.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    return result.map(item => this.mapPrismaResultToBusinessHoursOverride(item));
  }

  // Business Notification Settings methods
  async findBusinessNotificationSettings(businessId: string): Promise<BusinessNotificationSettingsData | null> {
    const result = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId }
    });

    return result ? this.mapPrismaResultToBusinessNotificationSettings(result) : null;
  }

  async upsertBusinessNotificationSettings(businessId: string, data: BusinessNotificationSettingsData): Promise<BusinessNotificationSettingsData> {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true }
    });

    if (!business) {
      throw new Error(`Business with ID ${businessId} not found`);
    }

    const result = await this.prisma.businessNotificationSettings.upsert({
      where: { businessId },
      create: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        ...data,
        updatedAt: new Date()
      }
    });

    return this.mapPrismaResultToBusinessNotificationSettings(result);
  }

  // Stored Payment Methods
  async findStoredPaymentMethods(businessId: string): Promise<StoredPaymentMethodData[]> {
    const result = await this.prisma.storedPaymentMethod.findMany({
      where: { businessId },
      select: {
        id: true,
        cardHolderName: true,
        lastFourDigits: true,
        cardBrand: true,
        isDefault: true,
        createdAt: true
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return result.map(paymentMethod => this.mapPrismaResultToStoredPaymentMethod(paymentMethod));
  }

  async findStoredPaymentMethodById(paymentMethodId: string, businessId: string): Promise<StoredPaymentMethodData | null> {
    const paymentMethod = await this.prisma.storedPaymentMethod.findFirst({
      where: { id: paymentMethodId, businessId, isActive: true }
    });

    return paymentMethod ? this.mapPrismaResultToStoredPaymentMethod(paymentMethod) : null;
  }

  async updateStoredPaymentMethodStatus(paymentMethodId: string, isActive: boolean): Promise<void> {
    const existingPaymentMethod = await this.prisma.storedPaymentMethod.findUnique({
      where: { id: paymentMethodId },
      select: { id: true }
    });

    if (!existingPaymentMethod) {
      throw new Error(`Payment method with ID ${paymentMethodId} not found`);
    }

    await this.prisma.storedPaymentMethod.update({
      where: { id: paymentMethodId },
      data: {
        isActive,
        ...(isActive ? {} : { deletedAt: new Date() })
      }
    });
  }

  async updateStoredPaymentMethodsDefault(businessId: string, excludeId?: string): Promise<void> {
    const where: { businessId: string; id?: { not: string } } = { businessId };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    await this.prisma.storedPaymentMethod.updateMany({
      where,
      data: { isDefault: false }
    });
  }

  async createStoredPaymentMethod(data: {
    businessId: string;
    cardHolderName: string;
    lastFourDigits: string;
    cardBrand: string;
    isDefault?: boolean;
    expiryMonth?: string;
    expiryYear?: string;
    providerToken?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StoredPaymentMethodData> {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true }
    });

    if (!business) {
      throw new Error(`Business with ID ${data.businessId} not found`);
    }

    // Validate card details
    if (!data.cardHolderName.trim()) {
      throw new Error('Card holder name is required');
    }

    if (!data.lastFourDigits || data.lastFourDigits.length !== 4) {
      throw new Error('Last four digits must be exactly 4 characters');
    }

    if (!data.cardBrand.trim()) {
      throw new Error('Card brand is required');
    }

    const result = await this.prisma.storedPaymentMethod.create({
      data: {
        id: `spm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: data.businessId,
        cardHolderName: data.cardHolderName,
        lastFourDigits: data.lastFourDigits,
        cardBrand: data.cardBrand,
        expiryMonth: data.expiryMonth || '',
        expiryYear: data.expiryYear || '',
        isDefault: data.isDefault || false,
        isActive: true,
        providerToken: data.providerToken,
        metadata: data.metadata as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapPrismaResultToStoredPaymentMethod(result);
  }

  async findById(id: string): Promise<BusinessData | null> {
    const result = await this.prisma.business.findUnique({
      where: { id }
    });

    return result ? this.mapPrismaResultToBusinessData(result) : null;
  }

  async findByIdWithOwner(id: string): Promise<BusinessData & { owner: any } | null> {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { owner: true }
    });

    return business ? {
      ...this.mapPrismaResultToBusinessData(business),
      owner: business.owner
    } : null;
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

    return result ? this.mapPrismaResultToBusinessWithDetails(result) : null;
  }

  async findByOwnerId(ownerId: string): Promise<BusinessData[]> {
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
        profileImageUrl: true,
        galleryImages: true,
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
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
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
      orderBy: { createdAt: 'desc' }
    });

    return result.map(business => this.mapPrismaResultToBusinessData(business));
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
        profileImageUrl: true,
        galleryImages: true,
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
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
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
      orderBy: { createdAt: 'desc' }
    });

    return result.map(business => this.mapPrismaResultToBusinessData(business));
  }

  async findBySlug(slug: string): Promise<BusinessData | null> {
    const result = await this.prisma.business.findUnique({
      where: { slug }
    });

    return result ? this.mapPrismaResultToBusinessData(result) : null;
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
        profileImageUrl: true,
        galleryImages: true,
        primaryColor: true,
        isVerified: true,
        isClosed: true,
        tags: true,
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true,
        settings: true,
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
    
    return result ? this.mapPrismaResultToBusinessWithServices(result) : null;
  }

  async update(id: string, data: UpdateBusinessRequest): Promise<BusinessData> {
    // Check if business exists
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.businessHours) {
      updateData.businessHours = data.businessHours as Prisma.InputJsonValue;
    }
    
    const result = await this.prisma.business.update({
      where: { id },
      data: updateData
    });

    return this.mapPrismaResultToBusinessData(result);
  }

  async delete(id: string): Promise<void> {
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${id} not found`);
    }

    await this.prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  }

  async search(filters: BusinessSearchFilters, page = 1, limit = 20): Promise<BusinessSearchResult> {
    const skip = (page - 1) * limit;
    
    const where: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
      // Only return businesses with valid (active) subscriptions
      subscription: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
        }
      }
    };

    if (filters.businessTypeId) {
      where.businessTypeId = filters.businessTypeId;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.state) {
      where.state = { contains: filters.state, mode: 'insensitive' };
    }

    if (filters.country) {
      where.country = { contains: filters.country, mode: 'insensitive' };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    // Note: isClosed filter not available in BusinessSearchFilters interface

    if (filters.latitude && filters.longitude && filters.radius) {
      const radiusInDegrees = filters.radius / 111;
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
      businesses: businesses.map(business => this.mapPrismaResultToBusinessData(business)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateVerificationStatus(id: string, isVerified: boolean): Promise<BusinessData> {
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${id} not found`);
    }

    const result = await this.prisma.business.update({
      where: { id },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null
      }
    });

    return this.mapPrismaResultToBusinessData(result);
  }

  async updateClosureStatus(
    id: string, 
    isClosed: boolean, 
    closedUntil?: Date, 
    closureReason?: string
  ): Promise<BusinessData> {
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${id} not found`);
    }

    const result = await this.prisma.business.update({
      where: { id },
      data: {
        isClosed,
        closedUntil,
        closureReason
      }
    });

    return this.mapPrismaResultToBusinessData(result);
  }

  async findByBusinessTypeId(businessTypeId: string): Promise<BusinessData[]> {
    const result = await this.prisma.business.findMany({
      where: {
        businessTypeId,
        isActive: true,
        deletedAt: null,
        // Only return businesses with valid (active) subscriptions
        subscription: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return result.map(business => this.mapPrismaResultToBusinessData(business));
  }

  async getBusinessStats(businessId: string): Promise<BusinessStats> {
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

  async getMultipleBusinessStats(businessIds: string[]): Promise<Record<string, BusinessStats>> {
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

    const result: Record<string, BusinessStats> = {};
    
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
        // Only return businesses with valid (active) subscriptions
        subscription: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
          }
        },
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

    return result.map(business => this.mapPrismaResultToBusinessData(business));
  }

  async updateBusinessHours(businessId: string, businessHours: BusinessHours): Promise<BusinessData> {
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${businessId} not found`);
    }

    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: { businessHours: businessHours as Prisma.InputJsonValue }
    });

    return this.mapPrismaResultToBusinessData(result);
  }

  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    const where: { slug: string; id?: { not: string } } = { slug };
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
        profileImageUrl: true,
        galleryImages: true,
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
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return result.map(business => this.mapPrismaResultToBusinessData(business));
  }

  async getServicesByBusinessIds(businessIds: string[], options: {
    active?: boolean;
    page: number;
    limit: number;
  }): Promise<{
    services: ServiceData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: { businessId: { in: string[] }; isActive?: boolean } = {
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
          businessId: true,
          name: true,
          description: true,
          duration: true,
          price: true,
          currency: true,
          isActive: true,
          showPrice: true,
          sortOrder: true,
          bufferTime: true,
          maxAdvanceBooking: true,
          minAdvanceBooking: true,
          createdAt: true,
          updatedAt: true,
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
      services: services.map(service => ({
        ...service,
        price: service.price ? Number(service.price) : null
      })) as ServiceData[],
      total,
      page: options.page,
      totalPages
    };
  }

  async getAllBusinessesMinimalDetails(page = 1, limit = 20): Promise<{
    businesses: BusinessMinimalDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      deletedAt: null,
      // Only return businesses with valid (active) subscriptions
      subscription: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
        }
      }
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
          averageRating: true,
          totalRatings: true,
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
      businesses: businesses.map(business => this.mapPrismaResultToBusinessMinimalDetails(business)),
      total,
      page,
      totalPages
    };
  }

  // Enhanced methods with subscription information
  async findByOwnerIdWithSubscription(ownerId: string): Promise<BusinessWithSubscription[]> {
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
        profileImageUrl: true,
        galleryImages: true,
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
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        businessType: {
          select: {
            id: true,
            name: true,
            displayName: true,
            icon: true,
            category: true
          }
        },
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
                features: true,
                isPopular: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return result.map(business => this.mapPrismaResultToBusinessWithSubscription(business));
  }

  async findByIdWithSubscription(id: string): Promise<BusinessWithSubscription | null> {
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
        profileImageUrl: true,
        galleryImages: true,
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
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true,
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
                features: true,
                isPopular: true
              }
            }
          }
        }
      }
    });

    if (!result) return null;

    return this.mapPrismaResultToBusinessWithSubscription(result);
  }

  // Image management methods
  async updateBusinessImage(
    businessId: string, 
    imageType: 'logo' | 'cover' | 'profile', 
    imageUrl: string
  ): Promise<BusinessData> {
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${businessId} not found`);
    }

    const updateData: { logoUrl?: string; coverImageUrl?: string; profileImageUrl?: string } = {};
    
    switch (imageType) {
      case 'logo':
        updateData.logoUrl = imageUrl;
        break;
      case 'cover':
        updateData.coverImageUrl = imageUrl;
        break;
      case 'profile':
        updateData.profileImageUrl = imageUrl;
        break;
    }

    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: updateData
    });
    
    return this.mapPrismaResultToBusinessData(result);
  }

  async deleteBusinessImage(
    businessId: string, 
    imageType: 'logo' | 'cover' | 'profile'
  ): Promise<BusinessData> {
    const existingBusiness = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true }
    });

    if (!existingBusiness) {
      throw new Error(`Business with ID ${businessId} not found`);
    }

    const updateData: { logoUrl?: null; coverImageUrl?: null; profileImageUrl?: null } = {};
    
    switch (imageType) {
      case 'logo':
        updateData.logoUrl = null;
        break;
      case 'cover':
        updateData.coverImageUrl = null;
        break;
      case 'profile':
        updateData.profileImageUrl = null;
        break;
    }

    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: updateData
    });
    
    return this.mapPrismaResultToBusinessData(result);
  }

  async addGalleryImage(businessId: string, imageUrl: string): Promise<BusinessData> {
    const business = await this.findById(businessId);
    if (!business) {
      throw new NotFoundError('Business not found', undefined, { additionalData: { errorCode: ERROR_CODES.BUSINESS_NOT_FOUND } });
    }

    const currentGallery = business.galleryImages || [];
    
    if (currentGallery.length >= 10) {
      throw new ValidationError('Maximum 10 gallery images allowed', undefined, undefined, undefined);
    }

    if (currentGallery.includes(imageUrl)) {
      throw new ValidationError('Image already exists in gallery', undefined, undefined, undefined);
    }

    const updatedGallery = [...currentGallery, imageUrl];

    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: { galleryImages: updatedGallery }
    });
    
    return this.mapPrismaResultToBusinessData(result);
  }

  async removeGalleryImage(businessId: string, imageUrl: string): Promise<BusinessData> {
    const business = await this.findById(businessId);
    if (!business) {
      throw new NotFoundError('Business not found', undefined, { additionalData: { errorCode: ERROR_CODES.BUSINESS_NOT_FOUND } });
    }

    const currentGallery = business.galleryImages || [];
    const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);

    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: { galleryImages: updatedGallery }
    });
    
    return this.mapPrismaResultToBusinessData(result);
  }

  async updateGalleryImages(businessId: string, imageUrls: string[]): Promise<BusinessData> {
    if (imageUrls.length > 10) {
      throw new ValidationError('Maximum 10 gallery images allowed', undefined, undefined, undefined);
    }

    const result = await this.prisma.business.update({
      where: { id: businessId },
      data: { galleryImages: imageUrls }
    });
    
    return this.mapPrismaResultToBusinessData(result);
  }

  async getBusinessImages(businessId: string): Promise<BusinessImages> {
    const result = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        logoUrl: true,
        coverImageUrl: true,
        profileImageUrl: true,
        galleryImages: true
      }
    });

    if (!result) {
      throw new NotFoundError('Business not found', undefined, { additionalData: { errorCode: ERROR_CODES.BUSINESS_NOT_FOUND } });
    }

    return {
      logoUrl: result.logoUrl,
      coverImageUrl: result.coverImageUrl,
      profileImageUrl: result.profileImageUrl,
      galleryImages: result.galleryImages || []
    };
  }

  // Helper methods for type-safe mapping
  private mapPrismaResultToBusinessData(prismaResult: any): BusinessData {
    return {
      id: prismaResult.id,
      ownerId: prismaResult.ownerId,
      businessTypeId: prismaResult.businessTypeId,
      name: prismaResult.name,
      slug: prismaResult.slug,
      description: prismaResult.description,
      email: prismaResult.email,
      phone: prismaResult.phone,
      website: prismaResult.website,
      address: prismaResult.address,
      city: prismaResult.city,
      state: prismaResult.state,
      country: prismaResult.country,
      postalCode: prismaResult.postalCode,
      latitude: prismaResult.latitude,
      longitude: prismaResult.longitude,
      businessHours: prismaResult.businessHours,
      timezone: prismaResult.timezone,
      logoUrl: prismaResult.logoUrl,
      coverImageUrl: prismaResult.coverImageUrl,
      profileImageUrl: prismaResult.profileImageUrl,
      galleryImages: prismaResult.galleryImages || [],
      primaryColor: prismaResult.primaryColor,
      theme: prismaResult.theme,
      settings: prismaResult.settings,
      isActive: prismaResult.isActive,
      isVerified: prismaResult.isVerified,
      verifiedAt: prismaResult.verifiedAt,
      isClosed: prismaResult.isClosed,
      closedUntil: prismaResult.closedUntil,
      closureReason: prismaResult.closureReason,
      tags: prismaResult.tags,
      averageRating: prismaResult.averageRating ?? null,
      totalRatings: prismaResult.totalRatings ?? 0,
      lastRatingAt: prismaResult.lastRatingAt ?? null,
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt,
      deletedAt: prismaResult.deletedAt,
      businessType: prismaResult.businessType
    };
  }

  private mapPrismaResultToBusinessWithDetails(prismaResult: any): BusinessWithDetails {
    return {
      ...this.mapPrismaResultToBusinessData(prismaResult),
      businessType: prismaResult.businessType,
      staff: prismaResult.staff,
      services: prismaResult.services,
      subscription: prismaResult.subscription
    };
  }

  private mapPrismaResultToBusinessWithServices(prismaResult: any): BusinessWithServices {
    return {
      ...this.mapPrismaResultToBusinessData(prismaResult),
      businessType: prismaResult.businessType,
      services: prismaResult.services,
      description: prismaResult.description || null,
      email: prismaResult.email || null,
      phone: prismaResult.phone || null,
      website: prismaResult.website || null,
      address: prismaResult.address || null,
      city: prismaResult.city || null,
      state: prismaResult.state || null,
      country: prismaResult.country || null,
      postalCode: prismaResult.postalCode || null,
      businessHours: prismaResult.businessHours || {},
      logoUrl: prismaResult.logoUrl || null,
      coverImageUrl: prismaResult.coverImageUrl || null,
      primaryColor: prismaResult.primaryColor || null
    };
  }

  private mapPrismaResultToBusinessWithSubscription(prismaResult: any): BusinessWithSubscription {
    const filteredSubscription = prismaResult.subscription && ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(prismaResult.subscription.status)
      ? prismaResult.subscription
      : undefined;

    return {
      ...this.mapPrismaResultToBusinessData(prismaResult),
      subscription: filteredSubscription
    };
  }

  private mapPrismaResultToBusinessMinimalDetails(prismaResult: any): BusinessMinimalDetails {
    return {
      id: prismaResult.id,
      name: prismaResult.name,
      slug: prismaResult.slug,
      description: prismaResult.description,
      city: prismaResult.city,
      state: prismaResult.state,
      country: prismaResult.country,
      logoUrl: prismaResult.logoUrl,
      coverImageUrl: prismaResult.coverImageUrl,
      primaryColor: prismaResult.primaryColor,
      isVerified: prismaResult.isVerified,
      isClosed: prismaResult.isClosed,
      tags: prismaResult.tags,
      averageRating: prismaResult.averageRating ?? null,
      totalRatings: prismaResult.totalRatings ?? 0,
      businessType: prismaResult.businessType
    };
  }

  private mapPrismaResultToBusinessHoursOverride(prismaResult: any): BusinessHoursOverride {
    return {
      ...prismaResult,
      date: prismaResult.date.toISOString().split('T')[0],
      breaks: prismaResult.breaks as BreakPeriod[],
      recurringPattern: prismaResult.recurringPattern as RecurringPattern
    };
  }

  private mapPrismaResultToBusinessNotificationSettings(prismaResult: any): BusinessNotificationSettingsData {
    return {
      id: prismaResult.id,
      businessId: prismaResult.businessId,
      enableAppointmentReminders: prismaResult.enableAppointmentReminders,
      reminderChannels: Array.isArray(prismaResult.reminderChannels) 
        ? prismaResult.reminderChannels.map((channel: string) => {
            switch (channel) {
              case 'sms': return 'SMS' as const;
              case 'email': return 'EMAIL' as const;
              case 'push': return 'PUSH' as const;
              default: return 'EMAIL' as const;
            }
          })
        : [],
      reminderTiming: prismaResult.reminderTiming as number[],
      smsEnabled: prismaResult.smsEnabled,
      pushEnabled: prismaResult.pushEnabled,
      emailEnabled: prismaResult.emailEnabled,
      quietHours: prismaResult.quietHours,
      timezone: prismaResult.timezone,
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt
    };
  }

  private mapPrismaResultToStoredPaymentMethod(prismaResult: any): StoredPaymentMethodData {
    return {
      id: prismaResult.id,
      businessId: prismaResult.businessId,
      cardHolderName: prismaResult.cardHolderName,
      lastFourDigits: prismaResult.lastFourDigits,
      cardBrand: prismaResult.cardBrand,
      expiryMonth: prismaResult.expiryMonth,
      expiryYear: prismaResult.expiryYear,
      isDefault: prismaResult.isDefault,
      isActive: prismaResult.isActive,
      providerToken: prismaResult.providerToken,
      metadata: prismaResult.metadata,
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt
    };
  }

  // Google Integration Methods
  async updateGoogleIntegration(
    businessId: string,
    data: {
      googlePlaceId?: string;
      googleOriginalUrl?: string;
      enabled: boolean;
      linkedBy?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<BusinessData> {
    const updateData: any = {
      googleIntegrationEnabled: data.enabled,
      googleLinkedAt: data.enabled ? new Date() : null,
      googleLinkedBy: data.linkedBy
    };

    if (data.googlePlaceId !== undefined) {
      updateData.googlePlaceId = data.googlePlaceId;
    }

    if (data.googleOriginalUrl !== undefined) {
      updateData.googleOriginalUrl = data.googleOriginalUrl;
    }

    // Store coordinates for coordinate-based embedding (more reliable than CID)
    if (data.latitude !== undefined) {
      updateData.latitude = data.latitude;
    }

    if (data.longitude !== undefined) {
      updateData.longitude = data.longitude;
    }

    return await this.prisma.business.update({
      where: { id: businessId },
      data: updateData,
      include: {
        businessType: true
      }
    }) as BusinessData;
  }

  async getGoogleIntegrationSettings(
    businessId: string
  ): Promise<{
    googlePlaceId: string | null;
    googleOriginalUrl: string | null;
    googleIntegrationEnabled: boolean;
    googleLinkedAt: Date | null;
    latitude: number | null;
    longitude: number | null;
    averageRating: number | null;
    totalRatings: number;
    lastRatingAt: Date | null;
  } | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        googlePlaceId: true,
        googleOriginalUrl: true,
        googleIntegrationEnabled: true,
        googleLinkedAt: true,
        latitude: true,
        longitude: true,
        averageRating: true,
        totalRatings: true,
        lastRatingAt: true
      }
    });

    if (!business) {
      return null;
    }

    return {
      googlePlaceId: business.googlePlaceId,
      googleOriginalUrl: business.googleOriginalUrl,
      googleIntegrationEnabled: business.googleIntegrationEnabled,
      googleLinkedAt: business.googleLinkedAt,
      latitude: business.latitude,
      longitude: business.longitude,
      averageRating: business.averageRating,
      totalRatings: business.totalRatings,
      lastRatingAt: business.lastRatingAt
    };
  }

  async findByGooglePlaceId(googlePlaceId: string): Promise<BusinessData | null> {
    return await this.prisma.business.findFirst({
      where: { googlePlaceId },
      include: {
        businessType: true
      }
    }) as BusinessData | null;
  }

  // Rating Cache Methods
  async updateRatingCache(businessId: string): Promise<void> {
    const stats = await this.prisma.customerEvaluation.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: { id: true },
      _max: { createdAt: true }
    });

    const averageRating = stats._avg.rating || 0;
    const totalRatings = stats._count.id;
    const lastRatingAt = stats._max.createdAt;

    // Update the business record with the computed stats
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        averageRating,
        totalRatings,
        lastRatingAt
      }
    });

    // Log the computed stats for debugging
    logger.info(`Rating stats for business ${businessId}:`, {
      averageRating,
      totalRatings,
      lastRatingAt
    });
  }

  async getBusinessRatings(
    businessId: string,
    options: {
      page: number;
      limit: number;
      minRating?: number;
    }
  ): Promise<{
    ratings: CustomerEvaluationData[];
    total: number;
    averageRating: number;
    totalRatings: number;
  }> {
    const where = {
      businessId,
      ...(options.minRating && { rating: { gte: options.minRating } })
    };

    const [ratings, total, business] = await Promise.all([
      this.prisma.customerEvaluation.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit
      }),
      this.prisma.customerEvaluation.count({ where }),
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { 
          averageRating: true,
          totalRatings: true
        }
      })
    ]);

    // Return the overall business average rating and total ratings (calculated from ALL ratings)
    const averageRating = business?.averageRating || 0;
    const totalRatings = business?.totalRatings || 0;

    return {
      ratings: ratings as CustomerEvaluationData[],
      total,
      averageRating,
      totalRatings
    };
  }
}