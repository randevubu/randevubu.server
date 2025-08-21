import { PrismaClient } from '@prisma/client';
import {
  AppointmentData,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchFilters,
  AppointmentStatus
} from '../types/business';
import { convertBusinessData, convertBusinessDataArray } from '../utils/prismaTypeHelpers';

export class AppointmentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(customerId: string, data: CreateAppointmentRequest): Promise<AppointmentData> {
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId }
    });

    if (!service) {
      
      throw new Error('Service not found');
    }

    const startDateTime = new Date(`${data.date}T${data.startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);
    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await this.prisma.appointment.create({
      data: {
        id: appointmentId,
        businessId: data.businessId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        customerId,
        date: new Date(data.date),
        startTime: startDateTime,
        endTime: endDateTime,
        duration: service.duration,
        status: AppointmentStatus.PENDING,
        price: service.price as any,
        currency: service.currency,
        customerNotes: data.customerNotes,
        bookedAt: new Date(),
        reminderSent: false
      }
    });
    return convertBusinessData<AppointmentData>(result);
  }

  async findById(id: string): Promise<AppointmentData | null> {
    const result = await this.prisma.appointment.findUnique({
      where: { id }
    });
    return result ? convertBusinessData<AppointmentData>(result) : null;
  }

  async findByIdWithDetails(id: string): Promise<AppointmentWithDetails | null> {
    const result = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        business: true,
        service: true,
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });
    return result ? convertBusinessData<AppointmentWithDetails>(result) : null;
  }

  async findByCustomerId(customerId: string, page = 1, limit = 20): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: [
          { date: 'desc' },
          { startTime: 'desc' }
        ],
        include: {
          business: true,
          service: true,
          staff: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        }
      }),
      this.prisma.appointment.count({
        where: { customerId }
      })
    ]);

    return {
      appointments: convertBusinessDataArray<AppointmentWithDetails>(appointments),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findByBusinessId(businessId: string, page = 1, limit = 20): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: [
          { date: 'desc' },
          { startTime: 'desc' }
        ],
        include: {
          business: true,
          service: true,
          staff: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        }
      }),
      this.prisma.appointment.count({
        where: { businessId }
      })
    ]);

    return {
      appointments: convertBusinessDataArray<AppointmentWithDetails>(appointments),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async search(filters: AppointmentSearchFilters, page = 1, limit = 20): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const where: any = {};

    if (filters.businessId) {
      where.businessId = filters.businessId;
    }

    if (filters.serviceId) {
      where.serviceId = filters.serviceId;
    }

    if (filters.staffId) {
      where.staffId = filters.staffId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { date: 'desc' },
          { startTime: 'desc' }
        ],
        include: {
          business: true,
          service: true,
          staff: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        }
      }),
      this.prisma.appointment.count({ where })
    ]);

    return {
      appointments: convertBusinessDataArray<AppointmentWithDetails>(appointments),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async update(id: string, data: UpdateAppointmentRequest): Promise<AppointmentData> {
    const updateData: any = { ...data };

    if (data.date && data.startTime) {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      updateData.startTime = startDateTime;
      updateData.date = new Date(data.date);

      // Update end time based on service duration
      const appointment = await this.findById(id);
      if (appointment) {
        updateData.endTime = new Date(startDateTime.getTime() + appointment.duration * 60000);
      }
    }

    if (data.status) {
      switch (data.status) {
        case AppointmentStatus.CONFIRMED:
          updateData.confirmedAt = new Date();
          break;
        case AppointmentStatus.COMPLETED:
          updateData.completedAt = new Date();
          break;
        case AppointmentStatus.CANCELED:
        case AppointmentStatus.NO_SHOW:
          updateData.canceledAt = new Date();
          break;
      }
    }

    const result = await this.prisma.appointment.update({
      where: { id },
      data: updateData
    });
    return convertBusinessData<AppointmentData>(result);
  }

  async cancel(id: string, cancelReason?: string): Promise<AppointmentData> {
    const result = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledAt: new Date(),
        cancelReason
      }
    });
    return convertBusinessData<AppointmentData>(result);
  }

  async markNoShow(id: string): Promise<AppointmentData> {
    const result = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.NO_SHOW,
        canceledAt: new Date()
      }
    });
    return convertBusinessData<AppointmentData>(result);
  }

  async findUpcomingByCustomerId(customerId: string, limit = 10): Promise<AppointmentWithDetails[]> {
    const now = new Date();
    
    const result = await this.prisma.appointment.findMany({
      where: {
        customerId,
        date: { gte: now },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
      },
      take: limit,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        business: true,
        service: true,
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });
    return convertBusinessDataArray<AppointmentWithDetails>(result);
  }

  async findTodaysAppointments(businessId: string): Promise<AppointmentWithDetails[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.appointment.findMany({
      where: {
        businessId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: { startTime: 'asc' },
      include: {
        business: true,
        service: true,
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });
    return convertBusinessDataArray<AppointmentWithDetails>(result);
  }

  async findConflictingAppointments(
    businessId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<AppointmentData[]> {
    const where: any = {
      businessId,
      date,
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
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
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const result = await this.prisma.appointment.findMany({ where });
    return convertBusinessDataArray<AppointmentData>(result);
  }

  async getAppointmentStats(businessId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byStatus: Record<AppointmentStatus, number>;
    totalRevenue: number;
    averageValue: number;
  }> {
    const where: any = { businessId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        status: true,
        price: true
      }
    });

    const total = appointments.length;
    const byStatus = appointments.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<AppointmentStatus, number>);

    const completedAppointments = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
    const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.price as any), 0);
    const averageValue = completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0;

    return {
      total,
      byStatus,
      totalRevenue,
      averageValue
    };
  }

  async markReminderSent(id: string): Promise<void> {
    await this.prisma.appointment.update({
      where: { id },
      data: {
        reminderSent: true,
        reminderSentAt: new Date()
      }
    });
  }
}