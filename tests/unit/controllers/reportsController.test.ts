import { Request, Response } from 'express';
import { ReportsController } from '../../../src/controllers/reportsController';
import { ReportsService } from '../../../src/services/reportsService';
import { TestHelpers } from '../../utils/testHelpers';
import { GuaranteedAuthRequest } from '../../../src/types/auth';

// Mock dependencies
jest.mock('../../../src/services/reportsService');
jest.mock('../../../src/utils/errorResponse');
jest.mock('../../../src/utils/logger');

describe('ReportsController', () => {
  let reportsController: ReportsController;
  let mockReportsService: any;
  let mockRequest: GuaranteedAuthRequest;
  let mockResponse: Response;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock ReportsService
    mockReportsService = {
      getBusinessOverview: jest.fn(),
      getRevenueReport: jest.fn(),
      getAppointmentReport: jest.fn(),
      getCustomerReport: jest.fn(),
      getDashboardReport: jest.fn(),
      getFinancialReport: jest.fn(),
      getOperationalReport: jest.fn(),
      getCustomerAnalyticsReport: jest.fn(),
      getTrendsAnalysisReport: jest.fn(),
      getQualityMetricsReport: jest.fn(),
      getExecutiveSummary: jest.fn(),
      getRealtimeMetrics: jest.fn(),
      generateCustomReport: jest.fn(),
      getReportTemplates: jest.fn(),
      scheduleReport: jest.fn()
    };

    // Create ReportsController instance
    reportsController = new ReportsController(mockReportsService);

    // Create mock request and response
    mockRequest = TestHelpers.createMockRequest() as GuaranteedAuthRequest;
    mockRequest.user = { 
      id: 'user-123', 
      phoneNumber: '+905551234567',
      isVerified: true,
      isActive: true,
      roles: [{ id: 'user-role', name: 'USER', level: 1 }],
      effectiveLevel: 1
    };
    mockRequest.token = {
      userId: 'user-123',
      phoneNumber: '+905551234567',
      type: 'access',
      iat: Date.now(),
      exp: Date.now() + 3600000
    };

    mockResponse = TestHelpers.createMockResponse();
  });

  describe('constructor', () => {
    it('should create ReportsController instance', () => {
      expect(reportsController).toBeInstanceOf(ReportsController);
    });
  });

  describe('getBusinessOverview', () => {
    it('should get business overview report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.query = { businessId, startDate, endDate };

      const mockReport = {
        businessName: 'Test Business',
        totalAppointments: 100,
        completedAppointments: 80,
        canceledAppointments: 15,
        noShowAppointments: 5,
        totalRevenue: 5000.00,
        averageAppointmentValue: 50.00,
        completionRate: 80.0,
        totalCustomers: 50
      };

      mockReportsService.getBusinessOverview.mockResolvedValue(mockReport);

      // Act
      await reportsController.getBusinessOverview(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getBusinessOverview).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Business overview report retrieved successfully',
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

      mockRequest.query = { businessId, startDate, endDate };

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
      expect(mockReportsService.getRevenueReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Revenue report retrieved successfully',
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

      mockRequest.query = { businessId, startDate, endDate };

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
      expect(mockReportsService.getCustomerReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Customer report retrieved successfully',
        data: mockReport
      });
    });
  });

  describe('getAppointmentReport', () => {
    it('should get appointment report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.query = { businessId, startDate, endDate };

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
      expect(mockReportsService.getAppointmentReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Appointment report retrieved successfully',
        data: mockReport
      });
    });
  });

  describe('getDashboardReport', () => {
    it('should get dashboard report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.query = { businessId, startDate, endDate };

      const mockOverview = { totalAppointments: 100, totalRevenue: 5000.00 };
      const mockRevenue = { totalRevenue: 5000.00, averageRevenuePerAppointment: 50.00 };
      const mockAppointments = { totalAppointments: 100, completedAppointments: 80 };
      const mockCustomers = { totalCustomers: 50, newCustomers: 10 };

      mockReportsService.getBusinessOverview.mockResolvedValue(mockOverview);
      mockReportsService.getRevenueReport.mockResolvedValue(mockRevenue);
      mockReportsService.getAppointmentReport.mockResolvedValue(mockAppointments);
      mockReportsService.getCustomerReport.mockResolvedValue(mockCustomers);

      // Act
      await reportsController.getDashboardReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getBusinessOverview).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockReportsService.getRevenueReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockReportsService.getAppointmentReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockReportsService.getCustomerReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Dashboard report retrieved successfully',
        data: {
          overview: mockOverview,
          revenue: mockRevenue,
          appointments: mockAppointments,
          customers: mockCustomers,
          generatedAt: expect.any(String),
          dateRange: {
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString()
          }
        }
      });
    });
  });

  describe('exportReport', () => {
    it('should export report successfully', async () => {
      // Arrange
      const reportType = 'overview';
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.params = { reportType };
      mockRequest.query = { businessId, startDate, endDate, format: 'json' };

      const mockReport = {
        businessName: 'Test Business',
        totalAppointments: 100,
        totalRevenue: 5000.00
      };

      mockReportsService.getBusinessOverview.mockResolvedValue(mockReport);

      // Act
      await reportsController.exportReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getBusinessOverview).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'overview report exported successfully',
        data: mockReport,
        exportedAt: expect.any(String)
      });
    });
  });

  describe('getFinancialReport', () => {
    it('should get financial report successfully', async () => {
      // Arrange
      const businessId = 'business-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRequest.query = { businessId, startDate, endDate };

      const mockReport = {
        totalRevenue: 5000.00,
        totalExpenses: 2000.00,
        netProfit: 3000.00,
        profitMargin: 60.0,
        revenueByMonth: {
          'January': 5000.00
        }
      };

      mockReportsService.getFinancialReport.mockResolvedValue(mockReport);

      // Act
      await reportsController.getFinancialReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getFinancialReport).toHaveBeenCalledWith('user-123', businessId, new Date(startDate), new Date(endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Financial report retrieved successfully',
        data: mockReport
      });
    });
  });

  describe('generateCustomReport', () => {
    it('should generate custom report successfully', async () => {
      // Arrange
      const customReportData = {
        reportType: 'overview',
        businessId: 'business-123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        filters: { status: 'completed' },
        metrics: ['revenue', 'appointments'],
        groupBy: 'day'
      };

      mockRequest.body = customReportData;

      const mockReport = {
        businessName: 'Test Business',
        totalAppointments: 100,
        totalRevenue: 5000.00
      };

      mockReportsService.getBusinessOverview.mockResolvedValue(mockReport);

      // Act
      await reportsController.generateCustomReport(mockRequest, mockResponse);

      // Assert
      expect(mockReportsService.getBusinessOverview).toHaveBeenCalledWith('user-123', customReportData.businessId, new Date(customReportData.startDate), new Date(customReportData.endDate));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Custom report generated successfully',
        data: {
          reportType: customReportData.reportType,
          filters: customReportData.filters,
          metrics: customReportData.metrics,
          groupBy: customReportData.groupBy,
          data: mockReport,
          generatedAt: expect.any(String),
          customizations: {
            appliedFilters: 1,
            selectedMetrics: 2,
            groupingLevel: customReportData.groupBy
          }
        }
      });
    });
  });
});

