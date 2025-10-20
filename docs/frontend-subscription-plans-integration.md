# 🏢 Subscription Plans Integration Guide - Frontend

## 📋 Overview

Our subscription system now supports **tier-based pricing** with 6 different subscription plans across 3 pricing tiers. Each tier is designed for different city sizes and market conditions in Turkey.

## 🎯 New Pricing Structure

### Tier 1 Cities (Major Metropolitan Areas)
- **Istanbul, Ankara, Izmir, Bursa, Antalya, Eskişehir**
- Higher pricing due to increased operational costs and market demand

### Tier 2 Cities (Regional Centers)  
- **Gaziantep, Konya, Diyarbakır, Samsun, Denizli, Kayseri, Mersin, Erzurum, Trabzon, Balıkesir, Kahramanmaraş, Van, Manisa, Sivas, Batman**
- Moderate pricing for regional business centers

### Tier 3 Cities (Smaller Cities)
- **All other cities and rural areas**
- Lower pricing to make the service accessible in smaller markets

## 🌍 IP Geolocation Integration

**Yes, the IP geolocation system is still connected!** Here's how it works with the new fixed pricing:

### How It Works:
1. **Automatic Detection**: When users visit `/api/v1/subscriptions/plans`, the system automatically detects their city from their IP address
2. **Tier Filtering**: Instead of applying multipliers to base prices, the system now filters to show only the plans for the user's city tier
3. **Fixed Prices**: Each tier has its own fixed prices - no more dynamic calculations
4. **Fallback Safety**: If IP detection fails, it defaults to Tier 1 (Istanbul) pricing

### Example Behavior:
- **User in Istanbul** → Sees only Tier 1 plans (949 TL Basic, 1499 TL Premium)
- **User in Bursa** → Sees only Tier 2 plans (799 TL Basic, 1299 TL Premium)  
- **User in Kütahya** → Sees only Tier 3 plans (749 TL Basic, 1199 TL Premium)
- **IP Detection Fails** → Sees Tier 1 plans as fallback

## 💰 Pricing Plans

| Plan | Tier 1 | Tier 2 | Tier 3 | Features |
|------|--------|--------|--------|----------|
| **Basic** | 949 TL | 799 TL | 749 TL | 1 staff, 1000 SMS, Basic features |
| **Premium** | 1499 TL | 1299 TL | 1199 TL | 5 staff, 1500 SMS, Advanced features |

## 🔌 API Endpoints

### 1. Get All Subscription Plans

**Endpoint:** `GET /api/v1/subscriptions/plans`

**Description:** Retrieves all available subscription plans with their pricing and features.

