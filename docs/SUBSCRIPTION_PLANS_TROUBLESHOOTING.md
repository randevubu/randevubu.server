# Subscription Plans API Troubleshooting Guide

## Issues Identified

### Issue 1: Empty Plans Array (Cache Problem)

**Symptom:**
```json
{
  "plans": [],
  "_cache": { "hit": true, "ttl": 3600 }
}
```

**Root Cause:**
The response is cached in Redis before the subscription plans were seeded. The cache key `static:anonymous:global:/plans` is returning empty plans.

**Solutions:**

1. **Wait for cache expiration** (1 hour TTL)
2. **Use city parameter to bypass cached response:**
   ```
   GET /api/v1/subscriptions/plans?city=Antalya
   ```
3. **Clear Redis cache manually:**
   ```bash
   # Find the Redis password in docker-compose.dev.yml
   docker-compose -f docker-compose.dev.yml exec redis redis-cli -a <password> DEL "static:anonymous:global:/plans"
   ```
4. **Restart all services** (this may not clear persistent cache):
   ```bash
   docker-compose -f docker-compose.dev.yml restart
   ```

### Issue 2: Wrong Location Detection (Istanbul instead of Antalya)

**Symptom:**
```json
{
  "location": {
    "city": "Istanbul",
    "detected": true,
    "source": "ip_geolocation"
  }
}
```

**Root Cause:**
The IP geolocation service (`IPGeolocationService`) is either:
1. Failing to detect your actual location from your IP
2. Falling back to default location (Istanbul) on error

**Location in code:**
- `src/controllers/subscriptionController.ts:26-93`
- Fallback logic at line 49-59

**Solutions:**

1. **Always pass city explicitly in the URL:**
   ```
   GET /api/v1/subscriptions/plans?city=Antalya&state=Antalya&country=Turkey
   ```

2. **For frontend integration, use geolocation API first:**
   ```javascript
   // Get user's location from browser
   navigator.geolocation.getCurrentPosition(position => {
     const city = getCityFromCoordinates(position.coords);
     fetch(`/api/v1/subscriptions/plans?city=${city}`);
   });
   ```

3. **Fix IP geolocation service** (check `src/services/domain/geolocation/ipGeolocationService.ts`)

## Pricing Tier Configuration

### Current City Tier Mapping

**TIER_1 Cities** (949 TRY Basic, 1499 TRY Premium):
- Istanbul
- Ankara
- Izmir
- Bursa
- **Antalya** ✓
- Eskisehir

**TIER_2 Cities** (799 TRY Basic, 1299 TRY Premium):
- Gaziantep, Konya, Diyarbakir, Samsun, Denizli, Kayseri, Mersin, etc.

**TIER_3 Cities** (749 TRY Basic, 1199 TRY Premium):
- All other cities (default)

### Tier Mapping Location
`src/services/domain/pricing/pricingTierService.ts:141-213`

## Testing the API

### Test 1: Get all plans (no location filter)
```bash
curl "http://localhost:3001/api/v1/subscriptions/plans"
# Returns all plans if no city detected
```

### Test 2: Get plans for Antalya (TIER_1)
```bash
curl "http://localhost:3001/api/v1/subscriptions/plans?city=Antalya"
# Returns: basic_tier1, premium_tier1
```

### Test 3: Get plans for Gaziantep (TIER_2)
```bash
curl "http://localhost:3001/api/v1/subscriptions/plans?city=Gaziantep"
# Returns: basic_tier2, premium_tier2
```

### Test 4: Get plans for unknown city (defaults to TIER_3)
```bash
curl "http://localhost:3001/api/v1/subscriptions/plans?city=Kutahya"
# Returns: basic_tier3, premium_tier3
```

## Quick Fix for Your Situation

**To see the plans immediately in Antalya:**

Add the city parameter to your API call:
```
http://localhost:3001/api/v1/subscriptions/plans?city=Antalya
```

This will:
1. Bypass the cached response
2. Return the correct TIER_1 plans for Antalya
3. Work immediately without waiting for cache expiration

## Recommended Frontend Integration

```typescript
// Fetch subscription plans with location
async function fetchSubscriptionPlans(city?: string) {
  const params = new URLSearchParams();

  if (city) {
    params.append('city', city);
    params.append('country', 'Turkey');
  }

  const response = await fetch(`/api/v1/subscriptions/plans?${params}`);
  const data = await response.json();

  return data.data.plans;
}

// Usage
const plans = await fetchSubscriptionPlans('Antalya');
```

## Cache Management

The caching is handled in `src/utils/responseUtils.ts`. The cache key format is:
```
static:anonymous:global:/plans
```

**Cache TTL:** 3600 seconds (1 hour)

**Cache Strategy:**
- Static content (plans) are cached for anonymous users
- Cache is invalidated when plans are updated (TODO: implement cache invalidation on plan updates)

## TODO: Improvements Needed

1. **Implement cache invalidation** when subscription plans are created/updated
2. **Improve IP geolocation accuracy** or provide better fallback
3. **Add manual location selection** in frontend UI
4. **Add cache bypass for development** environment
5. **Add Redis cache management endpoints** for admin users
