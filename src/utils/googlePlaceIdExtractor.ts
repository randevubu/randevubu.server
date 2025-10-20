/**
 * Utility to extract Google Place ID and coordinates from various URL formats
 */

export class GooglePlaceIdExtractor {
  /**
   * Extract coordinates from Google Maps URL
   * Extracts coordinates that come AFTER the Place ID (!1s...) - these are the actual business location
   */
  static extractCoordinates(url: string): { lat: number; lng: number } | null {
    try {
      // Find the Place ID position first
      const placeIdMatch = url.match(/!1s([^!&]+)/);
      
      if (placeIdMatch) {
        // Get everything AFTER the Place ID
        const afterPlaceId = url.substring(url.indexOf(placeIdMatch[0]) + placeIdMatch[0].length);
        
        // Extract the FIRST !3d and !4d coordinates that appear AFTER the Place ID
        // These are the actual business location coordinates
        const latMatch = afterPlaceId.match(/!3d(-?\d+\.\d+)/);
        const lngMatch = afterPlaceId.match(/!4d(-?\d+\.\d+)/);
        
        if (latMatch && lngMatch) {
          return {
            lat: parseFloat(latMatch[1]),
            lng: parseFloat(lngMatch[1])
          };
        }
      }
      
      // FALLBACK 1: Try to get ANY !3d and !4d (last occurrence)
      const allLatMatches = [...url.matchAll(/!3d(-?\d+\.\d+)/g)];
      const allLngMatches = [...url.matchAll(/!4d(-?\d+\.\d+)/g)];
      
      if (allLatMatches.length > 0 && allLngMatches.length > 0) {
        // Take the LAST occurrence (usually the business location)
        const lastLat = allLatMatches[allLatMatches.length - 1];
        const lastLng = allLngMatches[allLngMatches.length - 1];
        
        return {
          lat: parseFloat(lastLat[1]),
          lng: parseFloat(lastLng[1])
        };
      }
      
      // FALLBACK 2: Extract from @lat,lng,zoom (map viewport)
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*z)/);
      if (coordMatch) {
        return {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create embed URL using coordinates (RECOMMENDED - Most Reliable)
   * This shows the exact location pin without any API key
   */
  static createEmbedFromCoords(lat: number, lng: number, businessName?: string): string {
    // Using coordinates ensures exact pin location
    if (businessName) {
      // Include business name for better context in the map
      return `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
    }
    return `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=17`;
  }

  /**
   * Extract Place ID from various Google URL formats:
   * - https://www.google.com/maps/place/.../@lat,lng,...data=...!1s<PlaceID>...
   * - https://maps.app.goo.gl/... (shortened)
   * - https://goo.gl/maps/... (old shortened)
   * - https://www.google.com/maps/search/...?q=place_id:<PlaceID>
   * - Direct Place ID (ChIJ...)
   */
  static extractPlaceId(input: string): string | null {
    // If it's already a Place ID (starts with Ch)
    if (/^Ch[A-Z][A-Za-z0-9_-]{20,}$/.test(input)) {
      return input;
    }

    try {
      // Try to parse as URL
      const url = new URL(input);

      // Method 1: Extract from !1s parameter in Google Maps URLs
      // Can be Place ID (ChIJ...) or CID (0x...:0x...)
      const dataMatch = input.match(/!1s([^!&]+)/);
      if (dataMatch) {
        const extracted = dataMatch[1];
        // Check if it's a valid Place ID or CID format
        if (/^Ch[A-Z][A-Za-z0-9_-]{20,}$/.test(extracted) || 
            /^0x[0-9a-fA-F]+(:0x[0-9a-fA-F]+)?$/.test(extracted)) {
          return extracted;
        }
      }

      // Method 2: Extract from ftid parameter (Feature ID / Hex CID)
      const ftid = url.searchParams.get('ftid');
      if (ftid && (ftid.startsWith('0x') || /^\d+$/.test(ftid))) {
        // This is a CID (hex or numeric) - return it as-is
        return ftid;
      }

      // Method 3: Check for place_id in query params
      const placeIdParam = url.searchParams.get('place_id');
      if (placeIdParam) {
        return placeIdParam;
      }

      // Method 4: Extract from ludocid parameter (Legacy numeric CID)
      const ludocid = url.searchParams.get('ludocid');
      if (ludocid) {
        // This is a numeric CID - return it as-is
        return ludocid;
      }

      // Method 5: Extract CID from cid parameter
      const cid = url.searchParams.get('cid');
      if (cid) {
        return cid;
      }

      // Method 6: Check pathname for Place ID or CID
      const pathMatch = url.pathname.match(/\/(Ch[A-Za-z0-9_-]+|0x[0-9a-fA-F]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }

      // Could not extract Place ID from URL
      return null;

    } catch (error) {
      // Not a valid URL
      return null;
    }
  }

  /**
   * Validate if a string is a valid Google Place ID or CID
   */
  static isValidPlaceId(placeId: string): boolean {
    // Place ID format: ChIJ...
    const isPlaceId = /^Ch[A-Z][A-Za-z0-9_-]{20,}$/.test(placeId);

    // CID format: 0x14c94904b01833f1:0x3411f4f9a81471 or just the hex number
    const isCID = /^0x[0-9a-fA-F]+(:0x[0-9a-fA-F]+)?$/.test(placeId) || /^\d+$/.test(placeId);

    return isPlaceId || isCID;
  }

  /**
   * Extract business name from Google Search/Maps URL for fallback
   */
  static extractBusinessName(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // Extract from search query parameter
      const searchQuery = urlObj.searchParams.get('q');
      if (searchQuery) {
        // Decode and clean up
        return decodeURIComponent(searchQuery)
          .replace(/\+/g, ' ')
          .replace(/randevu|rezervasyon|appointment|booking/gi, '')
          .trim();
      }

      // Extract from pathname (e.g., /maps/place/Business+Name/@...)
      const pathMatch = urlObj.pathname.match(/\/place\/([^/@]+)/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]).replace(/\+/g, ' ').trim();
      }

      return null;
    } catch {
      return null;
    }
  }
}
