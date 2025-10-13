# 🏙️ City-Based Pricing System - Frontend Integration Guide

## 📋 Overview

Our subscription system now supports **automatic city-based pricing** with **IP geolocation detection**. Users will see pricing based on their location without needing to manually select a city.

## 🎯 Key Features

- ✅ **Automatic IP Detection** - No user input required
- ✅ **Manual City Override** - Users can still select different cities
- ✅ **Tier-Based Pricing** - 3 pricing tiers for Turkish cities
- ✅ **Fallback Safety** - Always shows pricing even if detection fails
- ✅ **Backward Compatible** - Existing API calls still work

## 🌍 Pricing Tiers

| Tier | Multiplier | Cities | Example Pricing |
|------|------------|--------|-----------------|
| **Tier 1** | 2.0x | Istanbul, Ankara | Starter: 1500 TL |
| **Tier 2** | 1.5x | Bursa, Izmir, Antalya, etc. | Starter: 1125 TL |
| **Tier 3** | 1.0x | Kütahya, Sivas, etc. | Starter: 750 TL |

## 🔌 API Endpoints

### 1. Get Pricing Plans (Automatic Detection)

**Endpoint:** `GET /api/v1/subscriptions/plans`

**Description:** Automatically detects user's city from IP and returns location-specific pricing.

**Request:**
```http
GET /api/v1/subscriptions/plans
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription plans retrieved successfully",
  "data": {
    "plans": [
      {
        "id": "plan_starter_monthly",
        "name": "starter",
        "displayName": "Starter Plan",
        "description": "Perfect for small businesses just getting started",
        "price": 1500,                    // Location-adjusted price
        "basePrice": 750,                 // Original base price
        "currency": "TRY",
        "billingInterval": "MONTHLY",
        "maxBusinesses": 1,
        "maxStaffPerBusiness": 1,
        "features": { /* ... */ },
        "isActive": true,
        "isPopular": false,
        "locationPricing": {              // NEW: Location pricing info
          "city": "Istanbul",
          "state": "Istanbul",
          "country": "Turkey",
          "tier": "TIER_1",
          "multiplier": 2.0
        }
      }
      // ... more plans
    ],
    "location": {                         // NEW: Detected location info
      "city": "Istanbul",
      "state": "Istanbul",
      "country": "Turkey",
      "detected": true,                   // true = auto-detected, false = manual
      "source": "ip_geolocation",         // "ip_geolocation" | "manual" | "fallback"
      "accuracy": "low"                   // "high" | "medium" | "low"
    }
  }
}
```

### 2. Get Pricing Plans (Manual City Selection)

**Endpoint:** `GET /api/v1/subscriptions/plans?city={cityName}`

**Description:** Get pricing for a specific city.

**Request:**
```http
GET /api/v1/subscriptions/plans?city=Bursa
GET /api/v1/subscriptions/plans?city=Kutahya
GET /api/v1/subscriptions/plans?city=Istanbul&state=Istanbul&country=Turkey
```

**Response:** Same structure as above, but with manual location data.

## 🎨 Frontend Implementation Examples

### 1. Basic Pricing Display (Automatic Detection)

```tsx
import React, { useState, useEffect } from 'react';

interface Plan {
  id: string;
  displayName: string;
  price: number;
  basePrice: number;
  currency: string;
  billingInterval: string;
  features: any;
  locationPricing: {
    city: string;
    tier: string;
    multiplier: number;
  };
}

interface Location {
  city: string;
  state: string;
  country: string;
  detected: boolean;
  source: string;
  accuracy: string;
}

interface PricingResponse {
  success: boolean;
  data: {
    plans: Plan[];
    location: Location;
  };
}

const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/subscriptions/plans');
      const data: PricingResponse = await response.json();
      
      if (data.success) {
        setPlans(data.data.plans);
        setLocation(data.data.location);
      } else {
        setError('Failed to load pricing');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading pricing...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="pricing-page">
      {/* Location Info */}
      {location && (
        <div className="location-info">
          <h3>📍 Pricing for {location.city}, {location.country}</h3>
          {location.detected && (
            <p className="detection-info">
              {location.source === 'ip_geolocation' 
                ? '📍 Automatically detected your location'
                : '📍 Location selected manually'
              }
            </p>
          )}
        </div>
      )}

      {/* Pricing Plans */}
      <div className="pricing-grid">
        {plans.map(plan => (
          <div key={plan.id} className="pricing-card">
            <h3>{plan.displayName}</h3>
            <div className="price">
              <span className="current-price">
                {plan.price} {plan.currency}
              </span>
              <span className="billing-interval">
                /{plan.billingInterval.toLowerCase()}
              </span>
            </div>
            
            {/* Show multiplier if different from base price */}
            {plan.locationPricing.multiplier !== 1 && (
              <div className="pricing-info">
                <small>
                  Base price: {plan.basePrice} {plan.currency} 
                  (×{plan.locationPricing.multiplier} for {plan.locationPricing.city})
                </small>
              </div>
            )}
            
            <button className="select-plan-btn">
              Select Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
```

