import { PrismaClient, Prisma, $Enums } from '@prisma/client';
import {
  AppointmentData,
  AppointmentWithDetails,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchFilters,
  AppointmentStatus
} from '../types/business';
import {
  BusinessSettings,
  PriceVisibilitySettings,
  StaffPrivacySettings,
  StaffDisplayInfo,
  FilteredAppointmentData
} from '../types/businessSettings';
import { createDateTimeInIstanbul, getCurrentTimeInIstanbul, createDateRangeFilter } from '../utils/timezoneHelper';

export class AppointmentRepository {
  constructor(private prisma: PrismaClient) { }

  // Helper method to check if prices should be hidden based on business settings
  private shouldHidePrice(businessSettings: BusinessSettings | null, serviceShowPrice: boolean = true): boolean {
    const hideAllServicePrices = businessSettings?.priceVisibility?.hideAllServicePrices === true;
    return hideAllServicePrices || serviceShowPrice === false;
  }

  // Helper method to check if staff names should be hidden based on business settings
  private shouldHideStaffNames(businessSettings: BusinessSettings | null): boolean {
    return businessSettings?.staffPrivacy?.hideStaffNames === true;
  }

  // Helper method to get staff display name based on privacy settings
  private getStaffDisplayName(role: string, businessSettings: BusinessSettings | null): string {
    const privacySettings = businessSettings?.staffPrivacy;
    if (!privacySettings) return 'Staff';

    if (privacySettings.staffDisplayMode === 'ROLES') {
      const roleNames: Record<string, string> = {
        'OWNER': 'Owner',
        'MANAGER': 'Manager',
        'STAFF': 'Staff Member',
        'RECEPTIONIST': 'Receptionist',
      };
      return roleNames[role] || 'Staff';
    }

    if (privacySettings.staffDisplayMode === 'GENERIC') {
      const customLabels = privacySettings.customStaffLabels || {};
      return customLabels[role.toLowerCase()] || 'Staff';
    }

    return 'Staff';
  }

  // Helper method to filter price information from appointment data
  private filterPriceInfo<T extends { price?: number | unknown; currency?: string; service?: { price?: number | unknown; currency?: string } }>(
    appointment: T,
    shouldHide: boolean
  ): T {
    if (!shouldHide) return appointment;

    return {
      ...appointment,
      price: 0,
      currency: '',
      ...(appointment.service && {
        service: {
          ...appointment.service,
          price: 0,
          currency: ''
        }
      })
    };
  }

  // Helper method to filter staff information from appointment data
  private filterStaffInfo<T extends { staff?: StaffDisplayInfo }>(
    appointment: T,
    shouldHide: boolean,
    businessSettings: BusinessSettings | null
  ): T {
    if (!shouldHide || !appointment.staff) return appointment;

    const staffRole = appointment.staff.role || 'STAFF';
    const displayName = this.getStaffDisplayName(staffRole, businessSettings);

    return {
      ...appointment,
      staff: {
        ...appointment.staff,
        user: {
          ...appointment.staff.user,
          firstName: undefined,
          lastName: undefined,
        },
        ...(displayName && { displayName })
      }
    };
  }

  // Helper method to safely extract business settings
  private extractBusinessSettings(settings: unknown): BusinessSettings | null {
    if (!settings || typeof settings !== 'object') return null;
    return settings as BusinessSettings;
  }

