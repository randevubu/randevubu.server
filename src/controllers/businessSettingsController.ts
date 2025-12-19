import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import {
  updateBusinessPriceSettingsSchema,
  updateBusinessStaffPrivacySettingsSchema,
} from '../schemas/business.schemas';
import { BusinessService } from '../services/domain/business';
import { AuthenticatedRequest } from '../types/request';
import { handleRouteError } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';

/**
 * Controller for managing various business settings
 * Handles price settings, privacy settings, reservation settings, and payment methods
 */
export class BusinessSettingsController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Update price settings for a business
   * PUT /api/v1/businesses/settings/price
   */
  async updatePriceSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const validatedData = updateBusinessPriceSettingsSchema.parse(req.body);
      const userId = req.user!.id;

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const businessId =
        req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];

      const updatedBusiness = await this.businessService.updateBusinessPriceSettings(
        userId,
        businessId,
        validatedData
      );

      await this.responseHelper.success(
        res,
        'success.business.priceSettingsUpdated',
        updatedBusiness,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get price settings for a business
   * GET /api/v1/businesses/settings/price
   */
  async getPriceSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      if (!req.businessContext || req.businessContext.businessIds.length === 0) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const businessId =
        req.businessContext.primaryBusinessId || req.businessContext.businessIds[0];

      const priceSettings = await this.businessService.getBusinessPriceSettings(userId, businessId);

      await this.responseHelper.success(
        res,
        'success.business.priceSettingsRetrieved',
        priceSettings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get staff privacy settings
   * GET /api/v1/businesses/settings/staff-privacy
   */
  async getStaffPrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settings = await this.businessService.getStaffPrivacySettings(userId, businessId);

      await this.responseHelper.success(
        res,
        'success.business.staffPrivacySettingsRetrieved',
        settings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update staff privacy settings
   * PUT /api/v1/businesses/settings/staff-privacy
   */
  async updateStaffPrivacySettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const validatedData = updateBusinessStaffPrivacySettingsSchema.parse(req.body);

      const settings = await this.businessService.updateStaffPrivacySettings(
        userId,
        businessId,
        validatedData
      );

      await this.responseHelper.success(
        res,
        'success.business.staffPrivacySettingsUpdated',
        settings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get reservation settings
   * GET /api/v1/businesses/settings/reservation
   */
  async getReservationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settings = await this.businessService.getBusinessReservationSettings(
        userId,
        businessId
      );

      if (!settings) {
        // Return default settings if none exist
        await this.responseHelper.success(
          res,
          'success.business.reservationSettingsDefault',
          {
            businessId,
            maxAdvanceBookingDays: 30,
            minNotificationHours: 2,
            maxDailyAppointments: 50,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          200,
          req
        );
        return;
      }

      await this.responseHelper.success(
        res,
        'success.business.reservationSettingsRetrieved',
        settings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update reservation settings
   * PUT /api/v1/businesses/settings/reservation
   */
  async updateReservationSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settingsData = req.body;
      const updatedSettings = await this.businessService.updateBusinessReservationSettings(
        userId,
        businessId,
        settingsData
      );

      await this.responseHelper.success(
        res,
        'success.business.reservationSettingsUpdated',
        updatedSettings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get stored payment methods for a business
   * GET /api/v1/businesses/:businessId/payment-methods
   */
  async getPaymentMethods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const paymentMethods = await this.businessService.getPaymentMethods(businessId, userId);

      await this.responseHelper.success(
        res,
        'success.business.paymentMethodsRetrieved',
        paymentMethods,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Add a new payment method for a business
   * POST /api/v1/businesses/:businessId/payment-methods
   */
  async addPaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const paymentMethod = await this.businessService.addPaymentMethod(
        businessId,
        userId,
        req.body
      );

      await this.responseHelper.success(
        res,
        'success.business.paymentMethodAdded',
        paymentMethod,
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
