import { RoleService } from '../../../src/services/roleService';
import { RoleRepository } from '../../../src/repositories/roleRepository';
import { RBACService } from '../../../src/services/rbacService';
import { 
  RoleData, 
  PermissionData, 
  UserPermissionSummary,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  AssignRoleRequest
} from '../../../src/types/auth';
import { 
  ValidationError, 
  UserNotFoundError, 
  ForbiddenError,
  ResourceConflictError,
  ErrorContext 
} from '../../../src/types/errors';

// Mock dependencies
jest.mock('../../../src/repositories/roleRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('RoleService', () => {
  let roleService: RoleService;
  let mockRoleRepository: any;
  let mockRBACService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockRoleRepository = {
      createRole: jest.fn(),
      getRoleById: jest.fn(),
      getRoleByName: jest.fn(),
      getAllRoles: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      getUsersByRole: jest.fn(),
      createPermission: jest.fn(),
      getPermissionById: jest.fn(),
      getPermissionByName: jest.fn(),
      getAllPermissions: jest.fn(),
      getPermissionsByResource: jest.fn(),
      updatePermission: jest.fn(),
      assignPermissionsToRole: jest.fn(),
      revokePermissionFromRole: jest.fn(),
      getRolePermissions: jest.fn(),
      assignRoleToUser: jest.fn(),
      revokeRoleFromUser: jest.fn(),
      getUserRoles: jest.fn(),
      getRoleStats: jest.fn(),
      getPermissionStats: jest.fn()
    };

    mockRBACService = {
      getUserPermissions: jest.fn(),
      clearUserCache: jest.fn(),
      clearAllCache: jest.fn()
    };

    // Create RoleService instance
    roleService = new RoleService(
      mockRoleRepository as RoleRepository,
      mockRBACService as RBACService
    );
  });

  describe('constructor', () => {
    it('should create RoleService instance', () => {
      expect(roleService).toBeInstanceOf(RoleService);
    });
  });

  describe('createRole', () => {
    const mockCreateRoleRequest: CreateRoleRequest = {
      name: 'Test Role',
      displayName: 'Test Role Display',
      description: 'Test role description',
      level: 10,
      isActive: true,
      permissionIds: ['perm-1', 'perm-2']
    };

    const mockRoleData: RoleData = {
      id: 'role-123',
      name: 'Test Role',
      displayName: 'Test Role Display',
      description: 'Test role description',
      level: 10,
      isActive: true,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123'
    };

    it('should create role successfully', async () => {
      // Arrange
      const createdBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRoleRepository.getRoleByName.mockResolvedValue(null);
      mockRoleRepository.getPermissionById
        .mockResolvedValueOnce({ id: 'perm-1', name: 'permission-1' })
        .mockResolvedValueOnce({ id: 'perm-2', name: 'permission-2' });
      mockRBACService.getUserPermissions.mockResolvedValue({
        effectiveLevel: 50
      });
      mockRoleRepository.createRole.mockResolvedValue(mockRoleData);

      // Act
      const result = await roleService.createRole(mockCreateRoleRequest, createdBy, context);

      // Assert
      expect(result).toEqual(mockRoleData);
      expect(mockRoleRepository.getRoleByName).toHaveBeenCalledWith(mockCreateRoleRequest.name);
      expect(mockRoleRepository.createRole).toHaveBeenCalledWith(mockCreateRoleRequest, createdBy);
    });

    it('should throw error when role name already exists', async () => {
      // Arrange
      const createdBy = 'user-123';
      const existingRole = { id: 'existing-role', name: 'Test Role' };

      mockRoleRepository.getRoleByName.mockResolvedValue(existingRole);

      // Act & Assert
      await expect(roleService.createRole(mockCreateRoleRequest, createdBy))
        .rejects.toThrow(ResourceConflictError);
    });

    it('should throw error when permission does not exist', async () => {
      // Arrange
      const createdBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRoleRepository.getRoleByName.mockResolvedValue(null);
      mockRoleRepository.getPermissionById.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.createRole(mockCreateRoleRequest, createdBy, context))
        .rejects.toThrow(UserNotFoundError);
    });

    it('should throw error when role level is too high', async () => {
      // Arrange
      const createdBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockRoleRepository.getRoleByName.mockResolvedValue(null);
      mockRBACService.getUserPermissions.mockResolvedValue({
        effectiveLevel: 5 // Lower than requested level 10
      });

      // Act & Assert
      await expect(roleService.createRole(mockCreateRoleRequest, createdBy, context))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('getRoleById', () => {
    it('should return role when found', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockRole: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(mockRole);

      // Act
      const result = await roleService.getRoleById(roleId);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.getRoleById).toHaveBeenCalledWith(roleId, false);
    });

    it('should return role with permissions when requested', async () => {
      // Arrange
      const roleId = 'role-123';
      const includePermissions = true;
      const mockRole: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(mockRole);

      // Act
      const result = await roleService.getRoleById(roleId, includePermissions);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.getRoleById).toHaveBeenCalledWith(roleId, true);
    });

    it('should throw error when role not found', async () => {
      // Arrange
      const roleId = 'nonexistent-role';

      mockRoleRepository.getRoleById.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.getRoleById(roleId))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getRoleByName', () => {
    it('should return role when found', async () => {
      // Arrange
      const roleName = 'Test Role';
      const mockRole: RoleData = {
        id: 'role-123',
        name: roleName,
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleByName.mockResolvedValue(mockRole);

      // Act
      const result = await roleService.getRoleByName(roleName);

      // Assert
      expect(result).toEqual(mockRole);
      expect(mockRoleRepository.getRoleByName).toHaveBeenCalledWith(roleName, false);
    });

    it('should throw error when role not found', async () => {
      // Arrange
      const roleName = 'Nonexistent Role';

      mockRoleRepository.getRoleByName.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.getRoleByName(roleName))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      // Arrange
      const mockRoles: RoleData[] = [
        {
          id: 'role-1',
          name: 'Role 1',
          displayName: 'Role 1 Display',
          description: 'Role 1 description',
          level: 10,
          isActive: true,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-123'
        },
        {
          id: 'role-2',
          name: 'Role 2',
          displayName: 'Role 2 Display',
          description: 'Role 2 description',
          level: 20,
          isActive: true,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-123'
        }
      ];

      mockRoleRepository.getAllRoles.mockResolvedValue(mockRoles);

      // Act
      const result = await roleService.getAllRoles();

      // Assert
      expect(result).toEqual(mockRoles);
      expect(mockRoleRepository.getAllRoles).toHaveBeenCalledWith(false);
    });

    it('should return all roles including inactive when requested', async () => {
      // Arrange
      const includeInactive = true;
      const mockRoles: RoleData[] = [];

      mockRoleRepository.getAllRoles.mockResolvedValue(mockRoles);

      // Act
      const result = await roleService.getAllRoles(includeInactive);

      // Assert
      expect(result).toEqual(mockRoles);
      expect(mockRoleRepository.getAllRoles).toHaveBeenCalledWith(true);
    });
  });

  describe('updateRole', () => {
    const mockUpdateRoleRequest: UpdateRoleRequest = {
      displayName: 'Updated Role Display',
      description: 'Updated role description',
      level: 15,
      isActive: false
    };

    it('should update role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const updatedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const existingRole: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      const updatedRole: RoleData = {
        ...existingRole,
        ...mockUpdateRoleRequest,
        updatedAt: new Date()
      };

      mockRoleRepository.getRoleById.mockResolvedValue(existingRole);
      mockRBACService.getUserPermissions.mockResolvedValue({
        effectiveLevel: 50
      });
      mockRoleRepository.updateRole.mockResolvedValue(updatedRole);
      mockRoleRepository.getUsersByRole.mockResolvedValue([]);

      // Act
      const result = await roleService.updateRole(roleId, mockUpdateRoleRequest, updatedBy, context);

      // Assert
      expect(result).toEqual(updatedRole);
      expect(mockRoleRepository.updateRole).toHaveBeenCalledWith(roleId, mockUpdateRoleRequest, updatedBy);
    });

    it('should throw error when trying to update system role', async () => {
      // Arrange
      const roleId = 'system-role-123';
      const updatedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const systemRole: RoleData = {
        id: roleId,
        name: 'System Role',
        displayName: 'System Role Display',
        description: 'System role description',
        level: 100,
        isActive: true,
        isSystem: true, // System role
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(systemRole);

      // Act & Assert
      await expect(roleService.updateRole(roleId, mockUpdateRoleRequest, updatedBy, context))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const deletedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUsersByRole.mockResolvedValue([]);
      mockRoleRepository.deleteRole.mockResolvedValue(undefined);

      // Act
      await roleService.deleteRole(roleId, deletedBy, context);

      // Assert
      expect(mockRoleRepository.deleteRole).toHaveBeenCalledWith(roleId, deletedBy);
    });

    it('should throw error when trying to delete system role', async () => {
      // Arrange
      const roleId = 'system-role-123';
      const deletedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const systemRole: RoleData = {
        id: roleId,
        name: 'System Role',
        displayName: 'System Role Display',
        description: 'System role description',
        level: 100,
        isActive: true,
        isSystem: true, // System role
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(systemRole);

      // Act & Assert
      await expect(roleService.deleteRole(roleId, deletedBy, context))
        .rejects.toThrow(ForbiddenError);
    });

    it('should throw error when role is assigned to users', async () => {
      // Arrange
      const roleId = 'role-123';
      const deletedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUsersByRole.mockResolvedValue(['user-1', 'user-2']); // 2 users have this role

      // Act & Assert
      await expect(roleService.deleteRole(roleId, deletedBy, context))
        .rejects.toThrow(ResourceConflictError);
    });
  });

  describe('createPermission', () => {
    const mockCreatePermissionRequest: CreatePermissionRequest = {
      name: 'test:create',
      displayName: 'Test Create Permission',
      description: 'Permission to create test resources',
      resource: 'test',
      action: 'create',
      conditions: {}
    };

    const mockPermissionData: PermissionData = {
      id: 'perm-123',
      name: 'test:create',
      displayName: 'Test Create Permission',
      description: 'Permission to create test resources',
      resource: 'test',
      action: 'create',
      conditions: {},
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create permission successfully', async () => {
      // Arrange
      mockRoleRepository.getPermissionByName.mockResolvedValue(null);
      mockRoleRepository.getPermissionsByResource.mockResolvedValue([]);
      mockRoleRepository.createPermission.mockResolvedValue(mockPermissionData);

      // Act
      const result = await roleService.createPermission(mockCreatePermissionRequest);

      // Assert
      expect(result).toEqual(mockPermissionData);
      expect(mockRoleRepository.getPermissionByName).toHaveBeenCalledWith(mockCreatePermissionRequest.name);
      expect(mockRoleRepository.createPermission).toHaveBeenCalledWith(mockCreatePermissionRequest);
    });

    it('should throw error when permission name already exists', async () => {
      // Arrange
      const existingPermission = { id: 'existing-perm', name: 'test:create' };

      mockRoleRepository.getPermissionByName.mockResolvedValue(existingPermission);

      // Act & Assert
      await expect(roleService.createPermission(mockCreatePermissionRequest))
        .rejects.toThrow(ResourceConflictError);
    });

    it('should throw error when resource:action combination already exists', async () => {
      // Arrange
      const existingPermission = { id: 'existing-perm', resource: 'test', action: 'create' };

      mockRoleRepository.getPermissionByName.mockResolvedValue(null);
      mockRoleRepository.getPermissionsByResource.mockResolvedValue([existingPermission]);

      // Act & Assert
      await expect(roleService.createPermission(mockCreatePermissionRequest))
        .rejects.toThrow(ResourceConflictError);
    });
  });

  describe('getPermissionById', () => {
    it('should return permission when found', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const mockPermission: PermissionData = {
        id: permissionId,
        name: 'test:create',
        displayName: 'Test Create Permission',
        description: 'Permission to create test resources',
        resource: 'test',
        action: 'create',
        conditions: {},
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRoleRepository.getPermissionById.mockResolvedValue(mockPermission);

      // Act
      const result = await roleService.getPermissionById(permissionId);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(mockRoleRepository.getPermissionById).toHaveBeenCalledWith(permissionId);
    });

    it('should throw error when permission not found', async () => {
      // Arrange
      const permissionId = 'nonexistent-perm';

      mockRoleRepository.getPermissionById.mockResolvedValue(null);

      // Act & Assert
      await expect(roleService.getPermissionById(permissionId))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      // Arrange
      const mockPermissions: PermissionData[] = [
        {
          id: 'perm-1',
          name: 'test:create',
          displayName: 'Test Create Permission',
          description: 'Permission to create test resources',
          resource: 'test',
          action: 'create',
          conditions: {},
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'perm-2',
          name: 'test:read',
          displayName: 'Test Read Permission',
          description: 'Permission to read test resources',
          resource: 'test',
          action: 'read',
          conditions: {},
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRoleRepository.getAllPermissions.mockResolvedValue(mockPermissions);

      // Act
      const result = await roleService.getAllPermissions();

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(mockRoleRepository.getAllPermissions).toHaveBeenCalled();
    });
  });

  describe('getPermissionsByResource', () => {
    it('should return permissions for resource', async () => {
      // Arrange
      const resource = 'test';
      const mockPermissions: PermissionData[] = [
        {
          id: 'perm-1',
          name: 'test:create',
          displayName: 'Test Create Permission',
          description: 'Permission to create test resources',
          resource: 'test',
          action: 'create',
          conditions: {},
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRoleRepository.getPermissionsByResource.mockResolvedValue(mockPermissions);

      // Act
      const result = await roleService.getPermissionsByResource(resource);

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(mockRoleRepository.getPermissionsByResource).toHaveBeenCalledWith(resource);
    });
  });

  describe('updatePermission', () => {
    const mockUpdatePermissionRequest: UpdatePermissionRequest = {
      displayName: 'Updated Permission Display',
      description: 'Updated permission description'
    };

    it('should update permission successfully', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const existingPermission: PermissionData = {
        id: permissionId,
        name: 'test:create',
        displayName: 'Test Create Permission',
        description: 'Permission to create test resources',
        resource: 'test',
        action: 'create',
        conditions: {},
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedPermission: PermissionData = {
        ...existingPermission,
        ...mockUpdatePermissionRequest,
        updatedAt: new Date()
      };

      mockRoleRepository.getPermissionById.mockResolvedValue(existingPermission);
      mockRoleRepository.updatePermission.mockResolvedValue(updatedPermission);

      // Act
      const result = await roleService.updatePermission(permissionId, mockUpdatePermissionRequest);

      // Assert
      expect(result).toEqual(updatedPermission);
      expect(mockRoleRepository.updatePermission).toHaveBeenCalledWith(permissionId, mockUpdatePermissionRequest);
    });

    it('should throw error when trying to update system permission', async () => {
      // Arrange
      const permissionId = 'system-perm-123';
      const systemPermission: PermissionData = {
        id: permissionId,
        name: 'system:admin',
        displayName: 'System Admin Permission',
        description: 'System admin permission',
        resource: 'system',
        action: 'admin',
        conditions: {},
        isSystem: true, // System permission
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRoleRepository.getPermissionById.mockResolvedValue(systemPermission);

      // Act & Assert
      await expect(roleService.updatePermission(permissionId, mockUpdatePermissionRequest))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('assignPermissionsToRole', () => {
    it('should assign permissions to role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissionIds = ['perm-1', 'perm-2'];
      const grantedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getPermissionById
        .mockResolvedValueOnce({ id: 'perm-1', name: 'permission-1' })
        .mockResolvedValueOnce({ id: 'perm-2', name: 'permission-2' });
      mockRoleRepository.assignPermissionsToRole.mockResolvedValue(undefined);
      mockRoleRepository.getUsersByRole.mockResolvedValue([]);

      // Act
      await roleService.assignPermissionsToRole(roleId, permissionIds, grantedBy, context);

      // Assert
      expect(mockRoleRepository.assignPermissionsToRole).toHaveBeenCalledWith(roleId, permissionIds, grantedBy);
    });

    it('should throw error when trying to modify system role permissions', async () => {
      // Arrange
      const roleId = 'system-role-123';
      const permissionIds = ['perm-1'];
      const grantedBy = 'user-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const systemRole: RoleData = {
        id: roleId,
        name: 'System Role',
        displayName: 'System Role Display',
        description: 'System role description',
        level: 100,
        isActive: true,
        isSystem: true, // System role
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(systemRole);

      // Act & Assert
      await expect(roleService.assignPermissionsToRole(roleId, permissionIds, grantedBy, context))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('revokePermissionFromRole', () => {
    it('should revoke permission from role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissionId = 'perm-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.revokePermissionFromRole.mockResolvedValue(undefined);
      mockRoleRepository.getUsersByRole.mockResolvedValue([]);

      // Act
      await roleService.revokePermissionFromRole(roleId, permissionId, context);

      // Assert
      expect(mockRoleRepository.revokePermissionFromRole).toHaveBeenCalledWith(roleId, permissionId);
    });
  });

  describe('getRolePermissions', () => {
    it('should return role permissions successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockPermissions: PermissionData[] = [
        {
          id: 'perm-1',
          name: 'test:create',
          displayName: 'Test Create Permission',
          description: 'Permission to create test resources',
          resource: 'test',
          action: 'create',
          conditions: {},
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getRolePermissions.mockResolvedValue(mockPermissions);

      // Act
      const result = await roleService.getRolePermissions(roleId);

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(mockRoleRepository.getRolePermissions).toHaveBeenCalledWith(roleId);
    });
  });

  describe('assignRoleToUser', () => {
    const mockAssignRoleRequest: AssignRoleRequest = {
      userId: 'user-123',
      roleId: 'role-123',
      expiresAt: '2024-12-31T23:59:59Z',
      metadata: { reason: 'Promotion' }
    };

    it('should assign role to user successfully', async () => {
      // Arrange
      const grantedBy = 'admin-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: 'role-123',
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUserRoles.mockResolvedValue([]);
      mockRoleRepository.assignRoleToUser.mockResolvedValue(undefined);

      // Act
      await roleService.assignRoleToUser(mockAssignRoleRequest, grantedBy, context);

      // Assert
      expect(mockRoleRepository.assignRoleToUser).toHaveBeenCalledWith(
        mockAssignRoleRequest.userId,
        mockAssignRoleRequest.roleId,
        grantedBy,
        expect.any(Date),
        mockAssignRoleRequest.metadata
      );
    });

    it('should throw error when role is inactive', async () => {
      // Arrange
      const grantedBy = 'admin-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const inactiveRole: RoleData = {
        id: 'role-123',
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: false, // Inactive role
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(inactiveRole);

      // Act & Assert
      await expect(roleService.assignRoleToUser(mockAssignRoleRequest, grantedBy, context))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error when user already has role', async () => {
      // Arrange
      const grantedBy = 'admin-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: 'role-123',
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      const userRoles = [{ id: 'role-123', name: 'Test Role' }]; // User already has this role

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUserRoles.mockResolvedValue(userRoles);

      // Act & Assert
      await expect(roleService.assignRoleToUser(mockAssignRoleRequest, grantedBy, context))
        .rejects.toThrow(ResourceConflictError);
    });

    it('should throw error when expiration date is in the past', async () => {
      // Arrange
      const grantedBy = 'admin-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const requestWithPastDate: AssignRoleRequest = {
        ...mockAssignRoleRequest,
        expiresAt: '2020-01-01T00:00:00Z' // Past date
      };

      const role: RoleData = {
        id: 'role-123',
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUserRoles.mockResolvedValue([]);

      // Act & Assert
      await expect(roleService.assignRoleToUser(requestWithPastDate, grantedBy, context))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('revokeRoleFromUser', () => {
    it('should revoke role from user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      const userRoles = [{ id: roleId, name: 'Test Role' }]; // User has this role

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUserRoles.mockResolvedValue(userRoles);
      mockRoleRepository.revokeRoleFromUser.mockResolvedValue(undefined);

      // Act
      await roleService.revokeRoleFromUser(userId, roleId, context);

      // Assert
      expect(mockRoleRepository.revokeRoleFromUser).toHaveBeenCalledWith(userId, roleId);
    });

    it('should throw error when user does not have role', async () => {
      // Arrange
      const userId = 'user-123';
      const roleId = 'role-123';
      const context: ErrorContext = {
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const role: RoleData = {
        id: roleId,
        name: 'Test Role',
        displayName: 'Test Role Display',
        description: 'Test role description',
        level: 10,
        isActive: true,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123'
      };

      const userRoles = []; // User does not have this role

      mockRoleRepository.getRoleById.mockResolvedValue(role);
      mockRoleRepository.getUserRoles.mockResolvedValue(userRoles);

      // Act & Assert
      await expect(roleService.revokeRoleFromUser(userId, roleId, context))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getUserPermissionSummary', () => {
    it('should return user permission summary successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserPermissions = {
        roles: [
          {
            id: 'role-1',
            name: 'Test Role',
            displayName: 'Test Role Display',
            level: 10
          }
        ],
        permissions: [
          {
            id: 'perm-1',
            name: 'test:create',
            resource: 'test',
            action: 'create',
            conditions: {}
          }
        ],
        effectiveLevel: 10
      };

      const expectedSummary: UserPermissionSummary = {
        roles: [
          {
            id: 'role-1',
            name: 'Test Role',
            displayName: 'Test Role Display',
            level: 10
          }
        ],
        permissions: [
          {
            id: 'perm-1',
            name: 'test:create',
            resource: 'test',
            action: 'create',
            conditions: {}
          }
        ],
        effectiveLevel: 10
      };

      mockRBACService.getUserPermissions.mockResolvedValue(mockUserPermissions);

      // Act
      const result = await roleService.getUserPermissionSummary(userId);

      // Assert
      expect(result).toEqual(expectedSummary);
      expect(mockRBACService.getUserPermissions).toHaveBeenCalledWith(userId);
    });
  });

  describe('getRoleStatistics', () => {
    it('should return role statistics successfully', async () => {
      // Arrange
      const mockRoleStats = { total: 5, active: 4, inactive: 1 };
      const mockPermissionStats = { total: 20, system: 5, custom: 15 };
      const mockRoles: RoleData[] = [
        {
          id: 'role-1',
          name: 'Role 1',
          displayName: 'Role 1 Display',
          description: 'Role 1 description',
          level: 10,
          isActive: true,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-123'
        },
        {
          id: 'role-2',
          name: 'Role 2',
          displayName: 'Role 2 Display',
          description: 'Role 2 description',
          level: 20,
          isActive: false,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-123'
        }
      ];

      mockRoleRepository.getRoleStats.mockResolvedValue(mockRoleStats);
      mockRoleRepository.getPermissionStats.mockResolvedValue(mockPermissionStats);
      mockRoleRepository.getAllRoles.mockResolvedValue(mockRoles);
      mockRoleRepository.getUsersByRole
        .mockResolvedValueOnce(['user-1', 'user-2']) // Role 1 has 2 users
        .mockResolvedValueOnce(['user-3']); // Role 2 has 1 user

      // Act
      const result = await roleService.getRoleStatistics();

      // Assert
      expect(result).toEqual({
        roles: mockRoleStats,
        permissions: mockPermissionStats,
        assignments: {
          totalAssignments: 3,
          activeAssignments: 2
        }
      });
    });
  });
});
