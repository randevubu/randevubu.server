import { PrismaClient, DiscountCode, DiscountCodeUsage, DiscountType } from '@prisma/client';

export interface DiscountCodeData {
  id: string;
  code: string;
  name?: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages: number;
  currentUsages: number;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  minPurchaseAmount?: number;
  applicablePlans: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
}

export interface DiscountCodeUsageData {
  id: string;
  discountCodeId: string;
  businessSubscriptionId?: string;
  paymentId?: string;
  userId: string;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  usedAt: Date;
  metadata?: any;
}

export interface CreateDiscountCodeRequest {
  code: string;
  name?: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages?: number;
  validFrom?: Date;
  validUntil?: Date;
  minPurchaseAmount?: number;
  applicablePlans?: string[];
  metadata?: any;
  createdById?: string;
}

export interface DiscountValidationResult {
  isValid: boolean;
  discountCode?: DiscountCodeData;
  errorMessage?: string;
  calculatedDiscount?: {
    discountAmount: number;
    originalAmount: number;
    finalAmount: number;
  };
}

export class DiscountCodeRepository {
  constructor(private prisma: PrismaClient) {}

  async findByCode(code: string): Promise<DiscountCodeData | null> {
    const discountCode = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!discountCode) return null;

    return this.mapToDiscountCodeData(discountCode);
  }

  async findById(id: string): Promise<DiscountCodeData | null> {
    const discountCode = await this.prisma.discountCode.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!discountCode) return null;

    return this.mapToDiscountCodeData(discountCode);
  }

  async create(data: CreateDiscountCodeRequest): Promise<DiscountCodeData> {
    const discountCode = await this.prisma.discountCode.create({
      data: {
        id: `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUsages: data.maxUsages || 1,
        validFrom: data.validFrom || new Date(),
        validUntil: data.validUntil,
        minPurchaseAmount: data.minPurchaseAmount,
        applicablePlans: data.applicablePlans || [],
        metadata: data.metadata,
        createdById: data.createdById,
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return this.mapToDiscountCodeData(discountCode);
  }

  async update(id: string, data: Partial<CreateDiscountCodeRequest>): Promise<DiscountCodeData | null> {
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    if (data.code) {
      updateData.code = data.code.toUpperCase();
    }

    const discountCode = await this.prisma.discountCode.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return this.mapToDiscountCodeData(discountCode);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    createdById?: string;
  } = {}): Promise<{
    discountCodes: DiscountCodeData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, isActive, createdById } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (createdById) {
      where.createdById = createdById;
    }

    const [discountCodes, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              usages: true
            }
          }
        }
      }),
      this.prisma.discountCode.count({ where })
    ]);

    return {
      discountCodes: discountCodes.map(this.mapToDiscountCodeData),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async validateDiscountCode(
    code: string,
    planId: string,
    amount: number,
    userId?: string
  ): Promise<DiscountValidationResult> {
    const discountCode = await this.findByCode(code);

    if (!discountCode) {
      return {
        isValid: false,
        errorMessage: 'Discount code not found'
      };
    }

    if (!discountCode.isActive) {
      return {
        isValid: false,
        errorMessage: 'Discount code is not active'
      };
    }

    // Check expiration
    const now = new Date();
    if (discountCode.validFrom > now) {
      return {
        isValid: false,
        errorMessage: 'Discount code is not yet valid'
      };
    }

    if (discountCode.validUntil && discountCode.validUntil < now) {
      return {
        isValid: false,
        errorMessage: 'Discount code has expired'
      };
    }

    // Check usage limit
    if (discountCode.currentUsages >= discountCode.maxUsages) {
      return {
        isValid: false,
        errorMessage: 'Discount code has reached its usage limit'
      };
    }

    // Check if user already used this code (one-time use per user)
    if (userId) {
      const existingUsage = await this.prisma.discountCodeUsage.findFirst({
        where: {
          discountCodeId: discountCode.id,
          userId
        }
      });

      if (existingUsage) {
        return {
          isValid: false,
          errorMessage: 'You have already used this discount code'
        };
      }
    }

    // Check minimum purchase amount
    if (discountCode.minPurchaseAmount && amount < discountCode.minPurchaseAmount) {
      return {
        isValid: false,
        errorMessage: `Minimum purchase amount is ${discountCode.minPurchaseAmount}`
      };
    }

    // Check applicable plans
    if (discountCode.applicablePlans.length > 0 && !discountCode.applicablePlans.includes(planId)) {
      return {
        isValid: false,
        errorMessage: 'Discount code is not applicable to this plan'
      };
    }

    // Calculate discount
    let discountAmount: number;
    if (discountCode.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (amount * discountCode.discountValue) / 100;
    } else {
      discountAmount = discountCode.discountValue;
    }

    // Ensure discount doesn't exceed total amount
    discountAmount = Math.min(discountAmount, amount);
    const finalAmount = Math.max(0, amount - discountAmount);

    return {
      isValid: true,
      discountCode,
      calculatedDiscount: {
        discountAmount,
        originalAmount: amount,
        finalAmount
      }
    };
  }

  async recordUsage(
    discountCodeId: string,
    userId: string,
    discountAmount: number,
    originalAmount: number,
    finalAmount: number,
    businessSubscriptionId?: string,
    paymentId?: string,
    metadata?: any
  ): Promise<DiscountCodeUsageData> {
    const usage = await this.prisma.discountCodeUsage.create({
      data: {
        id: `dcu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        discountCodeId,
        userId,
        discountAmount,
        originalAmount,
        finalAmount,
        businessSubscriptionId,
        paymentId,
        metadata
      }
    });

    // Increment usage count
    await this.prisma.discountCode.update({
      where: { id: discountCodeId },
      data: {
        currentUsages: {
          increment: 1
        }
      }
    });

    return this.mapToUsageData(usage);
  }

  async getUsageHistory(
    discountCodeId: string,
    params: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    usages: DiscountCodeUsageData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [usages, total] = await Promise.all([
      this.prisma.discountCodeUsage.findMany({
        where: { discountCodeId },
        skip,
        take: limit,
        orderBy: { usedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          },
          businessSubscription: {
            select: {
              id: true,
              business: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      this.prisma.discountCodeUsage.count({ where: { discountCodeId } })
    ]);

    return {
      usages: usages.map(this.mapToUsageData),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.discountCode.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deactivate(id: string): Promise<boolean> {
    try {
      await this.prisma.discountCode.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStatistics(): Promise<{
    totalCodes: number;
    activeCodes: number;
    expiredCodes: number;
    totalUsages: number;
    totalDiscountAmount: number;
  }> {
    const now = new Date();

    const [totalCodes, activeCodes, expiredCodes, usageStats] = await Promise.all([
      this.prisma.discountCode.count(),
      this.prisma.discountCode.count({
        where: {
          isActive: true,
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } }
          ]
        }
      }),
      this.prisma.discountCode.count({
        where: {
          validUntil: { lt: now }
        }
      }),
      this.prisma.discountCodeUsage.aggregate({
        _count: { id: true },
        _sum: { discountAmount: true }
      })
    ]);

    return {
      totalCodes,
      activeCodes,
      expiredCodes,
      totalUsages: usageStats._count.id || 0,
      totalDiscountAmount: Number(usageStats._sum.discountAmount || 0)
    };
  }

  private mapToDiscountCodeData(discountCode: any): DiscountCodeData {
    return {
      id: discountCode.id,
      code: discountCode.code,
      name: discountCode.name,
      description: discountCode.description,
      discountType: discountCode.discountType,
      discountValue: Number(discountCode.discountValue),
      maxUsages: discountCode.maxUsages,
      currentUsages: discountCode.currentUsages,
      isActive: discountCode.isActive,
      validFrom: discountCode.validFrom,
      validUntil: discountCode.validUntil,
      minPurchaseAmount: discountCode.minPurchaseAmount ? Number(discountCode.minPurchaseAmount) : undefined,
      applicablePlans: discountCode.applicablePlans,
      metadata: discountCode.metadata,
      createdAt: discountCode.createdAt,
      updatedAt: discountCode.updatedAt,
      createdById: discountCode.createdById
    };
  }

  private mapToUsageData(usage: any): DiscountCodeUsageData {
    return {
      id: usage.id,
      discountCodeId: usage.discountCodeId,
      businessSubscriptionId: usage.businessSubscriptionId,
      paymentId: usage.paymentId,
      userId: usage.userId,
      discountAmount: Number(usage.discountAmount),
      originalAmount: Number(usage.originalAmount),
      finalAmount: Number(usage.finalAmount),
      usedAt: usage.usedAt,
      metadata: usage.metadata
    };
  }

  async findSubscriptionById(subscriptionId: string): Promise<any> {
    return await this.prisma.businessSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        business: {
          include: {
            owner: true
          }
        },
        plan: true
      }
    });
  }

  async findPlanById(planId: string): Promise<any> {
    return await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });
  }

  async updateSubscriptionMetadata(
    subscriptionId: string,
    metadata: any
  ): Promise<any> {
    return await this.prisma.businessSubscription.update({
      where: { id: subscriptionId },
      data: {
        metadata: metadata
      }
    });
  }
}