import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { BusinessService } from '../services/domain/business';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';

export class CancellationPolicyController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  async getCancellationPolicies(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = req.businessContext?.primaryBusinessId;

    if (!businessId) {
      throw new AppError('NO_BUSINESS_ACCESS', { message: 'Business context required' });
    }

    const policies = await this.businessService.getBusinessCancellationPolicies(userId, businessId);

    await this.responseHelper.success(res, 'success.business.cancellationPoliciesRetrieved', policies, 200, req);
  }

  async updateCancellationPolicies(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = req.businessContext?.primaryBusinessId;

    if (!businessId) {
      throw new AppError('NO_BUSINESS_ACCESS', { message: 'Business context required' });
    }

    const policyData = req.body;
    const updatedPolicies = await this.businessService.updateBusinessCancellationPolicies(userId, businessId, policyData);

    await this.responseHelper.success(res, 'success.business.cancellationPoliciesUpdated', updatedPolicies, 200, req);
  }

  async getCustomerPolicyStatus(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = req.businessContext?.primaryBusinessId;
    const customerId = req.params.customerId;

    if (!businessId) {
      throw new AppError('NO_BUSINESS_ACCESS', { message: 'Business context required' });
    }

    if (!customerId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Customer ID required', params: { field: 'customerId' } });
    }

    const customerStatus = await this.businessService.getCustomerPolicyStatus(userId, businessId, customerId);

    await this.responseHelper.success(res, 'success.business.customerPolicyStatusRetrieved', customerStatus, 200, req);
  }
}
