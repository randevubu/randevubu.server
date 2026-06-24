import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { BusinessService } from '../services/domain/business';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';

export class CustomerManagementController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  private requireBusinessId(req: BusinessContextRequest): string {
    const businessId = req.businessContext?.primaryBusinessId;
    if (!businessId) {
      throw new AppError('NO_BUSINESS_ACCESS', { message: 'Business context required' });
    }
    return businessId;
  }

  async getCustomerManagementSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settings = await this.businessService.getBusinessCustomerManagementSettings(userId, businessId);

    await this.responseHelper.success(res, 'success.business.customerManagementSettingsRetrieved', settings, 200, req);
  }

  async updateCustomerManagementSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settingsData = req.body;
    const updatedSettings = await this.businessService.updateBusinessCustomerManagementSettings(userId, businessId, settingsData);

    await this.responseHelper.success(res, 'success.business.customerManagementSettingsUpdated', updatedSettings, 200, req);
  }

  async getCustomerNotes(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const customerId = req.params.customerId;

    if (!customerId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Customer ID required', params: { field: 'customerId' } });
    }

    const noteType = req.query.noteType as 'STAFF' | 'INTERNAL' | 'CUSTOMER' | undefined;
    const notes = await this.businessService.getCustomerNotes(userId, businessId, customerId, noteType);

    await this.responseHelper.success(res, 'success.business.customerNotesRetrieved', notes, 200, req);
  }

  async addCustomerNote(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const customerId = req.params.customerId;

    if (!customerId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Customer ID required', params: { field: 'customerId' } });
    }

    const noteData = req.body;
    const note = await this.businessService.addCustomerNote(userId, businessId, customerId, noteData);

    await this.responseHelper.success(res, 'success.business.customerNoteAdded', note, 201, req);
  }

  async getCustomerLoyaltyStatus(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const customerId = req.params.customerId;

    if (!customerId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Customer ID required', params: { field: 'customerId' } });
    }

    const loyaltyStatus = await this.businessService.getCustomerLoyaltyStatus(userId, businessId, customerId);

    await this.responseHelper.success(res, 'success.business.customerLoyaltyStatusRetrieved', loyaltyStatus, 200, req);
  }

  async getCustomerEvaluation(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const appointmentId = req.params.appointmentId;

    if (!appointmentId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID required', params: { field: 'appointmentId' } });
    }

    const evaluation = await this.businessService.getCustomerEvaluation(userId, businessId, appointmentId);

    await this.responseHelper.success(res, 'success.business.customerEvaluationRetrieved', evaluation, 200, req);
  }

  async submitCustomerEvaluation(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const appointmentId = req.params.appointmentId;

    if (!appointmentId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Appointment ID required', params: { field: 'appointmentId' } });
    }

    const evaluationData = req.body;
    const evaluation = await this.businessService.submitCustomerEvaluation(userId, businessId, appointmentId, evaluationData);

    await this.responseHelper.success(res, 'success.business.customerEvaluationSubmitted', evaluation, 201, req);
  }
}
