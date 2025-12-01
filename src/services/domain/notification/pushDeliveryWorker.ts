import * as webpush from 'web-push';
import logger from '../../../utils/Logger/logger';
import { NotificationRepository } from '../../../repositories/notificationRepository';
import { PushSubscriptionData, SendPushNotificationRequest } from '../../../types/business';
import { NotificationStatus } from '../../../types/notification';
import {
  notificationsSent,
  pushInvalidSubscriptions,
  pushNotificationsQueued,
  pushQueueDepth,
} from '../../../utils/metrics';

interface PushDeliveryTask {
  subscription: PushSubscriptionData;
  notificationId: string;
  payload: string;
  request: SendPushNotificationRequest;
  attempt: number;
  enqueuedAt: number;
}

export class PushDeliveryWorker {
  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly stuckWarningMs: number;
  private activeTasks = 0;
  private readonly queue: PushDeliveryTask[] = [];

  constructor(private notificationRepository: NotificationRepository) {
    this.concurrency = parseInt(process.env.PUSH_WORKER_CONCURRENCY ?? '5', 10);
    this.maxRetries = parseInt(process.env.PUSH_WORKER_MAX_RETRIES ?? '3', 10);
    this.baseRetryDelayMs = parseInt(process.env.PUSH_WORKER_RETRY_DELAY_MS ?? '1000', 10);
    this.stuckWarningMs = parseInt(process.env.PUSH_WORKER_STUCK_WARNING_MS ?? '15000', 10);
  }

  enqueue(taskInput: Omit<PushDeliveryTask, 'attempt' | 'enqueuedAt'>): void {
    this.queue.push({
      ...taskInput,
      attempt: 0,
      enqueuedAt: Date.now(),
    });
    pushNotificationsQueued.inc();
    this.updateQueueDepth();
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeTasks < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) {
        continue;
      }
      this.activeTasks++;
      this.handleTask(task)
        .catch(error => {
          logger.error('Push delivery task unexpected failure', {
            error,
            notificationId: task.notificationId,
          });
        })
        .finally(() => {
          this.activeTasks--;
          this.updateQueueDepth();
          // Keep draining the queue
          this.processQueue();
        });
    }
  }

  private async handleTask(task: PushDeliveryTask): Promise<void> {
    try {
      const timeInQueue = Date.now() - task.enqueuedAt;
      if (timeInQueue > this.stuckWarningMs) {
        logger.warn('Push delivery task exceeded visibility window', {
          notificationId: task.notificationId,
          subscriptionId: task.subscription.id,
          delayMs: timeInQueue,
          attempts: task.attempt + 1,
        });
      }

      const pushSubscription = {
        endpoint: task.subscription.endpoint,
        keys: {
          p256dh: task.subscription.p256dh,
          auth: task.subscription.auth,
        },
      };

      await webpush.sendNotification(pushSubscription, task.payload);

      await this.notificationRepository.updatePushNotificationStatus(
        task.notificationId,
        NotificationStatus.SENT
      );
      await this.notificationRepository.updatePushSubscriptionLastUsed(task.subscription.id);
      notificationsSent.inc({ channel: 'PUSH', status: NotificationStatus.SENT });

      logger.info('Push notification delivered', {
        notificationId: task.notificationId,
        subscriptionId: task.subscription.id,
        attempts: task.attempt + 1,
        title: task.request.title,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Push delivery failure', {
        error: errorMessage,
        notificationId: task.notificationId,
        subscriptionId: task.subscription.id,
        attempt: task.attempt + 1,
        title: task.request.title,
      });

      if (this.isInvalidSubscription(error)) {
        await this.handleInvalidSubscription(task, errorMessage);
        return;
      }

      if (task.attempt + 1 < this.maxRetries) {
        const delay = this.getBackoffDelay(task.attempt + 1);
        setTimeout(() => {
          this.queue.push({
            ...task,
            attempt: task.attempt + 1,
            enqueuedAt: Date.now(),
          });
          this.updateQueueDepth();
          this.processQueue();
        }, delay);
        return;
      }

      await this.notificationRepository.updatePushNotificationStatus(
        task.notificationId,
        NotificationStatus.FAILED,
        errorMessage
      );

      await this.notificationRepository.updatePushNotificationStatusBySubscription(
        task.subscription.id,
        NotificationStatus.FAILED,
        errorMessage
      );
      notificationsSent.inc({ channel: 'PUSH', status: NotificationStatus.FAILED });

      logger.warn('Push notification marked as failed after max retries', {
        notificationId: task.notificationId,
        subscriptionId: task.subscription.id,
        attempts: task.attempt + 1,
        title: task.request.title,
      });
    }
  }

  private async handleInvalidSubscription(
    task: PushDeliveryTask,
    errorMessage: string
  ): Promise<void> {
    logger.info(`Disabling invalid subscription ${task.subscription.id}`);

    await this.notificationRepository.updatePushSubscriptionStatus(
      task.subscription.userId,
      task.subscription.endpoint,
      false
    );
    pushInvalidSubscriptions.inc();

    await this.notificationRepository.updatePushNotificationStatus(
      task.notificationId,
      NotificationStatus.FAILED,
      errorMessage
    );

    await this.notificationRepository.updatePushNotificationStatusBySubscription(
      task.subscription.id,
      NotificationStatus.FAILED,
      errorMessage
    );
    notificationsSent.inc({ channel: 'PUSH', status: NotificationStatus.FAILED });
  }

  private isInvalidSubscription(error: unknown): boolean {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const errorMessage = (error as { message?: string })?.message || '';
    const errorBody = (error as { body?: string })?.body || '';

    return (
      statusCode === 410 ||
      statusCode === 404 ||
      errorMessage.toLowerCase().includes('gone') ||
      errorMessage.toLowerCase().includes('expired') ||
      errorMessage.toLowerCase().includes('unsubscribed') ||
      errorBody.toLowerCase().includes('expired') ||
      errorBody.toLowerCase().includes('unsubscribed')
    );
  }

  private getBackoffDelay(attempt: number): number {
    return this.baseRetryDelayMs * Math.pow(2, attempt - 1);
  }

  private updateQueueDepth(): void {
    pushQueueDepth.set(this.queue.length + this.activeTasks);
  }

  getCurrentDepth(): number {
    return this.queue.length + this.activeTasks;
  }
}

