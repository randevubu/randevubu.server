import { Request, Response } from 'express';
import { AppointmentController } from '../../../src/controllers/appointmentController';
import { AppointmentService } from '../../../src/services/appointmentService';
import { TestHelpers } from '../../utils/testHelpers';
import { AppointmentStatus } from '../../../src/types/business';
import { AuthenticatedRequest } from '../../../src/types/auth';
import { BusinessContextRequest } from '../../../src/middleware/businessContext';

// Mock dependencies
jest.mock('../../../src/services/appointmentService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('AppointmentController', () => {
  let appointmentController: AppointmentController;
  let mockAppointmentService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock AppointmentService
    mockAppointmentService = {
      getMyAppointments: jest.fn(),
      createAppointment: jest.fn(),
      getAppointmentById: jest.fn(),
      getCustomerAppointments: jest.fn(),
      getBusinessAppointments: jest.fn(),
      searchAppointments: jest.fn(),
      updateAppointment: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      cancelAppointment: jest.fn(),
      confirmAppointment: jest.fn(),
      completeAppointment: jest.fn(),
      markNoShow: jest.fn(),
      getUpcomingAppointments: jest.fn(),
      getTodaysAppointments: jest.fn(),
      getAppointmentStats: jest.fn(),
      getAllAppointments: jest.fn(),
      batchUpdateAppointmentStatus: jest.fn(),
      batchCancelAppointments: jest.fn(),
      getAppointmentsByDateRange: jest.fn(),
      getAppointmentsByStatus: jest.fn(),
      getAppointmentsByService: jest.fn(),
      getAppointmentsByStaff: jest.fn(),
      getNearestAppointmentInCurrentHour: jest.fn(),
      getAppointmentsInCurrentHour: jest.fn()
    };

    // Create AppointmentController instance
    appointmentController = new AppointmentController(mockAppointmentService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = { id: 'user-123', phoneNumber: '+905551234567', isVerified: true, isActive: true };
    mockBusinessContextRequest.businessContext = { businessId: 'business-123', businessName: 'Test Business' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create AppointmentController instance', () => {
      expect(appointmentController).toBeInstanceOf(AppointmentController);
    });
  });

  describe('getMyAppointments', () => {
    it('should get user appointments successfully', async () => {
      // Arrange
      const mockAppointments = {
        appointments: [
          { id: 'appointment-1', date: '2024-01-15', status: AppointmentStatus.CONFIRMED },
          { id: 'appointment-2', date: '2024-01-16', status: AppointmentStatus.CONFIRMED }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      mockAppointmentService.getMyAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getMyAppointments(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getMyAppointments).toHaveBeenCalledWith('user-123', {
        status: undefined,
        date: undefined,
        businessId: undefined,
        page: undefined,
        limit: undefined
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });

    it('should handle query parameters correctly', async () => {
      // Arrange
      mockBusinessContextRequest.query = {
        status: AppointmentStatus.CONFIRMED,
        date: '2024-01-15',
        businessId: 'business-123',
        page: '1',
        limit: '10'
      };

      const mockAppointments = { appointments: [], total: 0, page: 1, totalPages: 0 };
      mockAppointmentService.getMyAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getMyAppointments(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getMyAppointments).toHaveBeenCalledWith('user-123', {
        status: AppointmentStatus.CONFIRMED,
        date: '2024-01-15',
        businessId: 'business-123',
        page: 1,
        limit: 10
      });
    });
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      // Arrange
      const appointmentData = {
        serviceId: 'service-123',
        businessId: 'business-123',
        staffId: 'staff-123',
        customerId: 'customer-123',
        date: '2024-01-15',
        startTime: '10:00',
        customerNotes: 'Test appointment'
      };

      mockRequest.body = appointmentData;

      const mockAppointment = {
        id: 'appointment-123',
        ...appointmentData,
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentService.createAppointment.mockResolvedValue(mockAppointment);

      // Act
      await appointmentController.createAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.createAppointment).toHaveBeenCalledWith('user-123', appointmentData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointment
      });
    });
  });

  describe('getAppointmentById', () => {
    it('should get appointment by id successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      mockRequest.params = { id: appointmentId };

      const mockAppointment = {
        id: appointmentId,
        customerId: 'customer-123',
        serviceId: 'service-123',
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentService.getAppointmentById.mockResolvedValue(mockAppointment);

      // Act
      await appointmentController.getAppointmentById(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentById).toHaveBeenCalledWith('user-123', appointmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointment
      });
    });
  });

  describe('getCustomerAppointments', () => {
    it('should get customer appointments successfully', async () => {
      // Arrange
      const customerId = 'customer-123';
      mockRequest.params = { customerId };

      const mockAppointments = [
        { id: 'appointment-1', customerId: 'customer-123' },
        { id: 'appointment-2', customerId: 'customer-123' }
      ];

      mockAppointmentService.getCustomerAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getCustomerAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getCustomerAppointments).toHaveBeenCalledWith('user-123', customerId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getBusinessAppointments', () => {
    it('should get business appointments successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockRequest.params = { businessId };

      const mockAppointments = [
        { id: 'appointment-1', businessId: 'business-123' },
        { id: 'appointment-2', businessId: 'business-123' }
      ];

      mockAppointmentService.getBusinessAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getBusinessAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getBusinessAppointments).toHaveBeenCalledWith('user-123', businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('searchAppointments', () => {
    it('should search appointments successfully', async () => {
      // Arrange
      const searchFilters = {
        businessId: 'business-123',
        status: AppointmentStatus.CONFIRMED,
        date: '2024-01-15'
      };

      mockRequest.body = searchFilters;

      const mockResults = {
        appointments: [{ id: 'appointment-1', businessId: 'business-123' }],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockAppointmentService.searchAppointments.mockResolvedValue(mockResults);

      // Act
      await appointmentController.searchAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.searchAppointments).toHaveBeenCalledWith('user-123', searchFilters, 1, 20);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResults
      });
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      const updateData = {
        date: '2024-01-16',
        startTime: '11:00',
        customerNotes: 'Updated appointment'
      };

      mockRequest.params = { id: appointmentId };
      mockRequest.body = updateData;

      const mockUpdatedAppointment = {
        id: appointmentId,
        ...updateData,
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentService.updateAppointment.mockResolvedValue(mockUpdatedAppointment);

      // Act
      await appointmentController.updateAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalledWith('user-123', appointmentId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedAppointment
      });
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      const status = AppointmentStatus.CONFIRMED;

      mockRequest.params = { id: appointmentId };
      mockRequest.body = { status };

      const mockUpdatedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentService.updateAppointmentStatus.mockResolvedValue(mockUpdatedAppointment);

      // Act
      await appointmentController.updateAppointmentStatus(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.updateAppointmentStatus).toHaveBeenCalledWith('user-123', appointmentId, status);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedAppointment
      });
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      const reason = 'Customer requested cancellation';

      mockRequest.params = { id: appointmentId };
      mockRequest.body = { reason };

      const mockCancelledAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CANCELED,
        cancellationReason: reason
      };

      mockAppointmentService.cancelAppointment.mockResolvedValue(mockCancelledAppointment);

      // Act
      await appointmentController.cancelAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith('user-123', appointmentId, reason);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledAppointment
      });
    });
  });

  describe('confirmAppointment', () => {
    it('should confirm appointment successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      mockRequest.params = { id: appointmentId };

      const mockConfirmedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.CONFIRMED
      };

      mockAppointmentService.confirmAppointment.mockResolvedValue(mockConfirmedAppointment);

      // Act
      await appointmentController.confirmAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.confirmAppointment).toHaveBeenCalledWith('user-123', appointmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockConfirmedAppointment
      });
    });
  });

  describe('completeAppointment', () => {
    it('should complete appointment successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      mockRequest.params = { id: appointmentId };

      const mockCompletedAppointment = {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED
      };

      mockAppointmentService.completeAppointment.mockResolvedValue(mockCompletedAppointment);

      // Act
      await appointmentController.completeAppointment(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.completeAppointment).toHaveBeenCalledWith('user-123', appointmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompletedAppointment
      });
    });
  });

  describe('markNoShow', () => {
    it('should mark appointment as no-show successfully', async () => {
      // Arrange
      const appointmentId = 'appointment-123';
      mockRequest.params = { id: appointmentId };

      const mockNoShowAppointment = {
        id: appointmentId,
        status: AppointmentStatus.NO_SHOW
      };

      mockAppointmentService.markNoShow.mockResolvedValue(mockNoShowAppointment);

      // Act
      await appointmentController.markNoShow(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.markNoShow).toHaveBeenCalledWith('user-123', appointmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNoShowAppointment
      });
    });
  });

  describe('getUpcomingAppointments', () => {
    it('should get upcoming appointments successfully', async () => {
      // Arrange
      const mockAppointments = [
        { id: 'appointment-1', date: '2024-01-16' },
        { id: 'appointment-2', date: '2024-01-17' }
      ];

      mockAppointmentService.getUpcomingAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getUpcomingAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getUpcomingAppointments).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getTodaysAppointments', () => {
    it('should get today appointments successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockBusinessContextRequest.params = { businessId };

      const mockAppointments = [
        { id: 'appointment-1', date: '2024-01-15' },
        { id: 'appointment-2', date: '2024-01-15' }
      ];

      mockAppointmentService.getTodaysAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getTodaysAppointments(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getTodaysAppointments).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getAppointmentStats', () => {
    it('should get appointment statistics successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      mockBusinessContextRequest.params = { businessId };

      const mockStats = {
        total: 100,
        confirmed: 80,
        cancelled: 15,
        noShow: 5
      };

      mockAppointmentService.getAppointmentStats.mockResolvedValue(mockStats);

      // Act
      await appointmentController.getAppointmentStats(mockBusinessContextRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentStats).toHaveBeenCalledWith('user-123', 'business-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getAllAppointments', () => {
    it('should get all appointments for admin successfully', async () => {
      // Arrange
      const mockAppointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' }
      ];

      mockAppointmentService.getAllAppointments.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getAllAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAllAppointments).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('batchUpdateAppointmentStatus', () => {
    it('should batch update appointment status successfully', async () => {
      // Arrange
      const appointmentIds = ['appointment-1', 'appointment-2'];
      const status = AppointmentStatus.CONFIRMED;

      mockRequest.body = { appointmentIds, status };

      mockAppointmentService.batchUpdateAppointmentStatus.mockResolvedValue(undefined);

      // Act
      await appointmentController.batchUpdateAppointmentStatus(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.batchUpdateAppointmentStatus).toHaveBeenCalledWith('user-123', appointmentIds, status);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Appointment statuses updated successfully'
      });
    });
  });

  describe('batchCancelAppointments', () => {
    it('should batch cancel appointments successfully', async () => {
      // Arrange
      const appointmentIds = ['appointment-1', 'appointment-2'];
      const reason = 'Batch cancellation';

      mockRequest.body = { appointmentIds, reason };

      mockAppointmentService.batchCancelAppointments.mockResolvedValue(undefined);

      // Act
      await appointmentController.batchCancelAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.batchCancelAppointments).toHaveBeenCalledWith('user-123', appointmentIds, reason);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Appointments cancelled successfully'
      });
    });
  });

  describe('getAppointmentsByDateRange', () => {
    it('should get appointments by date range successfully', async () => {
      // Arrange
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const businessId = 'business-123';

      mockRequest.query = { startDate, endDate, businessId };

      const mockAppointments = [
        { id: 'appointment-1', date: '2024-01-15' },
        { id: 'appointment-2', date: '2024-01-20' }
      ];

      mockAppointmentService.getAppointmentsByDateRange.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getAppointmentsByDateRange(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentsByDateRange).toHaveBeenCalledWith('user-123', startDate, endDate, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getAppointmentsByStatus', () => {
    it('should get appointments by status successfully', async () => {
      // Arrange
      const status = AppointmentStatus.CONFIRMED;
      const businessId = 'business-123';

      mockRequest.query = { status, businessId };

      const mockAppointments = [
        { id: 'appointment-1', status: AppointmentStatus.CONFIRMED },
        { id: 'appointment-2', status: AppointmentStatus.CONFIRMED }
      ];

      mockAppointmentService.getAppointmentsByStatus.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getAppointmentsByStatus(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentsByStatus).toHaveBeenCalledWith('user-123', status, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getAppointmentsByService', () => {
    it('should get appointments by service successfully', async () => {
      // Arrange
      const serviceId = 'service-123';
      const businessId = 'business-123';

      mockRequest.query = { serviceId, businessId };

      const mockAppointments = [
        { id: 'appointment-1', serviceId: 'service-123' },
        { id: 'appointment-2', serviceId: 'service-123' }
      ];

      mockAppointmentService.getAppointmentsByService.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getAppointmentsByService(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentsByService).toHaveBeenCalledWith('user-123', serviceId, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getAppointmentsByStaff', () => {
    it('should get appointments by staff successfully', async () => {
      // Arrange
      const staffId = 'staff-123';
      const businessId = 'business-123';

      mockRequest.query = { staffId, businessId };

      const mockAppointments = [
        { id: 'appointment-1', staffId: 'staff-123' },
        { id: 'appointment-2', staffId: 'staff-123' }
      ];

      mockAppointmentService.getAppointmentsByStaff.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getAppointmentsByStaff(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentsByStaff).toHaveBeenCalledWith('user-123', staffId, businessId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });

  describe('getNearestCurrentHour', () => {
    it('should get nearest appointment in current hour successfully', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appointment-123',
        date: '2024-01-15',
        startTime: '10:30'
      };

      mockAppointmentService.getNearestAppointmentInCurrentHour.mockResolvedValue(mockAppointment);

      // Act
      await appointmentController.getNearestCurrentHour(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getNearestAppointmentInCurrentHour).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointment
      });
    });
  });

  describe('getCurrentHourAppointments', () => {
    it('should get appointments in current hour successfully', async () => {
      // Arrange
      const mockAppointments = [
        { id: 'appointment-1', date: '2024-01-15', startTime: '10:00' },
        { id: 'appointment-2', date: '2024-01-15', startTime: '10:30' }
      ];

      mockAppointmentService.getAppointmentsInCurrentHour.mockResolvedValue(mockAppointments);

      // Act
      await appointmentController.getCurrentHourAppointments(mockRequest, mockResponse);

      // Assert
      expect(mockAppointmentService.getAppointmentsInCurrentHour).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments
      });
    });
  });
});
