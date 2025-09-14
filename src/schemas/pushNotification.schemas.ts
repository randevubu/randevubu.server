import { z } from 'zod';
import { NotificationChannel } from '../types/business';

// Push Subscription Schema
export const pushSubscriptionRequestSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'Auth key is required'),
  }),
  deviceName: z.string().optional(),
  deviceType: z.string().optional(),
  userAgent: z.string().optional(),
});

export const unsubscribePushRequestSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL').optional(),
  subscriptionId: z.string().optional(),
}).refine(
  (data) => data.endpoint || data.subscriptionId,
  'Either endpoint or subscriptionId must be provided'
);

// Notification Preference Schema
export const notificationPreferenceRequestSchema = z.object({
  enableAppointmentReminders: z.boolean().optional(),
  enableBusinessNotifications: z.boolean().optional(),
  enablePromotionalMessages: z.boolean().optional(),
  reminderTiming: z.object({
    hours: z.array(z.number().min(1).max(168)).min(1, 'At least one reminder hour is required'),
  }).optional(),
  preferredChannels: z.object({
    channels: z.array(z.nativeEnum(NotificationChannel)).min(1, 'At least one channel is required'),
  }).optional(),
  quietHours: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    timezone: z.string(),
  }).optional(),
  timezone: z.string().optional(),
});

// Send Push Notification Schema
export const sendPushNotificationRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  appointmentId: z.string().optional(),
  businessId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(500, 'Body too long'),
  icon: z.string().url('Invalid icon URL').optional(),
  badge: z.string().url('Invalid badge URL').optional(),
  data: z.record(z.any()).optional(),
  url: z.string().url('Invalid URL').optional(),
});

// Test Push Notification Schema
export const testPushNotificationRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(500, 'Body too long'),
  icon: z.string().url('Invalid icon URL').optional(),
  badge: z.string().url('Invalid badge URL').optional(),
  data: z.record(z.any()).optional(),
  url: z.string().url('Invalid URL').optional(),
});

// Batch Send Schema
export const batchSendPushNotificationRequestSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(500, 'Body too long'),
  icon: z.string().url('Invalid icon URL').optional(),
  badge: z.string().url('Invalid badge URL').optional(),
  data: z.record(z.any()).optional(),
  url: z.string().url('Invalid URL').optional(),
});

// Get Notifications Query Schema
export const getNotificationsQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ']).optional(),
  appointmentId: z.string().optional(),
  businessId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).transform((data) => ({
  ...data,
  page: Math.max(1, data.page),
  limit: Math.min(100, Math.max(1, data.limit)),
}));

export type PushSubscriptionRequestData = z.infer<typeof pushSubscriptionRequestSchema>;
export type UnsubscribePushRequestData = z.infer<typeof unsubscribePushRequestSchema>;
export type NotificationPreferenceRequestData = z.infer<typeof notificationPreferenceRequestSchema>;
export type SendPushNotificationRequestData = z.infer<typeof sendPushNotificationRequestSchema>;
export type TestPushNotificationRequestData = z.infer<typeof testPushNotificationRequestSchema>;
export type BatchSendPushNotificationRequestData = z.infer<typeof batchSendPushNotificationRequestSchema>;
export type GetNotificationsQueryData = z.infer<typeof getNotificationsQuerySchema>;