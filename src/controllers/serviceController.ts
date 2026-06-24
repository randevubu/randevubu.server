import { Request, Response } from 'express';
import { OfferingService } from '../services/domain/offering';
import { ResponseHelper } from '../utils/responseHelper';
import { createServiceSchema, updateServiceSchema } from '../schemas/business.schemas';
import { AuthenticatedRequest, GuaranteedAuthRequest } from '../types/request';
import { AppError } from '../types/responseTypes';
// Cache invalidation handled by routes, not controllers

export class ServiceController {
  constructor(
    private offeringService: OfferingService,
    private responseHelper: ResponseHelper
  ) {}

  async createService(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const userId = req.user.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate request body with Zod (ZodError bubbles to global error middleware)
    const validatedData = createServiceSchema.parse(req.body);

    const service = await this.offeringService.createService(userId, businessId, validatedData);

    await this.responseHelper.success(res, 'success.service.created', service, 201, req);
  }

  async getServiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    const service = await this.offeringService.getServiceById(userId, id);

    if (!service) {
      throw new AppError('SERVICE_NOT_FOUND', { message: 'Service not found' });
    }

    await this.responseHelper.success(res, 'success.service.retrieved', service, 200, req);
  }

  async getBusinessServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { activeOnly } = req.query;
    const userId = req.user!.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate activeOnly query parameter
    const activeOnlyBool = activeOnly === 'true';
    if (activeOnly && activeOnly !== 'true' && activeOnly !== 'false') {
      throw new AppError('VALIDATION_ERROR', { message: 'activeOnly must be true or false' });
    }

    const services = await this.offeringService.getServicesByBusinessId(
      userId,
      businessId,
      activeOnlyBool
    );

    await this.responseHelper.success(
      res,
      'success.service.businessRetrieved',
      {
        services,
        total: services.length,
        businessId,
        activeOnly: activeOnlyBool,
      },
      200,
      req
    );
  }

  async getPublicBusinessServices(req: Request, res: Response): Promise<void> {
    const { businessId } = req.params;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    const services = await this.offeringService.getPublicServicesByBusinessId(businessId);

    await this.responseHelper.success(
      res,
      'success.service.publicRetrieved',
      {
        services,
        total: services.length,
        businessId,
      },
      200,
      req
    );
  }

  async updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    // Validate request body with Zod (ZodError bubbles to global error middleware)
    const validatedData = updateServiceSchema.parse(req.body);

    const service = await this.offeringService.updateService(userId, id, validatedData);

    await this.responseHelper.success(res, 'success.service.updated', service, 200, req);
  }

  async deleteService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    await this.offeringService.deleteService(userId, id);

    await this.responseHelper.success(res, 'success.service.deleted', undefined, 200, req);
  }

  async reorderServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { serviceOrders } = req.body;
    const userId = req.user!.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate serviceOrders array
    if (!Array.isArray(serviceOrders)) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceOrders must be an array' });
    }

    // Validate array length
    if (serviceOrders.length === 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceOrders array cannot be empty' });
    }

    // Validate array size limit
    if (serviceOrders.length > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceOrders array cannot exceed 100 items' });
    }

    // Validate each order item
    for (let i = 0; i < serviceOrders.length; i++) {
      const order = serviceOrders[i];
      if (!order || typeof order !== 'object') {
        throw new AppError('VALIDATION_ERROR', { message: `serviceOrders[${i}] must be an object` });
      }

      if (!order.id || typeof order.id !== 'string') {
        throw new AppError('VALIDATION_ERROR', { message: `serviceOrders[${i}].id is required and must be a string` });
      }

      if (typeof order.sortOrder !== 'number' || order.sortOrder < 0) {
        throw new AppError('VALIDATION_ERROR', { message: `serviceOrders[${i}].sortOrder must be a non-negative number` });
      }

      // Validate service ID format
      if (!idRegex.test(order.id) || order.id.length < 1 || order.id.length > 50) {
        throw new AppError('VALIDATION_ERROR', { message: `serviceOrders[${i}].id has invalid format` });
      }
    }

    await this.offeringService.reorderServices(userId, businessId, serviceOrders);

    await this.responseHelper.success(res, 'success.service.reordered', undefined, 200, req);
  }

  async getServiceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    const stats = await this.offeringService.getServiceStats(userId, id);

    await this.responseHelper.success(res, 'success.service.statsRetrieved', stats, 200, req);
  }

  async bulkUpdatePrices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { priceMultiplier } = req.body;
    const userId = req.user!.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate priceMultiplier
    if (typeof priceMultiplier !== 'number') {
      throw new AppError('VALIDATION_ERROR', { message: 'priceMultiplier must be a number' });
    }

    if (priceMultiplier <= 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'priceMultiplier must be a positive number' });
    }

    // Validate reasonable multiplier range
    if (priceMultiplier < 0.1 || priceMultiplier > 10) {
      throw new AppError('VALIDATION_ERROR', { message: 'priceMultiplier must be between 0.1 and 10' });
    }

    await this.offeringService.bulkUpdatePrices(userId, businessId, priceMultiplier);

    await this.responseHelper.success(res, 'success.service.pricesUpdated', undefined, 200, req, {
      multiplier: priceMultiplier,
    });
  }

  async getPopularServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { limit } = req.query;
    const userId = req.user!.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate and parse limit
    let limitNum = 5; // default
    if (limit) {
      limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        throw new AppError('VALIDATION_ERROR', { message: 'limit must be a number between 1 and 50' });
      }
    }

    const services = await this.offeringService.getPopularServices(userId, businessId, limitNum);

    await this.responseHelper.success(
      res,
      'success.service.popularRetrieved',
      {
        services,
        businessId,
        limit: limitNum,
      },
      200,
      req
    );
  }

  async checkServiceAvailability(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { date, startTime } = req.query;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    // Validate required query parameters
    if (!date || !startTime) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'date and startTime are required', params: { field: 'date,startTime' } });
    }

    // Validate date format
    const appointmentDate = new Date(date as string);
    if (isNaN(appointmentDate.getTime())) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid date format' });
    }

    // Validate time format
    const appointmentStartTime = new Date(`${date}T${startTime}`);
    if (isNaN(appointmentStartTime.getTime())) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid time format' });
    }

    // Validate date is not in the past
    const now = new Date();
    if (appointmentDate < now) {
      throw new AppError('VALIDATION_ERROR', { message: 'Date cannot be in the past' });
    }

    const result = await this.offeringService.checkServiceAvailability(
      id,
      appointmentDate,
      appointmentStartTime
    );

    await this.responseHelper.success(
      res,
      'success.service.availabilityChecked',
      {
        serviceId: id,
        date: date as string,
        startTime: startTime as string,
        isAvailable: result.isAvailable,
        service: result.service,
      },
      200,
      req
    );
  }

  async getServiceAssignmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    const status = await this.offeringService.getServiceAssignmentStatus(userId, id);
    await this.responseHelper.success(res, 'Assignment status retrieved', status, 200, req);
  }

  async toggleServiceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { isActive } = req.body;
    const userId = req.user!.id;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    // Validate isActive parameter
    if (typeof isActive !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', { message: 'isActive must be a boolean' });
    }

    const service = await this.offeringService.toggleServiceStatus(userId, id, isActive);

    await this.responseHelper.success(
      res,
      isActive ? 'success.service.activated' : 'success.service.deactivated',
      service,
      200,
      req
    );
  }

  async duplicateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { newName } = req.body;
    const userId = req.user!.id;

    // Validate service ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Service ID is required', params: { field: 'id' } });
    }

    // Validate service ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid service ID format', params: { field: 'id' } });
    }

    // Validate newName parameter
    if (!newName || typeof newName !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'newName is required and must be a string', params: { field: 'newName' } });
    }

    const trimmedName = newName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'newName must be between 2 and 100 characters' });
    }

    const service = await this.offeringService.duplicateService(userId, id, trimmedName);

    await this.responseHelper.success(res, 'success.service.duplicated', service, 201, req);
  }

  // Batch operations
  async batchToggleServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { serviceIds, isActive } = req.body;
    const userId = req.user!.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate serviceIds array
    if (!Array.isArray(serviceIds)) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceIds must be an array' });
    }

    if (serviceIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceIds array cannot be empty' });
    }

    // Validate array size limit
    if (serviceIds.length > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceIds array cannot exceed 100 items' });
    }

    // Validate each service ID
    for (let i = 0; i < serviceIds.length; i++) {
      const serviceId = serviceIds[i];
      if (!serviceId || typeof serviceId !== 'string') {
        throw new AppError('VALIDATION_ERROR', { message: `serviceIds[${i}] must be a non-empty string` });
      }

      if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
        throw new AppError('VALIDATION_ERROR', { message: `serviceIds[${i}] has invalid format` });
      }
    }

    // Validate isActive parameter
    if (typeof isActive !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', { message: 'isActive must be a boolean' });
    }

    await this.offeringService.batchToggleServices(userId, businessId, serviceIds, isActive);

    await this.responseHelper.success(
      res,
      isActive ? 'success.service.batchActivated' : 'success.service.batchDeactivated',
      undefined,
      200,
      req,
      { count: serviceIds.length }
    );
  }

  async batchDeleteServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { serviceIds } = req.body;
    const userId = req.user!.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate businessId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    // Validate serviceIds array
    if (!Array.isArray(serviceIds)) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceIds must be an array' });
    }

    if (serviceIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceIds array cannot be empty' });
    }

    // Validate array size limit
    if (serviceIds.length > 100) {
      throw new AppError('VALIDATION_ERROR', { message: 'serviceIds array cannot exceed 100 items' });
    }

    // Validate each service ID
    for (let i = 0; i < serviceIds.length; i++) {
      const serviceId = serviceIds[i];
      if (!serviceId || typeof serviceId !== 'string') {
        throw new AppError('VALIDATION_ERROR', { message: `serviceIds[${i}] must be a non-empty string` });
      }

      if (!idRegex.test(serviceId) || serviceId.length < 1 || serviceId.length > 50) {
        throw new AppError('VALIDATION_ERROR', { message: `serviceIds[${i}] has invalid format` });
      }
    }

    await this.offeringService.batchDeleteServices(userId, businessId, serviceIds);

    await this.responseHelper.success(res, 'success.service.batchDeleted', undefined, 200, req, {
      count: serviceIds.length,
    });
  }
}
