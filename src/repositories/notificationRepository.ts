import { 
  PrismaClient, 
  AvailabilityAlert, 
  ClosureNotification, 
  PushSubscription, 
  NotificationPreference, 
  PushNotification,
  NotificationStatus,
  NotificationChannel,
  Prisma 
} from '@prisma/client';

// Enhanced interfaces with proper typing
export interface AvailabilityAlertData {
  id: string;
  customerId: string;
  businessId: string;
  serviceId?: string | null;
  preferredDates?: PreferredDatesConfig | null;
  notificationPreferences: NotificationPreferencesConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreferredDatesConfig {
  startDate: string;
  endDate: string;
  daysOfWeek?: number[];
  timeSlots?: string[];
}

export interface NotificationPreferencesConfig {
  channels: NotificationChannel[];
  timing: number[];
  quietHours?: QuietHoursConfig;
}

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: number[];
  timezone: string;
}

export interface CreateAvailabilityAlertRequest {
  customerId: string;
  businessId: string;
  serviceId?: string;
  preferredDates?: PreferredDatesConfig;
  notificationPreferences: NotificationPreferencesConfig;
}

export interface ClosureNotificationData {
  id: string;
  closureId: string;
  customerId: string;
  channel: NotificationChannel;
  message: string;
  sentAt?: Date | null;
  status: NotificationStatus;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface CreateClosureNotificationRequest {
  closureId: string;
  customerId: string;
  channel: NotificationChannel;
  message: string;
  status?: NotificationStatus;
}

export interface PushSubscriptionData {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceName?: string | null;
  deviceType?: string | null;
  userAgent?: string | null;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePushSubscriptionRequest {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  deviceName?: string;
  deviceType?: string;
}

export interface NotificationPreferenceData {
  id: string;
  userId: string;
  enableAppointmentReminders: boolean;
  enableBusinessNotifications: boolean;
  enablePromotionalMessages: boolean;
  reminderTiming: ReminderTimingConfig;
  preferredChannels: PreferredChannelsConfig;
  quietHours?: QuietHoursConfig | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderTimingConfig {
  hours: number[];
}

export interface PreferredChannelsConfig {
  channels: NotificationChannel[];
}

export interface CreateNotificationPreferenceRequest {
  userId: string;
  appointmentReminders?: boolean;
  businessUpdates?: boolean;
  marketingMessages?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  reminderTiming?: ReminderTimingConfig;
  preferredChannels?: PreferredChannelsConfig;
  quietHours?: QuietHoursConfig;
  timezone?: string;
}

export interface PushNotificationData {
  id: string;
  subscriptionId: string;
  appointmentId?: string | null;
  businessId?: string | null;
  title: string;
  body: string;
  icon?: string | null;
  badge?: string | null;
  data?: NotificationDataConfig | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  status: NotificationStatus;
  errorMessage?: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDataConfig {
  appointmentId?: string;
  businessId?: string;
  type: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePushNotificationRequest {
  userId: string;
  businessId?: string;
  title: string;
  body: string;
  data?: NotificationDataConfig;
  status?: NotificationStatus;
}

export interface NotificationQueryOptions {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  startDate?: Date;
  endDate?: Date;
}

export interface NotificationStats {
  totalNotifications: number;
  sentNotifications: number;
  pendingNotifications: number;
  failedNotifications: number;
  deliveryRate: number;
}

export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  // Availability Alert methods
  async createAvailabilityAlert(data: CreateAvailabilityAlertRequest): Promise<AvailabilityAlertData> {
    // Validate customer exists
    const customer = await this.prisma.user.findUnique({
      where: { id: data.customerId },
      select: { id: true, isActive: true }
    });

    if (!customer || !customer.isActive) {
      throw new Error(`Customer with ID ${data.customerId} not found or inactive`);
    }

    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true, isActive: true }
    });

    if (!business || !business.isActive) {
      throw new Error(`Business with ID ${data.businessId} not found or inactive`);
    }

    // Validate service exists if provided
    if (data.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: data.serviceId },
        select: { id: true, isActive: true }
      });

