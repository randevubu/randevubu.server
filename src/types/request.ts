import { Request } from 'express';
import { AuthenticatedUser, JWTPayload } from './auth';

/**
 * Unified Request type system to eliminate duplication
 * This file serves as the central location for all Request interface extensions
 */

// Base authenticated request - most common pattern
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: JWTPayload;
}

// Guaranteed authenticated request - user is always present
export interface GuaranteedAuthRequest extends Request {
  user: AuthenticatedUser;
  token: JWTPayload;
}

// Business context request - includes business information
export interface BusinessContextRequest extends AuthenticatedRequest {
  businessId?: string;
  businessContext?: {
    businessIds: string[];
    primaryBusinessId?: string | null;
    businessId?: string;
    userRole?: string;
    hasAccess?: boolean;
    isOwner?: boolean;
    isStaff?: boolean;
    isCustomer?: boolean;
  };
}

// Guaranteed business context request - business context is always present
export interface GuaranteedBusinessContextRequest extends GuaranteedAuthRequest {
  businessContext: {
    businessIds: string[];
    primaryBusinessId: string | null;
    businessId?: string;
    userRole?: string;
    hasAccess?: boolean;
    isOwner: boolean;
    isStaff: boolean;
    isCustomer?: boolean;
  };
}

// Business ownership request - includes validated business data
export interface BusinessOwnershipRequest extends AuthenticatedRequest {
  business: {
    id: string;
    name: string;
    ownerId: string;
    isActive: boolean;
    slug?: string;
  };
}

// Cache-specific request - extends business context for caching
export interface CacheRequest extends BusinessContextRequest {
  // CacheRequest is now just an alias for BusinessContextRequest
  // This maintains backward compatibility while using the unified system
}

// Legacy alias for backward compatibility
export interface CachedRequest extends CacheRequest {}

// Authenticated request with file upload
export interface AuthenticatedRequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

// Notification validation request
export interface NotificationValidationRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phone?: string;
  };
  businessId?: string;
  businessContext?: {
    businessIds: string[];
    primaryBusinessId?: string;
  };
}

// Cache response interface
export interface CacheResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  cached?: boolean;
  ttl?: number;
}



