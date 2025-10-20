# Frontend Google Maps Integration Guide

## Overview

The backend now supports coordinate-based Google Maps integration with automatic URL extraction. This guide explains what the frontend should expect from the API.

---

## 🎯 What Changed

### New Database Field
- `googleOriginalUrl` - Stores the original Google Maps URL provided by the user

### Enhanced Functionality
- Automatic coordinate extraction from Google Maps URLs
- Automatic Place ID extraction
- Smart URL generation based on what data is available
- Multiple fallback strategies for maximum compatibility

---

## 📡 API Endpoints

### 1. Get Google Integration Settings

**Endpoint:** `GET /api/v1/businesses/:id/google-integration`

**Authentication:** ❌ Not required (Public endpoint)

**Response Structure:**

```typescript
interface GoogleIntegrationResponse {
  success: true;
  statusCode: 200;
  message: "Google integration settings retrieved successfully";
  data: {
    googlePlaceId: string | null;
    googleOriginalUrl: string | null;
    googleIntegrationEnabled: boolean;
    googleLinkedAt: string | null;  // ISO 8601 datetime
    latitude: number | null;
    longitude: number | null;
    urls?: {
      maps: string;        // URL to open business in Google Maps
      reviews: string;     // URL to view reviews
      writeReview: string; // URL to write a review
      embed: string;       // URL for iframe embedding
    };
  };
}
```

**Example Response (With Original URL - BEST CASE):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Google integration settings retrieved successfully",
  "data": {
    "googlePlaceId": "0x14c94904b01833f1:0x3411f4f9a81471",
    "googleOriginalUrl": "https://www.google.com/maps/place/Your+Business/@39.4241497,29.9899777,17z/data=...",
    "googleIntegrationEnabled": true,
    "googleLinkedAt": "2025-10-15T20:06:03.663Z",
    "latitude": 39.4241497,
    "longitude": 29.9899777,
    "urls": {
      "maps": "https://www.google.com/maps/place/Your+Business/@39.4241497,29.9899777,17z/data=...",
      "reviews": "https://www.google.com/maps/place/Your+Business/@39.4241497,29.9899777,17z/data=...",
      "writeReview": "https://www.google.com/maps/place/Your+Business/@39.4241497,29.9899777,17z/data=...",
      "embed": "https://maps.google.com/maps?q=39.4241497,29.9899777&output=embed&z=17"
    }
  }
}
```

**Example Response (With Coordinates Only):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Google integration settings retrieved successfully",
  "data": {
    "googlePlaceId": null,
    "googleOriginalUrl": null,
    "googleIntegrationEnabled": true,
    "googleLinkedAt": "2025-10-15T20:06:03.663Z",
    "latitude": 39.4241497,
    "longitude": 29.9899777,
    "urls": {
      "maps": "https://www.google.com/maps?q=39.4241497,29.9899777",
      "reviews": "https://www.google.com/maps?q=39.4241497,29.9899777",
      "writeReview": "https://www.google.com/maps?q=39.4241497,29.9899777",
      "embed": "https://maps.google.com/maps?q=39.4241497,29.9899777&output=embed&z=17"
    }
  }
}
```

**Example Response (Integration Disabled):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Google integration settings retrieved successfully",
  "data": {
    "googlePlaceId": null,
    "googleOriginalUrl": null,
    "googleIntegrationEnabled": false,
    "googleLinkedAt": null,
    "latitude": null,
    "longitude": null
    // No "urls" field when disabled
  }
}
```

---

### 2. Update Google Integration

**Endpoint:** `PUT /api/v1/businesses/:businessId/google-integration`

**Authentication:** ✅ Required (Business owner or authorized staff)

**Request Body:**

```typescript
interface UpdateGoogleIntegrationRequest {
  googleUrl: string;  // Full Google Maps URL from browser
  enabled: boolean;
}
```

**Example Request:**

```json
{
  "googleUrl": "https://www.google.com/maps/place/Your+Business/@39.4241497,29.9899777,17z/data=!3m1!4b1!4m6!3m5!1s0x14c94904b01833f1:0x3411f4f9a81471!8m2!3d39.4241497!4d29.9899777!16s%2Fg%2F11y2r8c8wq",
  "enabled": true
}
```

**What Happens Automatically:**
1. ✅ Extracts coordinates from URL pattern `@lat,lng,zoom`
2. ✅ Extracts Place ID from URL pattern (if present)
3. ✅ Stores both the original URL and extracted data
4. ✅ Updates business location if coordinates found
5. ✅ Generates optimized URLs for frontend use

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
      "googleOriginalUrl": "https://www.google.com/maps/place/...",
      "googleIntegrationEnabled": true,
      "googleLinkedAt": "2025-10-15T20:06:03.663Z"
    }
  }
}
```

