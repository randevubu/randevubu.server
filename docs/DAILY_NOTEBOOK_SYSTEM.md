# 📒 Daily Notebook System - Complete Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Business Logic](#business-logic)
- [Integration Guide](#integration-guide)
- [Example Usage](#example-usage)
- [Security](#security)

---

## 🎯 Overview

The **Daily Notebook System** (Günlük Defterim) is a comprehensive financial tracking feature that allows businesses to record and monitor their daily income and expenses in an Excel-like interface. 

### 🌟 **Automatic Appointment Revenue - The Killer Feature!**

**The system AUTOMATICALLY adds a "Randevular" (Appointments) column** that displays revenue from all **COMPLETED appointments**. This means:

- 📅 **Zero Manual Entry Required** - As soon as an appointment is marked as "COMPLETED", its revenue appears in the notebook
- 💰 **Real-Time Revenue Tracking** - See exactly how much you earned from appointments each day
- 🔒 **Protected System Column** - Cannot be deleted or renamed (but can be supplemented with manual entries)
- 📊 **Automatic Daily Totals** - Appointment revenue is automatically included in all calculations

**Real-World Example**: 

On October 15th, you have these appointments:
```
🟢 Completed: 500₺  (9:00 AM - Haircut - Customer paid)
🟢 Completed: 750₺  (11:00 AM - Color - Customer paid)
🟡 Confirmed: 600₺  (2:00 PM - Still upcoming, not completed yet)
🟢 Completed: 1,200₺ (3:30 PM - Treatment - Customer paid)
🔴 Canceled: 400₺  (Customer canceled)
```

**Result in Daily Notebook:**
- Day 15, "Randevular" column = **2,450₺** (500 + 750 + 1,200)
- The 600₺ confirmed appointment is NOT counted (not completed yet)
- The 400₺ canceled appointment is NOT counted (was canceled)
- **Zero manual entry required!** ✨

### Key Capabilities
- ✅ **Automatic Appointment Revenue Integration** - COMPLETED appointments automatically appear in the notebook
- ✅ **Custom Income/Expense Columns** - Unlimited flexibility to add custom categories
- ✅ **Real-Time Calculations** - All totals calculated automatically
- ✅ **Excel-Like Interface** - Familiar spreadsheet experience for users
- ✅ **Mobile Optimized** - Column priority system for small screens
- ✅ **Secure Access Control** - Business ownership verification on all operations

---

## ⭐ Features

### 1. Automatic Appointment Revenue ⭐ **PRIMARY FEATURE**

**The "Randevular" (Appointments) Column is Automatically Created and Populated!**

When a business first accesses the Daily Notebook, the system automatically:
1. ✅ **Creates the "Randevular" column** as the FIRST column (HIGH priority)
2. ✅ **Fetches all COMPLETED appointments** for the selected month
3. ✅ **Calculates daily revenue** by summing appointment prices per day
4. ✅ **Displays the totals** automatically in the notebook

**How It Works:**
```typescript
// System automatically queries:
SELECT 
  EXTRACT(DAY FROM date) as day,
  SUM(price) as revenue
FROM appointments
WHERE 
  business_id = 'your_business_id'
  AND status = 'COMPLETED'        // ← Only COMPLETED appointments!
  AND date >= '2024-10-01'        // Start of selected month
  AND date <= '2024-10-31'        // End of selected month
GROUP BY EXTRACT(DAY FROM date)
```

**Column Properties:**
- 🔒 **System Column** (`isSystem: true`) - Cannot be deleted or renamed
- 🎯 **HIGH Priority** - Always shows on mobile
- 📊 **Sort Order: 1** - Appears as the first column
- 👁️ **Always Visible** - Cannot be hidden
- ✏️ **Supplementable** - Users can add manual entries if needed (added on top of automatic revenue)

**Real-World Example:**
- **Day 1**: 2 completed appointments (500₺ + 800₺) = **1,300₺** automatically shown
- **Day 2**: 3 completed appointments (600₺ + 900₺ + 1,100₺) = **2,600₺** automatically shown
- **Day 3**: No completed appointments = **0₺** shown (or manual entry if added)
- **Day 15**: 5 completed appointments = Automatic total shown

**Important Notes:**
- ⚠️ Only appointments with `status: "COMPLETED"` are included
- ⚠️ Appointments with `status: "CONFIRMED"`, `"CANCELED"`, `"NO_SHOW"` are NOT included
- ⚠️ The revenue updates in real-time as appointments change status
- ✅ Users can still add manual entries to this column (e.g., for cash payments not booked through system)

### 2. Custom Revenue Columns
Businesses can create unlimited custom columns for tracking:
- **Income Sources**: Product sales, services, tips, etc.
- **Expense Categories**: Rent, salaries, utilities, supplies, etc.

Each column has:
- **Type**: INCOME or EXPENSE
- **Priority**: HIGH, MEDIUM, or LOW (for mobile display)
- **Visibility**: Show/hide columns
- **Sort Order**: Custom ordering
- **System Flag**: Protected system columns

### 3. Real-Time Calculations
The system automatically calculates:
- **Daily Totals**: Net income/loss for each day (income - expenses)
- **Column Totals**: Sum of all entries in each column for the month
- **Grand Total**: Overall net income/loss for the month
- **Income Total**: Total of all income columns
- **Expense Total**: Total of all expense columns

### 4. Default Columns - Auto-Created on First Access

When a business accesses the Daily Notebook for the **first time**, the system automatically creates these 4 default columns:

| # | Column Name | Type | Priority | System | Auto-Populated | Description |
|---|-------------|------|----------|--------|----------------|-------------|
| 1 | **Randevular** (Appointments) | INCOME | HIGH | ✅ Yes | ✅ **YES - From COMPLETED Appointments** | Shows daily revenue from completed appointments automatically |
| 2 | **Diğer Gelir** (Other Income) | INCOME | MEDIUM | ❌ No | ❌ Manual entry only | For tracking other income sources |
| 3 | **Kira** (Rent) | EXPENSE | MEDIUM | ❌ No | ❌ Manual entry only | For tracking rent expenses |
| 4 | **Maaşlar** (Salaries) | EXPENSE | MEDIUM | ❌ No | ❌ Manual entry only | For tracking salary expenses |

**Key Differences:**
- 🤖 **"Randevular" is SPECIAL**: It's the ONLY column that auto-populates with data from your appointment system
- 📝 **Other columns are manual**: Users need to enter amounts for other income/expense categories
- 🔒 **"Randevular" is protected**: Cannot be deleted (System column)
- ✏️ **Others can be modified/deleted**: Full control over custom columns

**What Happens on First Access:**
```typescript
// Automatically executed when first accessing the notebook:
1. Create "Randevular" column (System, HIGH priority)
2. Fetch COMPLETED appointments for the month
3. Calculate daily revenue totals
4. Display in the notebook automatically
5. Create other 3 default columns for manual entry
```

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│                Daily Notebook UI                     │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────┐
│              API Routes Layer                        │
│         /api/v1/businesses/:id/...                   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│           DailyNotebookController                    │
│    - Request validation                              │
│    - Error handling                                  │
│    - Response formatting                             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│          DailyNotebookService                        │
│    - Business logic                                  │
│    - Calculations (totals, etc.)                     │
│    - Default column initialization                   │
│    - Access control                                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         DailyNotebookRepository                      │
│    - Database operations (Prisma)                    │
│    - Appointment revenue calculation                 │
│    - CRUD operations                                 │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              PostgreSQL Database                     │
│    - business_daily_notebooks                        │
│    - revenue_columns                                 │
│    - daily_entries                                   │
│    - appointments (for revenue)                      │
└──────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── types/
│   └── dailyNotebook.ts              # TypeScript interfaces
├── repositories/
│   └── dailyNotebookRepository.ts    # Database operations
├── services/
│   └── domain/
│       └── dailyNotebook/
│           ├── index.ts
│           └── dailyNotebookService.ts # Business logic
├── controllers/
│   └── dailyNotebookController.ts    # HTTP request handlers
└── routes/
    └── v1/
        └── dailyNotebook.ts          # API route definitions

prisma/
├── schema.prisma                     # Database schema
└── migrations/
    └── 20251020120000_add_daily_notebook_tables/
        └── migration.sql             # Migration SQL
```

---

## 🗄️ Database Schema

### Tables

#### 1. business_daily_notebooks
Stores one notebook per business per month.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique identifier |
| businessId | TEXT (FK) | References businesses(id) |
| year | INTEGER | Year (e.g., 2024) |
| month | INTEGER | Month (1-12) |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Unique Constraint**: `(businessId, year, month)`

#### 2. revenue_columns
Custom income/expense columns for each business.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique identifier |
| businessId | TEXT (FK) | References businesses(id) |
| name | TEXT | Column name (e.g., "Satış") |
| type | ENUM | INCOME or EXPENSE |
| priority | ENUM | HIGH, MEDIUM, or LOW |
| visible | BOOLEAN | Show/hide column |
| sortOrder | INTEGER | Display order |
| isSystem | BOOLEAN | Protected system column |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

#### 3. daily_entries
Individual cell values for each day/column combination.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique identifier |
| notebookId | TEXT (FK) | References business_daily_notebooks(id) |
| columnId | TEXT (FK) | References revenue_columns(id) |
| day | INTEGER | Day of month (1-31) |
| amount | DECIMAL(10,2) | Entry amount |
| note | TEXT | Optional note |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Unique Constraint**: `(notebookId, columnId, day)`

### Relationships

```
businesses (1) ─────< (N) business_daily_notebooks
                     │
                     └───< (N) daily_entries >───┐
                                                   │
businesses (1) ─────< (N) revenue_columns ────────┘
```

---

## 🔌 API Endpoints

### Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

### Base URL
```
http://your-domain/api/v1
```

---

### 1. Get/Create Daily Notebook

**Endpoint**: `GET /businesses/:businessId/daily-notebook/:year/:month`

**Description**: Retrieves or creates a daily notebook for the specified month.

**Parameters**:
- `businessId` (path, required): Business ID
- `year` (path, required): Year (e.g., 2024)
- `month` (path, required): Month (1-12)

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Daily notebook retrieved successfully",
  "data": {
    "notebook": {
      "id": "notebook_123",
      "businessId": "business_456",
      "year": 2024,
      "month": 10,
      "columns": [
        {
          "id": "col_123",
          "businessId": "business_456",
          "name": "Randevular",
          "type": "INCOME",
          "priority": "HIGH",
          "visible": true,
          "sortOrder": 1,
          "isSystem": true,
          "createdAt": "2024-10-20T12:00:00Z",
          "updatedAt": "2024-10-20T12:00:00Z"
        }
      ],
      "monthlyData": {
        "1": {
          "col_123": 1500
        },
        "2": {
          "col_123": 2000
        }
      },
      "appointmentRevenue": {
        "1": 1200,
        "2": 1800
      },
      "totals": {
        "dailyTotals": {
          "1": 1500,
          "2": 2000
        },
        "columnTotals": {
          "col_123": 3500
        },
        "grandTotal": 3500,
        "incomeTotal": 3500,
        "expenseTotal": 0
      },
      "createdAt": "2024-10-20T12:00:00Z",
      "updatedAt": "2024-10-20T12:00:00Z"
    }
  }
}
```

---

### 2. Update Daily Entries (Bulk)

**Endpoint**: `PUT /businesses/:businessId/daily-notebook/:year/:month/entries`

**Description**: Updates multiple entries at once.

**Request Body**:
```json
{
  "entries": {
    "1": {
      "col_abc": 1500,
      "col_def": 200
    },
    "2": {
      "col_abc": 2000,
      "col_def": 250
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Daily entries updated successfully",
  "data": {
    "notebook": { /* updated notebook object */ }
  }
}
```

---

### 3. Update Single Entry

**Endpoint**: `PATCH /businesses/:businessId/daily-notebook/:year/:month/entries/single`

**Description**: Updates a single entry value.

**Request Body**:
```json
{
  "day": 15,
  "columnId": "col_abc",
  "amount": 1500,
  "note": "Optional note"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Entry updated successfully",
  "data": {
    "notebook": { /* updated notebook object */ }
  }
}
```

---

### 4. Get Revenue Columns

**Endpoint**: `GET /businesses/:businessId/revenue-columns`

**Description**: Retrieves all revenue columns for a business.

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Revenue columns retrieved successfully",
  "data": {
    "columns": [
      {
        "id": "col_123",
        "businessId": "business_456",
        "name": "Randevular",
        "type": "INCOME",
        "priority": "HIGH",
        "visible": true,
        "sortOrder": 1,
        "isSystem": true,
        "createdAt": "2024-10-20T12:00:00Z",
        "updatedAt": "2024-10-20T12:00:00Z"
      }
    ]
  }
}
```

---

### 5. Create Revenue Column

**Endpoint**: `POST /businesses/:businessId/revenue-columns`

**Description**: Creates a new income or expense column.

**Request Body**:
```json
{
  "name": "Ürün Satışı",
  "type": "INCOME",
  "priority": "HIGH",
  "visible": true,
  "sortOrder": 5
}
```

**Validation**:
- `name`: Required, 1-100 characters
- `type`: Required, must be "INCOME" or "EXPENSE"
- `priority`: Optional, must be "HIGH", "MEDIUM", or "LOW" (default: "MEDIUM")
- `visible`: Optional, boolean (default: true)
- `sortOrder`: Optional, integer (default: auto-generated)

**Response**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Revenue column created successfully",
  "data": {
    "column": {
      "id": "col_789",
      "businessId": "business_456",
      "name": "Ürün Satışı",
      "type": "INCOME",
      "priority": "HIGH",
      "visible": true,
      "sortOrder": 5,
      "isSystem": false,
      "createdAt": "2024-10-20T12:30:00Z",
      "updatedAt": "2024-10-20T12:30:00Z"
    }
  }
}
```

---

### 6. Update Revenue Column

**Endpoint**: `PUT /businesses/:businessId/revenue-columns/:columnId`

**Description**: Updates an existing revenue column.

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "type": "EXPENSE",
  "priority": "LOW",
  "visible": false,
  "sortOrder": 10
}
```

**Note**: System columns (isSystem: true) cannot have their name or type modified.

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Revenue column updated successfully",
  "data": {
    "column": { /* updated column object */ }
  }
}
```

---

### 7. Delete Revenue Column

**Endpoint**: `DELETE /businesses/:businessId/revenue-columns/:columnId`

**Description**: Deletes a revenue column and all associated entries.

**Note**: System columns cannot be deleted.

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Revenue column deleted successfully",
  "data": null
}
```

---

### 8. Get Appointment Revenue

**Endpoint**: `GET /businesses/:businessId/appointment-revenue/:year/:month`

**Description**: Retrieves appointment revenue breakdown for a specific month.

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Appointment revenue retrieved successfully",
  "data": {
    "appointmentRevenue": {
      "1": 1200,
      "2": 1800,
      "3": 2100,
      "15": 2500
    }
  }
}
```

