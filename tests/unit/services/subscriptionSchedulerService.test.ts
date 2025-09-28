import { SubscriptionSchedulerService, SchedulerConfig } from '../../../src/services/subscriptionSchedulerService';
import { PaymentService } from '../../../src/services/paymentService';
import { NotificationService } from '../../../src/services/notificationService';
import { PrismaClient } from '@prisma/client';
import { SubscriptionStatus } from '../../../src/types/business';

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../../src/utils/logger');

// Mock node-cron
const mockCron = {
  schedule: jest.fn()
};

// Mock the cron module
jest.mock('node-cron', () => mockCron);

describe('SubscriptionSchedulerService', () => {
  let subscriptionSchedulerService: SubscriptionSchedulerService;
  let mockPrisma: any;
  let mockPaymentService: any;
  let mockNotificationService: any;
  let mockConfig: SchedulerConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPrisma = {
      businessSubscription: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      payment: {
        updateMany: jest.fn()
      }
    };

    mockPaymentService = {
      createRenewalPayment: jest.fn()
    };

    mockNotificationService = {
      sendRenewalConfirmation: jest.fn(),
      sendRenewalReminder: jest.fn(),
      sendPaymentFailureNotification: jest.fn()
    };

    mockConfig = {
      renewalCheckSchedule: '0 2 * * *',
      reminderSchedule: '0 9 * * *',
      cleanupSchedule: '0 3 * * 0',
      timezone: 'Europe/Istanbul',
      developmentMode: false
    };

    // Create SubscriptionSchedulerService instance
    subscriptionSchedulerService = new SubscriptionSchedulerService(
      mockPrisma as PrismaClient,
      mockPaymentService as PaymentService,
      mockNotificationService as NotificationService,
      mockConfig
    );
  });

  describe('constructor', () => {
    it('should create SubscriptionSchedulerService instance', () => {
      expect(subscriptionSchedulerService).toBeInstanceOf(SubscriptionSchedulerService);
    });

    it('should set development mode schedules when developmentMode is true', () => {
      const devConfig = { ...mockConfig, developmentMode: true };
      const devService = new SubscriptionSchedulerService(
        mockPrisma as PrismaClient,
        mockPaymentService as PaymentService,
        mockNotificationService as NotificationService,
        devConfig
      );

      expect(devService).toBeInstanceOf(SubscriptionSchedulerService);
    });

    it('should use environment NODE_ENV for development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devService = new SubscriptionSchedulerService(
        mockPrisma as PrismaClient,
        mockPaymentService as PaymentService,
        mockNotificationService as NotificationService
      );

      expect(devService).toBeInstanceOf(SubscriptionSchedulerService);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('start', () => {
    it('should start all scheduled tasks', () => {
      // Arrange
      const mockTask = {
        stop: jest.fn()
      };
      mockCron.schedule.mockReturnValue(mockTask);

      // Act
      subscriptionSchedulerService.start();

      // Assert
      expect(mockCron.schedule).toHaveBeenCalledTimes(3);
      expect(mockCron.schedule).toHaveBeenCalledWith(
        mockConfig.renewalCheckSchedule,
        expect.any(Function),
        {
          scheduled: true,
          timezone: mockConfig.timezone
        }
      );
    });

    it('should log development mode warnings', () => {
      // Arrange
      const devConfig = { ...mockConfig, developmentMode: true };
      const devService = new SubscriptionSchedulerService(
        mockPrisma as PrismaClient,
        mockPaymentService as PaymentService,
        mockNotificationService as NotificationService,
        devConfig
      );

      const mockTask = {
        stop: jest.fn()
      };
      mockCron.schedule.mockReturnValue(mockTask);

      // Act
      devService.start();

      // Assert
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '*/1 * * * *', // Every minute in dev
        expect.any(Function),
        expect.any(Object)
      );
    });
  });

  describe('stop', () => {
    it('should stop all scheduled tasks', () => {
      // Arrange
      const mockTask = {
        stop: jest.fn()
      };
      mockCron.schedule.mockReturnValue(mockTask);
      subscriptionSchedulerService.start();

      // Act
      subscriptionSchedulerService.stop();

      // Assert
      expect(mockTask.stop).toHaveBeenCalledTimes(3);
    });

    it('should handle stopping when no tasks are running', () => {
      // Act & Assert
      expect(() => subscriptionSchedulerService.stop()).not.toThrow();
    });
  });

  describe('processSubscriptionRenewals', () => {
    it('should process renewals successfully', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        autoRenewal: true,
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        failedPaymentCount: 0,
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            id: 'owner-123',
            phoneNumber: '+905551234567'
          }
        },
        plan: {
          id: 'plan-123',
          displayName: 'Basic Plan',
          billingInterval: 'monthly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        }
      };

      mockPrisma.businessSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockPaymentService.createRenewalPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment-123'
      });
      mockPrisma.businessSubscription.update.mockResolvedValue(mockSubscription);

      // Act
      const result = await (subscriptionSchedulerService as any).processSubscriptionRenewals();

      // Assert
      expect(result).toEqual({
        processed: 1,
        renewed: 1,
        failed: 0
      });
      expect(mockPaymentService.createRenewalPayment).toHaveBeenCalledWith(
        mockSubscription.id,
        mockSubscription.plan,
        mockSubscription.paymentMethod,
        mockSubscription.business
      );
    });

    it('should handle renewal failure', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        autoRenewal: true,
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        failedPaymentCount: 0,
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            id: 'owner-123',
            phoneNumber: '+905551234567'
          }
        },
        plan: {
          id: 'plan-123',
          displayName: 'Basic Plan',
          billingInterval: 'monthly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        }
      };

      mockPrisma.businessSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockPaymentService.createRenewalPayment.mockRejectedValue(new Error('Payment failed'));

      // Act
      const result = await (subscriptionSchedulerService as any).processSubscriptionRenewals();

      // Assert
      expect(result).toEqual({
        processed: 1,
        renewed: 0,
        failed: 1
      });
      expect(mockPrisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { id: mockSubscription.id },
        data: {
          failedPaymentCount: 1,
          autoRenewal: true
        }
      });
    });

    it('should disable auto-renewal after multiple failures', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        businessId: 'business-123',
        status: SubscriptionStatus.ACTIVE,
        autoRenewal: true,
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        failedPaymentCount: 2, // Already has 2 failures
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            id: 'owner-123',
            phoneNumber: '+905551234567'
          }
        },
        plan: {
          id: 'plan-123',
          displayName: 'Basic Plan',
          billingInterval: 'monthly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        }
      };

      mockPrisma.businessSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockPaymentService.createRenewalPayment.mockRejectedValue(new Error('Payment failed'));

      // Act
      const result = await (subscriptionSchedulerService as any).processSubscriptionRenewals();

      // Assert
      expect(result).toEqual({
        processed: 1,
        renewed: 0,
        failed: 1
      });
      expect(mockPrisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { id: mockSubscription.id },
        data: {
          failedPaymentCount: 3,
          autoRenewal: false // Should be disabled after 3rd failure
        }
      });
    });

    it('should handle error in renewal process', async () => {
      // Arrange
      mockPrisma.businessSubscription.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await (subscriptionSchedulerService as any).processSubscriptionRenewals();

      // Assert
      expect(result).toEqual({
        processed: 0,
        renewed: 0,
        failed: 0
      });
    });
  });

  describe('processIndividualRenewal', () => {
    it('should process individual renewal successfully', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        currentPeriodEnd: new Date('2024-01-15'),
        plan: {
          billingInterval: 'monthly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        },
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        }
      };

      mockPaymentService.createRenewalPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment-123'
      });
      mockPrisma.businessSubscription.update.mockResolvedValue(mockSubscription);

      // Act
      await (subscriptionSchedulerService as any).processIndividualRenewal(mockSubscription);

      // Assert
      expect(mockPaymentService.createRenewalPayment).toHaveBeenCalledWith(
        mockSubscription.id,
        mockSubscription.plan,
        mockSubscription.paymentMethod,
        mockSubscription.business
      );
      expect(mockPrisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { id: mockSubscription.id },
        data: {
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
          nextBillingDate: expect.any(Date),
          failedPaymentCount: 0,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should throw error when no payment method available', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        currentPeriodEnd: new Date('2024-01-15'),
        plan: {
          billingInterval: 'monthly'
        },
        paymentMethod: null,
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        }
      };

      // Act & Assert
      await expect((subscriptionSchedulerService as any).processIndividualRenewal(mockSubscription))
        .rejects.toThrow('No payment method available for renewal');
    });

    it('should throw error when payment fails', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        currentPeriodEnd: new Date('2024-01-15'),
        plan: {
          billingInterval: 'monthly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        },
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        }
      };

      mockPaymentService.createRenewalPayment.mockResolvedValue({
        success: false,
        error: 'Payment declined'
      });

      // Act & Assert
      await expect((subscriptionSchedulerService as any).processIndividualRenewal(mockSubscription))
        .rejects.toThrow('Payment declined');
    });
  });

  describe('sendRenewalReminders', () => {
    it('should send renewal reminders successfully', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        business: {
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        },
        plan: {
          displayName: 'Basic Plan'
        },
        currentPeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      };

      mockPrisma.businessSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockNotificationService.sendRenewalReminder.mockResolvedValue(undefined);

      // Act
      const result = await (subscriptionSchedulerService as any).sendRenewalReminders();

      // Assert
      expect(result).toBe(1);
      expect(mockNotificationService.sendRenewalReminder).toHaveBeenCalledWith(
        mockSubscription.business.owner.phoneNumber,
        mockSubscription.business.name,
        mockSubscription.plan.displayName,
        mockSubscription.currentPeriodEnd
      );
    });

    it('should handle error in reminder sending', async () => {
      // Arrange
      mockPrisma.businessSubscription.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await (subscriptionSchedulerService as any).sendRenewalReminders();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('sendPaymentFailureNotifications', () => {
    it('should send payment failure notifications successfully', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        failedPaymentCount: 2,
        business: {
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        },
        plan: {
          displayName: 'Basic Plan'
        },
        currentPeriodEnd: new Date()
      };

      mockPrisma.businessSubscription.findMany.mockResolvedValue([mockSubscription]);
      mockNotificationService.sendPaymentFailureNotification.mockResolvedValue(undefined);

      // Act
      const result = await (subscriptionSchedulerService as any).sendPaymentFailureNotifications();

      // Assert
      expect(result).toBe(1);
      expect(mockNotificationService.sendPaymentFailureNotification).toHaveBeenCalledWith(
        mockSubscription.business.owner.phoneNumber,
        mockSubscription.business.name,
        mockSubscription.failedPaymentCount,
        mockSubscription.currentPeriodEnd
      );
    });

    it('should handle error in notification sending', async () => {
      // Arrange
      mockPrisma.businessSubscription.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await (subscriptionSchedulerService as any).sendPaymentFailureNotifications();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredData', () => {
    it('should cleanup expired data successfully', async () => {
      // Arrange
      mockPrisma.businessSubscription.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 10 });

      // Act
      const result = await (subscriptionSchedulerService as any).cleanupExpiredData();

      // Assert
      expect(result).toEqual({
        canceledSubscriptions: 5,
        cleanedPayments: 10
      });
      expect(mockPrisma.businessSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: {
            lt: expect.any(Date)
          },
          failedPaymentCount: {
            gte: 3
          }
        },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: expect.any(Date),
          autoRenewal: false
        }
      });
    });

    it('should handle error in cleanup process', async () => {
      // Arrange
      mockPrisma.businessSubscription.updateMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await (subscriptionSchedulerService as any).cleanupExpiredData();

      // Assert
      expect(result).toEqual({
        canceledSubscriptions: 0,
        cleanedPayments: 0
      });
    });
  });

  describe('getStatus', () => {
    it('should return status when no tasks are running', () => {
      // Act
      const status = subscriptionSchedulerService.getStatus();

      // Assert
      expect(status).toEqual({
        isRunning: false,
        tasks: {
          renewal: false,
          reminders: false,
          cleanup: false
        },
        config: mockConfig
      });
    });

    it('should return status when tasks are running', () => {
      // Arrange
      const mockTask = {
        stop: jest.fn()
      };
      mockCron.schedule.mockReturnValue(mockTask);
      subscriptionSchedulerService.start();

      // Act
      const status = subscriptionSchedulerService.getStatus();

      // Assert
      expect(status).toEqual({
        isRunning: true,
        tasks: {
          renewal: true,
          reminders: true,
          cleanup: true
        },
        config: mockConfig
      });
    });
  });

  describe('triggerRenewalCheck', () => {
    it('should trigger renewal check manually', async () => {
      // Arrange
      mockPrisma.businessSubscription.findMany.mockResolvedValue([]);

      // Act
      const result = await subscriptionSchedulerService.triggerRenewalCheck();

      // Assert
      expect(result).toEqual({
        processed: 0,
        renewed: 0,
        failed: 0
      });
    });
  });

  describe('triggerReminderService', () => {
    it('should trigger reminder service manually', async () => {
      // Arrange
      mockPrisma.businessSubscription.findMany.mockResolvedValue([]);

      // Act
      const result = await subscriptionSchedulerService.triggerReminderService();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('triggerCleanup', () => {
    it('should trigger cleanup manually', async () => {
      // Arrange
      mockPrisma.businessSubscription.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await subscriptionSchedulerService.triggerCleanup();

      // Assert
      expect(result).toEqual({
        canceledSubscriptions: 0,
        cleanedPayments: 0
      });
    });
  });

  describe('billing interval calculations', () => {
    it('should calculate monthly billing period correctly', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        currentPeriodEnd: new Date('2024-01-15'),
        plan: {
          billingInterval: 'monthly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        },
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        }
      };

      mockPaymentService.createRenewalPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment-123'
      });
      mockPrisma.businessSubscription.update.mockResolvedValue(mockSubscription);

      // Act
      await (subscriptionSchedulerService as any).processIndividualRenewal(mockSubscription);

      // Assert
      expect(mockPrisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { id: mockSubscription.id },
        data: {
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
          nextBillingDate: expect.any(Date),
          failedPaymentCount: 0,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should calculate yearly billing period correctly', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub-123',
        currentPeriodEnd: new Date('2024-01-15'),
        plan: {
          billingInterval: 'yearly'
        },
        paymentMethod: {
          id: 'pm-123',
          type: 'card'
        },
        business: {
          id: 'business-123',
          name: 'Test Business',
          owner: {
            phoneNumber: '+905551234567'
          }
        }
      };

      mockPaymentService.createRenewalPayment.mockResolvedValue({
        success: true,
        paymentId: 'payment-123'
      });
      mockPrisma.businessSubscription.update.mockResolvedValue(mockSubscription);

      // Act
      await (subscriptionSchedulerService as any).processIndividualRenewal(mockSubscription);

      // Assert
      expect(mockPrisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { id: mockSubscription.id },
        data: {
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
          nextBillingDate: expect.any(Date),
          failedPaymentCount: 0,
          updatedAt: expect.any(Date)
        }
      });
    });
  });
});

