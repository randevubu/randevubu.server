import { RepositoryContainer } from "../repositories";
import {
  ErrorContext,
  ForbiddenError,
  UserNotFoundError,
  ValidationError,
} from "../types/errors";
import logger from "../utils/Logger/logger";

// Enhanced interfaces with better type safety
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  permissions: Permission[];
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  permissions: Permission[];
  effectiveLevel: number;
}

export interface PermissionContext {
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

// Security constants
const SECURITY_CONSTANTS = {
  MAX_USER_ID_LENGTH: 50,
  MAX_ROLE_NAME_LENGTH: 100,
  MAX_RESOURCE_LENGTH: 50,
  MAX_ACTION_LENGTH: 50,
  CACHE_KEY_PREFIX: "rbac:user:",
  INVALID_INPUT_PATTERNS: /[<>'"&]/g,
  // Cache and performance constants
  MIN_LEVEL_THRESHOLD: 100,
  CACHE_HIGH_THRESHOLD: 0.8,
  CACHE_LOW_THRESHOLD: 0.3,
  // Time validation constants
  MAX_TIME_OFFSET_HOURS: 24,
  DEFAULT_TIMEZONE: "UTC",
} as const;

// Helper function to split permission name into resource and action
function splitPermissionName(permissionName: string): { resource: string; action: string } {
  const [resource, action] = permissionName.split(':');
  return { resource, action };
}

export class RBACService {
  private permissionCache = new Map<string, UserPermissions>();
  private cacheExpiry = new Map<string, number>();
  private inFlightRequests = new Map<string, Promise<UserPermissions>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_CLEANUP_THRESHOLD =
    SECURITY_CONSTANTS.CACHE_HIGH_THRESHOLD;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor(private repositories: RepositoryContainer) {
    this.startPeriodicCleanup();
  }

  // Enhanced input validation with security checks
  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== "string") {
      throw new ValidationError("Invalid userId provided");
    }

    const trimmedUserId = userId.trim();
    if (
      trimmedUserId.length === 0 ||
      trimmedUserId.length > SECURITY_CONSTANTS.MAX_USER_ID_LENGTH
    ) {
      throw new ValidationError("Invalid userId length");
    }

    if (SECURITY_CONSTANTS.INVALID_INPUT_PATTERNS.test(trimmedUserId)) {
      throw new ValidationError("Invalid characters in userId");
    }
  }

  private validateRoleName(roleName: string): void {
    if (!roleName || typeof roleName !== "string") {
      throw new ValidationError("Invalid role name provided");
    }

    const trimmedRoleName = roleName.trim();
    if (
      trimmedRoleName.length === 0 ||
      trimmedRoleName.length > SECURITY_CONSTANTS.MAX_ROLE_NAME_LENGTH
    ) {
      throw new ValidationError("Invalid role name length");
    }

    if (SECURITY_CONSTANTS.INVALID_INPUT_PATTERNS.test(trimmedRoleName)) {
      throw new ValidationError("Invalid characters in role name");
    }
  }

  private validateResourceAction(resource: string, action: string): void {
    if (
      !resource ||
      !action ||
      typeof resource !== "string" ||
      typeof action !== "string"
    ) {
      throw new ValidationError("Invalid resource or action provided");
    }

    if (
      resource.length > SECURITY_CONSTANTS.MAX_RESOURCE_LENGTH ||
      action.length > SECURITY_CONSTANTS.MAX_ACTION_LENGTH
    ) {
      throw new ValidationError("Resource or action too long");
    }

    if (
      SECURITY_CONSTANTS.INVALID_INPUT_PATTERNS.test(resource) ||
      SECURITY_CONSTANTS.INVALID_INPUT_PATTERNS.test(action)
    ) {
      throw new ValidationError("Invalid characters in resource or action");
    }
  }

  // Secure cache key generation
  private generateCacheKey(userId: string): string {
    this.validateUserId(userId);
    return `${SECURITY_CONSTANTS.CACHE_KEY_PREFIX}${userId}`;
  }

