# Reservation Rules API Documentation

This document describes the API endpoints for managing business reservation rules settings in the RandevuBu system.

## Overview

The Reservation Rules system allows businesses to configure:
- **Maximum advance booking days** (Kaç Gün Öncesinden Randevu Alınabilir)
- **Minimum notification period** (Minimum Randevu Bildirimi Süresi)
- **Maximum daily appointments** (Aynı Gün İçin Maksimum Randevu Sayısı)

## Base URL
```
https://your-api-domain.com/api/v1
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Get Business Reservation Settings

Retrieves the current reservation settings for a business.

**Endpoint:** `GET /businesses/my-business/reservation-settings`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Example:**
```bash
curl -X GET \
  'https://your-api-domain.com/api/v1/businesses/my-business/reservation-settings' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

**Response Example (Success - 200):**
```json
{
  "success": true,
  "data": {
    "businessId": "bus_123456789",
    "maxAdvanceBookingDays": 7,
    "minNotificationHours": 2,
    "maxDailyAppointments": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T14:22:00.000Z"
  },
  "message": "Reservation settings retrieved successfully"
}
```

**Response Example (Default Settings - 200):**
```json
{
  "success": true,
  "data": {
    "businessId": "bus_123456789",
    "maxAdvanceBookingDays": 30,
    "minNotificationHours": 2,
    "maxDailyAppointments": 50,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Default reservation settings (not yet configured)"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Business context is required"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized access"
}
```

---

### 2. Update Business Reservation Settings

Updates the reservation settings for a business.

**Endpoint:** `PUT /businesses/my-business/reservation-settings`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body Schema:**
```typescript
{
  maxAdvanceBookingDays?: number;    // 1-365 days (optional)
  minNotificationHours?: number;     // 1-168 hours (optional)
  maxDailyAppointments?: number;     // 1-1000 appointments (optional)
}
```

**Request Example:**
```json
{
  "maxAdvanceBookingDays": 7,
  "minNotificationHours": 2,
  "maxDailyAppointments": 5
}
```

**cURL Example:**
```bash
curl -X PUT \
  'https://your-api-domain.com/api/v1/businesses/my-business/reservation-settings' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "maxAdvanceBookingDays": 7,
    "minNotificationHours": 2,
    "maxDailyAppointments": 5
  }'
```

**Response Example (Success - 200):**
```json
{
  "success": true,
  "data": {
    "businessId": "bus_123456789",
    "maxAdvanceBookingDays": 7,
    "minNotificationHours": 2,
    "maxDailyAppointments": 5,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T14:22:00.000Z"
  },
  "message": "Reservation settings updated successfully"
}
```

**Partial Update Example:**
```json
{
  "maxAdvanceBookingDays": 14
}
```

**Response for Partial Update:**
```json
{
  "success": true,
  "data": {
    "businessId": "bus_123456789",
    "maxAdvanceBookingDays": 14,
    "minNotificationHours": 2,        // Kept existing value
    "maxDailyAppointments": 50,      // Kept existing value
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T14:22:00.000Z"
  },
  "message": "Reservation settings updated successfully"
}
```

**Error Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": "Max advance booking days must be between 1 and 365"
}
```

**Error Response (400 - Business Context):**
```json
{
  "success": false,
  "error": "Business context is required"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized access"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "You do not have permission to edit this business"
}
```

---

## Validation Rules

### Field Validation

| Field | Type | Min | Max | Default | Description |
|-------|------|-----|-----|---------|-------------|
| `maxAdvanceBookingDays` | number | 1 | 365 | 30 | Maximum days in advance appointments can be booked |
| `minNotificationHours` | number | 1 | 168 | 2 | Minimum hours before appointment for notification |
| `maxDailyAppointments` | number | 1 | 1000 | 50 | Maximum number of appointments per day |

### Validation Error Messages

| Error | Message |
|-------|---------|
| `maxAdvanceBookingDays` too low | "Max advance booking days must be an integer" |
| `maxAdvanceBookingDays` too high | "Maximum advance booking is 365 days" |
| `minNotificationHours` too low | "Minimum notification period is 1 hour" |
| `minNotificationHours` too high | "Maximum notification period is 1 week (168 hours)" |
| `maxDailyAppointments` too low | "Minimum daily appointments is 1" |
| `maxDailyAppointments` too high | "Maximum daily appointments is 1000" |

---

## Frontend Integration Examples

### JavaScript/TypeScript

```typescript
// Types
interface ReservationSettings {
  businessId: string;
  maxAdvanceBookingDays: number;
  minNotificationHours: number;
  maxDailyAppointments: number;
  createdAt: string;
  updatedAt: string;
}

interface UpdateReservationSettingsRequest {
  maxAdvanceBookingDays?: number;
  minNotificationHours?: number;
  maxDailyAppointments?: number;
}

