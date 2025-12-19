import { Response } from 'express';
import { BusinessContextRequest } from '../middleware/businessContext';
import { BusinessService } from '../services/domain/business';
import { handleRouteError } from '../utils/responseUtils';
import { ResponseHelper } from '../utils/responseHelper';

/**
 * Controller for managing customer-related business features
 * Handles customer management settings, notes, loyalty, and evaluations
 */
export class CustomerManagementController {
  constructor(
    private businessService: BusinessService,
    private responseHelper: ResponseHelper
  ) {}

  /**
   * Get customer management settings
   * GET /api/v1/businesses/customer-management/settings
   */
  async getCustomerManagementSettings(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settings = await this.businessService.getBusinessCustomerManagementSettings(
        userId,
        businessId
      );

      await this.responseHelper.success(
        res,
        'success.business.customerManagementSettingsRetrieved',
        settings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Update customer management settings
   * PUT /api/v1/businesses/customer-management/settings
   */
  async updateCustomerManagementSettings(
    req: BusinessContextRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const settingsData = req.body;
      const updatedSettings = await this.businessService.updateBusinessCustomerManagementSettings(
        userId,
        businessId,
        settingsData
      );

      await this.responseHelper.success(
        res,
        'success.business.customerManagementSettingsUpdated',
        updatedSettings,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get customer notes
   * GET /api/v1/businesses/customer-management/customers/:customerId/notes
   */
  async getCustomerNotes(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const customerId = req.params.customerId;
      const noteType = req.query.noteType as 'STAFF' | 'INTERNAL' | 'CUSTOMER' | undefined;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      if (!customerId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const notes = await this.businessService.getCustomerNotes(
        userId,
        businessId,
        customerId,
        noteType
      );

      await this.responseHelper.success(
        res,
        'success.business.customerNotesRetrieved',
        notes,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Add customer note
   * POST /api/v1/businesses/customer-management/customers/:customerId/notes
   */
  async addCustomerNote(req: BusinessContextRequest, res: Response): Promise<void> {
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

      const noteData = req.body;
      const note = await this.businessService.addCustomerNote(
        userId,
        businessId,
        customerId,
        noteData
      );

      await this.responseHelper.success(res, 'success.business.customerNoteAdded', note, 201, req);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get customer loyalty status
   * GET /api/v1/businesses/customer-management/customers/:customerId/loyalty
   */
  async getCustomerLoyaltyStatus(req: BusinessContextRequest, res: Response): Promise<void> {
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

      const loyaltyStatus = await this.businessService.getCustomerLoyaltyStatus(
        userId,
        businessId,
        customerId
      );

      await this.responseHelper.success(
        res,
        'success.business.customerLoyaltyStatusRetrieved',
        loyaltyStatus,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Get customer evaluation
   * GET /api/v1/businesses/customer-management/appointments/:appointmentId/evaluation
   */
  async getCustomerEvaluation(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const appointmentId = req.params.appointmentId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      if (!appointmentId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const evaluation = await this.businessService.getCustomerEvaluation(
        userId,
        businessId,
        appointmentId
      );

      await this.responseHelper.success(
        res,
        'success.business.customerEvaluationRetrieved',
        evaluation,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  /**
   * Submit customer evaluation
   * POST /api/v1/businesses/customer-management/appointments/:appointmentId/evaluation
   */
  async submitCustomerEvaluation(req: BusinessContextRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessContext?.primaryBusinessId;
      const appointmentId = req.params.appointmentId;

      if (!businessId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      if (!appointmentId) {
        res.status(400).json({ success: false, error: 'Business context required' });
        return;
      }

      const evaluationData = req.body;
      const evaluation = await this.businessService.submitCustomerEvaluation(
        userId,
        businessId,
        appointmentId,
        evaluationData
      );

      await this.responseHelper.success(
        res,
        'success.business.customerEvaluationSubmitted',
        evaluation,
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}