---

## 🎨 Frontend Implementation

### React Component Example

```tsx
import React, { useEffect, useState } from 'react';

interface GoogleIntegration {
  googlePlaceId: string | null;
  googleOriginalUrl: string | null;
  googleIntegrationEnabled: boolean;
  googleLinkedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  urls?: {
    maps: string;
    reviews: string;
    writeReview: string;
    embed: string;
  };
}

interface BusinessMapProps {
  businessId: string;
  height?: string | number;
  width?: string | number;
}

export const BusinessGoogleMap: React.FC<BusinessMapProps> = ({
  businessId,
  height = 450,
  width = '100%',
}) => {
  const [integration, setIntegration] = useState<GoogleIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoogleIntegration = async () => {
      try {
        const response = await fetch(
          `/api/v1/businesses/${businessId}/google-integration`
        );
        const data = await response.json();
        
        if (data.success) {
          setIntegration(data.data);
        } else {
          setError('Failed to load Google Maps integration');
        }
      } catch (err) {
        setError('Error loading map');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoogleIntegration();
  }, [businessId]);

  if (loading) {
    return <div>Loading map...</div>;
  }

  if (error || !integration) {
    return <div>Map unavailable</div>;
  }

  // Check if integration is enabled and has embed URL
  if (!integration.googleIntegrationEnabled || !integration.urls?.embed) {
    return <div>Google Maps not configured for this business</div>;
  }

  return (
    <div className="business-map">
      <iframe
        width={width}
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={integration.urls.embed}
        title="Business location map"
      />
      
      {/* Optional: Links to open in Google Maps */}
      <div className="map-actions">
        <a 
          href={integration.urls.maps} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Open in Google Maps
        </a>
        
        <a 
          href={integration.urls.reviews} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          View Reviews
        </a>
        
        <a 
          href={integration.urls.writeReview} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Write a Review
        </a>
      </div>
    </div>
  );
};
```

---

## 📝 Business Listing Pages

### Important: Business List/Details Endpoints

The regular business endpoints (`GET /api/v1/businesses`, `GET /api/v1/businesses/:id`) **DO** include:
- ✅ `latitude` (number | null)
- ✅ `longitude` (number | null)

But **DO NOT** include:
- ❌ `googlePlaceId`
- ❌ `googleOriginalUrl`
- ❌ `googleIntegrationEnabled`
- ❌ Generated URLs

### Use Case 1: Show Map on Business Card (List View)

```tsx
interface Business {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  // ... other fields
}

const BusinessCard: React.FC<{ business: Business }> = ({ business }) => {
  // Simple inline map using coordinates from business list
  const embedUrl = business.latitude && business.longitude
    ? `https://maps.google.com/maps?q=${business.latitude},${business.longitude}&output=embed&z=15`
    : null;

  return (
    <div className="business-card">
      <h3>{business.name}</h3>
      
      {embedUrl && (
        <div className="mini-map">
          <iframe
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            src={embedUrl}
          />
        </div>
      )}
    </div>
  );
};
```

### Use Case 2: Show Full Map with Actions (Detail View)

```tsx
const BusinessDetailPage: React.FC<{ businessId: string }> = ({ businessId }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [googleIntegration, setGoogleIntegration] = useState<GoogleIntegration | null>(null);

  useEffect(() => {
    // Fetch business details
    fetch(`/api/v1/businesses/${businessId}`)
      .then(res => res.json())
      .then(data => setBusiness(data.data));

    // Fetch Google integration separately for full features
    fetch(`/api/v1/businesses/${businessId}/google-integration`)
      .then(res => res.json())
      .then(data => setGoogleIntegration(data.data));
  }, [businessId]);

  return (
    <div>
      <h1>{business?.name}</h1>
      
      {/* Use the full GoogleMap component with actions */}
      <BusinessGoogleMap businessId={businessId} />
    </div>
  );
};
```

---

## 🔄 URL Generation Priority

The backend uses the following priority for generating URLs:

### Priority 1: Original URL (BEST) 🥇
When `googleOriginalUrl` is stored:
- `maps` → Original URL (full business profile with all info)
- `reviews` → Original URL
- `writeReview` → Original URL
- `embed` → Coordinate-based if available, otherwise original URL

### Priority 2: Coordinates (RELIABLE) 🥈
When `latitude` and `longitude` are available:
- `maps` → `https://www.google.com/maps?q={lat},{lng}`
- `reviews` → Same as maps
- `writeReview` → Same as maps
- `embed` → `https://maps.google.com/maps?q={lat},{lng}&output=embed&z=17`

