import { Request, Response, NextFunction } from 'express';
import { UsageService } from '../services/usageService';
import { BusinessContextRequest } from './businessContext';
import { sendAppErrorResponse, BusinessErrors, createErrorContext, InternalError } from '../utils/errorResponse';
import { ERROR_CODES } from '../constants/errorCodes';

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
        const businessId = req.params.businessId || req.businessContext?.primaryBusinessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canSendSms(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = new InternalError('EXTERNAL_SERVICE_ERROR', { reason: check.reason || 'SMS quota exceeded' }, context);
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = new InternalError('INTERNAL_SERVER_ERROR', { message: 'Failed to check SMS limits' }, context);
        return sendAppErrorResponse(res, appError);
      }
    },

    /**
     * Enforce staff member limits
     */
    enforceStaffLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.primaryBusinessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canAddStaffMember(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = new InternalError('EXTERNAL_SERVICE_ERROR', { reason: check.reason || 'Staff member limit reached' }, context);
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = new InternalError('INTERNAL_SERVER_ERROR', { message: 'Failed to check staff limits' }, context);
        return sendAppErrorResponse(res, appError);
      }
    },

    /**
     * Enforce service limits
     */
    enforceServiceLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.primaryBusinessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canAddService(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = new InternalError('EXTERNAL_SERVICE_ERROR', { reason: check.reason || 'Service limit reached' }, context);
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = new InternalError('INTERNAL_SERVER_ERROR', { message: 'Failed to check service limits' }, context);
        return sendAppErrorResponse(res, appError);
      }
    },

    /**
     * Enforce customer limits
     */
    enforceCustomerLimits: async (req: BusinessContextRequest, res: Response, next: NextFunction) => {
      try {
        const businessId = req.params.businessId || req.businessContext?.primaryBusinessId;

        if (!businessId) {
          const context = createErrorContext(req);
          const error = BusinessErrors.notFound('Business ID not found', context);
          return sendAppErrorResponse(res, error);
        }

        const check = await usageService.canAddCustomer(businessId);

        if (!check.allowed) {
          const context = createErrorContext(req, businessId);
          const error = new InternalError('EXTERNAL_SERVICE_ERROR', { reason: check.reason || 'Customer limit reached' }, context);
          return sendAppErrorResponse(res, error);
        }

        next();
      } catch (error) {
        const context = createErrorContext(req);
        const appError = new InternalError('INTERNAL_SERVER_ERROR', { message: 'Failed to check customer limits' }, context);
        return sendAppErrorResponse(res, appError);
      }
    }
  };
}