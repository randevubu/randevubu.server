import { Request } from 'express';
import { AuthenticatedUser, JWTPayload } from './auth';

/**
 * Unified Request type system - Single Source of Truth
 * This file is the ONLY location for Request interface extensions
 *
 * DO NOT define request types in middleware files - import from here
 */

// ============================================================================
// AUTHENTICATION REQUEST TYPES
// ============================================================================

/**
 * Base authenticated request - user MAY be present
 * Use this when authentication is optional
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: JWTPayload;
}

/**
 * Guaranteed authenticated request - user is ALWAYS present
 * Use this when authentication is required (after requireAuth middleware)
 */
export interface GuaranteedAuthRequest extends Request {
  user: AuthenticatedUser;
  token: JWTPayload;
}

// ============================================================================
// BUSINESS CONTEXT TYPES
// ============================================================================

/**
 * Business context attached to requests
 * This is the canonical definition - used by all middleware
 */
export interface BusinessContext {
  businessIds: string[];
  primaryBusinessId: string | null;
  businessId?: string;
  userRole?: string;
  hasAccess?: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isCustomer?: boolean;
}

/**
 * Business context request - user and business context MAY be present
 * Use this when business context is optional
 */
export interface BusinessContextRequest extends AuthenticatedRequest {
  businessId?: string;
  businessContext?: BusinessContext;
}

/**
 * Guaranteed business context request - user and business context ALWAYS present
 * Use this after requireBusinessContext middleware
 */
export interface GuaranteedBusinessContextRequest extends GuaranteedAuthRequest {
  businessContext: BusinessContext;
}

/**
 * Business ownership request - includes validated business data
 * Use this after requireBusinessOwnership middleware
 */
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



