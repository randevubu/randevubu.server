// Daily Notebook Domain Types

export enum ColumnType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum ColumnPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface RevenueColumn {
  id: string;
  businessId: string;
  name: string;
  type: ColumnType;
  priority: ColumnPriority;
  visible: boolean;
  sortOrder: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyEntry {
  id: string;
  notebookId: string;
  columnId: string;
  day: number;
  amount: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DayData {
  [columnId: string]: number;
}

export interface MonthlyData {
  [day: number]: DayData;
}

export interface AppointmentRevenue {
  [day: number]: number;
}

export interface DailyNotebook {
  id: string;
  businessId: string;
  year: number;
  month: number;
  columns: RevenueColumn[];
  monthlyData: MonthlyData;
  appointmentRevenue: AppointmentRevenue;
  totals: {
    dailyTotals: { [day: number]: number };
    columnTotals: { [columnId: string]: number };
    grandTotal: number;
    incomeTotal: number;
    expenseTotal: number;
    averageDaily: number;
    averageIncome: number;
    averageExpense: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface CreateRevenueColumnRequest {
  name: string;
  type: ColumnType;
  priority?: ColumnPriority;
  visible?: boolean;
  sortOrder?: number;
  isSystem?: boolean;
}

export interface UpdateRevenueColumnRequest {
  name?: string;
  type?: ColumnType;
  priority?: ColumnPriority;
  visible?: boolean;
  sortOrder?: number;
}

export interface UpdateDailyEntriesRequest {
  entries: {
    [day: number]: {
      [columnId: string]: number;
    };
  };
}

export interface UpdateSingleEntryRequest {
  day: number;
  columnId: string;
  amount: number;
  note?: string;
}

export interface GetNotebookParams {
  businessId: string;
  year: number;
  month: number;
}

// Validation Types
export interface NotebookValidation {
  isValid: boolean;
  errors: string[];
}

// Default columns configuration
export interface DefaultColumnConfig {
  name: string;
  type: ColumnType;
  priority: ColumnPriority;
  visible: boolean;
  sortOrder: number;
  isSystem: boolean;
}

export const DEFAULT_COLUMNS: DefaultColumnConfig[] = [
  {
    name: 'Randevular',
    type: ColumnType.INCOME,
    priority: ColumnPriority.HIGH,
    visible: true,
    sortOrder: 1,
    isSystem: true
  },
  {
    name: 'Diğer Gelir',
    type: ColumnType.INCOME,
    priority: ColumnPriority.MEDIUM,
    visible: true,
    sortOrder: 2,
    isSystem: false
  },
  {
    name: 'Kira',
    type: ColumnType.EXPENSE,
    priority: ColumnPriority.MEDIUM,
    visible: true,
    sortOrder: 3,
    isSystem: false
  },
  {
    name: 'Maaşlar',
    type: ColumnType.EXPENSE,
    priority: ColumnPriority.MEDIUM,
    visible: true,
    sortOrder: 4,
    isSystem: false
  }
];

