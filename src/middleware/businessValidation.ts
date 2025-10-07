import { PrismaClient } from '@prisma/client';
import { RepositoryContainer } from '../repositories';
import { 
  ForbiddenError, 
  UserNotFoundError, 
  ValidationError,
  ErrorContext 
} from '../types/errors';
import logger from '../utils/Logger/logger';

/**
 * BusinessValidationMiddleware
 * 
 * Enterprise Pattern: Centralized business validation logic
 * Following Google/Microsoft patterns for service validation
 * 
 * Responsibilities:
 * - Business ownership validation
 * - Business access validation  
 * - Business status validation
 * - Consistent error handling
 */
export class BusinessValidationMiddleware {
  constructor(
    private prisma: PrismaClient,
    private repositories: RepositoryContainer
  ) {}

  /**
   * Validate that a user owns a specific business
   * Industry Standard: Ownership validation with audit logging
   */
  async validateBusinessOwnership(
    businessId: string, 
    userId: string, 
    context?: ErrorContext
  ): Promise<void> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { 
          id: true, 
          ownerId: true, 
          isActive: true,
          name: true
        }
      });

      if (!business) {
        await this.logSecurityEvent('BUSINESS_NOT_FOUND', {
          businessId,
          userId,
          context
        });
        throw new UserNotFoundError('Business not found', context);
      }

      if (!business.isActive) {
        await this.logSecurityEvent('BUSINESS_INACTIVE', {
          businessId,
          userId,
          businessName: business.name,
          context
        });
        throw new ValidationError('Business is inactive', context?.toString());
      }

      if (business.ownerId !== userId) {
        await this.logSecurityEvent('BUSINESS_OWNERSHIP_DENIED', {
          businessId,
          userId,
          actualOwnerId: business.ownerId,
          businessName: business.name,
          context
        });
        throw new ForbiddenError(
          'Unauthorized: You can only access your own business',
          context
        );
      }

      // Log successful ownership validation
      await this.logSecurityEvent('BUSINESS_OWNERSHIP_VALIDATED', {
        businessId,
        userId,
        businessName: business.name,
        context
      });

    } catch (error) {
      if (error instanceof UserNotFoundError || 
          error instanceof ValidationError || 
          error instanceof ForbiddenError) {
        throw error;
      }
      
      logger.error('Business ownership validation failed', {
        businessId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });
      
        throw new ValidationError('Business validation failed', context?.toString());
    }
  }

  /**
   * Validate that a user has access to a business (owner or staff)
   * Industry Standard: Multi-role access validation
   */
  async validateBusinessAccess(
    businessId: string, 
    userId: string, 
    context?: ErrorContext
  ): Promise<void> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { 
          id: true, 
          ownerId: true, 
          isActive: true,
          name: true
        }
      });

      if (!business) {
        await this.logSecurityEvent('BUSINESS_NOT_FOUND', {
          businessId,
          userId,
          context
        });
        throw new UserNotFoundError('Business not found', context);
      }

      if (!business.isActive) {
        await this.logSecurityEvent('BUSINESS_INACTIVE', {
          businessId,
          userId,
          businessName: business.name,
          context
        });
        throw new ValidationError('Business is inactive', context?.toString());
      }

      // Check if user is owner
      const isOwner = business.ownerId === userId;
      
      // Check if user is staff member
      const isStaffMember = await this.repositories.staffRepository.checkUserExistsInBusiness(
        businessId,
        userId
      );

      if (!isOwner && !isStaffMember) {
        await this.logSecurityEvent('BUSINESS_ACCESS_DENIED', {
          businessId,
          userId,
          actualOwnerId: business.ownerId,
          businessName: business.name,
          context
        });
        throw new ForbiddenError(
          'You do not have access to this business',
          context
        );
      }

      // Log successful access validation
      await this.logSecurityEvent('BUSINESS_ACCESS_VALIDATED', {
        businessId,
        userId,
        businessName: business.name,
        accessType: isOwner ? 'OWNER' : 'STAFF',
        context
      });

    } catch (error) {
      if (error instanceof UserNotFoundError || 
          error instanceof ValidationError || 
          error instanceof ForbiddenError) {
        throw error;
      }
      
      logger.error('Business access validation failed', {
        businessId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });
      
        throw new ValidationError('Business access validation failed', context?.toString());
    }
  }

  /**
   * Validate that a business exists and is active
   * Industry Standard: Basic business status validation
   */
  async validateBusinessActive(
    businessId: string, 
    context?: ErrorContext
  ): Promise<{ id: string; name: string; ownerId: string }> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { 
          id: true, 
          name: true,
          ownerId: true, 
          isActive: true
        }
      });

      if (!business) {
        await this.logSecurityEvent('BUSINESS_NOT_FOUND', {
          businessId,
          context
        });
        throw new UserNotFoundError('Business not found', context);
      }

      if (!business.isActive) {
        await this.logSecurityEvent('BUSINESS_INACTIVE', {
          businessId,
          businessName: business.name,
          context
        });
        throw new ValidationError('Business is inactive', context?.toString());
      }

      return {
        id: business.id,
        name: business.name,
        ownerId: business.ownerId
      };

    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Business active validation failed', {
        businessId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });
      
        throw new ValidationError('Business validation failed', context?.toString());
    }
  }

  /**
   * Validate business ownership for multiple businesses
   * Industry Standard: Batch validation for efficiency
   */
  async validateMultipleBusinessOwnership(
    businessIds: string[], 
    userId: string, 
    context?: ErrorContext
  ): Promise<void> {
    try {
      const businesses = await this.prisma.business.findMany({
        where: { 
          id: { in: businessIds },
          isActive: true
        },
        select: { 
          id: true, 
          ownerId: true, 
          name: true
        }
      });

      const foundBusinessIds = businesses.map(b => b.id);
      const notFoundIds = businessIds.filter(id => !foundBusinessIds.includes(id));
      
      if (notFoundIds.length > 0) {
        await this.logSecurityEvent('MULTIPLE_BUSINESSES_NOT_FOUND', {
          businessIds: notFoundIds,
          userId,
          context
        });
        throw new UserNotFoundError(`Businesses not found: ${notFoundIds.join(', ')}`, context);
      }

      const notOwnedBusinesses = businesses.filter(b => b.ownerId !== userId);
      if (notOwnedBusinesses.length > 0) {
        await this.logSecurityEvent('MULTIPLE_BUSINESS_OWNERSHIP_DENIED', {
          businessIds: notOwnedBusinesses.map(b => b.id),
          userId,
          context
        });
        throw new ForbiddenError(
          `You do not own these businesses: ${notOwnedBusinesses.map(b => b.name).join(', ')}`,
          context
        );
      }

      // Log successful batch validation
      await this.logSecurityEvent('MULTIPLE_BUSINESS_OWNERSHIP_VALIDATED', {
        businessIds,
        userId,
        businessNames: businesses.map(b => b.name),
        context
      });

    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      
      logger.error('Multiple business ownership validation failed', {
        businessIds,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });
      
        throw new ValidationError('Multiple business validation failed', context?.toString());
    }
  }

  /**
   * Log security events for audit purposes
   * Industry Standard: Comprehensive security logging
   */
  private async logSecurityEvent(
    eventType: string, 
    data: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('Business validation security event', {
        eventType,
        timestamp: new Date().toISOString(),
        ...data
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      logger.error('Failed to log security event', {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const businessValidationMiddleware = new BusinessValidationMiddleware(
  new PrismaClient(),
  {} as RepositoryContainer // Will be injected properly in service initialization
);
