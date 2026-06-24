import { Response } from 'express';
import { z } from 'zod';
import { BusinessContextRequest } from '../middleware/businessContext';
import { UsageService } from '../services/domain/usage';
import { AuthenticatedRequest } from '../types/request';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';

const usageQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30),
  months: z.coerce.number().min(1).max(24).optional().default(12),
});

export class UsageController {
  constructor(
    private usageService: UsageService,
    private responseHelper: ResponseHelper
  ) {}

  private requireBusinessId(req: BusinessContextRequest | AuthenticatedRequest): string {
    const businessId = req.params.businessId;
    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(businessId) || businessId.length < 1 || businessId.length > 50) {
      throw new AppError('INVALID_ID_FORMAT', { message: 'Invalid business ID format', params: { field: 'businessId' } });
    }
    return businessId;
  }

  async getUsageSummary(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const summary = await this.usageService.getBusinessUsageSummary(userId, businessId);

    if (!summary) {
      throw new AppError('BUSINESS_NOT_FOUND', { message: 'Business not found for usage summary' });
    }

    await this.responseHelper.success(res, 'success.usage.summaryRetrieved', summary, 200, req);
  }

  async getUsageAlerts(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const alerts = await this.usageService.getUsageAlerts(userId, businessId);

    if (!alerts) {
      throw new AppError('BUSINESS_NOT_FOUND', { message: 'Business not found for usage alerts' });
    }

    await this.responseHelper.success(res, 'success.usage.alertsRetrieved', alerts, 200, req);
  }

  async getDailySmsUsage(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const queryResult = usageQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid query parameters' });
    }

    const { days } = queryResult.data;
    const usage = await this.usageService.getDailyUsageChart(userId, businessId, days);

    await this.responseHelper.success(res, 'success.usage.dailySmsRetrieved', usage, 200, req, { days });
  }

  async getMonthlyUsageHistory(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const queryResult = usageQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new AppError('VALIDATION_ERROR', { message: 'Invalid query parameters' });
    }

    const { months } = queryResult.data;
    const history = await this.usageService.getMonthlyUsageHistory(userId, businessId, months);

    await this.responseHelper.success(res, 'success.usage.monthlyHistoryRetrieved', history, 200, req, { months });
  }

  async checkLimits(req: BusinessContextRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const businessId = this.requireBusinessId(req);

    const [smsCheck, staffCheck, serviceCheck, customerCheck] = await Promise.all([
      this.usageService.canSendSms(businessId),
      this.usageService.canAddStaffMember(businessId),
      this.usageService.canAddService(businessId),
      this.usageService.canAddCustomer(businessId),
    ]);

    await this.responseHelper.success(
      res, 'success.usage.limitsChecked',
      { sms: smsCheck, staff: staffCheck, service: serviceCheck, customer: customerCheck },
      200, req
    );
  }

  async refreshUsageCounters(req: AuthenticatedRequest, res: Response): Promise<void> {
    const businessId = this.requireBusinessId(req);

    await Promise.all([
      this.usageService.updateStaffUsage(businessId),
      this.usageService.updateServiceUsage(businessId),
      this.usageService.updateCustomerUsage(businessId),
    ]);

    await this.responseHelper.success(
      res, 'success.usage.dataRefreshed',
      { refreshedCounters: ['staff', 'services', 'customers'], updatedAt: new Date().toISOString() },
      200, req
    );
  }
}
