// Business Domain Types - Enterprise Architecture
export interface BusinessTypeData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
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
  category?: string;
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
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
export enum BusinessStaffRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  RECEPTIONIST = 'RECEPTIONIST'
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
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
  category?: string;
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
  category?: string;
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
}

export interface UpdateBusinessClosureRequest {
  startDate?: string;
  endDate?: string;
  reason?: string;
  type?: ClosureType;
  isActive?: boolean;
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