import { Request, Response } from 'express';
import { SubscriptionService } from '../services/domain/subscription';
import { subscribeBusinessSchema } from '../schemas/business.schemas';
import { GuaranteedAuthRequest } from '../types/auth';
import { SubscriptionStatus } from '../types/business';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private responseHelper: ResponseHelper
  ) {}

  // Public endpoints
  async getAllPlans(req: Request, res: Response): Promise<void> {
    const { city, state, country } = req.query;

    // Use provided city or default to Istanbul
    // Frontend should handle geolocation and pass city parameter
    const finalCity = (city as string) || 'Istanbul';
    const finalState = (state as string) || 'Istanbul';
    const finalCountry = (country as string) || 'Turkey';

    const detectedLocation = {
      city: finalCity,
      state: finalState,
      country: finalCountry,
      detected: !!city, // true if city was provided by frontend, false if using default
      source: city ? 'frontend' : 'default',
    };

    const plans = await this.subscriptionService.getAllPlansWithLocationPricing(
      finalCity,
      finalState,
      finalCountry
    );

    const responseData = {
      plans,
      location: detectedLocation,
    };

    await this.responseHelper.success(
      res,
      'success.subscription.plansRetrieved',
      responseData,
      200,
      req
    );
  }

  async getPlanById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { city, state, country } = req.query;

    // Validate plan ID parameter
    if (!id || typeof id !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Plan ID is required', params: { field: 'id' } });
    }

    // Validate plan ID format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(id) || id.length < 1 || id.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid plan ID format', params: { field: 'id' } });
    }

    const plan = await this.subscriptionService.getPlanByIdWithLocationPricing(
      id,
      city as string,
      state as string,
      (country as string) || 'Turkey'
    );

    if (!plan) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: 'Plan not found' });
    }

    const responseData = {
      plan,
      location: city
        ? {
            city: city as string,
            state: state as string,
            country: (country as string) || 'Turkey',
          }
        : null,
    };

    await this.responseHelper.success(
      res,
      'success.subscription.planRetrieved',
      responseData,
      200,
      req
    );
  }

  async getPlansByBillingInterval(req: Request, res: Response): Promise<void> {
    const { interval } = req.params;
    const { city, state, country } = req.query;

    // Validate interval parameter
    if (!interval || typeof interval !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Billing interval is required', params: { field: 'interval' } });
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid billing interval. Must be monthly or yearly' });
    }

    const plans = await this.subscriptionService.getPlansByBillingIntervalWithLocationPricing(
      interval,
      city as string,
      state as string,
      (country as string) || 'Turkey'
    );

    const responseData = {
      plans,
      location: city
        ? {
            city: city as string,
            state: state as string,
            country: (country as string) || 'Turkey',
          }
        : null,
    };

    await this.responseHelper.success(
      res,
      'success.subscription.plansRetrieved',
      responseData,
      200,
      req
    );
  }

  // Business subscription management
  async subscribeBusiness(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

    // Validate request body with Zod — let ZodError bubble to global middleware
    const validatedData = subscribeBusinessSchema.parse(req.body);

    // For trial subscriptions, we need to store the payment method first
    let finalData = validatedData;

    // If card data is provided (for trial subscriptions), store the payment method
    if (validatedData.card && !validatedData.paymentMethodId) {
      // This would typically be done through a payment service
      // For now, we'll create a mock payment method ID
      const mockPaymentMethodId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      finalData = {
        ...validatedData,
        paymentMethodId: mockPaymentMethodId,
      };
    }

    const subscription = await this.subscriptionService.subscribeBusiness(
      userId,
      businessId,
      finalData
    );

    await this.responseHelper.success(
      res,
      'success.subscription.created',
      subscription,
      201,
      req
    );
  }

  async getBusinessSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

    const subscription = await this.subscriptionService.getBusinessSubscription(
      userId,
      businessId
    );

    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: 'No active subscription found' });
    }

    await this.responseHelper.success(
      res,
      'success.subscription.businessRetrieved',
      subscription,
      200,
      req
    );
  }

  async getSubscriptionHistory(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

    const subscriptions = await this.subscriptionService.getSubscriptionHistory(
      userId,
      businessId
    );

    await this.responseHelper.success(
      res,
      'success.subscription.historyRetrieved',
      subscriptions,
      200,
      req
    );
  }

  async upgradePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { newPlanId } = req.body;
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

    // Validate newPlanId parameter
    if (!newPlanId || typeof newPlanId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'New plan ID is required', params: { field: 'newPlanId' } });
    }

    // Validate newPlanId format
    if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid new plan ID format', params: { field: 'newPlanId' } });
    }

    const subscription = await this.subscriptionService.upgradePlan(
      userId,
      businessId,
      newPlanId
    );

    await this.responseHelper.success(
      res,
      'success.subscription.planUpgraded',
      subscription,
      200,
      req
    );
  }

  async downgradePlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { newPlanId } = req.body;
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

    // Validate newPlanId parameter
    if (!newPlanId || typeof newPlanId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'New plan ID is required', params: { field: 'newPlanId' } });
    }

    // Validate newPlanId format
    if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid new plan ID format', params: { field: 'newPlanId' } });
    }

    const subscription = await this.subscriptionService.downgradePlan(
      userId,
      businessId,
      newPlanId
    );

    await this.responseHelper.success(
      res,
      'success.subscription.planDowngraded',
      subscription,
      200,
      req
    );
  }

  async cancelSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;
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

    // Validate cancelAtPeriodEnd parameter
    if (typeof cancelAtPeriodEnd !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', { message: 'cancelAtPeriodEnd must be a boolean' });
    }

    const subscription = await this.subscriptionService.cancelSubscription(
      userId,
      businessId,
      cancelAtPeriodEnd
    );

    const messageKey = cancelAtPeriodEnd
      ? 'success.subscription.cancelledAtPeriodEnd'
      : 'success.subscription.cancelledImmediately';

    await this.responseHelper.success(res, messageKey, subscription, 200, req);
  }

  async reactivateSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

    const subscription = await this.subscriptionService.reactivateSubscription(
      userId,
      businessId
    );

    await this.responseHelper.success(
      res,
      'success.subscription.reactivated',
      subscription,
      200,
      req
    );
  }

  async convertTrialToActive(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { paymentMethodId } = req.body;
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

    // Validate paymentMethodId parameter
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Payment method ID is required', params: { field: 'paymentMethodId' } });
    }

    // Validate paymentMethodId format
    if (
      !idRegex.test(paymentMethodId) ||
      paymentMethodId.length < 1 ||
      paymentMethodId.length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid payment method ID format', params: { field: 'paymentMethodId' } });
    }

    const subscription = await this.subscriptionService.convertTrialToActive(
      userId,
      businessId,
      paymentMethodId
    );

    await this.responseHelper.success(
      res,
      'success.subscription.trialConverted',
      subscription,
      200,
      req
    );
  }

  async checkSubscriptionLimits(req: GuaranteedAuthRequest, res: Response): Promise<void> {
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

    const limits = await this.subscriptionService.checkSubscriptionLimits(userId, businessId);

    await this.responseHelper.success(
      res,
      'success.subscription.limitsRetrieved',
      limits,
      200,
      req
    );
  }

  async calculateUpgradeProration(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { currentPlanId, newPlanId, currentPeriodEnd } = req.query;

    // Validate required query parameters
    if (!currentPlanId || !newPlanId || !currentPeriodEnd) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'currentPlanId, newPlanId, and currentPeriodEnd are required', params: { field: 'currentPlanId, newPlanId, currentPeriodEnd' } });
    }

    // Validate plan IDs format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (
      !idRegex.test(currentPlanId as string) ||
      (currentPlanId as string).length < 1 ||
      (currentPlanId as string).length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid current plan ID format', params: { field: 'currentPlanId' } });
    }

    if (
      !idRegex.test(newPlanId as string) ||
      (newPlanId as string).length < 1 ||
      (newPlanId as string).length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid new plan ID format', params: { field: 'newPlanId' } });
    }

    // Validate date format
    const periodEnd = new Date(currentPeriodEnd as string);
    if (isNaN(periodEnd.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid currentPeriodEnd date format' });
    }

    const proration = await this.subscriptionService.calculateUpgradeProration(
      currentPlanId as string,
      newPlanId as string,
      periodEnd
    );

    await this.responseHelper.success(
      res,
      'success.subscription.prorationCalculated',
      proration,
      200,
      req
    );
  }

  async validatePlanLimits(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId, planId } = req.params;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate planId parameter
    if (!planId || typeof planId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Plan ID is required', params: { field: 'planId' } });
    }

    // Validate ID formats
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    if (!idRegex.test(planId) || planId.length < 1 || planId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid plan ID format', params: { field: 'planId' } });
    }

    const validation = await this.subscriptionService.validatePlanLimits(businessId, planId);

    await this.responseHelper.success(
      res,
      'success.subscription.limitsValidated',
      validation,
      200,
      req
    );
  }

  // Admin endpoints
  async getAllSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;
    const { page, limit } = req.query;

    // Validate and parse pagination parameters
    let pageNum = 1;
    let limitNum = 20;

    if (page) {
      pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
        throw new AppError('VALIDATION_ERROR', { message: 'Page must be a number between 1 and 1000' });
      }
    }

    if (limit) {
      limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new AppError('VALIDATION_ERROR', { message: 'Limit must be a number between 1 and 100' });
      }
    }

    const result = await this.subscriptionService.getAllSubscriptions(userId, pageNum, limitNum);

    await this.responseHelper.success(
      res,
      'success.subscription.allRetrieved',
      result.subscriptions,
      200,
      req
    );
  }

  async getSubscriptionStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;

    const stats = await this.subscriptionService.getSubscriptionStats(userId);

    await this.responseHelper.success(
      res,
      'success.subscription.statsRetrieved',
      stats,
      200,
      req
    );
  }

  async getTrialsEndingSoon(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;
    const { days } = req.query;

    // Validate and parse days parameter
    let daysNum = 3;
    if (days) {
      daysNum = parseInt(days as string, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
        throw new AppError('VALIDATION_ERROR', { message: 'Days must be between 1 and 30' });
      }
    }

    const trials = await this.subscriptionService.getTrialsEndingSoon(userId, daysNum);

    await this.responseHelper.success(
      res,
      'success.subscription.trialsEndingRetrieved',
      trials,
      200,
      req
    );
  }

  async getExpiredSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;

    const expired = await this.subscriptionService.getExpiredSubscriptions(userId);

    await this.responseHelper.success(
      res,
      'success.subscription.expiredRetrieved',
      expired,
      200,
      req
    );
  }

  async forceUpdateSubscriptionStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { subscriptionId } = req.params;
    const { status, reason } = req.body;
    const userId = req.user.id;

    // Validate subscriptionId parameter
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Subscription ID is required', params: { field: 'subscriptionId' } });
    }

    // Validate subscriptionId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (
      !idRegex.test(subscriptionId) ||
      subscriptionId.length < 1 ||
      subscriptionId.length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid subscription ID format', params: { field: 'subscriptionId' } });
    }

    // Validate status parameter
    if (!status || !Object.values(SubscriptionStatus).includes(status)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid subscription status' });
    }

    // Validate reason if provided
    if (
      reason &&
      (typeof reason !== 'string' || reason.trim().length < 1 || reason.trim().length > 500)
    ) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be between 1 and 500 characters' });
    }

    const subscription = await this.subscriptionService.forceUpdateSubscriptionStatus(
      userId,
      subscriptionId,
      status,
      reason?.trim()
    );

    await this.responseHelper.success(
      res,
      'success.subscription.statusUpdated',
      subscription,
      200,
      req,
      { status }
    );
  }

  // System endpoints
  async processExpiredSubscriptions(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    // This would typically be restricted to system calls
    const result = await this.subscriptionService.processExpiredSubscriptions();

    await this.responseHelper.success(
      res,
      'success.subscription.expiredProcessed',
      result,
      200,
      req,
      { count: result.processed }
    );
  }

  async processSubscriptionRenewals(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    // System endpoint for processing renewals
    const result = await this.subscriptionService.processSubscriptionRenewals();

    await this.responseHelper.success(
      res,
      'success.subscription.renewalsProcessed',
      result,
      200,
      req,
      { processed: result.processed, renewed: result.renewed, failed: result.failed }
    );
  }

  async sendTrialEndingNotifications(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    // System endpoint
    const count = await this.subscriptionService.sendTrialEndingNotifications();

    await this.responseHelper.success(
      res,
      'success.subscription.trialNotificationsSent',
      { notificationsSent: count },
      200,
      req,
      { count }
    );
  }

  // Utility endpoints
  async getSubscriptionsByStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { status } = req.params;
    const userId = req.user.id;

    // Validate status parameter
    if (!status || typeof status !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Status is required', params: { field: 'status' } });
    }

    if (!Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid subscription status' });
    }

    // This would need to be implemented in the service
    throw new AppError('INTERNAL_SERVER_ERROR', { message: 'getSubscriptionsByStatus not implemented' });
  }

  async getSubscriptionsByPlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { planId } = req.params;
    const userId = req.user.id;

    // Validate planId parameter
    if (!planId || typeof planId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Plan ID is required', params: { field: 'planId' } });
    }

    // Validate planId format
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(planId) || planId.length < 1 || planId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid plan ID format', params: { field: 'planId' } });
    }

    // This would need to be implemented in the service
    throw new AppError('INTERNAL_SERVER_ERROR', { message: 'getSubscriptionsByPlan not implemented' });
  }

  async getBusinessesWithoutSubscription(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;

    // This would need to be implemented in the service
    throw new AppError('INTERNAL_SERVER_ERROR', { message: 'getBusinessesWithoutSubscription not implemented' });
  }

  async getRevenueAnalytics(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Validate date parameters if provided
    if (startDate) {
      const start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid startDate format' });
      }
    }

    if (endDate) {
      const end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid endDate format' });
      }
    }

    // Validate date range if both provided
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      if (start > end) {
        throw new AppError('VALIDATION_ERROR', { message: 'Start date must be before end date' });
      }
    }

    // This would need to be implemented in the service
    throw new AppError('INTERNAL_SERVER_ERROR', { message: 'getRevenueAnalytics not implemented' });
  }

  async calculateSubscriptionChange(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId, subscriptionId } = req.params;
    const { newPlanId } = req.body;
    const userId = req.user.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate subscriptionId parameter
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Subscription ID is required', params: { field: 'subscriptionId' } });
    }

    // Validate newPlanId parameter
    if (!newPlanId || typeof newPlanId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'New plan ID is required', params: { field: 'newPlanId' } });
    }

    // Validate ID formats
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    if (
      !idRegex.test(subscriptionId) ||
      subscriptionId.length < 1 ||
      subscriptionId.length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid subscription ID format', params: { field: 'subscriptionId' } });
    }

    if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid new plan ID format', params: { field: 'newPlanId' } });
    }

    const calculation = await this.subscriptionService.calculateSubscriptionChange(
      userId,
      businessId,
      subscriptionId,
      newPlanId
    );

    await this.responseHelper.success(
      res,
      'success.subscription.changeCalculated',
      calculation,
      200,
      req
    );
  }

  async changeSubscriptionPlan(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId, subscriptionId } = req.params;
    const { newPlanId, effectiveDate, prorationPreference, paymentMethodId } = req.body;
    const userId = req.user.id;

    // Validate businessId parameter
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    // Validate subscriptionId parameter
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Subscription ID is required', params: { field: 'subscriptionId' } });
    }

    // Validate required fields
    if (!newPlanId || !effectiveDate || !prorationPreference || !paymentMethodId) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'newPlanId, effectiveDate, prorationPreference, and paymentMethodId are required', params: { field: 'newPlanId, effectiveDate, prorationPreference, paymentMethodId' } });
    }

    // Validate ID formats
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }

    if (
      !idRegex.test(subscriptionId) ||
      subscriptionId.length < 1 ||
      subscriptionId.length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid subscription ID format', params: { field: 'subscriptionId' } });
    }

    if (!idRegex.test(newPlanId) || newPlanId.length < 1 || newPlanId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid new plan ID format', params: { field: 'newPlanId' } });
    }

    if (
      !idRegex.test(paymentMethodId) ||
      paymentMethodId.length < 1 ||
      paymentMethodId.length > 50
    ) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid payment method ID format', params: { field: 'paymentMethodId' } });
    }

    // Validate effectiveDate
    const effective = new Date(effectiveDate);
    if (isNaN(effective.getTime())) {
      throw new AppError('INVALID_DATE_FORMAT', { message: 'Invalid effectiveDate format' });
    }

    // Validate prorationPreference
    const validProrationPreferences = ['immediate', 'next_billing_cycle', 'custom'];
    if (!validProrationPreferences.includes(prorationPreference)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid prorationPreference. Must be immediate, next_billing_cycle, or custom' });
    }

    const result = await this.subscriptionService.changeSubscriptionPlan(
      userId,
      businessId,
      subscriptionId,
      {
        newPlanId,
        effectiveDate: effective.toISOString(),
        prorationPreference,
        paymentMethodId,
      }
    );

    await this.responseHelper.success(res, 'success.subscription.planChanged', result, 200, req);
  }

  async applyDiscountCode(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const { businessId } = req.params;
    const { discountCode } = req.body;
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

    // Validate discount code
    if (!discountCode || typeof discountCode !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Discount code is required', params: { field: 'discountCode' } });
    }

    // Get subscription
    const subscription = await this.subscriptionService.getBusinessSubscription(
      userId,
      businessId
    );

    if (!subscription) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', { message: 'Subscription not found' });
    }

    // Apply discount to subscription
    const result = await this.subscriptionService.applyDiscountToSubscription(
      subscription.id,
      discountCode,
      userId
    );

    if (result.success) {
      await this.responseHelper.success(res, 'success.discountCode.applied', result, 200, req);
    } else {
      throw new AppError('VALIDATION_ERROR', { message: result.error || 'Failed to apply discount code' });
    }
  }
}
