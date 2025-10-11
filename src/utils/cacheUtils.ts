import { CacheRequest, CacheResponse } from '../types/request';

// Type for response body with optional id
interface ResponseBodyWithId {
  id?: string;
  data?: {
    id?: string;
  };
}

/**
 * Cache utility functions for consistent handling
 */
export class CacheUtils {
  /**
   * Get user ID from request with consistent fallback
   */
  static getUserId(req: CacheRequest): string {
    return req.user?.id || 'anonymous';
  }

  /**
   * Get business ID from request with consistent fallback
   */
  static getBusinessId(req: CacheRequest): string {
    return req.businessId || req.businessContext?.primaryBusinessId || 'global';
  }

  /**
   * Get service ID from request parameters or body
   */
  static getServiceId(req: CacheRequest, body?: ResponseBodyWithId): string | undefined {
    return req.params.id || body?.id || body?.data?.id;
  }

  /**
   * Get appointment ID from request parameters or body
   */
  static getAppointmentId(req: CacheRequest, body?: ResponseBodyWithId): string | undefined {
    return req.params.id || body?.id || body?.data?.id;
  }

  /**
   * Check if request has valid user context
   */
  static hasUserContext(req: CacheRequest): boolean {
    return !!req.user?.id;
  }

  /**
   * Check if request has valid business context
   */
  static hasBusinessContext(req: CacheRequest): boolean {
    return !!(req.businessId || req.businessContext?.primaryBusinessId);
  }
}



