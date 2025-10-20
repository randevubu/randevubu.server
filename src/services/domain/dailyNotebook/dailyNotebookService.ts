import { DailyNotebookRepository } from '../../../repositories/dailyNotebookRepository';
import {
  DailyNotebook,
  RevenueColumn,
  CreateRevenueColumnRequest,
  UpdateRevenueColumnRequest,
  UpdateDailyEntriesRequest,
  MonthlyData,
  ColumnType,
  DEFAULT_COLUMNS,
  UpdateSingleEntryRequest
} from '../../../types/dailyNotebook';

export class DailyNotebookService {
  constructor(private repository: DailyNotebookRepository) {}

  /**
   * Get or create a daily notebook for a specific month
   */
  async getOrCreateNotebook(
    businessId: string,
    year: number,
    month: number,
    userId: string
  ): Promise<DailyNotebook> {
    // Verify business ownership
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    // Validate month and year
    if (month < 1 || month > 12) {
      throw new Error('Invalid month: Month must be between 1 and 12');
    }
    if (year < 2000 || year > 2100) {
      throw new Error('Invalid year: Year must be between 2000 and 2100');
    }

    // Get or create notebook
    let notebook = await this.repository.findNotebook(businessId, year, month);
    
    if (!notebook) {
      notebook = await this.repository.createNotebook(businessId, year, month);
      
      // Initialize default columns for new notebook
      await this.initializeDefaultColumns(businessId);
    }

    // Get columns
    const columns = await this.repository.findColumnsByBusinessId(businessId);
    
    // If no columns exist, create default ones
    if (columns.length === 0) {
      await this.initializeDefaultColumns(businessId);
      const newColumns = await this.repository.findColumnsByBusinessId(businessId);
      return await this.buildNotebookResponse(notebook.id, businessId, year, month, newColumns);
    }

    return await this.buildNotebookResponse(notebook.id, businessId, year, month, columns);
  }

  /**
   * Initialize default columns for a new business
   */
  private async initializeDefaultColumns(businessId: string): Promise<void> {
    const existingColumns = await this.repository.findColumnsByBusinessId(businessId);
    
    if (existingColumns.length > 0) {
      return; // Columns already exist
    }

    for (const defaultCol of DEFAULT_COLUMNS) {
      await this.repository.createColumn(businessId, {
        name: defaultCol.name,
        type: defaultCol.type,
        priority: defaultCol.priority,
        visible: defaultCol.visible,
        sortOrder: defaultCol.sortOrder,
        isSystem: defaultCol.isSystem
      });
    }
  }

