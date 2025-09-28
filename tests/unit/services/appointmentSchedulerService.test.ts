import { AppointmentSchedulerService, AppointmentSchedulerConfig } from '../../../src/services/appointmentSchedulerService';
import { PrismaClient, AppointmentStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('node-cron');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/timezoneHelper');

describe('AppointmentSchedulerService', () => {
  let appointmentSchedulerService: AppointmentSchedulerService;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      appointment: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn()
      }
    };

    // Create AppointmentSchedulerService instance
    appointmentSchedulerService = new AppointmentSchedulerService(
      mockPrisma as PrismaClient
    );
  });

  describe('constructor', () => {
    it('should create AppointmentSchedulerService instance with default config', () => {
      expect(appointmentSchedulerService).toBeInstanceOf(AppointmentSchedulerService);
    });

    it('should create AppointmentSchedulerService instance with custom config', () => {
      // Arrange
      const config: AppointmentSchedulerConfig = {
        autoCompleteSchedule: '*/10 * * * *',
        timezone: 'America/New_York',
        developmentMode: true
      };

      // Act
      const service = new AppointmentSchedulerService(mockPrisma as PrismaClient, config);

      // Assert
      expect(service).toBeInstanceOf(AppointmentSchedulerService);
    });

    it('should use development mode when NODE_ENV is development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Act
      const service = new AppointmentSchedulerService(mockPrisma as PrismaClient);

      // Assert
      expect(service).toBeInstanceOf(AppointmentSchedulerService);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('start', () => {
    it('should start the scheduler successfully', () => {
      // Act
      appointmentSchedulerService.start();

      // Assert
      expect(appointmentSchedulerService).toBeDefined();
    });

    it('should start scheduler in development mode', () => {
      // Arrange
      const config: AppointmentSchedulerConfig = {
        developmentMode: true
      };
      const service = new AppointmentSchedulerService(mockPrisma as PrismaClient, config);

      // Act
      service.start();

      // Assert
      expect(service).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop the scheduler successfully', () => {
      // Arrange
      appointmentSchedulerService.start();

      // Act
      appointmentSchedulerService.stop();

      // Assert
      expect(appointmentSchedulerService).toBeDefined();
    });

    it('should handle stop when not running', () => {
      // Act
      appointmentSchedulerService.stop();

      // Assert
      expect(appointmentSchedulerService).toBeDefined();
    });
  });

  describe('isSchedulerRunning', () => {
    it('should return false when scheduler is not running', () => {
      // Act
      const result = appointmentSchedulerService.isSchedulerRunning();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when scheduler is running', () => {
      // Arrange
      appointmentSchedulerService.start();

      // Act
      const result = appointmentSchedulerService.isSchedulerRunning();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getSchedulerStatus', () => {
    it('should return scheduler status', () => {
      // Act
      const result = appointmentSchedulerService.getSchedulerStatus();

      // Assert
      expect(result).toEqual({
        isRunning: false,
        config: expect.objectContaining({
          autoCompleteSchedule: expect.any(String),
          timezone: expect.any(String),
          developmentMode: expect.any(Boolean)
        })
      });
    });
  });

  describe('checkAndCompleteAppointments', () => {
    it('should complete appointments that have passed their end time', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          status: AppointmentStatus.CONFIRMED
        },
        {
          id: 'appointment-2',
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          endTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: AppointmentStatus.CONFIRMED
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 2 });

      // Act
      const result = await appointmentSchedulerService.checkAndCompleteAppointments();

      // Assert
      expect(result).toEqual({
        checked: 2,
        completed: 2,
        errors: 0
      });
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: AppointmentStatus.CONFIRMED,
          endTime: {
            lte: expect.any(Date)
          }
        }
      });
      expect(mockPrisma.appointment.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['appointment-1', 'appointment-2']
          }
        },
        data: {
          status: AppointmentStatus.COMPLETED
        }
      });
    });

    it('should handle no appointments to complete', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Act
      const result = await appointmentSchedulerService.checkAndCompleteAppointments();

      // Assert
      expect(result).toEqual({
        checked: 0,
        completed: 0,
        errors: 0
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await appointmentSchedulerService.checkAndCompleteAppointments();

      // Assert
      expect(result).toEqual({
        checked: 0,
        completed: 0,
        errors: 1
      });
    });
  });

  describe('getAppointmentStatistics', () => {
    it('should return appointment statistics', async () => {
      // Arrange
      const mockStats = {
        total: 100,
        confirmed: 80,
        completed: 15,
        cancelled: 5
      };

      mockPrisma.appointment.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // confirmed
        .mockResolvedValueOnce(15)  // completed
        .mockResolvedValueOnce(5);  // cancelled

      // Act
      const result = await appointmentSchedulerService.getAppointmentStatistics();

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockPrisma.appointment.count).toHaveBeenCalledTimes(4);
    });

    it('should handle database errors in statistics', async () => {
      // Arrange
      mockPrisma.appointment.count.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await appointmentSchedulerService.getAppointmentStatistics();

      // Assert
      expect(result).toEqual({
        total: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        error: 'Database error'
      });
    });
  });

  describe('forceCompleteAppointments', () => {
    it('should force complete specific appointments', async () => {
      // Arrange
      const appointmentIds = ['appointment-1', 'appointment-2'];
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 2 });

      // Act
      const result = await appointmentSchedulerService.forceCompleteAppointments(appointmentIds);

      // Assert
      expect(result).toEqual({
        requested: 2,
        completed: 2,
        errors: 0
      });
      expect(mockPrisma.appointment.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: appointmentIds
          },
          status: AppointmentStatus.CONFIRMED
        },
        data: {
          status: AppointmentStatus.COMPLETED
        }
      });
    });

    it('should handle partial completion', async () => {
      // Arrange
      const appointmentIds = ['appointment-1', 'appointment-2', 'appointment-3'];
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 2 });

      // Act
      const result = await appointmentSchedulerService.forceCompleteAppointments(appointmentIds);

      // Assert
      expect(result).toEqual({
        requested: 3,
        completed: 2,
        errors: 0
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const appointmentIds = ['appointment-1'];
      mockPrisma.appointment.updateMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await appointmentSchedulerService.forceCompleteAppointments(appointmentIds);

      // Assert
      expect(result).toEqual({
        requested: 1,
        completed: 0,
        errors: 1
      });
    });
  });

  describe('getUpcomingAppointments', () => {
    it('should get upcoming appointments', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          status: AppointmentStatus.CONFIRMED
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentSchedulerService.getUpcomingAppointments();

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: AppointmentStatus.CONFIRMED,
          startTime: {
            gte: expect.any(Date)
          }
        },
        orderBy: {
          startTime: 'asc'
        },
        take: 50
      });
    });

    it('should get upcoming appointments with limit', async () => {
      // Arrange
      const limit = 10;
      const mockAppointments = [
        { id: 'appointment-1', startTime: new Date(), status: AppointmentStatus.CONFIRMED }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentSchedulerService.getUpcomingAppointments(limit);

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: AppointmentStatus.CONFIRMED,
          startTime: {
            gte: expect.any(Date)
          }
        },
        orderBy: {
          startTime: 'asc'
        },
        take: limit
      });
    });
  });

  describe('getOverdueAppointments', () => {
    it('should get overdue appointments', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          status: AppointmentStatus.CONFIRMED
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      // Act
      const result = await appointmentSchedulerService.getOverdueAppointments();

      // Assert
      expect(result).toEqual(mockAppointments);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          status: AppointmentStatus.CONFIRMED,
          endTime: {
            lte: expect.any(Date)
          }
        },
        orderBy: {
          endTime: 'asc'
        }
      });
    });
  });

  describe('rescheduleOverdueAppointments', () => {
    it('should reschedule overdue appointments', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appointment-1',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          status: AppointmentStatus.CONFIRMED
        }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await appointmentSchedulerService.rescheduleOverdueAppointments();

      // Assert
      expect(result).toEqual({
        found: 1,
        rescheduled: 1,
        errors: 0
      });
    });

    it('should handle no overdue appointments', async () => {
      // Arrange
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Act
      const result = await appointmentSchedulerService.rescheduleOverdueAppointments();

      // Assert
      expect(result).toEqual({
        found: 0,
        rescheduled: 0,
        errors: 0
      });
    });
  });

  describe('cleanupCompletedAppointments', () => {
    it('should cleanup old completed appointments', async () => {
      // Arrange
      const daysOld = 30;
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await appointmentSchedulerService.cleanupCompletedAppointments(daysOld);

      // Assert
      expect(result).toEqual({
        deleted: 5,
        errors: 0
      });
      expect(mockPrisma.appointment.updateMany).toHaveBeenCalledWith({
        where: {
          status: AppointmentStatus.COMPLETED,
          updatedAt: {
            lte: expect.any(Date)
          }
        },
        data: {
          status: AppointmentStatus.CANCELLED
        }
      });
    });

    it('should use default days if not specified', async () => {
      // Arrange
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await appointmentSchedulerService.cleanupCompletedAppointments();

      // Assert
      expect(result).toEqual({
        deleted: 3,
        errors: 0
      });
    });
  });
});

