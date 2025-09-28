import { ClosureAnalyticsService, DateRange, ClosureAnalytics, CustomerImpactReport, RevenueImpact, ClosureData } from '../../../src/services/closureAnalyticsService';
import { PrismaClient, ClosureType } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');

describe('ClosureAnalyticsService', () => {
  let closureAnalyticsService: ClosureAnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      businessClosure: {
        findMany: jest.fn(),
        findUnique: jest.fn()
      },
      appointment: {
        findMany: jest.fn()
      },
      closureNotification: {
        findMany: jest.fn()
      },
      rescheduleSuggestion: {
        findMany: jest.fn()
      }
    };

    // Create ClosureAnalyticsService instance
    closureAnalyticsService = new ClosureAnalyticsService(mockPrisma as PrismaClient);
  });

  describe('getClosureImpactAnalytics', () => {
    it('should return closure impact analytics', async () => {
      // Arrange
      const businessId = 'business-123';
      const period: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockClosures = [
        {
          id: 'closure-1',
          businessId,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-16'),
          type: ClosureType.HOLIDAY,
          reason: 'Holiday',
          business: { name: 'Test Business' }
        },
        {
          id: 'closure-2',
          businessId,
          startDate: new Date('2024-01-20'),
          endDate: new Date('2024-01-21'),
          type: ClosureType.MAINTENANCE,
          reason: 'Maintenance',
          business: { name: 'Test Business' }
        }
      ];

      const mockAppointments = [
        { id: 'appointment-1', price: 100 },
        { id: 'appointment-2', price: 150 }
      ];

      const mockNotifications = [
        { customerId: 'customer-1', status: 'SENT' },
        { customerId: 'customer-2', status: 'SENT' }
      ];

      const mockRescheduleSuggestions = [
        { customerResponse: 'ACCEPTED' },
        { customerResponse: 'PENDING' }
      ];

      mockPrisma.businessClosure.findMany.mockResolvedValue(mockClosures);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrisma.closureNotification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue(mockRescheduleSuggestions);

      // Act
      const result = await closureAnalyticsService.getClosureImpactAnalytics(businessId, period);

      // Assert
      expect(result).toEqual({
        totalClosures: 2,
        closuresByType: expect.objectContaining({
          [ClosureType.HOLIDAY]: 1,
          [ClosureType.MAINTENANCE]: 1,
          [ClosureType.EMERGENCY]: 0
        }),
        averageClosureDuration: expect.any(Number),
        totalClosureHours: expect.any(Number),
        affectedAppointments: 2,
        estimatedRevenueLoss: 250,
        customerImpact: expect.objectContaining({
          totalAffectedCustomers: 2,
          notificationsSent: 2,
          rescheduledAppointments: 1,
          canceledAppointments: 1
        }),
        monthlyTrend: expect.any(Array),
        recurringPatterns: expect.any(Array)
      });
    });

    it('should handle empty closures', async () => {
      // Arrange
      const businessId = 'business-123';
      const period: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockPrisma.businessClosure.findMany.mockResolvedValue([]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.closureNotification.findMany.mockResolvedValue([]);
      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue([]);

      // Act
      const result = await closureAnalyticsService.getClosureImpactAnalytics(businessId, period);

      // Assert
      expect(result.totalClosures).toBe(0);
      expect(result.affectedAppointments).toBe(0);
      expect(result.estimatedRevenueLoss).toBe(0);
    });

    it('should handle database errors', async () => {
      // Arrange
      const businessId = 'business-123';
      const period: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockPrisma.businessClosure.findMany.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(closureAnalyticsService.getClosureImpactAnalytics(businessId, period))
        .rejects.toThrow('Failed to calculate closure analytics: Database error');
    });
  });

  describe('getCustomerImpactReport', () => {
    it('should return customer impact report', async () => {
      // Arrange
      const closureId = 'closure-123';
      const mockClosure = {
        id: closureId,
        businessId: 'business-123',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-16'),
        business: { name: 'Test Business' }
      };

      const mockAppointments = [
        {
          id: 'appointment-1',
          customerId: 'customer-1',
          price: 100,
          customer: { firstName: 'John', lastName: 'Doe' },
          service: { name: 'Service 1' }
        },
        {
          id: 'appointment-2',
          customerId: 'customer-2',
          price: 150,
          customer: { firstName: 'Jane', lastName: 'Smith' },
          service: { name: 'Service 2' }
        }
      ];

      const mockNotifications = [
        { customerId: 'customer-1', status: 'SENT', channel: 'SMS' },
        { customerId: 'customer-2', status: 'SENT', channel: 'EMAIL' }
      ];

      const mockRescheduleSuggestions = [
        {
          customerId: 'customer-1',
          customerResponse: 'ACCEPTED',
          originalAppointment: { customerId: 'customer-1' }
        },
        {
          customerId: 'customer-2',
          customerResponse: 'PENDING',
          originalAppointment: { customerId: 'customer-2' }
        }
      ];

      mockPrisma.businessClosure.findUnique.mockResolvedValue(mockClosure);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrisma.closureNotification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue(mockRescheduleSuggestions);

      // Act
      const result = await closureAnalyticsService.getCustomerImpactReport(closureId);

      // Assert
      expect(result).toEqual({
        closureId,
        businessId: 'business-123',
        businessName: 'Test Business',
        startDate: mockClosure.startDate,
        endDate: mockClosure.endDate,
        totalAffectedAppointments: 2,
        affectedCustomers: expect.arrayContaining([
          expect.objectContaining({
            customerId: 'customer-1',
            customerName: 'John Doe',
            appointmentCount: 1,
            totalValue: 100,
            notificationStatus: 'sent',
            rescheduleStatus: 'accepted'
          }),
          expect.objectContaining({
            customerId: 'customer-2',
            customerName: 'Jane Smith',
            appointmentCount: 1,
            totalValue: 150,
            notificationStatus: 'sent',
            rescheduleStatus: 'pending'
          })
        ]),
        notificationStats: {
          total: 2,
          sent: 2,
          failed: 0,
          channels: { SMS: 1, EMAIL: 1 }
        }
      });
    });

    it('should throw error if closure not found', async () => {
      // Arrange
      const closureId = 'non-existent-closure';
      mockPrisma.businessClosure.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(closureAnalyticsService.getCustomerImpactReport(closureId))
        .rejects.toThrow('Closure not found');
    });
  });

  describe('getRevenueImpactAnalysis', () => {
    it('should return revenue impact analysis', async () => {
      // Arrange
      const businessId = 'business-123';
      const closureData: ClosureData = {
        id: 'closure-123',
        businessId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-16'),
        type: ClosureType.HOLIDAY,
        reason: 'Holiday'
      };

      const mockAppointments = [
        { id: 'appointment-1', price: 100 },
        { id: 'appointment-2', price: 150 }
      ];

      const mockRescheduled = [
        {
          customerResponse: 'ACCEPTED',
          originalAppointment: { price: 100 }
        }
      ];

      const mockPreviousClosures = [
        { id: 'prev-closure-1', startDate: new Date('2023-01-15'), endDate: new Date('2023-01-16') }
      ];

      const mockPreviousAppointments = [
        { id: 'prev-appointment-1', price: 80 }
      ];

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(mockAppointments) // Current period
        .mockResolvedValueOnce(mockPreviousAppointments); // Previous period

      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue(mockRescheduled);
      mockPrisma.businessClosure.findMany.mockResolvedValue(mockPreviousClosures);

      // Act
      const result = await closureAnalyticsService.getRevenueImpactAnalysis(businessId, closureData);

      // Assert
      expect(result).toEqual({
        directRevenueLoss: 250,
        potentialRevenueLoss: expect.any(Number),
        rescheduledRevenue: 100,
        netRevenueLoss: expect.any(Number),
        impactPercentage: expect.any(Number),
        comparisonWithPreviousPeriod: {
          previousLoss: 80,
          changePercentage: expect.any(Number)
        }
      });
    });

    it('should handle closure without end date', async () => {
      // Arrange
      const businessId = 'business-123';
      const closureData: ClosureData = {
        id: 'closure-123',
        businessId,
        startDate: new Date('2024-01-15'),
        type: ClosureType.EMERGENCY,
        reason: 'Emergency'
      };

      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.rescheduleSuggestion.findMany.mockResolvedValue([]);
      mockPrisma.businessClosure.findMany.mockResolvedValue([]);

      // Act
      const result = await closureAnalyticsService.getRevenueImpactAnalysis(businessId, closureData);

      // Assert
      expect(result.directRevenueLoss).toBe(0);
      expect(result.rescheduledRevenue).toBe(0);
    });
  });

  describe('private methods', () => {
    describe('calculateClosuresByType', () => {
      it('should calculate closures by type correctly', () => {
        // Arrange
        const closures = [
          { type: ClosureType.HOLIDAY },
          { type: ClosureType.MAINTENANCE },
          { type: ClosureType.HOLIDAY },
          { type: ClosureType.EMERGENCY }
        ];

        // Act
        const result = (closureAnalyticsService as any).calculateClosuresByType(closures);

        // Assert
        expect(result).toEqual({
          [ClosureType.HOLIDAY]: 2,
          [ClosureType.MAINTENANCE]: 1,
          [ClosureType.EMERGENCY]: 1
        });
      });
    });

    describe('calculateAverageClosureDuration', () => {
      it('should calculate average closure duration', () => {
        // Arrange
        const closures = [
          {
            startDate: new Date('2024-01-15T10:00:00'),
            endDate: new Date('2024-01-15T18:00:00') // 8 hours
          },
          {
            startDate: new Date('2024-01-16T09:00:00'),
            endDate: new Date('2024-01-16T17:00:00') // 8 hours
          }
        ];

        // Act
        const result = (closureAnalyticsService as any).calculateAverageClosureDuration(closures);

        // Assert
        expect(result).toBe(8);
      });

      it('should return 0 for empty closures', () => {
        // Act
        const result = (closureAnalyticsService as any).calculateAverageClosureDuration([]);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('calculateTotalClosureHours', () => {
      it('should calculate total closure hours', () => {
        // Arrange
        const closures = [
          {
            startDate: new Date('2024-01-15T10:00:00'),
            endDate: new Date('2024-01-15T18:00:00') // 8 hours
          },
          {
            startDate: new Date('2024-01-16T09:00:00'),
            endDate: new Date('2024-01-16T17:00:00') // 8 hours
          }
        ];

        // Act
        const result = (closureAnalyticsService as any).calculateTotalClosureHours(closures);

        // Assert
        expect(result).toBe(16);
      });
    });

    describe('calculateClosureDurationInHours', () => {
      it('should calculate closure duration in hours', () => {
        // Arrange
        const startDate = new Date('2024-01-15T10:00:00');
        const endDate = new Date('2024-01-15T18:00:00');

        // Act
        const result = (closureAnalyticsService as any).calculateClosureDurationInHours(startDate, endDate);

        // Assert
        expect(result).toBe(8);
      });

      it('should handle closure without end date', () => {
        // Arrange
        const startDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
        const endDate = undefined;

        // Act
        const result = (closureAnalyticsService as any).calculateClosureDurationInHours(startDate, endDate);

        // Assert
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('calculateRevenueLoss', () => {
      it('should calculate revenue loss from appointments', () => {
        // Arrange
        const appointments = [
          { price: 100 },
          { price: 150 },
          { price: 75 }
        ];

        // Act
        const result = (closureAnalyticsService as any).calculateRevenueLoss(appointments);

        // Assert
        expect(result).toBe(325);
      });
    });
  });
});