  // Mapper methods for type-safe conversions
  private mapPrismaResultToAppointmentData(result: any): AppointmentData {
    return {
      id: result.id,
      businessId: result.businessId,
      serviceId: result.serviceId,
      customerId: result.customerId,
      staffId: result.staffId,
      status: result.status,
      startTime: result.startTime,
      endTime: result.endTime,
      date: result.startTime,
      duration: result.duration || 0,
      price: result.price,
      currency: result.currency,
      customerNotes: result.customerNotes,
      internalNotes: result.internalNotes,
      bookedAt: result.bookedAt,
      reminderSent: result.reminderSent,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  private mapPrismaResultToAppointmentWithDetails(result: any): AppointmentWithDetails {
    return {
      ...this.mapPrismaResultToAppointmentData(result),
      service: result.service,
      staff: result.staff,
      customer: result.customer,
      business: result.business
    };
  }

  private mapToFilteredAppointmentData(appointment: any): FilteredAppointmentData {
    return {
      id: appointment.id,
      date: appointment.startTime,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration || 0,
      status: appointment.status,
      price: appointment.price,
      currency: appointment.currency,
      customerNotes: appointment.customerNotes,
      business: appointment.business,
      service: appointment.service,
      staff: appointment.staff,
      customer: appointment.customer
    };
  }

  async create(customerId: string, data: CreateAppointmentRequest): Promise<AppointmentData> {
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const startDateTime = createDateTimeInIstanbul(data.date, data.startTime);
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);
    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await this.prisma.appointment.create({
      data: {
        id: appointmentId,
        businessId: data.businessId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        customerId,
        date: createDateTimeInIstanbul(data.date, '00:00'),
        startTime: startDateTime,
        endTime: endDateTime,
        duration: service.duration,
        status: AppointmentStatus.CONFIRMED,
        price: service.price,
        currency: service.currency,
        customerNotes: data.customerNotes,
        bookedAt: getCurrentTimeInIstanbul(),
        reminderSent: false
      }
    });
    return this.mapPrismaResultToAppointmentData(result);
  }

  async findById(id: string): Promise<AppointmentData | null> {
    const result = await this.prisma.appointment.findUnique({
      where: { id }
    });
    return result ? this.mapPrismaResultToAppointmentData(result) : null;
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
    return result as AppointmentWithDetails | null;
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
          business: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              timezone: true,
              settings: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
              currency: true,
              showPrice: true,
              businessId: true
            }
          },
          staff: {
            select: {
              id: true,
              businessId: true,
              userId: true,
              role: true,
              isActive: true,
              joinedAt: true,
              leftAt: true,
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
      appointments: appointments.map(apt => {
        const businessSettings = this.extractBusinessSettings(apt.business?.settings);
        const shouldHide = this.shouldHidePrice(businessSettings, apt.service.showPrice);

        const filteredApt = this.filterPriceInfo(apt, shouldHide);

        return this.mapPrismaResultToAppointmentWithDetails(filteredApt);
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getCustomerAppointmentStats(customerId: string, businessOwnerId?: string): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowCount: number;
    lastAppointmentDate: Date | null;
  }> {
    // Build where clause - if businessOwnerId provided, only count appointments from their businesses
    const whereClause: Record<string, unknown> = { customerId };

    if (businessOwnerId) {
      whereClause.business = {
        ownerId: businessOwnerId
      };
    }

    const [
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      noShowCount,
      lastAppointment
    ] = await Promise.all([
      // Total appointments
      this.prisma.appointment.count({
        where: whereClause
      }),

      // Completed appointments
      this.prisma.appointment.count({
        where: {
          ...whereClause,
          status: AppointmentStatus.COMPLETED
        }
      }),

      // Cancelled appointments
      this.prisma.appointment.count({
        where: {
          ...whereClause,
          status: AppointmentStatus.CANCELED
        }
      }),

      // No-show appointments
      this.prisma.appointment.count({
        where: {
          ...whereClause,
          status: AppointmentStatus.NO_SHOW
        }
      }),

      // Last appointment date
      this.prisma.appointment.findFirst({
        where: whereClause,
        orderBy: [
          { date: 'desc' },
          { startTime: 'desc' }
        ],
        select: {
          date: true
        }
      })
    ]);

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments: canceledAppointments,
      noShowCount,
      lastAppointmentDate: lastAppointment?.date || null
    };
  }

  async findByUserBusinesses(userId: string, filters?: {
    status?: AppointmentStatus;
    date?: string;
    businessId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    // Build where clause for appointments in user's businesses
    const whereClause: Record<string, unknown> = {
      OR: [
        // Businesses owned by user
        { business: { ownerId: userId } },
        // Businesses where user is active staff
        {
          business: {
            staff: {
              some: {
                userId,
                isActive: true,
                leftAt: null
              }
            }
          }
        }
      ]
    };

    // Apply filters
    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.date) {
      const startOfDay = createDateTimeInIstanbul(filters.date, '00:00');
      const endOfDay = createDateTimeInIstanbul(filters.date, '23:59');
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    }
    if (filters?.businessId) {
      whereClause.businessId = filters.businessId;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: whereClause,
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          duration: true,
          status: true,
          price: true,
          currency: true,
          customerNotes: true,
          internalNotes: true,
          business: {
            select: {
              id: true,
              name: true,
              settings: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
              currency: true,
              showPrice: true
            }
          },
          staff: {
            select: {
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
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit
      }),
      this.prisma.appointment.count({ where: whereClause })
    ]);

    return {
      appointments: appointments.map(apt => {
        const businessSettings = this.extractBusinessSettings(apt.business?.settings);
        const shouldHide = this.shouldHidePrice(businessSettings, apt.service.showPrice);

        return this.mapPrismaResultToAppointmentWithDetails(this.filterPriceInfo(apt, shouldHide));
      }),
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
            select: {
              role: true,
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
      appointments: appointments.map(apt => this.mapPrismaResultToAppointmentWithDetails(apt)),
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

    const where: Record<string, unknown> = {};

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
      if (filters.startDate && filters.endDate) {
        // Use timezone-aware date range filter
        const dateRange = createDateRangeFilter(filters.startDate, filters.endDate);
        where.startTime = {
          gte: dateRange.gte,
          lte: dateRange.lte
        };
      } else if (filters.startDate) {
        where.startTime = {
          gte: createDateRangeFilter(filters.startDate, filters.startDate).gte
        };
      } else if (filters.endDate) {
        where.startTime = {
          lte: createDateRangeFilter(filters.endDate, filters.endDate).lte
        };
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
            select: {
              role: true,
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
      appointments: appointments.map(apt => this.mapPrismaResultToAppointmentWithDetails(apt)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async update(id: string, data: UpdateAppointmentRequest): Promise<AppointmentData> {
    const updateData: Record<string, unknown> = { ...data };

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
    return this.mapPrismaResultToAppointmentData(result);
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
    return this.mapPrismaResultToAppointmentData(result);
  }

  async markNoShow(id: string): Promise<AppointmentData> {
    const result = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.NO_SHOW,
        canceledAt: new Date()
      }
    });
    return this.mapPrismaResultToAppointmentData(result);
  }

  async findUpcomingByCustomerId(customerId: string, limit = 10): Promise<AppointmentWithDetails[]> {
    const { getCurrentTimeInIstanbul } = require('../utils/timezoneHelper');
    const now = getCurrentTimeInIstanbul();

    const result = await this.prisma.appointment.findMany({
      where: {
        customerId,
        date: { gte: now },
        status: AppointmentStatus.CONFIRMED
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
    return result.map(apt => this.mapPrismaResultToAppointmentWithDetails(apt));
  }

  async findNearestAppointmentInTimeRange(
    customerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AppointmentWithDetails | null> {
    const result = await this.prisma.appointment.findFirst({
      where: {
        customerId,
        startTime: {
          gte: startTime,
          lte: endTime
        },
        status: AppointmentStatus.CONFIRMED
      },
      orderBy: [
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
    return result as AppointmentWithDetails | null;
  }

  async findAppointmentsInTimeRange(
    customerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AppointmentWithDetails[]> {
    const result = await this.prisma.appointment.findMany({
      where: {
        customerId,
        startTime: {
          gte: startTime,
          lte: endTime
        },
        status: AppointmentStatus.CONFIRMED
      },
      orderBy: [
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
    return result.map(apt => this.mapPrismaResultToAppointmentWithDetails(apt));
  }

  async markReminderSent(appointmentId: string): Promise<void> {
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        reminderSent: true,
        reminderSentAt: new Date()
      }
    });
  }

  async findTodaysAppointments(businessId: string): Promise<FilteredAppointmentData[]> {
    const { getCurrentTimeInIstanbul } = require('../utils/timezoneHelper');
    const today = getCurrentTimeInIstanbul();
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
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        price: true,
        currency: true,
        customerNotes: true,
        business: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            currency: true,
            showPrice: true
          }
        },
        staff: {
          select: {
            role: true,
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
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });

    return result.map(apt => {
      const businessSettings = this.extractBusinessSettings(apt.business?.settings);
      const shouldHidePrice = this.shouldHidePrice(businessSettings, apt.service.showPrice);
      const shouldHideStaffNames = this.shouldHideStaffNames(businessSettings);

      let appointment: FilteredAppointmentData = {
        ...apt,
        price: Number(apt.price),
        customerNotes: apt.customerNotes || undefined,
        business: apt.business ? {
          ...apt.business,
          settings: this.extractBusinessSettings(apt.business.settings) || undefined
        } : undefined,
        service: apt.service ? {
          ...apt.service,
          price: Number(apt.service.price)
        } : undefined,
        staff: apt.staff ? {
          role: apt.staff.role,
          user: {
            firstName: apt.staff.user?.firstName || undefined,
            lastName: apt.staff.user?.lastName || undefined
          }
        } : undefined,
        customer: apt.customer ? {
          firstName: apt.customer.firstName || undefined,
          lastName: apt.customer.lastName || undefined,
          phoneNumber: apt.customer.phoneNumber
        } : undefined
      };

      // Apply price filtering
      appointment = this.filterPriceInfo(appointment, shouldHidePrice);

      // Apply staff privacy filtering
      appointment = this.filterStaffInfo(appointment, shouldHideStaffNames, businessSettings);

      return this.mapToFilteredAppointmentData(appointment);
    });
  }

  async findTodaysAppointmentsForBusinesses(businessIds: string[]): Promise<FilteredAppointmentData[]> {
    const { getCurrentTimeInIstanbul } = require('../utils/timezoneHelper');
    const today = getCurrentTimeInIstanbul();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.appointment.findMany({
      where: {
        businessId: { in: businessIds },
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: [{ businessId: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        price: true,
        currency: true,
        customerNotes: true,
        business: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            currency: true,
            showPrice: true
          }
        },
        staff: {
          select: {
            role: true,
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
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });

    return result.map(apt => {
      const businessSettings = this.extractBusinessSettings(apt.business?.settings);
      const shouldHidePrice = this.shouldHidePrice(businessSettings, apt.service.showPrice);
      const shouldHideStaffNames = this.shouldHideStaffNames(businessSettings);

      let appointment: FilteredAppointmentData = {
        ...apt,
        price: Number(apt.price),
        customerNotes: apt.customerNotes || undefined,
        business: apt.business ? {
          ...apt.business,
          settings: this.extractBusinessSettings(apt.business.settings) || undefined
        } : undefined,
        service: apt.service ? {
          ...apt.service,
          price: Number(apt.service.price)
        } : undefined,
        staff: apt.staff ? {
          role: apt.staff.role,
          user: {
            firstName: apt.staff.user?.firstName || undefined,
            lastName: apt.staff.user?.lastName || undefined
          }
        } : undefined,
        customer: apt.customer ? {
          firstName: apt.customer.firstName || undefined,
          lastName: apt.customer.lastName || undefined,
          phoneNumber: apt.customer.phoneNumber
        } : undefined
      };

      // Apply price filtering
      appointment = this.filterPriceInfo(appointment, shouldHidePrice);

      // Apply staff privacy filtering
      appointment = this.filterStaffInfo(appointment, shouldHideStaffNames, businessSettings);

      return this.mapToFilteredAppointmentData(appointment);
    });
  }

  async findConflictingAppointments(
    businessId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    staffId?: string,
    excludeAppointmentId?: string
  ): Promise<AppointmentData[]> {
    const where: Record<string, unknown> = {
      businessId,
      date,
      status: { in: [AppointmentStatus.CONFIRMED] },
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

    if (staffId) {
      (where as any).staffId = staffId;
    }

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const result = await this.prisma.appointment.findMany({ where });
    return result.map(apt => this.mapPrismaResultToAppointmentData(apt));
  }

  async getAppointmentStats(businessId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    totalRevenue: number;
    averageValue: number;
  }> {
    const where: Record<string, unknown> = { businessId };

    if (startDate || endDate) {
      (where.date as Record<string, unknown>) = {};
      if (startDate) (where.date as Record<string, unknown>).gte = startDate;
      if (endDate) (where.date as Record<string, unknown>).lte = endDate;
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
    }, {} as Partial<Record<AppointmentStatus, number>>);

    const completedAppointments = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
    const totalRevenue = completedAppointments.reduce((sum, a) => sum + Number(a.price), 0);
    const averageValue = completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0;

    return {
      total,
      byStatus,
      totalRevenue,
      averageValue
    };
  }

  async getAppointmentStatsForBusinesses(businessIds: string[], startDate?: Date, endDate?: Date): Promise<Record<string, {
    total: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
    totalRevenue: number;
    averageValue: number;
  }>> {
    const where: Record<string, unknown> = { businessId: { in: businessIds } };

    if (startDate || endDate) {
      (where.date as Record<string, unknown>) = {};
      if (startDate) (where.date as Record<string, unknown>).gte = startDate;
      if (endDate) (where.date as Record<string, unknown>).lte = endDate;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        businessId: true,
        status: true,
        price: true
      }
    });

    const result: Record<string, {
      total: number;
      byStatus: Partial<Record<AppointmentStatus, number>>;
      totalRevenue: number;
      averageValue: number;
    }> = {};

    businessIds.forEach(businessId => {
      const businessAppointments = appointments.filter(a => a.businessId === businessId);
      const total = businessAppointments.length;
      const byStatus = businessAppointments.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Partial<Record<AppointmentStatus, number>>);

      const completedAppointments = businessAppointments.filter(a => a.status === AppointmentStatus.COMPLETED);
      const totalRevenue = completedAppointments.reduce((sum, a) => sum + Number(a.price), 0);
      const averageValue = completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0;

      result[businessId] = {
        total,
        byStatus,
        totalRevenue,
        averageValue
      };
    });

    return result;
  }

  // Working hours for business/staff/day (active only)
  async findWorkingHours(
    businessId: string,
    dayOfWeek: number,
    staffId?: string | null
  ): Promise<Array<{ startTime: string; endTime: string; dayOfWeek: number; staffId: string | null }>> {
    const result = await this.prisma.workingHours.findMany({
      where: {
        businessId,
        staffId: staffId ?? null,
        dayOfWeek,
        isActive: true
      },
      select: {
        startTime: true,
        endTime: true,
        dayOfWeek: true,
        staffId: true
      }
    });
    return result as Array<{ startTime: string; endTime: string; dayOfWeek: number; staffId: string | null }>;
  }

  // Create working hours for a business
  async createWorkingHours(data: {
    businessId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    staffId?: string | null;
    isActive?: boolean;
  }): Promise<void> {
    await this.prisma.workingHours.create({
      data: {
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: data.businessId,
        staffId: data.staffId ?? null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }


  // Appointments for a given day (optionally by staff) including staff user
  async findAppointmentsForDay(
    businessId: string,
    startOfDay: Date,
    endOfDay: Date,
    staffId?: string
  ): Promise<AppointmentWithDetails[]> {
    const result = await this.prisma.appointment.findMany({
      where: {
        businessId,
        ...(staffId ? { staffId } : {}),
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: [$Enums.AppointmentStatus.CONFIRMED, $Enums.AppointmentStatus.IN_PROGRESS, $Enums.AppointmentStatus.PENDING]
        }
      },
      include: {
        staff: {
          include: {
            user: true
          }
        },
        business: true,
        service: true,
        customer: true
      }
    });
    return result as unknown as AppointmentWithDetails[];
  }

  async findByBusinessAndDateRange(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AppointmentWithDetails[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        OR: [
          // Appointment starts within closure period
          {
            startTime: {
              gte: startDate,
              lte: endDate
            }
          },
          // Appointment ends within closure period  
          {
            endTime: {
              gte: startDate,
              lte: endDate
            }
          },
          // Appointment spans the entire closure period
          {
            AND: [
              { startTime: { lte: startDate } },
              { endTime: { gte: endDate } }
            ]
          }
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            currency: true,
            showPrice: true
          }
        },
        staff: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            settings: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return appointments.map(apt => {
      const businessSettings = this.extractBusinessSettings(apt.business?.settings);
      const shouldHide = this.shouldHidePrice(businessSettings, apt.service.showPrice);

      return this.filterPriceInfo(apt, shouldHide);
    }).map(apt => this.mapPrismaResultToAppointmentWithDetails(apt));
  }

  // Count appointments with filters
  async getAppointmentsCount(filters: {
    businessId?: string;
    customerId?: string;
    date?: {
      gte?: Date;
      lte?: Date;
    };
    status?: {
      not?: string;
    };
  }): Promise<number> {
    const whereClause: any = {};

    if (filters.businessId) {
      whereClause.businessId = filters.businessId;
    }

    if (filters.customerId) {
      whereClause.customerId = filters.customerId;
    }

    if (filters.date) {
      whereClause.date = filters.date;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    return await this.prisma.appointment.count({
      where: whereClause
    });
  }

  // ============================================================================
  // Background Job Methods (for AppointmentScheduler)
  // ============================================================================

  /**
   * Find confirmed appointments that have passed their end time
   * Used by auto-complete background job
   */
  async findConfirmedAppointmentsPastEndTime(now: Date): Promise<AppointmentWithDetails[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        endTime: {
          lt: now,
        },
      },
      include: {
        business: {
          select: {
            name: true,
            timezone: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        staff: {
          select: {
            role: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return appointments.map(apt => this.mapPrismaResultToAppointmentWithDetails(apt));
  }

  /**
   * Mark multiple appointments as completed
   * Used by auto-complete background job
   */
  async markAppointmentsAsCompleted(
    appointmentIds: string[],
    now: Date
  ): Promise<{ count: number }> {
    const result = await this.prisma.appointment.updateMany({
      where: {
        id: {
          in: appointmentIds,
        },
      },
      data: {
        status: AppointmentStatus.COMPLETED,
        completedAt: now,
        updatedAt: now,
      },
    });

    return { count: result.count };
  }
}