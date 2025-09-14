# Business Hours API Guide

This guide explains the comprehensive business hours management system that has been implemented for the appointment booking platform. The system allows each business to have their own operating hours with support for regular hours, breaks, and special overrides.

## Overview

The business hours system provides:
- **Regular Business Hours**: Set operating hours for each day of the week
- **Break Periods**: Define lunch breaks or other closed periods during business hours
- **Special Overrides**: Override regular hours for specific dates (holidays, special events, etc.)
- **Recurring Overrides**: Set up recurring special hours (e.g., every Sunday closed)
- **Timezone Support**: Handle different timezones for global businesses
- **Public Status API**: Allow customers to check if a business is open

## Database Schema

### Business Model
The `Business` model includes a `businessHours` JSON field that stores the regular operating hours:

```json
{
  "monday": {
    "isOpen": true,
    "openTime": "09:00",
    "closeTime": "18:00",
    "breaks": [
      {
        "startTime": "12:00",
        "endTime": "13:00",
        "description": "Lunch break"
      }
    ]
  },
  "tuesday": {
    "isOpen": true,
    "openTime": "09:00",
    "closeTime": "18:00"
  },
  "sunday": {
    "isOpen": false
  }
}
```

### BusinessHoursOverride Model
Special overrides are stored in a separate table:

```sql
CREATE TABLE business_hours_overrides (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  date DATE NOT NULL,
  is_open BOOLEAN NOT NULL,
  open_time TEXT,
  close_time TEXT,
  breaks JSON,
  reason TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, date)
);
```

## API Endpoints

### 1. Get Business Hours
**GET** `/api/v1/businesses/{businessId}/hours`

Retrieve the regular business hours for a specific business.

**Authentication**: Required (business owner/staff or admin)

**Response**:
```json
{
  "success": true,
  "data": {
    "businessHours": {
      "monday": {
        "isOpen": true,
        "openTime": "09:00",
        "closeTime": "18:00",
        "breaks": []
      },
      "tuesday": {
        "isOpen": true,
        "openTime": "09:00",
        "closeTime": "18:00"
      }
    }
  },
  "message": "Business hours retrieved successfully"
}
```

### 2. Update Business Hours
**PUT** `/api/v1/businesses/{businessId}/hours`

Update the regular business hours for a business.

**Authentication**: Required (business owner/staff or admin)

**Request Body**:
```json
{
  "businessHours": {
    "monday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00",
      "breaks": [
        {
          "startTime": "12:00",
          "endTime": "13:00",
          "description": "Lunch break"
        }
      ]
    },
    "tuesday": {
      "isOpen": true,
      "openTime": "09:00",
      "closeTime": "18:00"
    },
    "sunday": {
      "isOpen": false
    }
  }
}
```

### 3. Get Business Hours Status
**GET** `/api/v1/businesses/{businessId}/hours/status?date=2025-01-15&timezone=Europe/Istanbul`

Check if a business is open on a specific date. This is a **public endpoint** (no authentication required).

**Query Parameters**:
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)
- `timezone` (optional): Timezone override (defaults to business timezone)

**Response**:
```json
{
  "success": true,
  "data": {
    "businessId": "biz_123456789",
    "date": "2025-01-15",
    "isOpen": true,
    "openTime": "09:00",
    "closeTime": "18:00",
    "breaks": [
      {
        "startTime": "12:00",
        "endTime": "13:00",
        "description": "Lunch break"
      }
    ],
    "isOverride": false,
    "timezone": "Europe/Istanbul"
  },
  "message": "Business hours status retrieved successfully"
}
```

### 4. Create Business Hours Override
**POST** `/api/v1/businesses/{businessId}/hours/overrides`

Create a special override for a specific date.

**Authentication**: Required (business owner/staff or admin)

**Request Body**:
```json
{
  "date": "2025-12-25",
  "isOpen": false,
  "reason": "Christmas Day - Closed"
}
```

Or for special hours:
```json
{
  "date": "2025-12-24",
  "isOpen": true,
  "openTime": "10:00",
  "closeTime": "15:00",
  "reason": "Christmas Eve - Early closing"
}
```

### 5. Update Business Hours Override
**PUT** `/api/v1/businesses/{businessId}/hours/overrides/{date}`

Update an existing override.

**Authentication**: Required (business owner/staff or admin)

**Request Body**:
```json
{
  "isOpen": true,
  "openTime": "11:00",
  "closeTime": "16:00",
  "reason": "Updated Christmas Eve hours"
}
```

### 6. Delete Business Hours Override
**DELETE** `/api/v1/businesses/{businessId}/hours/overrides/{date}`

Remove a special override.

**Authentication**: Required (business owner/staff or admin)

### 7. Get Business Hours Overrides
**GET** `/api/v1/businesses/{businessId}/hours/overrides?startDate=2025-01-01&endDate=2025-01-31`

Retrieve all overrides for a date range.

