import { PrismaClient, Payment, PaymentStatus, Prisma } from '@prisma/client';

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  paymentProvider: string;
  providerPaymentId?: string | null;
  metadata?: Prisma.JsonValue | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  refundedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  businessSubscriptionId?: string | null;
}

export interface PaymentWithSubscriptionData extends PaymentData {
  businessSubscription: {
    id: string;
    status: PaymentStatus;
    planId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  } | null;
}

export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  status: PaymentStatus;
  paymentMethod: string;
  paymentProvider: string;
  providerPaymentId?: string;
  metadata?: Prisma.JsonValue;
  businessSubscriptionId?: string;
}

export interface UpdatePaymentRequest {
  status?: PaymentStatus;
  providerPaymentId?: string;
  metadata?: Prisma.JsonValue;
  paidAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}

export interface PaymentFilters {
  businessSubscriptionId?: string;
  status?: PaymentStatus;
  paymentMethod?: string;
  paymentProvider?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaymentStats {
  totalAmount: number;
  totalCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  averageAmount: number;
}

export class PaymentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreatePaymentRequest): Promise<PaymentData> {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    if (!data.paymentMethod?.trim()) {
      throw new Error('paymentMethod is required');
    }
    if (!data.paymentProvider?.trim()) {
      throw new Error('paymentProvider is required');
    }
    const payment = await this.prisma.payment.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        amount: data.amount,
        currency: data.currency || 'TRY',
        status: data.status,
        paymentMethod: data.paymentMethod,
        paymentProvider: data.paymentProvider,
        providerPaymentId: data.providerPaymentId,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        businessSubscriptionId: data.businessSubscriptionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToPaymentData(payment);
  }

  async findById(id: string): Promise<PaymentData | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    return payment ? this.mapToPaymentData(payment) : null;
  }

  async findByIdWithSubscription(id: string): Promise<PaymentWithSubscriptionData | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { 
        businessSubscription: {
          select: {
            id: true,
            status: true,
            planId: true,
            currentPeriodStart: true,
            currentPeriodEnd: true
          }
        }
      }
    });
    return payment
      ? {
          ...this.mapToPaymentData(payment),
          businessSubscription: payment.businessSubscription
            ? {
                id: payment.businessSubscription.id,
                status: payment.businessSubscription.status as PaymentStatus,
                planId: payment.businessSubscription.planId,
                currentPeriodStart: payment.businessSubscription.currentPeriodStart,
                currentPeriodEnd: payment.businessSubscription.currentPeriodEnd
              }
            : null
        }
      : null;
  }

  async findBySubscriptionId(subscriptionId: string, options?: { status?: PaymentStatus; page?: number; limit?: number }): Promise<PaymentData[]> {
    const where: Prisma.PaymentWhereInput = { businessSubscriptionId: subscriptionId };
    if (options?.status) {
      where.status = options.status;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(options?.page && options?.limit && {
        take: options.limit,
        skip: (options.page - 1) * options.limit
      })
    });

    return payments.map((p) => this.mapToPaymentData(p));
  }

  async findByProviderPaymentId(providerPaymentId: string): Promise<PaymentData | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });

    return payment ? this.mapToPaymentData(payment) : null;
  }

  async findByBusinessSubscriptionId(businessSubscriptionId: string): Promise<PaymentData[]> {
    const payments = await this.prisma.payment.findMany({
      where: { businessSubscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => this.mapToPaymentData(p));
  }

  async findMany(filters: PaymentFilters = {}, limit = 50, offset = 0): Promise<PaymentData[]> {
    const where: Prisma.PaymentWhereInput = {};

    if (filters.businessSubscriptionId) {
      where.businessSubscriptionId = filters.businessSubscriptionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.paymentProvider) {
      where.paymentProvider = filters.paymentProvider;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return payments.map((p) => this.mapToPaymentData(p));
  }

  async update(id: string, data: UpdatePaymentRequest): Promise<PaymentData> {
    const updateData: Prisma.PaymentUpdateInput = {
      ...data,
      metadata: (data.metadata as Prisma.InputJsonValue | undefined),
      updatedAt: new Date(),
    };

    const payment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
    });

    return this.mapToPaymentData(payment);
  }

  async updateByProviderPaymentId(providerPaymentId: string, data: UpdatePaymentRequest): Promise<PaymentData | null> {
    const updateData: Prisma.PaymentUpdateManyMutationInput = {
      ...data,
      metadata: (data.metadata as Prisma.InputJsonValue | undefined),
      updatedAt: new Date(),
    };

    const payment = await this.prisma.payment.updateMany({
      where: { providerPaymentId },
      data: updateData,
    });

    if (payment.count === 0) {
      return null;
    }

    // Fetch the updated payment
    const updatedPayment = await this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });

    return updatedPayment ? this.mapToPaymentData(updatedPayment) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.payment.delete({
      where: { id },
    });
  }

  async getStats(filters: PaymentFilters = {}): Promise<PaymentStats> {
    const where: Prisma.PaymentWhereInput = {};

    if (filters.businessSubscriptionId) {
      where.businessSubscriptionId = filters.businessSubscriptionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.paymentProvider) {
      where.paymentProvider = filters.paymentProvider;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [totalResult, statusCounts] = await Promise.all([
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    const totalAmount = Number(totalResult._sum.amount || 0);
    const totalCount = totalResult._count;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    return {
      totalAmount,
      totalCount,
      successfulCount: statusMap.SUCCEEDED || 0,
      failedCount: statusMap.FAILED || 0,
      pendingCount: statusMap.PENDING || 0,
      refundedCount: statusMap.REFUNDED || 0,
      averageAmount,
    };
  }

  async getRevenueByPeriod(
    businessSubscriptionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ period: string; revenue: number; count: number }[]> {
    const payments = await this.prisma.payment.findMany({
      where: {
        businessSubscriptionId,
        status: 'SUCCEEDED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyRevenue = new Map<string, { revenue: number; count: number }>();

    payments.forEach((payment) => {
      const month = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM
      const amount = Number(payment.amount);

      if (!monthlyRevenue.has(month)) {
        monthlyRevenue.set(month, { revenue: 0, count: 0 });
      }

      const current = monthlyRevenue.get(month)!;
      current.revenue += amount;
      current.count += 1;
    });

    return Array.from(monthlyRevenue.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      count: data.count,
    }));
  }

  private mapToPaymentData(payment: Payment): PaymentData {
    return {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      paymentProvider: payment.paymentProvider,
      providerPaymentId: payment.providerPaymentId,
      metadata: payment.metadata,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      refundedAt: payment.refundedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      businessSubscriptionId: payment.businessSubscriptionId,
    };
  }
}
