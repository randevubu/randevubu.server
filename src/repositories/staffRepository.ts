import { PrismaClient, BusinessStaffRole } from '@prisma/client';
import { BusinessStaffData } from '../types/business';

export interface CreateStaffRequest {
  businessId: string;
  userId: string;
  role: BusinessStaffRole;
  permissions?: any;
}

export interface UpdateStaffRequest {
  role?: BusinessStaffRole;
  permissions?: any;
  isActive?: boolean;
}

export interface StaffWithUser {
  id: string;
  businessId: string;
  userId: string;
  role: BusinessStaffRole;
  permissions: any;
  isActive: boolean;
  joinedAt: Date;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string;
    avatar: string | null;
    isActive: boolean;
  };
}

export class StaffRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateStaffRequest): Promise<BusinessStaffData> {
    const result = await this.prisma.businessStaff.create({
      data: {
        id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: data.businessId,
        userId: data.userId,
        role: data.role,
        permissions: data.permissions,
        isActive: true,
        joinedAt: new Date(),
      },
    });

    return this.convertToBusinessStaffData(result);
  }

  async findById(id: string): Promise<BusinessStaffData | null> {
    const result = await this.prisma.businessStaff.findUnique({
      where: { id },
    });

    return result ? this.convertToBusinessStaffData(result) : null;
  }

  async findByBusinessIdAndUserId(
    businessId: string,
    userId: string
  ): Promise<BusinessStaffData | null> {
    const result = await this.prisma.businessStaff.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId,
        },
      },
    });

    return result ? this.convertToBusinessStaffData(result) : null;
  }

  async findByBusinessId(businessId: string, includeInactive = false): Promise<StaffWithUser[]> {
    const whereClause: any = { businessId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const results = await this.prisma.businessStaff.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatar: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then MANAGER, etc.
        { joinedAt: 'asc' },
      ],
    });

    return results as StaffWithUser[];
  }

  async findByUserId(userId: string, includeInactive = false): Promise<StaffWithUser[]> {
    const whereClause: any = { userId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const results = await this.prisma.businessStaff.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatar: true,
            isActive: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return results as StaffWithUser[];
  }

  async update(id: string, data: UpdateStaffRequest): Promise<BusinessStaffData> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // If deactivating, set leftAt timestamp
    if (data.isActive === false) {
      updateData.leftAt = new Date();
    }
    // If reactivating, clear leftAt timestamp
    else if (data.isActive === true) {
      updateData.leftAt = null;
    }

    const result = await this.prisma.businessStaff.update({
      where: { id },
      data: updateData,
    });

    return this.convertToBusinessStaffData(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.businessStaff.delete({
      where: { id },
    });
  }

  async deactivate(id: string): Promise<BusinessStaffData> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<BusinessStaffData> {
    return this.update(id, { isActive: true });
  }

  async countActiveStaffByBusinessId(businessId: string): Promise<number> {
    return this.prisma.businessStaff.count({
      where: {
        businessId,
        isActive: true,
      },
    });
  }

  async findStaffByRole(
    businessId: string,
    role: BusinessStaffRole,
    includeInactive = false
  ): Promise<StaffWithUser[]> {
    const whereClause: any = { businessId, role };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const results = await this.prisma.businessStaff.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatar: true,
            isActive: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return results as StaffWithUser[];
  }

  async checkUserExistsInBusiness(businessId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.businessStaff.count({
      where: {
        businessId,
        userId,
        isActive: true,
      },
    });
    return count > 0;
  }

  async getBusinessStaffStats(businessId: string): Promise<{
    totalStaff: number;
    activeStaff: number;
    byRole: Record<BusinessStaffRole, number>;
  }> {
    const [totalStaff, activeStaff, roleStats] = await Promise.all([
      this.prisma.businessStaff.count({
        where: { businessId },
      }),
      this.prisma.businessStaff.count({
        where: { businessId, isActive: true },
      }),
      this.prisma.businessStaff.groupBy({
        by: ['role'],
        where: { businessId, isActive: true },
        _count: { role: true },
      }),
    ]);

    const byRole = {
      OWNER: 0,
      MANAGER: 0,
      STAFF: 0,
      RECEPTIONIST: 0,
    } as Record<BusinessStaffRole, number>;

    roleStats.forEach((stat) => {
      byRole[stat.role] = stat._count.role;
    });

    return {
      totalStaff,
      activeStaff,
      byRole,
    };
  }

  private convertToBusinessStaffData(prismaResult: any): BusinessStaffData {
    return {
      id: prismaResult.id,
      businessId: prismaResult.businessId,
      userId: prismaResult.userId,
      role: prismaResult.role,
      permissions: prismaResult.permissions,
      isActive: prismaResult.isActive,
      joinedAt: prismaResult.joinedAt,
      leftAt: prismaResult.leftAt,
      createdAt: prismaResult.createdAt,
      updatedAt: prismaResult.updatedAt,
    };
  }

  // Utility methods for complex queries
  async findAvailableStaffForService(
    businessId: string,
    serviceId: string,
    date: Date
  ): Promise<StaffWithUser[]> {
    // This would involve checking staff assignments to services and availability
    // For now, return all active staff
    return this.findByBusinessId(businessId);
  }

  async transferStaffToNewBusiness(
    oldBusinessId: string,
    newBusinessId: string,
    staffIds: string[]
  ): Promise<void> {
    await this.prisma.businessStaff.updateMany({
      where: {
        id: { in: staffIds },
        businessId: oldBusinessId,
      },
      data: {
        businessId: newBusinessId,
        updatedAt: new Date(),
      },
    });
  }
}