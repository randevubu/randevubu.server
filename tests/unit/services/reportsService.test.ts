import { ReportsService } from '../../../src/services/reportsService';
import { RepositoryContainer } from '../../../src/repositories';
import { AppointmentStatus } from '../../../src/types/business';
import { TestHelpers } from '../../utils/testHelpers';

// Mock dependencies
jest.mock('../../../src/repositories');
jest.mock('../../../src/utils/reliabilityScoreCalculator');

describe('ReportsService', () => {
  let reportsService: ReportsService;
  let mockRepositories: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockRepositories = {
      prismaClient: {
        business: {
          findMany: jest.fn()
        },
        appointment: {
          groupBy: jest.fn(),
          aggregate: jest.fn(),
          findMany: jest.fn()
        },
        service: {
          count: jest.fn(),
          findMany: jest.fn()
        },
        user: {
          findMany: jest.fn()
        },
        businessStaff: {
          findMany: jest.fn()
        }
      },
      appointmentRepository: {
        getCustomerAppointmentStats: jest.fn()
      },
      userBehaviorRepository: {
        findByUserId: jest.fn()
      }
    };

    // Create ReportsService instance
    reportsService = new ReportsService(mockRepositories as RepositoryContainer);
  });

  describe('constructor', () => {
    it('should create ReportsService instance', () => {
      expect(reportsService).toBeInstanceOf(ReportsService);
    });
  });

  describe('getBusinessOverview', () => {
    it('should return business overview report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockAppointmentStats = [
        {
          status: AppointmentStatus.COMPLETED,
          _count: 50,
          _sum: { price: 5000 }
        },
        {
          status: AppointmentStatus.CANCELED,
          _count: 10,
          _sum: { price: 0 }
        },
        {
          status: AppointmentStatus.NO_SHOW,
          _count: 5,
          _sum: { price: 0 }
        }
      ];

      const mockCustomerStats = [
        { customerId: 'customer-1', _count: 3 },
        { customerId: 'customer-2', _count: 2 },
        { customerId: 'customer-3', _count: 1 }
      ];

      const mockNewCustomerAppointments = [
        { customerId: 'customer-1', createdAt: new Date('2024-01-15') },
        { customerId: 'customer-2', createdAt: new Date('2024-01-20') },
        { customerId: 'customer-3', createdAt: new Date('2024-01-25') }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy
        .mockResolvedValueOnce(mockAppointmentStats) // First call for appointment stats
        .mockResolvedValueOnce(mockCustomerStats); // Second call for customer stats
      mockRepositories.prismaClient.appointment.findMany.mockResolvedValue(mockNewCustomerAppointments);
      mockRepositories.prismaClient.service.count
        .mockResolvedValueOnce(10) // Total services
        .mockResolvedValueOnce(8); // Active services

      // Act
      const result = await reportsService.getBusinessOverview(userId, businessId, startDate, endDate);

      // Assert
      expect(result).toEqual({
        businessId: 'business-123',
        businessName: 'Test Business',
        totalAppointments: 65,
        completedAppointments: 50,
        canceledAppointments: 10,
        noShowAppointments: 5,
        totalRevenue: 5000,
        averageAppointmentValue: 76.92,
        completionRate: 76.92,
        cancellationRate: 15.38,
        noShowRate: 7.69,
        totalCustomers: 3,
        newCustomers: 3,
        returningCustomers: 0,
        averageRating: 0,
        totalServices: 10,
        activeServices: 8
      });
    });

    it('should throw error when no accessible businesses found', async () => {
      // Arrange
      const userId = 'user-123';
      mockRepositories.prismaClient.business.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(reportsService.getBusinessOverview(userId))
        .rejects.toThrow('No accessible businesses found');
    });

    it('should handle zero appointments', async () => {
      // Arrange
      const userId = 'user-123';
      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy
        .mockResolvedValueOnce([]) // No appointment stats
        .mockResolvedValueOnce([]); // No customer stats
      mockRepositories.prismaClient.appointment.findMany.mockResolvedValue([]);
      mockRepositories.prismaClient.service.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      // Act
      const result = await reportsService.getBusinessOverview(userId);

      // Assert
      expect(result.totalAppointments).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.averageAppointmentValue).toBe(0);
    });
  });

  describe('getRevenueReport', () => {
    it('should return revenue report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockRevenueData = {
        _sum: { price: 10000 },
        _count: 100
      };

      const mockDailyRevenue = [
        {
          date: new Date('2024-01-15'),
          _sum: { price: 500 },
          _count: 5
        },
        {
          date: new Date('2024-01-16'),
          _sum: { price: 750 },
          _count: 7
        }
      ];

      const mockServiceRevenue = [
        {
          serviceId: 'service-1',
          _sum: { price: 6000 },
          _count: 60
        },
        {
          serviceId: 'service-2',
          _sum: { price: 4000 },
          _count: 40
        }
      ];

      const mockServices = [
        { id: 'service-1', name: 'Haircut' },
        { id: 'service-2', name: 'Styling' }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.aggregate.mockResolvedValue(mockRevenueData);
      mockRepositories.prismaClient.appointment.groupBy
        .mockResolvedValueOnce(mockDailyRevenue) // Daily revenue
        .mockResolvedValueOnce(mockServiceRevenue); // Service revenue
      mockRepositories.prismaClient.service.findMany.mockResolvedValue(mockServices);

      // Mock the private method
      const getRevenueByMonthSpy = jest.spyOn(reportsService as any, 'getRevenueByMonth')
        .mockResolvedValue([]);

      // Act
      const result = await reportsService.getRevenueReport(userId, businessId, startDate, endDate);

      // Assert
      expect(result).toEqual({
        totalRevenue: 10000,
        periodRevenue: 10000,
        revenueByDay: [
          {
            date: '2024-01-15',
            revenue: 500,
            appointments: 5
          },
          {
            date: '2024-01-16',
            revenue: 750,
            appointments: 7
          }
        ],
        revenueByService: [
          {
            serviceId: 'service-1',
            serviceName: 'Haircut',
            revenue: 6000,
            appointments: 60,
            averageValue: 100
          },
          {
            serviceId: 'service-2',
            serviceName: 'Styling',
            revenue: 4000,
            appointments: 40,
            averageValue: 100
          }
        ],
        revenueByMonth: []
      });

      getRevenueByMonthSpy.mockRestore();
    });
  });

  describe('getAppointmentReport', () => {
    it('should return appointment report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockStatusCounts = [
        { status: AppointmentStatus.COMPLETED, _count: 50 },
        { status: AppointmentStatus.CANCELED, _count: 10 },
        { status: AppointmentStatus.NO_SHOW, _count: 5 },
        { status: AppointmentStatus.CONFIRMED, _count: 15 }
      ];

      const mockDailyAppointments = [
        {
          date: new Date('2024-01-15'),
          status: AppointmentStatus.COMPLETED,
          _count: 10
        },
        {
          date: new Date('2024-01-15'),
          status: AppointmentStatus.CANCELED,
          _count: 2
        }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy
        .mockResolvedValueOnce(mockStatusCounts) // Status counts
        .mockResolvedValueOnce(mockDailyAppointments); // Daily appointments

      // Mock private methods
      const getAppointmentsByServiceSpy = jest.spyOn(reportsService as any, 'getAppointmentsByService')
        .mockResolvedValue([]);
      const getAppointmentsByStaffSpy = jest.spyOn(reportsService as any, 'getAppointmentsByStaff')
        .mockResolvedValue([]);

      // Act
      const result = await reportsService.getAppointmentReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        totalAppointments: 80,
        completedAppointments: 50,
        canceledAppointments: 10,
        noShowAppointments: 5,
        confirmedAppointments: 15,
        appointmentsByDay: expect.any(Array),
        appointmentsByService: [],
        appointmentsByStaff: []
      });

      getAppointmentsByServiceSpy.mockRestore();
      getAppointmentsByStaffSpy.mockRestore();
    });
  });

  describe('getCustomerReport', () => {
    it('should return customer report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockCustomerData = [
        {
          customerId: 'customer-1',
          _count: 5,
          _sum: { price: 500 }
        },
        {
          customerId: 'customer-2',
          _count: 3,
          _sum: { price: 300 }
        }
      ];

      const mockTopCustomersData = [
        {
          id: 'customer-1',
          firstName: 'John',
          lastName: 'Doe',
          lastLoginAt: new Date('2024-01-20')
        },
        {
          id: 'customer-2',
          firstName: 'Jane',
          lastName: 'Smith',
          lastLoginAt: new Date('2024-01-18')
        }
      ];

      const mockAppointmentStats = {
        totalAppointments: 5,
        completedAppointments: 4,
        cancelledAppointments: 1,
        noShowCount: 0
      };

      const mockUserBehavior = {
        currentStrikes: 0,
        isBanned: false,
        bannedUntil: null
      };

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy.mockResolvedValue(mockCustomerData);
      mockRepositories.prismaClient.user.findMany.mockResolvedValue(mockTopCustomersData);
      mockRepositories.appointmentRepository.getCustomerAppointmentStats.mockResolvedValue(mockAppointmentStats);
      mockRepositories.userBehaviorRepository.findByUserId.mockResolvedValue(mockUserBehavior);

      // Mock the ReliabilityScoreCalculator
      const mockReliabilityScoreCalculator = require('../../../src/utils/reliabilityScoreCalculator');
      mockReliabilityScoreCalculator.ReliabilityScoreCalculator = {
        calculate: jest.fn().mockReturnValue({ score: 85 })
      };

      // Act
      const result = await reportsService.getCustomerReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        totalCustomers: 2,
        newCustomers: 0,
        returningCustomers: 0,
        averageAppointmentsPerCustomer: 4,
        customerRetentionRate: 0,
        topCustomers: expect.any(Array),
        customersByAcquisition: []
      });
      expect(result.topCustomers).toHaveLength(2);
    });
  });

  describe('getFinancialReport', () => {
    it('should return financial report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockRevenueData = {
        _sum: { price: 10000 },
        _count: 100
      };

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.aggregate.mockResolvedValue(mockRevenueData);

      // Mock private method
      const getMonthlyFinancialTrendsSpy = jest.spyOn(reportsService as any, 'getMonthlyFinancialTrends')
        .mockResolvedValue([]);

      // Act
      const result = await reportsService.getFinancialReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        totalRevenue: 10000,
        netProfit: 3500,
        expenses: 6500,
        profitMargin: 35,
        revenueGrowth: 12.5,
        avgTransactionValue: 100,
        paymentMethods: expect.any(Array),
        monthlyTrends: []
      });

      getMonthlyFinancialTrendsSpy.mockRestore();
    });
  });

  describe('getOperationalReport', () => {
    it('should return operational report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockHourlyData = [
        { startTime: new Date('2024-01-15T10:00:00Z'), _count: 5 },
        { startTime: new Date('2024-01-15T14:00:00Z'), _count: 8 }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy.mockResolvedValue(mockHourlyData);

      // Mock private methods
      const getStaffWorkloadAnalysisSpy = jest.spyOn(reportsService as any, 'getStaffWorkloadAnalysis')
        .mockResolvedValue([]);
      const getServiceEfficiencyAnalysisSpy = jest.spyOn(reportsService as any, 'getServiceEfficiencyAnalysis')
        .mockResolvedValue([]);

      // Act
      const result = await reportsService.getOperationalReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        businessId: 'business-123',
        utilizationRate: 75.5,
        peakHours: expect.any(Array),
        averageWaitTime: 12,
        serviceEfficiency: [],
        staffWorkload: [],
        resourceUtilization: {
          rooms: 85,
          equipment: 92,
          supplies: 78
        }
      });

      getStaffWorkloadAnalysisSpy.mockRestore();
      getServiceEfficiencyAnalysisSpy.mockRestore();
    });
  });

  describe('getCustomerAnalyticsReport', () => {
    it('should return customer analytics report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockCustomerStats = [
        {
          customerId: 'customer-1',
          _count: 5,
          _sum: { price: 500 },
          _avg: { price: 100 }
        }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy.mockResolvedValue(mockCustomerStats);

      // Act
      const result = await reportsService.getCustomerAnalyticsReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        totalCustomers: 1,
        customerLifetimeValue: 500,
        acquisitionCost: 45,
        retentionRate: 68.5,
        churnRate: 31.5,
        customerSegments: expect.any(Array),
        loyaltyMetrics: {
          nps: 72,
          satisfaction: 4.3,
          repeatRate: 65
        },
        demographicBreakdown: {
          ageGroups: expect.any(Array),
          genderDistribution: expect.any(Array),
          geographicDistribution: expect.any(Array)
        }
      });
    });
  });

  describe('getTrendsAnalysisReport', () => {
    it('should return trends analysis report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockHistoricalData = [
        {
          date: new Date('2024-01-15'),
          _count: 10,
          _sum: { price: 1000 }
        }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.appointment.groupBy.mockResolvedValue(mockHistoricalData);

      // Act
      const result = await reportsService.getTrendsAnalysisReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        businessId: 'business-123',
        timeframe: '12months',
        growthMetrics: {
          revenueGrowth: 12.5,
          customerGrowth: 8.3,
          appointmentGrowth: 15.2,
          serviceDemandGrowth: []
        },
        seasonalPatterns: expect.any(Array),
        forecasting: expect.any(Array)
      });
    });
  });

  describe('getQualityMetricsReport', () => {
    it('should return quality metrics report successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      const mockBusiness = {
        id: 'business-123',
        name: 'Test Business'
      };

      const mockServices = [
        {
          id: 'service-1',
          name: 'Haircut',
          appointments: [
            { status: 'COMPLETED' },
            { status: 'CANCELED' }
          ]
        }
      ];

      mockRepositories.prismaClient.business.findMany.mockResolvedValue([mockBusiness]);
      mockRepositories.prismaClient.service.findMany.mockResolvedValue(mockServices);

      // Mock private method
      const getStaffQualityMetricsSpy = jest.spyOn(reportsService as any, 'getStaffQualityMetrics')
        .mockResolvedValue([]);

      // Act
      const result = await reportsService.getQualityMetricsReport(userId, businessId);

      // Assert
      expect(result).toEqual({
        businessId: 'business-123',
        customerSatisfaction: {
          averageRating: 4.3,
          totalReviews: 156,
          ratingDistribution: expect.any(Array)
        },
        serviceQuality: expect.any(Array),
        staffPerformance: [],
        incidentReports: {
          total: 12,
          resolved: 11,
          avgResolutionTime: 2.5
        }
      });

      getStaffQualityMetricsSpy.mockRestore();
    });
  });

  describe('getExecutiveSummary', () => {
    it('should return executive summary successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const businessId = 'business-123';

      // Mock all the individual report methods
      const mockOverview = {
        businessId: 'business-123',
        businessName: 'Test Business',
        totalAppointments: 100,
        completedAppointments: 80,
        canceledAppointments: 15,
        noShowAppointments: 5,
        totalRevenue: 10000,
        averageAppointmentValue: 100,
        completionRate: 80,
        cancellationRate: 15,
        noShowRate: 5,
        totalCustomers: 50,
        newCustomers: 10,
        returningCustomers: 40,
        averageRating: 4.5,
        totalServices: 10,
        activeServices: 8
      };

      const mockFinancial = {
        totalRevenue: 10000,
        netProfit: 3500,
        expenses: 6500,
        profitMargin: 35,
        revenueGrowth: 12.5,
        avgTransactionValue: 100,
        paymentMethods: [],
        monthlyTrends: []
      };

      const mockOperational = {
        businessId: 'business-123',
        utilizationRate: 75.5,
        peakHours: [],
        averageWaitTime: 12,
        serviceEfficiency: [],
        staffWorkload: [],
        resourceUtilization: { rooms: 85, equipment: 92, supplies: 78 }
      };

      const mockCustomer = {
        totalCustomers: 50,
        customerLifetimeValue: 200,
        acquisitionCost: 45,
        retentionRate: 68.5,
        churnRate: 31.5,
        customerSegments: [],
        loyaltyMetrics: { nps: 72, satisfaction: 4.3, repeatRate: 65 },
        demographicBreakdown: { ageGroups: [], genderDistribution: [], geographicDistribution: [] }
      };

      const mockQuality = {
        businessId: 'business-123',
        customerSatisfaction: { averageRating: 4.3, totalReviews: 156, ratingDistribution: [] },
        serviceQuality: [],
        staffPerformance: [],
        incidentReports: { total: 12, resolved: 11, avgResolutionTime: 2.5 }
      };

      // Mock the individual report methods
      jest.spyOn(reportsService, 'getBusinessOverview').mockResolvedValue(mockOverview);
      jest.spyOn(reportsService, 'getFinancialReport').mockResolvedValue(mockFinancial);
      jest.spyOn(reportsService, 'getOperationalReport').mockResolvedValue(mockOperational);
      jest.spyOn(reportsService, 'getCustomerAnalyticsReport').mockResolvedValue(mockCustomer);
      jest.spyOn(reportsService, 'getQualityMetricsReport').mockResolvedValue(mockQuality);

      // Act
      const result = await reportsService.getExecutiveSummary(userId, businessId);

      // Assert
      expect(result).toEqual({
        overview: mockOverview,
        financial: mockFinancial,
        operational: mockOperational,
        customer: mockCustomer,
        quality: mockQuality,
        kpis: expect.any(Array)
      });
      expect(result.kpis).toHaveLength(6);
      expect(result.kpis[0]).toHaveProperty('name', 'Revenue');
      expect(result.kpis[0]).toHaveProperty('value', 10000);
      expect(result.kpis[0]).toHaveProperty('unit', 'TRY');
    });
  });

  describe('private helper methods', () => {
    describe('buildDateFilter', () => {
      it('should build date filter when both dates provided', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        // Act
        const result = (reportsService as any).buildDateFilter(startDate, endDate);

        // Assert
        expect(result).toEqual({
          date: {
            gte: startDate,
            lte: endDate
          }
        });
      });

      it('should return empty object when dates not provided', () => {
        // Act
        const result = (reportsService as any).buildDateFilter();

        // Assert
        expect(result).toEqual({});
      });
    });

    describe('groupAppointmentsByDay', () => {
      it('should group appointments by day correctly', () => {
        // Arrange
        const dailyData = [
          {
            date: new Date('2024-01-15'),
            status: AppointmentStatus.COMPLETED,
            _count: 5
          },
          {
            date: new Date('2024-01-15'),
            status: AppointmentStatus.CANCELED,
            _count: 2
          },
          {
            date: new Date('2024-01-16'),
            status: AppointmentStatus.COMPLETED,
            _count: 3
          }
        ];

        // Act
        const result = (reportsService as any).groupAppointmentsByDay(dailyData);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          date: '2024-01-15',
          total: 7,
          completed: 5,
          canceled: 2,
          noShow: 0
        });
        expect(result[1]).toEqual({
          date: '2024-01-16',
          total: 3,
          completed: 3,
          canceled: 0,
          noShow: 0
        });
      });
    });
  });
});