**Authentication**: Required (business owner/staff or admin)

**Query Parameters**:
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "override_123456789",
      "businessId": "biz_123456789",
      "date": "2025-12-25",
      "isOpen": false,
      "reason": "Christmas Day - Closed",
      "isRecurring": false,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T10:00:00Z"
    }
  ],
  "message": "Business hours overrides retrieved successfully"
}
```

## Data Validation

### Time Format
All times must be in 24-hour format (HH:MM):
- Valid: `"09:00"`, `"18:30"`, `"23:59"`
- Invalid: `"9:00"`, `"6:30 PM"`, `"18:30:00"`

### Business Hours Validation
- If `isOpen` is `true`, both `openTime` and `closeTime` are required
- `openTime` must be before `closeTime`
- Break periods must be within business hours
- Maximum 5 breaks per day allowed

### Override Validation
- Date must be in YYYY-MM-DD format
- If `isOpen` is `true`, both `openTime` and `closeTime` are required
- Recurring patterns support YEARLY, MONTHLY, and WEEKLY frequencies

## Usage Examples

### Setting Up Regular Business Hours

```javascript
// Set up a beauty salon with lunch breaks
const businessHours = {
  monday: {
    isOpen: true,
    openTime: "09:00",
    closeTime: "18:00",
    breaks: [
      {
        startTime: "12:00",
        endTime: "13:00",
        description: "Lunch break"
      }
    ]
  },
  tuesday: {
    isOpen: true,
    openTime: "09:00",
    closeTime: "18:00",
    breaks: [
      {
        startTime: "12:00",
        endTime: "13:00",
        description: "Lunch break"
      }
    ]
  },
  // ... repeat for other weekdays
  sunday: {
    isOpen: false
  }
};

// Update business hours
await fetch('/api/v1/businesses/biz_123/hours', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ businessHours })
});
```

### Creating Holiday Overrides

```javascript
// Close for Christmas Day
await fetch('/api/v1/businesses/biz_123/hours/overrides', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: "2025-12-25",
    isOpen: false,
    reason: "Christmas Day - Closed"
  })
});

// Special hours for Christmas Eve
await fetch('/api/v1/businesses/biz_123/hours/overrides', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: "2025-12-24",
    isOpen: true,
    openTime: "10:00",
    closeTime: "15:00",
    reason: "Christmas Eve - Early closing"
  })
});
```

### Checking Business Status (Public)

```javascript
// Check if business is open today
const response = await fetch('/api/v1/businesses/biz_123/hours/status');
const status = await response.json();

if (status.data.isOpen) {
  console.log(`Business is open from ${status.data.openTime} to ${status.data.closeTime}`);
} else {
  console.log('Business is closed today');
}

// Check specific date
const response = await fetch('/api/v1/businesses/biz_123/hours/status?date=2025-12-25');
const status = await response.json();
```

## Integration with Appointment Booking

The business hours system integrates with the appointment booking system to:

1. **Validate Appointment Times**: Ensure appointments are only booked during business hours
2. **Respect Breaks**: Prevent appointments during break periods
3. **Handle Overrides**: Automatically apply special hours for holidays
4. **Timezone Handling**: Convert times to the business's timezone

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input data or validation errors
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Business or override not found
- `500 Internal Server Error`: Server-side errors

Example error response:
```json
{
  "success": false,
  "error": "Open time must be before close time"
}
```

## Best Practices

1. **Set Regular Hours First**: Always establish regular business hours before creating overrides
2. **Use Descriptive Reasons**: Provide clear reasons for overrides to help with record-keeping
3. **Plan Ahead**: Create holiday overrides well in advance
4. **Test Public Endpoints**: Verify that the status endpoint works correctly for customers
5. **Handle Timezones**: Be aware of timezone differences when setting hours for global businesses

## Website URL Auto-Generation

The system automatically generates website URLs for businesses in the format:
`https://randevubu.com/business/{business-slug}`

- **Automatic Generation**: Website URLs are generated automatically when creating or updating business names
- **No Manual Input**: The website field is not available for manual input in the API
- **Slug-Based**: URLs use the business slug (derived from the business name)
- **Unique URLs**: Each business gets a unique URL based on their slug
- **Auto-Update**: When business name changes, the website URL is automatically updated

Example:
- Business Name: "Hair & Beauty Salon"
- Generated Slug: "hair-beauty-salon"
- Website URL: "https://randevubu.com/business/hair-beauty-salon"

## Migration Notes

If you're upgrading from a system without business hours:

1. The `businessHours` field in the Business model is optional and can be `null`
2. Existing businesses will need to set up their hours through the API
3. The system gracefully handles missing business hours (treats as always closed)
4. No database migration is required as the schema already supports business hours
5. **Website URLs**: Existing businesses will have their website URLs automatically updated to the new format when their names are updated

This comprehensive business hours system provides the flexibility and reliability needed for a professional appointment booking platform.