### Priority 3: Place ID/CID (FALLBACK) 🥉
When only `googlePlaceId` is available:
- Uses appropriate format based on ID type (CID or Place ID)
- May show general area instead of exact pin

---

## ✅ Frontend Checklist

### For Business Owners (Settings Page)

```tsx
const GoogleIntegrationSettings: React.FC = () => {
  const [googleUrl, setGoogleUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  const handleSubmit = async () => {
    const response = await fetch(
      `/api/v1/businesses/${businessId}/google-integration`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ googleUrl, enabled })
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      // Show success message
      alert('Google Maps integration updated!');
      
      // Show extracted data
      console.log('Coordinates:', data.data.business.latitude, data.data.business.longitude);
      console.log('Place ID:', data.data.business.googlePlaceId);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <label>
        Google Maps URL:
        <input
          type="url"
          value={googleUrl}
          onChange={(e) => setGoogleUrl(e.target.value)}
          placeholder="Paste your Google Maps URL here"
        />
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable Google Maps integration
      </label>
      
      <button type="submit">Save</button>
      
      <div className="help-text">
        📍 How to get your Google Maps URL:
        <ol>
          <li>Open Google Maps</li>
          <li>Search for your business</li>
          <li>Click on your business</li>
          <li>Copy the URL from the browser address bar</li>
        </ol>
      </div>
    </form>
  );
};
```

### For Public Pages (Business Profile)

- ✅ Use the dedicated endpoint for full map features
- ✅ Check `googleIntegrationEnabled` before showing map
- ✅ Handle `urls` field being undefined (when disabled)
- ✅ Always include error boundaries for iframe loading
- ✅ Add loading states for better UX

### For List Pages

- ✅ Use `latitude` and `longitude` from business list
- ✅ Generate simple embed URLs on the fly
- ✅ Keep maps small (mini preview)
- ✅ No need to call the google-integration endpoint

---

## 🐛 Error Handling

```tsx
// Example error handling
const fetchGoogleIntegration = async (businessId: string) => {
  try {
    const response = await fetch(
      `/api/v1/businesses/${businessId}/google-integration`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch integration');
    }
    
    // Check if integration is actually enabled
    if (!data.data.googleIntegrationEnabled) {
      return { 
        enabled: false, 
        message: 'Google Maps not configured' 
      };
    }
    
    // Check if we have URLs to display
    if (!data.data.urls) {
      return { 
        enabled: false, 
        message: 'Google Maps data incomplete' 
      };
    }
    
    return { enabled: true, data: data.data };
    
  } catch (error) {
    console.error('Error fetching Google integration:', error);
    return { 
      enabled: false, 
      message: 'Failed to load map' 
    };
  }
};
```

---

## 🎯 Key Takeaways

1. **Two Ways to Show Maps:**
   - **Simple:** Use `latitude`/`longitude` from business data (list views)
   - **Full:** Use `/google-integration` endpoint (detail views with actions)

2. **Always Check:**
   - `googleIntegrationEnabled` before showing map
   - `urls` field exists before accessing URLs
   - Handle null coordinates gracefully

3. **Best Practices:**
   - Use the `embed` URL for iframes
   - Use the `maps` URL for "Open in Google Maps" buttons
   - Use `reviews` and `writeReview` for review actions
   - Add appropriate error handling and loading states

4. **No API Keys Required:**
   - All URLs work without any Google API keys
   - No rate limits or authentication needed
   - Completely free to use

---

## 📞 Support

For questions or issues:
- Check the browser console for detailed logs
- Verify the Google Maps URL format
- Contact backend team with business ID and error details

---

**Last Updated:** October 2025  
**API Version:** v1




