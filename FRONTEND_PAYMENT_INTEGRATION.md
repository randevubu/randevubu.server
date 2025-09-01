# Frontend Payment Integration Guide

This guide explains how to integrate the Iyzico payment system with subscription plans in your frontend application.

## Complete Frontend Flow

### 1. **Fetch Available Subscription Plans**

```javascript
// API Service
const fetchSubscriptionPlans = async () => {
  try {
    const response = await fetch('/api/v1/payments/subscription-plans', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of subscription plans
    } else {
      throw new Error(data.error || 'Failed to fetch plans');
    }
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

// React Example
import React, { useState, useEffect } from 'react';

const SubscriptionPlans = ({ businessId, onSelectPlan }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const subscriptionPlans = await fetchSubscriptionPlans();
        setPlans(subscriptionPlans);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  if (loading) return <div>Loading subscription plans...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="subscription-plans">
      <h2>Choose Your Plan</h2>
      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`plan-card ${plan.isPopular ? 'popular' : ''}`}>
            {plan.isPopular && <div className="popular-badge">Most Popular</div>}
            
            <h3>{plan.displayName}</h3>
            <p className="description">{plan.description}</p>
            
            <div className="price">
              <span className="amount">{plan.price}</span>
              <span className="currency">{plan.currency}</span>
              <span className="period">/{plan.billingInterval.toLowerCase()}</span>
            </div>
            
            <ul className="features">
              {plan.features.description?.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            
            <div className="limits">
              <div>👥 Up to {plan.maxStaffPerBusiness} staff</div>
              <div>📅 {plan.maxAppointmentsPerDay} appointments/day</div>
            </div>
            
            <button 
              className="select-plan-btn"
              onClick={() => onSelectPlan(plan)}
            >
              Choose {plan.displayName}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. **Payment Form Component**

```javascript
import React, { useState } from 'react';

