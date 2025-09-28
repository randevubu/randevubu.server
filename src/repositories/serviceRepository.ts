import { PrismaClient } from '@prisma/client';
import {
  ServiceData,
  CreateServiceRequest,
  UpdateServiceRequest
} from '../types/business';
import { convertBusinessData, convertBusinessDataArray } from '../utils/prismaTypeHelpers';

export class ServiceRepository {
  constructor(private prisma: PrismaClient) {}

  async create(businessId: string, staffId: string, data: CreateServiceRequest): Promise<ServiceData> {
    const maxSortOrder = await this.prisma.service.aggregate({
      where: { businessId },
      _max: { sortOrder: true }
    });

    const serviceId = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const result = await this.prisma.service.create({
      data: {
        id: serviceId,
        businessId,
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price as any,
        currency: data.currency || 'TRY',
        isActive: true,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
        bufferTime: data.bufferTime || 0,
        maxAdvanceBooking: data.maxAdvanceBooking || 30,
        minAdvanceBooking: data.minAdvanceBooking || 0,
        staff: {
          create: {
            id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            staffId: staffId,
            isActive: true
          }
        }
      }
    });
    return convertBusinessData<ServiceData>(result);
  }

  async findById(id: string): Promise<ServiceData | null> {
    const result = await this.prisma.service.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
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
            }
          }
        }
      }
    });
    return result ? convertBusinessData<ServiceData>(result) : null;
  }

  async findByBusinessId(businessId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: { businessId },
      include: {
        staff: {
          include: {
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
            }
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' }
      ]
    });
    return convertBusinessDataArray<ServiceData>(result);
  }

  async findActiveByBusinessId(businessId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        staff: {
          include: {
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
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    return convertBusinessDataArray<ServiceData>(result);
  }

  async update(id: string, data: UpdateServiceRequest): Promise<ServiceData> {
    const result = await this.prisma.service.update({
      where: { id },
      data
    });
    return convertBusinessData<ServiceData>(result);
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
      .reduce((sum, a) => sum + (a.price as any), 0);

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
      ...convertBusinessData<ServiceData>(service),
      appointmentCount: service._count.appointments
    })) as Array<ServiceData & { appointmentCount: number }>;
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

  // NEW: Staff-specific methods

  async findByStaffId(staffId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: {
        staff: {
          some: {
            staffId: staffId,
            isActive: true
          }
        }
      },
      include: {
        staff: {
          include: {
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
            }
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' }
      ]
    });
    return convertBusinessDataArray<ServiceData>(result);
  }

  async findActiveByStaffId(staffId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: {
        isActive: true,
        staff: {
          some: {
            staffId: staffId,
            isActive: true
          }
        }
      },
      include: {
        staff: {
          include: {
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
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    return convertBusinessDataArray<ServiceData>(result);
  }

  async copyServicesFromStaff(
    sourceStaffId: string,
    targetStaffId: string,
    serviceIds?: string[]
  ): Promise<ServiceData[]> {
    // Get source services
    const sourceServices = await this.prisma.service.findMany({
      where: {
        staff: {
          some: {
            staffId: sourceStaffId,
            isActive: true
          }
        },
        ...(serviceIds && { id: { in: serviceIds } }),
        isActive: true
      }
    });

    if (sourceServices.length === 0) {
      return [];
    }

    // Get target staff info for business context
    const targetStaff = await this.prisma.businessStaff.findUnique({
      where: { id: targetStaffId }
    });

    if (!targetStaff) {
      throw new Error('Target staff not found');
    }

    // Copy services
    const copiedServices = await this.prisma.$transaction(
      sourceServices.map(service => {
        const serviceId = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        return this.prisma.service.create({
          data: {
            id: serviceId,
            businessId: targetStaff.businessId,
            name: service.name,
            description: service.description,
            duration: service.duration,
            price: service.price,
            currency: service.currency,
            image: service.image,
            isActive: true,
            showPrice: service.showPrice,
            pricing: service.pricing as any,
            bufferTime: service.bufferTime,
            maxAdvanceBooking: service.maxAdvanceBooking,
            minAdvanceBooking: service.minAdvanceBooking,
            sortOrder: service.sortOrder,
            staff: {
              create: {
                id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                staffId: targetStaffId,
                isActive: true
              }
            }
          }
        });
      })
    );

    return convertBusinessDataArray<ServiceData>(copiedServices);
  }

  async getOwnerServicesByBusinessId(businessId: string): Promise<ServiceData[]> {
    const result = await this.prisma.service.findMany({
      where: {
        businessId,
        staff: {
          some: {
            staff: {
              role: 'OWNER'
            },
            isActive: true
          }
        }
      },
      include: {
        staff: {
          include: {
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
            }
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' }
      ]
    });
    return convertBusinessDataArray<ServiceData>(result);
  }
}