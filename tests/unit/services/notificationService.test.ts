import { NotificationService } from '../../../src/services/domain/notification/notificationService';
import { NotificationStatus } from '../../../src/types/notification';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('NotificationService - sendPushNotification', () => {
  const mockNotificationRepository = {
    findPushSubscriptionsByUser: jest.fn(),
    createPushNotification: jest.fn(),
    updatePushNotificationStatus: jest.fn(),
    updatePushSubscriptionLastUsed: jest.fn(),
    updatePushNotificationStatusBySubscription: jest.fn(),
  };

  const repositories: any = {
    notificationRepository: mockNotificationRepository,
  };

  const defaultSubscription = {
    id: 'sub_123',
    userId: 'user_1',
    endpoint: 'https://example.com/endpoint',
    p256dh: 'p256dh_key',
    auth: 'auth_key',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'public';
    process.env.VAPID_PRIVATE_KEY = 'private';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';

    mockNotificationRepository.findPushSubscriptionsByUser.mockResolvedValue([defaultSubscription]);
    mockNotificationRepository.createPushNotification.mockResolvedValue({
      id: 'pn_database_id',
      subscriptionId: defaultSubscription.id,
      title: 'Test',
      body: 'Body',
      status: NotificationStatus.PENDING,
    });
    mockNotificationRepository.updatePushNotificationStatus.mockResolvedValue({
      id: 'pn_database_id',
      status: NotificationStatus.SENT,
    });
  });

  it('enqueues delivery using the persisted notification ID', async () => {
    const mockWorker = { enqueue: jest.fn() };
    const service = new NotificationService(repositories as any, undefined, mockWorker as any);

    const results = await service.sendPushNotification({
      userId: 'user_1',
      businessId: 'biz_1',
      title: 'Hello',
      body: 'World',
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      success: true,
      status: NotificationStatus.PENDING,
      messageId: 'pn_database_id',
    });
    expect(mockNotificationRepository.createPushNotification).toHaveBeenCalledTimes(1);
    expect(mockWorker.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'pn_database_id',
      })
    );
  });

  it('fails fast when VAPID keys are missing', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const mockWorker = { enqueue: jest.fn() };
    const service = new NotificationService(repositories as any, undefined, mockWorker as any);

    const results = await service.sendPushNotification({
      userId: 'user_1',
      businessId: 'biz_1',
      title: 'Hello',
      body: 'World',
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      success: false,
      status: NotificationStatus.FAILED,
      channel: 'PUSH',
    });
    expect(mockNotificationRepository.findPushSubscriptionsByUser).not.toHaveBeenCalled();
    expect(mockWorker.enqueue).not.toHaveBeenCalled();
  });
});

