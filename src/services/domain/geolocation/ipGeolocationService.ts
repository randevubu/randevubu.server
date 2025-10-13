import { PrismaClient } from '@prisma/client';

export interface GeolocationResult {
  city: string;
  state: string;
  country: string;
  timezone: string;
  isp: string;
  accuracy: 'high' | 'medium' | 'low';
}

export class IPGeolocationService {
  constructor(private prisma: PrismaClient) {}

  // Detect location from IP address
  async detectLocationFromIP(ip: string): Promise<GeolocationResult | null> {
    try {
      // Remove IPv6 prefix if present
      const cleanIP = ip.replace(/^::ffff:/, '');
      
      console.log(`🔍 IP Geolocation Debug: Detecting location for IP: ${cleanIP}`);
      
      // Skip private/local IPs
      if (this.isPrivateIP(cleanIP)) {
        console.log('🔍 IP Geolocation Debug: Private IP detected, skipping geolocation');
        return null;
      }

      // Use free IP geolocation service
      console.log(`🔍 IP Geolocation Debug: Calling ipapi.co for IP: ${cleanIP}`);
      const response = await fetch(`https://ipapi.co/${cleanIP}/json/`);
      
      if (!response.ok) {
        throw new Error(`IP geolocation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`🔍 IP Geolocation Debug: Response from ipapi.co:`, JSON.stringify(data, null, 2));
      
      if (data.error) {
        throw new Error(`IP geolocation error: ${data.reason}`);
      }

      const result = {
        city: data.city || 'Unknown',
        state: data.region || 'Unknown',
        country: data.country_name || 'Unknown',
        timezone: data.timezone || 'UTC',
        isp: data.org || 'Unknown',
        accuracy: this.determineAccuracy(data)
      };

      console.log(`🔍 IP Geolocation Debug: Final result:`, JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      console.warn('IP geolocation failed:', error);
      return null;
    }
  }

  // Get user's IP from request
  getClientIP(req: any): string {
    // Check various headers for real IP
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    
    console.log('🔍 IP Detection Debug: Headers:', {
      'x-forwarded-for': forwarded,
      'x-real-ip': realIP,
      'cf-connecting-ip': cfConnectingIP,
      'connection.remoteAddress': req.connection?.remoteAddress,
      'socket.remoteAddress': req.socket?.remoteAddress,
      'req.ip': req.ip
    });
    
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ip = forwarded.split(',')[0].trim();
      console.log(`🔍 IP Detection Debug: Using X-Forwarded-For: ${ip}`);
      return ip;
    }
    
    if (realIP) {
      console.log(`🔍 IP Detection Debug: Using X-Real-IP: ${realIP}`);
      return realIP;
    }
    
    if (cfConnectingIP) {
      console.log(`🔍 IP Detection Debug: Using CF-Connecting-IP: ${cfConnectingIP}`);
      return cfConnectingIP;
    }
    
    // Fallback to connection remote address
    const fallbackIP = req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    console.log(`🔍 IP Detection Debug: Using fallback IP: ${fallbackIP}`);
    return fallbackIP;
  }

  // Check if IP is private/local
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./,                    // 127.0.0.0/8 (localhost)
      /^10\./,                     // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,               // 192.168.0.0/16
      /^::1$/,                     // IPv6 localhost
      /^fc00:/,                    // IPv6 private
      /^fe80:/,                    // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  // Determine accuracy based on available data
  private determineAccuracy(data: any): 'high' | 'medium' | 'low' {
    if (data.city && data.region && data.country_name) {
      return 'high';
    } else if (data.region && data.country_name) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Get location with fallback to default
  async getLocationWithFallback(req: any, defaultCity: string = 'Istanbul'): Promise<GeolocationResult> {
    const ip = this.getClientIP(req);
    const location = await this.detectLocationFromIP(ip);
    
    if (location) {
      return location;
    }

    // Fallback to default location
    return {
      city: defaultCity,
      state: defaultCity,
      country: 'Turkey',
      timezone: 'Europe/Istanbul',
      isp: 'Unknown',
      accuracy: 'low'
    };
  }
}
