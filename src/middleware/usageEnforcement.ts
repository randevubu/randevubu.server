import { Request, Response, NextFunction } from 'express';
import { UsageService } from '../services/usageService';
import { BusinessContextRequest } from './businessContext';
import { sendAppErrorResponse, BusinessErrors } from '../utils/errorResponse';
import { ERROR_CODES } from '../constants/errorCodes';
import { createErrorContext } from '../utils/errorResponse';

export interface UsageEnforcementOptions {
  usageService: UsageService;
}

export function createUsageEnforcement(options: UsageEnforcementOptions) {
  const { usageService } = options;

  return {
    /**
     * Enforce SMS sending limits
     */
    enforceSmsLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.businessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canSendSms(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = {
            code: ERROR_CODES.SMS_QUOTA_EXCEEDED,
            message: check.reason || 'SMS quota exceeded',
            context,
            httpStatus: 403
          };
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = BusinessErrors.internalError('Failed to check SMS limits', context);
        return sendAppErrorResponse(res, appError);
      }
    },

    /**
     * Enforce staff member limits
     */
    enforceStaffLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.businessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canAddStaffMember(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = {
            code: ERROR_CODES.STAFF_LIMIT_EXCEEDED,
            message: check.reason || 'Staff member limit reached',
            context,
            httpStatus: 403
          };
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = BusinessErrors.internalError('Failed to check staff limits', context);
        return sendAppErrorResponse(res, appError);
      }
    },

    /**
     * Enforce service limits
     */
    enforceServiceLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.businessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canAddService(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = {
            code: ERROR_CODES.SERVICE_LIMIT_EXCEEDED,
            message: check.reason || 'Service limit reached',
            context,
            httpStatus: 403
          };
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = BusinessErrors.internalError('Failed to check service limits', context);
        return sendAppErrorResponse(res, appError);
      }
    },

    /**
     * Enforce customer limits
     */
    enforceCustomerLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.businessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canAddCustomer(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = {
            code: ERROR_CODES.CUSTOMER_LIMIT_EXCEEDED,
            message: check.reason || 'Customer limit reached',
            context,
            httpStatus: 403
          };
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = BusinessErrors.internalError('Failed to check customer limits', context);
        return sendAppErrorResponse(res, appError);
      }
    }
  };
}