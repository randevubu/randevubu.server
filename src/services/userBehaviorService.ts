import {
  UserBehaviorData,
  UserBehaviorSummary
} from '../types/business';
import { UserBehaviorRepository } from '../repositories/userBehaviorRepository';
import { RBACService } from './rbacService';
import { PermissionName } from '../types/auth';

export class UserBehaviorService {
  constructor(
    private userBehaviorRepository: UserBehaviorRepository,
    private rbacService: RBACService
  ) {}

  async getUserBehavior(
    requestingUserId: string,
    targetUserId: string
  ): Promise<UserBehaviorData | null> {
    // Users can view their own behavior, admins can view any
    if (requestingUserId !== targetUserId) {
      await this.rbacService.requirePermission(requestingUserId, PermissionName.VIEW_USER_BEHAVIOR);
    }

    return await this.userBehaviorRepository.findByUserId(targetUserId);
  }

  async getUserSummary(
    requestingUserId: string,
    targetUserId: string
  ): Promise<UserBehaviorSummary> {
    // Users can view their own summary, businesses can view their customers', admins can view any
    if (requestingUserId !== targetUserId) {
      const [resource, action] = PermissionName.VIEW_USER_BEHAVIOR.split(':');
      const hasGlobalView = await this.rbacService.hasPermission(
        requestingUserId, 
        resource,
        action
      );
      
      if (!hasGlobalView) {
        // Check if requesting user is a business owner/staff who had appointments with target user
        // This would require additional logic to verify business relationship
        throw new Error('Access denied: You do not have permission to view this user\'s behavior');
      }
    }

    return await this.userBehaviorRepository.getUserSummary(targetUserId);
  }

  async updateUserBehavior(userId: string): Promise<UserBehaviorData> {
    // This method can be called by anyone to update their own behavior
    // or by the system to update behavior after appointments
    return await this.userBehaviorRepository.createOrUpdate(userId);
  }

  async addStrike(
    requestingUserId: string,
    targetUserId: string,
    reason: string
  ): Promise<UserBehaviorData> {
    // Only businesses and admins can add strikes
    await this.rbacService.requireAny(requestingUserId, [
      PermissionName.MANAGE_USER_BEHAVIOR,
      PermissionName.MANAGE_STRIKES
    ]);

    if (!reason || reason.trim().length < 5) {
      throw new Error('Strike reason must be at least 5 characters long');
    }

    return await this.userBehaviorRepository.addStrike(targetUserId, reason);
  }

  async removeStrike(
    requestingUserId: string,
    targetUserId: string
  ): Promise<UserBehaviorData> {
    // Only admins can remove strikes
    await this.rbacService.requirePermission(requestingUserId, PermissionName.MANAGE_STRIKES);

    return await this.userBehaviorRepository.removeStrike(targetUserId);
  }

  async banUser(
    requestingUserId: string,
    targetUserId: string,
    reason: string,
    durationDays: number
  ): Promise<UserBehaviorData> {
    // Only admins can manually ban users
    await this.rbacService.requirePermission(requestingUserId, PermissionName.BAN_USERS);

    if (!reason || reason.trim().length < 10) {
      throw new Error('Ban reason must be at least 10 characters long');
    }

    if (durationDays <= 0 || durationDays > 365) {
      throw new Error('Ban duration must be between 1 and 365 days');
    }

    return await this.userBehaviorRepository.banUser(targetUserId, reason, durationDays);
  }

  async unbanUser(
    requestingUserId: string,
    targetUserId: string
  ): Promise<UserBehaviorData> {
    // Only admins can unban users
    await this.rbacService.requirePermission(requestingUserId, PermissionName.BAN_USERS);

    return await this.userBehaviorRepository.unbanUser(targetUserId);
  }

