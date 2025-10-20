# Google Maps Coordinate-Based Integration

## Overview

This document explains the coordinate-based Google Maps integration which provides more reliable and accurate map embedding compared to CID (Customer ID) based integration.

## Why Coordinates Work Better Than CID

### Problems with CID-Based Embedding:
❌ Shows general area instead of exact business location
❌ May not display the business marker/pin correctly
❌ Less reliable for precise location visualization

### Benefits of Coordinate-Based Embedding:
✅ Shows the **exact location pin** at your business address
✅ Works reliably without any API key
✅ No rate limits or authentication needed
✅ More accurate map visualization in all scenarios
✅ Consistent display across all devices and browsers

## How It Works

### 1. Coordinate Extraction

When you provide a Google Maps URL, the system automatically extracts:
- **Latitude and Longitude** from the URL pattern `@lat,lng,zoom`
- Example: `@39.4241497,29.9899777,17z` extracts lat=39.4241497, lng=29.9899777

### 2. Storage

The coordinates are stored in your business profile:
- `latitude`: Decimal degrees (e.g., 39.4241497)
- `longitude`: Decimal degrees (e.g., 29.9899777)

### 3. URL Generation Priority

The system generates URLs with this priority:

**PRIORITY 1: Coordinates** (if available)
```
Embed URL: https://maps.google.com/maps?q=39.4241497,29.9899777&output=embed&z=17
Maps URL: https://www.google.com/maps?q=39.4241497,29.9899777
```

**FALLBACK: Place ID or CID** (if coordinates not available)
```
Embed URL: https://maps.google.com/maps?cid=14656442647188592&output=embed
```

## API Usage

### Updating Google Integration with URL

**Request:**
```http
PUT /api/v1/businesses/{businessId}/google-integration
Content-Type: application/json

{
  "googleUrl": "https://www.google.com/maps/place/Your+Business/@39.4241497,29.9899777,17z/data=...",
  "enabled": true
}
```

**What Happens:**
1. System extracts coordinates: `lat=39.4241497`, `lng=29.9899777`
2. System also extracts Place ID if present
3. Coordinates and Place ID are both stored
4. Business location is updated

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Google integration updated successfully",
  "data": {
    "business": {
      "id": "biz_xxx",
      "name": "Your Business",
      "latitude": 39.4241497,
      "longitude": 29.9899777,
      "googlePlaceId": "0x14c94904b01833f1:0x3411f4f9a81471",
      "googleIntegrationEnabled": true,
      "googleLinkedAt": "2025-10-15T20:06:03.663Z"
    }
  }
}
```

### Getting Google Integration Settings

**Request:**
```http
GET /api/v1/businesses/{businessId}/google-integration
```

**Response with Coordinates (Recommended):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Google integration settings retrieved successfully",
  "data": {
    "googlePlaceId": "0x14c94904b01833f1:0x3411f4f9a81471",
    "googleIntegrationEnabled": true,
    "googleLinkedAt": "2025-10-15T20:06:03.663Z",
    "latitude": 39.4241497,
    "longitude": 29.9899777,
    "urls": {
      "maps": "https://www.google.com/maps?q=39.4241497,29.9899777",
      "reviews": "https://www.google.com/maps?cid=14656442647188592",
      "writeReview": "https://www.google.com/maps?cid=14656442647188592",
      "embed": "https://maps.google.com/maps?q=39.4241497,29.9899777&output=embed&z=17"
    }
  }
}
```

## Frontend Integration

### Embedding the Map

Use the coordinate-based embed URL for the most reliable results:

```html
<iframe
  width="600"
  height="450"
  style="border:0"
  loading="lazy"
  allowfullscreen
  referrerpolicy="no-referrer-when-downgrade"
  src="https://maps.google.com/maps?q=39.4241497,29.9899777&output=embed&z=17">
</iframe>
```

### React Component Example

```tsx
import React from 'react';

interface GoogleMapEmbedProps {
  latitude: number;
  longitude: number;
  businessName?: string;
  width?: string | number;
  height?: string | number;
}

export const GoogleMapEmbed: React.FC<GoogleMapEmbedProps> = ({
  latitude,
  longitude,
  businessName,
  width = '100%',
  height = 450,
}) => {
  const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&output=embed&z=17`;

  return (
    <div className="google-map-embed">
      <iframe
        width={width}
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={embedUrl}
        title={businessName ? `Map of ${businessName}` : 'Business location map'}
      />
    </div>
  );
};