### 2. City Selector Component

```tsx
import React, { useState, useEffect } from 'react';

interface CitySelectorProps {
  onCityChange: (city: string) => void;
  currentCity: string;
  detectedLocation?: Location;
}

const CITY_OPTIONS = [
  { value: 'Istanbul', label: 'Istanbul', tier: 'Tier 1' },
  { value: 'Ankara', label: 'Ankara', tier: 'Tier 1' },
  { value: 'Bursa', label: 'Bursa', tier: 'Tier 2' },
  { value: 'Izmir', label: 'İzmir', tier: 'Tier 2' },
  { value: 'Antalya', label: 'Antalya', tier: 'Tier 2' },
  { value: 'Kutahya', label: 'Kütahya', tier: 'Tier 3' },
  { value: 'Sivas', label: 'Sivas', tier: 'Tier 3' },
  // Add more cities as needed
];

const CitySelector: React.FC<CitySelectorProps> = ({ 
  onCityChange, 
  currentCity, 
  detectedLocation 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="city-selector">
      <label>Select your city for accurate pricing:</label>
      <div className="dropdown">
        <button 
          className="dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {currentCity} 
          {detectedLocation?.detected && currentCity === detectedLocation.city && (
            <span className="auto-detected">📍 Auto-detected</span>
          )}
        </button>
        
        {isOpen && (
          <div className="dropdown-menu">
            {CITY_OPTIONS.map(city => (
              <div
                key={city.value}
                className="dropdown-item"
                onClick={() => {
                  onCityChange(city.value);
                  setIsOpen(false);
                }}
              >
                <span className="city-name">{city.label}</span>
                <span className="city-tier">{city.tier}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {detectedLocation?.detected && (
        <p className="detection-note">
          We automatically detected you're in {detectedLocation.city}. 
          You can change this if needed.
        </p>
      )}
    </div>
  );
};

export default CitySelector;
```

### 3. Complete Pricing Page with City Selection

```tsx
import React, { useState, useEffect } from 'react';
import CitySelector from './CitySelector';

const PricingPageWithSelector: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing(); // Initial load with auto-detection
  }, []);

  const fetchPricing = async (city?: string) => {
    try {
      setLoading(true);
      const url = city 
        ? `/api/v1/subscriptions/plans?city=${encodeURIComponent(city)}`
        : '/api/v1/subscriptions/plans';
        
      const response = await fetch(url);
      const data: PricingResponse = await response.json();
      
      if (data.success) {
        setPlans(data.data.plans);
        setLocation(data.data.location);
        if (city) {
          setSelectedCity(city);
        } else {
          setSelectedCity(data.data.location.city);
        }
      }
    } catch (err) {
      console.error('Error fetching pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (city: string) => {
    fetchPricing(city);
  };

  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>
      
      <CitySelector
        onCityChange={handleCityChange}
        currentCity={selectedCity}
        detectedLocation={location}
      />

      {loading ? (
        <div>Loading pricing...</div>
      ) : (
        <div className="pricing-grid">
          {plans.map(plan => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
};

const PricingCard: React.FC<{ plan: Plan }> = ({ plan }) => {
  const isPopular = plan.isPopular;
  const hasLocationAdjustment = plan.locationPricing.multiplier !== 1;

  return (
    <div className={`pricing-card ${isPopular ? 'popular' : ''}`}>
      {isPopular && <div className="popular-badge">Most Popular</div>}
      
      <h3>{plan.displayName}</h3>
      <p className="description">{plan.description}</p>
      
      <div className="price-section">
        <div className="price">
          <span className="amount">{plan.price}</span>
          <span className="currency">{plan.currency}</span>
          <span className="interval">/{plan.billingInterval.toLowerCase()}</span>
        </div>
        
        {hasLocationAdjustment && (
          <div className="price-breakdown">
            <small>
              Base: {plan.basePrice} {plan.currency} 
              × {plan.locationPricing.multiplier} 
              ({plan.locationPricing.city})
            </small>
          </div>
        )}
      </div>

      <ul className="features">
        {plan.features.description.map((feature: string, index: number) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>

      <button className="select-plan-btn">
        Select {plan.displayName}
      </button>
    </div>
  );
};

export default PricingPageWithSelector;
```

