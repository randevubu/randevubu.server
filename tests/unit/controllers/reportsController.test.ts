import { Request, Response } from 'express';
import { ReportsController } from '../../../src/controllers/reportsController';
import { ReportsService } from '../../../src/services/reportsService';
import { TestHelpers } from '../../utils/testHelpers';
import { BusinessContextRequest, AuthenticatedRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/reportsService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('ReportsController', () => {
  let reportsController: ReportsController;
  let mockReportsService: any;
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Response;
  let mockBusinessContextRequest: BusinessContextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock ReportsService
    mockReportsService = {
      getAppointmentReport: jest.fn(),
      getRevenueReport: jest.fn(),
      getCustomerReport: jest.fn(),
      getStaffReport: jest.fn(),
      getBusinessReport: jest.fn(),
      getServiceReport: jest.fn(),
      getUsageReport: jest.fn(),
      getCustomReport: jest.fn()
    };

    // Create ReportsController instance
    reportsController = new ReportsController(mockReportsService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as AuthenticatedRequest;
    mockRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };

    mockBusinessContextRequest = TestHelpers.createMockRequest() as BusinessContextRequest;
    mockBusinessContextRequest.user = { id: 'user-123', phoneNumber: '+905551234567' };
    mockBusinessContextRequest.business = { id: 'business-123', name: 'Test Business' };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create ReportsController instance', () => {
      expect(reportsController).toBeInstanceOf(ReportsController);
    });
  });

  describe('getAppointmentReport', () => {
    it('should get appointment report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        totalAppointments: 100,
        confirmedAppointments: 80,
        cancelledAppointments: 15,
        noShowAppointments: 5,
        averageAppointmentsPerDay: 3.2
      };

      mockReportsService.getAppointmentReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getAppointmentReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getAppointmentReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getRevenueReport', () => {
    it('should get revenue report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        totalRevenue: 5000.00,
        averageRevenuePerAppointment: 50.00,
        revenueByService: {
          'Haircut': 3000.00,
          'Styling': 2000.00
        },
        revenueByMonth: {
          'January': 5000.00
        }
      };

      mockReportsService.getRevenueReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getRevenueReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getRevenueReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getCustomerReport', () => {
    it('should get customer report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        totalCustomers: 50,
        newCustomers: 10,
        returningCustomers: 40,
        averageAppointmentsPerCustomer: 2.0,
        topCustomers: [
          { id: 'customer-1', name: 'John Doe', appointmentCount: 5 }
        ]
      };

      mockReportsService.getCustomerReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getCustomerReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getCustomerReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getStaffReport', () => {
    it('should get staff report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        totalStaff: 5,
        activeStaff: 4,
        staffPerformance: [
          { id: 'staff-1', name: 'Staff Member 1', appointmentsCompleted: 20, revenue: 1000.00 }
        ],
        averageAppointmentsPerStaff: 25
      };

      mockReportsService.getStaffReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getStaffReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getStaffReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getBusinessReport', () => {
    it('should get business report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        businessName: 'Test Business',
        totalAppointments: 100,
        totalRevenue: 5000.00,
        totalCustomers: 50,
        averageRating: 4.5,
        businessHours: {
          monday: { open: '09:00', close: '18:00' }
        }
      };

      mockReportsService.getBusinessReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getBusinessReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getBusinessReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getServiceReport', () => {
    it('should get service report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        totalServices: 10,
        activeServices: 8,
        servicePerformance: [
          { id: 'service-1', name: 'Haircut', bookings: 50, revenue: 2500.00 }
        ],
        averageBookingsPerService: 12.5
      };

      mockReportsService.getServiceReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getServiceReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getServiceReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getUsageReport', () => {
    it('should get usage report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { businessId };
      mockRequest.query = { startDate, endDate };

      const mockReport = {
        smsUsage: { used: 100, limit: 500, remaining: 400 },
        appointmentUsage: { used: 50, limit: 100, remaining: 50 },
        customerUsage: { used: 25, limit: 50, remaining: 25 },
        usageTrends: {
          sms: [10, 15, 20, 25, 30],
          appointments: [5, 8, 12, 15, 10]
        }
      };

      mockReportsService.getUsageReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getUsageReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getUsageReport).toHaveBeenCalledWith('user-123', businessId, startDate, endDate);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });

  describe('getCustomReport', () => {
    it('should get custom report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const reportType = 'custom';
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'day'
      };

      mockRequest.params = { businessId };
      mockRequest.query = { reportType, ...filters };

      const mockReport = {
        reportType: 'custom',
        data: [
          { date: '2024-01-01', appointments: 5, revenue: 250.00 },
          { date: '2024-01-02', appointments: 8, revenue: 400.00 }
        ],
        summary: {
          totalAppointments: 13,
          totalRevenue: 650.00
        }
      };

      mockReportsService.getCustomReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getCustomReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getCustomReport).toHaveBeenCalledWith('user-123', businessId, reportType, filters);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });
  });
});