// Usage
function BusinessPage({ business }) {
  return (
    <div>
      <h1>{business.name}</h1>
      {business.latitude && business.longitude && (
        <GoogleMapEmbed
          latitude={business.latitude}
          longitude={business.longitude}
          businessName={business.name}
        />
      )}
    </div>
  );
}
```

## Testing Your Integration

### Step 1: Get Your Business Google Maps URL

1. Open Google Maps
2. Search for your business
3. Click on your business
4. Copy the URL from the browser address bar
   - It should look like: `https://www.google.com/maps/place/.../@39.4241497,29.9899777,17z/...`

### Step 2: Update Your Business Integration

```bash
curl -X PUT https://your-api.com/api/v1/businesses/YOUR_BUSINESS_ID/google-integration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "googleUrl": "YOUR_GOOGLE_MAPS_URL",
    "enabled": true
  }'
```

### Step 3: Verify the Integration

```bash
curl https://your-api.com/api/v1/businesses/YOUR_BUSINESS_ID/google-integration
```

Check the response:
- ✅ `latitude` and `longitude` should be present
- ✅ `urls.embed` should use coordinates: `?q=lat,lng&output=embed`
- ✅ Test the embed URL in a browser to see the exact pin location

## Troubleshooting

### No Coordinates Extracted

**Problem:** Response doesn't include `latitude` and `longitude`

**Solution:** 
- Make sure your Google Maps URL includes the `@lat,lng,zoom` pattern
- Try zooming in on your business and copying the URL again
- The URL should look like: `.../@39.424,29.989,17z/...`

### Map Shows Wrong Location

**Problem:** Embedded map doesn't show your business

**Solution:**
1. Verify coordinates in the API response are correct
2. Open the embed URL in a browser to test it directly
3. Update with a fresh Google Maps URL
4. Ensure you're zoomed in to your exact business location before copying the URL

### Embed URL Still Using CID

**Problem:** `urls.embed` is using `?cid=...` instead of `?q=lat,lng`

**Solution:**
- This means coordinates weren't extracted from the URL
- Re-update your integration with a Google Maps URL that includes coordinates
- Look for the `@lat,lng,zoom` pattern in your URL

## Technical Implementation Details

### Coordinate Extraction Regex

```typescript
// Pattern: @lat,lng,zoom
const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*z)/);
```

### Database Schema

The following fields store the Google integration data:

```prisma
model Business {
  // ... other fields
  
  // Coordinates for accurate map embedding
  latitude              Float?
  longitude             Float?
  
  // Google integration
  googlePlaceId         String?
  googleIntegrationEnabled Boolean @default(false)
  googleLinkedAt        DateTime?
  googleLinkedBy        String?
}
```

### URL Generation Logic

```typescript
// Priority 1: Use coordinates if available
if (latitude && longitude) {
  embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
}
// Priority 2: Fallback to CID/Place ID
else if (googlePlaceId) {
  embedUrl = `https://maps.google.com/maps?cid=${cid}&output=embed`;
}
```

## Migration from CID-Based Integration

If you have existing businesses using CID-based integration:

1. **They will continue to work** - The fallback logic ensures backward compatibility
2. **To upgrade to coordinates:**
   - Update each business with a fresh Google Maps URL
   - The system will automatically extract and store coordinates
   - Future API calls will return coordinate-based URLs

## Best Practices

✅ **Always extract coordinates** - Provide the full Google Maps URL, not just the Place ID
✅ **Zoom in before copying** - Get the most accurate coordinates by zooming in on your exact location
✅ **Test the embed URL** - Always verify the generated embed URL shows the correct location
✅ **Update if location changes** - Re-update the integration if your business moves
✅ **Use coordinate-based URLs** - Prioritize using the coordinates from the API response

## Support

For issues or questions:
- Check the console logs for coordinate extraction debug information
- Verify your Google Maps URL format
- Contact technical support with your business ID and Google Maps URL

---

**Last Updated:** October 2025  
**API Version:** v1




