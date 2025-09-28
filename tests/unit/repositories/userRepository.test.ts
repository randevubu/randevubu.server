import { PrismaUserRepository } from '../../../src/repositories/userRepository';
import { PrismaClient } from '@prisma/client';
import { TestHelpers } from '../../utils/testHelpers';
import { testUsers } from '../../fixtures/testData';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    }
  }))
}));

describe('PrismaUserRepository', () => {
  let userRepository: PrismaUserRepository;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client with proper Jest mocks
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn()
      }
    };

    // Create repository instance
    userRepository = new PrismaUserRepository(mockPrisma);
  });

  describe('constructor', () => {
    it('should create PrismaUserRepository instance', () => {
      expect(userRepository).toBeInstanceOf(PrismaUserRepository);
    });
  });

  describe('findByPhoneNumber', () => {
    it('should return user when found', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const mockUser = {
        id: '1',
        phoneNumber,
        firstName: 'Test',
        lastName: 'User',
        avatar: null,
        timezone: 'Europe/Istanbul',
        language: 'tr',
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByPhoneNumber(phoneNumber);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByPhoneNumber(phoneNumber);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const phoneNumber = '+905551234567';
      const error = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValue(error);

      // Act & Assert
      await expect(userRepository.findByPhoneNumber(phoneNumber))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = '1';
      const mockUser = {
        id: userId,
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User',
        avatar: null,
        timezone: 'Europe/Istanbul',
        language: 'tr',
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = '999';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = {
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User',
        timezone: 'Europe/Istanbul',
        language: 'tr'
      };

      const mockCreatedUser = {
        id: '1',
        ...userData,
        avatar: null,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await userRepository.create(userData);

      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      // Arrange
      const userData = {
        phoneNumber: '+905551234567',
        firstName: 'Test',
        lastName: 'User',
        timezone: 'Europe/Istanbul',
        language: 'tr'
      };

      const error = new Error('Phone number already exists');
      mockPrisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(userRepository.create(userData))
        .rejects.toThrow('Phone number already exists');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = '1';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const mockUpdatedUser = {
        id: userId,
        phoneNumber: '+905551234567',
        ...updateData,
        avatar: null,
        timezone: 'Europe/Istanbul',
        language: 'tr',
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await userRepository.update(userId, updateData);

      // Assert
      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      // Arrange
      const userId = '999';
      const updateData = { firstName: 'Updated' };
      const error = new Error('Record not found');
      mockPrisma.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(userRepository.update(userId, updateData))
        .rejects.toThrow('Record not found');
    });
  });

  describe('deactivate', () => {
    it('should deactivate user successfully', async () => {
      // Arrange
      const userId = '1';
      mockPrisma.user.update.mockResolvedValue({ id: userId, isActive: false });

      // Act
      await userRepository.deactivate(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('markAsVerified', () => {
    it('should mark user as verified', async () => {
      // Arrange
      const userId = '1';
      mockPrisma.user.update.mockResolvedValue({ id: userId, isVerified: true });

      // Act
      await userRepository.markAsVerified(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', async () => {
      // Arrange
      const userId = '1';
      const ipAddress = '127.0.0.1';
      mockPrisma.user.update.mockResolvedValue({ id: userId, lastLoginAt: new Date() });

      // Act
      await userRepository.updateLastLogin(userId, ipAddress);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts and return should lock', async () => {
      // Arrange
      const userId = '1';
      const mockUser = {
        id: userId,
        failedLoginAttempts: 4
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ id: userId, failedLoginAttempts: 5 });

      // Act
      const result = await userRepository.incrementFailedAttempts(userId);

      // Assert
      expect(result).toEqual({
        attempts: 5,
        shouldLock: true
      });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('unlockUser', () => {
    it('should unlock user successfully', async () => {
      // Arrange
      const userId = '1';
      mockPrisma.user.update.mockResolvedValue({ id: userId, lockedUntil: null });

      // Act
      await userRepository.unlockUser(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      // Arrange
      const mockStats = {
        totalUsers: 100,
        activeUsers: 80,
        verifiedUsers: 75,
        newUsersToday: 5,
        verificationRate: '75.00'
      };

      // Mock multiple count calls
      mockPrisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80)  // activeUsers
        .mockResolvedValueOnce(75)  // verifiedUsers
        .mockResolvedValueOnce(5);  // newUsersToday

      // Act
      const result = await userRepository.getUserStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(4);
    });
  });
});