  async checkUserStatus(userId: string): Promise<{
    isBanned: boolean;
    bannedUntil?: Date;
    banReason?: string;
    strikes: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    canBook: boolean;
    restrictions?: string[];
  }> {
    const behavior = await this.userBehaviorRepository.findByUserId(userId);
    const summary = await this.userBehaviorRepository.getUserSummary(userId);

    if (!behavior) {
      return {
        isBanned: false,
        strikes: 0,
        riskLevel: 'LOW',
        canBook: true
      };
    }

    const restrictions: string[] = [];
    let canBook = true;

    if (behavior.isBanned) {
      canBook = false;
      restrictions.push('User is currently banned');
    }

    if (behavior.currentStrikes >= 2) {
      restrictions.push('User has multiple strikes - high risk');
    }

    if (summary.cancellationRate > 30) {
      restrictions.push('High cancellation rate');
    }

    if (summary.noShowRate > 15) {
      restrictions.push('High no-show rate');
    }

    return {
      isBanned: behavior.isBanned,
      bannedUntil: behavior.bannedUntil || undefined,
      banReason: behavior.banReason || undefined,
      strikes: behavior.currentStrikes,
      riskLevel: summary.riskLevel,
      canBook,
      restrictions: restrictions.length > 0 ? restrictions : undefined
    };
  }

  async getProblematicUsers(
    requestingUserId: string,
    limit = 50
  ): Promise<UserBehaviorSummary[]> {
    // Only admins can view problematic users list
    await this.rbacService.requirePermission(requestingUserId, PermissionName.VIEW_USER_BEHAVIOR);

    return await this.userBehaviorRepository.findProblematicUsers(limit);
  }

  async getBannedUsers(
    requestingUserId: string
  ): Promise<UserBehaviorData[]> {
    // Only admins can view banned users list
    await this.rbacService.requirePermission(requestingUserId, PermissionName.VIEW_USER_BEHAVIOR);

    // This would need to be implemented in the repository
    throw new Error('getBannedUsers not implemented in repository');
  }

  async getUsersWithStrikes(
    requestingUserId: string,
    minStrikes = 1
  ): Promise<UserBehaviorData[]> {
    // Only admins can view users with strikes
    await this.rbacService.requirePermission(requestingUserId, PermissionName.VIEW_USER_BEHAVIOR);

    // This would need to be implemented in the repository
    throw new Error('getUsersWithStrikes not implemented in repository');
  }

  // System methods for automated behavior management
  async processAutomaticStrikes(): Promise<{
    processed: number;
    banned: number;
  }> {
    // This would be called by a cron job or system process
    // No permission check needed as it's a system operation
    
    let processed = 0;
    let banned = 0;

    // Get users with recent problematic behavior
    const problematicUsers = await this.userBehaviorRepository.findProblematicUsers(100);

    for (const userSummary of problematicUsers) {
      const behavior = await this.userBehaviorRepository.findByUserId(userSummary.userId);
      if (!behavior || behavior.isBanned) continue;

      let shouldAddStrike = false;
      let strikeReason = '';

      // Check for excessive cancellations this week
      if (behavior.cancelationsThisWeek >= 3) {
        shouldAddStrike = true;
        strikeReason = `Excessive cancellations this week (${behavior.cancelationsThisWeek})`;
      }
      // Check for no-shows this week
      else if (behavior.noShowsThisWeek >= 2) {
        shouldAddStrike = true;
        strikeReason = `Multiple no-shows this week (${behavior.noShowsThisWeek})`;
      }
      // Check for monthly patterns
      else if (behavior.cancelationsThisMonth >= 8) {
        shouldAddStrike = true;
        strikeReason = `Excessive monthly cancellations (${behavior.cancelationsThisMonth})`;
      }

      if (shouldAddStrike) {
        const updatedBehavior = await this.userBehaviorRepository.addStrike(
          userSummary.userId,
          strikeReason
        );
        processed++;

        if (updatedBehavior.isBanned) {
          banned++;
        }
      }
    }

    return { processed, banned };
  }

  async resetExpiredStrikes(): Promise<number> {
    // System method to reset strikes that have expired
    return await this.userBehaviorRepository.resetExpiredStrikes();
  }

