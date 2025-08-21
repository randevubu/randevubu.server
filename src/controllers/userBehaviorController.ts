import { Request, Response } from 'express';
import { UserBehaviorService } from '../services/userBehaviorService';
import { AuthenticatedRequest } from '../types/auth';

export class UserBehaviorController {
  constructor(private userBehaviorService: UserBehaviorService) {}

  async getUserBehavior(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;
      const targetUserId = userId || requestingUserId;

      const behavior = await this.userBehaviorService.getUserBehavior(requestingUserId, targetUserId);

      if (!behavior) {
        res.status(404).json({
          success: false,
          error: 'User behavior record not found'
        });
        return;
      }

      res.json({
        success: true,
        data: behavior
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getUserSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;
      const targetUserId = userId || requestingUserId;

      const summary = await this.userBehaviorService.getUserSummary(requestingUserId, targetUserId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getMyBehavior(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [behavior, summary] = await Promise.all([
        this.userBehaviorService.getUserBehavior(userId, userId),
        this.userBehaviorService.getUserSummary(userId, userId)
      ]);

      res.json({
        success: true,
        data: {
          behavior,
          summary
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async checkUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;
      const targetUserId = userId || requestingUserId;

      // Allow users to check their own status, require permissions for others
      if (requestingUserId !== targetUserId) {
        // This would require proper permission check in the service
        // For now, we'll allow business users to check customer status
      }

      const status = await this.userBehaviorService.checkUserStatus(targetUserId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async addStrike(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const requestingUserId = req.user!.id;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Reason must be at least 5 characters long'
        });
        return;
      }

      const behavior = await this.userBehaviorService.addStrike(
        requestingUserId,
        userId,
        reason.trim()
      );

      res.json({
        success: true,
        data: behavior,
        message: 'Strike added successfully'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add strike'
      });
    }
  }

  async removeStrike(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;

      const behavior = await this.userBehaviorService.removeStrike(requestingUserId, userId);

      res.json({
        success: true,
        data: behavior,
        message: 'Strike removed successfully'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove strike'
      });
    }
  }

  async banUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason, durationDays } = req.body;
      const requestingUserId = req.user!.id;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        res.status(400).json({
          success: false,
          error: 'Ban reason must be at least 10 characters long'
        });
        return;
      }

      if (!durationDays || typeof durationDays !== 'number' || durationDays <= 0 || durationDays > 365) {
        res.status(400).json({
          success: false,
          error: 'Duration must be between 1 and 365 days'
        });
        return;
      }

      const behavior = await this.userBehaviorService.banUser(
        requestingUserId,
        userId,
        reason.trim(),
        durationDays
      );

      res.json({
        success: true,
        data: behavior,
        message: `User banned for ${durationDays} days`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ban user'
      });
    }
  }

  async unbanUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;

      const behavior = await this.userBehaviorService.unbanUser(requestingUserId, userId);

      res.json({
        success: true,
        data: behavior,
        message: 'User unbanned successfully'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unban user'
      });
    }
  }

  async getProblematicUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (limit > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit cannot exceed 100'
        });
        return;
      }

      const users = await this.userBehaviorService.getProblematicUsers(requestingUserId, limit);

      res.json({
        success: true,
        data: users,
        meta: {
          total: users.length,
          limit
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async getUserRiskAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;
      const targetUserId = userId || requestingUserId;

      const assessment = await this.userBehaviorService.getUserRiskAssessment(targetUserId);

      res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async calculateReliabilityScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user!.id;
      const targetUserId = userId || requestingUserId;

      const score = await this.userBehaviorService.calculateUserReliabilityScore(targetUserId);

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          reliabilityScore: score
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getCustomerBehaviorForBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, customerId } = req.params;
      const requestingUserId = req.user!.id;

      const result = await this.userBehaviorService.getCustomerBehaviorForBusiness(
        requestingUserId,
        businessId,
        customerId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async flagUserForReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const requestingUserId = req.user!.id;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        res.status(400).json({
          success: false,
          error: 'Flag reason must be at least 10 characters long'
        });
        return;
      }

      await this.userBehaviorService.flagUserForReview(
        requestingUserId,
        userId,
        reason.trim()
      );

      res.json({
        success: true,
        message: 'User flagged for review successfully'
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to flag user'
      });
    }
  }

  // System and admin endpoints
  async getUserBehaviorStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user!.id;

      const stats = await this.userBehaviorService.getUserBehaviorStats(requestingUserId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Access denied'
      });
    }
  }

  async processAutomaticStrikes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // This endpoint would typically be protected to admin-only or system calls
      const result = await this.userBehaviorService.processAutomaticStrikes();

      res.json({
        success: true,
        data: result,
        message: `Processed ${result.processed} users, ${result.banned} new bans`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process automatic strikes'
      });
    }
  }

  async resetExpiredStrikes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.userBehaviorService.resetExpiredStrikes();

      res.json({
        success: true,
        data: { resetCount: count },
        message: `Reset strikes for ${count} users`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reset expired strikes'
      });
    }
  }

  async unbanExpiredBans(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // System endpoint
      const count = await this.userBehaviorService.unbanExpiredBans();

      res.json({
        success: true,
        data: { unbannedCount: count },
        message: `Unbanned ${count} users with expired bans`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unban expired users'
      });
    }
  }

  // Batch operations
  async batchAddStrikes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userIds, reason } = req.body;
      const requestingUserId = req.user!.id;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'userIds array is required'
        });
        return;
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({
          success: false,
          error: 'Reason must be at least 5 characters long'
        });
        return;
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const behavior = await this.userBehaviorService.addStrike(
            requestingUserId,
            userId,
            reason.trim()
          );
          results.push({ userId, success: true, behavior });
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        data: results,
        message: `Added strikes to ${successCount}/${userIds.length} users`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process batch strikes'
      });
    }
  }

  async batchBanUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userIds, reason, durationDays } = req.body;
      const requestingUserId = req.user!.id;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'userIds array is required'
        });
        return;
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        res.status(400).json({
          success: false,
          error: 'Ban reason must be at least 10 characters long'
        });
        return;
      }

      if (!durationDays || typeof durationDays !== 'number' || durationDays <= 0 || durationDays > 365) {
        res.status(400).json({
          success: false,
          error: 'Duration must be between 1 and 365 days'
        });
        return;
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const behavior = await this.userBehaviorService.banUser(
            requestingUserId,
            userId,
            reason.trim(),
            durationDays
          );
          results.push({ userId, success: true, behavior });
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        data: results,
        message: `Banned ${successCount}/${userIds.length} users for ${durationDays} days`
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process batch bans'
      });
    }
  }
}