---

## 💼 Business Logic

### Appointment Revenue Calculation - How It Works Under the Hood

The system **AUTOMATICALLY** calculates appointment revenue by:

#### Step 1: Filter COMPLETED Appointments Only
```typescript
// Only these appointments are counted:
✅ status: "COMPLETED"

// These are EXCLUDED:
❌ status: "CONFIRMED" (future/upcoming appointments)
❌ status: "CANCELED" (canceled appointments)
❌ status: "NO_SHOW" (customer didn't show up)
❌ status: "IN_PROGRESS" (currently ongoing)
```

#### Step 2: Group by Day of Month
Revenue is summed by the day number (1-31) for the selected month.

#### Step 3: Automatic Real-Time Integration
Every time the notebook is loaded, the system:
1. Queries the appointments table
2. Calculates totals per day
3. Displays in the "Randevular" column
4. Includes in all total calculations

**Complete SQL Logic:**
```sql
SELECT 
  EXTRACT(DAY FROM date) as day,
  SUM(price) as revenue
FROM appointments
WHERE 
  business_id = $businessId
  AND status = 'COMPLETED'           -- ⭐ CRITICAL: Only completed!
  AND date >= $monthStart             -- e.g., '2024-10-01'
  AND date <= $monthEnd               -- e.g., '2024-10-31'
GROUP BY EXTRACT(DAY FROM date)
ORDER BY day ASC
```

