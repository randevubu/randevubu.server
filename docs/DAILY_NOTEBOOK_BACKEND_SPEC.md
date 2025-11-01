# Günlük Defterim (Daily Notebook) - Backend Implementation Guide

## 📊 Overview

The Daily Notebook is a financial tracking system that allows businesses to record daily income and expenses in an Excel-like interface, with automatic integration of appointment revenue. This system provides real-time financial tracking with mobile-optimized views.

---

## 🗄️ Database Schema

### 1. Business Daily Notebook Table
```sql
CREATE TABLE business_daily_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, year, month)
);

CREATE INDEX idx_business_daily_notebooks_business_year_month 
ON business_daily_notebooks(business_id, year, month);
```

### 2. Revenue Columns Table
```sql
CREATE TABLE revenue_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_revenue_columns_business_id ON revenue_columns(business_id);
CREATE INDEX idx_revenue_columns_business_visible ON revenue_columns(business_id, visible);
```

### 3. Daily Entries Table
```sql
CREATE TABLE daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES business_daily_notebooks(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES revenue_columns(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(notebook_id, column_id, day)
);

CREATE INDEX idx_daily_entries_notebook_day ON daily_entries(notebook_id, day);
CREATE INDEX idx_daily_entries_column_id ON daily_entries(column_id);
```

---

## 📋 TypeScript Interfaces

```typescript
export interface RevenueColumn {
  id: string;
  businessId: string;
  name: string;
  type: 'income' | 'expense';
  priority: 'high' | 'medium' | 'low';
  visible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DayData {
  [columnId: string]: number;
}

export interface MonthlyData {
  [day: number]: DayData;
}

export interface DailyNotebook {
  id: string;
  businessId: string;
  year: number;
  month: number;
  columns: RevenueColumn[];
  monthlyData: MonthlyData;
  appointmentRevenue: MonthlyData;
  totals: {
    dailyTotals: { [day: number]: number };
    columnTotals: { [columnId: string]: number };
    grandTotal: number;
    incomeTotal: number;
    expenseTotal: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateRevenueColumnRequest {
  name: string;
  type: 'income' | 'expense';
  priority?: 'high' | 'medium' | 'low';
  visible?: boolean;
  sortOrder?: number;
}

export interface UpdateRevenueColumnRequest {
  name?: string;
  type?: 'income' | 'expense';
  priority?: 'high' | 'medium' | 'low';
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
```

---

## 🔌 API Endpoints

### 1. Daily Notebook Management

#### Get/Create Daily Notebook
```http
GET /api/businesses/{businessId}/daily-notebook/{year}/{month}
POST /api/businesses/{businessId}/daily-notebook/{year}/{month}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    notebook: DailyNotebook;
  };
  error?: string;
}
```

#### Update Daily Entries
```http
PUT /api/businesses/{businessId}/daily-notebook/{year}/{month}/entries
```

**Request Body:**
```typescript
{
  entries: {
    [day: number]: {
      [columnId: string]: number;
    };
  };
}
```

### 2. Revenue Columns Management

#### Get All Columns
```http
GET /api/businesses/{businessId}/revenue-columns
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    columns: RevenueColumn[];
  };
  error?: string;
}
```

#### Create New Column
```http
POST /api/businesses/{businessId}/revenue-columns
```

**Request Body:**
```typescript
{
  name: string;
  type: 'income' | 'expense';
  priority?: 'high' | 'medium' | 'low';
  visible?: boolean;
  sortOrder?: number;
}
```

#### Update Column
```http
PUT /api/businesses/{businessId}/revenue-columns/{columnId}
```

#### Delete Column
```http
DELETE /api/businesses/{businessId}/revenue-columns/{columnId}
```

### 3. Appointment Revenue Integration

#### Get Appointment Revenue for Month
```http
GET /api/businesses/{businessId}/appointment-revenue/{year}/{month}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    appointmentRevenue: MonthlyData;
  };
  error?: string;
}
```

---

## 🔄 Business Logic Implementation

### 1. Default Columns Setup

When a business first creates a daily notebook, automatically create these default columns:

```typescript
const defaultColumns = [
  {
    name: 'Randevular',
    type: 'income' as const,
    priority: 'high' as const,
    visible: true,
    sortOrder: 1
  },
  {
    name: 'Satış',
    type: 'income' as const,
    priority: 'medium' as const,
    visible: true,
    sortOrder: 2
  },
  {
    name: 'Kira',
    type: 'expense' as const,
    priority: 'medium' as const,
    visible: true,
    sortOrder: 3
  }
];
```

### 2. Appointment Revenue Calculation

```typescript
async function calculateAppointmentRevenue(businessId: string, year: number, month: number): Promise<MonthlyData> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const appointments = await getCompletedAppointments(businessId, startDate, endDate);
  
  const dailyRevenue: MonthlyData = {};
  
  appointments.forEach(appointment => {
    const appointmentDate = new Date(appointment.date);
    const day = appointmentDate.getDate();
    
    if (!dailyRevenue[day]) {
      dailyRevenue[day] = {};
    }
    
    const currentAmount = dailyRevenue[day]['appointments'] || 0;
    dailyRevenue[day]['appointments'] = currentAmount + appointment.price;
  });
  
  return dailyRevenue;
}
```