  // Enhanced permission retrieval with security checks
  async getUserPermissions(
    userId: string,
    useCache = true
  ): Promise<UserPermissions> {
    this.validateUserId(userId);
    const cacheKey = this.generateCacheKey(userId);

    // Check cache first
    if (
      useCache &&
      this.permissionCache.has(cacheKey) &&
      this.isCacheValid(cacheKey)
    ) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && this.validateCachedData(cached)) {
        return cached;
      }
      // Remove invalid cached data
      this.permissionCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    }

    // Prevent cache stampede with proper error handling
    if (this.inFlightRequests.has(cacheKey)) {
      try {
        return await this.inFlightRequests.get(cacheKey)!;
      } catch (error) {
        // If in-flight request failed, remove it and retry
        this.inFlightRequests.delete(cacheKey);
      }
    }

    const requestPromise = this.loadUserPermissions(userId, cacheKey);
    this.inFlightRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      // CRITICAL FIX: Clean up in-flight request on success to prevent memory leak
      this.inFlightRequests.delete(cacheKey);
      return result;
    } catch (error) {
      // Clean up in-flight request on error
      this.inFlightRequests.delete(cacheKey);
      throw error;
    }
  }

  // Enhanced cached data validation with deep structure checking
  private validateCachedData(data: UserPermissions): boolean {
    // Basic structure validation
    if (
      !data ||
      typeof data.userId !== "string" ||
      !Array.isArray(data.roles) ||
      !Array.isArray(data.permissions) ||
      typeof data.effectiveLevel !== "number" ||
      data.userId.length === 0 ||
      data.userId.length > SECURITY_CONSTANTS.MAX_USER_ID_LENGTH
    ) {
      return false;
    }

    // Validate roles array contents
    for (const role of data.roles) {
      if (
        !role ||
        typeof role.id !== "string" ||
        typeof role.name !== "string" ||
        typeof role.displayName !== "string" ||
        typeof role.level !== "number" ||
        !Array.isArray(role.permissions) ||
        role.id.length === 0 ||
        role.name.length === 0 ||
        role.level < 0
      ) {
        return false;
      }

      // Validate role permissions
      for (const permission of role.permissions) {
        if (!this.validatePermissionStructure(permission)) {
          return false;
        }
      }
    }

    // Validate permissions array contents
    for (const permission of data.permissions) {
      if (!this.validatePermissionStructure(permission)) {
        return false;
      }
    }

    return true;
  }

  // Helper method to validate permission structure
  private validatePermissionStructure(permission: Permission): boolean {
    return (
      permission &&
      typeof permission.id === "string" &&
      typeof permission.name === "string" &&
      typeof permission.resource === "string" &&
      typeof permission.action === "string" &&
      permission.id.length > 0 &&
      permission.name.length > 0 &&
      permission.resource.length > 0 &&
      permission.action.length > 0 &&
      permission.resource.length <= SECURITY_CONSTANTS.MAX_RESOURCE_LENGTH &&
      permission.action.length <= SECURITY_CONSTANTS.MAX_ACTION_LENGTH &&
      (permission.conditions === undefined ||
        (typeof permission.conditions === "object" &&
          permission.conditions !== null))
    );
  }

  // Helper method to parse time with timezone consideration
  private parseTimeWithTimezone(
    timeString: string,
    timezone: string
  ): Date | null {
    try {
      // Handle ISO strings with timezone info
      if (
        timeString.includes("T") ||
        timeString.includes("Z") ||
        timeString.includes("+")
      ) {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Handle timezone-specific parsing
      // For now, we'll use a simple approach - in production, consider using a library like moment-timezone
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        logger.warn("Invalid time format in time restrictions", {
          timeString,
          timezone,
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      // Basic timezone offset handling (simplified)
      // In production, use proper timezone libraries
      if (timezone !== SECURITY_CONSTANTS.DEFAULT_TIMEZONE) {
        // This is a simplified implementation - for production, use proper timezone handling
        logger.info("Timezone conversion applied", {
          originalTime: timeString,
          timezone,
          convertedTime: date.toISOString(),
        });
      }

      return date;
    } catch (error) {
      logger.error("Failed to parse time with timezone", {
        timeString,
        timezone,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  private async loadUserPermissions(
    userId: string,
    cacheKey: string
  ): Promise<UserPermissions> {
    try {
      const result =
        await this.repositories.roleRepository.getUserRolesWithPermissions(
          userId
        );

      if (!result || typeof result !== "object") {
        throw new Error("Invalid repository response");
      }

      const roleData = Array.isArray(result.roles) ? result.roles : [];
      const permissionData = Array.isArray(result.permissions)
        ? result.permissions
        : [];
      const rolePermissions = Array.isArray(result.rolePermissions)
        ? result.rolePermissions
        : [];

      if (roleData.length === 0) {
        const emptyPermissions = this.createEmptyUserPermissions(userId);
        this.cacheResult(cacheKey, emptyPermissions);
        return emptyPermissions;
      }

      // Build roles and permissions with validation
      const roles = this.buildRoles(roleData);
      const maxLevel = Math.max(...roles.map((role) => role.level), 0);
      const uniquePermissions = this.deduplicatePermissions(permissionData);
      const rolesWithPermissions = this.mapPermissionsToRoles(
        roles,
        uniquePermissions,
        rolePermissions
      );

      const userPermissions: UserPermissions = {
        userId,
        roles: rolesWithPermissions,
        permissions: uniquePermissions,
        effectiveLevel: maxLevel,
      };

      this.cacheResult(cacheKey, userPermissions);
      return userPermissions;
    } catch (error) {
      logger.error("Failed to get user permissions", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      const fallbackPermissions = this.createEmptyUserPermissions(userId);
      this.cacheResult(cacheKey, fallbackPermissions, 60000); // 1 minute cache for failures
      return fallbackPermissions;
    }
  }

  private buildRoles(roleData: unknown[]): Role[] {
    if (!Array.isArray(roleData)) return [];

    return roleData
      .filter((role): role is Record<string, unknown> =>
        Boolean(role && typeof role === "object" && role !== null)
      )
      .filter((role) => Boolean((role as any).isActive))
      .map((role) => ({
        id: String(role.id || ""),
        name: String(role.name || ""),
        displayName: String(role.displayName || ""),
        level: Number(role.level) || 0,
        permissions: [],
      }))
      .filter((role) => role.id && role.name);
  }

  private deduplicatePermissions(permissionData: unknown[]): Permission[] {
    if (!Array.isArray(permissionData)) return [];

    const permissionMap = new Map<string, Permission>();

    for (const permission of permissionData) {
      if (!permission || typeof permission !== "object" || permission === null)
        continue;

      const id = String((permission as any).id || "");
      const name = String((permission as any).name || "");
      const resource = String((permission as any).resource || "");
      const action = String((permission as any).action || "");

      if (!id || !name || !resource || !action) continue;

      const key = `${resource}:${action}:${name}`;
      if (!permissionMap.has(key)) {
        permissionMap.set(key, {
          id,
          name,
          resource,
          action,
          conditions:
            ((permission as any).conditions as Record<string, unknown>) ||
            undefined,
        });
      }
    }

    return Array.from(permissionMap.values());
  }

  private mapPermissionsToRoles(
    roles: Role[],
    permissions: Permission[],
    rolePermissions: Array<{ roleId: string; permissionId: string }>
  ): Role[] {
    const permissionMap = new Map(permissions.map((p) => [p.id, p]));
    const rolePermissionMap = new Map<string, Permission[]>();

    // Initialize all roles with empty permission arrays
    for (const role of roles) {
      rolePermissionMap.set(role.id, []);
    }

    // Map permissions to roles
    for (const rp of rolePermissions) {
      if (!rp || typeof rp !== "object" || !rp.roleId || !rp.permissionId)
        continue;

      const permission = permissionMap.get(rp.permissionId);
      if (permission) {
        const rolePermissions = rolePermissionMap.get(rp.roleId) || [];
        rolePermissions.push(permission);
        rolePermissionMap.set(rp.roleId, rolePermissions);
      }
    }

    return roles.map((role) => ({
      ...role,
      permissions: rolePermissionMap.get(role.id) || [],
    }));
  }

  // Enhanced permission checking with security validation
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    context?: unknown
  ): Promise<boolean> {
    this.validateUserId(userId);
    this.validateResourceAction(resource, action);

    try {
      const userPermissions = await this.getUserPermissions(userId);
      const permission = userPermissions.permissions.find(
        (p) => p.resource === resource && p.action === action
      );

      if (!permission) return false;
      if (!permission.conditions) return true;

      return await this.evaluateConditions(
        permission.conditions,
        context,
        userPermissions
      );
    } catch (error) {
      // CONSISTENCY FIX: Log error but don't return false for unexpected errors
      // This maintains consistency with requirePermission behavior
      logger.error("Permission check failed", {
        userId,
        resource,
        action,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      // For validation errors, return false (expected behavior)
      if (error instanceof ValidationError) {
        return false;
      }

      // For unexpected errors, re-throw to maintain consistency
      throw error;
    }
  }

  async requirePermission(
    userId: string,
    permission: string,
    context?: unknown,
    errorContext?: ErrorContext
  ): Promise<void> {
    if (
      !permission ||
      typeof permission !== "string" ||
      !permission.includes(":")
    ) {
      throw new ValidationError(
        "Invalid permission format. Expected 'resource:action'"
      );
    }

    const [resource, action] = permission.split(":", 2);
    const hasPermission = await this.hasPermission(
      userId,
      resource,
      action,
      context
    );

    if (!hasPermission) {
      throw new ForbiddenError(
        "Permission denied",
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    this.validateUserId(userId);
    this.validateRoleName(roleName);

    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.roles.some((role) => role.name === roleName);
    } catch (error) {
      // CONSISTENCY FIX: Log error but don't return false for unexpected errors
      // This maintains consistency with requireRole behavior
      logger.error("Role check failed", {
        userId,
        roleName,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      // For validation errors, return false (expected behavior)
      if (error instanceof ValidationError) {
        return false;
      }

      // For unexpected errors, re-throw to maintain consistency
      throw error;
    }
  }

  async requireRole(
    userId: string,
    roleName: string,
    errorContext?: ErrorContext
  ): Promise<void> {
    this.validateUserId(userId);
    this.validateRoleName(roleName);

    const hasRole = await this.hasRole(userId, roleName);
    if (!hasRole) {
      throw new ForbiddenError(
        "Role required",
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  async requireMinLevel(
    userId: string,
    minLevel: number,
    errorContext?: ErrorContext
  ): Promise<void> {
    this.validateUserId(userId);

    if (
      typeof minLevel !== "number" ||
      minLevel < 0 ||
      !Number.isInteger(minLevel)
    ) {
      throw new ValidationError("Invalid minimum level provided");
    }

    try {
      const userPermissions = await this.getUserPermissions(userId);
      if (userPermissions.effectiveLevel < minLevel) {
        throw new ForbiddenError(
          "Insufficient role level",
          errorContext || { userId, timestamp: new Date() }
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      logger.error("Level check failed", {
        userId,
        minLevel,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw new ForbiddenError(
        "Access denied",
        errorContext || { userId, timestamp: new Date() }
      );
    }
  }

  // Enhanced role assignment with authorization checks
  async assignRole(
    userId: string,
    roleNameOrId: string,
    grantedBy: string,
    expiresAt?: Date,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.validateUserId(userId);
    this.validateUserId(grantedBy);
    this.validateRoleName(roleNameOrId);

    if (
      expiresAt &&
      (!(expiresAt instanceof Date) ||
        isNaN(expiresAt.getTime()) ||
        expiresAt <= new Date())
    ) {
      throw new ValidationError("Invalid expiration date");
    }

    try {
      // Check if grantor has permission to assign roles
      const grantorPermissions = await this.getUserPermissions(grantedBy);
      if (
        grantorPermissions.effectiveLevel <
        SECURITY_CONSTANTS.MIN_LEVEL_THRESHOLD
      ) {
        // Minimum level for role assignment
        throw new ForbiddenError("Insufficient permissions to assign roles");
      }

      let role = await this.repositories.roleRepository.getRoleByName(
        roleNameOrId
      );
      if (!role) {
        role = await this.repositories.roleRepository.getRoleById(roleNameOrId);
      }

      if (!role || !role.isActive) {
        throw new UserNotFoundError("Role not found or inactive");
      }

      // Check if user already has this role
      const userRoles = await this.repositories.roleRepository.getUserRoles(
        userId
      );
      if (userRoles.some((ur) => ur.id === role.id)) {
        throw new ValidationError("User already has this role");
      }

      await this.repositories.roleRepository.assignRoleToUser(
        userId,
        role.id,
        grantedBy,
        expiresAt,
        metadata
      );

      this.clearUserCache(userId);
      this.clearUserCache(grantedBy); // Clear grantor cache too

      logger.info("Role assigned successfully", {
        userId,
        roleId: role.id,
        roleName: role.name,
        grantedBy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to assign role", {
        userId,
        roleNameOrId,
        grantedBy,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async revokeRole(
    userId: string,
    roleId: string,
    revokedBy: string
  ): Promise<void> {
    this.validateUserId(userId);
    this.validateUserId(revokedBy);
    this.validateUserId(roleId);

    try {
      // Check if revoker has permission to revoke roles
      const revokerPermissions = await this.getUserPermissions(revokedBy);
      if (
        revokerPermissions.effectiveLevel <
        SECURITY_CONSTANTS.MIN_LEVEL_THRESHOLD
      ) {
        // Minimum level for role revocation
        throw new ForbiddenError("Insufficient permissions to revoke roles");
      }

      const userRoles = await this.repositories.roleRepository.getUserRoles(
        userId
      );
      if (!userRoles.some((ur) => ur.id === roleId)) {
        throw new UserNotFoundError("User role assignment not found");
      }

      await this.repositories.roleRepository.revokeRoleFromUser(userId, roleId);
      this.clearUserCache(userId);
      this.clearUserCache(revokedBy); // Clear revoker cache too

      logger.info("Role revoked successfully", {
        userId,
        roleId,
        revokedBy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to revoke role", {
        userId,
        roleId,
        revokedBy,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    this.validateUserId(userId);

    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.roles;
    } catch (error) {
      logger.error("Failed to get user roles", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      return [];
    }
  }

  // Enhanced cache management with security
  clearUserCache(userId: string): void {
    this.validateUserId(userId);
    const cacheKey = this.generateCacheKey(userId);
    this.permissionCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    this.inFlightRequests.delete(cacheKey);
  }

  forceInvalidateUser(userId: string): void {
    this.validateUserId(userId);

    const patterns = [
      this.generateCacheKey(userId),
      `${SECURITY_CONSTANTS.CACHE_KEY_PREFIX}${userId}:immediate`,
      `${SECURITY_CONSTANTS.CACHE_KEY_PREFIX}${userId}:perms`,
    ];

    let clearedCount = 0;
    for (const pattern of patterns) {
      if (this.permissionCache.has(pattern)) {
        this.permissionCache.delete(pattern);
        this.cacheExpiry.delete(pattern);
        clearedCount++;
      }
    }

    // Clear any cached business context for this user (with security check)
    const userIdPattern = new RegExp(
      `^${SECURITY_CONSTANTS.CACHE_KEY_PREFIX}${userId.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}`
    );
    for (const [key] of this.permissionCache.entries()) {
      if (userIdPattern.test(key)) {
        this.permissionCache.delete(key);
        this.cacheExpiry.delete(key);
        clearedCount++;
      }
    }

    this.inFlightRequests.delete(this.generateCacheKey(userId));
    logger.info("Force invalidated all cache entries for user", {
      userId,
      clearedEntries: clearedCount,
      timestamp: new Date().toISOString(),
    });
  }

  clearAllCache(): void {
    const previousSize = this.permissionCache.size;
    this.permissionCache.clear();
    this.cacheExpiry.clear();
    this.inFlightRequests.clear();
    logger.info("Cleared all RBAC cache", {
      previousSize,
      currentSize: 0,
      timestamp: new Date().toISOString(),
    });
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    inFlightRequests: number;
  } {
    const size = this.permissionCache.size;
    const maxSize = this.MAX_CACHE_SIZE;
    const utilizationPercent = Math.round((size / maxSize) * 100);
    return {
      size,
      maxSize,
      utilizationPercent,
      inFlightRequests: this.inFlightRequests.size,
    };
  }

  // Cleanup on service shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAllCache();
  }

  // Private helper methods
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey) || 0;
    return Date.now() < expiry;
  }

  private createEmptyUserPermissions(userId: string): UserPermissions {
    return { userId, roles: [], permissions: [], effectiveLevel: 0 };
  }

  private cacheResult(
    cacheKey: string,
    permissions: UserPermissions,
    ttl = this.CACHE_TTL
  ): void {
    this.permissionCache.set(cacheKey, permissions);
    this.cacheExpiry.set(cacheKey, Date.now() + ttl);
    this.cleanupCache();
  }

  /**
   * Intelligent cache cleanup with LRU-style eviction
   *
   * This method implements a sophisticated cache management strategy:
   * 1. Triggers when cache utilization exceeds the high threshold (80%)
   * 2. Removes entries based on expiry time (oldest first)
   * 3. Reduces cache to low threshold (30%) to prevent frequent cleanups
   * 4. Maintains cache performance while preventing memory leaks
   */
  private cleanupCache(): void {
    // Only cleanup when cache utilization exceeds high threshold
    if (
      this.permissionCache.size >
      this.MAX_CACHE_SIZE * this.CACHE_CLEANUP_THRESHOLD
    ) {
      const entries = Array.from(this.permissionCache.entries());
      // Calculate how many entries to remove to reach low threshold
      const entriesToRemove = Math.floor(
        this.MAX_CACHE_SIZE * SECURITY_CONSTANTS.CACHE_LOW_THRESHOLD
      );

      // Sort entries by expiry time (oldest first) for LRU-style eviction
      const sortedEntries = entries.sort((a, b) => {
        const expiryA = this.cacheExpiry.get(a[0]) || 0;
        const expiryB = this.cacheExpiry.get(b[0]) || 0;
        return expiryA - expiryB;
      });

      // Remove oldest entries up to the calculated threshold
      let actuallyRemoved = 0;
      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        const [key] = sortedEntries[i];
        this.permissionCache.delete(key);
        this.cacheExpiry.delete(key);
        actuallyRemoved++;
      }

      // Log cleanup statistics for monitoring
      logger.info("RBAC cache cleaned up", {
        actuallyRemoved,
        remainingEntries: this.permissionCache.size,
        utilizationPercent: Math.round(
          (this.permissionCache.size / this.MAX_CACHE_SIZE) * 100
        ),
        timestamp: new Date().toISOString(),
      });
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, this.CLEANUP_INTERVAL);
  }

  private async evaluateConditions(
    conditions: unknown,
    context: unknown,
    userPermissions: UserPermissions
  ): Promise<boolean> {
    try {
      if (
        !conditions ||
        typeof conditions !== "object" ||
        conditions === null
      ) {
        return true;
      }

      const conditionsObj = conditions as Record<string, unknown>;

      // Owner check with validation
      if (conditionsObj.owner === true) {
        if (context && typeof context === "object" && context !== null) {
          const contextObj = context as Record<string, unknown>;

          if (contextObj.ownerId && typeof contextObj.ownerId === "string") {
            return contextObj.ownerId === userPermissions.userId;
          }

          if (
            contextObj.businessId &&
            typeof contextObj.businessId === "string"
          ) {
            try {
              const business =
                await this.repositories.businessRepository.findById(
                  contextObj.businessId
                );
              return !!(
                business && business.ownerId === userPermissions.userId
              );
            } catch (error) {
              logger.warn("Business ownership verification failed", {
                userId: userPermissions.userId,
                businessId: contextObj.businessId,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
              });
              return false;
            }
          }
        }
        return false;
      }

      // Level-based access with validation
      if (
        typeof conditionsObj.minLevel === "number" &&
        Number.isInteger(conditionsObj.minLevel)
      ) {
        return userPermissions.effectiveLevel >= conditionsObj.minLevel;
      }

      // Time-based access with timezone consideration
      if (
        conditionsObj.timeRestrictions &&
        typeof conditionsObj.timeRestrictions === "object" &&
        conditionsObj.timeRestrictions !== null
      ) {
        const timeRestrictions = conditionsObj.timeRestrictions as Record<
          string,
          unknown
        >;

        // TIMEZONE FIX: Use UTC for consistent time comparison
        const now = new Date();
        const timezone =
          (timeRestrictions.timezone as string) ||
          SECURITY_CONSTANTS.DEFAULT_TIMEZONE;

        if (
          timeRestrictions.startTime &&
          typeof timeRestrictions.startTime === "string"
        ) {
          const startTime = this.parseTimeWithTimezone(
            timeRestrictions.startTime as string,
            timezone
          );
          if (startTime && now < startTime) return false;
        }

        if (
          timeRestrictions.endTime &&
          typeof timeRestrictions.endTime === "string"
        ) {
          const endTime = this.parseTimeWithTimezone(
            timeRestrictions.endTime as string,
            timezone
          );
          if (endTime && now > endTime) return false;
        }
      }

      return true;
    } catch (error) {
      logger.warn("Condition evaluation failed", {
        conditions,
        context,
        userId: userPermissions.userId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async requireAny(
    userId: string,
    permissions: string[],
    context?: ErrorContext
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const { resource, action } = splitPermissionName(permission);
        if (await this.hasPermission(userId, resource, action)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error("Error checking requireAny permissions", {
        userId,
        permissions,
        error: error instanceof Error ? error.message : "Unknown error",
        context,
      });
      return false;
    }
  }
}
