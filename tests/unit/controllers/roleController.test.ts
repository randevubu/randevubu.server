import { NextFunction, Response } from "express";
import { RoleController } from "../../../src/controllers/roleController";
import { GuaranteedAuthRequest } from "../../../src/types/auth";
import { TestHelpers } from "../../utils/testHelpers";

// Mock dependencies
jest.mock("../../../src/services/roleService");
jest.mock("../../../src/utils/errorResponse");
jest.mock("../../../src/utils/logger");

describe("RoleController", () => {
  let roleController: RoleController;
  let mockRoleService: any;
  let mockRequest: GuaranteedAuthRequest;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock RoleService
    mockRoleService = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      createPermission: jest.fn(),
      getAllPermissions: jest.fn(),
      getPermissionsByResource: jest.fn(),
      getPermissionById: jest.fn(),
      updatePermission: jest.fn(),
      assignPermissionsToRole: jest.fn(),
      revokePermissionFromRole: jest.fn(),
      getRolePermissions: jest.fn(),
      assignRoleToUser: jest.fn(),
      revokeRoleFromUser: jest.fn(),
      getUserPermissionSummary: jest.fn(),
      getRoleStatistics: jest.fn(),
    };

    // Create RoleController instance
    roleController = new RoleController(mockRoleService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockRequest.user = {
      id: "user-123",
      phoneNumber: "+905551234567",
      isVerified: true,
      isActive: true,
      roles: [{ id: "user-role", name: "USER", level: 1 }],
      effectiveLevel: 1,
    };
    mockRequest.token = {
      userId: "user-123",
      phoneNumber: "+905551234567",
      type: "access",
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    mockResponse = TestHelpers.createMockResponse();
    mockNext = jest.fn();
  });

  describe("constructor", () => {
    it("should create RoleController instance", () => {
      expect(roleController).toBeInstanceOf(RoleController);
    });
  });

  describe("createRole", () => {
    it("should create role successfully", async () => {
      // Arrange
      const roleData = {
        name: "MANAGER",
        displayName: "Manager",
        description: "Manager role",
        level: 20,
      };

      mockRequest.body = roleData;

      const mockRole = {
        id: "role-123",
        ...roleData,
        isActive: true,
        createdAt: "2024-01-15T00:00:00Z",
      };

      mockRoleService.createRole.mockResolvedValue(mockRole);

      // Act
      await roleController.createRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockRoleService.createRole).toHaveBeenCalledWith(
        roleData,
        "user-123",
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role created successfully",
        data: {
          role: {
            id: mockRole.id,
            name: mockRole.name,
            displayName: mockRole.displayName,
            description: mockRole.description,
            level: mockRole.level,
            isActive: mockRole.isActive,
            createdAt: mockRole.createdAt,
          },
        },
      });
    });
  });

  describe("getRoleById", () => {
    it("should get role by id successfully", async () => {
      // Arrange
      const roleId = "role-123";
      mockRequest.params = { id: roleId };

      const mockRole = {
        id: roleId,
        name: "MANAGER",
        displayName: "Manager",
        level: 20,
      };

      mockRoleService.getRoleById.mockResolvedValue(mockRole);

      // Act
      await roleController.getRoleById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockRoleService.getRoleById).toHaveBeenCalledWith(roleId, false);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role retrieved successfully",
        data: { role: mockRole },
      });
    });
  });

  describe("getRoles", () => {
    it("should get all roles successfully", async () => {
      // Arrange
      const mockRoles = [
        {
          id: "role-1",
          name: "STAFF",
          displayName: "Staff",
          description: "Staff role",
          level: 10,
          isSystem: false,
          isActive: true,
          createdAt: "2024-01-15T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
        },
        {
          id: "role-2",
          name: "MANAGER",
          displayName: "Manager",
          description: "Manager role",
          level: 20,
          isSystem: false,
          isActive: true,
          createdAt: "2024-01-15T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
        },
      ];

      mockRoleService.getAllRoles.mockResolvedValue(mockRoles);

      // Act
      await roleController.getRoles(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockRoleService.getAllRoles).toHaveBeenCalledWith(false);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Roles retrieved successfully",
        data: {
          roles: mockRoles.map((role) => ({
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            level: role.level,
            isSystem: role.isSystem,
            isActive: role.isActive,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          })),
        },
      });
    });
  });

  describe("updateRole", () => {
    it("should update role successfully", async () => {
      // Arrange
      const roleId = "role-123";
      const updateData = {
        displayName: "Senior Manager",
        level: 25,
      };

      mockRequest.params = { id: roleId };
      mockRequest.body = updateData;

      const mockUpdatedRole = {
        id: roleId,
        ...updateData,
      };

      mockRoleService.updateRole.mockResolvedValue(mockUpdatedRole);

      // Act
      await roleController.updateRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockRoleService.updateRole).toHaveBeenCalledWith(
        roleId,
        updateData,
        "user-123",
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role updated successfully",
        data: { role: mockUpdatedRole },
      });
    });
  });

  describe("deleteRole", () => {
    it("should delete role successfully", async () => {
      // Arrange
      const roleId = "role-123";
      mockRequest.params = { id: roleId };

      mockRoleService.deleteRole.mockResolvedValue(undefined);

      // Act
      await roleController.deleteRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockRoleService.deleteRole).toHaveBeenCalledWith(
        roleId,
        "user-123",
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role deleted successfully",
      });
    });
  });

  describe("assignRoleToUser", () => {
    it("should assign role to user successfully", async () => {
      // Arrange
      const assignData = {
        userId: "user-456",
        roleId: "role-123",
        businessId: "business-123",
      };

      mockRequest.body = assignData;

      mockRoleService.assignRoleToUser.mockResolvedValue(undefined);

      // Act
      await roleController.assignRoleToUser(
        mockRequest,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockRoleService.assignRoleToUser).toHaveBeenCalledWith(
        assignData,
        "user-123",
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role assigned to user successfully",
      });
    });
  });

  describe("revokeRoleFromUser", () => {
    it("should revoke role from user successfully", async () => {
      // Arrange
      const userId = "user-456";
      const roleId = "role-123";

      mockRequest.params = { userId, roleId };

      mockRoleService.revokeRoleFromUser.mockResolvedValue(undefined);

      // Act
      await roleController.revokeRoleFromUser(
        mockRequest,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockRoleService.revokeRoleFromUser).toHaveBeenCalledWith(
        userId,
        roleId,
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role revoked from user successfully",
      });
    });
  });

  describe("getUserPermissions", () => {
    it("should get user permissions successfully", async () => {
      // Arrange
      const userId = "user-456";

      mockRequest.params = { userId };

      const mockPermissions = {
        userId: "user-456",
        permissions: [
          { id: "perm-1", name: "MANAGE_APPOINTMENTS" },
          { id: "perm-2", name: "MANAGE_STAFF" },
        ],
      };

      mockRoleService.getUserPermissionSummary.mockResolvedValue(
        mockPermissions
      );

      // Act
      await roleController.getUserPermissions(
        mockRequest,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockRoleService.getUserPermissionSummary).toHaveBeenCalledWith(
        userId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "User permissions retrieved successfully",
        data: { permissions: mockPermissions },
      });
    });
  });

  describe("getRolePermissions", () => {
    it("should get role permissions successfully", async () => {
      // Arrange
      const roleId = "role-123";
      mockRequest.params = { roleId };

      const mockPermissions = [
        { id: "perm-1", name: "MANAGE_APPOINTMENTS" },
        { id: "perm-2", name: "MANAGE_STAFF" },
      ];

      mockRoleService.getRolePermissions.mockResolvedValue(mockPermissions);

      // Act
      await roleController.getRolePermissions(
        mockRequest,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockRoleService.getRolePermissions).toHaveBeenCalledWith(roleId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Role permissions retrieved successfully",
        data: { permissions: mockPermissions },
      });
    });
  });

  describe("assignPermissionsToRole", () => {
    it("should assign permissions to role successfully", async () => {
      // Arrange
      const roleId = "role-123";
      const permissionIds = ["perm-1", "perm-2", "perm-3"];

      mockRequest.params = { roleId };
      mockRequest.body = { permissionIds };

      mockRoleService.assignPermissionsToRole.mockResolvedValue(undefined);

      // Act
      await roleController.assignPermissionsToRole(
        mockRequest,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockRoleService.assignPermissionsToRole).toHaveBeenCalledWith(
        roleId,
        permissionIds,
        "user-123",
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Permissions assigned to role successfully",
      });
    });
  });
});