### 3. Daily Total Calculation

```typescript
function calculateDailyTotal(day: number, columns: RevenueColumn[], monthlyData: MonthlyData, appointmentRevenue: MonthlyData): number {
  return columns
    .filter(col => col.visible)
    .reduce((total, col) => {
      let value = monthlyData[day]?.[col.id] || 0;
      
      // Special handling for appointments column
      if (col.name === 'Randevular') {
        const manualValue = monthlyData[day]?.[col.id] || 0;
        const appointmentValue = appointmentRevenue[day]?.[col.id] || 0;
        value = manualValue + appointmentValue;
      }
      
      return total + (col.type === 'income' ? value : -value);
    }, 0);
}
```

### 4. Column Totals Calculation

```typescript
function calculateColumnTotals(columns: RevenueColumn[], monthlyData: MonthlyData, appointmentRevenue: MonthlyData): { [columnId: string]: number } {
  const totals: { [columnId: string]: number } = {};
  
  columns.forEach(col => {
    let total = 0;
    
    for (let day = 1; day <= 31; day++) {
      let value = monthlyData[day]?.[col.id] || 0;
      
      // Special handling for appointments column
      if (col.name === 'Randevular') {
        const manualValue = monthlyData[day]?.[col.id] || 0;
        const appointmentValue = appointmentRevenue[day]?.[col.id] || 0;
        value = manualValue + appointmentValue;
      }
      
      total += value;
    }
    
    totals[col.id] = total;
  });
  
  return totals;
}
```

---

## 🔐 Security & Validation

### 1. Access Control

```typescript
// Middleware to check business ownership
async function validateBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  const business = await getBusinessById(businessId);
  return business && business.ownerId === userId;
}
```

### 2. Data Validation

```typescript
const revenueColumnSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100
  },
  type: {
    type: 'string',
    required: true,
    enum: ['income', 'expense']
  },
  priority: {
    type: 'string',
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  visible: {
    type: 'boolean',
    default: true
  },
  sortOrder: {
    type: 'number',
    min: 0,
    default: 0
  }
};

const dailyEntrySchema = {
  day: {
    type: 'number',
    required: true,
    min: 1,
    max: 31
  },
  amount: {
    type: 'number',
    required: true,
    min: 0
  }
};
```

### 3. Rate Limiting

```typescript
// Rate limiting for daily entry updates
const dailyEntryRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 updates per window per business
  message: 'Too many daily entry updates, please try again later'
};
```

---

## 📱 Mobile Optimization

### 1. Column Visibility Logic

```typescript
function getMobileColumns(columns: RevenueColumn[]): RevenueColumn[] {
  const visible = columns.filter(col => col.visible);
  
  if (visible.length <= 4) {
    return visible;
  }
  
  // Show high priority columns + up to 3 others
  const highPriority = visible.filter(col => col.priority === 'high');
  const others = visible.filter(col => col.priority !== 'high');
  
  return [...highPriority, ...others.slice(0, 3)];
}
```

### 2. Card View Data Structure

```typescript
interface CardViewData {
  day: number;
  total: number;
  columns: {
    id: string;
    name: string;
    type: 'income' | 'expense';
    value: number;
  }[];
  hiddenColumnsCount: number;
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core CRUD Operations
- [ ] Database schema creation
- [ ] Basic API endpoints for columns and entries
- [ ] Data validation and security
- [ ] Basic calculations

### Phase 2: Appointment Integration
- [ ] Appointment revenue calculation
- [ ] Real-time updates when appointments change
- [ ] Special handling for "Randevular" column

### Phase 3: Advanced Features
- [ ] Column visibility management
- [ ] Mobile optimization
- [ ] Caching for performance
- [ ] Bulk operations

### Phase 4: Analytics & Reporting
- [ ] Monthly/yearly summaries
- [ ] Export functionality
- [ ] Advanced filtering and sorting
- [ ] Integration with existing reports

---

## 🔧 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/randevubu

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=300
```

---

## 📊 Example API Usage

### Creating a New Column
```bash
curl -X POST /api/businesses/123e4567-e89b-12d3-a456-426614174000/revenue-columns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "name": "Maaş",
    "type": "expense",
    "priority": "high",
    "visible": true
  }'
```

### Updating Daily Entries
```bash
curl -X PUT /api/businesses/123e4567-e89b-12d3-a456-426614174000/daily-notebook/2024/10/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "entries": {
      "1": {
        "column-1": 1500,
        "column-2": 200
      },
      "2": {
        "column-1": 2000,
        "column-2": 200
      }
    }
  }'
```

---

## 🎯 Key Features Summary

- ✅ **Excel-like Interface**: Familiar spreadsheet experience
- ✅ **Real-time Calculations**: Automatic totals and summaries
- ✅ **Appointment Integration**: Auto-calculated appointment revenue
- ✅ **Mobile Optimized**: Card and table views for different screen sizes
- ✅ **Column Management**: Add, remove, hide/show columns
- ✅ **Priority System**: Control which columns show on mobile
- ✅ **Data Persistence**: All data saved to database
- ✅ **Security**: Business-level access control
- ✅ **Performance**: Optimized queries and caching

This system provides a complete financial tracking solution that integrates seamlessly with your existing appointment system! 💰📊