  /**
   * Build complete notebook response with all calculations
   */
  private async buildNotebookResponse(
    notebookId: string,
    businessId: string,
    year: number,
    month: number,
    columns: RevenueColumn[]
  ): Promise<DailyNotebook> {
    // Get all entries for the notebook
    const entries = await this.repository.findEntriesByNotebook(notebookId);
    
    // Get appointment revenue for the month
    const appointmentRevenue = await this.repository.getAppointmentRevenue(businessId, year, month);
    
    // Auto-sync appointment revenue to the "Randevular" column in database
    await this.syncAppointmentRevenue(notebookId, columns, appointmentRevenue);
    
    // Re-fetch entries after sync
    const updatedEntries = await this.repository.findEntriesByNotebook(notebookId);
    
    // Build monthly data structure
    const monthlyData: MonthlyData = {};
    updatedEntries.forEach(entry => {
      if (!monthlyData[entry.day]) {
        monthlyData[entry.day] = {};
      }
      monthlyData[entry.day][entry.columnId] = entry.amount;
    });

    // Calculate totals
    const totals = this.calculateTotals(columns, monthlyData, appointmentRevenue, year, month);

    return {
      id: notebookId,
      businessId,
      year,
      month,
      columns,
      monthlyData,
      appointmentRevenue,
      totals,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Sync appointment revenue to the Randevular (appointments) system column
   */
  private async syncAppointmentRevenue(
    notebookId: string,
    columns: RevenueColumn[],
    appointmentRevenue: { [day: number]: number }
  ): Promise<void> {
    // Find the system "Randevular" (Appointments) column
    const appointmentsColumn = columns.find(col => col.isSystem && col.name === 'Randevular');
    
    if (!appointmentsColumn) {
      return; // No appointments column, skip sync
    }

    // Update each day's appointment revenue (including 0 to clear canceled appointments)
    for (const [dayStr, amount] of Object.entries(appointmentRevenue)) {
      const day = parseInt(dayStr);
      // Always upsert, even if amount is 0, to reflect cancellations/refunds
      await this.repository.upsertEntry({
        notebookId,
        day,
        columnId: appointmentsColumn.id,
        amount,
        note: amount > 0 ? 'Auto-synced from completed appointments' : 'No completed appointments'
      });
    }
  }

  /**
   * Calculate all totals (daily, column, and grand totals)
   */
  private calculateTotals(
    columns: RevenueColumn[],
    monthlyData: MonthlyData,
    appointmentRevenue: { [day: number]: number },
    year: number,
    month: number
  ) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const visibleColumns = columns.filter(col => col.visible);
    
    const dailyTotals: { [day: number]: number } = {};
    const columnTotals: { [columnId: string]: number } = {};
    let incomeTotal = 0;
    let expenseTotal = 0;

    // Find the system "Randevular" (Appointments) column
    const appointmentsColumn = columns.find(col => col.isSystem && col.name === 'Randevular');

    // Initialize column totals
    visibleColumns.forEach(col => {
      columnTotals[col.id] = 0;
    });

    // Calculate daily and column totals
    let daysWithData = 0;
    let daysWithIncome = 0;
    let daysWithExpense = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      let dayTotal = 0;
      let hasDayData = false;

      visibleColumns.forEach(col => {
        // Get value from database (already includes synced appointment revenue)
        let value = monthlyData[day]?.[col.id] || 0;

        // Convert to number to ensure negative values work
        const numericValue = Number(value);

        // Add to column total (supports negative values)
        columnTotals[col.id] += numericValue;

        // Add to day total (income adds, expense subtracts)
        // Negative income reduces income (like a refund)
        // Negative expense increases day total (like a credit)
        if (col.type === ColumnType.INCOME) {
          dayTotal += numericValue;
          incomeTotal += numericValue;
          if (numericValue !== 0) {
            daysWithIncome++;
            hasDayData = true;
          }
        } else {
          // Expense: positive values reduce total, negative values increase it
          dayTotal -= numericValue;
          expenseTotal += numericValue;
          if (numericValue !== 0) {
            daysWithExpense++;
            hasDayData = true;
          }
        }
      });

      dailyTotals[day] = dayTotal;
      if (hasDayData) daysWithData++;
    }

    const grandTotal = incomeTotal - expenseTotal;
    
    // Calculate averages
    const averageDaily = daysWithData > 0 ? grandTotal / daysWithData : 0;
    const averageIncome = daysWithIncome > 0 ? incomeTotal / daysWithIncome : 0;
    const averageExpense = daysWithExpense > 0 ? expenseTotal / daysWithExpense : 0;

    return {
      dailyTotals,
      columnTotals,
      grandTotal,
      incomeTotal,
      expenseTotal,
      averageDaily,
      averageIncome,
      averageExpense
    };
  }

  /**
   * Update multiple daily entries at once
   */
  async updateDailyEntries(
    businessId: string,
    year: number,
    month: number,
    data: UpdateDailyEntriesRequest,
    userId: string
  ): Promise<DailyNotebook> {
    // Verify business ownership
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    // Get or create notebook
    const notebook = await this.repository.getOrCreateNotebook(businessId, year, month);

    // Prepare entries for bulk upsert
    const entries: Array<{ columnId: string; day: number; amount: number; note?: string }> = [];
    
    Object.entries(data.entries).forEach(([dayStr, dayData]) => {
      const day = parseInt(dayStr);
      Object.entries(dayData).forEach(([columnId, amount]) => {
        entries.push({ columnId, day, amount });
      });
    });

    // Bulk upsert entries
    if (entries.length > 0) {
      await this.repository.bulkUpsertEntries(notebook.id, entries);
    }

    // Return updated notebook
    return await this.getOrCreateNotebook(businessId, year, month, userId);
  }

