import { VerificationPurpose, AuditAction } from '@prisma/client';
import { Request } from 'express';

// Core Authentication Types
export interface UserProfile {
  id: string;
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  timezone?: string | null;
  language?: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

export interface UserSecurity {
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
}

export interface DeviceInfo {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Token Types
export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  tokenValue?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  token: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  deviceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  lastUsedAt: Date;
}

// Verification Types
export interface PhoneVerificationData {
  id: string;
  userId?: string | null;
  phoneNumber: string;
  code: string;
  purpose: VerificationPurpose;
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  attemptsRemaining?: number;
}

// Service Layer Types
export interface CreateUserData {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface LoginResult {
  user: UserProfile;
  tokens: TokenPair;
  isNewUser: boolean;
}

// Repository Layer Types
export interface UserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<(UserProfile & UserSecurity) | null>;
  findById(id: string): Promise<UserProfile | null>;
  create(data: CreateUserData): Promise<UserProfile>;
  update(id: string, data: Partial<UpdateUserData>): Promise<UserProfile>;
  updateSecurity(id: string, data: Partial<UserSecurity>): Promise<void>;
  deactivate(id: string): Promise<void>;
  getUserStats(): Promise<UserStats>;
}

export interface PhoneVerificationRepository {
  create(data: Omit<PhoneVerificationData, 'id' | 'createdAt'>): Promise<PhoneVerificationData>;
  findLatest(phoneNumber: string, purpose: VerificationPurpose): Promise<PhoneVerificationData | null>;
  update(id: string, data: Partial<Pick<PhoneVerificationData, 'attempts' | 'isUsed'>>): Promise<void>;
  cleanup(): Promise<number>;
  getStats(phoneNumber?: string, purpose?: VerificationPurpose): Promise<VerificationStats>;
  countDailyRequests(phoneNumber: string, ipAddress?: string): Promise<{ phoneCount: number; ipCount: number }>;
}

export interface RefreshTokenRepository {
  create(data: Omit<RefreshTokenData, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<RefreshTokenData>;
  findByToken(token: string): Promise<RefreshTokenData | null>;
  update(id: string, data: Partial<Pick<RefreshTokenData, 'isRevoked' | 'lastUsedAt'>>): Promise<void>;
  revokeByToken(token: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
  cleanup(): Promise<number>;
}

export interface AuditLogRepository {
  create(data: CreateAuditLogData): Promise<void>;
}

// Audit Types
export interface CreateAuditLogData {
  userId?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Statistics Types
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersToday: number;
  verificationRate: string;
}

export interface VerificationStats {
  total: number;
  successful: number;
  expired: number;
  failed: number;
  successRate: string;
}

// Request/Response Types
export interface SendVerificationRequest {
  phoneNumber: string;
  purpose?: VerificationPurpose;
}

export interface VerifyLoginRequest {
  phoneNumber: string;
  verificationCode: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface ChangePhoneRequest {
  newPhoneNumber: string;
  verificationCode: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Error Types
export interface AppErrorData {
  message: string;
  statusCode: number;
  code?: string;
  details?: any;
}

// Service Configuration
export interface TokenServiceConfig {
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
}

export interface VerificationServiceConfig {
  codeExpiryMinutes: number;
  maxAttempts: number;
  cooldownMinutes: number;
  dailyLimit: number;
}

export interface SecurityConfig {
  maxFailedAttempts: number;
  lockDurationMinutes: number;
}

// RBAC Types
export interface RoleData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface PermissionData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  conditions?: any;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleData {
  id: string;
  userId: string;
  roleId: string;
  grantedBy?: string | null;
  grantedAt: Date;
  expiresAt?: Date | null;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermissionData {
  id: string;
  roleId: string;
  permissionId: string;
  conditions?: any;
  grantedBy?: string | null;
  grantedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermissionSummary {
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    level: number;
  }>;
  permissions: Array<{
    id: string;
    name: string;
    resource: string;
    action: string;
    conditions?: any;
  }>;
  effectiveLevel: number;
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  level: number;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  expiresAt?: string;
  metadata?: any;
}

export interface CreatePermissionRequest {
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  conditions?: any;
}

export interface UpdatePermissionRequest {
  displayName?: string;
  description?: string;
  conditions?: any;
}

// Middleware Types
export interface AuthenticatedUser {
  id: string;
  phoneNumber: string;
  isVerified: boolean;
  isActive: boolean;
  roles?: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  permissions?: Array<{
    resource: string;
    action: string;
  }>;
  effectiveLevel?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: JWTPayload;
}

// Business Permission Names
export enum PermissionName {
  // Business Management
  CREATE_BUSINESS = 'business:create',
  VIEW_ALL_BUSINESSES = 'business:view_all',
  VIEW_OWN_BUSINESS = 'business:view_own',
  EDIT_ALL_BUSINESSES = 'business:edit_all',
  EDIT_OWN_BUSINESS = 'business:edit_own',
  DELETE_ALL_BUSINESSES = 'business:delete_all',
  DELETE_OWN_BUSINESS = 'business:delete_own',
  VERIFY_BUSINESS = 'business:verify',
  CLOSE_ALL_BUSINESSES = 'business:close_all',
  CLOSE_OWN_BUSINESS = 'business:close_own',

  // Service Management
  MANAGE_ALL_SERVICES = 'service:manage_all',
  MANAGE_OWN_SERVICES = 'service:manage_own',
  VIEW_ALL_SERVICES = 'service:view_all',
  VIEW_OWN_SERVICES = 'service:view_own',

  // Appointment Management
  VIEW_ALL_APPOINTMENTS = 'appointment:view_all',
  VIEW_OWN_APPOINTMENTS = 'appointment:view_own',
  EDIT_ALL_APPOINTMENTS = 'appointment:edit_all',
  EDIT_OWN_APPOINTMENTS = 'appointment:edit_own',
  CANCEL_ALL_APPOINTMENTS = 'appointment:cancel_all',
  CANCEL_OWN_APPOINTMENTS = 'appointment:cancel_own',
  CONFIRM_APPOINTMENTS = 'appointment:confirm',
  COMPLETE_APPOINTMENTS = 'appointment:complete',
  MARK_NO_SHOW = 'appointment:mark_no_show',

  // Staff Management
  MANAGE_ALL_STAFF = 'staff:manage_all',
  MANAGE_OWN_STAFF = 'staff:manage_own',

  // Analytics
  VIEW_ALL_ANALYTICS = 'analytics:view_all',
  VIEW_OWN_ANALYTICS = 'analytics:view_own',

  // User Behavior Management
  VIEW_USER_BEHAVIOR = 'user_behavior:view',
  MANAGE_USER_BEHAVIOR = 'user_behavior:manage',
  MANAGE_STRIKES = 'user_behavior:manage_strikes',
  BAN_USERS = 'user_behavior:ban',
  FLAG_USERS = 'user_behavior:flag',
  VIEW_OWN_CUSTOMERS = 'customer:view_own',

  // Business Closure Management
  MANAGE_ALL_CLOSURES = 'closure:manage_all',
  MANAGE_OWN_CLOSURES = 'closure:manage_own',
  VIEW_ALL_CLOSURES = 'closure:view_all',
  VIEW_OWN_CLOSURES = 'closure:view_own',

  // Subscription Management
  MANAGE_ALL_SUBSCRIPTIONS = 'subscription:manage_all',
  MANAGE_OWN_SUBSCRIPTION = 'subscription:manage_own',
  VIEW_ALL_SUBSCRIPTIONS = 'subscription:view_all',
  VIEW_OWN_SUBSCRIPTION = 'subscription:view_own',

  // Role Management
  MANAGE_ROLES = 'role:manage',
  VIEW_ROLES = 'role:view',
  VIEW_OWN_PROFILE = 'user:view_own_profile'
}

// Standard Role Names
export enum RoleName {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER', 
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}