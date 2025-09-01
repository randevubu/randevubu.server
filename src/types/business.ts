// Business Domain Types - Enterprise Architecture
export interface BusinessTypeData {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessData {
  id: string;
  ownerId: string;
  businessTypeId: string;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  businessHours?: any;
  timezone: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  theme?: any;
  settings?: any;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  isClosed: boolean;
  closedUntil?: Date;
  closureReason?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface BusinessStaffData {
  id: string;
  businessId: string;
  userId: string;
  role: BusinessStaffRole;
  permissions?: any;
  isActive: boolean;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceData {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  pricing?: any;
  bufferTime: number;
  maxAdvanceBooking: number;
  minAdvanceBooking: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentData {
  id: string;
  businessId: string;
  serviceId: string;
  staffId?: string;
  customerId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: AppointmentStatus;
  price: number;
  currency: string;
  customerNotes?: string;
  internalNotes?: string;
  bookedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  reminderSent: boolean;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBehaviorData {
  id: string;
  userId: string;
  totalAppointments: number;
  canceledAppointments: number;
  noShowAppointments: number;
  completedAppointments: number;
  lastCancelDate?: Date;
  cancelationsThisMonth: number;
  cancelationsThisWeek: number;
  lastNoShowDate?: Date;
  noShowsThisMonth: number;
  noShowsThisWeek: number;
  isBanned: boolean;
  bannedUntil?: Date;
  banReason?: string;
  banCount: number;
  currentStrikes: number;
  lastStrikeDate?: Date;
  strikeResetDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessClosureData {
  id: string;
  businessId: string;
  startDate: Date;
  endDate?: Date;
  reason: string;
  type: ClosureType;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Enhanced features
  notifyCustomers: boolean;
  notificationMessage?: string;
  notificationChannels?: NotificationChannel[];
  affectedServices?: string[];
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  createdAppointmentsCount: number;
  notifiedCustomersCount: number;
}

export interface BusinessImageData {
  id: string;
  businessId: string;
  s3Url: string;
  s3Key: string;
  alt?: string;
  type: string;
  sortOrder: number;
  isActive: boolean;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
}

export interface SubscriptionPlanData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  price: number;
  currency: string;
  billingInterval: string;
  maxBusinesses: number;
  maxStaffPerBusiness: number;
  maxAppointmentsPerDay: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessSubscriptionData {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  autoRenewal: boolean;
  paymentMethodId?: string;
  nextBillingDate?: Date;
  failedPaymentCount: number;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredPaymentMethodData {
  id: string;
  businessId: string;
  cardHolderName: string;
  lastFourDigits: string;
  cardBrand?: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  isActive: boolean;
  providerToken?: string;
  providerCardId?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Enums
export enum BusinessStaffRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  RECEPTIONIST = 'RECEPTIONIST'
}

export enum AppointmentStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  NO_SHOW = 'NO_SHOW'
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED'
}

export enum ClosureType {
  VACATION = 'VACATION',
  MAINTENANCE = 'MAINTENANCE',
  EMERGENCY = 'EMERGENCY',
  HOLIDAY = 'HOLIDAY',
  STAFF_SHORTAGE = 'STAFF_SHORTAGE',
  OTHER = 'OTHER'
}

// Request/Response Types
export interface CreateBusinessRequest {
  name: string;
  businessTypeId: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  primaryColor?: string;
  tags?: string[];
}

export interface UpdateBusinessRequest {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  businessHours?: any;
  timezone?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  theme?: any;
  settings?: any;
  tags?: string[];
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  bufferTime?: number;
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
  sortOrder?: number;
  bufferTime?: number;
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
}

export interface CreateAppointmentRequest {
  businessId: string;
  serviceId: string;
  staffId?: string;
  date: string;
  startTime: string;
  customerNotes?: string;
}

export interface UpdateAppointmentRequest {
  date?: string;
  startTime?: string;
  status?: AppointmentStatus;
  customerNotes?: string;
  internalNotes?: string;
  cancelReason?: string;
}

export interface AddStaffRequest {
  userId: string;
  role: BusinessStaffRole;
  permissions?: any;
}

export interface UpdateStaffRequest {
  role?: BusinessStaffRole;
  permissions?: any;
  isActive?: boolean;
}

export interface CreateBusinessClosureRequest {
  startDate: string;
  endDate?: string;
  reason: string;
  type: ClosureType;
  // Enhanced features
  notifyCustomers?: boolean;
  notificationMessage?: string;
  notificationChannels?: NotificationChannel[];
  affectedServices?: string[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

export interface UpdateBusinessClosureRequest {
  startDate?: string;
  endDate?: string;
  reason?: string;
  type?: ClosureType;
  isActive?: boolean;
  // Enhanced features
  notifyCustomers?: boolean;
  notificationMessage?: string;
  notificationChannels?: NotificationChannel[];
  affectedServices?: string[];
  recurringPattern?: RecurringPattern;
}

export interface SubscribeBusinessRequest {
  planId: string;
  paymentMethodId?: string;
}

export interface BusinessSearchFilters {
  businessTypeId?: string;
  category?: string;
  city?: string;
  state?: string;
  country?: string;
  tags?: string[];
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
}

export interface AppointmentSearchFilters {
  businessId?: string;
  serviceId?: string;
  staffId?: string;
  customerId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}

// Analytics Types
export interface BusinessAnalytics {
  totalAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number;
  averageAppointmentValue: number;
  appointmentsByStatus: Record<AppointmentStatus, number>;
  appointmentsByService: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
    revenue: number;
  }>;
  appointmentsByStaff: Array<{
    staffId: string;
    staffName: string;
    count: number;
    revenue: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    appointments: number;
    revenue: number;
  }>;
}

export interface UserBehaviorSummary {
  userId: string;
  completionRate: number; // percentage
  cancellationRate: number; // percentage
  noShowRate: number; // percentage
  reliabilityScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  strikes: number;
  isBanned: boolean;
  lastActivity: Date;
}

// Service Layer Types
export interface BusinessWithDetails extends BusinessData {
  businessType: BusinessTypeData;
  staff: BusinessStaffData[];
  services: ServiceData[];
  subscription?: BusinessSubscriptionData & {
    plan: SubscriptionPlanData;
  };
}

export interface AppointmentWithDetails extends AppointmentData {
  business: BusinessData;
  service: ServiceData;
  staff?: BusinessStaffData & {
    user: {
      firstName?: string;
      lastName?: string;
    };
  };
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
  };
}

// Enhanced Closure System Types
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export enum CustomerResponse {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  NO_RESPONSE = 'NO_RESPONSE'
}

export interface RecurringPattern {
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[]; // For weekly patterns
  dayOfMonth?: number; // For monthly patterns
  monthOfYear?: number; // For yearly patterns
}

export interface EnhancedClosureData {
  id: string;
  businessId: string;
  businessName: string;
  startDate: Date;
  endDate?: Date;
  reason: string;
  type: ClosureType;
  message?: string;
  notifyCustomers: boolean;
  notificationChannels: NotificationChannel[];
  affectedServices?: string[];
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
}

export interface ClosureNotificationData {
  id: string;
  closureId: string;
  customerId: string;
  channel: NotificationChannel;
  message: string;
  sentAt?: Date;
  status: NotificationStatus;
  errorMessage?: string;
  createdAt: Date;
}

export interface AvailabilityAlertData {
  id: string;
  customerId: string;
  businessId: string;
  serviceId?: string;
  preferredDates?: Array<{ startDate: Date; endDate: Date }>;
  notificationPreferences: {
    channels: NotificationChannel[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RescheduleSuggestionData {
  id: string;
  originalAppointmentId: string;
  closureId: string;
  suggestedDates: Array<{
    startTime: Date;
    endTime: Date;
    serviceId?: string;
    staffId?: string;
  }>;
  customerResponse?: CustomerResponse;
  responseAt?: Date;
  createdAt: Date;
}

export interface ClosureAnalytics {
  totalClosures: number;
  closuresByType: Record<ClosureType, number>;
  averageClosureDuration: number;
  totalClosureHours: number;
  affectedAppointments: number;
  estimatedRevenueLoss: number;
  customerImpact: {
    totalAffectedCustomers: number;
    notificationsSent: number;
    rescheduledAppointments: number;
    canceledAppointments: number;
  };
  monthlyTrend: Array<{
    month: string;
    year: number;
    closures: number;
    hours: number;
    revenue: number;
  }>;
}

export interface CustomerImpactReport {
  closureId: string;
  businessId: string;
  businessName: string;
  startDate: Date;
  endDate?: Date;
  totalAffectedAppointments: number;
  affectedCustomers: Array<{
    customerId: string;
    customerName: string;
    appointmentCount: number;
    totalValue: number;
    notificationStatus: string;
    rescheduleStatus: string;
  }>;
  notificationStats: {
    total: number;
    sent: number;
    failed: number;
    channels: Record<string, number>;
  };
}

export interface RevenueImpact {
  directRevenueLoss: number;
  potentialRevenueLoss: number;
  rescheduledRevenue: number;
  netRevenueLoss: number;
  impactPercentage: number;
  comparisonWithPreviousPeriod: {
    previousLoss: number;
    changePercentage: number;
  };
}

// Request/Response Types for Enhanced Closure System
export interface CreateEnhancedClosureRequest {
  startDate: string;
  endDate?: string;
  reason: string;
  type: ClosureType;
  notifyCustomers: boolean;
  notificationMessage?: string;
  notificationChannels: NotificationChannel[];
  affectedServices?: string[];
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
}

export interface NotificationRequest {
  closureId: string;
  channels: NotificationChannel[];
  message: string;
  customTemplate?: string;
}

export interface AvailabilityAlertRequest {
  customerId: string;
  businessId: string;
  serviceId?: string;
  preferredDates: Array<{ startDate: string; endDate: string }>;
  notificationChannels: NotificationChannel[];
}

export interface RescheduleOptionsRequest {
  autoReschedule: boolean;
  maxRescheduleDays: number;
  preferredTimeSlots: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';
  notifyCustomers: boolean;
  allowWeekends: boolean;
}

export interface ClosureAnalyticsRequest {
  period: string;
  metrics: Array<'FREQUENCY' | 'REVENUE_IMPACT' | 'CUSTOMER_IMPACT'>;
}

export interface ClosureStatusResponse {
  businessId: string;
  date: string;
  isClosed: boolean;
  closure?: BusinessClosureData;
  upcomingClosures?: BusinessClosureData[];
}

// Enhanced Business Types
export interface BusinessWithClosureDetails extends BusinessData {
  closures: BusinessClosureData[];
  upcomingClosures: BusinessClosureData[];
  currentClosure?: BusinessClosureData;
}

export interface BusinessWithServices {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  businessHours: any;
  timezone: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  isVerified: boolean;
  isClosed: boolean;
  tags: string[];
  businessType: {
    id: string;
    name: string;
    displayName: string;
    icon: string | null;
    category: string;
  };
  services: {
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    currency: string;
    isActive: boolean;
  }[];
}