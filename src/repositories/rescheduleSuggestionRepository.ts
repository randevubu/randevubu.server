import { PrismaClient, RescheduleSuggestion, Prisma } from '@prisma/client';

export class RescheduleSuggestionRepository {
    constructor(private prisma: PrismaClient) { }

    async findById(id: string): Promise<RescheduleSuggestion | null> {
        return this.prisma.rescheduleSuggestion.findUnique({
            where: { id },
        });
    }

    async findByIdWithAppointment(id: string): Promise<any | null> {
        return this.prisma.rescheduleSuggestion.findUnique({
            where: { id },
            include: {
                originalAppointment: true,
            },
        });
    }

    async findByClosure(closureId: string): Promise<any[]> {
        return this.prisma.rescheduleSuggestion.findMany({
            where: { closureId },
            include: {
                originalAppointment: true,
            },
        });
    }

    async create(
        data: Prisma.RescheduleSuggestionCreateInput
    ): Promise<RescheduleSuggestion> {
        return this.prisma.rescheduleSuggestion.create({ data });
    }

    async update(
        id: string,
        data: Prisma.RescheduleSuggestionUpdateInput
    ): Promise<RescheduleSuggestion> {
        return this.prisma.rescheduleSuggestion.update({
            where: { id },
            data,
        });
    }

    async updateCustomerResponse(
        id: string,
        response: 'ACCEPTED' | 'DECLINED' | 'NO_RESPONSE'
    ): Promise<RescheduleSuggestion> {
        return this.prisma.rescheduleSuggestion.update({
            where: { id },
            data: {
                customerResponse: response,
                responseAt: new Date(),
            },
        });
    }

    async delete(id: string): Promise<RescheduleSuggestion> {
        return this.prisma.rescheduleSuggestion.delete({
            where: { id },
        });
    }
}
