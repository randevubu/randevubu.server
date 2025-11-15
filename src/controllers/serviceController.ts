import { Request, Response } from 'express';
import { OfferingService } from '../services/domain/offering';
import {
  createServiceSchema,
  updateServiceSchema
} from '../schemas/business.schemas';
import { AuthenticatedRequest, GuaranteedAuthRequest } from '../types/request';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import { ZodError } from 'zod';
// Cache invalidation handled by routes, not controllers

export class ServiceController {
  constructor(private offeringService: OfferingService) {}

  async createService(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate request body with Zod
      let validatedData;
      try {
        validatedData = createServiceSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const error = new AppError(
            `Invalid service data: ${zodError.errors.map(e => e.message).join(', ')}`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
        throw zodError;
      }

      const service = await this.offeringService.createService(userId, businessId, validatedData);

      await sendSuccessResponse(
        res,
        'success.service.created',
        service,
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getServiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const service = await this.offeringService.getServiceById(userId, id);

      if (!service) {
        const error = new AppError(
          'Service not found',
          404,
          ERROR_CODES.SERVICE_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      await sendSuccessResponse(
        res,
        'success.service.retrieved',
        service,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getBusinessServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { activeOnly } = req.query;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate activeOnly query parameter
      const activeOnlyBool = activeOnly === 'true';
      if (activeOnly && activeOnly !== 'true' && activeOnly !== 'false') {
        const error = new AppError(
          'activeOnly must be true or false',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const services = await this.offeringService.getServicesByBusinessId(
        userId,
        businessId,
        activeOnlyBool
      );

      await sendSuccessResponse(
        res,
        'success.service.businessRetrieved',
        {
          services,
          total: services.length,
          businessId,
          activeOnly: activeOnlyBool
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getPublicBusinessServices(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const services = await this.offeringService.getPublicServicesByBusinessId(businessId);

      await sendSuccessResponse(
        res,
        'success.service.publicRetrieved',
        {
          services,
          total: services.length,
          businessId
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate request body with Zod
      let validatedData;
      try {
        validatedData = updateServiceSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const error = new AppError(
            `Invalid service update data: ${zodError.errors.map(e => e.message).join(', ')}`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
        throw zodError;
      }

      const service = await this.offeringService.updateService(userId, id, validatedData);

      await sendSuccessResponse(
        res,
        'success.service.updated',
        service,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async deleteService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.offeringService.deleteService(userId, id);

      await sendSuccessResponse(
        res,
        'success.service.deleted',
        undefined,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async reorderServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { serviceOrders } = req.body;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate serviceOrders array
      if (!Array.isArray(serviceOrders)) {
        const error = new AppError(
          'serviceOrders must be an array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array length
      if (serviceOrders.length === 0) {
        const error = new AppError(
          'serviceOrders array cannot be empty',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (serviceOrders.length > 100) {
        const error = new AppError(
          'serviceOrders array cannot exceed 100 items',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each order item
      for (let i = 0; i < serviceOrders.length; i++) {
        const order = serviceOrders[i];
        if (!order || typeof order !== 'object') {
          const error = new AppError(
            `serviceOrders[${i}] must be an object`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (!order.id || typeof order.id !== 'string') {
          const error = new AppError(
            `serviceOrders[${i}].id is required and must be a string`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (typeof order.sortOrder !== 'number' || order.sortOrder < 0) {
          const error = new AppError(
            `serviceOrders[${i}].sortOrder must be a non-negative number`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        // Validate service ID format
        if (!idRegex.test(order.id) || order.id.length < 1 || order.id.length > 50) {
          const error = new AppError(
            `serviceOrders[${i}].id has invalid format`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      await this.offeringService.reorderServices(userId, businessId, serviceOrders);

      await sendSuccessResponse(
        res,
        'success.service.reordered',
        undefined,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }


  async getServiceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const stats = await this.offeringService.getServiceStats(userId, id);

      await sendSuccessResponse(
        res,
        'success.service.statsRetrieved',
        stats,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async bulkUpdatePrices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { priceMultiplier } = req.body;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate priceMultiplier
      if (typeof priceMultiplier !== 'number') {
        const error = new AppError(
          'priceMultiplier must be a number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (priceMultiplier <= 0) {
        const error = new AppError(
          'priceMultiplier must be a positive number',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reasonable multiplier range
      if (priceMultiplier < 0.1 || priceMultiplier > 10) {
        const error = new AppError(
          'priceMultiplier must be between 0.1 and 10',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.offeringService.bulkUpdatePrices(userId, businessId, priceMultiplier);

      await sendSuccessResponse(
        res,
        'success.service.pricesUpdated',
        undefined,
        200,
        req,
        { multiplier: priceMultiplier }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getPopularServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { limit } = req.query;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate and parse limit
      let limitNum = 5; // default
      if (limit) {
        limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
          const error = new AppError(
            'limit must be a number between 1 and 50',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const services = await this.offeringService.getPopularServices(userId, businessId, limitNum);

      await sendSuccessResponse(
        res,
        'success.service.popularRetrieved',
        {
          services,
          businessId,
          limit: limitNum
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async checkServiceAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date, startTime } = req.query;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate required query parameters
      if (!date || !startTime) {
        const error = new AppError(
          'date and startTime are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date format
      const appointmentDate = new Date(date as string);
      if (isNaN(appointmentDate.getTime())) {
        const error = new AppError(
          'Invalid date format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate time format
      const appointmentStartTime = new Date(`${date}T${startTime}`);
      if (isNaN(appointmentStartTime.getTime())) {
        const error = new AppError(
          'Invalid time format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date is not in the past
      const now = new Date();
      if (appointmentDate < now) {
        const error = new AppError(
          'Date cannot be in the past',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.offeringService.checkServiceAvailability(
        id,
        appointmentDate,
        appointmentStartTime
      );

      await sendSuccessResponse(
        res,
        'success.service.availabilityChecked',
        {
          serviceId: id,
          date: date as string,
          startTime: startTime as string,
          isAvailable: result.isAvailable,
          service: result.service
        },
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async toggleServiceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const userId = req.user!.id;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate isActive parameter
      if (typeof isActive !== 'boolean') {
        const error = new AppError(
          'isActive must be a boolean',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const service = await this.offeringService.toggleServiceStatus(userId, id, isActive);

      await sendSuccessResponse(
        res,
        isActive ? 'success.service.activated' : 'success.service.deactivated',
        service,
        200,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async duplicateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      const userId = req.user!.id;

      // Validate service ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Service ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate service ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid service ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate newName parameter
      if (!newName || typeof newName !== 'string') {
        const error = new AppError(
          'newName is required and must be a string',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      const trimmedName = newName.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        const error = new AppError(
          'newName must be between 2 and 100 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const service = await this.offeringService.duplicateService(userId, id, trimmedName);

      await sendSuccessResponse(
        res,
        'success.service.duplicated',
        service,
        201,
        req
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Batch operations
  async batchToggleServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { serviceIds, isActive } = req.body;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate serviceIds array
      if (!Array.isArray(serviceIds)) {
        const error = new AppError(
          'serviceIds must be an array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (serviceIds.length === 0) {
        const error = new AppError(
          'serviceIds array cannot be empty',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (serviceIds.length > 100) {
        const error = new AppError(
          'serviceIds array cannot exceed 100 items',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each service ID
      for (let i = 0; i < serviceIds.length; i++) {
        const serviceId = serviceIds[i];
        if (!serviceId || typeof serviceId !== 'string') {
          const error = new AppError(
            `serviceIds[${i}] must be a non-empty string`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
          const error = new AppError(
            `serviceIds[${i}] has invalid format`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Validate isActive parameter
      if (typeof isActive !== 'boolean') {
        const error = new AppError(
          'isActive must be a boolean',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      await this.offeringService.batchToggleServices(userId, businessId, serviceIds, isActive);

      await sendSuccessResponse(
        res,
        isActive ? 'success.service.batchActivated' : 'success.service.batchDeactivated',
        undefined,
        200,
        req,
        { count: serviceIds.length }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async batchDeleteServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { serviceIds } = req.body;
      const userId = req.user!.id;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate businessId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate serviceIds array
      if (!Array.isArray(serviceIds)) {
        const error = new AppError(
          'serviceIds must be an array',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (serviceIds.length === 0) {
        const error = new AppError(
          'serviceIds array cannot be empty',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate array size limit
      if (serviceIds.length > 100) {
        const error = new AppError(
          'serviceIds array cannot exceed 100 items',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate each service ID
      for (let i = 0; i < serviceIds.length; i++) {
        const serviceId = serviceIds[i];
        if (!serviceId || typeof serviceId !== 'string') {
          const error = new AppError(
            `serviceIds[${i}] must be a non-empty string`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }

        if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
          const error = new AppError(
            `serviceIds[${i}] has invalid format`,
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      await this.offeringService.batchDeleteServices(userId, businessId, serviceIds);

      await sendSuccessResponse(
        res,
        'success.service.batchDeleted',
        undefined,
        200,
        req,
        { count: serviceIds.length }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

}