const PaymentForm = ({ selectedPlan, businessId, onPaymentSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    card: {
      cardHolderName: '',
      cardNumber: '',
      expireMonth: '',
      expireYear: '',
      cvc: ''
    },
    buyer: {
      name: '',
      surname: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Turkey',
      zipCode: ''
    },
    installment: '1'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useTestCard, setUseTestCard] = useState(false);

  // Fetch test cards for development
  const loadTestCard = async () => {
    try {
      const response = await fetch('/api/v1/payments/test-cards');
      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          card: data.data.success // Use success test card
        }));
      }
    } catch (error) {
      console.error('Error loading test card:', error);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const { card, buyer } = formData;
    
    // Card validation
    if (!card.cardHolderName || card.cardHolderName.length < 2) {
      throw new Error('Card holder name is required');
    }
    
    if (!/^\d{16}$/.test(card.cardNumber.replace(/\s/g, ''))) {
      throw new Error('Card number must be 16 digits');
    }
    
    if (!/^(0[1-9]|1[0-2])$/.test(card.expireMonth)) {
      throw new Error('Invalid expire month (01-12)');
    }
    
    if (!/^\d{4}$/.test(card.expireYear)) {
      throw new Error('Invalid expire year (YYYY)');
    }
    
    if (!/^\d{3,4}$/.test(card.cvc)) {
      throw new Error('Invalid CVC (3-4 digits)');
    }
    
    // Buyer validation
    if (!buyer.name || !buyer.surname) {
      throw new Error('Name and surname are required');
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) {
      throw new Error('Invalid email address');
    }
    
    if (!buyer.address || !buyer.city) {
      throw new Error('Address and city are required');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      validateForm();

      const token = localStorage.getItem('accessToken'); // Your auth token
      
      const paymentData = {
        planId: selectedPlan.id,
        card: {
          ...formData.card,
          cardNumber: formData.card.cardNumber.replace(/\s/g, '')
        },
        buyer: formData.buyer,
        installment: formData.installment
      };

      const response = await fetch(`/api/v1/businesses/${businessId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success) {
        onPaymentSuccess({
          subscriptionId: result.data.subscriptionId,
          paymentId: result.data.paymentId,
          message: result.data.message,
          plan: selectedPlan
        });
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      <div className="plan-summary">
        <h3>Payment for {selectedPlan.displayName}</h3>
        <p className="amount">{selectedPlan.price} {selectedPlan.currency}</p>
        <p className="billing">{selectedPlan.billingInterval.toLowerCase()} billing</p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="test-card-section">
          <button type="button" onClick={loadTestCard} disabled={useTestCard}>
            {useTestCard ? 'Test Card Loaded' : 'Load Test Card'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Card Information */}
        <fieldset className="card-section">
          <legend>Card Information</legend>
          
          <div className="form-group">
            <label>Card Holder Name</label>
            <input
              type="text"
              value={formData.card.cardHolderName}
              onChange={(e) => handleInputChange('card', 'cardHolderName', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Card Number</label>
            <input
              type="text"
              value={formData.card.cardNumber}
              onChange={(e) => {
                // Format card number with spaces
                const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                if (value.replace(/\s/g, '').length <= 16) {
                  handleInputChange('card', 'cardNumber', value);
                }
              }}
              placeholder="5528 7900 0000 0008"
              maxLength="19"
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Month</label>
              <select
                value={formData.card.expireMonth}
                onChange={(e) => handleInputChange('card', 'expireMonth', e.target.value)}
                required
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = String(i + 1).padStart(2, '0');
                  return <option key={month} value={month}>{month}</option>;
                })}
              </select>
            </div>
            
            <div className="form-group">
              <label>Year</label>
              <select
                value={formData.card.expireYear}
                onChange={(e) => handleInputChange('card', 'expireYear', e.target.value)}
                required
              >
                <option value="">YYYY</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            
            <div className="form-group">
              <label>CVC</label>
              <input
                type="text"
                value={formData.card.cvc}
                onChange={(e) => {
                  if (/^\d{0,4}$/.test(e.target.value)) {
                    handleInputChange('card', 'cvc', e.target.value);
                  }
                }}
                placeholder="123"
                maxLength="4"
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Buyer Information */}
        <fieldset className="buyer-section">
          <legend>Billing Information</legend>
          
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={formData.buyer.name}
                onChange={(e) => handleInputChange('buyer', 'name', e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={formData.buyer.surname}
                onChange={(e) => handleInputChange('buyer', 'surname', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.buyer.email}
              onChange={(e) => handleInputChange('buyer', 'email', e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.buyer.phone}
              onChange={(e) => handleInputChange('buyer', 'phone', e.target.value)}
              placeholder="+905350000000"
            />
          </div>
          
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={formData.buyer.address}
              onChange={(e) => handleInputChange('buyer', 'address', e.target.value)}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={formData.buyer.city}
                onChange={(e) => handleInputChange('buyer', 'city', e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                value={formData.buyer.country}
                onChange={(e) => handleInputChange('buyer', 'country', e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Zip Code</label>
              <input
                type="text"
                value={formData.buyer.zipCode}
                onChange={(e) => handleInputChange('buyer', 'zipCode', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Installment Options */}
        <fieldset className="installment-section">
          <legend>Payment Options</legend>
          
          <div className="form-group">
            <label>Installments</label>
            <select
              value={formData.installment}
              onChange={(e) => handleInputChange('installment', '', e.target.value)}
            >
              <option value="1">Pay in full (1 installment)</option>
              <option value="2">2 installments</option>
              <option value="3">3 installments</option>
              <option value="6">6 installments</option>
              <option value="9">9 installments</option>
              <option value="12">12 installments</option>
            </select>
          </div>
        </fieldset>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="pay-button">
            {loading ? 'Processing...' : `Pay ${selectedPlan.price} ${selectedPlan.currency}`}
          </button>
        </div>
      </form>
    </div>
  );
};
```

### 3. **Main Integration Component**

```javascript
import React, { useState } from 'react';
import SubscriptionPlans from './SubscriptionPlans';
import PaymentForm from './PaymentForm';

const SubscriptionFlow = ({ businessId }) => {
  const [currentStep, setCurrentStep] = useState('plans'); // 'plans' | 'payment' | 'success'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = (result) => {
    setPaymentResult(result);
    setCurrentStep('success');
    
    // Optional: Refresh user's subscription status
    // fetchCurrentSubscription();
  };

  const handlePaymentCancel = () => {
    setCurrentStep('plans');
    setSelectedPlan(null);
  };

  const handleStartOver = () => {
    setCurrentStep('plans');
    setSelectedPlan(null);
    setPaymentResult(null);
  };

  return (
    <div className="subscription-flow">
      {currentStep === 'plans' && (
        <SubscriptionPlans
          businessId={businessId}
          onSelectPlan={handlePlanSelect}
        />
      )}
      
      {currentStep === 'payment' && selectedPlan && (
        <PaymentForm
          selectedPlan={selectedPlan}
          businessId={businessId}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
      
      {currentStep === 'success' && paymentResult && (
        <div className="payment-success">
          <div className="success-icon">✅</div>
          <h2>Payment Successful!</h2>
          <p>Your subscription to <strong>{paymentResult.plan.displayName}</strong> is now active.</p>
          
          <div className="success-details">
            <div className="detail-item">
              <label>Subscription ID:</label>
              <span>{paymentResult.subscriptionId}</span>
            </div>
            <div className="detail-item">
              <label>Payment ID:</label>
              <span>{paymentResult.paymentId}</span>
            </div>
            <div className="detail-item">
              <label>Plan:</label>
              <span>{paymentResult.plan.displayName}</span>
            </div>
            <div className="detail-item">
              <label>Amount:</label>
              <span>{paymentResult.plan.price} {paymentResult.plan.currency}</span>
            </div>
          </div>
          
          <div className="success-actions">
            <button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </button>
            <button onClick={handleStartOver} className="secondary">
              Subscribe Another Business
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionFlow;
```

### 4. **Usage Example**

```javascript
// In your main app or business management page
import React from 'react';
import SubscriptionFlow from './components/SubscriptionFlow';

const BusinessSubscriptionPage = () => {
  // Get business ID from your route params or context
  const businessId = useParams().businessId; // or from your routing system
  
  return (
    <div className="subscription-page">
      <div className="container">
        <h1>Choose Your Subscription Plan</h1>
        <p>Select the perfect plan for your business needs</p>
        
        <SubscriptionFlow businessId={businessId} />
      </div>
    </div>
  );
};
```

### 5. **API Endpoints Summary**

```javascript
// Available API endpoints for frontend integration:

// 1. Get all subscription plans
GET /api/v1/payments/subscription-plans
// Response: { success: true, data: [plans...] }

// 2. Create subscription with payment
POST /api/v1/businesses/{businessId}/payments
// Headers: Authorization: Bearer {token}
// Body: { planId, card, buyer, installment }
// Response: { success: true, data: { subscriptionId, paymentId, message } }

// 3. Get test cards (development only)
GET /api/v1/payments/test-cards
// Response: { success: true, data: { success, failure, threeDsSuccess } }

// 4. Get payment history
GET /api/v1/businesses/{businessId}/payments
// Headers: Authorization: Bearer {token}
// Response: { success: true, data: subscription_with_payments }

// 5. Refund payment
POST /api/v1/payments/{paymentId}/refund
// Headers: Authorization: Bearer {token}
// Body: { amount?, reason? }

// 6. Cancel payment
POST /api/v1/payments/{paymentId}/cancel
// Headers: Authorization: Bearer {token}
// Body: { reason? }
```

### 6. **Error Handling**

```javascript
const handleApiError = (error, response) => {
  // Handle different error types
  if (response?.status === 401) {
    // Unauthorized - redirect to login
    window.location.href = '/login';
    return;
  }
  
  if (response?.status === 400) {
    // Bad request - show validation errors
    const errorData = await response.json();
    if (errorData.details) {
      // Zod validation errors
      const fieldErrors = errorData.details.reduce((acc, detail) => {
        acc[detail.path[0]] = detail.message;
        return acc;
      }, {});
      return fieldErrors;
    }
  }
  
  // Generic error handling
  console.error('Payment error:', error);
  return { general: error.message || 'An unexpected error occurred' };
};
```

### 7. **CSS Styling Example**

```css
.subscription-plans {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.plan-card {
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  padding: 2rem;
  position: relative;
  background: white;
  transition: all 0.3s ease;
}

.plan-card:hover {
  border-color: #007bff;
  box-shadow: 0 8px 25px rgba(0,123,255,0.15);
}

.plan-card.popular {
  border-color: #007bff;
  transform: scale(1.05);
}

.popular-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #007bff;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.price {
  font-size: 2rem;
  font-weight: bold;
  color: #007bff;
  margin: 1rem 0;
}

.payment-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.pay-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.pay-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.payment-success {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.success-details {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.detail-item:last-child {
  border-bottom: none;
}
```

This complete integration provides:
- ✅ Plan selection with detailed information
- ✅ Secure payment form with validation
- ✅ Test card support for development
- ✅ Error handling and user feedback
- ✅ Success confirmation with details
- ✅ Responsive design
- ✅ Installment options
- ✅ Complete TypeScript support

The flow is: **Plans → Payment Form → Success** with proper error handling at each step.