**Request:**
```http
GET /api/v1/subscriptions/plans
Authorization: Bearer <jwt_token>
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
        "id": "plan_basic_tier1",
        "name": "basic_tier1",
        "displayName": "Basic Plan - Tier 1",
        "description": "Perfect for small businesses in major cities",
        "price": 949.00,
        "currency": "TRY",
        "billingInterval": "MONTHLY",
        "maxBusinesses": 1,
        "maxStaffPerBusiness": 1,
        "maxAppointmentsPerDay": 0,
        "features": {
          "appointmentBooking": true,
          "staffManagement": true,
          "basicReports": true,
          "emailNotifications": true,
          "smsNotifications": true,
          "customBranding": false,
          "advancedReports": false,
          "apiAccess": false,
          "multiLocation": false,
          "prioritySupport": false,
          "integrations": ["whatsapp", "calendar", "google"],
          "maxServices": 0,
          "maxCustomers": 0,
          "smsQuota": 1000,
          "pricingTier": "TIER_1",
          "description": [
            "Online appointment booking system",
            "Up to 1 staff member",
            "Unlimited customers",
            "Email & SMS notifications",
            "1,000 SMS per month",
            "Basic reporting & analytics",
            "WhatsApp integration",
            "Google Calendar sync",
            "Unlimited appointments",
            "Email support",
            "Mobile app access",
            "Customer management",
            "Service management",
            "Basic customer segmentation",
            "Appointment reminders",
            "Business hours management"
          ]
        },
        "isActive": true,
        "isPopular": false,
        "sortOrder": 1,
        "createdAt": "2025-10-13T11:47:00.000Z",
        "updatedAt": "2025-10-13T11:47:00.000Z"
      },
      {
        "id": "plan_premium_tier1",
        "name": "premium_tier1",
        "displayName": "Premium Plan - Tier 1",
        "description": "Advanced features for growing businesses in major cities",
        "price": 1499.00,
        "currency": "TRY",
        "billingInterval": "MONTHLY",
        "maxBusinesses": 1,
        "maxStaffPerBusiness": 5,
        "maxAppointmentsPerDay": 0,
        "features": {
          "appointmentBooking": true,
          "staffManagement": true,
          "basicReports": true,
          "emailNotifications": true,
          "smsNotifications": true,
          "customBranding": true,
          "advancedReports": true,
          "apiAccess": true,
          "multiLocation": false,
          "prioritySupport": true,
          "integrations": ["calendar", "whatsapp", "google", "outlook", "analytics"],
          "maxServices": 0,
          "maxCustomers": 0,
          "smsQuota": 1500,
          "pricingTier": "TIER_1",
          "description": [
            "All Basic features",
            "Up to 5 staff members",
            "Unlimited customers",
            "1,500 SMS per month",
            "Advanced reporting & analytics",
            "Custom branding & themes",
            "Google Calendar & Outlook integration",
            "Priority email & phone support",
            "Unlimited appointments",
            "API access",
            "Advanced customer segmentation",
            "Automated marketing campaigns",
            "Customer loyalty programs",
            "Advanced appointment scheduling",
            "Staff performance tracking",
            "Revenue analytics",
            "Customer feedback system",
            "Advanced notification settings",
            "Custom business rules"
          ]
        },
        "isActive": true,
        "isPopular": true,
        "sortOrder": 2,
        "createdAt": "2025-10-13T11:47:00.000Z",
        "updatedAt": "2025-10-13T11:47:00.000Z"
      }
      // ... 4 more plans for Tier 2 and Tier 3
    ],
    "pagination": {
      "total": 6,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

### 2. Get Plans by Tier

**Endpoint:** `GET /api/v1/subscriptions/plans?tier=TIER_1`

**Description:** Retrieves subscription plans filtered by pricing tier.

**Query Parameters:**
- `tier` (optional): Filter by pricing tier (`TIER_1`, `TIER_2`, `TIER_3`)

**Request:**
```http
GET /api/v1/subscriptions/plans?tier=TIER_1
Authorization: Bearer <jwt_token>
```

**Response:** Same structure as above, but filtered by tier.

### 3. Get Plans by City (IP Geolocation)

**Endpoint:** `GET /api/v1/subscriptions/plans`

**Description:** Automatically detects user's city from IP and returns only the plans for that city's tier.

**Request:**
```http
GET /api/v1/subscriptions/plans
Authorization: Bearer <jwt_token>
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
        "id": "plan_basic_tier1",
        "name": "basic_tier1",
        "displayName": "Basic Plan - Tier 1",
        "price": 949.00,
        "currency": "TRY",
        "features": {
          "pricingTier": "TIER_1"
        },
        "locationPricing": {
          "city": "Istanbul",
          "state": "Istanbul", 
          "country": "Turkey",
          "tier": "TIER_1",
          "multiplier": 1.0
        }
      },
      {
        "id": "plan_premium_tier1",
        "name": "premium_tier1", 
        "displayName": "Premium Plan - Tier 1",
        "price": 1499.00,
        "currency": "TRY",
        "features": {
          "pricingTier": "TIER_1"
        },
        "locationPricing": {
          "city": "Istanbul",
          "state": "Istanbul",
          "country": "Turkey", 
          "tier": "TIER_1",
          "multiplier": 1.0
        }
      }
    ],
    "location": {
      "city": "Istanbul",
      "state": "Istanbul",
      "country": "Turkey",
      "detected": true,
      "source": "ip_geolocation"
    }
  }
}
```

### 4. Get Plans by Manual City Selection

**Endpoint:** `GET /api/v1/subscriptions/plans?city=Bursa`

**Description:** Manually specify a city to get plans for that city's tier.

**Query Parameters:**
- `city` (optional): City name to determine appropriate pricing tier
- `state` (optional): State name for more precise location
- `country` (optional): Country name (defaults to Turkey)

**Request:**
```http
GET /api/v1/subscriptions/plans?city=Bursa
GET /api/v1/subscriptions/plans?city=Kutahya
GET /api/v1/subscriptions/plans?city=Istanbul&state=Istanbul&country=Turkey
Authorization: Bearer <jwt_token>
```

**Response:** Same structure as above, but shows plans for the specified city's tier.

## 🎨 Frontend Implementation Guide

### 1. Plan Selection UI

```typescript
interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: string;
  maxStaffPerBusiness: number;
  features: {
    smsQuota: number;
    pricingTier: string;
    description: string[];
    // ... other features
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

// Group plans by tier
const groupPlansByTier = (plans: SubscriptionPlan[]) => {
  return plans.reduce((acc, plan) => {
    const tier = plan.features.pricingTier;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(plan);
    return acc;
  }, {} as Record<string, SubscriptionPlan[]>);
};
```

### 2. Pricing Display Component

```jsx
const PricingCard = ({ plan, tier }: { plan: SubscriptionPlan, tier: string }) => {
  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case 'TIER_1': return 'Major Cities';
      case 'TIER_2': return 'Regional Centers';
      case 'TIER_3': return 'Smaller Cities';
      default: return tier;
    }
  };

  return (
    <div className={`pricing-card ${plan.isPopular ? 'popular' : ''}`}>
      <div className="tier-badge">{getTierDisplayName(tier)}</div>
      <h3>{plan.displayName}</h3>
      <div className="price">
        <span className="amount">{plan.price}</span>
        <span className="currency">{plan.currency}</span>
        <span className="period">/{plan.billingInterval.toLowerCase()}</span>
      </div>
      <p className="description">{plan.description}</p>
      
      <ul className="features">
        {plan.features.description.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
      
      <button className="select-plan-btn">
        Select Plan
      </button>
    </div>
  );
};
```

### 3. Tier Selection Component

```jsx
const TierSelector = ({ onTierChange }: { onTierChange: (tier: string) => void }) => {
  const tiers = [
    { id: 'TIER_1', name: 'Major Cities', cities: 'Istanbul, Ankara, Izmir, Bursa, Antalya, Eskişehir' },
    { id: 'TIER_2', name: 'Regional Centers', cities: 'Gaziantep, Konya, Diyarbakır, Samsun, Denizli, Kayseri, Mersin, Erzurum, Trabzon, Balıkesir, Kahramanmaraş, Van, Manisa, Sivas, Batman' },
    { id: 'TIER_3', name: 'Smaller Cities', cities: 'All other cities and rural areas' }
  ];

  return (
    <div className="tier-selector">
      <h3>Select Your City Tier</h3>
      {tiers.map(tier => (
        <div key={tier.id} className="tier-option" onClick={() => onTierChange(tier.id)}>
          <h4>{tier.name}</h4>
          <p>{tier.cities}</p>
        </div>
      ))}
    </div>
  );
};
```

### 4. Complete Pricing Page Layout

```jsx
const PricingPage = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('TIER_1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/v1/subscriptions/plans', {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setPlans(data.data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => plan.features.pricingTier === selectedTier);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="pricing-page">
      <h1>Choose Your Subscription Plan</h1>
      
      <TierSelector onTierChange={setSelectedTier} />
      
      <div className="plans-grid">
        {filteredPlans.map(plan => (
          <PricingCard key={plan.id} plan={plan} tier={selectedTier} />
        ))}
      </div>
    </div>
  );
};
```

## 🎯 Key Features to Highlight

### Basic Plans
- ✅ **1 Staff Member** - Perfect for solo entrepreneurs
- ✅ **1,000 SMS/month** - Essential communication
- ✅ **Unlimited Appointments** - No booking limits
- ✅ **Basic Analytics** - Track your business growth
- ✅ **WhatsApp Integration** - Connect with customers

### Premium Plans
- ✅ **Up to 5 Staff Members** - Team collaboration
- ✅ **1,500 SMS/month** - Enhanced communication
- ✅ **Advanced Analytics** - Deep business insights
- ✅ **Custom Branding** - Your business identity
- ✅ **API Access** - Third-party integrations
- ✅ **Priority Support** - Faster assistance

## 🏷️ Pricing Tiers Explained

### Tier 1 - Major Cities (949 TL / 1499 TL)
- **Target:** Istanbul, Ankara, Izmir, Bursa, Antalya, Eskişehir
- **Why Higher Price:** Higher operational costs, greater market demand, premium service expectations
- **Best For:** Established businesses in metropolitan areas

### Tier 2 - Regional Centers (799 TL / 1299 TL)
- **Target:** Gaziantep, Konya, Diyarbakır, Samsun, Denizli, Kayseri, Mersin, Erzurum, Trabzon, Balıkesir, Kahramanmaraş, Van, Manisa, Sivas, Batman
- **Why Moderate Price:** Balanced pricing for regional business centers
- **Best For:** Growing businesses in regional hubs

### Tier 3 - Smaller Cities (749 TL / 1199 TL)
- **Target:** All other cities and rural areas
- **Why Lower Price:** Making premium services accessible in smaller markets
- **Best For:** Small businesses and startups in smaller cities

## 🔄 Migration from Old System

If you're migrating from the old 3-plan system:

### Old System
- Starter Plan: 750 TL
- Premium Plan: 1500 TL  
- Pro Plan: 3000 TL

### New System
- 6 plans across 3 tiers
- More granular pricing
- Location-based selection

### Migration Strategy
1. **Detect User Location:** Use IP geolocation or city selection
2. **Show Appropriate Tier:** Display plans for user's city tier
3. **Highlight Popular Plan:** Mark Premium plans as recommended
4. **Smooth Transition:** Maintain existing user subscriptions

## 🚀 Getting Started

1. **Fetch Plans:** Call `/api/v1/subscriptions/plans` endpoint
2. **Group by Tier:** Organize plans by `pricingTier` field
3. **Create UI:** Build tier selector and plan cards
4. **Handle Selection:** Implement plan selection logic
5. **Test Thoroughly:** Verify all 6 plans display correctly

## 📞 Support

For technical questions about the subscription plans API:
- **Backend Team:** Contact the API development team
- **Documentation:** This guide and API documentation
- **Testing:** Use the development environment for testing

---

**Last Updated:** October 13, 2025  
**Version:** 2.0.0  
**Status:** ✅ Active
