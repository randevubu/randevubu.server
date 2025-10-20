# Frontend Rating System Integration Guide

## Overview

This guide explains how to integrate the dual rating system (internal + Google) into your frontend application. The system provides both internal ratings from your customers and optional Google integration for displaying Google reviews.

## Features

### Internal Rating System
- Customers can rate businesses after completing appointments (1-5 stars)
- Only completed appointments can be rated
- One rating per appointment
- Optional comments and anonymous ratings
- Real-time average rating calculation

### Google Integration
- Business owners can link their Google Place ID
- Toggle Google widget visibility on/off
- Display Google Maps embed and review links
- Zero API costs (uses free Google Embed API)

## API Endpoints

### Rating Endpoints

#### Submit Rating
```http
POST /api/v1/businesses/{businessId}/ratings
Authorization: Bearer {token}
Content-Type: application/json

{
  "appointmentId": "appt_123456789",
  "rating": 5,
  "comment": "Excellent service!",
  "isAnonymous": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "rating": {
      "id": "eval_1234567890_abc123",
      "customerId": "user_123",
      "businessId": "biz_456",
      "appointmentId": "appt_123456789",
      "rating": 5,
      "comment": "Excellent service!",
      "isAnonymous": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "customer": {
        "id": "user_123",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }
}
```

#### Get Business Ratings
```http
GET /api/v1/businesses/{businessId}/ratings?page=1&limit=10&minRating=4
```

**Response:**
```json
{
  "success": true,
  "message": "Ratings retrieved successfully",
  "data": {
    "ratings": [
      {
        "id": "eval_1234567890_abc123",
        "customerId": "user_123",
        "businessId": "biz_456",
        "appointmentId": "appt_123456789",
        "rating": 5,
        "comment": "Excellent service!",
        "isAnonymous": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "customer": {
          "id": "user_123",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "averageRating": 4.6
  }
}
```

#### Check Rating Eligibility
```http
GET /api/v1/businesses/{businessId}/appointments/{appointmentId}/can-rate
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating eligibility checked",
  "data": {
    "canRate": true
  }
}
```

#### Get User's Rating for Appointment
```http
GET /api/v1/appointments/{appointmentId}/rating
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating retrieved successfully",
  "data": {
    "rating": {
      "id": "eval_1234567890_abc123",
      "rating": 5,
      "comment": "Great service!",
      "isAnonymous": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Refresh Rating Cache
```http
POST /api/v1/businesses/{businessId}/ratings/refresh-cache
```

This endpoint manually recalculates and updates the rating cache for a business. Useful for fixing inconsistencies or initializing the cache for existing ratings.

**Response:**
```json
{
  "success": true,
  "message": "Rating cache refreshed successfully",
  "data": {
    "averageRating": 4.6,
    "totalRatings": 25,
    "lastRatingAt": "2024-01-15T10:30:00Z"
  }
}
```

### Google Integration Endpoints

#### Update Google Integration
```http
PUT /api/v1/businesses/{businessId}/google-integration
Authorization: Bearer {token}
Content-Type: application/json

{
  "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google integration updated successfully",
  "data": {
    "business": {
      "id": "biz_456",
      "name": "My Business",
      "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "googleIntegrationEnabled": true,
      "googleLinkedAt": "2024-01-15T10:30:00Z",
      "averageRating": 4.6,
      "totalRatings": 25
    }
  }
}
```

#### Get Google Integration Settings
```http
GET /api/v1/businesses/{businessId}/google-integration
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Google integration settings retrieved successfully",
  "data": {
    "googlePlaceId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "googleIntegrationEnabled": true,
    "googleLinkedAt": "2024-01-15T10:30:00Z",
    "urls": {
      "maps": "https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4",
      "reviews": "https://search.google.com/local/reviews?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
      "writeReview": "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
      "embed": "https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4"
    }
  }
}
```

## Frontend Implementation Examples

### React/TypeScript Components

#### Rating Display Component
```tsx
interface BusinessRatingsProps {
  businessId: string;
  averageRating: number;
  totalRatings: number;
  googleIntegration?: {
    isEnabled: boolean;
    urls?: {
      maps: string;
      reviews: string;
      writeReview: string;
      embed: string;
    };
  };
}

