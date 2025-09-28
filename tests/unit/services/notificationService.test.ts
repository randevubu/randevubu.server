import { NotificationService, NotificationResult, EnhancedClosureData, TimeSlot, RescheduleSuggestion } from '../../../src/services/notificationService';
import { PrismaClient, NotificationChannel, NotificationStatus } from '@prisma/client';
import { UsageService } from '../../../src/services/usageService';
import { PushSubscriptionRequest, NotificationPreferenceRequest, SendPushNotificationRequest, UpcomingAppointment } from '../../../src/types/business';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/services/usageService');
jest.mock('web-push');
jest.mock('../../../src/services/smsService');
jest.mock('../../../src/utils/notificationTranslations');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockPrisma: any;
  let mockUsageService: jest.Mocked<UsageService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      closureNotification: {
        create: jest.fn(),
        findMany: jest.fn()
      },
      availabilityAlert: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn()
      },
      appointment: {
        findUnique: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      },
      pushSubscription: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn()
      },
      notificationPreference: {
        upsert: jest.fn(),
        findUnique: jest.fn()
      },
      pushNotification: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      }
    };

    mockUsageService = {
      canSendSms: jest.fn(),
      recordSmsUsage: jest.fn()
    } as any;

    // Create NotificationService instance
    notificationService = new NotificationService(mockPrisma as PrismaClient, mockUsageService);
  });

  describe('sendClosureNotification', () => {
    it('should send closure notification via multiple channels', async () => {
      // Arrange
      const customerId = 'customer-123';
      const closureData: EnhancedClosureData = {
        id: 'closure-123',
        businessId: 'business-123',
        businessName: 'Test Business',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-16'),
        reason: 'Holiday',
        type: 'HOLIDAY'
      };
      const channels = [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];

      mockPrisma.closureNotification.create.mockResolvedValue({});

      // Act
      const results = await notificationService.sendClosureNotification(customerId, closureData, channels);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].channel).toBe(NotificationChannel.EMAIL);
      expect(results[1].channel).toBe(NotificationChannel.SMS);
      expect(results[2].channel).toBe(NotificationChannel.PUSH);
      expect(mockPrisma.closureNotification.create).toHaveBeenCalledTimes(3);
    });

    it('should handle unsupported notification channel', async () => {
      // Arrange
      const customerId = 'customer-123';
      const closureData: EnhancedClosureData = {
        id: 'closure-123',
        businessId: 'business-123',
        businessName: 'Test Business',
        startDate: new Date('2024-01-15'),
        reason: 'Holiday',
        type: 'HOLIDAY'
      };
      const channels = ['UNSUPPORTED' as NotificationChannel];

      // Act
      const results = await notificationService.sendClosureNotification(customerId, closureData, channels);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unsupported notification channel');
    });
  });

  describe('sendAvailabilityAlert', () => {
    it('should send availability alert successfully', async () => {
      // Arrange
      const customerId = 'customer-123';
      const businessId = 'business-123';
      const availableSlots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          serviceId: 'service-123'
        }
      ];

      const mockAlert = {
        id: 'alert-123',
        customerId,
        businessId,
        isActive: true,
        business: { name: 'Test Business' },
        service: { name: 'Test Service' },
        notificationPreferences: JSON.stringify({ channels: [NotificationChannel.EMAIL] })
      };

      mockPrisma.availabilityAlert.findFirst.mockResolvedValue(mockAlert);

      // Act
      const results = await notificationService.sendAvailabilityAlert(customerId, businessId, availableSlots);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe(NotificationChannel.EMAIL);
    });

    it('should return error if no active availability alert found', async () => {
      // Arrange
      const customerId = 'customer-123';
      const businessId = 'business-123';
      const availableSlots: TimeSlot[] = [];

      mockPrisma.availabilityAlert.findFirst.mockResolvedValue(null);

      // Act
      const results = await notificationService.sendAvailabilityAlert(customerId, businessId, availableSlots);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('No active availability alert found');
    });
  });

  describe('sendRescheduleNotification', () => {
    it('should send reschedule notification successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      const suggestions: RescheduleSuggestion[] = [
        {
          originalAppointmentId: appointmentId,
          suggestedSlots: [
            {
              startTime: new Date('2024-01-15T10:00:00'),
              endTime: new Date('2024-01-15T11:00:00')
            }
          ],
          message: 'Please reschedule your appointment'
        }
      ];

      const mockAppointment = {
        id: appointmentId,
        customerId: 'customer-123',
        businessId: 'business-123',
        startTime: new Date('2024-01-15T09:00:00'),
        customer: { firstName: 'John', lastName: 'Doe' },
        business: { name: 'Test Business' },
        service: { name: 'Test Service' }
      };

      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      // Act
      const result = await notificationService.sendRescheduleNotification(appointmentId, suggestions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.EMAIL);
    });

    it('should return error if appointment not found', async () => {
      // Arrange
      const appointmentId = 'non-existent';
      const suggestions: RescheduleSuggestion[] = [];

      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      // Act
      const result = await notificationService.sendRescheduleNotification(appointmentId, suggestions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Appointment not found');
    });
  });

  describe('subscribeToPush', () => {
    it('should subscribe user to push notifications', async () => {
      // Arrange
      const userId = 'user-123';
      const subscriptionData: PushSubscriptionRequest = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        },
        deviceName: 'Test Device',
        deviceType: 'web',
        userAgent: 'Mozilla/5.0'
      };

      const mockSubscription = {
        id: 'subscription-123',
        userId,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        deviceName: subscriptionData.deviceName,
        deviceType: subscriptionData.deviceType,
        userAgent: subscriptionData.userAgent,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.pushSubscription.upsert.mockResolvedValue(mockSubscription);

      // Act
      const result = await notificationService.subscribeToPush(userId, subscriptionData);

      // Assert
      expect(result).toEqual(mockSubscription);
      expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith({
        where: {
          userId_endpoint: {
            userId,
            endpoint: subscriptionData.endpoint
          }
        },
        update: expect.any(Object),
        create: expect.any(Object)
      });
    });
  });

  describe('unsubscribeFromPush', () => {
    it('should unsubscribe user from push notifications by endpoint', async () => {
      // Arrange
      const userId = 'user-123';
      const endpoint = 'https://fcm.googleapis.com/fcm/send/test';

      mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await notificationService.unsubscribeFromPush(userId, endpoint);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: { userId, endpoint },
        data: { isActive: false }
      });
    });

    it('should unsubscribe user from push notifications by subscription id', async () => {
      // Arrange
      const userId = 'user-123';
      const subscriptionId = 'subscription-123';

      mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await notificationService.unsubscribeFromPush(userId, undefined, subscriptionId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: { userId, id: subscriptionId },
        data: { isActive: false }
      });
    });

    it('should throw error if neither endpoint nor subscription id provided', async () => {
      // Arrange
      const userId = 'user-123';

      // Act & Assert
      await expect(notificationService.unsubscribeFromPush(userId))
        .rejects.toThrow('Either endpoint or subscriptionId must be provided');
    });
  });

  describe('getUserPushSubscriptions', () => {
    it('should return user push subscriptions', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSubscriptions = [
        {
          id: 'subscription-1',
          userId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          isActive: true,
          lastUsedAt: new Date()
        },
        {
          id: 'subscription-2',
          userId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          isActive: false,
          lastUsedAt: new Date()
        }
      ];

      mockPrisma.pushSubscription.findMany.mockResolvedValue(mockSubscriptions);

      // Act
      const result = await notificationService.getUserPushSubscriptions(userId, true);

      // Assert
      expect(result).toEqual(mockSubscriptions);
      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        orderBy: { lastUsedAt: 'desc' }
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      // Arrange
      const userId = 'user-123';
      const preferences: NotificationPreferenceRequest = {
        enableAppointmentReminders: true,
        enableBusinessNotifications: false,
        enablePromotionalMessages: true,
        reminderTiming: { hours: [1, 24] },
        preferredChannels: { channels: [NotificationChannel.PUSH, NotificationChannel.SMS] },
        quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Istanbul' },
        timezone: 'Europe/Istanbul'
      };

      const mockResult = {
        id: 'pref-123',
        userId,
        enableAppointmentReminders: true,
        enableBusinessNotifications: false,
        enablePromotionalMessages: true,
        reminderTiming: JSON.stringify(preferences.reminderTiming),
        preferredChannels: JSON.stringify(preferences.preferredChannels),
        quietHours: JSON.stringify(preferences.quietHours),
        timezone: 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.notificationPreference.upsert.mockResolvedValue(mockResult);

      // Act
      const result = await notificationService.updateNotificationPreferences(userId, preferences);

      // Assert
      expect(result).toEqual({
        ...mockResult,
        reminderTiming: preferences.reminderTiming,
        preferredChannels: preferences.preferredChannels,
        quietHours: preferences.quietHours
      });
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return notification preferences', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPreferences = {
        id: 'pref-123',
        userId,
        enableAppointmentReminders: true,
        enableBusinessNotifications: true,
        enablePromotionalMessages: false,
        reminderTiming: JSON.stringify({ hours: [1, 24] }),
        preferredChannels: JSON.stringify({ channels: [NotificationChannel.PUSH] }),
        quietHours: null,
        timezone: 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPreferences);

      // Act
      const result = await notificationService.getNotificationPreferences(userId);

      // Assert
      expect(result).toEqual({
        ...mockPreferences,
        reminderTiming: { hours: [1, 24] },
        preferredChannels: { channels: [NotificationChannel.PUSH] },
        quietHours: undefined
      });
    });

    it('should return null if no preferences found', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      // Act
      const result = await notificationService.getNotificationPreferences(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('sendPushNotification', () => {
    it('should send push notification successfully', async () => {
      // Arrange
      const request: SendPushNotificationRequest = {
        userId: 'user-123',
        appointmentId: 'appointment-123',
        businessId: 'business-123',
        title: 'Test Notification',
        body: 'Test message',
        icon: 'test-icon.png',
        badge: 'test-badge.png',
        data: { test: 'data' },
        url: '/test-url'
      };

      const mockSubscriptions = [
        {
          id: 'subscription-123',
          userId: 'user-123',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          p256dh: 'test-p256dh',
          auth: 'test-auth',
          isActive: true
        }
      ];

      mockPrisma.pushSubscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrisma.pushNotification.create.mockResolvedValue({});
      mockPrisma.pushNotification.update.mockResolvedValue({});
      mockPrisma.pushSubscription.update.mockResolvedValue({});

      // Mock webpush.sendNotification
      const mockWebpush = require('web-push');
      mockWebpush.sendNotification.mockResolvedValue(undefined);

      // Act
      const results = await notificationService.sendPushNotification(request);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe(NotificationChannel.PUSH);
      expect(mockPrisma.pushNotification.create).toHaveBeenCalled();
    });

    it('should return error if no active subscriptions found', async () => {
      // Arrange
      const request: SendPushNotificationRequest = {
        userId: 'user-123',
        businessId: 'business-123',
        title: 'Test Notification',
        body: 'Test message'
      };

      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

      // Act
      const results = await notificationService.sendPushNotification(request);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('No active push subscriptions found for user');
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send appointment reminder successfully', async () => {
      // Arrange
      const appointment: UpcomingAppointment = {
        id: 'appointment-123',
        customerId: 'customer-123',
        businessId: 'business-123',
        startTime: new Date('2024-01-15T10:00:00'),
        business: {
          id: 'business-123',
          name: 'Test Business',
          timezone: 'Europe/Istanbul'
        },
        service: {
          id: 'service-123',
          name: 'Test Service'
        },
        customer: {
          id: 'customer-123',
          phoneNumber: '+905551234567'
        }
      };

      const mockPreferences = {
        id: 'pref-123',
        userId: 'customer-123',
        enableAppointmentReminders: true,
        enableBusinessNotifications: true,
        enablePromotionalMessages: false,
        reminderTiming: { hours: [1, 24] },
        preferredChannels: { channels: [NotificationChannel.PUSH] },
        quietHours: undefined,
        timezone: 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.pushSubscription.findMany.mockResolvedValue([{
        id: 'subscription-123',
        userId: 'customer-123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh',
        auth: 'test-auth',
        isActive: true
      }]);
      mockPrisma.pushNotification.create.mockResolvedValue({});
      mockPrisma.pushNotification.update.mockResolvedValue({});
      mockPrisma.pushSubscription.update.mockResolvedValue({});

      const mockWebpush = require('web-push');
      mockWebpush.sendNotification.mockResolvedValue(undefined);

      // Act
      const results = await notificationService.sendAppointmentReminder(appointment);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channel).toBe(NotificationChannel.PUSH);
    });

    it('should not send reminder if user has disabled appointment reminders', async () => {
      // Arrange
      const appointment: UpcomingAppointment = {
        id: 'appointment-123',
        customerId: 'customer-123',
        businessId: 'business-123',
        startTime: new Date('2024-01-15T10:00:00'),
        business: {
          id: 'business-123',
          name: 'Test Business',
          timezone: 'Europe/Istanbul'
        },
        service: {
          id: 'service-123',
          name: 'Test Service'
        },
        customer: {
          id: 'customer-123',
          phoneNumber: '+905551234567'
        }
      };

      const mockPreferences = {
        id: 'pref-123',
        userId: 'customer-123',
        enableAppointmentReminders: false,
        enableBusinessNotifications: true,
        enablePromotionalMessages: false,
        reminderTiming: { hours: [1, 24] },
        preferredChannels: { channels: [NotificationChannel.PUSH] },
        quietHours: undefined,
        timezone: 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPreferences);

      // Act
      const results = await notificationService.sendAppointmentReminder(appointment);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('User has disabled appointment reminders');
    });
  });

  describe('createAvailabilityAlert', () => {
    it('should create availability alert successfully', async () => {
      // Arrange
      const customerId = 'customer-123';
      const businessId = 'business-123';
      const serviceId = 'service-123';
      const preferredDates = [
        { startDate: new Date('2024-01-15'), endDate: new Date('2024-01-16') }
      ];
      const notificationChannels = [NotificationChannel.EMAIL, NotificationChannel.SMS];

      mockPrisma.availabilityAlert.create.mockResolvedValue({ id: 'alert-123' });

      // Act
      const result = await notificationService.createAvailabilityAlert(
        customerId,
        businessId,
        serviceId,
        preferredDates,
        notificationChannels
      );

      // Assert
      expect(result).toBe('alert-123');
      expect(mockPrisma.availabilityAlert.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          customerId,
          businessId,
          serviceId,
          preferredDates: JSON.stringify(preferredDates),
          notificationPreferences: JSON.stringify({ channels: notificationChannels }),
          isActive: true
        }
      });
    });
  });

  describe('deactivateAvailabilityAlert', () => {
    it('should deactivate availability alert successfully', async () => {
      // Arrange
      const alertId = 'alert-123';
      const customerId = 'customer-123';

      mockPrisma.availabilityAlert.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await notificationService.deactivateAvailabilityAlert(alertId, customerId);

      // Assert
      expect(mockPrisma.availabilityAlert.updateMany).toHaveBeenCalledWith({
        where: { id: alertId, customerId },
        data: { isActive: false }
      });
    });
  });

  describe('getNotificationDeliveryStats', () => {
    it('should return notification delivery stats', async () => {
      // Arrange
      const closureId = 'closure-123';
      const mockNotifications = [
        { status: NotificationStatus.SENT, channel: NotificationChannel.EMAIL },
        { status: NotificationStatus.SENT, channel: NotificationChannel.SMS },
        { status: NotificationStatus.FAILED, channel: NotificationChannel.PUSH },
        { status: NotificationStatus.PENDING, channel: NotificationChannel.EMAIL }
      ];

      mockPrisma.closureNotification.findMany.mockResolvedValue(mockNotifications);

      // Act
      const result = await notificationService.getNotificationDeliveryStats(closureId);

      // Assert
      expect(result).toEqual({
        total: 4,
        sent: 2,
        failed: 1,
        pending: 1,
        byChannel: {
          [NotificationChannel.EMAIL]: 2,
          [NotificationChannel.SMS]: 1,
          [NotificationChannel.PUSH]: 1
        }
      });
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return VAPID public key', async () => {
      // Arrange
      const originalEnv = process.env.VAPID_PUBLIC_KEY;
      process.env.VAPID_PUBLIC_KEY = 'test-vapid-key';

      // Act
      const result = await notificationService.getVapidPublicKey();

      // Assert
      expect(result).toBe('test-vapid-key');

      // Cleanup
      process.env.VAPID_PUBLIC_KEY = originalEnv;
    });

    it('should return null if VAPID key not set', async () => {
      // Arrange
      const originalEnv = process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PUBLIC_KEY;

      // Act
      const result = await notificationService.getVapidPublicKey();

      // Assert
      expect(result).toBeNull();

      // Cleanup
      process.env.VAPID_PUBLIC_KEY = originalEnv;
    });
  });
});