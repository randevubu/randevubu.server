import { BusinessClosureService } from '../../../src/services/businessClosureService';
import { BusinessClosureRepository } from '../../../src/repositories/businessClosureRepository';
import { AppointmentRepository } from '../../../src/repositories/appointmentRepository';
import { RBACService } from '../../../src/services/rbacService';
import { ClosureType, BusinessClosureData, CreateBusinessClosureRequest, UpdateBusinessClosureRequest } from '../../../src/types/business';
import { PermissionName } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/repositories/businessClosureRepository');
jest.mock('../../../src/repositories/appointmentRepository');
jest.mock('../../../src/services/rbacService');

describe('BusinessClosureService', () => {
  let businessClosureService: BusinessClosureService;
  let mockBusinessClosureRepository: jest.Mocked<BusinessClosureRepository>;
  let mockAppointmentRepository: jest.Mocked<AppointmentRepository>;
  let mockRbacService: jest.Mocked<RBACService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockBusinessClosureRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findActiveByBusinessId: jest.fn(),
      findUpcomingByBusinessId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isBusinessClosed: jest.fn(),
      extendClosure: jest.fn(),
      endClosureEarly: jest.fn(),
      findByDateRange: jest.fn(),
      findByType: jest.fn(),
      getClosureStats: jest.fn(),
      findRecurringHolidays: jest.fn(),
      autoExpireClosures: jest.fn(),
      findConflictingClosures: jest.fn()
    } as any;

    mockAppointmentRepository = {
      findByBusinessAndDateRange: jest.fn()
    } as any;

    mockRbacService = {
      hasPermission: jest.fn(),
      requirePermission: jest.fn()
    } as any;

    // Create BusinessClosureService instance
    businessClosureService = new BusinessClosureService(
      mockBusinessClosureRepository,
      mockAppointmentRepository,
      mockRbacService
    );
  });

  describe('createClosure', () => {
    it('should create a closure successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const closureData: CreateBusinessClosureRequest = {
        startDate: '2024-12-25',
        endDate: '2024-12-26',
        reason: 'Holiday',
        type: ClosureType.HOLIDAY
      };
      const expectedClosure: BusinessClosureData = {
        id: 'closure-123',
        businessId,
        userId,
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-26'),
        reason: 'Holiday',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([]);
      mockAppointmentRepository.findByBusinessAndDateRange.mockResolvedValue([]);
      mockBusinessClosureRepository.create.mockResolvedValue(expectedClosure);

      // Act
      const result = await businessClosureService.createClosure(userId, businessId, closureData);

      // Assert
      expect(result).toEqual(expectedClosure);
      expect(mockRbacService.requirePermission).toHaveBeenCalledWith(
        userId,
        PermissionName.MANAGE_OWN_CLOSURES,
        { businessId }
      );
      expect(mockBusinessClosureRepository.create).toHaveBeenCalledWith(businessId, userId, closureData);
    });

    it('should create closure with global permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const closureData: CreateBusinessClosureRequest = {
        startDate: '2024-12-25',
        reason: 'Holiday',
        type: ClosureType.HOLIDAY
      };

      mockRbacService.hasPermission.mockResolvedValue(true);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([]);
      mockAppointmentRepository.findByBusinessAndDateRange.mockResolvedValue([]);
      mockBusinessClosureRepository.create.mockResolvedValue({} as BusinessClosureData);

      // Act
      await businessClosureService.createClosure(userId, businessId, closureData);

      // Assert
      expect(mockRbacService.requirePermission).not.toHaveBeenCalled();
    });

    it('should throw error for past start date', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const closureData: CreateBusinessClosureRequest = {
        startDate: '2020-01-01',
        reason: 'Holiday',
        type: ClosureType.HOLIDAY
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(businessClosureService.createClosure(userId, businessId, closureData))
        .rejects.toThrow('Closure start date cannot be in the past');
    });

    it('should throw error for conflicting closures', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const closureData: CreateBusinessClosureRequest = {
        startDate: '2024-12-25',
        endDate: '2024-12-26',
        reason: 'Holiday',
        type: ClosureType.HOLIDAY
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([{} as BusinessClosureData]);

      // Act & Assert
      await expect(businessClosureService.createClosure(userId, businessId, closureData))
        .rejects.toThrow('Closure period conflicts with existing closure');
    });
  });

  describe('getClosureById', () => {
    it('should return closure by id', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const expectedClosure: BusinessClosureData = {
        id: closureId,
        businessId: 'business-123',
        userId: 'user-123',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Holiday',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(expectedClosure);
      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await businessClosureService.getClosureById(userId, closureId);

      // Assert
      expect(result).toEqual(expectedClosure);
      expect(mockBusinessClosureRepository.findById).toHaveBeenCalledWith(closureId);
    });

    it('should return null if closure not found', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';

      mockBusinessClosureRepository.findById.mockResolvedValue(null);

      // Act
      const result = await businessClosureService.getClosureById(userId, closureId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getBusinessClosures', () => {
    it('should return business closures', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const expectedClosures: BusinessClosureData[] = [
        {
          id: 'closure-1',
          businessId,
          userId: 'user-123',
          startDate: new Date(),
          endDate: new Date(),
          reason: 'Holiday',
          type: ClosureType.HOLIDAY,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findByBusinessId.mockResolvedValue(expectedClosures);

      // Act
      const result = await businessClosureService.getBusinessClosures(userId, businessId);

      // Assert
      expect(result).toEqual(expectedClosures);
      expect(mockBusinessClosureRepository.findByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getActiveClosures', () => {
    it('should return active closures', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const expectedClosures: BusinessClosureData[] = [];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findActiveByBusinessId.mockResolvedValue(expectedClosures);

      // Act
      const result = await businessClosureService.getActiveClosures(userId, businessId);

      // Assert
      expect(result).toEqual(expectedClosures);
      expect(mockBusinessClosureRepository.findActiveByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getUpcomingClosures', () => {
    it('should return upcoming closures', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const expectedClosures: BusinessClosureData[] = [];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findUpcomingByBusinessId.mockResolvedValue(expectedClosures);

      // Act
      const result = await businessClosureService.getUpcomingClosures(userId, businessId);

      // Assert
      expect(result).toEqual(expectedClosures);
      expect(mockBusinessClosureRepository.findUpcomingByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('updateClosure', () => {
    it('should update closure successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const updateData: UpdateBusinessClosureRequest = {
        reason: 'Updated reason'
      };
      const existingClosure: BusinessClosureData = {
        id: closureId,
        businessId: 'business-123',
        userId: 'user-123',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Original reason',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const updatedClosure: BusinessClosureData = {
        ...existingClosure,
        reason: 'Updated reason'
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(existingClosure);
      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.update.mockResolvedValue(updatedClosure);

      // Act
      const result = await businessClosureService.updateClosure(userId, closureId, updateData);

      // Assert
      expect(result).toEqual(updatedClosure);
      expect(mockBusinessClosureRepository.update).toHaveBeenCalledWith(closureId, updateData);
    });

    it('should throw error if closure not found', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const updateData: UpdateBusinessClosureRequest = {
        reason: 'Updated reason'
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(businessClosureService.updateClosure(userId, closureId, updateData))
        .rejects.toThrow('Closure not found');
    });
  });

  describe('deleteClosure', () => {
    it('should delete closure successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const existingClosure: BusinessClosureData = {
        id: closureId,
        businessId: 'business-123',
        userId: 'user-123',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Holiday',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(existingClosure);
      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.delete.mockResolvedValue(undefined);

      // Act
      await businessClosureService.deleteClosure(userId, closureId);

      // Assert
      expect(mockBusinessClosureRepository.delete).toHaveBeenCalledWith(closureId);
    });

    it('should throw error if closure not found', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';

      mockBusinessClosureRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(businessClosureService.deleteClosure(userId, closureId))
        .rejects.toThrow('Closure not found');
    });
  });

  describe('isBusinessClosed', () => {
    it('should check if business is closed', async () => {
      // Arrange
      const businessId = 'business-123';
      const checkDate = new Date();
      const expectedResult = {
        isClosed: true,
        closure: {
          id: 'closure-123',
          businessId,
          userId: 'user-123',
          startDate: new Date(),
          endDate: new Date(),
          reason: 'Holiday',
          type: ClosureType.HOLIDAY,
          createdAt: new Date(),
          updatedAt: new Date()
        } as BusinessClosureData
      };

      mockBusinessClosureRepository.isBusinessClosed.mockResolvedValue(expectedResult);

      // Act
      const result = await businessClosureService.isBusinessClosed(businessId, checkDate);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockBusinessClosureRepository.isBusinessClosed).toHaveBeenCalledWith(businessId, checkDate);
    });
  });

  describe('extendClosure', () => {
    it('should extend closure successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const newEndDate = new Date('2024-12-27');
      const existingClosure: BusinessClosureData = {
        id: closureId,
        businessId: 'business-123',
        userId: 'user-123',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-26'),
        reason: 'Holiday',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const extendedClosure: BusinessClosureData = {
        ...existingClosure,
        endDate: newEndDate
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(existingClosure);
      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([]);
      mockBusinessClosureRepository.extendClosure.mockResolvedValue(extendedClosure);

      // Act
      const result = await businessClosureService.extendClosure(userId, closureId, newEndDate);

      // Assert
      expect(result).toEqual(extendedClosure);
      expect(mockBusinessClosureRepository.extendClosure).toHaveBeenCalledWith(closureId, newEndDate);
    });

    it('should throw error if new end date is before start date', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const newEndDate = new Date('2024-12-24');
      const existingClosure: BusinessClosureData = {
        id: closureId,
        businessId: 'business-123',
        userId: 'user-123',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-26'),
        reason: 'Holiday',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(existingClosure);
      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(businessClosureService.extendClosure(userId, closureId, newEndDate))
        .rejects.toThrow('New end date must be after closure start date');
    });
  });

  describe('endClosureEarly', () => {
    it('should end closure early successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const closureId = 'closure-123';
      const endDate = new Date();
      const existingClosure: BusinessClosureData = {
        id: closureId,
        businessId: 'business-123',
        userId: 'user-123',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        reason: 'Holiday',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const endedClosure: BusinessClosureData = {
        ...existingClosure,
        endDate
      };

      mockBusinessClosureRepository.findById.mockResolvedValue(existingClosure);
      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.endClosureEarly.mockResolvedValue(endedClosure);

      // Act
      const result = await businessClosureService.endClosureEarly(userId, closureId, endDate);

      // Assert
      expect(result).toEqual(endedClosure);
      expect(mockBusinessClosureRepository.endClosureEarly).toHaveBeenCalledWith(closureId, endDate);
    });
  });

  describe('getClosuresByDateRange', () => {
    it('should return closures by date range', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-31');
      const expectedClosures: BusinessClosureData[] = [];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findByDateRange.mockResolvedValue(expectedClosures);

      // Act
      const result = await businessClosureService.getClosuresByDateRange(userId, businessId, startDate, endDate);

      // Assert
      expect(result).toEqual(expectedClosures);
      expect(mockBusinessClosureRepository.findByDateRange).toHaveBeenCalledWith(businessId, startDate, endDate);
    });
  });

  describe('getClosuresByType', () => {
    it('should return closures by type', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const type = ClosureType.HOLIDAY;
      const expectedClosures: BusinessClosureData[] = [];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findByType.mockResolvedValue(expectedClosures);

      // Act
      const result = await businessClosureService.getClosuresByType(userId, businessId, type);

      // Assert
      expect(result).toEqual(expectedClosures);
      expect(mockBusinessClosureRepository.findByType).toHaveBeenCalledWith(businessId, type);
    });
  });

  describe('getClosureStats', () => {
    it('should return closure statistics', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const year = 2024;
      const expectedStats = {
        totalClosures: 5,
        totalDaysClosed: 10,
        closuresByType: {
          [ClosureType.HOLIDAY]: 3,
          [ClosureType.MAINTENANCE]: 2,
          [ClosureType.EMERGENCY]: 0
        },
        averageClosureDuration: 2
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.getClosureStats.mockResolvedValue(expectedStats);

      // Act
      const result = await businessClosureService.getClosureStats(userId, businessId, year);

      // Assert
      expect(result).toEqual(expectedStats);
      expect(mockBusinessClosureRepository.getClosureStats).toHaveBeenCalledWith(businessId, year);
    });
  });

  describe('createRecurringHoliday', () => {
    it('should create recurring holiday', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const name = 'Christmas';
      const startDate = new Date('2024-12-25');
      const endDate = new Date('2024-12-26');
      const expectedClosure: BusinessClosureData = {
        id: 'closure-123',
        businessId,
        userId,
        startDate,
        endDate,
        reason: 'Holiday: Christmas',
        type: ClosureType.HOLIDAY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.create.mockResolvedValue(expectedClosure);

      // Act
      const result = await businessClosureService.createRecurringHoliday(userId, businessId, name, startDate, endDate);

      // Assert
      expect(result).toEqual(expectedClosure);
      expect(mockBusinessClosureRepository.create).toHaveBeenCalledWith(businessId, userId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: 'Holiday: Christmas',
        type: ClosureType.HOLIDAY
      });
    });
  });

  describe('getRecurringHolidays', () => {
    it('should return recurring holidays', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const expectedHolidays: BusinessClosureData[] = [];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findRecurringHolidays.mockResolvedValue(expectedHolidays);

      // Act
      const result = await businessClosureService.getRecurringHolidays(userId, businessId);

      // Assert
      expect(result).toEqual(expectedHolidays);
      expect(mockBusinessClosureRepository.findRecurringHolidays).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getAffectedAppointments', () => {
    it('should return affected appointments', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const startDate = new Date('2024-12-25');
      const endDate = new Date('2024-12-26');
      const expectedAppointments = [
        { id: 'appointment-1', status: 'CONFIRMED' },
        { id: 'appointment-2', status: 'CONFIRMED' }
      ];

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockAppointmentRepository.findByBusinessAndDateRange.mockResolvedValue(expectedAppointments);

      // Act
      const result = await businessClosureService.getAffectedAppointments(userId, businessId, startDate, endDate);

      // Assert
      expect(result).toEqual(expectedAppointments);
      expect(mockAppointmentRepository.findByBusinessAndDateRange).toHaveBeenCalledWith(
        businessId,
        startDate,
        endDate
      );
    });
  });

  describe('autoExpireClosures', () => {
    it('should auto expire closures', async () => {
      // Arrange
      const expectedCount = 5;
      mockBusinessClosureRepository.autoExpireClosures.mockResolvedValue(expectedCount);

      // Act
      const result = await businessClosureService.autoExpireClosures();

      // Assert
      expect(result).toBe(expectedCount);
      expect(mockBusinessClosureRepository.autoExpireClosures).toHaveBeenCalled();
    });
  });

  describe('createEmergencyClosure', () => {
    it('should create emergency closure', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const reason = 'Power outage';
      const startDate = new Date();
      const durationHours = 4;
      const expectedClosure: BusinessClosureData = {
        id: 'closure-123',
        businessId,
        userId,
        startDate,
        endDate: new Date(startDate.getTime() + durationHours * 60 * 60 * 1000),
        reason: 'Emergency: Power outage',
        type: ClosureType.EMERGENCY,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.create.mockResolvedValue(expectedClosure);

      // Act
      const result = await businessClosureService.createEmergencyClosure(userId, businessId, reason, startDate, durationHours);

      // Assert
      expect(result).toEqual(expectedClosure);
      expect(mockBusinessClosureRepository.create).toHaveBeenCalledWith(businessId, userId, {
        startDate: startDate.toISOString(),
        endDate: new Date(startDate.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
        reason: 'Emergency: Power outage',
        type: ClosureType.EMERGENCY
      });
    });
  });

  describe('createMaintenanceClosure', () => {
    it('should create maintenance closure', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const description = 'System upgrade';
      const startDate = new Date('2024-12-25');
      const estimatedHours = 8;
      const expectedClosure: BusinessClosureData = {
        id: 'closure-123',
        businessId,
        userId,
        startDate,
        endDate: new Date(startDate.getTime() + estimatedHours * 60 * 60 * 1000),
        reason: 'Maintenance: System upgrade',
        type: ClosureType.MAINTENANCE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.create.mockResolvedValue(expectedClosure);

      // Act
      const result = await businessClosureService.createMaintenanceClosure(userId, businessId, description, startDate, estimatedHours);

      // Assert
      expect(result).toEqual(expectedClosure);
      expect(mockBusinessClosureRepository.create).toHaveBeenCalledWith(businessId, userId, {
        startDate: startDate.toISOString(),
        endDate: new Date(startDate.getTime() + estimatedHours * 60 * 60 * 1000).toISOString(),
        reason: 'Maintenance: System upgrade',
        type: ClosureType.MAINTENANCE
      });
    });
  });

  describe('getClosuresCalendar', () => {
    it('should return closures calendar for year', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const year = 2024;
      const expectedResult = {
        closures: [],
        totalDaysInPeriod: 366,
        closedDays: 0,
        openDays: 366
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findByDateRange.mockResolvedValue([]);

      // Act
      const result = await businessClosureService.getClosuresCalendar(userId, businessId, year);

      // Assert
      expect(result).toEqual(expectedResult);
    });

    it('should return closures calendar for specific month', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const year = 2024;
      const month = 12;
      const expectedResult = {
        closures: [],
        totalDaysInPeriod: 31,
        closedDays: 0,
        openDays: 31
      };

      mockRbacService.hasPermission.mockResolvedValue(false);
      mockRbacService.requirePermission.mockResolvedValue(undefined);
      mockBusinessClosureRepository.findByDateRange.mockResolvedValue([]);

      // Act
      const result = await businessClosureService.getClosuresCalendar(userId, businessId, year, month);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});