export const BusinessRatings: React.FC<BusinessRatingsProps> = ({
  businessId,
  averageRating,
  totalRatings,
  googleIntegration
}) => {
  return (
    <div className="business-ratings">
      {/* Internal Ratings */}
      <div className="internal-ratings">
        <div className="rating-display">
          <span className="stars">⭐</span>
          <span className="rating">{averageRating.toFixed(1)}</span>
          <span className="count">({totalRatings} reviews)</span>
        </div>
      </div>

      {/* Google Integration (if enabled) */}
      {googleIntegration?.isEnabled && googleIntegration.urls && (
        <div className="google-integration">
          <div className="google-widget">
            <iframe
              src={googleIntegration.urls.embed}
              width="100%"
              height="200"
              frameBorder="0"
              allowFullScreen
              title="Google Maps"
            />
          </div>
          <div className="google-links">
            <a 
              href={googleIntegration.urls.maps} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              View on Google Maps
            </a>
            <a 
              href={googleIntegration.urls.reviews} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              View Google Reviews
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### Rating Submission Form
```tsx
interface RatingFormProps {
  businessId: string;
  appointmentId: string;
  onRatingSubmitted: (rating: any) => void;
}

export const RatingForm: React.FC<RatingFormProps> = ({
  businessId,
  appointmentId,
  onRatingSubmitted
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          appointmentId,
          rating,
          comment: comment.trim() || undefined,
          isAnonymous
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onRatingSubmitted(data.data.rating);
        // Reset form
        setRating(0);
        setComment('');
        setIsAnonymous(false);
      } else {
        throw new Error(data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rating-form">
      <div className="rating-input">
        <label>Rate your experience:</label>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      <div className="comment-input">
        <label htmlFor="comment">Comment (optional):</label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="Tell us about your experience..."
        />
        <small>{comment.length}/1000 characters</small>
      </div>

      <div className="anonymous-option">
        <label>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          Submit anonymously
        </label>
      </div>

      <button 
        type="submit" 
        disabled={rating === 0 || isSubmitting}
        className="btn btn-primary"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </form>
  );
};
```

#### Rating Eligibility Check
```tsx
export const useRatingEligibility = (businessId: string, appointmentId: string) => {
  const [eligibility, setEligibility] = useState<{
    canRate: boolean;
    reason?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const response = await fetch(
          `/api/v1/businesses/${businessId}/appointments/${appointmentId}/can-rate`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        const data = await response.json();
        setEligibility(data.data);
      } catch (error) {
        console.error('Error checking rating eligibility:', error);
        setEligibility({ canRate: false, reason: 'Error checking eligibility' });
      } finally {
        setLoading(false);
      }
    };

    if (businessId && appointmentId) {
      checkEligibility();
    }
  }, [businessId, appointmentId]);

  return { eligibility, loading };
};
```

#### Google Integration Settings
```tsx
interface GoogleIntegrationSettingsProps {
  businessId: string;
  currentSettings?: {
    googlePlaceId?: string;
    googleIntegrationEnabled: boolean;
    googleLinkedAt?: string;
  };
}

export const GoogleIntegrationSettings: React.FC<GoogleIntegrationSettingsProps> = ({
  businessId,
  currentSettings
}) => {
  const [placeId, setPlaceId] = useState(currentSettings?.googlePlaceId || '');
  const [enabled, setEnabled] = useState(currentSettings?.googleIntegrationEnabled || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/v1/businesses/${businessId}/google-integration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          googlePlaceId: placeId.trim() || undefined,
          enabled
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Google integration settings saved successfully!');
      } else {
        throw new Error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving Google integration:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="google-integration-settings">
      <h3>Google Integration Settings</h3>
      
      <div className="form-group">
        <label htmlFor="placeId">Google Place ID:</label>
        <input
          id="placeId"
          type="text"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
          disabled={!enabled}
        />
        <small>
          Find your Google Place ID by searching for your business on Google Maps and copying the Place ID from the URL.
        </small>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable Google integration
        </label>
        <small>
          When enabled, customers will see your Google Maps location and reviews.
        </small>
      </div>

      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="btn btn-primary"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};
```

### CSS Styles

```css
/* Rating Display */
.business-ratings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.internal-ratings .rating-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
}

.internal-ratings .stars {
  font-size: 1.5rem;
}

.internal-ratings .rating {
  font-weight: bold;
  color: #f59e0b;
}

.internal-ratings .count {
  color: #6b7280;
}

/* Google Integration */
.google-integration {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.google-widget iframe {
  border-radius: 0.375rem;
}

.google-links {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Rating Form */
.rating-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
}

.star-rating {
  display: flex;
  gap: 0.25rem;
}

.star-rating .star {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.star-rating .star:hover,
.star-rating .star.active {
  transform: scale(1.1);
}

.star-rating .star.active {
  filter: drop-shadow(0 0 4px #f59e0b);
}

.comment-input textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  resize: vertical;
}

.anonymous-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Google Integration Settings */
.google-integration-settings {
  max-width: 600px;
}

.google-integration-settings .form-group {
  margin-bottom: 1rem;
}

.google-integration-settings input[type="text"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.google-integration-settings small {
  display: block;
  color: #6b7280;
  margin-top: 0.25rem;
}
```

## Business Rules

### Rating Eligibility
- User must be the customer of the appointment
- Appointment must be COMPLETED
- One rating per appointment
- Cannot rate own business

### Google Integration
- Only business owner can link/unlink
- Can toggle visibility without unlinking
- Place ID must be unique across platform
- Requires Google Maps Embed API key in environment

### Rating Display
- Internal ratings always visible
- Google widget only if enabled by owner
- Both ratings displayed side-by-side

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "rating": "Rating must be between 1 and 5"
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Business or appointment not found
- `ALREADY_RATED`: User already rated this appointment
- `APPOINTMENT_NOT_COMPLETED`: Cannot rate incomplete appointment

## Environment Variables

Add to your `.env` file:
```env
GOOGLE_MAPS_EMBED_KEY=your_google_maps_embed_api_key
```

## Testing

### Manual Testing Checklist
- [ ] Submit rating for completed appointment
- [ ] Verify cannot rate incomplete appointment
- [ ] Verify cannot rate twice
- [ ] Verify rating updates business average
- [ ] Link Google Place ID
- [ ] Toggle Google integration on/off
- [ ] Verify Google widget displays correctly
- [ ] Test duplicate Place ID prevention

## Cost Analysis

- **Internal Ratings**: $0 (uses existing database)
- **Google Widget**: $0 (free embed API)
- **Total**: $0 forever ✅

## Troubleshooting

### Rating Values Returning as 0

If `averageRating`, `totalRatings`, and `lastRatingAt` are all returning 0 or null, this usually means:

1. **No ratings have been submitted yet** - This is expected for new businesses
2. **Rating cache not initialized** - Ratings exist but the cache wasn't updated

**Solutions:**

**Option 1: Use the API endpoint to refresh the cache**
```bash
curl -X POST http://localhost:3000/api/v1/businesses/{businessId}/ratings/refresh-cache
```

**Option 2: Run the synchronization script**
```bash
cd randevubu.server
node sync-rating-cache.js
```

This script will:
- Find all businesses with CustomerEvaluation records
- Recalculate average rating, total count, and last rating date
- Update the Business table with the cached values

**Option 3: Submit a new rating**
The cache is automatically updated when a new rating is submitted via the API.

### Verifying the Cache is Working

After submitting a rating or running the sync script, check the business details:
```bash
curl http://localhost:3000/api/v1/businesses/{businessId}/google-integration
```

You should see:
```json
{
  "averageRating": 4.5,
  "totalRatings": 10,
  "lastRatingAt": "2024-01-15T10:30:00Z"
}
```

### Common Issues

1. **Cache not updating after rating submission**
   - Check server logs for errors in the `updateRatingCache` method
   - Verify database permissions

2. **Values still 0 after sync**
   - Confirm CustomerEvaluation records exist in the database
   - Check that businessId matches between records

3. **Permission errors on sync script**
   - Ensure DATABASE_URL is correctly set in `.env`
   - Verify database credentials are valid

## Support

For questions or issues with the rating system integration, please refer to the API documentation or contact the development team.
