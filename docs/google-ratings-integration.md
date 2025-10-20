# Google Ratings Integration Guide

## Overview

This system provides a **dual rating display** that shows BOTH:
1. **Internal Ratings** - Ratings from your app (CustomerEvaluation)
2. **Google Ratings** - Live ratings from Google Maps (read-only, for information)

## API Response Structure

When you call `GET /api/v1/businesses/:id/google-integration`, you'll receive:

```json
{
  "success": true,
  "message": "Google integration settings retrieved successfully",
  "data": {
    // Google Integration Settings
    "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "googleOriginalUrl": "https://maps.app.goo.gl/...",
    "googleIntegrationEnabled": true,
    "googleLinkedAt": "2024-01-15T10:30:00Z",
    "latitude": 41.0082,
    "longitude": 28.9784,

    // Internal Ratings (from your app - you control these)
    "internalRatings": {
      "averageRating": 4.5,
      "totalRatings": 25,
      "lastRatingAt": "2024-01-15T10:30:00Z"
    },

    // Google Ratings (from Google Maps - read-only, just for info)
    "googleRatings": {
      "rating": 4.7,
      "totalRatings": 342,
      "reviews": [
        {
          "authorName": "John Doe",
          "rating": 5,
          "text": "Great place!",
          "time": 1705324800,
          "relativeTimeDescription": "2 weeks ago"
        }
      ],
      "name": "My Business Name",
      "formattedAddress": "123 Main St, Istanbul",
      "website": "https://mybusiness.com",
      "phoneNumber": "+90 555 123 4567"
    },

    // URLs for embedding maps
    "urls": {
      "maps": "https://www.google.com/maps?cid=...",
      "reviews": "https://www.google.com/maps?cid=...",
      "writeReview": "https://www.google.com/maps?cid=...",
      "embed": "https://maps.google.com/maps?cid=...&output=embed"
    }
  }
}
```

## Setup Instructions

### 1. Get a Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 3. Restart Your Server

```bash
npm run dev
# or
npm start
```

## How It Works

### Internal Ratings (Your App)
- Customers submit ratings via `POST /api/v1/businesses/:id/ratings`
- Stored in `CustomerEvaluation` table
- Cached in `Business` table (`averageRating`, `totalRatings`, `lastRatingAt`)
- **You have full control** - can moderate, delete, etc.

### Google Ratings (Google Maps)
- Fetched live from Google Places API when the endpoint is called
- Based on the `googlePlaceId` linked to the business
- **Read-only** - you cannot modify these
- **Just for information** - shows what customers see on Google Maps

## Frontend Display Example

```tsx
interface BusinessRatingsDisplayProps {
  internalRatings: {
    averageRating: number;
    totalRatings: number;
  };
  googleRatings: {
    rating: number;
    totalRatings: number;
  } | null;
}

export const BusinessRatingsDisplay: React.FC<BusinessRatingsDisplayProps> = ({
  internalRatings,
  googleRatings
}) => {
  return (
    <div className="ratings-container">
      {/* Internal Ratings */}
      <div className="internal-ratings">
        <h3>Our Platform Ratings</h3>
        <div className="rating-display">
          <span className="stars">⭐</span>
          <span className="rating">{internalRatings.averageRating.toFixed(1)}</span>
          <span className="count">({internalRatings.totalRatings} reviews)</span>
        </div>
        <p className="rating-source">From verified customers</p>
      </div>

      {/* Google Ratings (if available) */}
      {googleRatings && (
        <div className="google-ratings">
          <h3>Google Maps Ratings</h3>
          <div className="rating-display">
            <span className="stars">⭐</span>
            <span className="rating">{googleRatings.rating.toFixed(1)}</span>
            <span className="count">({googleRatings.totalRatings} Google reviews)</span>
          </div>
          <p className="rating-source">From Google Maps</p>
        </div>
      )}
    </div>
  );
};
```

## API Pricing

### Free Tier (Google Places API)
- **1,000 requests/month FREE**
- **$17 per 1,000 requests** after that

### Recommendation: Cache Google Ratings

To minimize API costs, consider caching Google ratings:

```typescript
// Example: Cache for 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Store in Redis or database with timestamp
interface CachedGoogleRatings {
  rating: number;
  totalRatings: number;
  cachedAt: Date;
}

// Only fetch from API if cache is old
if (!cached || Date.now() - cached.cachedAt > CACHE_TTL) {
  // Fetch from Google API
  const fresh = await googlePlacesService.getPlaceDetails(placeId);
  // Update cache
}
```

## Troubleshooting

### Google Ratings Not Showing

**Possible Causes:**

1. **API Key Not Configured**
   ```
   ⚠️  GOOGLE_PLACES_API_KEY not set in environment variables
   ```
   **Solution:** Add `GOOGLE_PLACES_API_KEY` to your `.env` file

2. **Google Integration Disabled**
   ```
   🔍 Google integration disabled, skipping ratings fetch
   ```
   **Solution:** Enable it via `PUT /api/v1/businesses/:id/google-integration`

3. **No Place ID Linked**
   ```
   🔍 No Google Place ID, skipping ratings fetch
   ```
   **Solution:** Link a Google Place ID via the update endpoint

4. **Invalid Place ID**
   ```
   ❌ [GOOGLE PLACES] API error: INVALID_REQUEST
   ```
   **Solution:** Verify your Place ID is correct

5. **API Quota Exceeded**
   ```
   ❌ [GOOGLE PLACES] API error: OVER_QUERY_LIMIT
   ```
   **Solution:** Implement caching or upgrade your Google Cloud plan

### Internal Ratings Showing as 0

**Possible Causes:**

1. **No Ratings Submitted Yet**
   - This is expected for new businesses
   - Wait for customers to submit ratings

2. **Rating Cache Not Updated**
   - Ratings exist but cache is stale
   - **Solution:** Call `POST /api/v1/businesses/:id/ratings/refresh-cache`

3. **Rating Cache Sync Issues**
   - Run the sync script: `node sync-rating-cache.js`

## Benefits of Dual Rating System

### For Business Owners
- **Control**: Full control over internal ratings (can moderate, respond, etc.)
- **Transparency**: Show both your platform ratings AND Google ratings
- **Trust**: Customers see you're not hiding Google reviews
- **Credibility**: Multiple rating sources increase trust

### For Customers
- **Complete Picture**: See ratings from both sources
- **Transparency**: Can compare ratings across platforms
- **Trust**: Multiple data points for decision-making

## Best Practices

1. **Display Both Ratings Side-by-Side**
   - Make it clear which is which
   - Label them appropriately ("Our Platform" vs "Google Maps")

2. **Cache Google Ratings**
   - Google ratings don't change frequently
   - Cache for 6-24 hours to minimize API costs

3. **Handle Missing Data Gracefully**
   - Google ratings may not be available
   - Always show internal ratings, Google ratings as bonus

4. **Keep Internal Ratings Cache Fresh**
   - Automatically update on new rating submission
   - Periodically sync to ensure accuracy

## Support

For issues or questions:
- Check the server logs for detailed error messages
- Verify your Google Places API key is valid
- Ensure the Place ID is correct
- Check API quota in Google Cloud Console
