import { UserBehaviorService } from '../../../src/services/userBehaviorService';
import { UserBehaviorRepository } from '../../../src/repositories/userBehaviorRepository';
import { RBACService } from '../../../src/services/rbacService';
import { PermissionName } from '../../../src/types/auth';
import { UserBehaviorData, UserBehaviorSummary } from '../../../src/types/business';

// Mock dependencies
jest.mock('../../../src/repositories/userBehaviorRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('UserBehaviorService', () => {
  let userBehaviorService: UserBehaviorService;
  let mockUserBehaviorRepository: any;
  let mockRBACService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockUserBehaviorRepository = {
      findByUserId: jest.fn(),
      getUserSummary: jest.fn(),
      createOrUpdate: jest.fn(),
      addStrike: jest.fn(),
      removeStrike: jest.fn(),
      banUser: jest.fn(),
      unbanUser: jest.fn(),
      findProblematicUsers: jest.fn(),
      resetExpiredStrikes: jest.fn(),
      unbanExpiredBans: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      requireAny: jest.fn(),
      hasPermission: jest.fn()
    };

    // Create UserBehaviorService instance
    userBehaviorService = new UserBehaviorService(
      mockUserBehaviorRepository as UserBehaviorRepository,
      mockRBACService as RBACService
    );
  });

  describe('constructor', () => {
    it('should create UserBehaviorService instance', () => {
      expect(userBehaviorService).toBeInstanceOf(UserBehaviorService);
    });
  });

  describe('getUserBehavior', () => {
    it('should return user behavior for same user', async () => {
      // Arrange
      const requestingUserId = 'user-123';
      const targetUserId = 'user-123';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.getUserBehavior(requestingUserId, targetUserId);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockUserBehaviorRepository.findByUserId).toHaveBeenCalledWith(targetUserId);
      expect(mockRBACService.requirePermission).not.toHaveBeenCalled();
    });

    it('should require permission for different user', async () => {
      // Arrange
      const requestingUserId = 'user-123';
      const targetUserId = 'user-456';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-456',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.getUserBehavior(requestingUserId, targetUserId);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        requestingUserId,
        PermissionName.VIEW_USER_BEHAVIOR
      );
    });
  });

  describe('getUserSummary', () => {
    it('should return user summary for same user', async () => {
      // Arrange
      const requestingUserId = 'user-123';
      const targetUserId = 'user-123';
      const mockSummary: UserBehaviorSummary = {
        userId: 'user-123',
        completionRate: 85,
        cancellationRate: 10,
        noShowRate: 5,
        reliabilityScore: 80,
        riskLevel: 'LOW'
      };

      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.getUserSummary(requestingUserId, targetUserId);

      // Assert
      expect(result).toEqual(mockSummary);
      expect(mockUserBehaviorRepository.getUserSummary).toHaveBeenCalledWith(targetUserId);
    });

    it('should require permission for different user with global view', async () => {
      // Arrange
      const requestingUserId = 'user-123';
      const targetUserId = 'user-456';
      const mockSummary: UserBehaviorSummary = {
        userId: 'user-456',
        completionRate: 85,
        cancellationRate: 10,
        noShowRate: 5,
        reliabilityScore: 80,
        riskLevel: 'LOW'
      };

      mockRBACService.hasPermission.mockResolvedValue(true);
      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.getUserSummary(requestingUserId, targetUserId);

      // Assert
      expect(result).toEqual(mockSummary);
      expect(mockRBACService.hasPermission).toHaveBeenCalledWith(
        requestingUserId,
        'user_behavior',
        'view'
      );
    });

    it('should throw error for different user without permission', async () => {
      // Arrange
      const requestingUserId = 'user-123';
      const targetUserId = 'user-456';

      mockRBACService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(userBehaviorService.getUserSummary(requestingUserId, targetUserId))
        .rejects.toThrow('Access denied: You do not have permission to view this user\'s behavior');
    });
  });

  describe('updateUserBehavior', () => {
    it('should update user behavior successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockUserBehaviorRepository.createOrUpdate.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.updateUserBehavior(userId);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockUserBehaviorRepository.createOrUpdate).toHaveBeenCalledWith(userId);
    });
  });

  describe('addStrike', () => {
    it('should add strike successfully', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const reason = 'No-show without notice';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 1,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 1,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 1
      };

      mockRBACService.requireAny.mockResolvedValue(undefined);
      mockUserBehaviorRepository.addStrike.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.addStrike(requestingUserId, targetUserId, reason);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockRBACService.requireAny).toHaveBeenCalledWith(requestingUserId, [
        PermissionName.MANAGE_USER_BEHAVIOR,
        PermissionName.MANAGE_STRIKES
      ]);
      expect(mockUserBehaviorRepository.addStrike).toHaveBeenCalledWith(targetUserId, reason);
    });

    it('should throw error for short reason', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const reason = 'Bad';

      // Act & Assert
      await expect(userBehaviorService.addStrike(requestingUserId, targetUserId, reason))
        .rejects.toThrow('Strike reason must be at least 5 characters long');
    });
  });

  describe('removeStrike', () => {
    it('should remove strike successfully', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockUserBehaviorRepository.removeStrike.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.removeStrike(requestingUserId, targetUserId);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        requestingUserId,
        PermissionName.MANAGE_STRIKES
      );
      expect(mockUserBehaviorRepository.removeStrike).toHaveBeenCalledWith(targetUserId);
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const reason = 'Repeated violations of terms of service';
      const durationDays = 30;
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: true,
        bannedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        banReason: reason,
        currentStrikes: 3,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockUserBehaviorRepository.banUser.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.banUser(requestingUserId, targetUserId, reason, durationDays);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        requestingUserId,
        PermissionName.BAN_USERS
      );
      expect(mockUserBehaviorRepository.banUser).toHaveBeenCalledWith(targetUserId, reason, durationDays);
    });

    it('should throw error for short reason', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const reason = 'Bad';

      // Act & Assert
      await expect(userBehaviorService.banUser(requestingUserId, targetUserId, reason))
        .rejects.toThrow('Ban reason must be at least 10 characters long');
    });

    it('should throw error for invalid duration', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const reason = 'Valid reason for ban';
      const durationDays = 400; // Invalid duration

      // Act & Assert
      await expect(userBehaviorService.banUser(requestingUserId, targetUserId, reason, durationDays))
        .rejects.toThrow('Ban duration must be between 1 and 365 days');
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const targetUserId = 'user-123';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockUserBehaviorRepository.unbanUser.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.unbanUser(requestingUserId, targetUserId);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        requestingUserId,
        PermissionName.BAN_USERS
      );
      expect(mockUserBehaviorRepository.unbanUser).toHaveBeenCalledWith(targetUserId);
    });
  });

  describe('checkUserStatus', () => {
    it('should return status for user with behavior data', async () => {
      // Arrange
      const userId = 'user-123';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 1,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      const mockSummary: UserBehaviorSummary = {
        userId: 'user-123',
        completionRate: 85,
        cancellationRate: 10,
        noShowRate: 5,
        reliabilityScore: 80,
        riskLevel: 'LOW'
      };

      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);
      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.checkUserStatus(userId);

      // Assert
      expect(result).toEqual({
        isBanned: false,
        strikes: 1,
        riskLevel: 'LOW',
        canBook: true
      });
    });

    it('should return status for user without behavior data', async () => {
      // Arrange
      const userId = 'user-123';

      mockUserBehaviorRepository.findByUserId.mockResolvedValue(null);

      // Act
      const result = await userBehaviorService.checkUserStatus(userId);

      // Assert
      expect(result).toEqual({
        isBanned: false,
        strikes: 0,
        riskLevel: 'LOW',
        canBook: true
      });
    });

    it('should return restricted status for banned user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: true,
        bannedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        banReason: 'Terms violation',
        currentStrikes: 3,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      const mockSummary: UserBehaviorSummary = {
        userId: 'user-123',
        completionRate: 60,
        cancellationRate: 25,
        noShowRate: 15,
        reliabilityScore: 40,
        riskLevel: 'HIGH'
      };

      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);
      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.checkUserStatus(userId);

      // Assert
      expect(result).toEqual({
        isBanned: true,
        bannedUntil: mockBehavior.bannedUntil,
        banReason: mockBehavior.banReason,
        strikes: 3,
        riskLevel: 'HIGH',
        canBook: false,
        restrictions: ['User is currently banned', 'User has multiple strikes - high risk', 'High cancellation rate', 'High no-show rate']
      });
    });
  });

  describe('getProblematicUsers', () => {
    it('should return problematic users successfully', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const limit = 20;
      const mockUsers: UserBehaviorSummary[] = [
        {
          userId: 'user-123',
          completionRate: 60,
          cancellationRate: 30,
          noShowRate: 10,
          reliabilityScore: 40,
          riskLevel: 'HIGH'
        }
      ];

      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockUserBehaviorRepository.findProblematicUsers.mockResolvedValue(mockUsers);

      // Act
      const result = await userBehaviorService.getProblematicUsers(requestingUserId, limit);

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        requestingUserId,
        PermissionName.VIEW_USER_BEHAVIOR
      );
      expect(mockUserBehaviorRepository.findProblematicUsers).toHaveBeenCalledWith(limit);
    });
  });

  describe('getBannedUsers', () => {
    it('should throw error as not implemented', async () => {
      // Arrange
      const requestingUserId = 'admin-123';

      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(userBehaviorService.getBannedUsers(requestingUserId))
        .rejects.toThrow('getBannedUsers not implemented in repository');
    });
  });

  describe('getUsersWithStrikes', () => {
    it('should throw error as not implemented', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const minStrikes = 2;

      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(userBehaviorService.getUsersWithStrikes(requestingUserId, minStrikes))
        .rejects.toThrow('getUsersWithStrikes not implemented in repository');
    });
  });

  describe('processAutomaticStrikes', () => {
    it('should process automatic strikes successfully', async () => {
      // Arrange
      const mockProblematicUsers: UserBehaviorSummary[] = [
        {
          userId: 'user-123',
          completionRate: 60,
          cancellationRate: 30,
          noShowRate: 10,
          reliabilityScore: 40,
          riskLevel: 'HIGH'
        }
      ];

      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 3,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      const updatedBehavior: UserBehaviorData = {
        ...mockBehavior,
        currentStrikes: 1
      };

      mockUserBehaviorRepository.findProblematicUsers.mockResolvedValue(mockProblematicUsers);
      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);
      mockUserBehaviorRepository.addStrike.mockResolvedValue(updatedBehavior);

      // Act
      const result = await userBehaviorService.processAutomaticStrikes();

      // Assert
      expect(result).toEqual({
        processed: 1,
        banned: 0
      });
      expect(mockUserBehaviorRepository.addStrike).toHaveBeenCalledWith(
        'user-123',
        'Excessive cancellations this week (3)'
      );
    });

    it('should handle users with no-shows', async () => {
      // Arrange
      const mockProblematicUsers: UserBehaviorSummary[] = [
        {
          userId: 'user-123',
          completionRate: 60,
          cancellationRate: 30,
          noShowRate: 10,
          reliabilityScore: 40,
          riskLevel: 'HIGH'
        }
      ];

      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 2,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      const updatedBehavior: UserBehaviorData = {
        ...mockBehavior,
        currentStrikes: 1
      };

      mockUserBehaviorRepository.findProblematicUsers.mockResolvedValue(mockProblematicUsers);
      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);
      mockUserBehaviorRepository.addStrike.mockResolvedValue(updatedBehavior);

      // Act
      const result = await userBehaviorService.processAutomaticStrikes();

      // Assert
      expect(result).toEqual({
        processed: 1,
        banned: 0
      });
      expect(mockUserBehaviorRepository.addStrike).toHaveBeenCalledWith(
        'user-123',
        'Multiple no-shows this week (2)'
      );
    });

    it('should handle users with monthly patterns', async () => {
      // Arrange
      const mockProblematicUsers: UserBehaviorSummary[] = [
        {
          userId: 'user-123',
          completionRate: 60,
          cancellationRate: 30,
          noShowRate: 10,
          reliabilityScore: 40,
          riskLevel: 'HIGH'
        }
      ];

      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 0,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 8,
        noShowsThisMonth: 0
      };

      const updatedBehavior: UserBehaviorData = {
        ...mockBehavior,
        currentStrikes: 1
      };

      mockUserBehaviorRepository.findProblematicUsers.mockResolvedValue(mockProblematicUsers);
      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);
      mockUserBehaviorRepository.addStrike.mockResolvedValue(updatedBehavior);

      // Act
      const result = await userBehaviorService.processAutomaticStrikes();

      // Assert
      expect(result).toEqual({
        processed: 1,
        banned: 0
      });
      expect(mockUserBehaviorRepository.addStrike).toHaveBeenCalledWith(
        'user-123',
        'Excessive monthly cancellations (8)'
      );
    });
  });

  describe('resetExpiredStrikes', () => {
    it('should reset expired strikes successfully', async () => {
      // Arrange
      const resetCount = 5;
      mockUserBehaviorRepository.resetExpiredStrikes.mockResolvedValue(resetCount);

      // Act
      const result = await userBehaviorService.resetExpiredStrikes();

      // Assert
      expect(result).toBe(resetCount);
      expect(mockUserBehaviorRepository.resetExpiredStrikes).toHaveBeenCalled();
    });
  });

  describe('unbanExpiredBans', () => {
    it('should unban expired bans successfully', async () => {
      // Arrange
      const unbanCount = 3;
      mockUserBehaviorRepository.unbanExpiredBans.mockResolvedValue(unbanCount);

      // Act
      const result = await userBehaviorService.unbanExpiredBans();

      // Assert
      expect(result).toBe(unbanCount);
      expect(mockUserBehaviorRepository.unbanExpiredBans).toHaveBeenCalled();
    });
  });

  describe('getUserBehaviorStats', () => {
    it('should throw error as not implemented', async () => {
      // Arrange
      const requestingUserId = 'admin-123';

      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(userBehaviorService.getUserBehaviorStats(requestingUserId))
        .rejects.toThrow('getUserBehaviorStats not implemented');
    });
  });

  describe('getCustomerBehaviorForBusiness', () => {
    it('should return customer behavior for business with global view', async () => {
      // Arrange
      const requestingUserId = 'admin-123';
      const businessId = 'business-123';
      const customerId = 'customer-123';
      const mockSummary: UserBehaviorSummary = {
        userId: 'customer-123',
        completionRate: 85,
        cancellationRate: 10,
        noShowRate: 5,
        reliabilityScore: 80,
        riskLevel: 'LOW'
      };

      mockRBACService.hasPermission.mockResolvedValue(true);
      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.getCustomerBehaviorForBusiness(
        requestingUserId,
        businessId,
        customerId
      );

      // Assert
      expect(result).toEqual({
        summary: mockSummary,
        businessSpecificStats: {
          appointmentsWithBusiness: 0,
          cancellationsWithBusiness: 0,
          noShowsWithBusiness: 0,
          completedWithBusiness: 0
        }
      });
    });

    it('should require business permission without global view', async () => {
      // Arrange
      const requestingUserId = 'business-owner-123';
      const businessId = 'business-123';
      const customerId = 'customer-123';
      const mockSummary: UserBehaviorSummary = {
        userId: 'customer-123',
        completionRate: 85,
        cancellationRate: 10,
        noShowRate: 5,
        reliabilityScore: 80,
        riskLevel: 'LOW'
      };

      mockRBACService.hasPermission.mockResolvedValue(false);
      mockRBACService.requirePermission.mockResolvedValue(undefined);
      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.getCustomerBehaviorForBusiness(
        requestingUserId,
        businessId,
        customerId
      );

      // Assert
      expect(result).toEqual({
        summary: mockSummary,
        businessSpecificStats: {
          appointmentsWithBusiness: 0,
          cancellationsWithBusiness: 0,
          noShowsWithBusiness: 0,
          completedWithBusiness: 0
        }
      });
      expect(mockRBACService.requirePermission).toHaveBeenCalledWith(
        requestingUserId,
        PermissionName.VIEW_OWN_CUSTOMERS,
        { businessId }
      );
    });
  });

  describe('flagUserForReview', () => {
    it('should throw error as not implemented', async () => {
      // Arrange
      const requestingUserId = 'business-owner-123';
      const targetUserId = 'user-123';
      const reason = 'Valid reason for flagging user';

      mockRBACService.requireAny.mockResolvedValue(undefined);

      // Act & Assert
      await expect(userBehaviorService.flagUserForReview(requestingUserId, targetUserId, reason))
        .rejects.toThrow('User flagging system not implemented');
    });

    it('should throw error for short reason', async () => {
      // Arrange
      const requestingUserId = 'business-owner-123';
      const targetUserId = 'user-123';
      const reason = 'Bad';

      // Act & Assert
      await expect(userBehaviorService.flagUserForReview(requestingUserId, targetUserId, reason))
        .rejects.toThrow('Flag reason must be at least 10 characters long');
    });
  });

  describe('calculateUserReliabilityScore', () => {
    it('should calculate reliability score successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSummary: UserBehaviorSummary = {
        userId: 'user-123',
        completionRate: 85,
        cancellationRate: 10,
        noShowRate: 5,
        reliabilityScore: 80,
        riskLevel: 'LOW'
      };

      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await userBehaviorService.calculateUserReliabilityScore(userId);

      // Assert
      expect(result).toBe(80);
      expect(mockUserBehaviorRepository.getUserSummary).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserRiskAssessment', () => {
    it('should return risk assessment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSummary: UserBehaviorSummary = {
        userId: 'user-123',
        completionRate: 60,
        cancellationRate: 25,
        noShowRate: 15,
        reliabilityScore: 40,
        riskLevel: 'HIGH'
      };

      const mockBehavior: UserBehaviorData = {
        userId: 'user-123',
        isBanned: false,
        currentStrikes: 2,
        cancelationsThisWeek: 0,
        noShowsThisWeek: 0,
        cancelationsThisMonth: 0,
        noShowsThisMonth: 0
      };

      mockUserBehaviorRepository.getUserSummary.mockResolvedValue(mockSummary);
      mockUserBehaviorRepository.findByUserId.mockResolvedValue(mockBehavior);

      // Act
      const result = await userBehaviorService.getUserRiskAssessment(userId);

      // Assert
      expect(result).toEqual({
        riskLevel: 'HIGH',
        factors: [
          'High cancellation rate: 25.0%',
          'High no-show rate: 15.0%',
          'Current strikes: 2',
          'Low completion rate: 60.0%'
        ],
        recommendations: [
          'Consider requiring confirmation closer to appointment time',
          'Consider requiring deposit or sending more reminders',
          'Monitor closely for continued problematic behavior',
          'Consider customer education about appointment policies'
        ]
      });
    });
  });
});

