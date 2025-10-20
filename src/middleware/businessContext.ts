import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  BusinessContext,
  BusinessContextRequest,
  GuaranteedBusinessContextRequest
} from '../types/request';
import {
  createErrorContext,
  sendAppErrorResponse,
  BusinessErrors
} from '../utils/errorResponse';

// Re-export types for convenience
export type { BusinessContext, BusinessContextRequest, GuaranteedBusinessContextRequest };

export class BusinessContextMiddleware {
  constructor(private prisma: PrismaClient) {}

  async attachBusinessContext(req: BusinessContextRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('🔍 [attachBusinessContext] Starting...', { url: req.url, method: req.method, hasUser: !!req.user });
      if (!req.user) {
        console.log('🔍 [attachBusinessContext] No user, skipping');
        return next();
      }

      const userId = req.user.id;
      console.log('🔍 [attachBusinessContext] Fetching user roles for:', userId);

      // Fetch fresh user roles from database to ensure we have the latest roles
      // This is important after business creation when roles might have changed
      const freshUserRoles = await this.prisma.userRole.findMany({
        where: {
          userId: userId,
          isActive: true,
          role: {
            isActive: true
          }
        },
        include: {
          role: true
        }
      });

      console.log('🔍 [attachBusinessContext] User roles query completed, count:', freshUserRoles.length);
      console.log('🔍 [attachBusinessContext] User roles fetched:', freshUserRoles.map(ur => ur.role.name));
      const userRoles = freshUserRoles.map(ur => ur.role);
      
      const isOwner = userRoles.some(role => role.name === 'OWNER');
      const isStaff = userRoles.some(role => role.name === 'STAFF');
      const isCustomer = userRoles.some(role => role.name === 'CUSTOMER');

      // Debug logging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 BusinessContext Debug:', {
          userId,
          userRoles: userRoles.map(r => r.name),
          isOwner,
          isStaff,
          isCustomer
        });
      }

      if (!isOwner && !isStaff && !isCustomer) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 BusinessContext: No relevant roles, exiting early');
        }
        return next();
      }

      let businessIds: string[] = [];
      let primaryBusinessId: string | null = null;

      if (isOwner) {
        console.log('🔍 [attachBusinessContext] User is OWNER, fetching owned businesses...');
        const ownedBusinesses = await this.prisma.business.findMany({
          where: {
            ownerId: userId,
            isActive: true,
            deletedAt: null
          },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' }
        });
        console.log('🔍 [attachBusinessContext] Owned businesses query completed, count:', ownedBusinesses.length);
        businessIds.push(...ownedBusinesses.map(b => b.id));
        primaryBusinessId = ownedBusinesses[0]?.id || null;
      }

      if (isStaff) {
        console.log('🔍 [attachBusinessContext] User is STAFF, fetching staff businesses...');
        const staffBusinesses = await this.prisma.businessStaff.findMany({
          where: {
            userId,
            isActive: true,
            leftAt: null,
            business: {
              isActive: true,
              deletedAt: null
            }
          },
          include: {
            business: {
              select: { id: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        });

        console.log('🔍 [attachBusinessContext] Staff businesses query completed, count:', staffBusinesses.length);
        const staffBusinessIds = staffBusinesses.map(bs => bs.business.id);
        businessIds.push(...staffBusinessIds.filter(id => !businessIds.includes(id)));

        if (!primaryBusinessId && staffBusinessIds.length > 0) {
          primaryBusinessId = staffBusinessIds[0];
        }
      }

      req.businessContext = {
        businessIds: [...new Set(businessIds)],
        primaryBusinessId,
        isOwner,
        isStaff,
        isCustomer: isCustomer || false
      };

      console.log('🔍 [attachBusinessContext] Context created successfully:', {
        businessIds: req.businessContext.businessIds,
        primaryBusinessId: req.businessContext.primaryBusinessId,
        isOwner,
        isStaff
      });
      console.log('🔍 [attachBusinessContext] Calling next()...');

      next();
    } catch (error) {
      next(error);
    }
  }

  requireBusinessAccess(req: BusinessContextRequest, res: Response, next: NextFunction): void {
    // Allow users with OWNER or CUSTOMER role to proceed even without businesses
    // This enables them to create their first business
    if (req.businessContext?.isOwner) {
      return next();
    }
    
    if (req.businessContext?.isCustomer) {
      return next();
    }
    
    // For users without business context but with valid roles, let them proceed
    // The controller will handle the empty state gracefully
    if (!req.businessContext) {
      return next();
    }
    
    // Only block users who have business context but no access to any businesses
    // This should be rare and indicates a data inconsistency
    if (req.businessContext.businessIds.length === 0) {
      return next();
    }
    
    next();
  }

  /**
   * Requires user to be a business owner with at least one business
   */
  requireBusinessOwner(req: BusinessContextRequest, res: Response, next: NextFunction): void {
    if (!req.businessContext?.isOwner) {
      const context = createErrorContext(req, req.user?.id);
      const error = BusinessErrors.noAccess('No business access', context);
      return sendAppErrorResponse(res, error);
    }
    next();
  }

  /**
   * Requires user to have access to at least one business (owner or staff)
   * Returns empty data if no businesses, but doesn't block the request
   */
  requireBusinessContext(req: BusinessContextRequest, res: Response, next: NextFunction): void {
    if (!req.businessContext) {
      const context = createErrorContext(req, req.user?.id);
      const error = BusinessErrors.noAccess('No business access', context);
      return sendAppErrorResponse(res, error);
    }
    next();
  }

  /**
   * Allows requests even without business context - for endpoints where users can create first business
   */
  allowEmptyBusinessContext(req: BusinessContextRequest, res: Response, next: NextFunction): void {
    // Always proceed - business context is optional
    next();
  }

  /**
   * Validates access to a specific business ID from params or query
   */
  requireSpecificBusinessAccess(paramName = 'id') {
    return (req: BusinessContextRequest, res: Response, next: NextFunction): void => {
      console.log('🔍 [requireSpecificBusinessAccess] Checking access...', {
        paramName,
        businessId: req.params[paramName],
        url: req.url,
        method: req.method,
        hasBusinessContext: !!req.businessContext,
        businessIds: req.businessContext?.businessIds
      });

      const businessId = req.params[paramName] || req.query[paramName] as string;
      
      if (!businessId) {
        console.log('❌ [requireSpecificBusinessAccess] No business ID found');
        res.status(400).json({
          success: false,
          error: 'Business ID is required'
        });
        return;
      }

      if (!req.businessContext || !this.validateBusinessAccess(businessId, req.businessContext)) {
        console.log('❌ [requireSpecificBusinessAccess] Access denied', {
          hasContext: !!req.businessContext,
          requestedId: businessId,
          availableIds: req.businessContext?.businessIds
        });
        const context = createErrorContext(req, req.user?.id);
        const error = BusinessErrors.noAccess('No business access', context);
        return sendAppErrorResponse(res, error);
      }
      
      console.log('✅ [requireSpecificBusinessAccess] Access granted');
      next();
    };
  }

  validateBusinessAccess(businessId: string, businessContext: BusinessContext): boolean {
    return businessContext.businessIds.includes(businessId);
  }

  getBusinessIdFromRequest(req: BusinessContextRequest, paramName = 'businessId'): string | null {
    const explicitBusinessId = req.params[paramName] || req.query[paramName] as string;
    
    if (explicitBusinessId) {
      if (req.businessContext && this.validateBusinessAccess(explicitBusinessId, req.businessContext)) {
        return explicitBusinessId;
      }
      return null;
    }

    return req.businessContext?.primaryBusinessId || null;
  }
}