// Notification Domain Types
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status: NotificationStatus;
  channel: NotificationChannel;
}

export interface EnhancedClosureData {
  id: string;
  businessId: string;
  businessName: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  message?: string;
  type: 'TEMPORARY' | 'PERMANENT' | 'RESCHEDULE';
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  };
  affectedAppointments: number;
  rescheduledAppointments: number;
  cancelledAppointments: number;
  totalRevenueImpact: number;
}

export interface SecureNotificationRequest {
  businessId: string;
  userId: string;
  title: string;
  message: string;
  body: string;
  data?: any;
  notificationType: string;
  recipientIds: string[];
  channels: NotificationChannel[];
  targetAudience: {
    type: 'ALL_CUSTOMERS' | 'SPECIFIC_CUSTOMERS' | 'STAFF_ONLY';
    customerIds?: string[];
    staffIds?: string[];
  };
  scheduling?: {
    sendAt?: Date;
    timezone?: string;
  };
  metadata?: {
    ipAddress?: string;
    [key: string]: unknown;
  };
}

export interface SecureNotificationResult {
  success: boolean;
  messageId: string;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  invalidRecipients: number;
  channels: {
    channel: NotificationChannel;
    sent: number;
    failed: number;
  }[];
  errors?: Array<{
    recipientId: string;
    error: string;
    errorCode: string;
  }>;
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}