## 🎨 CSS Styling Examples

```css
/* Pricing Page Styles */
.pricing-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.location-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  text-align: center;
}

.detection-info {
  color: #6c757d;
  font-size: 0.9rem;
  margin: 0.5rem 0 0 0;
}

/* City Selector Styles */
.city-selector {
  margin-bottom: 2rem;
}

.dropdown {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 300px;
}

.dropdown-toggle {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auto-detected {
  background: #28a745;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ced4da;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f8f9fa;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.city-tier {
  font-size: 0.8rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

/* Pricing Grid */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.pricing-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 2rem;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.pricing-card.popular {
  border-color: #007bff;
  box-shadow: 0 4px 15px rgba(0,123,255,0.2);
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
  font-size: 0.8rem;
  font-weight: bold;
}

.price-section {
  text-align: center;
  margin: 1.5rem 0;
}

.price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.amount {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
}

.currency {
  font-size: 1.2rem;
  color: #666;
}

.interval {
  font-size: 1rem;
  color: #666;
}

.price-breakdown {
  margin-top: 0.5rem;
  color: #6c757d;
  font-size: 0.9rem;
}

.features {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
}

.features li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f8f9fa;
  position: relative;
  padding-left: 1.5rem;
}

.features li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #28a745;
  font-weight: bold;
}

.select-plan-btn {
  width: 100%;
  padding: 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.select-plan-btn:hover {
  background: #0056b3;
}

.pricing-card.popular .select-plan-btn {
  background: #28a745;
}

.pricing-card.popular .select-plan-btn:hover {
  background: #1e7e34;
}
```

## 🔧 Error Handling

```tsx
const handlePricingError = (error: any) => {
  console.error('Pricing error:', error);
  
  // Show user-friendly error message
  setError('Unable to load pricing. Please try again.');
  
  // Optionally retry after delay
  setTimeout(() => {
    fetchPricing();
  }, 5000);
};

// In your component
useEffect(() => {
  fetchPricing().catch(handlePricingError);
}, []);
```

## 📱 Mobile Considerations

```css
/* Mobile Responsive */
@media (max-width: 768px) {
  .pricing-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .pricing-card {
    padding: 1.5rem;
  }
  
  .city-selector {
    margin-bottom: 1rem;
  }
  
  .dropdown {
    max-width: 100%;
  }
}
```

## 🚀 Implementation Checklist

- [ ] **API Integration**
  - [ ] Fetch pricing from `/api/v1/subscriptions/plans`
  - [ ] Handle city parameter for manual selection
  - [ ] Parse location metadata from response

- [ ] **UI Components**
  - [ ] Create pricing card component
  - [ ] Add city selector dropdown
  - [ ] Show location detection status
  - [ ] Display pricing multipliers

- [ ] **User Experience**
  - [ ] Show loading states
  - [ ] Handle error cases gracefully
  - [ ] Provide city selection option
  - [ ] Show auto-detection feedback

- [ ] **Testing**
  - [ ] Test with different cities
  - [ ] Test IP detection fallback
  - [ ] Test manual city selection
  - [ ] Test mobile responsiveness

## 🔍 Debugging Tips

1. **Check Network Tab**: Look for the API calls and responses
2. **Console Logs**: Add logging to see location detection
3. **Test Different Cities**: Use `?city=Bursa` to test manual selection
4. **Check Cache**: Clear browser cache if seeing old data

## 📞 Support

If you encounter any issues with the pricing system integration, please check:
1. API endpoint is accessible
2. Response structure matches expected format
3. City names match the supported list
4. Error handling is properly implemented

---

**Happy coding! 🚀** Your users will now see location-appropriate pricing automatically!

