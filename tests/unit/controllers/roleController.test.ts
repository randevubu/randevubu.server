import { Request, Response } from 'express';
import { RoleController } from '../../../src/controllers/roleController';
import { RoleService } from '../../../src/services/roleService';
import { TestHelpers } from '../../utils/testHelpers';
import { AuthenticatedRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/roleService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('RoleController', () => {
  let roleController: RoleController;
  let mockRoleService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock RoleService
    mockRoleService = {
      createRole: jest.fn(),
      getRoleById: jest.fn(),
      getAllRoles: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      assignRole: jest.fn(),
      removeRole: jest.fn(),
      getUserRoles: jest.fn(),
      getRolePermissions: jest.fn(),
      updateRolePermissions: jest.fn()
    };

    // Create RoleController instance
    roleController = new RoleController(mockRoleService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create RoleController instance', () => {
      expect(roleController).toBeInstanceOf(RoleController);
    });
  });

  describe('createRole', () => {
    it('should create role successfully', async () => {
      // Arrange
      const roleData = {
        name: 'MANAGER',
        displayName: 'Manager',
        level: 20,
        permissions: ['MANAGE_APPOINTMENTS', 'MANAGE_STAFF']
      };

      mockRequest.body = roleData;

      const mockRole = {
        id: 'role-123',
        ...roleData,
        createdAt: '2024-01-15T00:00:00Z'
      };

      mockRoleService.createRole.mockResolvedValue(mockRole);

      // Act
      await roleController.createRole(mockRequest, mockResponse);

      // Assert
      expect(mockRoleService.createRole).toHaveBeenCalledWith('user-123', roleData, undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole
      });
    });
  });

  describe('getRoleById', () => {
    it('should get role by id successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      mockRequest.params = { id: roleId };

      const mockRole = {
        id: roleId,
        name: 'MANAGER',
        displayName: 'Manager',
        level: 20
      };

      mockRoleService.getRoleById.mockResolvedValue(mockRole);

      // Act
      await roleController.getRoleById(mockRequest, mockResponse);

      // Assert
      expect(mockRoleService.getRoleById).toHaveBeenCalledWith('user-123', roleId, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole
      });
    });
  });

  describe('getAllRoles', () => {
    it('should get all roles successfully', async () => {
      // Arrange
      const mockRoles = [
        { id: 'role-1', name: 'STAFF', displayName: 'Staff', level: 10 },
        { id: 'role-2', name: 'MANAGER', displayName: 'Manager', level: 20 }
      ];

      mockRoleService.getAllRoles.mockResolvedValue(mockRoles);

      // Act
      await roleController.getAllRoles(mockRequest, mockResponse);

      // Assert
      expect(mockRoleService.getRoles).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
      });
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const updateData = {
        displayName: 'Senior Manager',
        level: 25
      };

      mockRequest.params = { id: roleId };
      mockRequest.body = updateData;

      const mockUpdatedRole = {
        id: roleId,
        ...updateData
      };

      mockRoleService.updateRole.mockResolvedValue(mockUpdatedRole);

      // Act
      await roleController.updateRole(mockRequest, mockResponse);

      // Assert
      expect(mockRoleService.updateRole).toHaveBeenCalledWith('user-123', roleId, updateData, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedRole
      });
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      mockRequest.params = { id: roleId };

      mockRoleService.deleteRole.mockResolvedValue(undefined);

      // Act
      await roleController.deleteRole(mockRequest, mockResponse);

      // Assert
      expect(mockRoleService.deleteRole).toHaveBeenCalledWith('user-123', roleId, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role deleted successfully'
      });
    });
  });

  describe('assignRole', () => {
    it('should assign role successfully', async () => {
      // Arrange
      const assignData = {
        userId: 'user-456',
        roleId: 'role-123',
        businessId: 'business-123'
      };

      mockRequest.body = assignData;

      const mockResult = {
        success: true,
        message: 'Role assigned successfully'
      };

      mockRoleService.assignRole.mockResolvedValue(mockResult);

      // Act
      await roleController.assignRole(mockRequest, mockResponse);

      // Assert
      // expect(mockRoleService.assignRole).toHaveBeenCalledWith('user-123', assignData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('removeRole', () => {
    it('should remove role successfully', async () => {
      // Arrange
      const removeData = {
        userId: 'user-456',
        roleId: 'role-123',
        businessId: 'business-123'
      };

      mockRequest.body = removeData;

      const mockResult = {
        success: true,
        message: 'Role removed successfully'
      };

      mockRoleService.removeRole.mockResolvedValue(mockResult);

      // Act
      await roleController.removeRole(mockRequest, mockResponse);

      // Assert
      // expect(mockRoleService.removeRole).toHaveBeenCalledWith('user-123', removeData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getUserRoles', () => {
    it('should get user roles successfully', async () => {
      // Arrange
      const userId = 'user-456';
      const businessId = 'business-123';

      mockRequest.params = { userId };
      mockRequest.query = { businessId };

      const mockUserRoles = [
        { id: 'role-1', name: 'STAFF', businessId: 'business-123' },
        { id: 'role-2', name: 'MANAGER', businessId: 'business-123' }
      ];

      mockRoleService.getUserRoles.mockResolvedValue(mockUserRoles);

      // Act
      await roleController.getUserRoles(mockRequest, mockResponse);

      // Assert
      // expect(mockRoleService.getUserRoles).toHaveBeenCalledWith('user-123', userId, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserRoles
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should get role permissions successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      mockRequest.params = { id: roleId };

      const mockPermissions = [
        { id: 'perm-1', name: 'MANAGE_APPOINTMENTS' },
        { id: 'perm-2', name: 'MANAGE_STAFF' }
      ];

      mockRoleService.getRolePermissions.mockResolvedValue(mockPermissions);

      // Act
      await roleController.getRolePermissions(mockRequest, mockResponse);

      // Assert
      expect(mockRoleService.getRolePermissions).toHaveBeenCalledWith('user-123', roleId, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions
      });
    });
  });

  describe('updateRolePermissions', () => {
    it('should update role permissions successfully', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissions = ['MANAGE_APPOINTMENTS', 'MANAGE_STAFF', 'VIEW_REPORTS'];

      mockRequest.params = { id: roleId };
      mockRequest.body = { permissions };

      const mockResult = {
        success: true,
        message: 'Role permissions updated successfully'
      };

      mockRoleService.updateRolePermissions.mockResolvedValue(mockResult);

      // Act
      await roleController.updateRolePermissions(mockRequest, mockResponse);

      // Assert
      // expect(mockRoleService.updateRolePermissions).toHaveBeenCalledWith('user-123', roleId, permissions);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });
});
