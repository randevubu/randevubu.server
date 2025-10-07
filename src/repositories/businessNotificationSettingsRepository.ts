import { PrismaClient, BusinessNotificationSettings, Prisma } from '@prisma/client';

export interface BusinessNotificationSettingsData {
  id: string;
  businessId: string;
  enableAppointmentReminders: boolean;
  reminderChannels: string[];
  reminderTiming: number[];
  smsEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHours?: QuietHoursConfig | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  days: number[]; // 0-6 (Sunday-Saturday)
  timezone?: string;
}

export interface CreateBusinessNotificationSettingsRequest {
  businessId: string;
  enableAppointmentReminders?: boolean;
  reminderChannels?: string[];
  reminderTiming?: number[];
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  quietHours?: QuietHoursConfig;
  timezone?: string;
}

export interface UpdateBusinessNotificationSettingsRequest {
  enableAppointmentReminders?: boolean;
  reminderChannels?: string[];
  reminderTiming?: number[];
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  quietHours?: QuietHoursConfig;
  timezone?: string;
}

export interface NotificationChannelSettings {
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
}

export interface ReminderSettingsUpdate {
  enableReminders: boolean;
  channels: string[];
  timing: number[];
}

export interface NotificationSettingsQueryOptions {
  includeInactive?: boolean;
  timezone?: string;
  channel?: 'SMS' | 'PUSH' | 'EMAIL';
  limit?: number;
  offset?: number;
}

export class BusinessNotificationSettingsRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateBusinessNotificationSettingsRequest): Promise<BusinessNotificationSettingsData> {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true }
    });

    if (!business) {
      throw new Error(`Business with ID ${data.businessId} not found`);
    }

    // Check if settings already exist
    const existingSettings = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId: data.businessId }
    });

    if (existingSettings) {
      throw new Error(`Notification settings already exist for business ${data.businessId}`);
    }

    // Validate timezone
    if (data.timezone && !this.isValidTimezone(data.timezone)) {
      throw new Error(`Invalid timezone: ${data.timezone}`);
    }

    // Validate reminder timing
    if (data.reminderTiming && !this.isValidReminderTiming(data.reminderTiming)) {
      throw new Error('Invalid reminder timing. Must be positive numbers in minutes.');
    }

    // Validate quiet hours
    if (data.quietHours && !this.isValidQuietHours(data.quietHours)) {
      throw new Error('Invalid quiet hours configuration');
    }

    const settings = await this.prisma.businessNotificationSettings.create({
      data: {
        id: `bns_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: data.businessId,
        enableAppointmentReminders: data.enableAppointmentReminders ?? true,
        reminderChannels: data.reminderChannels ?? ['PUSH'],
        reminderTiming: data.reminderTiming ?? [60, 1440], // 1 hour and 24 hours
        smsEnabled: data.smsEnabled ?? false,
        pushEnabled: data.pushEnabled ?? true,
        emailEnabled: data.emailEnabled ?? false,
        quietHours: data.quietHours ? this.serializeQuietHours(data.quietHours) : Prisma.JsonNull,
        timezone: data.timezone ?? 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToSettingsData(settings);
  }

  async findByBusinessId(businessId: string): Promise<BusinessNotificationSettingsData | null> {
    const settings = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId },
    });

    return settings ? this.mapToSettingsData(settings) : null;
  }

  async findById(id: string): Promise<BusinessNotificationSettingsData | null> {
    const settings = await this.prisma.businessNotificationSettings.findUnique({
      where: { id },
    });

    return settings ? this.mapToSettingsData(settings) : null;
  }

  async update(businessId: string, data: UpdateBusinessNotificationSettingsRequest): Promise<BusinessNotificationSettingsData> {
    // Check if settings exist
    const existingSettings = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId },
      select: { id: true }
    });

    if (!existingSettings) {
      throw new Error(`Notification settings not found for business ${businessId}`);
    }

    // Validate timezone if provided
    if (data.timezone && !this.isValidTimezone(data.timezone)) {
      throw new Error(`Invalid timezone: ${data.timezone}`);
    }

    // Validate reminder timing if provided
    if (data.reminderTiming && !this.isValidReminderTiming(data.reminderTiming)) {
      throw new Error('Invalid reminder timing. Must be positive numbers in minutes.');
    }

    // Validate quiet hours if provided
    if (data.quietHours && !this.isValidQuietHours(data.quietHours)) {
      throw new Error('Invalid quiet hours configuration');
    }

    const { quietHours, ...updateData } = data;
    const settings = await this.prisma.businessNotificationSettings.update({
      where: { businessId },
      data: {
        ...updateData,
        quietHours: quietHours !== undefined ? this.serializeQuietHours(quietHours) : undefined,
        updatedAt: new Date(),
      },
    });

    return this.mapToSettingsData(settings);
  }

  async upsert(data: CreateBusinessNotificationSettingsRequest): Promise<BusinessNotificationSettingsData> {
    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: data.businessId },
      select: { id: true }
    });

    if (!business) {
      throw new Error(`Business with ID ${data.businessId} not found`);
    }

    // Validate timezone
    if (data.timezone && !this.isValidTimezone(data.timezone)) {
      throw new Error(`Invalid timezone: ${data.timezone}`);
    }

    // Validate reminder timing
    if (data.reminderTiming && !this.isValidReminderTiming(data.reminderTiming)) {
      throw new Error('Invalid reminder timing. Must be positive numbers in minutes.');
    }

    // Validate quiet hours
    if (data.quietHours && !this.isValidQuietHours(data.quietHours)) {
      throw new Error('Invalid quiet hours configuration');
    }

    const settings = await this.prisma.businessNotificationSettings.upsert({
      where: { businessId: data.businessId },
      create: {
        id: `bns_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        businessId: data.businessId,
        enableAppointmentReminders: data.enableAppointmentReminders ?? true,
        reminderChannels: data.reminderChannels ?? ['PUSH'],
        reminderTiming: data.reminderTiming ?? [60, 1440],
        smsEnabled: data.smsEnabled ?? false,
        pushEnabled: data.pushEnabled ?? true,
        emailEnabled: data.emailEnabled ?? false,
        quietHours: data.quietHours ? this.serializeQuietHours(data.quietHours) : Prisma.JsonNull,
        timezone: data.timezone ?? 'Europe/Istanbul',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        enableAppointmentReminders: data.enableAppointmentReminders,
        reminderChannels: data.reminderChannels,
        reminderTiming: data.reminderTiming,
        smsEnabled: data.smsEnabled,
        pushEnabled: data.pushEnabled,
        emailEnabled: data.emailEnabled,
        quietHours: data.quietHours ? this.serializeQuietHours(data.quietHours) : Prisma.JsonNull,
        timezone: data.timezone,
        updatedAt: new Date(),
      },
    });

    return this.mapToSettingsData(settings);
  }

  async delete(businessId: string): Promise<void> {
    const existingSettings = await this.prisma.businessNotificationSettings.findUnique({
      where: { businessId },
      select: { id: true }
    });

    if (!existingSettings) {
      throw new Error(`Notification settings not found for business ${businessId}`);
    }

    await this.prisma.businessNotificationSettings.delete({
      where: { businessId },
    });
  }

  async deleteById(id: string): Promise<void> {
    const existingSettings = await this.prisma.businessNotificationSettings.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingSettings) {
      throw new Error(`Notification settings with ID ${id} not found`);
    }

    await this.prisma.businessNotificationSettings.delete({
      where: { id },
    });
  }

  async findManyByChannel(channel: 'SMS' | 'PUSH' | 'EMAIL'): Promise<BusinessNotificationSettingsData[]> {
    const settings = await this.prisma.businessNotificationSettings.findMany({
      where: {
        OR: [
          { smsEnabled: channel === 'SMS' },
          { pushEnabled: channel === 'PUSH' },
          { emailEnabled: channel === 'EMAIL' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    return settings.map(settings => this.mapToSettingsData(settings));
  }

  async findActiveReminderSettings(): Promise<BusinessNotificationSettingsData[]> {
    const settings = await this.prisma.businessNotificationSettings.findMany({
      where: {
        enableAppointmentReminders: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return settings.map(settings => this.mapToSettingsData(settings));
  }

  async getSettingsByTimezone(timezone: string): Promise<BusinessNotificationSettingsData[]> {
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const settings = await this.prisma.businessNotificationSettings.findMany({
      where: { timezone },
      orderBy: { createdAt: 'asc' },
    });

    return settings.map(settings => this.mapToSettingsData(settings));
  }

  async updateReminderSettings(
    businessId: string,
    enableReminders: boolean,
    channels: string[],
    timing: number[]
  ): Promise<BusinessNotificationSettingsData> {
    // Validate channels
    if (!this.isValidChannels(channels)) {
      throw new Error('Invalid reminder channels. Must be SMS, PUSH, or EMAIL.');
    }

    // Validate timing
    if (!this.isValidReminderTiming(timing)) {
      throw new Error('Invalid reminder timing. Must be positive numbers in minutes.');
    }

    const settings = await this.prisma.businessNotificationSettings.update({
      where: { businessId },
      data: {
        enableAppointmentReminders: enableReminders,
        reminderChannels: channels,
        reminderTiming: timing,
        updatedAt: new Date(),
      },
    });

    return this.mapToSettingsData(settings);
  }

  async updateChannelSettings(
    businessId: string,
    channelSettings: NotificationChannelSettings
  ): Promise<BusinessNotificationSettingsData> {
    const settings = await this.prisma.businessNotificationSettings.update({
      where: { businessId },
      data: {
        ...channelSettings,
        updatedAt: new Date(),
      },
    });

    return this.mapToSettingsData(settings);
  }

  async setQuietHours(businessId: string, quietHours: QuietHoursConfig): Promise<BusinessNotificationSettingsData> {
    if (!this.isValidQuietHours(quietHours)) {
      throw new Error('Invalid quiet hours configuration');
    }

    const settings = await this.prisma.businessNotificationSettings.update({
      where: { businessId },
      data: {
        quietHours: this.serializeQuietHours(quietHours),
        updatedAt: new Date(),
      },
    });

    return this.mapToSettingsData(settings);
  }

  async findSettingsWithQuietHours(): Promise<BusinessNotificationSettingsData[]> {
    const settings = await this.prisma.businessNotificationSettings.findMany({
      where: {
        quietHours: { not: Prisma.JsonNull }
      },
      orderBy: { createdAt: 'asc' },
    });

    return settings.map(settings => this.mapToSettingsData(settings));
  }

  async getSettingsForReminderProcessing(): Promise<BusinessNotificationSettingsData[]> {
    const settings = await this.prisma.businessNotificationSettings.findMany({
      where: {
        enableAppointmentReminders: true,
        OR: [
          { smsEnabled: true },
          { pushEnabled: true },
          { emailEnabled: true }
        ]
      },
      orderBy: { createdAt: 'asc' },
    });

    return settings.map(settings => this.mapToSettingsData(settings));
  }

  async bulkUpdateChannelSettings(
    businessIds: string[],
    channelSettings: NotificationChannelSettings
  ): Promise<number> {
    const result = await this.prisma.businessNotificationSettings.updateMany({
      where: {
        businessId: { in: businessIds }
      },
      data: {
        ...channelSettings,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async getNotificationStats(): Promise<{
    totalSettings: number;
    activeReminders: number;
    smsEnabled: number;
    pushEnabled: number;
    emailEnabled: number;
    withQuietHours: number;
  }> {
    const [
      totalSettings,
      activeReminders,
      smsEnabled,
      pushEnabled,
      emailEnabled,
      withQuietHours
    ] = await Promise.all([
      this.prisma.businessNotificationSettings.count(),
      this.prisma.businessNotificationSettings.count({
        where: { enableAppointmentReminders: true }
      }),
      this.prisma.businessNotificationSettings.count({
        where: { smsEnabled: true }
      }),
      this.prisma.businessNotificationSettings.count({
        where: { pushEnabled: true }
      }),
      this.prisma.businessNotificationSettings.count({
        where: { emailEnabled: true }
      }),
      this.prisma.businessNotificationSettings.count({
        where: { quietHours: { not: Prisma.JsonNull } }
      })
    ]);

    return {
      totalSettings,
      activeReminders,
      smsEnabled,
      pushEnabled,
      emailEnabled,
      withQuietHours
    };
  }

  // Helper methods for validation and serialization
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private isValidReminderTiming(timing: number[]): boolean {
    return timing.every(t => t > 0 && Number.isInteger(t));
  }

  private isValidChannels(channels: string[]): boolean {
    const validChannels = ['SMS', 'PUSH', 'EMAIL'];
    return channels.every(channel => validChannels.includes(channel));
  }

  private isValidQuietHours(quietHours: QuietHoursConfig): boolean {
    if (!quietHours.enabled) return true;
    
    // Validate time format (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(quietHours.startTime) || !timeRegex.test(quietHours.endTime)) {
      return false;
    }

    // Validate days (0-6)
    if (!quietHours.days.every(day => day >= 0 && day <= 6)) {
      return false;
    }

    return true;
  }

  private serializeQuietHours(quietHours: QuietHoursConfig): Prisma.InputJsonValue {
    return quietHours as unknown as Prisma.InputJsonValue;
  }

  private deserializeQuietHours(quietHours: Prisma.JsonValue): QuietHoursConfig | null {
    if (!quietHours || typeof quietHours !== 'object') {
      return null;
    }

    const config = quietHours as Record<string, unknown>;
    
    if (typeof config.enabled !== 'boolean' ||
        typeof config.startTime !== 'string' ||
        typeof config.endTime !== 'string' ||
        !Array.isArray(config.days)) {
      return null;
    }

    return {
      enabled: config.enabled,
      startTime: config.startTime,
      endTime: config.endTime,
      days: config.days as number[],
      timezone: typeof config.timezone === 'string' ? config.timezone : undefined
    };
  }

  private mapToSettingsData(settings: BusinessNotificationSettings): BusinessNotificationSettingsData {
    return {
      id: settings.id,
      businessId: settings.businessId,
      enableAppointmentReminders: settings.enableAppointmentReminders,
      reminderChannels: settings.reminderChannels as string[],
      reminderTiming: settings.reminderTiming as number[],
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      emailEnabled: settings.emailEnabled,
      quietHours: this.deserializeQuietHours(settings.quietHours),
      timezone: settings.timezone,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}