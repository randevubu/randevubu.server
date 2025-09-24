# Frontend Implementation Guide: Appointment Booking for Customers

## Overview

This guide explains how to implement the new appointment booking feature that allows business owners/staff to create appointments on behalf of their customers.

## API Changes

### Enhanced Endpoint: `POST /api/v1/appointments/`

**New Request Schema:**
```json
{
  "businessId": "string (required)",
  "serviceId": "string (required)",
  "staffId": "string (required)",
  "customerId": "string (optional)", // 🆕 NEW FIELD
  "date": "YYYY-MM-DD (required)",
  "startTime": "HH:MM (required)",
  "customerNotes": "string (optional)"
}
```

**Behavior:**
- If `customerId` is **not provided**: Creates appointment for the authenticated user (existing behavior)
- If `customerId` is **provided**: Creates appointment for the specified customer (requires permissions)

## Frontend Implementation

### 1. User Permission Detection

First, determine if the current user can book for others:

```javascript
// Check if user has permission to book for customers
const canBookForOthers = async (businessId) => {
  try {
    // You can either:
    // A) Check user's roles/permissions from profile
    const userProfile = await getCurrentUser();
    const hasBusinessAccess = userProfile.roles?.some(role =>
      role.businessId === businessId &&
      ['OWNER', 'MANAGER', 'STAFF'].includes(role.name)
    );

    // B) Or make a test API call to check permissions
    return hasBusinessAccess;
  } catch (error) {
    return false;
  }
};
```

### 2. Customer Selection Component

Create a customer selector for business staff:

```jsx
// CustomerSelector.jsx
import React, { useState, useEffect } from 'react';

const CustomerSelector = ({ businessId, onCustomerSelect, disabled }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (businessId) {
      fetchBusinessCustomers();
    }
  }, [businessId]);

  const fetchBusinessCustomers = async () => {
    try {
      // Fetch customers who have had appointments at this business
      const response = await fetch(`/api/v1/businesses/${businessId}/customers`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    `${customer.firstName} ${customer.lastName}`.toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    customer.phoneNumber.includes(searchTerm)
  );

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    onCustomerSelect(customer);
  };

  return (
    <div className="customer-selector">
      <label>Book for Customer (optional)</label>

      {/* Option to book for self */}
      <div className="customer-option">
        <input
          type="radio"
          name="customer"
          value="self"
          checked={!selectedCustomer}
          onChange={() => handleCustomerSelect(null)}
          disabled={disabled}
        />
        <label>Book for myself</label>
      </div>

      {/* Customer search */}
      <div className="customer-search">
        <input
          type="text"
          placeholder="Search customers by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Customer list */}
      <div className="customer-list">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="customer-option">
            <input
              type="radio"
              name="customer"
              value={customer.id}
              checked={selectedCustomer?.id === customer.id}
              onChange={() => handleCustomerSelect(customer)}
              disabled={disabled}
            />
            <label>
              <div className="customer-info">
                <span className="customer-name">
                  {customer.firstName} {customer.lastName}
                </span>
                <span className="customer-phone">
                  {customer.phoneNumber}
                </span>
              </div>
            </label>
          </div>
        ))}
      </div>

      {searchTerm && filteredCustomers.length === 0 && (
        <div className="no-customers">
          No customers found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
```

### 3. Enhanced Appointment Booking Form

Update your appointment booking form:

