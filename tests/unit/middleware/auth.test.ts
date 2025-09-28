import { AuthMiddleware } from '../../../src/middleware/auth';
import { RepositoryContainer } from '../../../src/repositories';
import { TokenService } from '../../../src/services/tokenService';
import { RBACService } from '../../../src/services/rbacService';

// Mock dependencies
jest.mock('../../../src/repositories');
jest.mock('../../../src/services/tokenService');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/utils/logger');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockRepositories: any;
  let mockTokenService: any;
  let mockRBACService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockRepositories = {
      userRepository: {
        findById: jest.fn(),
        findByPhoneNumber: jest.fn()
      }
    };

    mockTokenService = {
      verifyAccessToken: jest.fn()
    };

    mockRBACService = {
      getUserPermissions: jest.fn(),
      hasPermission: jest.fn(),
      requirePermission: jest.fn()
    };

    // Create AuthMiddleware instance
    authMiddleware = new AuthMiddleware(
      mockRepositories,
      mockTokenService,
      mockRBACService
    );
  });

  describe('constructor', () => {
    it('should create AuthMiddleware instance', () => {
      expect(authMiddleware).toBeInstanceOf(AuthMiddleware);
    });
  });

  describe('authenticate', () => {
    it('should be a function', () => {
      expect(typeof authMiddleware.authenticate).toBe('function');
    });

    it('should call next with error when authorization header is missing', async () => {
      const req = {
        headers: {},
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET',
        get: jest.fn()
      } as any;
      const res = {} as any;
      const next = jest.fn();

      await authMiddleware.authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('requireVerified', () => {
    it('should be a function', () => {
      expect(typeof authMiddleware.requireVerified).toBe('function');
    });

    it('should call next when user is verified', () => {
      const req = {
        user: {
          id: '1',
          isVerified: true
        },
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET',
        get: jest.fn()
      } as any;
      const res = {} as any;
      const next = jest.fn();

      authMiddleware.requireVerified(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error when user is not verified', () => {
      const req = {
        user: {
          id: '1',
          isVerified: false
        },
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET',
        get: jest.fn()
      } as any;
      const res = {} as any;
      const next = jest.fn();

      expect(() => authMiddleware.requireVerified(req, res, next)).toThrow();
    });
  });

  describe('optionalAuth', () => {
    it('should be a function', () => {
      expect(typeof authMiddleware.optionalAuth).toBe('function');
    });

    it('should call next when no authorization header', async () => {
      const req = {
        headers: {},
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET',
        get: jest.fn()
      } as any;
      const res = {} as any;
      const next = jest.fn();

      await authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(req.token).toBeUndefined();
    });
  });
});