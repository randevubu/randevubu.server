import { AppointmentService } from '../../../src/services/appointmentService';
import { AppointmentRepository } from '../../../src/repositories/appointmentRepository';
import { ServiceRepository } from '../../../src/repositories/serviceRepository';
import { UserBehaviorRepository } from '../../../src/repositories/userBehaviorRepository';
import { BusinessClosureRepository } from '../../../src/repositories/businessClosureRepository';
import { RBACService } from '../../../src/services/rbacService';
import { BusinessService } from '../../../src/services/businessService';
import { NotificationService } from '../../../src/services/notificationService';
import { UsageService } from '../../../src/services/usageService';
import { RepositoryContainer } from '../../../src/repositories';
import { TestHelpers } from '../../utils/testHelpers';
import { testAppointments, testServices } from '../../fixtures/testData';
import { PermissionName } from '../../../src/types/auth';
import { AppointmentStatus } from '../../../src/types/business';

// Mock dependencies
jest.mock('../../../src/repositories/appointmentRepository');
jest.mock('../../../src/repositories/serviceRepository');
jest.mock('../../../src/repositories/userBehaviorRepository');
jest.mock('../../../src/repositories/businessClosureRepository');
jest.mock('../../../src/services/rbacService');
jest.mock('../../../src/services/businessService');
jest.mock('../../../src/services/notificationService');
jest.mock('../../../src/services/usageService');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/timezoneHelper');

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockAppointmentRepository: any;
  let mockServiceRepository: any;
  let mockUserBehaviorRepository: any;
  let mockBusinessClosureRepository: any;
  let mockRBACService: any;
  let mockBusinessService: any;
  let mockNotificationService: any;
  let mockUsageService: any;
  let mockRepositories: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockAppointmentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      findByUserId: jest.fn(),
      findByBusinessId: jest.fn(),
      search: jest.fn(),
      findPublic: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      markNoShow: jest.fn(),
      getUpcoming: jest.fn(),
      getNearestInCurrentHour: jest.fn(),
      getInCurrentHour: jest.fn(),
      markReminderSent: jest.fn(),
      getTodays: jest.fn(),
      getStats: jest.fn(),
      getMyTodays: jest.fn(),
      getMyStats: jest.fn(),
      confirm: jest.fn(),
      complete: jest.fn(),
      getAll: jest.fn(),
      batchUpdateStatus: jest.fn(),
      batchCancel: jest.fn()
    };

    mockServiceRepository = {
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findPublicByBusinessId: jest.fn()
    };

    mockUserBehaviorRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findByUserId: jest.fn()
    };

    mockBusinessClosureRepository = {
      findConflictingClosures: jest.fn(),
      findActiveClosures: jest.fn()
    };

    mockRBACService = {
      requirePermission: jest.fn(),
      hasPermission: jest.fn(),
      getUserPermissions: jest.fn().mockResolvedValue({
        roles: [{ name: 'OWNER', level: 50, displayName: 'Owner' }],
        permissions: []
      })
    };

    mockBusinessService = {
      getBusinessById: jest.fn(),
      getBusinessHoursStatus: jest.fn()
    };

    mockNotificationService = {
      sendAppointmentReminder: jest.fn(),
      notifyNewAppointment: jest.fn()
    };

    mockUsageService = {
      recordAppointmentUsage: jest.fn(),
      canAddCustomer: jest.fn().mockResolvedValue({ allowed: true })
    };

    mockRepositories = {
      userRepository: {
        findById: jest.fn()
      }
    };

    // Create AppointmentService instance
    appointmentService = new AppointmentService(
      mockAppointmentRepository,
      mockServiceRepository,
      mockUserBehaviorRepository,
      mockBusinessClosureRepository,
      mockRBACService,
      mockBusinessService,
      mockNotificationService,
      mockUsageService,
      mockRepositories
    );
  });

  describe('constructor', () => {
    it('should create AppointmentService instance', () => {
      expect(appointmentService).toBeInstanceOf(AppointmentService);
    });
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentData = {
        serviceId: 'service-123',
        businessId: 'business-123',
        staffId: 'staff-123',
        customerId: 'customer-123',
        date: '2024-01-15',
        startTime: '10:00',
        customerNotes: 'Test appointment'
      };

      const mockService = {
        id: 'service-123',
        businessId: 'business-123',
        duration: 60,
        price: 100,
        isActive: true
      };

      const mockAppointment = {
        id: 'appointment-123',
        ...appointmentData,
        status: AppointmentStatus.CONFIRMED,
        createdAt: new Date()
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(mockAppointment);
      mockUsageService.canAddCustomer.mockResolvedValue({ allowed: true });

      // Act
      const result = await appointmentService.createAppointment(userId, appointmentData);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockServiceRepository.findById).toHaveBeenCalledWith(appointmentData.serviceId);
      expect(mockAppointmentRepository.create).toHaveBeenCalled();
      expect(mockUsageService.recordAppointmentUsage).toHaveBeenCalledWith(appointmentData.businessId);
    });

    it('should throw error when service not found', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentData = {
        serviceId: 'service-999',
        businessId: 'business-123',
        staffId: 'staff-123',
        customerId: 'customer-123',
        date: '2024-01-15',
        startTime: '10:00'
      };

      mockServiceRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(appointmentService.createAppointment(userId, appointmentData))
        .rejects.toThrow('Service not found');
    });

    it('should throw error when service is inactive', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentData = {
        serviceId: 'service-123',
        businessId: 'business-123',
        staffId: 'staff-123',
        customerId: 'customer-123',
        date: '2024-01-15',
        startTime: '10:00'
      };

      const mockService = {
        id: 'service-123',
        businessId: 'business-123',
        duration: 60,
        price: 100,
        isActive: false
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);

      // Act & Assert
      await expect(appointmentService.createAppointment(userId, appointmentData))
        .rejects.toThrow('Service is not active');
    });

    it('should throw error when business is closed', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentData = {
        serviceId: 'service-123',
        businessId: 'business-123',
        staffId: 'staff-123',
        customerId: 'customer-123',
        date: '2024-01-15',
        startTime: '10:00'
      };

      const mockService = {
        id: 'service-123',
        businessId: 'business-123',
        duration: 60,
        price: 100,
        isActive: true
      };

      const mockClosure = {
        id: 'closure-123',
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-15'),
        isActive: true
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([mockClosure]);

      // Act & Assert
      await expect(appointmentService.createAppointment(userId, appointmentData))
        .rejects.toThrow('Business is closed on this date');
    });

    it('should throw error when usage limit exceeded', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentData = {
        serviceId: 'service-123',
        businessId: 'business-123',
        staffId: 'staff-123',
        customerId: 'customer-123',
        date: '2024-01-15',
        startTime: '10:00'
      };

      const mockService = {
        id: 'service-123',
        businessId: 'business-123',
        duration: 60,
        price: 100,
        isActive: true
      };

      mockServiceRepository.findById.mockResolvedValue(mockService);
      mockBusinessClosureRepository.findConflictingClosures.mockResolvedValue([]);
      mockUsageService.canAddCustomer.mockResolvedValue({ 
        allowed: false, 
        reason: 'Customer limit exceeded' 
      });

      // Act & Assert
      await expect(appointmentService.createAppointment(userId, appointmentData))
        .rejects.toThrow('Customer limit exceeded');
    });
  });

  describe('getAppointmentById', () => {
    it('should return appointment when found', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-123';
      const mockAppointment = {
        id: appointmentId,
        customerId: 'customer-123',
        serviceId: 'service-123',
        businessId: 'business-123',
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getAppointmentById(userId, appointmentId);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.findById).toHaveBeenCalledWith(appointmentId);
    });

    it('should throw error when appointment not found', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-999';

      mockAppointmentRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(appointmentService.getAppointmentById(userId, appointmentId))
        .rejects.toThrow('Appointment not found');
    });
  });

  describe('getCustomerAppointments', () => {
    it('should return customer appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const customerId = 'customer-123';
      const mockAppointments = [
        { id: 'appointment-1', customerId: 'customer-123' },
        { id: 'appointment-2', customerId: 'customer-123' }
      ];

      mockAppointmentRepository.findByCustomerId.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getCustomerAppointments(userId, customerId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.findByCustomerId).toHaveBeenCalledWith(customerId);
    });
  });

  describe('getMyAppointments', () => {
    it('should return user appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAppointments = [
        { id: 'appointment-1', customerId: userId },
        { id: 'appointment-2', customerId: userId }
      ];

      mockAppointmentRepository.findByUserId.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getMyAppointments(userId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.findByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('getBusinessAppointments', () => {
    it('should return business appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockAppointments = [
        { id: 'appointment-1', businessId: 'business-123' },
        { id: 'appointment-2', businessId: 'business-123' }
      ];

      mockAppointmentRepository.findByBusinessId.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getBusinessAppointments(userId, businessId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.findByBusinessId).toHaveBeenCalledWith(businessId);
    });
  });

  describe('searchAppointments', () => {
    it('should search appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const filters = {
        businessId: 'business-123',
        status: AppointmentStatus.CONFIRMED
      };
      const mockResults = {
        appointments: [
          { id: 'appointment-1', businessId: 'business-123' }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockAppointmentRepository.search.mockResolvedValue(mockResults);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.searchAppointments(userId, filters, 1, 20);

      // Assert
      expect(result).toEqual(mockResults);
      expect(mockAppointmentRepository.search).toHaveBeenCalledWith(filters, 1, 20);
    });
  });

  describe('getPublicAppointments', () => {
    it('should return public appointments successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const mockAppointments = [
        { id: 'appointment-1', businessId: 'business-123', isPublic: true }
      ];

      mockAppointmentRepository.findPublic.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentService.getPublicAppointments({ businessId });

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.findPublic).toHaveBeenCalledWith(businessId);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-123';
      const updateData = {
        date: '2024-01-16',
        startTime: '11:00',
        customerNotes: 'Updated appointment'
      };

      const mockAppointment = {
        id: appointmentId,
        ...updateData,
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.update.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.updateAppointment(userId, appointmentId, updateData);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.update).toHaveBeenCalledWith(appointmentId, updateData);
    });

    it('should throw error when appointment not found', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-999';
      const updateData = { customerNotes: 'Updated appointment' };

      mockAppointmentRepository.findById.mockResolvedValue(null);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act & Assert
      await expect(appointmentService.updateAppointment(userId, appointmentId, updateData))
        .rejects.toThrow('Appointment not found');
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-123';
      const reason = 'Customer requested cancellation';

      const mockAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CANCELED,
        cancellationReason: reason
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.cancel.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.cancelAppointment(userId, appointmentId, reason);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.cancel).toHaveBeenCalledWith(appointmentId, reason);
    });
  });

  describe('markNoShow', () => {
    it('should mark appointment as no-show successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-123';

      const mockAppointment = {
        id: appointmentId,
        status: AppointmentStatus.NO_SHOW
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.markNoShow.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.markNoShow(userId, appointmentId);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.markNoShow).toHaveBeenCalledWith(appointmentId);
    });
  });

  describe('getUpcomingAppointments', () => {
    it('should return upcoming appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAppointments = [
        { id: 'appointment-1', appointmentDate: '2024-01-16' },
        { id: 'appointment-2', appointmentDate: '2024-01-17' }
      ];

      mockAppointmentRepository.getUpcoming.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getUpcomingAppointments(userId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.getUpcoming).toHaveBeenCalledWith(userId);
    });
  });

  describe('getNearestAppointmentInCurrentHour', () => {
    it('should return nearest appointment in current hour', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAppointment = {
        id: 'appointment-123',
        appointmentDate: '2024-01-15',
        startTime: '10:30'
      };

      mockAppointmentRepository.getNearestInCurrentHour.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getNearestAppointmentInCurrentHour(userId);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.getNearestInCurrentHour).toHaveBeenCalledWith(userId);
    });
  });

  describe('getAppointmentsInCurrentHour', () => {
    it('should return appointments in current hour', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAppointments = [
        { id: 'appointment-1', appointmentDate: '2024-01-15', startTime: '10:00' },
        { id: 'appointment-2', appointmentDate: '2024-01-15', startTime: '10:30' }
      ];

      mockAppointmentRepository.getInCurrentHour.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getAppointmentsInCurrentHour(userId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.getInCurrentHour).toHaveBeenCalledWith(userId);
    });
  });

  describe('markReminderSent', () => {
    it('should mark reminder as sent successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';

      mockAppointmentRepository.markReminderSent.mockResolvedValue(undefined);

      // Act
      await appointmentService.markReminderSent(appointmentId);

      // Assert
      expect(mockAppointmentRepository.markReminderSent).toHaveBeenCalledWith(appointmentId);
    });
  });

  describe('getTodaysAppointments', () => {
    it('should return today appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockAppointments = [
        { id: 'appointment-1', appointmentDate: '2024-01-15' },
        { id: 'appointment-2', appointmentDate: '2024-01-15' }
      ];

      mockAppointmentRepository.getTodays.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getTodaysAppointments(userId, businessId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.getTodays).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getAppointmentStats', () => {
    it('should return appointment statistics successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const mockStats = {
        total: 100,
        confirmed: 80,
        cancelled: 15,
        noShow: 5
      };

      mockAppointmentRepository.getStats.mockResolvedValue(mockStats);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getAppointmentStats(userId, businessId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockAppointmentRepository.getStats).toHaveBeenCalledWith(businessId);
    });
  });

  describe('getMyTodaysAppointments', () => {
    it('should return user today appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAppointments = [
        { id: 'appointment-1', customerId: userId, appointmentDate: '2024-01-15' }
      ];

      mockAppointmentRepository.getMyTodays.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getMyTodaysAppointments(userId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.getMyTodays).toHaveBeenCalledWith(userId);
    });
  });

  describe('getMyAppointmentStats', () => {
    it('should return user appointment statistics successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStats = {
        total: 50,
        confirmed: 40,
        cancelled: 8,
        noShow: 2
      };

      mockAppointmentRepository.getMyStats.mockResolvedValue(mockStats);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getMyAppointmentStats(userId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockAppointmentRepository.getMyStats).toHaveBeenCalledWith(userId);
    });
  });

  describe('confirmAppointment', () => {
    it('should confirm appointment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-123';

      const mockAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.confirm.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.confirmAppointment(userId, appointmentId);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.confirm).toHaveBeenCalledWith(appointmentId);
    });
  });

  describe('completeAppointment', () => {
    it('should complete appointment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentId = 'appointment-123';

      const mockAppointment = {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED
      };

      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.complete.mockResolvedValue(mockAppointment);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.completeAppointment(userId, appointmentId);

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.complete).toHaveBeenCalledWith(appointmentId);
    });
  });

  describe('getAllAppointments', () => {
    it('should return all appointments for admin', async () => {
      // Arrange
      const userId = 'admin-123';
      const mockAppointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' }
      ];

      mockAppointmentRepository.getAll.mockResolvedValue(mockAppointments);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      const result = await appointmentService.getAllAppointments(userId);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockAppointmentRepository.getAll).toHaveBeenCalled();
    });
  });

  describe('batchUpdateAppointmentStatus', () => {
    it('should batch update appointment status successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentIds = ['appointment-1', 'appointment-2'];
      const status = AppointmentStatus.CONFIRMED;

      mockAppointmentRepository.batchUpdateStatus.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await appointmentService.batchUpdateAppointmentStatus(userId, appointmentIds, status);

      // Assert
      expect(mockAppointmentRepository.batchUpdateStatus).toHaveBeenCalledWith(appointmentIds, status);
    });
  });

  describe('batchCancelAppointments', () => {
    it('should batch cancel appointments successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const appointmentIds = ['appointment-1', 'appointment-2'];
      const reason = 'Batch cancellation';

      mockAppointmentRepository.batchCancel.mockResolvedValue(undefined);
      mockRBACService.requirePermission.mockResolvedValue(undefined);

      // Act
      await appointmentService.batchCancelAppointments(userId, appointmentIds, reason);

      // Assert
      expect(mockAppointmentRepository.batchCancel).toHaveBeenCalledWith(appointmentIds, reason);
    });
  });

  describe('splitPermissionName', () => {
    it('should split permission name correctly', () => {
      // Arrange
      const permissionName = 'appointment:create';
      
      // Act
      const result = (appointmentService as any).splitPermissionName(permissionName);

      // Assert
      expect(result).toEqual({ resource: 'appointment', action: 'create' });
    });
  });
});