**Repository Method:**
```typescript
// From: src/repositories/dailyNotebookRepository.ts
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
      status: 'COMPLETED',    // ⭐ Only COMPLETED appointments
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: {
      price: true
    }
  });

  // Convert to day-based object: { 1: 1200, 2: 1800, ... }
  const revenueByDay: { [day: number]: number } = {};
  appointments.forEach(appointment => {
    const day = appointment.date.getDate();
    revenueByDay[day] = Number(appointment._sum.price || 0);
  });

  return revenueByDay;
}
```

**Example Output:**
```json
{
  "1": 1200,      // Day 1: 1,200₺ from completed appointments
  "2": 1800,      // Day 2: 1,800₺ from completed appointments
  "3": 0,         // Day 3: No completed appointments
  "15": 2500,     // Day 15: 2,500₺ from completed appointments
  "31": 3200      // Day 31: 3,200₺ from completed appointments
}
```

### Total Calculations

#### Daily Total Calculation
```typescript
dailyTotal = Σ(visible_income_columns) - Σ(visible_expense_columns)
```

**For the "Randevular" column specifically:**
```typescript
// Special handling: Combines manual entries with automatic appointment revenue
randevularValue = (manualEntry || 0) + (automaticAppointmentRevenue || 0)

// Example:
// - Automatic appointment revenue: 2,000₺ (from COMPLETED appointments)
// - Manual entry added by user: 500₺ (cash payment)
// - Total shown in column: 2,500₺
```

