/**
 * Business Context Middleware - Simplified Exports
 *
 * This file provides convenient exports for business context middleware
 * using factory pattern with dependency injection.
 *
 * All functionality is delegated to BusinessContextMiddleware class.
 */

import { Request, Response, NextFunction } from 'express';
import { BusinessContextMiddleware, BusinessContextRequest } from './businessContext';
import { RepositoryContainer } from '../repositories';

// Middleware instance (initialized by app startup)
let businessContextMiddleware: BusinessContextMiddleware;

/**
 * Initialize business context middleware
 * Must be called during application startup
 */
export function initializeBusinessContextMiddleware(repositories: RepositoryContainer) {
  businessContextMiddleware = new BusinessContextMiddleware(repositories.prismaClient);
}

/**
 * Attach business context to the request
 * Fetches user's businesses and adds them to req.businessContext
 */
export const attachBusinessContext = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized. Call initializeBusinessContextMiddleware() first.'));
  }
  return businessContextMiddleware.attachBusinessContext(req as BusinessContextRequest, res, next);
};

/**
 * Require user to have access to at least one business (owner, staff, or customer)
 */
export const requireBusinessAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  return businessContextMiddleware.requireBusinessAccess(req as BusinessContextRequest, res, next);
};

/**
 * Require user to be a business owner
 */
export const requireBusinessOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  return businessContextMiddleware.requireBusinessOwner(req as BusinessContextRequest, res, next);
};

/**
 * Require business context to be present (attached by attachBusinessContext middleware)
 */
export const requireBusinessContext = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  return businessContextMiddleware.requireBusinessContext(req as BusinessContextRequest, res, next);
};

/**
 * Allow requests even without business context
 * Useful for endpoints where users can create their first business
 */
export const allowEmptyBusinessContext = (req: Request, res: Response, next: NextFunction) => {
  if (!businessContextMiddleware) {
    return next(new Error('Business context middleware not initialized'));
  }
  return businessContextMiddleware.allowEmptyBusinessContext(req as BusinessContextRequest, res, next);
};

/**
 * Require access to a specific business ID from params or query
 * @param paramName - The parameter name to extract business ID from (default: 'id')
 */
export const requireSpecificBusinessAccess = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!businessContextMiddleware) {
      return next(new Error('Business context middleware not initialized'));
    }
    return businessContextMiddleware.requireSpecificBusinessAccess(paramName)(req as BusinessContextRequest, res, next);
  };
};

// Re-export types for convenience
export type { BusinessContext, BusinessContextRequest, GuaranteedBusinessContextRequest } from './businessContext';