```jsx
// AppointmentBookingForm.jsx
import React, { useState, useEffect } from 'react';
import CustomerSelector from './CustomerSelector';

const AppointmentBookingForm = ({ businessId, onSuccess }) => {
  const [canBookForOthers, setCanBookForOthers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    businessId,
    serviceId: '',
    staffId: '',
    date: '',
    startTime: '',
    customerNotes: ''
  });

  useEffect(() => {
    checkPermissions();
  }, [businessId]);

  const checkPermissions = async () => {
    const hasPermission = await canBookForOthers(businessId);
    setCanBookForOthers(hasPermission);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const appointmentData = {
        ...formData,
        // Include customerId only if booking for someone else
        ...(selectedCustomer && { customerId: selectedCustomer.id })
      };

      const response = await fetch('/api/v1/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(appointmentData)
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.data);
        // Show success message
        const customerName = selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : 'you';
        alert(`Appointment created successfully for ${customerName}!`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`Failed to create appointment: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="appointment-form">
      <h2>Book Appointment</h2>

      {/* Show customer selector only if user has permissions */}
      {canBookForOthers && (
        <CustomerSelector
          businessId={businessId}
          onCustomerSelect={setSelectedCustomer}
          disabled={false}
        />
      )}

      {/* Rest of your form fields */}
      <div className="form-group">
        <label>Service</label>
        <select
          value={formData.serviceId}
          onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
          required
        >
          <option value="">Select a service</option>
          {/* Your service options */}
        </select>
      </div>

      <div className="form-group">
        <label>Staff Member</label>
        <select
          value={formData.staffId}
          onChange={(e) => setFormData({...formData, staffId: e.target.value})}
          required
        >
          <option value="">Select staff member</option>
          {/* Your staff options */}
        </select>
      </div>

      <div className="form-group">
        <label>Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>Time</label>
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => setFormData({...formData, startTime: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={formData.customerNotes}
          onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
          placeholder={selectedCustomer ? "Notes for this customer..." : "Your notes..."}
          maxLength={500}
        />
      </div>

      <button type="submit" className="submit-btn">
        {selectedCustomer
          ? `Book for ${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : 'Book Appointment'
        }
      </button>
    </form>
  );
};

export default AppointmentBookingForm;
```

### 4. Error Handling

Handle specific error cases:

```javascript
// Error handling for appointment creation
const handleAppointmentError = (error) => {
  const errorMessages = {
    'You do not have permission to create appointments for other customers':
      'You need manager/staff permissions to book for customers.',
    'Customer not found':
      'The selected customer no longer exists.',
    'Customer account is not active':
      'This customer account is disabled.',
    'Customer is banned':
      'This customer is currently banned from booking.',
    'Staff member is not available at the selected time':
      'Please choose a different time slot.'
  };

  const userFriendlyMessage = errorMessages[error.message] || error.message;

  // Show appropriate UI feedback
  showErrorToast(userFriendlyMessage);
};
```

### 5. UI/UX Considerations

**Visual Indicators:**
```css
/* Styling suggestions */
.customer-selector {
  border: 2px dashed #e0e0e0;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.booking-for-other {
  background-color: #f8f9fa;
  border-left: 4px solid #007bff;
}

.customer-option {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.customer-option:hover {
  background-color: #f5f5f5;
}

.customer-info {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
}

.customer-name {
  font-weight: 500;
}

.customer-phone {
  font-size: 0.9em;
  color: #666;
}
```

## Additional API Endpoints Needed

You may want to implement these endpoints for better UX:

```javascript
// Get customers who have appointments at this business
GET /api/v1/businesses/{businessId}/customers

// Search customers (for larger customer bases)
GET /api/v1/businesses/{businessId}/customers/search?q={searchTerm}
```

## Testing Scenarios

Test these scenarios in your frontend:

1. **Business Owner/Staff:**
   - Can see customer selector
   - Can book for themselves
   - Can book for existing customers
   - Gets proper error messages for invalid customers

2. **Regular Customer:**
   - Cannot see customer selector
   - Can only book for themselves
   - Normal booking flow unchanged

3. **Edge Cases:**
   - Booking for banned customers
   - Booking for inactive customers
   - Network errors during customer search

## Implementation Priority

1. **Phase 1**: Basic customer selection for business staff
2. **Phase 2**: Customer search and filtering
3. **Phase 3**: Advanced features (customer creation, quick booking)

This implementation maintains backward compatibility while adding powerful new functionality for business owners and staff.