**Why This Matters:**
- Users can add manual entries to the "Randevular" column if they receive cash payments or tips not tracked in the system
- The automatic appointment revenue is ALWAYS added, even if there's a manual entry
- Both values are summed together for the total

#### Column Total Calculation
```typescript
columnTotal = Σ(all_entries_in_column_for_month)
```

#### Grand Total Calculation
```typescript
grandTotal = totalIncome - totalExpense
```

### Access Control

Every operation verifies:
```typescript
// User must be either:
// 1. Business owner
// 2. Active staff member with OWNER or MANAGER role

const hasAccess = await verifyBusinessOwnership(businessId, userId);
if (!hasAccess) {
  throw new Error('Access denied');
}
```

---

## 🔗 Integration Guide

### Frontend Integration

#### 1. Fetching the Notebook

```typescript
import axios from 'axios';

const fetchNotebook = async (businessId: string, year: number, month: number) => {
  try {
    const response = await axios.get(
      `/api/v1/businesses/${businessId}/daily-notebook/${year}/${month}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data.data.notebook;
  } catch (error) {
    console.error('Failed to fetch notebook:', error);
  }
};
```

#### 2. Updating Entries

```typescript
const updateEntry = async (
  businessId: string,
  year: number,
  month: number,
  day: number,
  columnId: string,
  amount: number
) => {
  try {
    const response = await axios.patch(
      `/api/v1/businesses/${businessId}/daily-notebook/${year}/${month}/entries/single`,
      {
        day,
        columnId,
        amount
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data.data.notebook;
  } catch (error) {
    console.error('Failed to update entry:', error);
  }
};
```

#### 3. Creating Custom Columns

```typescript
const createColumn = async (
  businessId: string,
  name: string,
  type: 'INCOME' | 'EXPENSE',
  priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
) => {
  try {
    const response = await axios.post(
      `/api/v1/businesses/${businessId}/revenue-columns`,
      {
        name,
        type,
        priority,
        visible: true
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data.data.column;
  } catch (error) {
    console.error('Failed to create column:', error);
  }
};
```

---

## 📝 Example Usage

### Complete Workflow Example

```typescript
// 1. Initialize notebook for October 2024
const notebook = await fetchNotebook('business_123', 2024, 10);

// 2. Create custom columns
await createColumn('business_123', 'Ürün Satışı', 'INCOME', 'HIGH');
await createColumn('business_123', 'Elektrik Faturası', 'EXPENSE', 'MEDIUM');

// 3. Update entries for day 15
await updateEntry('business_123', 2024, 10, 15, 'col_product_sales', 3500);
await updateEntry('business_123', 2024, 10, 15, 'col_electricity', 450);

// 4. Fetch updated notebook with calculations
const updatedNotebook = await fetchNotebook('business_123', 2024, 10);

// Result will include:
// - dailyTotals[15]: automatic calculation (income - expenses)
// - columnTotals: sum of all entries per column
// - grandTotal: overall net income/loss
// - appointmentRevenue[15]: auto-calculated from completed appointments
```

---

## 🔒 Security

### Access Control
- ✅ All endpoints require authentication
- ✅ Business ownership verification on every request
- ✅ Only business owners and managers can access notebooks
- ✅ Staff members without proper roles are denied access

### Data Validation
- ✅ Input validation on all requests
- ✅ Type checking (TypeScript)
- ✅ Range validation (day: 1-31, month: 1-12, etc.)
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection (sanitized inputs)

### Protected Operations
- ✅ System columns cannot be deleted
- ✅ System columns cannot have name/type modified
- ✅ Cascading deletes prevent orphaned data
- ✅ Unique constraints prevent duplicate entries

---

## 🎨 UI Recommendations

### Desktop View (Table Layout)
```
┌─────────┬────────────┬───────────┬──────────┬────────────┐
│   Day   │ Randevular │   Satış   │   Kira   │   Total    │
├─────────┼────────────┼───────────┼──────────┼────────────┤
│    1    │   1,200 ₺  │   500 ₺   │    0 ₺   │  1,700 ₺   │
│    2    │   1,800 ₺  │   750 ₺   │    0 ₺   │  2,550 ₺   │
│   15    │   2,100 ₺  │ 1,200 ₺   │ -500 ₺   │  2,800 ₺   │
├─────────┼────────────┼───────────┼──────────┼────────────┤
│  Total  │  45,000 ₺  │ 15,000 ₺  │-3,000 ₺  │ 57,000 ₺   │
└─────────┴────────────┴───────────┴──────────┴────────────┘
```

### Mobile View (Card Layout)
Display only HIGH priority columns, with option to show all.

```
┌──────────────────────────────┐
│       Day 15 - Tue           │
├──────────────────────────────┤
│  📅 Randevular:   2,100 ₺    │
│  💰 Net Total:    2,800 ₺    │
│  [Show 2 more columns...]    │
└──────────────────────────────┘
```

---

## 🚀 Performance Tips

1. **Caching**: Consider caching notebook data for 5-10 minutes
2. **Pagination**: For businesses with many columns, implement column pagination
3. **Lazy Loading**: Load appointment revenue separately if needed
4. **Debouncing**: Debounce entry updates to reduce API calls
5. **Batch Updates**: Use bulk update endpoint for multiple entries

---

## 📊 Analytics Integration

The Daily Notebook data can be integrated with your existing reports system:

```typescript
// Example: Get financial summary
const financialReport = {
  month: notebook.month,
  year: notebook.year,
  totalRevenue: notebook.totals.incomeTotal,
  totalExpenses: notebook.totals.expenseTotal,
  netProfit: notebook.totals.grandTotal,
  appointmentRevenue: Object.values(notebook.appointmentRevenue)
    .reduce((sum, val) => sum + val, 0),
  otherRevenue: notebook.totals.incomeTotal - appointmentRevenueTotal
};
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Access denied" error
- **Solution**: Verify user is business owner or active manager

**Issue**: Appointment revenue not showing
- **Solution**: Ensure appointments have status: "COMPLETED"

**Issue**: Totals not calculating
- **Solution**: Check that columns are marked as visible: true

**Issue**: Cannot delete column
- **Solution**: System columns (isSystem: true) cannot be deleted

---

## 📚 Additional Resources

- **API Documentation**: `/api/v1/docs` (Swagger UI)
- **Database Schema**: `prisma/schema.prisma`
- **Migration Files**: `prisma/migrations/20251020120000_add_daily_notebook_tables/`
- **Source Code**: `src/services/domain/dailyNotebook/`

---

## 🎯 Future Enhancements

Potential features for future development:
- 📊 Export to Excel/PDF
- 📈 Trend analysis and forecasting
- 🔔 Budget alerts and notifications
- 📱 Offline mode support
- 🔄 Multi-currency support
- 📅 Recurring entries
- 🏷️ Tags and categories
- 📊 Visual charts and graphs

---

## ✅ Conclusion

The Daily Notebook System provides a complete financial tracking solution that seamlessly integrates with your existing appointment system. With automatic revenue calculation, flexible custom columns, and real-time totals, it offers businesses powerful tools to monitor their financial health on a daily basis.

For questions or support, please contact the development team.

**Version**: 1.0.0  
**Last Updated**: October 20, 2024  
**Status**: ✅ Production Ready

