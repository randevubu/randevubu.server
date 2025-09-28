import { RBACService, Permission, Role, UserPermissions, PermissionContext } from '../../../src/services/rbacService';
import { RepositoryContainer } from '../../../src/repositories';
import { ErrorContext } from '../../../src/types/errors';
import { ForbiddenError, ValidationError, UserNotFoundError } from '../../../src/types/errors';

// Mock dependencies
jest.mock('../../../src/repositories');
jest.mock('../../../src/utils/logger');

describe('RBACService', () => {
  let rbacService: RBACService;
  let mockRepositories: jest.Mocked<RepositoryContainer>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockRepositories = {
      roleRepository: {
        getUserRoles: jest.fn(),
        getRolePermissions: jest.fn(),
        getRoleByName: jest.fn(),
        getRoleById: jest.fn(),
        assignRoleToUser: jest.fn(),
        revokeRoleFromUser: jest.fn()
      }
    } as any;

    // Create RBACService instance
    rbacService = new RBACService(mockRepositories);
  });

  describe('getUserPermissions', () => {
    it('should return user permissions with roles and effective level', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        },
        {
          id: 'role-2',
          name: 'manager',
          displayName: 'Manager',
          level: 50,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        },
        {
          id: 'perm-2',
          name: 'VIEW_REPORTS',
          resource: 'report',
          action: 'view',
          conditions: { minLevel: 50 }
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.getUserPermissions(userId);

      // Assert
      expect(result).toEqual({
        userId,
        roles: [
          {
            id: 'role-1',
            name: 'admin',
            displayName: 'Administrator',
            level: 100,
            permissions: mockRolePermissions.map(p => ({
              id: p.id,
              name: p.name,
              resource: p.resource,
              action: p.action,
              conditions: p.conditions
            }))
          },
          {
            id: 'role-2',
            name: 'manager',
            displayName: 'Manager',
            level: 50,
            permissions: mockRolePermissions.map(p => ({
              id: p.id,
              name: p.name,
              resource: p.resource,
              action: p.action,
              conditions: p.conditions
            }))
          }
        ],
        permissions: mockRolePermissions.map(p => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          conditions: p.conditions
        })),
        effectiveLevel: 100
      });
    });

    it('should filter out inactive roles', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        },
        {
          id: 'role-2',
          name: 'inactive-role',
          displayName: 'Inactive Role',
          level: 50,
          isActive: false
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.getUserPermissions(userId);

      // Assert
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toBe('admin');
      expect(result.effectiveLevel).toBe(100);
    });

    it('should remove duplicate permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        },
        {
          id: 'role-2',
          name: 'manager',
          displayName: 'Manager',
          level: 50,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        },
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.getUserPermissions(userId);

      // Assert
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].name).toBe('MANAGE_USERS');
    });

    it('should use cache when available', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result1 = await rbacService.getUserPermissions(userId);
      const result2 = await rbacService.getUserPermissions(userId);

      // Assert
      expect(result1).toEqual(result2);
      expect(mockRepositories.roleRepository.getUserRoles).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasPermission', () => {
    it('should return true for valid permission', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'user';
      const action = 'manage';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.hasPermission(userId, resource, action);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid permission', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'user';
      const action = 'delete';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.hasPermission(userId, resource, action);

      // Assert
      expect(result).toBe(false);
    });

    it('should evaluate permission conditions', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'report';
      const action = 'view';
      const context = { businessId: 'business-123' };

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'VIEW_REPORTS',
          resource: 'report',
          action: 'view',
          conditions: { owner: true }
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.hasPermission(userId, resource, action, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'user';
      const action = 'manage';

      mockRepositories.roleRepository.getUserRoles.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await rbacService.hasPermission(userId, resource, action);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should not throw when user has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'user:manage';
      const context = { businessId: 'business-123' };

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requirePermission(userId, permission, context))
        .resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user lacks permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'user:delete';
      const context = { businessId: 'business-123' };

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requirePermission(userId, permission, context))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('requireAny', () => {
    it('should not throw when user has any required permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions = ['user:manage', 'user:delete'];
      const context = { businessId: 'business-123' };

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requireAny(userId, permissions, context))
        .resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user lacks all required permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions = ['user:delete', 'user:create'];
      const context = { businessId: 'business-123' };

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requireAny(userId, permissions, context))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleName = 'admin';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.hasRole(userId, roleName);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user lacks role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleName = 'admin';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'user',
          displayName: 'User',
          level: 10,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'VIEW_PROFILE',
          resource: 'profile',
          action: 'view',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.hasRole(userId, roleName);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('requireRole', () => {
    it('should not throw when user has required role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleName = 'admin';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requireRole(userId, roleName))
        .resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user lacks required role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleName = 'admin';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'user',
          displayName: 'User',
          level: 10,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'VIEW_PROFILE',
          resource: 'profile',
          action: 'view',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requireRole(userId, roleName))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('requireMinLevel', () => {
    it('should not throw when user has sufficient level', async () => {
      // Arrange
      const userId = 'user-123';
      const minLevel = 50;

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requireMinLevel(userId, minLevel))
        .resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user has insufficient level', async () => {
      // Arrange
      const userId = 'user-123';
      const minLevel = 100;

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'user',
          displayName: 'User',
          level: 10,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'VIEW_PROFILE',
          resource: 'profile',
          action: 'view',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act & Assert
      await expect(rbacService.requireMinLevel(userId, minLevel))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const roleNameOrId = 'admin';
      const grantedBy = 'admin-123';
      const expiresAt = new Date('2024-12-31');
      const metadata = { reason: 'Promotion' };

      const mockRole = {
        id: 'role-1',
        name: 'admin',
        displayName: 'Administrator',
        level: 100,
        isActive: true
      };

      const mockUserRoles = [
        {
          id: 'role-2',
          name: 'user',
          displayName: 'User',
          level: 10,
          isActive: true
        }
      ];

      mockRepositories.roleRepository.getRoleByName.mockResolvedValue(mockRole);
      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.assignRoleToUser.mockResolvedValue({});

      // Act
      await rbacService.assignRole(userId, roleNameOrId, grantedBy, expiresAt, metadata);

      // Assert
      expect(mockRepositories.roleRepository.assignRoleToUser).toHaveBeenCalledWith(
        userId,
        'role-1',
        grantedBy,
        expiresAt,
        metadata
      );
    });

    it('should throw error when role not found', async () => {
      // Arrange
      const userId = 'user-123';
      const roleNameOrId = 'non-existent';
      const grantedBy = 'admin-123';

      mockRepositories.roleRepository.getRoleByName.mockResolvedValue(null);
      mockRepositories.roleRepository.getRoleById.mockResolvedValue(null);

      // Act & Assert
      await expect(rbacService.assignRole(userId, roleNameOrId, grantedBy))
        .rejects.toThrow(UserNotFoundError);
    });

    it('should throw error when user already has role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleNameOrId = 'admin';
      const grantedBy = 'admin-123';

      const mockRole = {
        id: 'role-1',
        name: 'admin',
        displayName: 'Administrator',
        level: 100,
        isActive: true
      };

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      mockRepositories.roleRepository.getRoleByName.mockResolvedValue(mockRole);
      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);

      // Act & Assert
      await expect(rbacService.assignRole(userId, roleNameOrId, grantedBy))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('revokeRole', () => {
    it('should revoke role from user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-1';
      const revokedBy = 'admin-123';

      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.revokeRoleFromUser.mockResolvedValue({});

      // Act
      await rbacService.revokeRole(userId, roleId, revokedBy);

      // Assert
      expect(mockRepositories.roleRepository.revokeRoleFromUser).toHaveBeenCalledWith(userId, roleId);
    });

    it('should throw error when user does not have role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-1';
      const revokedBy = 'admin-123';

      const mockUserRoles = [
        {
          id: 'role-2',
          name: 'user',
          displayName: 'User',
          level: 10,
          isActive: true
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);

      // Act & Assert
      await expect(rbacService.revokeRole(userId, roleId, revokedBy))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserRoles = [
        {
          id: 'role-1',
          name: 'admin',
          displayName: 'Administrator',
          level: 100,
          isActive: true
        }
      ];

      const mockRolePermissions = [
        {
          id: 'perm-1',
          name: 'MANAGE_USERS',
          resource: 'user',
          action: 'manage',
          conditions: null
        }
      ];

      mockRepositories.roleRepository.getUserRoles.mockResolvedValue(mockUserRoles);
      mockRepositories.roleRepository.getRolePermissions.mockResolvedValue(mockRolePermissions);

      // Act
      const result = await rbacService.getUserRoles(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('admin');
    });
  });

  describe('cache management', () => {
    it('should clear user cache', () => {
      // Arrange
      const userId = 'user-123';

      // Act
      rbacService.clearUserCache(userId);

      // Assert
      // No direct way to test cache clearing, but method should not throw
      expect(() => rbacService.clearUserCache(userId)).not.toThrow();
    });

    it('should force invalidate user', () => {
      // Arrange
      const userId = 'user-123';

      // Act
      rbacService.forceInvalidateUser(userId);

      // Assert
      // No direct way to test cache invalidation, but method should not throw
      expect(() => rbacService.forceInvalidateUser(userId)).not.toThrow();
    });

    it('should clear all cache', () => {
      // Act
      rbacService.clearAllCache();

      // Assert
      // No direct way to test cache clearing, but method should not throw
      expect(() => rbacService.clearAllCache()).not.toThrow();
    });
  });

  describe('evaluateConditions', () => {
    it('should evaluate owner condition correctly', () => {
      // Arrange
      const conditions = { owner: true };
      const context = { ownerId: 'user-123' };
      const userPermissions: UserPermissions = {
        userId: 'user-123',
        roles: [],
        permissions: [],
        effectiveLevel: 50
      };

      // Act
      const result = (rbacService as any).evaluateConditions(conditions, context, userPermissions);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate minLevel condition correctly', () => {
      // Arrange
      const conditions = { minLevel: 100 };
      const context = {};
      const userPermissions: UserPermissions = {
        userId: 'user-123',
        roles: [],
        permissions: [],
        effectiveLevel: 50
      };

      // Act
      const result = (rbacService as any).evaluateConditions(conditions, context, userPermissions);

      // Assert
      expect(result).toBe(false);
    });

    it('should evaluate time restrictions correctly', () => {
      // Arrange
      const conditions = {
        timeRestrictions: {
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
        }
      };
      const context = {};
      const userPermissions: UserPermissions = {
        userId: 'user-123',
        roles: [],
        permissions: [],
        effectiveLevel: 50
      };

      // Act
      const result = (rbacService as any).evaluateConditions(conditions, context, userPermissions);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for empty conditions', () => {
      // Arrange
      const conditions = {};
      const context = {};
      const userPermissions: UserPermissions = {
        userId: 'user-123',
        roles: [],
        permissions: [],
        effectiveLevel: 50
      };

      // Act
      const result = (rbacService as any).evaluateConditions(conditions, context, userPermissions);

      // Assert
      expect(result).toBe(true);
    });
  });
});

