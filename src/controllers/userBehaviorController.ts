import { Response } from 'express';
import { UserBehaviorService } from '../services/domain/userBehavior';
import { GuaranteedAuthRequest } from '../types/auth';
import { requireAuthenticatedUser } from '../middleware/authUtils';
import { AppError } from '../types/responseTypes';
import { ResponseHelper } from '../utils/responseHelper';
import { PrismaClient } from '@prisma/client';
import { UnifiedNotificationGateway } from '../services/domain/notification/unifiedNotificationGateway';
import { NotificationChannel } from '../types/notification';

const prisma = new PrismaClient();

export class UserBehaviorController {
  constructor(
    private userBehaviorService: UserBehaviorService,
    private responseHelper: ResponseHelper,
    private notificationGateway?: UnifiedNotificationGateway
  ) {}

  private requireUserId(req: GuaranteedAuthRequest): string {
    const { userId } = req.params;
    if (!userId || typeof userId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'User ID is required', params: { field: 'userId' } });
    }
    return userId;
  }

  async getUserBehavior(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);

    const behavior = await this.userBehaviorService.getUserBehavior(requestingUserId, userId);

    if (!behavior) {
      throw new AppError('USER_NOT_FOUND', { message: 'User behavior data not found' });
    }

    await this.responseHelper.success(res, 'success.userBehavior.retrieved', behavior, 200, req);
  }

  async getUserSummary(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);

    const summary = await this.userBehaviorService.getUserSummary(requestingUserId, userId);

    await this.responseHelper.success(res, 'success.userBehavior.summaryRetrieved', summary, 200, req);
  }

  async checkUserStatus(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = this.requireUserId(req);

    const status = await this.userBehaviorService.checkUserStatus(userId);

    await this.responseHelper.success(res, 'success.userBehavior.statusRetrieved', status, 200, req);
  }

  async addStrike(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Reason is required', params: { field: 'reason' } });
    }
    if (reason.trim().length < 3) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 3 characters' });
    }

    const behavior = await this.userBehaviorService.addStrike(requestingUserId, userId, reason.trim());

    await this.responseHelper.success(res, 'success.userBehavior.strikeAdded', behavior, 200, req);
  }

  async removeStrike(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);

    const behavior = await this.userBehaviorService.removeStrike(requestingUserId, userId);

    await this.responseHelper.success(res, 'success.userBehavior.strikeRemoved', behavior, 200, req);
  }

  async banUser(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);
    const { reason, durationDays } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Reason is required', params: { field: 'reason' } });
    }
    if (reason.trim().length < 3) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 3 characters' });
    }

    if (durationDays !== undefined && (typeof durationDays !== 'number' || durationDays <= 0)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Duration must be a positive number' });
    }

    const business = await prisma.business.findFirst({
      where: { ownerId: requestingUserId, appointments: { some: { customerId: userId } } },
      select: { id: true }
    });

    if (!business) {
      throw new AppError('BUSINESS_NOT_FOUND', { message: 'No business found for this owner' });
    }

    const bannedUntil = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

    await prisma.businessBan.upsert({
      where: { userId_businessId: { userId, businessId: business.id } },
      update: { reason: reason.trim(), bannedUntil, isActive: true },
      create: {
        id: `ban_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        userId,
        businessId: business.id,
        reason: reason.trim(),
        bannedUntil,
        isActive: true,
      },
    });

    const now = new Date();
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        customerId: userId, businessId: business.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: now }
      },
      select: { id: true, date: true, startTime: true, service: { select: { name: true } }, business: { select: { name: true } } }
    });

    if (futureAppointments.length > 0) {
      await prisma.appointment.updateMany({
        where: { id: { in: futureAppointments.map(a => a.id) } },
        data: { status: 'CANCELED', canceledAt: now, cancelReason: 'İşletme tarafından engellendi' }
      });

      if (this.notificationGateway) {
        try {
          const businessName = futureAppointments[0].business.name;
          const count = futureAppointments.length;
          await this.notificationGateway.sendTransactional({
            businessId: business.id,
            customerId: userId,
            title: 'Randevularınız İptal Edildi',
            body: `${businessName} işletmesindeki ${count} adet randevunuz işletme tarafından iptal edilmiştir.`,
            forceChannels: [NotificationChannel.SMS],
            ignoreQuietHours: true,
          });
        } catch {
          // SMS failure should not block the ban response
        }
      }
    }

    await this.responseHelper.success(res, 'success.userBehavior.userBanned', { userId, businessId: business.id, cancelledAppointments: futureAppointments.length }, 200, req);
  }

  async unbanUser(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);

    const business = await prisma.business.findFirst({
      where: { ownerId: requestingUserId },
      select: { id: true }
    });

    if (business) {
      await prisma.businessBan.updateMany({
        where: { userId, businessId: business.id },
        data: { isActive: false },
      });
    }

    await this.responseHelper.success(res, 'success.userBehavior.userUnbanned', { userId }, 200, req);
  }

  async getProblematicUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
      throw new AppError('VALIDATION_ERROR', { message: 'Limit must be between 1 and 200' });
    }

    const users = await this.userBehaviorService.getProblematicUsers(requestingUserId, limitNum);

    await this.responseHelper.success(res, 'success.userBehavior.problematicUsersRetrieved', users, 200, req);
  }

  async getBannedUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;

    const users = await this.userBehaviorService.getBannedUsers(requestingUserId);

    await this.responseHelper.success(res, 'success.userBehavior.bannedUsersRetrieved', users, 200, req);
  }

  async getUsersWithStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const { minStrikes } = req.query;

    const minStrikesNum = minStrikes ? parseInt(minStrikes as string, 10) : 1;

    if (isNaN(minStrikesNum) || minStrikesNum < 1) {
      throw new AppError('VALIDATION_ERROR', { message: 'Minimum strikes must be a positive integer' });
    }

    const users = await this.userBehaviorService.getUsersWithStrikes(requestingUserId, minStrikesNum);

    await this.responseHelper.success(res, 'success.userBehavior.usersWithStrikesRetrieved', users, 200, req);
  }

  async getUserBehaviorStats(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;

    const stats = await this.userBehaviorService.getUserBehaviorStats(requestingUserId);

    await this.responseHelper.success(res, 'success.userBehavior.statsRetrieved', stats, 200, req);
  }

  async getCustomerBehaviorForBusiness(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const { businessId, customerId } = req.params;

    if (!businessId || typeof businessId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Business ID is required', params: { field: 'businessId' } });
    }

    if (!customerId || typeof customerId !== 'string') {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Customer ID is required', params: { field: 'customerId' } });
    }

    const behavior = await this.userBehaviorService.getCustomerBehaviorForBusiness(requestingUserId, businessId, customerId);

    await this.responseHelper.success(res, 'success.userBehavior.customerBehaviorRetrieved', behavior, 200, req);
  }

  async flagUserForReview(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const userId = this.requireUserId(req);
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Reason is required', params: { field: 'reason' } });
    }
    if (reason.trim().length < 3) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 3 characters' });
    }

    await this.userBehaviorService.flagUserForReview(requestingUserId, userId, reason.trim());

    await this.responseHelper.success(res, 'success.userBehavior.userFlagged', undefined, 200, req);
  }

  async getMyBehavior(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = requireAuthenticatedUser(req).id;

    const behavior = await this.userBehaviorService.getUserBehavior(userId, userId);

    if (!behavior) {
      throw new AppError('USER_NOT_FOUND', { message: 'User behavior data not found' });
    }

    await this.responseHelper.success(res, 'success.userBehavior.retrieved', behavior, 200, req);
  }

  async getUserRiskAssessment(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = this.requireUserId(req);

    const assessment = await this.userBehaviorService.getUserRiskAssessment(userId);

    await this.responseHelper.success(res, 'success.userBehavior.riskAssessmentRetrieved', assessment, 200, req);
  }

  async calculateReliabilityScore(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const userId = this.requireUserId(req);

    const score = await this.userBehaviorService.calculateUserReliabilityScore(userId);

    await this.responseHelper.success(res, 'success.userBehavior.reliabilityScoreCalculated', { score }, 200, req);
  }

  async processAutomaticStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    requireAuthenticatedUser(req);

    const result = await this.userBehaviorService.processAutomaticStrikes();

    await this.responseHelper.success(res, 'success.userBehavior.automaticStrikesProcessed', result, 200, req);
  }

  async resetExpiredStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    requireAuthenticatedUser(req);

    const count = await this.userBehaviorService.resetExpiredStrikes();

    await this.responseHelper.success(res, 'success.userBehavior.expiredStrikesReset', { count }, 200, req);
  }

  async unbanExpiredBans(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    requireAuthenticatedUser(req);

    const count = await this.userBehaviorService.unbanExpiredBans();

    await this.responseHelper.success(res, 'success.userBehavior.expiredBansProcessed', { count }, 200, req);
  }

  async batchAddStrikes(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const { userIds, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'User IDs array is required and must not be empty', params: { field: 'userIds' } });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Reason is required', params: { field: 'reason' } });
    }
    if (reason.trim().length < 3) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 3 characters' });
    }

    const results = await Promise.allSettled(
      userIds.map((userId: string) => this.userBehaviorService.addStrike(requestingUserId, userId, reason.trim()))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    await this.responseHelper.success(res, 'success.userBehavior.batchStrikesAdded', { successful, failed, total: userIds.length }, 200, req);
  }

  async batchBanUsers(req: GuaranteedAuthRequest, res: Response): Promise<void> {
    const requestingUserId = requireAuthenticatedUser(req).id;
    const { userIds, reason, durationDays } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'User IDs array is required and must not be empty', params: { field: 'userIds' } });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('REQUIRED_FIELD_MISSING', { message: 'Reason is required', params: { field: 'reason' } });
    }
    if (reason.trim().length < 3) {
      throw new AppError('VALIDATION_ERROR', { message: 'Reason must be at least 3 characters' });
    }

    if (durationDays !== undefined && (typeof durationDays !== 'number' || durationDays <= 0)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Duration must be a positive number' });
    }

    const results = await Promise.allSettled(
      userIds.map((userId: string) => this.userBehaviorService.banUser(requestingUserId, userId, reason.trim(), durationDays))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    await this.responseHelper.success(res, 'success.userBehavior.batchUsersBanned', { successful, failed, total: userIds.length }, 200, req);
  }
}