  async unbanExpiredBans(): Promise<number> {
    // System method to unban users whose ban period has expired
    return await this.userBehaviorRepository.unbanExpiredBans();
  }

  async getUserBehaviorStats(
    requestingUserId: string
  ): Promise<{
    totalUsers: number;
    bannedUsers: number;
    usersWithStrikes: number;
    averageCompletionRate: number;
    averageCancellationRate: number;
    averageNoShowRate: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
    };
  }> {
    // Only admins can view behavior statistics
    await this.rbacService.requirePermission(requestingUserId, PermissionName.VIEW_USER_BEHAVIOR);

    // This would need to be implemented in the repository
    throw new Error('getUserBehaviorStats not implemented');
  }

  // Business-specific methods
  async getCustomerBehaviorForBusiness(
    requestingUserId: string,
    businessId: string,
    customerId: string
  ): Promise<{
    summary: UserBehaviorSummary;
    businessSpecificStats: {
      appointmentsWithBusiness: number;
      cancellationsWithBusiness: number;
      noShowsWithBusiness: number;
      completedWithBusiness: number;
    };
  }> {
    // Check if requesting user has access to this business
    const [resource, action] = PermissionName.VIEW_USER_BEHAVIOR.split(':');
    const hasGlobalView = await this.rbacService.hasPermission(
      requestingUserId,
      resource,
      action
    );

    if (!hasGlobalView) {
      await this.rbacService.requirePermission(
        requestingUserId,
        PermissionName.VIEW_OWN_CUSTOMERS,
        { businessId }
      );
    }

    const summary = await this.userBehaviorRepository.getUserSummary(customerId);

    // This would need additional repository methods to get business-specific stats
    const businessSpecificStats = {
      appointmentsWithBusiness: 0,
      cancellationsWithBusiness: 0,
      noShowsWithBusiness: 0,
      completedWithBusiness: 0
    };

    return {
      summary,
      businessSpecificStats
    };
  }

  async flagUserForReview(
    requestingUserId: string,
    targetUserId: string,
    reason: string
  ): Promise<void> {
    // Businesses can flag problematic customers for admin review
    await this.rbacService.requireAny(requestingUserId, [
      PermissionName.MANAGE_USER_BEHAVIOR,
      PermissionName.FLAG_USERS
    ]);

    if (!reason || reason.trim().length < 10) {
      throw new Error('Flag reason must be at least 10 characters long');
    }

    // This would create a flag/report record for admin review
    // Implementation would depend on having a separate flagging system
    throw new Error('User flagging system not implemented');
  }

  // Utility methods
  async calculateUserReliabilityScore(userId: string): Promise<number> {
    const summary = await this.userBehaviorRepository.getUserSummary(userId);
    return summary.reliabilityScore;
  }

  async getUserRiskAssessment(userId: string): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
    recommendations: string[];
  }> {
    const summary = await this.userBehaviorRepository.getUserSummary(userId);
    const behavior = await this.userBehaviorRepository.findByUserId(userId);

    const factors: string[] = [];
    const recommendations: string[] = [];

    if (summary.cancellationRate > 20) {
      factors.push(`High cancellation rate: ${summary.cancellationRate.toFixed(1)}%`);
      recommendations.push('Consider requiring confirmation closer to appointment time');
    }

    if (summary.noShowRate > 10) {
      factors.push(`High no-show rate: ${summary.noShowRate.toFixed(1)}%`);
      recommendations.push('Consider requiring deposit or sending more reminders');
    }

    if (behavior?.currentStrikes && behavior.currentStrikes > 0) {
      factors.push(`Current strikes: ${behavior.currentStrikes}`);
      recommendations.push('Monitor closely for continued problematic behavior');
    }

    if (summary.completionRate < 70) {
      factors.push(`Low completion rate: ${summary.completionRate.toFixed(1)}%`);
      recommendations.push('Consider customer education about appointment policies');
    }

    return {
      riskLevel: summary.riskLevel,
      factors,
      recommendations
    };
  }
}