import { PrismaClient } from "@prisma/client";
import { NextFunction, Response } from "express";
import { RoleRepository } from "../repositories/roleRepository";
import { AuthenticatedRequest, GuaranteedAuthRequest } from "../types/auth";
import {
  BusinessErrors,
  createErrorContext,
  sendAppErrorResponse,
} from "../utils/responseUtils";

export interface BusinessContext {
  businessIds: string[];
  primaryBusinessId: string | null;
  isOwner: boolean;
  isStaff: boolean;
  isCustomer?: boolean;
}

export interface BusinessContextRequest extends AuthenticatedRequest {
  businessContext?: BusinessContext;
}

// Guaranteed business context request - user and business context are always present
export interface GuaranteedBusinessContextRequest
  extends GuaranteedAuthRequest {
  businessContext: BusinessContext;
}

export class BusinessContextMiddleware {
  private roleRepository: RoleRepository;

  constructor(private prisma: PrismaClient) {
    this.roleRepository = new RoleRepository(prisma);
  }

  async attachBusinessContext(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        return next();
      }

      const userId = req.user.id;

      // Fetch fresh user roles from database to ensure we have the latest roles
      // This is important after business creation when roles might have changed
      // Use the roleRepository to get both global and business staff roles
      const userRoles = await this.roleRepository.getUserRoles(userId);

      const isOwner = userRoles.some((role) => role.name === "OWNER");
      const isStaff = userRoles.some((role) => role.name === "STAFF");
      const isCustomer = userRoles.some((role) => role.name === "CUSTOMER");

      console.log("🔍 BusinessContext Debug:", {
        userId,
        userRoles: userRoles.map((r) => r.name),
        isOwner,
        isStaff,
        isCustomer,
      });

      if (!isOwner && !isStaff && !isCustomer) {
        console.log("🔍 BusinessContext: No relevant roles, exiting early");
        return next();
      }

      let businessIds: string[] = [];
      let primaryBusinessId: string | null = null;

      if (isOwner) {
        console.log(
          "🔍 BusinessContext: Fetching owned businesses for userId:",
          userId
        );
        const ownedBusinesses = await this.prisma.business.findMany({
          where: {
            ownerId: userId,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        });
        console.log(
          "🔍 BusinessContext: Found owned businesses:",
          ownedBusinesses
        );
        businessIds.push(...ownedBusinesses.map((b) => b.id));
        primaryBusinessId = ownedBusinesses[0]?.id || null;
      }

      if (isStaff) {
        const staffBusinesses = await this.prisma.businessStaff.findMany({
          where: {
            userId,
            isActive: true,
            leftAt: null,
            business: {
              isActive: true,
              deletedAt: null,
            },
          },
          include: {
            business: {
              select: { id: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        });

        const staffBusinessIds = staffBusinesses.map((bs) => bs.business.id);
        businessIds.push(
          ...staffBusinessIds.filter((id) => !businessIds.includes(id))
        );

        if (!primaryBusinessId && staffBusinessIds.length > 0) {
          primaryBusinessId = staffBusinessIds[0];
        }
      }

      req.businessContext = {
        businessIds: [...new Set(businessIds)],
        primaryBusinessId,
        isOwner,
        isStaff,
        isCustomer: isCustomer || false,
      };

      console.log(
        "🔍 BusinessContext: Final context for userId:",
        userId,
        req.businessContext
      );

      next();
    } catch (error) {
      next(error);
    }
  }

  requireBusinessAccess(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction
  ): void {
    // Allow users with OWNER or CUSTOMER role to proceed even without businesses
    // This enables them to create their first business
    if (req.businessContext?.isOwner) {
      return next();
    }

    if (req.businessContext?.isCustomer) {
      return next();
    }

    if (!req.businessContext || req.businessContext.businessIds.length === 0) {
      const context = createErrorContext(req, req.user?.id);
      const error = BusinessErrors.noAccess(context);
      return sendAppErrorResponse(res, error);
    }
    next();
  }

  /**
   * Requires user to be a business owner with at least one business
   */
  requireBusinessOwner(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.businessContext?.isOwner) {
      const context = createErrorContext(req, req.user?.id);
      const error = BusinessErrors.noAccess(context);
      return sendAppErrorResponse(res, error);
    }
    next();
  }

  /**
   * Requires user to have access to at least one business (owner or staff)
   * Returns empty data if no businesses, but doesn't block the request
   */
  requireBusinessContext(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.businessContext) {
      const context = createErrorContext(req, req.user?.id);
      const error = BusinessErrors.noAccess(context);
      return sendAppErrorResponse(res, error);
    }
    next();
  }

  /**
   * Allows requests even without business context - for endpoints where users can create first business
   */
  allowEmptyBusinessContext(
    req: BusinessContextRequest,
    res: Response,
    next: NextFunction
  ): void {
    // Always proceed - business context is optional
    next();
  }

  /**
   * Validates access to a specific business ID from params or query
   */
  requireSpecificBusinessAccess(paramName = "id") {
    return (
      req: BusinessContextRequest,
      res: Response,
      next: NextFunction
    ): void => {
      const businessId =
        req.params[paramName] || (req.query[paramName] as string);

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: "Business ID is required",
        });
        return;
      }

      if (
        !req.businessContext ||
        !this.validateBusinessAccess(businessId, req.businessContext)
      ) {
        const context = createErrorContext(req, req.user?.id);
        const error = BusinessErrors.noAccess(context);
        return sendAppErrorResponse(res, error);
      }

      next();
    };
  }

  validateBusinessAccess(
    businessId: string,
    businessContext: BusinessContext
  ): boolean {
    return businessContext.businessIds.includes(businessId);
  }

  getBusinessIdFromRequest(
    req: BusinessContextRequest,
    paramName = "businessId"
  ): string | null {
    const explicitBusinessId =
      req.params[paramName] || (req.query[paramName] as string);

    if (explicitBusinessId) {
      if (
        req.businessContext &&
        this.validateBusinessAccess(explicitBusinessId, req.businessContext)
      ) {
        return explicitBusinessId;
      }
      return null;
    }

    return req.businessContext?.primaryBusinessId || null;
  }
}
