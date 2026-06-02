import { PrismaClient, Prisma, Service as PrismaService } from '@prisma/client';
import {
  ServiceData,
  CreateServiceRequest,
  UpdateServiceRequest
} from '../types/business';

export class ServiceRepository {
  constructor(private prisma: PrismaClient) {}

  private mapPrismaServiceToServiceData(service: PrismaService): ServiceData {
    return {
      id: service.id,
      businessId: service.businessId,
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: Number(service.price),
      currency: service.currency,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
      bufferTime: service.bufferTime,
      maxAdvanceBooking: service.maxAdvanceBooking,
      minAdvanceBooking: service.minAdvanceBooking,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    } as ServiceData;
  }

  async create(businessId: string, data: CreateServiceRequest): Promise<ServiceData> {
    const maxSortOrder = await this.prisma.service.aggregate({
      where: { businessId },
      _max: { sortOrder: true }
    });

    const result = await this.prisma.service.create({
      data: {
        id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId,
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price !== null && data.price !== undefined 
          ? new Prisma.Decimal(String(data.price))
          : new Prisma.Decimal(0),
        currency: data.currency || 'TRY',
        isActive: true,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
        bufferTime: data.bufferTime || 0,
        maxAdvanceBooking: data.maxAdvanceBooking || 30,
        minAdvanceBooking: data.minAdvanceBooking || 0
      }
    });
    return this.mapPrismaServiceToServiceData(result);
  }

  async findById(id: string): Promise<ServiceData | null> {
    const result = await this.prisma.service.findUnique({
      where: { id }
    });
    return result ? this.mapPrismaServiceToServiceData(result) : null;
  }

  async existsByNameAndBusiness(name: string, businessId: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.service.findFirst({
      where: {
        businessId,
        isActive: true,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return record !== null;
  }

  async findByBusinessId(businessId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: { businessId },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' }
      ]
    });
    return result.map(s => this.mapPrismaServiceToServiceData(s));
  }

  async findActiveByBusinessId(businessId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: {
        businessId,
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    });
    return result.map(s => this.mapPrismaServiceToServiceData(s));
  }

  async update(id: string, data: UpdateServiceRequest): Promise<ServiceData> {
    const result = await this.prisma.service.update({
      where: { id },
      data
    });
    return this.mapPrismaServiceToServiceData(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.service.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async reorderServices(businessId: string, serviceOrders: { id: string; sortOrder: number }[]): Promise<void> {
    await this.prisma.$transaction(
      serviceOrders.map(({ id, sortOrder }) =>
        this.prisma.service.update({
          where: { id },
          data: { sortOrder }
        })
      )
    );
  }


  async getServiceStats(serviceId: string): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    totalRevenue: number;
    averageRating?: number;
  }> {
    const appointments = await this.prisma.appointment.findMany({
      where: { serviceId },
      select: {
        status: true,
        price: true
      }
    });

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length;
    const totalRevenue = appointments
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + (a.price ? Number(a.price) : 0), 0);

    return {
      totalAppointments,
      completedAppointments,
      totalRevenue
    };
  }

  async bulkUpdatePrices(businessId: string, priceMultiplier: number): Promise<void> {
    await this.prisma.service.updateMany({
      where: { businessId },
      data: {
        price: {
          multiply: priceMultiplier
        }
      }
    });
  }

  async findPopularServices(businessId: string, limit = 5): Promise<Array<ServiceData & { appointmentCount: number }>> {
    const result = await this.prisma.service.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            appointments: {
              where: {
                status: { in: ['COMPLETED', 'CONFIRMED'] }
              }
            }
          }
        }
      },
      orderBy: {
        appointments: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return result.map(service => ({
      ...this.mapPrismaServiceToServiceData(service),
      appointmentCount: service._count.appointments
    }));
  }

  async getBusinessStaffRecord(userId: string, businessId: string): Promise<{ id: string } | null> {
    return this.prisma.businessStaff.findFirst({
      where: { userId, businessId, isActive: true },
      select: { id: true },
    });
  }

  // --- ServiceStaff (many-to-many) ---

  async assignStaffToService(serviceId: string, staffId: string): Promise<void> {
    await this.prisma.serviceStaff.upsert({
      where: { serviceId_staffId: { serviceId, staffId } },
      create: {
        id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        serviceId,
        staffId,
        isActive: true,
      },
      update: { isActive: true },
    });
  }

  async assignAllStaffToService(serviceId: string, businessId: string): Promise<void> {
    const activeStaff = await this.prisma.businessStaff.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    await this.prisma.$transaction(
      activeStaff.map(staff =>
        this.prisma.serviceStaff.upsert({
          where: { serviceId_staffId: { serviceId, staffId: staff.id } },
          create: {
            id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            serviceId,
            staffId: staff.id,
            isActive: true,
          },
          update: { isActive: true },
        })
      )
    );
  }

  async removeStaffFromAllServices(staffId: string): Promise<void> {
    await this.prisma.serviceStaff.updateMany({
      where: { staffId },
      data: { isActive: false },
    });
  }

  async getServiceStaffIds(serviceId: string): Promise<string[]> {
    const records = await this.prisma.serviceStaff.findMany({
      where: { serviceId, isActive: true },
      select: { staffId: true },
    });
    return records.map(r => r.staffId);
  }

  async hasAnyStaffAssigned(serviceId: string): Promise<boolean> {
    const count = await this.prisma.serviceStaff.count({
      where: { serviceId, isActive: true },
    });
    return count > 0;
  }

  async getServiceAssignmentStatus(
    serviceId: string,
    businessId: string
  ): Promise<{ assignedCount: number; totalActiveStaff: number; assignedToAll: boolean }> {
    const [assignedCount, totalActiveStaff] = await Promise.all([
      this.prisma.serviceStaff.count({ where: { serviceId, isActive: true } }),
      this.prisma.businessStaff.count({ where: { businessId, isActive: true } }),
    ]);
    return {
      assignedCount,
      totalActiveStaff,
      assignedToAll: totalActiveStaff > 0 && assignedCount >= totalActiveStaff,
    };
  }

  async checkServiceAvailability(
    serviceId: string,
    date: Date,
    startTime: Date
  ): Promise<boolean> {
    const service = await this.findById(serviceId);
    if (!service) return false;

    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    // Check for conflicting appointments
    const conflictingAppointments = await this.prisma.appointment.findMany({
      where: {
        serviceId,
        date,
        status: { in: ['CONFIRMED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    return conflictingAppointments.length === 0;
  }
}