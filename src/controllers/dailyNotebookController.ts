import { Response } from 'express';
import { DailyNotebookService } from '../services/domain/dailyNotebook';
import { AuthenticatedRequest } from '../types/request';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

export class DailyNotebookController {
  constructor(
    private dailyNotebookService: DailyNotebookService,
    private responseHelper: ResponseHelper
  ) {}

  private parseYearMonth(year: string, month: string): { yearNum: number; monthNum: number } {
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    if (isNaN(yearNum) || isNaN(monthNum)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Year and month must be valid numbers' });
    }
    return { yearNum, monthNum };
  }

  async getNotebook(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId, year, month } = req.params;

    if (!businessId || !year || !month) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID, year, and month are required', params: { field: 'businessId,year,month' } });
    }

    const { yearNum, monthNum } = this.parseYearMonth(year, month);

    const notebook = await this.dailyNotebookService.getOrCreateNotebook(businessId, yearNum, monthNum, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.retrieved', { notebook }, 200, req);
  }

  async updateDailyEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId, year, month } = req.params;
    const { entries } = req.body;

    if (!businessId || !year || !month) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID, year, and month are required', params: { field: 'businessId,year,month' } });
    }

    if (!entries || typeof entries !== 'object') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Entries object is required', params: { field: 'entries' } });
    }

    const { yearNum, monthNum } = this.parseYearMonth(year, month);

    const notebook = await this.dailyNotebookService.updateDailyEntries(businessId, yearNum, monthNum, { entries }, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.entriesUpdated', { notebook }, 200, req);
  }

  async updateSingleEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId, year, month } = req.params;
    const { day, columnId, amount, note } = req.body;

    if (!businessId || !year || !month) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID, year, and month are required', params: { field: 'businessId,year,month' } });
    }

    if (!day || !columnId || amount === undefined) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Day, columnId, and amount are required', params: { field: 'day,columnId,amount' } });
    }

    const { yearNum, monthNum } = this.parseYearMonth(year, month);
    const dayNum = parseInt(day);
    const amountNum = parseFloat(amount);

    if (isNaN(dayNum) || isNaN(amountNum)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Day and amount must be valid numbers' });
    }

    const notebook = await this.dailyNotebookService.updateSingleEntry(
      businessId, yearNum, monthNum, { day: dayNum, columnId, amount: amountNum, note }, userId
    );

    await this.responseHelper.success(res, 'success.dailyNotebook.entryUpdated', { notebook }, 200, req);
  }

  async getColumns(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;

    if (!businessId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    const columns = await this.dailyNotebookService.getColumns(businessId, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.revenueColumnsRetrieved', { columns }, 200, req);
  }

  async createColumn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;
    let { name, type, priority, visible, sortOrder, isSystem } = req.body;

    if (!businessId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    if (!name || !type) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Name and type are required', params: { field: 'name,type' } });
    }

    if (isSystem === true) {
      throw new AppError('VALIDATION_ERROR', { message: 'Cannot create system columns manually' });
    }

    type = type.toUpperCase();

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Type must be either INCOME or EXPENSE' });
    }

    if (priority) {
      priority = priority.toUpperCase();
    }

    const column = await this.dailyNotebookService.createColumn(businessId, { name, type, priority, visible, sortOrder }, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.revenueColumnCreated', { column }, 201, req);
  }

  async updateColumn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId, columnId } = req.params;
    let { name, type, priority, visible, sortOrder } = req.body;

    if (!businessId || !columnId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID and column ID are required', params: { field: 'businessId,columnId' } });
    }

    if (type) {
      type = type.toUpperCase();
      if (!['INCOME', 'EXPENSE'].includes(type)) {
        throw new AppError('VALIDATION_ERROR', { message: 'Type must be either INCOME or EXPENSE' });
      }
    }

    if (priority) {
      priority = priority.toUpperCase();
    }

    const column = await this.dailyNotebookService.updateColumn(businessId, columnId, { name, type, priority, visible, sortOrder }, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.revenueColumnUpdated', { column }, 200, req);
  }

  async deleteColumn(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId, columnId } = req.params;

    if (!businessId || !columnId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID and column ID are required', params: { field: 'businessId,columnId' } });
    }

    await this.dailyNotebookService.deleteColumn(businessId, columnId, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.revenueColumnDeleted', null, 200, req);
  }

  async getAppointmentRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId, year, month } = req.params;

    if (!businessId || !year || !month) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID, year, and month are required', params: { field: 'businessId,year,month' } });
    }

    const { yearNum, monthNum } = this.parseYearMonth(year, month);

    const appointmentRevenue = await this.dailyNotebookService.getAppointmentRevenue(businessId, yearNum, monthNum, userId);

    await this.responseHelper.success(res, 'success.dailyNotebook.appointmentRevenueRetrieved', { appointmentRevenue }, 200, req);
  }

  async getFinancialSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { businessId } = req.params;
    const { year, month } = req.query;

    if (!businessId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    const now = new Date();
    const yearNum = year ? parseInt(year as string) : now.getFullYear();
    const monthNum = month ? parseInt(month as string) : now.getMonth() + 1;

    if (isNaN(yearNum) || isNaN(monthNum)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Year and month must be valid numbers' });
    }

    const notebook = await this.dailyNotebookService.getOrCreateNotebook(businessId, yearNum, monthNum, userId);

    const summary = {
      period: {
        year: yearNum,
        month: monthNum,
        monthName: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
      },
      totals: {
        totalRevenue: notebook.totals.incomeTotal,
        totalExpenses: notebook.totals.expenseTotal,
        netProfit: notebook.totals.grandTotal,
        averageDaily: notebook.totals.averageDaily,
        averageIncome: notebook.totals.averageIncome,
        averageExpense: notebook.totals.averageExpense,
      },
      incomeBreakdown: notebook.columns
        .filter((col) => col.type === 'INCOME' && col.visible)
        .map((col) => ({
          columnId: col.id,
          columnName: col.name,
          amount: notebook.totals.columnTotals[col.id] || 0,
          isSystem: col.isSystem,
        }))
        .sort((a, b) => b.amount - a.amount),
      expenseBreakdown: notebook.columns
        .filter((col) => col.type === 'EXPENSE' && col.visible)
        .map((col) => ({
          columnId: col.id,
          columnName: col.name,
          amount: notebook.totals.columnTotals[col.id] || 0,
          isSystem: col.isSystem,
        }))
        .sort((a, b) => b.amount - a.amount),
      daysWithData: Object.keys(notebook.monthlyData).length,
      lastUpdated: notebook.updatedAt,
    };

    await this.responseHelper.success(res, 'success.dailyNotebook.financialSummaryRetrieved', { summary }, 200, req);
  }
}
