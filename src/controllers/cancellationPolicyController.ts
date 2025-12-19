import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { BusinessService } from '../services/domain/business';
import { handleRouteError } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';

/**
 * Controller for managing business cancellation policies
 * Handles policy CRUD and customer policy status
 */
export class CancellationPolicyController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Get cancellation policies for a business
   * GET /api/v1/businesses/cancellation-policies
   */
  async getCancellationPolicies(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const policies = await this.businessService.getBusinessCancellationPolicies(
        userId,
        businessId
      );

      await this.responseHelper.success(
        res,
        'success.business.cancellationPoliciesRetrieved',
        policies,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update cancellation policies for a business
   * PUT /api/v1/businesses/cancellation-policies
   */
  async updateCancellationPolicies(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const policyData = req.body;
      const updatedPolicies = await this.businessService.updateBusinessCancellationPolicies(
        userId,
        businessId,
        policyData
      );

      await this.responseHelper.success(
        res,
        'success.business.cancellationPoliciesUpdated',
        updatedPolicies,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get customer policy status
   * GET /api/v1/businesses/cancellation-policies/customer/:customerId/status
   */
  async getCustomerPolicyStatus(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const customerId = req.params.customerId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      if (!customerId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const customerStatus = await this.businessService.getCustomerPolicyStatus(
        userId,
        businessId,
        customerId
      );

      await this.responseHelper.success(
        res,
        'success.business.customerPolicyStatusRetrieved',
        customerStatus,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