// API Service
class ReservationSettingsAPI {
  private baseURL = 'https://your-api-domain.com/api/v1';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getSettings(): Promise<ReservationSettings> {
    const response = await fetch(
      `${this.baseURL}/businesses/my-business/reservation-settings`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  }

  async updateSettings(settings: UpdateReservationSettingsRequest): Promise<ReservationSettings> {
    const response = await fetch(
      `${this.baseURL}/businesses/my-business/reservation-settings`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(settings)
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  }
}

// Usage Example
const api = new ReservationSettingsAPI('your-jwt-token');

// Get current settings
try {
  const settings = await api.getSettings();
  console.log('Current settings:', settings);
} catch (error) {
  console.error('Error fetching settings:', error);
}

// Update settings
try {
  const updatedSettings = await api.updateSettings({
    maxAdvanceBookingDays: 7,
    minNotificationHours: 2,
    maxDailyAppointments: 5
  });
  console.log('Updated settings:', updatedSettings);
} catch (error) {
  console.error('Error updating settings:', error);
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface UseReservationSettingsReturn {
  settings: ReservationSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (newSettings: UpdateReservationSettingsRequest) => Promise<void>;
}

export const useReservationSettings = (token: string): UseReservationSettingsReturn => {
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = new ReservationSettingsAPI(token);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  const updateSettings = async (newSettings: UpdateReservationSettingsRequest) => {
    try {
      setError(null);
      const updated = await api.updateSettings(newSettings);
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return { settings, loading, error, updateSettings };
};
```

### React Component Example

```tsx
import React from 'react';
import { useReservationSettings } from './hooks/useReservationSettings';

const ReservationSettingsForm: React.FC = () => {
  const { settings, loading, error, updateSettings } = useReservationSettings(
    localStorage.getItem('jwt-token') || ''
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await updateSettings({
        maxAdvanceBookingDays: parseInt(formData.get('maxAdvanceBookingDays') as string),
        minNotificationHours: parseInt(formData.get('minNotificationHours') as string),
        maxDailyAppointments: parseInt(formData.get('maxDailyAppointments') as string)
      });
      alert('Settings updated successfully!');
    } catch (err) {
      alert('Error updating settings');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="maxAdvanceBookingDays">
          Kaç Gün Öncesinden Randevu Alınabilir:
        </label>
        <select 
          name="maxAdvanceBookingDays" 
          defaultValue={settings?.maxAdvanceBookingDays || 30}
        >
          <option value="1">1 gün</option>
          <option value="3">3 gün</option>
          <option value="7">1 hafta</option>
          <option value="14">2 hafta</option>
          <option value="30">1 ay</option>
          <option value="90">3 ay</option>
        </select>
      </div>

      <div>
        <label htmlFor="minNotificationHours">
          Minimum Randevu Bildirimi Süresi:
        </label>
        <select 
          name="minNotificationHours" 
          defaultValue={settings?.minNotificationHours || 2}
        >
          <option value="1">1 saat önce</option>
          <option value="2">2 saat önce</option>
          <option value="4">4 saat önce</option>
          <option value="8">8 saat önce</option>
          <option value="24">1 gün önce</option>
        </select>
      </div>

      <div>
        <label htmlFor="maxDailyAppointments">
          Aynı Gün İçin Maksimum Randevu Sayısı:
        </label>
        <select 
          name="maxDailyAppointments" 
          defaultValue={settings?.maxDailyAppointments || 50}
        >
          <option value="5">5 randevu</option>
          <option value="10">10 randevu</option>
          <option value="20">20 randevu</option>
          <option value="50">50 randevu</option>
          <option value="100">100 randevu</option>
        </select>
      </div>

      <button type="submit">Kaydet</button>
    </form>
  );
};

export default ReservationSettingsForm;
```

---

## Error Handling

### Common Error Scenarios

1. **Authentication Errors (401)**
   - Token expired or invalid
   - No token provided

2. **Authorization Errors (403)**
   - User doesn't have permission to edit business settings
   - User is not a business owner or staff member

3. **Validation Errors (400)**
   - Invalid field values
   - Values outside allowed ranges

4. **Business Context Errors (400)**
   - No business context available
   - Business not found

### Error Response Format

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Security Notes

1. **Authentication Required**: All endpoints require valid JWT authentication
2. **Business Context**: User must have access to the business
3. **Permission Validation**: Only business owners and authorized staff can modify settings
4. **Input Validation**: All inputs are validated on the server side
5. **Rate Limiting**: API calls are subject to rate limiting

---

## Rate Limits

- **GET requests**: 100 requests per minute
- **PUT requests**: 10 requests per minute

---

## Support

For technical support or questions about the Reservation Rules API, please contact the development team or refer to the main API documentation.

