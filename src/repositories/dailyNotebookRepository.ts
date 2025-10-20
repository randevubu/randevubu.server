import { PrismaClient } from '@prisma/client';
import {
  RevenueColumn,
  DailyEntry,
  CreateRevenueColumnRequest,
  UpdateRevenueColumnRequest,
  ColumnType,
  ColumnPriority,
  UpdateSingleEntryRequest
} from '../types/dailyNotebook';

export class DailyNotebookRepository {
  constructor(private prisma: PrismaClient) {}

  // ===== NOTEBOOK OPERATIONS =====

  async findNotebook(businessId: string, year: number, month: number) {
    return await this.prisma.businessDailyNotebook.findUnique({
      where: {
        businessId_year_month: {
          businessId,
          year,
          month
        }
      },
      include: {
        dailyEntries: {
          include: {
            column: true
          }
        }
      }
    });
  }

  async createNotebook(businessId: string, year: number, month: number) {
    const notebookId = `notebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return await this.prisma.businessDailyNotebook.create({
      data: {
        id: notebookId,
        businessId,
        year,
        month
      },
      include: {
        dailyEntries: {
          include: {
            column: true
          }
        }
      }
    });
  }

  async getOrCreateNotebook(businessId: string, year: number, month: number) {
    const notebook = await this.findNotebook(businessId, year, month);
    
    if (notebook) {
      return notebook;
    }
    
    return await this.createNotebook(businessId, year, month);
  }

  // ===== REVENUE COLUMN OPERATIONS =====

  async findColumnsByBusinessId(businessId: string): Promise<RevenueColumn[]> {
    const columns = await this.prisma.revenueColumn.findMany({
      where: { businessId },
      orderBy: { sortOrder: 'asc' }
    });

    return columns.map(col => ({
      id: col.id,
      businessId: col.businessId,
      name: col.name,
      type: col.type as ColumnType,
      priority: col.priority as ColumnPriority,
      visible: col.visible,
      sortOrder: col.sortOrder,
      isSystem: col.isSystem,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt
    }));
  }

  async findColumnById(columnId: string): Promise<RevenueColumn | null> {
    const column = await this.prisma.revenueColumn.findUnique({
      where: { id: columnId }
    });

    if (!column) return null;

    return {
      id: column.id,
      businessId: column.businessId,
      name: column.name,
      type: column.type as ColumnType,
      priority: column.priority as ColumnPriority,
      visible: column.visible,
      sortOrder: column.sortOrder,
      isSystem: column.isSystem,
      createdAt: column.createdAt,
      updatedAt: column.updatedAt
    };
  }

  async createColumn(businessId: string, data: CreateRevenueColumnRequest): Promise<RevenueColumn> {
    const columnId = `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const column = await this.prisma.revenueColumn.create({
      data: {
        id: columnId,
        businessId,
        name: data.name,
        type: data.type,
        priority: data.priority || ColumnPriority.MEDIUM,
        visible: data.visible !== undefined ? data.visible : true,
        sortOrder: data.sortOrder || 0,
        isSystem: data.isSystem || false
      }
    });

    return {
      id: column.id,
      businessId: column.businessId,
      name: column.name,
      type: column.type as ColumnType,
      priority: column.priority as ColumnPriority,
      visible: column.visible,
      sortOrder: column.sortOrder,
      isSystem: column.isSystem,
      createdAt: column.createdAt,
      updatedAt: column.updatedAt
    };
  }

