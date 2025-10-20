/**
 * Business Ownership Middleware
 * 
 * Handles business ownership validation and access control
 */

import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, BusinessOwnershipRequest } from '../types/request';
import { sendAppErrorResponse, BusinessErrors, createErrorContext, InternalError } from '../utils/errorResponse';

let prismaInstance: PrismaClient;

export function initializeBusinessOwnershipMiddleware(prisma: PrismaClient) {
  prismaInstance = prisma;
}

/**
 * Middleware to require business ownership
 */
export async function requireBusinessOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const context = createErrorContext(req);
      const error = BusinessErrors.noAccess('Authentication required', context);
      return sendAppErrorResponse(res, error, 401);
    }

    const businessId = req.params.businessId || req.params.id;
    if (!businessId) {
      const context = createErrorContext(req, req.user.id);
      const error = BusinessErrors.notFound('Business ID is required', context);
      return sendAppErrorResponse(res, error, 400);
    }

    // Check if user owns the business
    const business = await prismaInstance.business.findFirst({
      where: {
        id: businessId,
        ownerId: req.user.id,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        isActive: true
      }
    });

    if (!business) {
      const context = createErrorContext(req, req.user.id);
      const error = BusinessErrors.noAccess('Business not found or access denied', context);
      return sendAppErrorResponse(res, error, 404);
    }

    (req as BusinessOwnershipRequest).business = business;
    next();
  } catch (error) {
    const context = createErrorContext(req, req.user?.id);
    const appError = new InternalError('INTERNAL_ERROR', { message: 'Failed to validate business ownership' }, context);
    return sendAppErrorResponse(res, appError, 500);
  }
}

/**
 * Middleware to require business access (owner or staff)
 */
export async function requireBusinessAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      const context = createErrorContext(req);
      const error = BusinessErrors.noAccess('Authentication required', context);
      return sendAppErrorResponse(res, error, 401);
    }

    const businessId = req.params.businessId || req.params.id;
    if (!businessId) {
      const context = createErrorContext(req, req.user.id);
      const error = BusinessErrors.notFound('Business ID is required', context);
      return sendAppErrorResponse(res, error, 400);
    }

    // Check if user owns the business or is staff
    const business = await prismaInstance.business.findFirst({
      where: {
        id: businessId,
        OR: [
          { ownerId: req.user.id },
          {
            staff: {
              some: {
                userId: req.user.id,
                isActive: true,
                leftAt: null
              }
            }
          }
        ],
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        isActive: true
      }
    });

    if (!business) {
      const context = createErrorContext(req, req.user.id);
      const error = BusinessErrors.noAccess('Business not found or access denied', context);
      return sendAppErrorResponse(res, error, 404);
    }

    (req as BusinessOwnershipRequest).business = business;
    next();
  } catch (error) {
    const context = createErrorContext(req, req.user?.id);
    const appError = new InternalError('INTERNAL_ERROR', { message: 'Failed to validate business access' }, context);
    return sendAppErrorResponse(res, appError, 500);
  }
}

