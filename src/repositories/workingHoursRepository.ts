import { PrismaClient, WorkingHours, Prisma } from '@prisma/client';

export class WorkingHoursRepository {
    constructor(private prisma: PrismaClient) { }

    async findByBusiness(
        businessId: string,
        staffId?: string | null,
        isActive?: boolean
    ): Promise<WorkingHours[]> {
        return this.prisma.workingHours.findMany({
            where: {
                businessId,
                ...(staffId !== undefined && { staffId }),
                ...(isActive !== undefined && { isActive }),
            },
        });
    }

    async findByBusinessAndDay(
        businessId: string,
        dayOfWeek: number,
        staffId?: string | null
    ): Promise<WorkingHours[]> {
        return this.prisma.workingHours.findMany({
            where: {
                businessId,
                dayOfWeek,
                ...(staffId !== undefined && { staffId }),
                isActive: true,
            },
        });
    }

    async create(data: Prisma.WorkingHoursCreateInput): Promise<WorkingHours> {
        return this.prisma.workingHours.create({ data });
    }

    async update(
        id: string,
        data: Prisma.WorkingHoursUpdateInput
    ): Promise<WorkingHours> {
        return this.prisma.workingHours.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<WorkingHours> {
        return this.prisma.workingHours.delete({
            where: { id },
        });
    }
}