  /**
   * Update a single daily entry
   */
  async updateSingleEntry(
    businessId: string,
    year: number,
    month: number,
    data: UpdateSingleEntryRequest,
    userId: string
  ): Promise<DailyNotebook> {
    // Verify business ownership
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    // Validate day
    const daysInMonth = new Date(year, month, 0).getDate();
    if (data.day < 1 || data.day > daysInMonth) {
      throw new Error(`Invalid day: Day must be between 1 and ${daysInMonth} for the selected month`);
    }

    // Verify column belongs to business
    const column = await this.repository.findColumnById(data.columnId);
    if (!column || column.businessId !== businessId) {
      throw new Error('Invalid column: Column does not belong to this business');
    }

    // Get or create notebook
    const notebook = await this.repository.getOrCreateNotebook(businessId, year, month);

    // Upsert entry
    await this.repository.upsertEntry({
      notebookId: notebook.id,
      ...data
    });

    // Return updated notebook
    return await this.getOrCreateNotebook(businessId, year, month, userId);
  }

  // ===== REVENUE COLUMN MANAGEMENT =====

  /**
   * Get all columns for a business
   */
  async getColumns(businessId: string, userId: string): Promise<RevenueColumn[]> {
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    let columns = await this.repository.findColumnsByBusinessId(businessId);
    
    // If no columns, initialize defaults
    if (columns.length === 0) {
      await this.initializeDefaultColumns(businessId);
      columns = await this.repository.findColumnsByBusinessId(businessId);
    }

    return columns;
  }

  /**
   * Create a new revenue column
   */
  async createColumn(
    businessId: string,
    data: CreateRevenueColumnRequest,
    userId: string
  ): Promise<RevenueColumn> {
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    // Validate column name
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Column name is required');
    }
    if (data.name.length > 100) {
      throw new Error('Column name must be less than 100 characters');
    }

    // Set sort order if not provided
    if (data.sortOrder === undefined) {
      data.sortOrder = await this.repository.getNextSortOrder(businessId);
    }

    return await this.repository.createColumn(businessId, data);
  }

  /**
   * Update a revenue column
   */
  async updateColumn(
    businessId: string,
    columnId: string,
    data: UpdateRevenueColumnRequest,
    userId: string
  ): Promise<RevenueColumn> {
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    // Verify column belongs to business
    const column = await this.repository.findColumnById(columnId);
    if (!column) {
      throw new Error('Column not found');
    }
    if (column.businessId !== businessId) {
      throw new Error('Column does not belong to this business');
    }

    // Don't allow updating system columns' type or name
    if (column.isSystem && (data.name !== undefined || data.type !== undefined)) {
      throw new Error('Cannot modify name or type of system columns');
    }

    // Validate column name if provided
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Column name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new Error('Column name must be less than 100 characters');
      }
    }

    return await this.repository.updateColumn(columnId, data);
  }

  /**
   * Delete a revenue column
   */
  async deleteColumn(
    businessId: string,
    columnId: string,
    userId: string
  ): Promise<void> {
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    // Verify column belongs to business
    const column = await this.repository.findColumnById(columnId);
    if (!column) {
      throw new Error('Column not found');
    }
    if (column.businessId !== businessId) {
      throw new Error('Column does not belong to this business');
    }

    // Don't allow deleting system columns
    if (column.isSystem) {
      throw new Error('Cannot delete system columns');
    }

    // Delete all entries associated with this column
    await this.repository.deleteEntriesByColumn(columnId);

    // Delete the column
    await this.repository.deleteColumn(columnId);
  }

  /**
   * Get appointment revenue for a specific month
   */
  async getAppointmentRevenue(
    businessId: string,
    year: number,
    month: number,
    userId: string
  ): Promise<{ [day: number]: number }> {
    const hasAccess = await this.repository.verifyBusinessOwnership(businessId, userId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to access this business');
    }

    return await this.repository.getAppointmentRevenue(businessId, year, month);
  }
}

