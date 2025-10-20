import { Response } from 'express';
import { DailyNotebookService } from '../services/domain/dailyNotebook';
import { AuthenticatedRequest } from '../types/request';
import {
  handleRouteError,
  sendSuccessResponse,
  sendAppErrorResponse
} from '../utils/responseUtils';
import { ERROR_CODES } from '../constants/errorCodes';

export class DailyNotebookController {
  constructor(private dailyNotebookService: DailyNotebookService) {}

  /**
   * Get or create daily notebook for a specific month
   * GET /api/v1/businesses/:businessId/daily-notebook/:year/:month
   */
  async getNotebook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, year, month } = req.params;

      if (!businessId || !year || !month) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID, year, and month are required',
          statusCode: 400
        });
        return;
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum)) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Year and month must be valid numbers',
          statusCode: 400
        });
        return;
      }

      const notebook = await this.dailyNotebookService.getOrCreateNotebook(
        businessId,
        yearNum,
        monthNum,
        userId
      );

      sendSuccessResponse(res, 'Daily notebook retrieved successfully', { notebook });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update daily entries in bulk
   * PUT /api/v1/businesses/:businessId/daily-notebook/:year/:month/entries
   */
  async updateDailyEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, year, month } = req.params;
      const { entries } = req.body;

      if (!businessId || !year || !month) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID, year, and month are required',
          statusCode: 400
        });
        return;
      }

      if (!entries || typeof entries !== 'object') {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Entries object is required',
          statusCode: 400
        });
        return;
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum)) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Year and month must be valid numbers',
          statusCode: 400
        });
        return;
      }

      const notebook = await this.dailyNotebookService.updateDailyEntries(
        businessId,
        yearNum,
        monthNum,
        { entries },
        userId
      );

      sendSuccessResponse(res, 'Daily entries updated successfully', { notebook });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update a single entry
   * PATCH /api/v1/businesses/:businessId/daily-notebook/:year/:month/entries/single
   */
  async updateSingleEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, year, month } = req.params;
      const { day, columnId, amount, note } = req.body;

      if (!businessId || !year || !month) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID, year, and month are required',
          statusCode: 400
        });
        return;
      }

      if (!day || !columnId || amount === undefined) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Day, columnId, and amount are required',
          statusCode: 400
        });
        return;
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      const amountNum = parseFloat(amount);

      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(amountNum)) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Year, month, day, and amount must be valid numbers',
          statusCode: 400
        });
        return;
      }

      const notebook = await this.dailyNotebookService.updateSingleEntry(
        businessId,
        yearNum,
        monthNum,
        { day: dayNum, columnId, amount: amountNum, note },
        userId
      );

      sendSuccessResponse(res, 'Entry updated successfully', { notebook });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get all revenue columns for a business
   * GET /api/v1/businesses/:businessId/revenue-columns
   */
  async getColumns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;

      if (!businessId) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID is required',
          statusCode: 400
        });
        return;
      }

      const columns = await this.dailyNotebookService.getColumns(businessId, userId);

      sendSuccessResponse(res, 'Revenue columns retrieved successfully', { columns });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Create a new revenue column
   * POST /api/v1/businesses/:businessId/revenue-columns
   */
  async createColumn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      let { name, type, priority, visible, sortOrder, isSystem } = req.body;

      if (!businessId) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID is required',
          statusCode: 400
        });
        return;
      }

      if (!name || !type) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Name and type are required',
          statusCode: 400
        });
        return;
      }

      // Prevent users from creating system columns manually
      if (isSystem === true) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Cannot create system columns manually',
          statusCode: 400
        });
        return;
      }

      // Convert type to uppercase for consistency
      type = type.toUpperCase();

      if (!['INCOME', 'EXPENSE'].includes(type)) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Type must be either INCOME or EXPENSE',
          statusCode: 400
        });
        return;
      }

      // Convert priority to uppercase if provided
      if (priority) {
        priority = priority.toUpperCase();
      }

      const column = await this.dailyNotebookService.createColumn(
        businessId,
        { name, type, priority, visible, sortOrder },
        userId
      );

      sendSuccessResponse(res, 'Revenue column created successfully', { column }, 201);
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update a revenue column
   * PUT /api/v1/businesses/:businessId/revenue-columns/:columnId
   */
  async updateColumn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, columnId } = req.params;
      let { name, type, priority, visible, sortOrder } = req.body;

      if (!businessId || !columnId) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID and column ID are required',
          statusCode: 400
        });
        return;
      }

      // Convert type to uppercase if provided
      if (type) {
        type = type.toUpperCase();
        if (!['INCOME', 'EXPENSE'].includes(type)) {
          sendAppErrorResponse(res, {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Type must be either INCOME or EXPENSE',
            statusCode: 400
          });
          return;
        }
      }

      // Convert priority to uppercase if provided
      if (priority) {
        priority = priority.toUpperCase();
      }

      const column = await this.dailyNotebookService.updateColumn(
        businessId,
        columnId,
        { name, type, priority, visible, sortOrder },
        userId
      );

      sendSuccessResponse(res, 'Revenue column updated successfully', { column });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Delete a revenue column
   * DELETE /api/v1/businesses/:businessId/revenue-columns/:columnId
   */
  async deleteColumn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, columnId } = req.params;

      if (!businessId || !columnId) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID and column ID are required',
          statusCode: 400
        });
        return;
      }

      await this.dailyNotebookService.deleteColumn(businessId, columnId, userId);

      sendSuccessResponse(res, 'Revenue column deleted successfully', null);
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get appointment revenue for a specific month
   * GET /api/v1/businesses/:businessId/appointment-revenue/:year/:month
   */
  async getAppointmentRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId, year, month } = req.params;

      if (!businessId || !year || !month) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID, year, and month are required',
          statusCode: 400
        });
        return;
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum)) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Year and month must be valid numbers',
          statusCode: 400
        });
        return;
      }

      const appointmentRevenue = await this.dailyNotebookService.getAppointmentRevenue(
        businessId,
        yearNum,
        monthNum,
        userId
      );

      sendSuccessResponse(res, 'Appointment revenue retrieved successfully', { appointmentRevenue });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get financial summary from Daily Notebook for reports dashboard
   * GET /api/v1/businesses/:businessId/financial-summary
   */
  async getFinancialSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { businessId } = req.params;
      const { year, month } = req.query;

      if (!businessId) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Business ID is required',
          statusCode: 400
        });
        return;
      }

      // Default to current month if not provided
      const now = new Date();
      const yearNum = year ? parseInt(year as string) : now.getFullYear();
      const monthNum = month ? parseInt(month as string) : now.getMonth() + 1;

      if (isNaN(yearNum) || isNaN(monthNum)) {
        sendAppErrorResponse(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Year and month must be valid numbers',
          statusCode: 400
        });
        return;
      }

      const notebook = await this.dailyNotebookService.getOrCreateNotebook(
        businessId,
        yearNum,
        monthNum,
        userId
      );

      // Build financial summary for reports
      const summary = {
        period: {
          year: yearNum,
          month: monthNum,
          monthName: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' })
        },
        totals: {
          totalRevenue: notebook.totals.incomeTotal,
          totalExpenses: notebook.totals.expenseTotal,
          netProfit: notebook.totals.grandTotal,
          averageDaily: notebook.totals.averageDaily,
          averageIncome: notebook.totals.averageIncome,
          averageExpense: notebook.totals.averageExpense
        },
        incomeBreakdown: notebook.columns
          .filter(col => col.type === 'INCOME' && col.visible)
          .map(col => ({
            columnId: col.id,
            columnName: col.name,
            amount: notebook.totals.columnTotals[col.id] || 0,
            isSystem: col.isSystem
          }))
          .sort((a, b) => b.amount - a.amount),
        expenseBreakdown: notebook.columns
          .filter(col => col.type === 'EXPENSE' && col.visible)
          .map(col => ({
            columnId: col.id,
            columnName: col.name,
            amount: notebook.totals.columnTotals[col.id] || 0,
            isSystem: col.isSystem
          }))
          .sort((a, b) => b.amount - a.amount),
        daysWithData: Object.keys(notebook.monthlyData).length,
        lastUpdated: notebook.updatedAt
      };

      sendSuccessResponse(res, 'Financial summary retrieved successfully', { summary });
    } catch (error: any) {
      handleRouteError(error, req, res);
    }
  }
}

