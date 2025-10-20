import axios from 'axios';
import { config } from '../../config/environment';

export interface GooglePlaceDetails {
  rating: number | null;
  userRatingsTotal: number;
  reviews?: GoogleReview[];
  name?: string;
  formattedAddress?: string;
  website?: string;
  phoneNumber?: string;
}

export interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  relativeTimeDescription: string;
}

interface GooglePlacesApiResponse {
  status: string;
  result?: any;
  error_message?: string;
}

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = config.GOOGLE_PLACES_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️  GOOGLE_PLACES_API_KEY not set in environment variables');
    }
  }

  /**
   * Fetch place details from Google Places API
   * @param placeId Google Place ID
   * @returns Place details including ratings
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    if (!this.apiKey) {
      console.error('❌ Google Places API key not configured');
      return null;
    }

    if (!placeId) {
      console.error('❌ Place ID is required');
      return null;
    }

    try {
      console.log(`🔍 [GOOGLE PLACES] Fetching details for place ID: ${placeId}`);

      const response = await axios.get<GooglePlacesApiResponse>(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,reviews,formatted_address,website,formatted_phone_number',
          key: this.apiKey
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.status !== 'OK') {
        console.error(`❌ [GOOGLE PLACES] API error: ${response.data.status}`, response.data.error_message);
        return null;
      }

      const result = response.data.result;

      const placeDetails: GooglePlaceDetails = {
        rating: result?.rating || null,
        userRatingsTotal: result?.user_ratings_total || 0,
        reviews: result?.reviews?.slice(0, 5).map((review: any) => ({
          authorName: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
          relativeTimeDescription: review.relative_time_description
        })),
        name: result?.name,
        formattedAddress: result?.formatted_address,
        website: result?.website,
        phoneNumber: result?.formatted_phone_number
      };

      console.log(`✅ [GOOGLE PLACES] Successfully fetched details:`, {
        rating: placeDetails.rating,
        totalRatings: placeDetails.userRatingsTotal,
        reviewCount: placeDetails.reviews?.length || 0
      });

      return placeDetails;

    } catch (error: any) {
      if (error.response) {
        // Axios error with response
        console.error('❌ [GOOGLE PLACES] API request failed:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      } else if (error.message) {
        // Regular error
        console.error('❌ [GOOGLE PLACES] Error:', error.message);
      } else {
        console.error('❌ [GOOGLE PLACES] Unexpected error:', error);
      }
      return null;
    }
  }

  /**
   * Check if the Google Places API is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate Google Maps URLs for a place
   */
  generateUrls(placeId: string): {
    maps: string;
    reviews: string;
    writeReview: string;
    embed: string;
  } {
    return {
      maps: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      reviews: `https://search.google.com/local/reviews?placeid=${placeId}`,
      writeReview: `https://search.google.com/local/writereview?placeid=${placeId}`,
      embed: `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=place_id:${placeId}`
    };
  }
}