  async updateColumn(columnId: string, data: UpdateRevenueColumnRequest): Promise<RevenueColumn> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.visible !== undefined) updateData.visible = data.visible;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const column = await this.prisma.revenueColumn.update({
      where: { id: columnId },
      data: updateData
    });

    return {
      id: column.id,
      businessId: column.businessId,
      name: column.name,
      type: column.type as ColumnType,
      priority: column.priority as ColumnPriority,
      visible: column.visible,
      sortOrder: column.sortOrder,
      isSystem: column.isSystem,
      createdAt: column.createdAt,
      updatedAt: column.updatedAt
    };
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.prisma.revenueColumn.delete({
      where: { id: columnId }
    });
  }

  async getNextSortOrder(businessId: string): Promise<number> {
    const result = await this.prisma.revenueColumn.aggregate({
      where: { businessId },
      _max: { sortOrder: true }
    });
    
    return (result._max.sortOrder || 0) + 1;
  }

  // ===== DAILY ENTRY OPERATIONS =====

  async findEntriesByNotebook(notebookId: string): Promise<DailyEntry[]> {
    const entries = await this.prisma.dailyEntry.findMany({
      where: { notebookId },
      orderBy: [{ day: 'asc' }, { columnId: 'asc' }]
    });

    return entries.map(entry => ({
      id: entry.id,
      notebookId: entry.notebookId,
      columnId: entry.columnId,
      day: entry.day,
      amount: Number(entry.amount),
      note: entry.note || undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }));
  }

  async findEntry(notebookId: string, columnId: string, day: number): Promise<DailyEntry | null> {
    const entry = await this.prisma.dailyEntry.findUnique({
      where: {
        notebookId_columnId_day: {
          notebookId,
          columnId,
          day
        }
      }
    });

    if (!entry) return null;

    return {
      id: entry.id,
      notebookId: entry.notebookId,
      columnId: entry.columnId,
      day: entry.day,
      amount: Number(entry.amount),
      note: entry.note || undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  async upsertEntry(data: UpdateSingleEntryRequest & { notebookId: string }): Promise<DailyEntry> {
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry = await this.prisma.dailyEntry.upsert({
      where: {
        notebookId_columnId_day: {
          notebookId: data.notebookId,
          columnId: data.columnId,
          day: data.day
        }
      },
      create: {
        id: entryId,
        notebookId: data.notebookId,
        columnId: data.columnId,
        day: data.day,
        amount: data.amount,
        note: data.note
      },
      update: {
        amount: data.amount,
        note: data.note
      }
    });

    return {
      id: entry.id,
      notebookId: entry.notebookId,
      columnId: entry.columnId,
      day: entry.day,
      amount: Number(entry.amount),
      note: entry.note || undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  async bulkUpsertEntries(
    notebookId: string,
    entries: Array<{ columnId: string; day: number; amount: number; note?: string }>
  ): Promise<void> {
    // Use transaction for atomic bulk operation
    await this.prisma.$transaction(
      entries.map(entry => {
        const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return this.prisma.dailyEntry.upsert({
          where: {
            notebookId_columnId_day: {
              notebookId,
              columnId: entry.columnId,
              day: entry.day
            }
          },
          create: {
            id: entryId,
            notebookId,
            columnId: entry.columnId,
            day: entry.day,
            amount: entry.amount,
            note: entry.note
          },
          update: {
            amount: entry.amount,
            note: entry.note
          }
        });
      })
    );
  }

  async deleteEntry(notebookId: string, columnId: string, day: number): Promise<void> {
    await this.prisma.dailyEntry.delete({
      where: {
        notebookId_columnId_day: {
          notebookId,
          columnId,
          day
        }
      }
    });
  }

  async deleteEntriesByColumn(columnId: string): Promise<void> {
    await this.prisma.dailyEntry.deleteMany({
      where: { columnId }
    });
  }

  // ===== HELPER METHODS =====

  async verifyBusinessOwnership(businessId: string, userId: string): Promise<boolean> {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: userId },
          {
            staff: {
              some: {
                userId,
                isActive: true,
                role: { in: ['OWNER', 'MANAGER'] }
              }
            }
          }
        ]
      }
    });

    return business !== null;
  }

  async getAppointmentRevenue(
    businessId: string,
    year: number,
    month: number
  ): Promise<{ [day: number]: number }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const appointments = await this.prisma.appointment.groupBy({
      by: ['date'],
      where: {
        businessId,
        status: 'COMPLETED',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        price: true
      }
    });

    const revenueByDay: { [day: number]: number } = {};

    appointments.forEach(appointment => {
      const day = appointment.date.getDate();
      revenueByDay[day] = Number(appointment._sum.price || 0);
    });

    return revenueByDay;
  }
}