      if (!service || !service.isActive) {
        throw new Error(`Service with ID ${data.serviceId} not found or inactive`);
      }
    }

    // Validate notification preferences
    if (!this.isValidNotificationPreferences(data.notificationPreferences)) {
      throw new Error('Invalid notification preferences configuration');
    }

    // Check for existing alert
    const existingAlert = await this.prisma.availabilityAlert.findFirst({
      where: {
        customerId: data.customerId,
        businessId: data.businessId,
        serviceId: data.serviceId,
        isActive: true
      }
    });

    if (existingAlert) {
      throw new Error('Availability alert already exists for this customer, business, and service combination');
    }

    const alert = await this.prisma.availabilityAlert.create({
      data: {
        id: `aa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        customerId: data.customerId,
        businessId: data.businessId,
        serviceId: data.serviceId,
        preferredDates: data.preferredDates ? this.serializePreferredDates(data.preferredDates) : Prisma.JsonNull,
        notificationPreferences: this.serializeNotificationPreferences(data.notificationPreferences),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapToAvailabilityAlertData(alert);
  }

  async findAvailabilityAlertByCustomerAndBusiness(
    customerId: string, 
    businessId: string
  ): Promise<AvailabilityAlertData | null> {
    const alert = await this.prisma.availabilityAlert.findFirst({
      where: {
        customerId,
        businessId,
        isActive: true,
      },
      include: {
        business: true,
        service: true,
      },
    });

    return alert ? this.mapToAvailabilityAlertData(alert) : null;
  }

  async findAvailabilityAlertsByBusiness(businessId: string): Promise<AvailabilityAlertData[]> {
    const alerts = await this.prisma.availabilityAlert.findMany({
      where: {
        businessId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map(alert => this.mapToAvailabilityAlertData(alert));
  }

  async updateAvailabilityAlertStatus(id: string, isActive: boolean): Promise<AvailabilityAlertData> {
    const existingAlert = await this.prisma.availabilityAlert.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingAlert) {
      throw new Error(`Availability alert with ID ${id} not found`);
    }

    const alert = await this.prisma.availabilityAlert.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date()
      },
    });

    return this.mapToAvailabilityAlertData(alert);
  }

  async deleteAvailabilityAlert(id: string): Promise<void> {
    const existingAlert = await this.prisma.availabilityAlert.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingAlert) {
      throw new Error(`Availability alert with ID ${id} not found`);
    }

    await this.prisma.availabilityAlert.delete({
      where: { id },
    });
  }

  // Closure Notification methods
  async createClosureNotification(data: CreateClosureNotificationRequest): Promise<ClosureNotificationData> {
    // Validate closure exists
    const closure = await this.prisma.businessClosure.findUnique({
      where: { id: data.closureId },
      select: { id: true, isActive: true }
    });

    if (!closure || !closure.isActive) {
      throw new Error(`Business closure with ID ${data.closureId} not found or inactive`);
    }

    // Validate customer exists
    const customer = await this.prisma.user.findUnique({
      where: { id: data.customerId },
      select: { id: true, isActive: true }
    });

    if (!customer || !customer.isActive) {
      throw new Error(`Customer with ID ${data.customerId} not found or inactive`);
    }

    // Validate message
    if (!data.message.trim()) {
      throw new Error('Notification message cannot be empty');
    }

    const notification = await this.prisma.closureNotification.create({
      data: {
        id: `cn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        closureId: data.closureId,
        customerId: data.customerId,
        channel: data.channel,
        message: data.message,
        status: data.status || 'PENDING',
        createdAt: new Date(),
      },
    });

    return this.mapToClosureNotificationData(notification);
  }

  async findClosureNotificationsByClosure(closureId: string): Promise<ClosureNotificationData[]> {
    const notifications = await this.prisma.closureNotification.findMany({
      where: { closureId },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map(notification => this.mapToClosureNotificationData(notification));
  }

  async updateClosureNotificationStatus(
    id: string, 
    status: NotificationStatus, 
    errorMessage?: string
  ): Promise<ClosureNotificationData> {
    const existingNotification = await this.prisma.closureNotification.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingNotification) {
      throw new Error(`Closure notification with ID ${id} not found`);
    }

    const notification = await this.prisma.closureNotification.update({
      where: { id },
        data: {
          status,
          errorMessage,
          sentAt: status === 'SENT' ? new Date() : undefined
        },
    });

    return this.mapToClosureNotificationData(notification);
  }

  // Push Subscription methods
  async createPushSubscription(data: CreatePushSubscriptionRequest): Promise<PushSubscriptionData> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error(`User with ID ${data.userId} not found or inactive`);
    }

    // Validate endpoint URL
    if (!this.isValidEndpoint(data.endpoint)) {
      throw new Error('Invalid push subscription endpoint');
    }

    // Validate encryption keys
    if (!data.p256dh || !data.auth) {
      throw new Error('Push subscription encryption keys are required');
    }

    const subscription = await this.prisma.pushSubscription.create({
      data: {
        id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        deviceName: data.deviceName,
        deviceType: data.deviceType || 'web',
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });

    return this.mapToPushSubscriptionData(subscription);
  }

  async upsertPushSubscription(data: CreatePushSubscriptionRequest): Promise<PushSubscriptionData> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error(`User with ID ${data.userId} not found or inactive`);
    }

    // Validate endpoint URL
    if (!this.isValidEndpoint(data.endpoint)) {
      throw new Error('Invalid push subscription endpoint');
    }

    // Validate encryption keys
    if (!data.p256dh || !data.auth) {
      throw new Error('Push subscription encryption keys are required');
    }

    const subscription = await this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: data.userId,
          endpoint: data.endpoint,
        },
      },
      create: {
        id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        deviceName: data.deviceName,
        deviceType: data.deviceType || 'web',
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        deviceName: data.deviceName,
        deviceType: data.deviceType || 'web',
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      },
    });

    return this.mapToPushSubscriptionData(subscription);
  }

  async findPushSubscriptionsByUser(userId: string): Promise<PushSubscriptionData[]> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(subscription => this.mapToPushSubscriptionData(subscription));
  }

  async updatePushSubscriptionStatus(userId: string, endpoint: string, isActive: boolean): Promise<boolean> {
    const result = await this.prisma.pushSubscription.updateMany({
      where: {
        userId,
        endpoint
      },
      data: {
        isActive,
        updatedAt: new Date()
      }
    });
    return result.count > 0;
  }

  async deactivatePushSubscription(userId: string, subscriptionId?: string, endpoint?: string): Promise<boolean> {
    if (!subscriptionId && !endpoint) {
      throw new Error('Either endpoint or subscriptionId must be provided');
    }

    const where: { userId: string; id?: string; endpoint?: string } = { userId };
    
    if (subscriptionId) {
      where.id = subscriptionId;
    } else if (endpoint) {
      where.endpoint = endpoint;
    }

    const result = await this.prisma.pushSubscription.updateMany({
      where,
      data: { isActive: false, updatedAt: new Date() }
    });

    return result.count > 0;
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    const existingSubscription = await this.prisma.pushSubscription.findFirst({
      where: { userId, endpoint },
      select: { id: true }
    });

    if (!existingSubscription) {
      throw new Error(`Push subscription not found for user ${userId} with endpoint ${endpoint}`);
    }

    await this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }

  // Notification Preference methods
  async createNotificationPreference(data: CreateNotificationPreferenceRequest): Promise<NotificationPreferenceData> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error(`User with ID ${data.userId} not found or inactive`);
    }

    // Check for existing preference
    const existingPreference = await this.prisma.notificationPreference.findUnique({
      where: { userId: data.userId }
    });

    if (existingPreference) {
      throw new Error(`Notification preference already exists for user ${data.userId}`);
    }

    const preference = await this.prisma.notificationPreference.create({
      data: {
        id: `np_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        userId: data.userId,
        enableAppointmentReminders: data.appointmentReminders ?? true,
        enableBusinessNotifications: data.businessUpdates ?? true,
        enablePromotionalMessages: data.marketingMessages ?? false,
        reminderTiming: this.serializeReminderTiming(data.reminderTiming || { hours: [1, 24] }),
        preferredChannels: this.serializePreferredChannels(data.preferredChannels || { channels: this.getDefaultChannels(data) }),
        quietHours: data.quietHours ? this.serializeQuietHours(data.quietHours) : Prisma.JsonNull,
        timezone: data.timezone || 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });

    return this.mapToNotificationPreferenceData(preference);
  }

  async upsertNotificationPreference(data: CreateNotificationPreferenceRequest): Promise<NotificationPreferenceData> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error(`User with ID ${data.userId} not found or inactive`);
    }

    const preference = await this.prisma.notificationPreference.upsert({
      where: {
        userId: data.userId,
      },
      create: {
        id: `np_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        userId: data.userId,
        enableAppointmentReminders: data.appointmentReminders ?? true,
        enableBusinessNotifications: data.businessUpdates ?? true,
        enablePromotionalMessages: data.marketingMessages ?? false,
        reminderTiming: this.serializeReminderTiming(data.reminderTiming || { hours: [1, 24] }),
        preferredChannels: this.serializePreferredChannels(data.preferredChannels || { channels: this.getDefaultChannels(data) }),
        quietHours: data.quietHours ? this.serializeQuietHours(data.quietHours) : Prisma.JsonNull,
        timezone: data.timezone || 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        enableAppointmentReminders: data.appointmentReminders,
        enableBusinessNotifications: data.businessUpdates,
        enablePromotionalMessages: data.marketingMessages,
        reminderTiming: data.reminderTiming ? this.serializeReminderTiming(data.reminderTiming) : undefined,
        preferredChannels: data.preferredChannels ? this.serializePreferredChannels(data.preferredChannels) : undefined,
        quietHours: data.quietHours ? this.serializeQuietHours(data.quietHours) : undefined,
        timezone: data.timezone,
        updatedAt: new Date()
      },
    });

    return this.mapToNotificationPreferenceData(preference);
  }

  async findNotificationPreference(userId: string): Promise<NotificationPreferenceData | null> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId }
    });

    return preference ? this.mapToNotificationPreferenceData(preference) : null;
  }

  // Push Notification methods
  async createPushNotification(data: {
    subscriptionId: string;
    appointmentId?: string | null;
    businessId?: string | null;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: NotificationDataConfig | null;
    status: NotificationStatus;
  }): Promise<PushNotificationData> {
    // Validate subscription exists
    const subscription = await this.prisma.pushSubscription.findUnique({
      where: { id: data.subscriptionId },
      select: { id: true, isActive: true }
    });

    if (!subscription || !subscription.isActive) {
      throw new Error(`Push subscription with ID ${data.subscriptionId} not found or inactive`);
    }

    // Validate appointment exists if provided
    if (data.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        select: { id: true }
      });

      if (!appointment) {
        throw new Error(`Appointment with ID ${data.appointmentId} not found`);
      }
    }

    // Validate business exists if provided
    if (data.businessId) {
      const business = await this.prisma.business.findUnique({
        where: { id: data.businessId },
        select: { id: true, isActive: true }
      });

      if (!business || !business.isActive) {
        throw new Error(`Business with ID ${data.businessId} not found or inactive`);
      }
    }

    // Validate title and body
    if (!data.title.trim()) {
      throw new Error('Notification title cannot be empty');
    }

    if (!data.body.trim()) {
      throw new Error('Notification body cannot be empty');
    }

    const notification = await this.prisma.pushNotification.create({
      data: {
        id: `pn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        subscriptionId: data.subscriptionId,
        appointmentId: data.appointmentId,
        businessId: data.businessId,
        title: data.title,
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        data: data.data ? this.serializeNotificationData(data.data) : Prisma.JsonNull,
        status: data.status,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapToPushNotificationData(notification);
  }

  async updatePushNotificationStatus(
    id: string, 
    status: NotificationStatus, 
    errorMessage?: string
  ): Promise<PushNotificationData> {
    const existingNotification = await this.prisma.pushNotification.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingNotification) {
      throw new Error(`Push notification with ID ${id} not found`);
    }

    const notification = await this.prisma.pushNotification.update({
      where: { id },
      data: {
        status,
        errorMessage,
        sentAt: status === 'SENT' ? new Date() : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        updatedAt: new Date()
      },
    });

    return this.mapToPushNotificationData(notification);
  }

  async updatePushNotificationStatusBatch(
    ids: string[], 
    status: NotificationStatus, 
    errorMessage?: string
  ): Promise<void> {
    if (ids.length === 0) {
      throw new Error('No notification IDs provided');
    }

    await this.prisma.pushNotification.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        errorMessage,
        sentAt: status === 'SENT' ? new Date() : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        updatedAt: new Date()
      },
    });
  }

  async findPushNotificationsByUser(userId: string, options?: NotificationQueryOptions): Promise<PushNotificationData[]> {
    const page = options?.page || 1;
    const limit = Math.min(100, options?.limit || 20);
    const skip = (page - 1) * limit;

    const where: Prisma.PushNotificationWhereInput = {
      subscription: {
        userId
      }
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const notifications = await this.prisma.pushNotification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return notifications.map(notification => this.mapToPushNotificationData(notification));
  }

  async countPushNotificationsByUser(userId: string, options?: { status?: NotificationStatus }): Promise<number> {
    const where: Prisma.PushNotificationWhereInput = {
      subscription: {
        userId
      }
    };

    if (options?.status) {
      where.status = options.status;
    }

    return await this.prisma.pushNotification.count({ where });
  }

  async updatePushSubscriptionLastUsed(subscriptionId: string): Promise<void> {
    const existingSubscription = await this.prisma.pushSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true }
    });

    if (!existingSubscription) {
      throw new Error(`Push subscription with ID ${subscriptionId} not found`);
    }

    await this.prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: {
        lastUsedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async updatePushNotificationStatusBySubscription(subscriptionId: string, status: NotificationStatus, errorMessage?: string): Promise<void> {
    await this.prisma.pushNotification.updateMany({
      where: {
        subscriptionId,
        status: NotificationStatus.PENDING
      },
      data: {
        status,
        errorMessage,
        updatedAt: new Date()
      }
    });
  }

  async upsertUserNotificationPreference(userId: string, preferences: Partial<NotificationPreferenceData>): Promise<NotificationPreferenceData> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error(`User with ID ${userId} not found or inactive`);
    }

    const result = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        id: `pref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        userId,
        enableAppointmentReminders: preferences.enableAppointmentReminders ?? true,
        enableBusinessNotifications: preferences.enableBusinessNotifications ?? true,
        enablePromotionalMessages: preferences.enablePromotionalMessages ?? false,
        reminderTiming: this.serializeReminderTiming(preferences.reminderTiming ?? { hours: [1, 24] }),
        preferredChannels: this.serializePreferredChannels(preferences.preferredChannels ?? { channels: ['PUSH', 'SMS'] }),
        quietHours: preferences.quietHours ? this.serializeQuietHours(preferences.quietHours) : Prisma.JsonNull,
        timezone: preferences.timezone ?? 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        enableAppointmentReminders: preferences.enableAppointmentReminders,
        enableBusinessNotifications: preferences.enableBusinessNotifications,
        enablePromotionalMessages: preferences.enablePromotionalMessages,
        reminderTiming: preferences.reminderTiming ? this.serializeReminderTiming(preferences.reminderTiming) : undefined,
        preferredChannels: preferences.preferredChannels ? this.serializePreferredChannels(preferences.preferredChannels) : undefined,
        quietHours: preferences.quietHours ? this.serializeQuietHours(preferences.quietHours) : undefined,
        timezone: preferences.timezone,
        updatedAt: new Date()
      }
    });

    return this.mapToNotificationPreferenceData(result);
  }

  async getNotificationStats(userId?: string): Promise<NotificationStats> {
    const where: Prisma.PushNotificationWhereInput = {};
    
    if (userId) {
      where.subscription = { userId };
    }

    const [total, sent, pending, failed] = await Promise.all([
      this.prisma.pushNotification.count({ where }),
      this.prisma.pushNotification.count({ where: { ...where, status: 'SENT' } }),
      this.prisma.pushNotification.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.pushNotification.count({ where: { ...where, status: 'FAILED' } })
    ]);

    const deliveryRate = total > 0 ? (sent / total) * 100 : 0;

    return {
      totalNotifications: total,
      sentNotifications: sent,
      pendingNotifications: pending,
      failedNotifications: failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100
    };
  }

  // Helper methods for validation and serialization
  private isValidEndpoint(endpoint: string): boolean {
    try {
      new URL(endpoint);
      return endpoint.startsWith('https://');
    } catch {
      return false;
    }
  }

  private isValidNotificationPreferences(preferences: NotificationPreferencesConfig): boolean {
    if (!preferences.channels || preferences.channels.length === 0) {
      return false;
    }

    if (!preferences.timing || preferences.timing.length === 0) {
      return false;
    }

    return preferences.timing.every(t => t > 0 && Number.isInteger(t));
  }

  private getDefaultChannels(data: CreateNotificationPreferenceRequest): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    
    if (data.pushEnabled !== false) channels.push('PUSH');
    if (data.smsEnabled) channels.push('SMS');
    if (data.emailEnabled) channels.push('EMAIL');
    
    return channels.length > 0 ? channels : ['PUSH'];
  }

  private serializePreferredDates(dates: PreferredDatesConfig): Prisma.InputJsonValue {
    return dates as unknown as Prisma.InputJsonValue;
  }

  private serializeNotificationPreferences(preferences: NotificationPreferencesConfig): Prisma.InputJsonValue {
    return preferences as unknown as Prisma.InputJsonValue;
  }

  private serializeReminderTiming(timing: ReminderTimingConfig): Prisma.InputJsonValue {
    return timing as unknown as Prisma.InputJsonValue;
  }

  private serializePreferredChannels(channels: PreferredChannelsConfig): Prisma.InputJsonValue {
    return channels as unknown as Prisma.InputJsonValue;
  }

  private serializeQuietHours(quietHours: QuietHoursConfig): Prisma.InputJsonValue {
    return quietHours as unknown as Prisma.InputJsonValue;
  }

  private serializeNotificationData(data: NotificationDataConfig): Prisma.InputJsonValue {
    return data as unknown as Prisma.InputJsonValue;
  }

  private deserializePreferredDates(dates: Prisma.JsonValue): PreferredDatesConfig | null {
    if (!dates || typeof dates !== 'object') return null;
    return dates as unknown as PreferredDatesConfig;
  }

  private deserializeNotificationPreferences(preferences: Prisma.JsonValue): NotificationPreferencesConfig {
    if (!preferences || typeof preferences !== 'object') {
      return { channels: ['PUSH'], timing: [1, 24] };
    }
    return preferences as unknown as NotificationPreferencesConfig;
  }

  private deserializeReminderTiming(timing: Prisma.JsonValue): ReminderTimingConfig {
    if (!timing || typeof timing !== 'object') {
      return { hours: [1, 24] };
    }
    return timing as unknown as ReminderTimingConfig;
  }

  private deserializePreferredChannels(channels: Prisma.JsonValue): PreferredChannelsConfig {
    if (!channels || typeof channels !== 'object') {
      return { channels: ['PUSH'] };
    }
    return channels as unknown as PreferredChannelsConfig;
  }

  private deserializeQuietHours(quietHours: Prisma.JsonValue): QuietHoursConfig | null {
    if (!quietHours || typeof quietHours !== 'object') return null;
    return quietHours as unknown as QuietHoursConfig;
  }

  private deserializeNotificationData(data: Prisma.JsonValue): NotificationDataConfig | null {
    if (!data || typeof data !== 'object') return null;
    return data as unknown as NotificationDataConfig;
  }

  // Mapping methods
  private mapToAvailabilityAlertData(alert: AvailabilityAlert): AvailabilityAlertData {
    return {
      id: alert.id,
      customerId: alert.customerId,
      businessId: alert.businessId,
      serviceId: alert.serviceId,
      preferredDates: this.deserializePreferredDates(alert.preferredDates),
      notificationPreferences: this.deserializeNotificationPreferences(alert.notificationPreferences),
      isActive: alert.isActive,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  private mapToClosureNotificationData(notification: ClosureNotification): ClosureNotificationData {
    return {
      id: notification.id,
      closureId: notification.closureId,
      customerId: notification.customerId,
      channel: notification.channel,
      message: notification.message,
      sentAt: notification.sentAt,
      status: notification.status,
      errorMessage: notification.errorMessage,
      createdAt: notification.createdAt,
    };
  }

  private mapToPushSubscriptionData(subscription: PushSubscription): PushSubscriptionData {
    return {
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      deviceName: subscription.deviceName,
      deviceType: subscription.deviceType,
      userAgent: subscription.userAgent,
      isActive: subscription.isActive,
      lastUsedAt: subscription.lastUsedAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  private mapToNotificationPreferenceData(preference: NotificationPreference): NotificationPreferenceData {
    return {
      id: preference.id,
      userId: preference.userId,
      enableAppointmentReminders: preference.enableAppointmentReminders,
      enableBusinessNotifications: preference.enableBusinessNotifications,
      enablePromotionalMessages: preference.enablePromotionalMessages,
      reminderTiming: this.deserializeReminderTiming(preference.reminderTiming),
      preferredChannels: this.deserializePreferredChannels(preference.preferredChannels),
      quietHours: this.deserializeQuietHours(preference.quietHours),
      timezone: preference.timezone,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }

  private mapToPushNotificationData(notification: PushNotification): PushNotificationData {
    return {
      id: notification.id,
      subscriptionId: notification.subscriptionId,
      appointmentId: notification.appointmentId,
      businessId: notification.businessId,
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: this.deserializeNotificationData(notification.data),
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      status: notification.status,
      errorMessage: notification.errorMessage,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}