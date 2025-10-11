import { Request, Response } from 'express';
import { SubscriptionService } from '../services/domain/subscription';
import { subscribeBusinessSchema } from '../schemas/business.schemas';
import { GuaranteedAuthRequest } from '../types/auth';
import { SubscriptionStatus } from '../types/business';
import {
  handleRouteError,
  sendSuccessResponse,
  createErrorContext,
  sendAppErrorResponse,
} from '../utils/responseUtils';
import { AppError } from '../types/responseTypes';
import { ERROR_CODES } from '../constants/errorCodes';
import { ZodError } from 'zod';

export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  // Public endpoints
  async getAllPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await this.subscriptionService.getAllPlans();

      sendSuccessResponse(
        res,
        'Subscription plans retrieved successfully',
        plans
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getPlanById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate plan ID parameter
      if (!id || typeof id !== 'string') {
        const error = new AppError(
          'Plan ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate plan ID format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
        const error = new AppError(
          'Invalid plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const plan = await this.subscriptionService.getPlanById(id);

      if (!plan) {
        const error = new AppError(
          'Plan not found',
          404,
          ERROR_CODES.SUBSCRIPTION_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      sendSuccessResponse(
        res,
        'Subscription plan retrieved successfully',
        plan
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getPlansByBillingInterval(req: Request, res: Response): Promise<void> {
    try {
      const { interval } = req.params;

      // Validate interval parameter
      if (!interval || typeof interval !== 'string') {
        const error = new AppError(
          'Billing interval is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      if (!['monthly', 'yearly'].includes(interval)) {
        const error = new AppError(
          'Invalid billing interval. Must be monthly or yearly',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const plans = await this.subscriptionService.getPlansByBillingInterval(interval);

      sendSuccessResponse(
        res,
        'Subscription plans retrieved successfully',
        plans
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Business subscription management
  async subscribeBusiness(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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
        validatedData = subscribeBusinessSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const error = new AppError(
            'Invalid subscription data',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
        throw zodError;
      }

      const subscription = await this.subscriptionService.subscribeBusiness(
        userId,
        businessId,
        validatedData
      );

      sendSuccessResponse(
        res,
        'Business subscribed successfully',
        subscription,
        201
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getBusinessSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

      const subscription = await this.subscriptionService.getBusinessSubscription(userId, businessId);

      if (!subscription) {
        const error = new AppError(
          'No active subscription found',
          404,
          ERROR_CODES.SUBSCRIPTION_NOT_FOUND
        );
        return sendAppErrorResponse(res, error);
      }

      sendSuccessResponse(
        res,
        'Business subscription retrieved successfully',
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getSubscriptionHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

      const subscriptions = await this.subscriptionService.getSubscriptionHistory(userId, businessId);

      sendSuccessResponse(
        res,
        'Subscription history retrieved successfully',
        subscriptions
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async upgradePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { newPlanId } = req.body;
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

      // Validate newPlanId parameter
      if (!newPlanId || typeof newPlanId !== 'string') {
        const error = new AppError(
          'New plan ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate newPlanId format
      if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
        const error = new AppError(
          'Invalid new plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const subscription = await this.subscriptionService.upgradePlan(
        userId,
        businessId,
        newPlanId
      );

      sendSuccessResponse(
        res,
        'Plan upgraded successfully',
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async downgradePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { newPlanId } = req.body;
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

      // Validate newPlanId parameter
      if (!newPlanId || typeof newPlanId !== 'string') {
        const error = new AppError(
          'New plan ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate newPlanId format
      if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
        const error = new AppError(
          'Invalid new plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const subscription = await this.subscriptionService.downgradePlan(
        userId,
        businessId,
        newPlanId
      );

      sendSuccessResponse(
        res,
        'Plan downgraded successfully',
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async cancelSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { cancelAtPeriodEnd = true } = req.body;
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

      // Validate cancelAtPeriodEnd parameter
      if (typeof cancelAtPeriodEnd !== 'boolean') {
        const error = new AppError(
          'cancelAtPeriodEnd must be a boolean',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const subscription = await this.subscriptionService.cancelSubscription(
        userId,
        businessId,
        cancelAtPeriodEnd
      );

      const message = cancelAtPeriodEnd 
        ? 'Subscription will be cancelled at period end'
        : 'Subscription cancelled immediately';

      sendSuccessResponse(
        res,
        message,
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async reactivateSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

      const subscription = await this.subscriptionService.reactivateSubscription(
        userId,
        businessId
      );

      sendSuccessResponse(
        res,
        'Subscription reactivated successfully',
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async convertTrialToActive(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { paymentMethodId } = req.body;
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

      // Validate paymentMethodId parameter
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        const error = new AppError(
          'Payment method ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate paymentMethodId format
      if (!idRegex.test(paymentMethodId) || paymentMethodId.length < 1 || paymentMethodId.length > 50) {
        const error = new AppError(
          'Invalid payment method ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const subscription = await this.subscriptionService.convertTrialToActive(
        userId,
        businessId,
        paymentMethodId
      );

      sendSuccessResponse(
        res,
        'Trial converted to active subscription',
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async checkSubscriptionLimits(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

      const limits = await this.subscriptionService.checkSubscriptionLimits(userId, businessId);

      sendSuccessResponse(
        res,
        'Subscription limits retrieved successfully',
        limits
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async calculateUpgradeProration(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { currentPlanId, newPlanId, currentPeriodEnd } = req.query;

      // Validate required query parameters
      if (!currentPlanId || !newPlanId || !currentPeriodEnd) {
        const error = new AppError(
          'currentPlanId, newPlanId, and currentPeriodEnd are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate plan IDs format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(currentPlanId as string) || (currentPlanId as string).length < 1 || (currentPlanId as string).length > 50) {
        const error = new AppError(
          'Invalid current plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(newPlanId as string) || (newPlanId as string).length < 1 || (newPlanId as string).length > 50) {
        const error = new AppError(
          'Invalid new plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate date format
      const periodEnd = new Date(currentPeriodEnd as string);
      if (isNaN(periodEnd.getTime())) {
        const error = new AppError(
          'Invalid currentPeriodEnd date format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const proration = await this.subscriptionService.calculateUpgradeProration(
        currentPlanId as string,
        newPlanId as string,
        periodEnd
      );

      sendSuccessResponse(
        res,
        'Upgrade proration calculated successfully',
        proration
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async validatePlanLimits(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, planId } = req.params;

      // Validate businessId parameter
      if (!businessId || typeof businessId !== 'string') {
        const error = new AppError(
          'Business ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate planId parameter
      if (!planId || typeof planId !== 'string') {
        const error = new AppError(
          'Plan ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID formats
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(planId) || planId.length < 1 || planId.length > 50) {
        const error = new AppError(
          'Invalid plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const validation = await this.subscriptionService.validatePlanLimits(businessId, planId);

      sendSuccessResponse(
        res,
        'Plan limits validation completed successfully',
        validation
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Admin endpoints
  async getAllSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;

      // Validate and parse pagination parameters
      let pageNum = 1;
      let limitNum = 20;

      if (page) {
        pageNum = parseInt(page as string, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
          const error = new AppError(
            'Page must be a number between 1 and 1000',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      if (limit) {
        limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          const error = new AppError(
            'Limit must be a number between 1 and 100',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const result = await this.subscriptionService.getAllSubscriptions(userId, pageNum, limitNum);

      sendSuccessResponse(
        res,
        'All subscriptions retrieved successfully',
        result.subscriptions
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getSubscriptionStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const stats = await this.subscriptionService.getSubscriptionStats(userId);

      sendSuccessResponse(
        res,
        'Subscription statistics retrieved successfully',
        stats
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getTrialsEndingSoon(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { days } = req.query;

      // Validate and parse days parameter
      let daysNum = 3;
      if (days) {
        daysNum = parseInt(days as string, 10);
        if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
          const error = new AppError(
            'Days must be between 1 and 30',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      const trials = await this.subscriptionService.getTrialsEndingSoon(userId, daysNum);

      sendSuccessResponse(
        res,
        'Trials ending soon retrieved successfully',
        trials
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getExpiredSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const expired = await this.subscriptionService.getExpiredSubscriptions(userId);

      sendSuccessResponse(
        res,
        'Expired subscriptions retrieved successfully',
        expired
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async forceUpdateSubscriptionStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { status, reason } = req.body;
      const userId = req.user.id;

      // Validate subscriptionId parameter
      if (!subscriptionId || typeof subscriptionId !== 'string') {
        const error = new AppError(
          'Subscription ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate subscriptionId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(subscriptionId) || subscriptionId.length < 1 || subscriptionId.length > 50) {
        const error = new AppError(
          'Invalid subscription ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate status parameter
      if (!status || !Object.values(SubscriptionStatus).includes(status)) {
        const error = new AppError(
          'Invalid subscription status',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate reason if provided
      if (reason && (typeof reason !== 'string' || reason.trim().length < 1 || reason.trim().length > 500)) {
        const error = new AppError(
          'Reason must be between 1 and 500 characters',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const subscription = await this.subscriptionService.forceUpdateSubscriptionStatus(
        userId,
        subscriptionId,
        status,
        reason?.trim()
      );

      sendSuccessResponse(
        res,
        `Subscription status updated to ${status}`,
        subscription
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // System endpoints
  async processExpiredSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // This would typically be restricted to system calls
      const result = await this.subscriptionService.processExpiredSubscriptions();

      sendSuccessResponse(
        res,
        `Processed ${result.processed} expired subscriptions`,
        result
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async processSubscriptionRenewals(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint for processing renewals
      const result = await this.subscriptionService.processSubscriptionRenewals();

      sendSuccessResponse(
        res,
        `Processed ${result.processed} renewals, ${result.renewed} successful, ${result.failed} failed`,
        result
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async sendTrialEndingNotifications(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.subscriptionService.sendTrialEndingNotifications();

      sendSuccessResponse(
        res,
        `Sent ${count} trial ending notifications`,
        { notificationsSent: count }
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  // Utility endpoints
  async getSubscriptionsByStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const userId = req.user.id;
      
      // Validate status parameter
      if (!status || typeof status !== 'string') {
        const error = new AppError(
          'Status is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      if (!Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
        const error = new AppError(
          'Invalid subscription status',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // This would need to be implemented in the service
      const error = new AppError(
        'getSubscriptionsByStatus not implemented',
        501,
        ERROR_CODES.VALIDATION_ERROR
      );
      return sendAppErrorResponse(res, error);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getSubscriptionsByPlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { planId } = req.params;
      const userId = req.user.id;

      // Validate planId parameter
      if (!planId || typeof planId !== 'string') {
        const error = new AppError(
          'Plan ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate planId format
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(planId) || planId.length < 1 || planId.length > 50) {
        const error = new AppError(
          'Invalid plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // This would need to be implemented in the service
      const error = new AppError(
        'getSubscriptionsByPlan not implemented',
        501,
        ERROR_CODES.VALIDATION_ERROR
      );
      return sendAppErrorResponse(res, error);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getBusinessesWithoutSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // This would need to be implemented in the service
      const error = new AppError(
        'getBusinessesWithoutSubscription not implemented',
        501,
        ERROR_CODES.VALIDATION_ERROR
      );
      return sendAppErrorResponse(res, error);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async getRevenueAnalytics(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      // Validate date parameters if provided
      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          const error = new AppError(
            'Invalid startDate format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      if (endDate) {
        const end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          const error = new AppError(
            'Invalid endDate format',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // Validate date range if both provided
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        if (start > end) {
          const error = new AppError(
            'Start date must be before end date',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
          return sendAppErrorResponse(res, error);
        }
      }

      // This would need to be implemented in the service
      const error = new AppError(
        'getRevenueAnalytics not implemented',
        501,
        ERROR_CODES.VALIDATION_ERROR
      );
      return sendAppErrorResponse(res, error);
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async calculateSubscriptionChange(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, subscriptionId } = req.params;
      const { newPlanId } = req.body;
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

      // Validate subscriptionId parameter
      if (!subscriptionId || typeof subscriptionId !== 'string') {
        const error = new AppError(
          'Subscription ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate newPlanId parameter
      if (!newPlanId || typeof newPlanId !== 'string') {
        const error = new AppError(
          'New plan ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID formats
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(subscriptionId) || subscriptionId.length < 1 || subscriptionId.length > 50) {
        const error = new AppError(
          'Invalid subscription ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
        const error = new AppError(
          'Invalid new plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const calculation = await this.subscriptionService.calculateSubscriptionChange(
        userId,
        businessId,
        subscriptionId,
        newPlanId
      );

      sendSuccessResponse(
        res,
        'Subscription change calculation completed successfully',
        calculation
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }

  async changeSubscriptionPlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    try {
      const { businessId, subscriptionId } = req.params;
      const { newPlanId, effectiveDate, prorationPreference, paymentMethodId } = req.body;
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

      // Validate subscriptionId parameter
      if (!subscriptionId || typeof subscriptionId !== 'string') {
        const error = new AppError(
          'Subscription ID is required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate required fields
      if (!newPlanId || !effectiveDate || !prorationPreference || !paymentMethodId) {
        const error = new AppError(
          'newPlanId, effectiveDate, prorationPreference, and paymentMethodId are required',
          400,
          ERROR_CODES.REQUIRED_FIELD_MISSING
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate ID formats
      const idRegex = /^[a-zA-Z0-9-_]+$/;
      if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
        const error = new AppError(
          'Invalid business ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(subscriptionId) || subscriptionId.length < 1 || subscriptionId.length > 50) {
        const error = new AppError(
          'Invalid subscription ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
        const error = new AppError(
          'Invalid new plan ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      if (!idRegex.test(paymentMethodId) || paymentMethodId.length < 1 || paymentMethodId.length > 50) {
        const error = new AppError(
          'Invalid payment method ID format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate effectiveDate
      const effective = new Date(effectiveDate);
      if (isNaN(effective.getTime())) {
        const error = new AppError(
          'Invalid effectiveDate format',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      // Validate prorationPreference
      const validProrationPreferences = ['immediate', 'next_billing_cycle', 'custom'];
      if (!validProrationPreferences.includes(prorationPreference)) {
        const error = new AppError(
          'Invalid prorationPreference. Must be immediate, next_billing_cycle, or custom',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
        return sendAppErrorResponse(res, error);
      }

      const result = await this.subscriptionService.changeSubscriptionPlan(
        userId,
        businessId,
        subscriptionId,
        {
          newPlanId,
          effectiveDate: effective.toISOString(),
          prorationPreference,
          paymentMethodId
        }
      );

      sendSuccessResponse(
        res,
        'Subscription plan changed successfully',
        result
      );
    } catch (error) {
      handleRouteError(error, req, res);
    }
  }
}