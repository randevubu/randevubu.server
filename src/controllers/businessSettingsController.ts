import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  updateBusinessPriceSettingsSchema,
  updateBusinessStaffPrivacySettingsSchema,
} from '../schemas/business.schemas';
import { BusinessService } from '../services/domain/business';
import { AuthenticatedRequest } from '../types/request';
import { ResponseHelper } from '../utils/responseHelper';
import { AppError } from '../types/responseTypes';

export class BusinessSettingsController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  private requireBusinessId(req: BusinessContextRequest): string {
    if (!req.businessContext || req.businessContext.businessIds.length === 0) {
      throw new AppError('NO_BUSINESS_ACCESS', { message: 'Business context required' });
    }
    return req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];
  }

  async updatePriceSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const validatedData = updateBusinessPriceSettingsSchema.parse(req.body);
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const updatedBusiness = await this.businessService.updateBusinessPriceSettings(userId, businessId, validatedData);

    await this.responseHelper.success(res, 'success.business.priceSettingsUpdated', updatedBusiness, 200, req);
  }

  async getPriceSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const priceSettings = await this.businessService.getBusinessPriceSettings(userId, businessId);

    await this.responseHelper.success(res, 'success.business.priceSettingsRetrieved', priceSettings, 200, req);
  }

  async getStaffPrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settings = await this.businessService.getStaffPrivacySettings(userId, businessId);

    await this.responseHelper.success(res, 'success.business.staffPrivacySettingsRetrieved', settings, 200, req);
  }

  async updateStaffPrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const validatedData = updateBusinessStaffPrivacySettingsSchema.parse(req.body);

    const settings = await this.businessService.updateStaffPrivacySettings(userId, businessId, validatedData);

    await this.responseHelper.success(res, 'success.business.staffPrivacySettingsUpdated', settings, 200, req);
  }

  async getProfilePrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settings = await this.businessService.getProfilePrivacySettings(userId, businessId);

    await this.responseHelper.success(res, 'success.business.profilePrivacySettingsRetrieved', settings, 200, req);
  }

  async updateProfilePrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);
    const { showPhone, showEmail } = req.body;

    const settings = await this.businessService.updateProfilePrivacySettings(userId, businessId, {
      showPhone: Boolean(showPhone),
      showEmail: Boolean(showEmail),
    });

    await this.responseHelper.success(res, 'success.business.profilePrivacySettingsUpdated', settings, 200, req);
  }

  async getReservationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settings = await this.businessService.getBusinessReservationSettings(userId, businessId);

    if (!settings) {
      await this.responseHelper.success(
        res,
        'success.business.reservationSettingsDefault',
        {
          businessId,
          maxAdvanceBookingDays: 30,
          minNotificationHours: 0,
          maxDailyAppointments: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        200,
        req
      );
      return;
    }

    await this.responseHelper.success(res, 'success.business.reservationSettingsRetrieved', settings, 200, req);
  }

  async updateReservationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const settingsData = req.body;
    const updatedSettings = await this.businessService.updateBusinessReservationSettings(userId, businessId, settingsData);

    await this.responseHelper.success(res, 'success.business.reservationSettingsUpdated', updatedSettings, 200, req);
  }

  async getPaymentMethods(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;

    if (!businessId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID required', params: { field: 'businessId' } });
    }

    const paymentMethods = await this.businessService.getPaymentMethods(businessId, userId);

    await this.responseHelper.success(res, 'success.business.paymentMethodsRetrieved', paymentMethods, 200, req);
  }

  async addPaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user!.id;

    if (!businessId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID required', params: { field: 'businessId' } });
    }

    const paymentMethod = await this.businessService.addPaymentMethod(businessId, userId, req.body);

    await this.responseHelper.success(res, 'success.business.paymentMethodAdded', paymentMethod, 201, req);
  }

  async updateRequireApproval(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { requireApproval } = req.body;

    if (typeof requireApproval !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', { message: 'requireApproval must be a boolean' });
    }

    const businessId = this.requireBusinessId(req);

    const updatedBusiness = await this.businessService.updateRequireApproval(userId, businessId, requireApproval);

    await this.responseHelper.success(res, 'success.business.updated', updatedBusiness, 200, req);
  }
}
